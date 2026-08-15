---
type: document
created: 2026-04-10
tags: [ai-flow-lab, document]
---

# Cowork Test Feature — Design Document

## Overview

After the Execute step produces code changes, a **Cowork Test Step** validates the output by launching a Claude CLI session that visually inspects the running UI and programmatically reviews the code. If the test passes, the pipeline continues to Merge. If it fails, a bug task is automatically created and routed back through the pipeline.

This feature also replaces the current auto-restore guardrail behavior. Instead of silently restoring files when the executor produces suspicious changes, the system routes to Cowork for interactive verification.

## Problem Statement

1. **T-0027 Incident**: The executor rewrote `render()` and deleted `showMainMenu()`, destroying features. The guardrail auto-restored, but the user was never consulted about whether changes were acceptable.
2. **No visual verification**: The pipeline trusts that code compiles = code works. There is no step that checks whether the UI actually functions as specified.
3. **No feedback loop**: When execution produces subtly wrong results (UI renders but is broken), the pipeline merges broken code.

## Architecture

### Position in Pipeline

```
Architect → Critique → Synthesize → Bootstrap → Execute → [COWORK TEST] → Merge → Follow-ups → PR-Draft
                                                              ↑
                                                    Step 5.5 (new)
                                                              ↓
                                                    IMPLEMENTED → TESTED (success)
                                                    IMPLEMENTED → TEST_FAILED (failure → bug task)
```

### Two Trigger Modes

The Cowork Test Step activates in two scenarios:

#### Trigger A: Guardrail Threshold (Automatic)

After the executor writes files, `validateWrittenFiles()` runs the existing checks (line shrinkage, placeholder patterns, function-existence). Instead of auto-restoring:

| Threshold | Behavior |
|-----------|----------|
| **Green** (0 issues) | Skip Cowork test, continue to Merge (unless lane config forces test) |
| **Yellow** (1-2 functions changed/missing, or line shrinkage 70-90%) | Activate Cowork Test — visual + code review |
| **Red** (>10% functions missing, or line shrinkage <70%) | Pipeline PAUSE → Decision Proposal in Dashboard. User must choose: "Accept Changes", "Restore Snapshot", or "Run Cowork Test" |

#### Trigger B: Lane Configuration (Explicit)

In `project.config.yaml`, lanes can force the test step:

```yaml
executor_routing:
  default:
    test: null        # skip test step by default
  feature:
    test: cowork      # always run Cowork test for features
  bug:
    test: cowork      # always run Cowork test for bug fixes
  danger:
    test: cowork      # mandatory for dangerous refactors
```

When `test: cowork` is set, the test step runs regardless of guardrail result.

### Cowork Test Execution Flow

```
1. Pipeline reaches test step
2. Server generates a test prompt (see Prompt Generation below)
3. Server writes prompt to state/cowork-tests/CT-{taskId}-{timestamp}.prompt.md
4. Server launches: claude --print --model sonnet < CT-xxx.prompt.md
   (Claude CLI has OAuth, no API key needed)
5. Claude CLI:
   a. Reads the task spec (what was supposed to be built)
   b. Reads the written files (what was actually built)
   c. Opens the running app URL (if UI task) via fetch/curl to check it serves
   d. Analyzes the code for correctness, completeness, regressions
   e. Outputs a structured test report
6. Server parses the test report
7. If PASS → state = TESTED, continue to Merge
8. If FAIL → create bug task automatically, state = TEST_FAILED
```

### Prompt Generation

The test prompt is assembled from:

1. **Task spec** (spec_path) — what the task was supposed to do
2. **Implementation brief** (brief_path) — the synthesized plan
3. **Executor report** (result_path) — what files were written
4. **Written file contents** — actual code produced
5. **Snapshot diff** — what changed vs. the pre-execution snapshot (functions added/removed/modified)
6. **App URL** (if applicable, from project.config.yaml)

