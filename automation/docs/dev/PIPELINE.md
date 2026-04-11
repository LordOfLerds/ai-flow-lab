# Pipeline

## 8 Stages (7 Core + Optional Test)

| # | Stage | Script | Input | Output | Provider | State Before→After |
|---|-------|--------|-------|--------|----------|------------------|
| 1 | Architect | architect-task-api.mjs | task metadata, repo docs | spec_path (md) | OpenAI | NEW → ARCHITECTED |
| 2 | Critique | critique-task-api.mjs | spec_path | review_path (md) | Gemini | ARCHITECTED → CRITIQUED |
| 3 | Synthesize | synthesize-task-api.mjs | spec_path, review_path | brief_path (md) | OpenAI | CRITIQUED → SYNTHESIZED |
| 4 | Bootstrap | prepare-worktree.mjs | git repo, branch_name | worktree_path | local git | SYNTHESIZED → IMPLEMENTING |
| 5 | Execute | execute-task-api.mjs | brief_path, repo | result_path, written_files | Claude CLI +tools | IMPLEMENTING → IMPLEMENTED |
| 5.5 | Test | cowork-test.mjs | spec, brief, code, snapshot | test_result (json) | Claude CLI +tools | IMPLEMENTED → TESTED/TEST_FAILED |
| 6 | Propose | propose-followups-api.mjs | brief_path, result_path | proposals/ (json) | Gemini | IMPLEMENTED → FOLLOWUPS_PROPOSED |
| 7 | PR Draft | generate-pr-draft.mjs | brief_path, result_path, written_files | pr_draft_path (md) | OpenAI | FOLLOWUPS_PROPOSED → PR_DRAFTED |
| 8 | Merge | merge-task.mjs | git worktree, repo | branch merged to main | local git | PR_DRAFTED → MERGED |

## State Machine

```
              NEW
               ↓
           ARCHITECTED ← (error: retry from here)
               ↓
           CRITIQUED ← (error: retry)
               ↓
          SYNTHESIZED ← (error: retry)
               ↓
          IMPLEMENTING ← (error: retry)
               ↓
          IMPLEMENTED ← (error: retry)
               ↓
        FOLLOWUPS_PROPOSED ← (error: silent, does not block)
               ↓
          PR_DRAFTED ← (error: retry)
               ↓
            MERGED
               ↓
        (per-task complete)

Parallel track: BLOCKED_ON_DECISION ← guardrail Red threshold → user decides via Dashboard (Accept/Restore/Test)
```

## Cascade Engine

**cascadeRunTask(taskId, currentStep=null, depth=0, budget=1000)** in serve-dashboard.mjs:

1. **Load task** from state/tasks/T-XXXX.json
2. **Determine resume point**:
   - If currentStep provided, start there
   - Else if task.last_error exists, deriveFailedStep() finds first failed step
   - Else, start at NEW (step 1)