```markdown
# Cowork Test Prompt

You are a QA engineer testing a code change produced by an automated pipeline.

## Task
{task.title} ({task.task_id})

## What was specified
{spec content}

## What was built
{executor report + file list}

## Code changes
{diff: snapshot vs. current for each written file}

## Instructions
1. Read the spec carefully. Identify all acceptance criteria.
2. Read the code changes. Check that every acceptance criterion is met.
3. Check for regressions: are any existing functions missing or broken?
4. If this is a UI change and an app URL is provided, verify the app serves correctly.
5. Check for common issues: syntax errors, missing imports, broken references.

## Output Format
Respond with EXACTLY this JSON:
{
  "result": "PASS" | "FAIL",
  "summary": "One-sentence summary",
  "checks": [
    { "criterion": "...", "status": "PASS|FAIL", "detail": "..." }
  ],
  "regressions": [ "description of any regression found" ],
  "bugs_to_create": [
    { "title": "...", "description": "...", "lane_type": "bug-lane" }
  ]
}
```

### Bug Task Auto-Creation

When the test report contains `result: "FAIL"`:

1. For each entry in `bugs_to_create`:
   - Call `POST /api/tasks/create` with lane_type, title, description
   - Set `parent_task_id` to the failing task
   - The new bug task enters the pipeline at NEW and runs through the full cascade
2. The failing task stays at `TEST_FAILED` state
3. Dashboard shows the test report inline (similar to diagnosis display)

### Dashboard: Tests Tab

A new **"🧪 Tests"** tab appears in the Dashboard navigation alongside Pipeline, ChatGPT, Decisions, etc.

Contents:
- **Active Tests**: Tasks currently running Cowork test (with spinner)
- **Recent Results**: List of completed test runs with PASS/FAIL badge, timestamp, summary
- **Test Detail**: Click a result to see the full check list, regressions found, and any auto-created bug tasks
- **Manual Trigger**: Button to manually run Cowork test on any IMPLEMENTED task

### Decision Proposal (Red Threshold)

When the guardrail detects a Red threshold (>10% functions missing):

1. Pipeline pauses at state `BLOCKED_ON_DECISION`
2. A Decision Proposal is created in `state/proposals/`:
```json
{
  "decision_proposal_id": "DP-XXXX",
  "topic": "Executor output review: T-XXXX",
  "type": "guardrail_review",
  "task_id": "T-XXXX",
  "severity": "red",
  "issues": [
    { "file": "index.html", "reason": "12/30 functions missing: showMainMenu, drawPlayer..." }
  ],
  "options": [
    { "id": "accept", "label": "Accept Changes", "action": "continue_to_merge" },
    { "id": "restore", "label": "Restore Snapshot", "action": "restore_and_fail" },
    { "id": "test", "label": "Run Cowork Test", "action": "run_cowork_test" }
  ],
  "status": "open"
}
```

3. Dashboard Decisions tab shows the proposal with the three options
4. User clicks one:
   - **Accept** → state = IMPLEMENTED, continue to Merge
   - **Restore** → restore files from snapshot, state = FAILED
   - **Run Test** → run Cowork test step, result determines next action

## State Machine Update

```
          IMPLEMENTED
               ↓
     ┌─────────┴──────────┐
     │                     │
  (green/skip)        (yellow/config)
     │                     │
     ↓                     ↓
   MERGE            COWORK_TESTING
                         ↓
                   ┌─────┴─────┐
                   │           │
                 PASS        FAIL
                   │           │
                   ↓           ↓
                TESTED    TEST_FAILED
                   │           │
                   ↓           ↓
                MERGE    Bug task created
                         (NEW → pipeline)
```

For Red threshold:
```
IMPLEMENTED → BLOCKED_ON_DECISION → (user choice) → MERGE / FAILED / COWORK_TESTING
```

## New States

| State | Meaning |
|-------|---------|
| `COWORK_TESTING` | Cowork test is running (Claude CLI analyzing changes) |
| `TESTED` | Cowork test passed, ready for merge |
| `TEST_FAILED` | Cowork test failed, bug tasks created |
| `BLOCKED_ON_DECISION` | Guardrail Red threshold, waiting for user decision |

## Configuration

### project.config.yaml additions

```yaml
cowork_test:
  enabled: true                    # Master switch
  app_url: "http://localhost:8080" # URL to check if UI serves (optional)
  timeout_ms: 120000               # Max time for Cowork test (2 min default)
  model: "sonnet"                  # Claude model for test analysis
  auto_create_bugs: true           # Auto-create bug tasks on failure

  # Guardrail thresholds (override defaults)
  thresholds:
    yellow_fn_missing: 1           # >= this many missing functions → yellow
    red_fn_missing_pct: 0.10       # >= this % of functions missing → red
    yellow_line_shrink: 0.90       # line ratio < this → yellow
    red_line_shrink: 0.70          # line ratio < this → red
```

### Per-lane override

```yaml
executor_routing:
  feature:
    test: cowork     # "cowork" | "ci" | "local" | null
  docs:
    test: null       # skip test for docs lane
```

## Files to Create/Modify

### New files
- `automation/scripts/cowork-test.mjs` — Test step script (prompt generation, CLI invocation, report parsing, bug creation)
- `automation/state/cowork-tests/` — Directory for test prompts and results

### Modified files
- `automation/scripts/serve-dashboard.mjs`:
  - Add `cowork-test` to `steps` array and `scriptMap` in `cascadeRunTask()`
  - Add `COWORK_TESTING`, `TESTED`, `TEST_FAILED`, `BLOCKED_ON_DECISION` to state machine
  - Add API endpoints: `POST /api/tasks/:id/run-test`, `GET /api/tests/:id`
  - Add Decision Proposal creation for Red threshold
- `automation/scripts/execute-task-api.mjs`:
  - Remove `restoreFromSnapshot()` auto-restore on yellow threshold
  - Instead: write validation result to task JSON for cascade engine to read
  - Keep restore only for Red + user choice "Restore"
- `automation/ui/dashboard.html`:
  - Add "🧪 Tests" tab with test results list and detail view
  - Add Cowork test status indicators in pipeline flow view
  - Add Decision Proposal UI for guardrail Red threshold (accept/restore/test buttons)
  - Update state badge colors for new states

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Claude CLI timeout (>2 min) | Fail test step, set TEST_FAILED, log timeout error |
| Claude CLI returns invalid JSON | Parse error → treat as FAIL with raw output as diagnosis |
| App URL unreachable | Note in test report, don't auto-fail (might be non-UI task) |
| Bug task creation fails | Log error, test result still recorded, user can manually create |
| Claude CLI not available (no OAuth, no key) | Fall back to Gemini API for code-only review (no visual check) |

## Migration Path

1. **Phase 1** ✅ IMPLEMENTED: Guardrail threshold routing (green/yellow/red) + Decision Proposals for Red + Dashboard UI for decisions
2. **Phase 2** ✅ IMPLEMENTED: Cowork test script (`cowork-test.mjs`) + CLI invocation + report parsing + auto bug creation
3. **Phase 3**: Dashboard Tests tab + inline test results
4. ~~**Phase 4**: Auto bug creation + cascade re-entry for bug tasks~~ (merged into Phase 2)
5. **Phase 5**: Visual UI testing (if Claude gains browser access via Cowork computer-use)

### Phase 1 Implementation Details (Completed 2026-04-08)

**execute-task-api.mjs changes:**
- `validateWrittenFiles()` now classifies issues as `yellow` or `red` severity (was `critical`)
- `classifyGuardrailResult()` returns `{level: 'green'|'yellow'|'red', issues: [...]}` based on highest severity
- No more auto-restore — writes `task.guardrail_result` to task JSON
- Saves file snapshot to `state/snapshots/{taskId}-snapshot.json` for yellow/red cases
- Threshold config: `THRESHOLDS = { yellow_fn_missing: 1, red_fn_missing_pct: 0.10, yellow_line_shrink: 0.90, red_line_shrink: 0.70 }`