3. **Execute each step** (if state < step's target state):
   - Spawn child process (architect-task-api.mjs, etc.)
   - Wait for completion (15min timeout for Claude, 5min for Codex, 1hr for APP mode)
   - On error: set task.last_error, set runtime_status=ERROR, stop cascade, exit with error code
   - On success: update task state, clear last_error
4. **After execute step**: check for followups
   - Parse proposals/ (Gemini output from step 6)
   - Enhanced dedup (FIX-039): checks title similarity (Jaccard >0.75), scope similarity (>0.6), AND written_files overlap (>50%)
   - Check should_spawn_now flag
   - Decrement budget, recursively call cascadeRunTask() for each new task
5. **Return**: task object with updated state

**Skip Logic**: cascade checks task.state before running each step. If state >= step's target, skip (idempotent).

## Retry Endpoint

**POST /api/tasks/:id/retry**:

1. Calls deriveFailedStep(taskId) to find first failed step
2. Calls cascadeRunTask(taskId, currentStep, depth=0)
3. **NEW**: Also checks proposals/ and spawns followups if budget permits

**deriveFailedStep(taskId)**: loops through steps, checks if step output files exist and contain errors. Returns step number or null if no failure detected.

### AUTO-REFRESH OPTIMIZATION

The dashboard auto-refresh now intelligently skips re-renders when:
- User is actively typing in a textarea (APP mode prompt/response widget)
- Unsaved content exists in any textarea on the page

This prevents the dashboard from clearing the ChatGPT paste textarea mid-edit, which was causing users to lose their response when hitting the paste+Submit flow.

## Git Strategy

### Current
- **Branch naming**: feature/T-XXXX-title (slugified)
- **Worktree**: git worktree add ../wt/T-XXXX feature/T-XXXX (prepare-worktree.mjs)
- **Execute**: all code changes in worktree
- **Merge**: git merge --no-ff feature/T-XXXX (merge-task.mjs)
- **Cleanup**: git worktree remove ../wt/T-XXXX

### Implemented
- **Pre-execute file conflict detection (FIX-040)**: Before LLM call, scans all active tasks for `written_files` overlap. If conflicts found, injects warning into executor prompt to avoid contradicting changes.

### Planned
- **Auto-rebase**: if merge fails, git rebase origin/main, retry merge
- **Conflict UI**: show conflict markers, block merge until resolved
- **Branch cleanup**: automated or manual option

## Follow-Up Spawning

**proposals/ format** (JSON, from propose-followups-api.mjs):
```json
{
  "proposal_id": "P-XXXX",
  "parent_task_id": "T-XXXX",
  "title": "...",
  "description": "...",
  "lane_type": "feature-lane|bug-lane|...",
  "should_spawn_now": true,
  "estimated_complexity": "small|medium|large",
  "created_at": "ISO8601"
}
```

**Spawning Logic**:
1. After execute step succeeds
2. Parse all .json files in state/proposals/P-*.json
3. Enhanced dedup (FIX-039): title similarity (>0.75), scope similarity (>0.6), written_files overlap (>50%)
4. Filter should_spawn_now=true
5. Check depth < 3 and budget > 0
6. For each: spawn-followup-task.mjs → new-task.mjs → create T-YYYY.json
7. Recursively cascadeRunTask(T-YYYY) if budget permits

## Pipeline Page UI Updates

**New Task Button**: Pipeline view now includes a "New Task" button (identical to Dashboard) for quick task creation without switching views.

**Flow View Restructure**: Task timeline now splits into two sections:
1. **Active Tasks**: All tasks not yet merged, with current step highlighted
2. **Completed Tasks**: All MERGED tasks, displayed in a collapsible `<details>` section to reduce visual clutter

**Reusable Component**: `renderTaskCard()` extracted as a shared function used by both Kanban and Flow views. Reduces code duplication and ensures consistent styling across views.

## Parallelism

### Current
- Single cascade at a time (file lock state/locks/task:T-XXXX)
- Sequential: wait for one task's full cascade before starting next
- Worktree per task (not shared)

### Planned
- **Task Queue**: separate queue of pending tasks
- **Concurrency Limit**: configurable (default 2-4 parallel cascades)
- **Conflict Detection**: pre-execute, check git merge viability
- **Dependency Solver**: delay tasks until parent_task_id state=MERGED
- **Shared Worktree Pool**: reuse worktrees across tasks if safe

## Error Handling

### Per-Step Try/Catch
Each step script (architect-task-api.mjs, etc.) wraps LLM call in try/catch:
```javascript
try {
  const response = await callOpenAI(prompt);
  writeRepoFile(task.spec_path, response);
  saveTask(taskId, task);
} catch (err) {
  const errFile = `${stateDir}/errors/${taskId}.errors.json`;
  fs.appendFileSync(errFile, JSON.stringify({
    step: "architect",
    message: err.message,
    timestamp: new Date().toISOString(),
    depth: process.env.CASCADE_DEPTH || 0
  }) + "\n");
  process.exit(1);
}
```

### Error Logging
- **.errors.json per task**: array of {step, message, timestamp, depth}
- **task.last_error**: object with {step, message, timestamp, diagnosis}
- **task.runtime_status**: IDLE, RUNNING, or FAILED

### Auto-Diagnosis
When any pipeline step fails or times out, the cascade engine automatically runs Claude CLI to analyze the error:

1. `diagnoseStepError(taskId, stepName, errMsg)` builds a diagnosis prompt containing task context, the error message, and relevant artifacts (spec, brief, result)
2. Claude CLI (`claude --print`) produces a structured diagnosis with Root Cause, Details, and Suggested Fix
3. The diagnosis is stored in `task.last_error.diagnosis` and displayed in the dashboard under the error message
4. Manual re-diagnosis is available via `POST /api/tasks/:id/diagnose` or the "Re-diagnose" button in the UI
5. Diagnosis has a 2-minute timeout to prevent blocking the pipeline

### Auto-Fix (User-Approved)
After diagnosis, users can request Claude CLI to generate an actual code fix:

1. **Generate Fix** (`POST /api/tasks/:id/generate-fix`): `generateStepFix()` sends Claude the error, diagnosis, failing script source, and relevant artifacts. Claude returns a structured fix with Summary, Risk Level (LOW/MEDIUM/HIGH), Changes (file diffs), and Post-Fix Actions.
2. **Review**: The fix proposal is displayed in the dashboard with syntax-highlighted diffs and a risk badge. The fix is stored in `state/fixes/<fix-id>.json` with status "pending".
3. **Apply Fix** (`POST /api/tasks/:id/apply-fix`): User clicks "Apply Fix" → Claude applies the changes → git commit → if the fix touches serve-dashboard.mjs, the server auto-restarts after 2s.
4. **Reject Fix** (`POST /api/tasks/:id/reject-fix`): Discards the proposal, user can generate a new one.
5. **Safety**: Fixes are never auto-applied. The user MUST click "Apply Fix" to confirm. Risk level is shown prominently.

### Fixed Issues
1. **propose-followups silent failure** (BUG-001): Now throws on zero F-N blocks parsed
2. **merge-task false success** (BUG-002): Now throws on git merge failure + runs merge --abort
3. **Retry UI**: Dashboard has "Retry from <step>" button on failed tasks

## Cowork Test Step (ADR-0003) — Phase 1+2 Implemented

**Position**: after execute, before propose-followups (step 5.5)

**Full spec**: See `COWORK_TEST_FEATURE.md`

**Summary**: After execute, the guardrail classifies changes as Green/Yellow/Red:
- **Green** (no issues): Skip test, proceed to merge (unchanged behavior)
- **Green** (docs-lane): Docs-lane tasks always get GREEN — function/line guardrails don't apply to markdown files
- **Yellow** (1-2 functions changed/missing, or 0 files detected): ✅ Pipeline pauses at BLOCKED_ON_DECISION → Dashboard shows decision UI → user chooses Accept/Run Cowork Test/Restore Snapshot. Cowork Test is **only** run on explicit user request (FIX-046).
- **Red** (>10% functions missing): ✅ Pipeline pauses at BLOCKED_ON_DECISION → Dashboard shows decision UI → user chooses Accept/Restore/Run Test

**Snapshot & Diff mechanism (execute-task-api.mjs)**:
1. Before execute: `snapshotSourceFiles(repoRoot)` recursively walks the project tree and captures file content, line count, and function names for all source files (`.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.mts`, `.html`, `.css`, `.json`). Skips `node_modules`, `.git`, `.next`, `dist`, `build`, `automation/state/`, etc. Max depth 12, max 2000 files, max 1 MB per file.
2. Execute runs (Codex CLI, Claude CLI with tools, or text-based)
3. After execute: takes a second snapshot and diffs against the first. New files and modified files are added to `written_files`.
4. Fallback: if the executor's text output contains `` ```file:path `` blocks, those are also written to disk and added to `written_files`.
5. Both Codex CLI and Claude CLI tool-mode write files directly to the filesystem — the snapshot-diff detects their changes. The executor does NOT need to output file blocks in its text response.

**Phase 1 (Implemented 2026-04-08)**:
- Guardrail threshold classification in execute-task-api.mjs (green/yellow/red)
- Cascade engine routing after execute step based on guardrail level
- Decision Proposal creation for Red threshold in state/proposals/
- API endpoint: `POST /api/tasks/:id/guardrail-decision` (accept/restore/test)
- Dashboard: red guardrail box with issues + 3 buttons, yellow test indicator, new state badges
- File snapshots saved to state/snapshots/ for potential restore

**Phase 2 (Implemented 2026-04-08)**:
- `cowork-test.mjs`: Builds structured test prompt from spec + brief + code + snapshot diff
- Calls `claude --print --model sonnet` CLI (180s timeout)
- Parses structured JSON report (PASS/FAIL with checks, regressions, bugs_to_create)
- Auto-creates bug tasks on FAIL with `parent_task_id` linking and `origin: "cowork-test"`
- Yellow guardrail → runs cowork-test.mjs automatically in cascade
- "Run Cowork Test" decision button launches test async for Red guardrail

**Phase 3 (Implemented 2026-04-08)**:
- Dashboard "Tests" sidebar tab with summary cards (Total/Passed/Failed/Checks)
- Test results list with per-check detail (criterion + status + detail), regressions, auto-created bugs
- Inline test results in Pipeline task cards (compact check badges, "View All Tests" link)
- Data sourced from `test_result` field in task JSON (no separate API needed)
- API endpoint: `GET /api/cowork-tests` (also available for external tooling)

~~**Phase 4**~~: Merged into Phase 2 (auto bug creation)
**Phase 5 (Planned)**: Visual UI testing (Claude browser access via Cowork computer-use)

**New states**: COWORK_TESTING, TESTED, TEST_FAILED, BLOCKED_ON_DECISION
**Config (planned)**: `cowork_test.enabled`, `cowork_test.app_url`, `cowork_test.timeout_ms` in project.config.yaml

## Future: Rollback

- **git revert**: revert the merge commit
- **Task reset**: set task state back to IMPLEMENTED, clear MERGED flag
- **Audit trail**: immutable log of all revert operations
- **Dependency cascade**: reset any dependent tasks