**serve-dashboard.mjs changes:**
- Cascade engine checks `guardrail_result.level` after execute step success
- Red → sets state `BLOCKED_ON_DECISION`, creates Decision Proposal in `state/proposals/`, breaks cascade
- Yellow → sets state `COWORK_TESTING` then immediately `TESTED` (Phase 2 placeholder — will add actual CLI test)
- Green → continues to merge as before
- New states in `STATE_TO_NEXT_STEP`: EXECUTED→merge, TESTED→merge, COWORK_TESTING→merge, TEST_FAILED→execute, BLOCKED_ON_DECISION→null
- New API endpoint: `POST /api/tasks/:id/guardrail-decision` with actions:
  - `accept`: Sets state to IMPLEMENTED, records `user_decision: "accepted"`
  - `restore`: Reads snapshot file, writes original content back, sets state to SYNTHESIZED + runtime FAILED
  - `test`: Sets state to COWORK_TESTING, records `user_decision: "test_requested"`

**dashboard.html changes:**
- New states in `STATE_ORDER` and `completedStates` (includes TESTED)
- BLOCKED_ON_DECISION tasks: red border, red background, auto-expand, "⏸ Needs Decision" badge
- Red guardrail box with issues list + 3 buttons (Accept Changes / Restore Snapshot / Run Cowork Test)
- COWORK_TESTING tasks: yellow border, yellow background, auto-expand, "🧪 Testing" badge
- Yellow guardrail box with minor issues indicator
- `guardrailDecision()` JS function calls the API endpoint
- Badge colors for all new states

### Phase 2 Implementation Details (Completed 2026-04-08)

**New file: `automation/scripts/cowork-test.mjs`**
- Standalone step script (same pattern as execute-task-api.mjs)
- `buildTestPrompt(task)`: Assembles prompt from spec, brief, executor report, written files, snapshot diff, guardrail issues
- `runClaudeTest(prompt)`: Writes prompt to `state/cowork-tests/CT-{taskId}.prompt.md`, calls `claude --print` via CLI
- `parseTestReport(raw)`: Extracts JSON from response (handles code fences, finds JSON boundaries), validates required fields
- `createBugTask(bugSpec, parentTaskId)`: Auto-creates bug tasks with next available ID, sets `origin: "cowork-test"` and `parent_task_id`
- Config: 180s timeout, sonnet model, 100k max prompt chars (overridable via project.config.yaml)
- Usage logging via `logUsage()` for token tracking

**serve-dashboard.mjs changes:**
- Yellow guardrail routing now calls `node scripts/cowork-test.mjs ${taskId}` (was placeholder auto-TESTED)
- On test FAIL: sets state TEST_FAILED, runtime_status FAILED, breaks cascade
- On test PASS: continues to merge step
- "Run Cowork Test" decision button now launches cowork-test.mjs async (fire-and-forget with status callback)

**Also included (was Phase 4):**
- Auto bug creation integrated into cowork-test.mjs directly
- Bug tasks get `parent_task_id` pointing to failing task
- Bug tasks enter pipeline at NEW state and can run through full cascade

## Invariants

1. **No silent restores**: Files are never auto-restored without user awareness. Yellow → Cowork test. Red → user decision.
2. **Test reports are immutable**: Once written, test results are never overwritten (append-only log)
3. **Bug tasks trace back**: Every auto-created bug task has `parent_task_id` pointing to the failing test
4. **Lane config overrides guardrail**: If lane says `test: cowork`, test runs even on green guardrail
5. **Existing pipeline untouched on green**: If guardrail is green and no test configured, pipeline flows exactly as before (no regression)
