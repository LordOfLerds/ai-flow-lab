# AI Flow Lab — Implementation Plan v3

> Last updated: 2026-04-07 (rev 4 — Phases 10-13 implemented + Phase 11B + 12A/B)
> Status: APPROVED — Phases 1-3+6+10+11+12+13 DONE, Phases 4-5+7-9+14 open
>
> **This document is Claude's memory for implementation. Read it before every session.**

---

## Overview

This document is the single source of truth for all remaining work on the AI Flow Lab automation pipeline. Every phase lists the exact files to change, what to do, and acceptance criteria.

### Pipeline Target State

```
Goal → Decompose → Tasks → Architect → Critique → Synthesize → Execute → Merge → Follow-ups → PR Draft
                              (openai)   (gemini)   (openai)   (executor)  (auto)   (openai)    (openai)
                                                                   ↑              ↑
                                                            (claude/codex      (auto-spawn
                                                             per config)        with limits)
```

### Executor Routing (Target)

```
Task Type      → Architect → Critique → Synthesize → Execute    → Follow-ups
─────────────────────────────────────────────────────────────────────────────
bug-lane       │ openai    │ claude   │ openai     │ claude     │ openai
feature-lane   │ openai    │ gemini   │ openai     │ codex      │ openai
danger-lane    │ openai    │ claude   │ openai     │ claude     │ openai
analysis-lane  │ openai    │ claude   │ claude     │ claude     │ openai
*configurable via project.config.yaml*
```

---

## Phase Status

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| 1A-D | Fix foundations | ✅ DONE | callClaude, discoverSourceContext, imports, stale status |
| 1E-F | Fix prompt generation | ✅ DONE | Dynamic context, project.config.yaml |
| 2 | Execute + Merge in pipeline | ✅ DONE | Both steps integrated, state transitions work |
| 3 | Cascade engine | ✅ DONE | 7-step cascade, recursive follow-up spawning |
| 4 | Duplicate detection | 🔲 OPEN | Prompt injection + server-side dedup |
| 5 | Real GitHub PR | 🔲 OPEN | `gh pr create` integration |
| 6 | UI mode switch | ✅ DONE | API endpoint + dotenv + client-side override |
| 7 | Validation workflow | 🔲 OPEN | Batch validation after cascade |
| 8 | Proposal UI | 🔲 OPEN | View/approve/spawn proposals |
| 9 | Polish & hardening | 🔲 OPEN | Health checks, nextTaskId dedup |
| **10** | **Follow-up limits + dedup guard** | 🔲 OPEN | **NEW — max spawns, cascade budget, similarity** |
| **11** | **Error state + UI error display** | 🔲 OPEN | **NEW — ERROR state, retry button, error log** |
| **12** | **Execute-result feeds follow-ups** | 🔲 OPEN | **NEW — execution report → propose-followups input** |
| **13** | **Executor routing konfigurierbar** | 🔲 OPEN | **NEW — per-step provider, per-type config** |
| **14** | **APP-mode prompt lock + UI feedback** | 🔲 OPEN | **NEW — idempotent prompts, abort, wait indicator** |

---

## COMPLETED PHASES (1-3, 6) — Reference Only

<details>
<summary>Click to expand completed phases</summary>

### Phase 1 — Fix Broken Foundations ✅

- 1A: `callClaude` in `_llm-utils.mjs` — Anthropic Messages API, tri-mode
- 1B: `discoverSourceContext` in `_llm-utils.mjs` — project-aware file scanner
- 1C: `execute-task-api.mjs` imports fixed, `forceApi` removed
- 1D: Stale `runtime_status` cleanup at server startup
- 1E: `architect-task-api.mjs`, `critique-task-api.mjs`, `synthesize-task-api.mjs` — all rewritten with dynamic `loadTruthFiles()` + `discoverSourceContext()`
- 1F: `project.config.yaml` updated: `project_name: ai-flow-lab`, `truth_sources: [CLAUDE.md, AGENTS.md]`, `entry_points: [index.html, game.html]`

### Phase 2 — Execute + Merge ✅

- Execute added to validSteps, scriptMap, stateAfterStep, nextStep
- `merge-task.mjs` created — commits, merges branch, updates state to MERGED
- State flow: SYNTHESIZED → IMPLEMENTING → MERGED

### Phase 3 — Cascade Engine ✅

- 7-step cascade: architect → critique → synthesize → execute → merge → propose-followups → pr-draft
- Recursive follow-up spawning with maxDepth=3
- Updated in 3 places: run-step handler, inline cascade handler, cascadeRunTask helper

### Phase 6 — UI Mode Switch ✅

- `GET/POST /api/settings/llm-mode` endpoint
- dotenv loaded at server startup
- Dashboard toggle with client-side `_modeOverride` for resilience
- Consistent "mock" default across all code paths

### Additional fixes (session 2):

- `.step-chat.json` phantom files moved out of `state/tasks/`
- Task file filter: `/^T-\d+\.json$/` in 5 places
- `{cache:'no-store'}` on all dashboard fetch calls
- Defensive `t && t.task_id` filter on task arrays
- No-cache response headers on server
- "undefined: undefined" goal dropdown bug identified (not yet fixed)

</details>

---

## Phase 4 — Duplicate Detection for Follow-ups

**Goal**: Prevent the LLM from proposing follow-ups that duplicate existing tasks.

### 4A. Inject existing tasks into follow-up prompt

- **File**: `automation/scripts/propose-followups-api.mjs`
- **What**:
  1. Before calling the LLM, load ALL task JSONs from `state/tasks/`
  2. Build a summary: `T-XXXX: <title> (state: <state>)` for each
  3. Append to prompt: `"These tasks already exist. Do NOT propose duplicates:\n<list>"`
- **Acceptance**: Follow-up prompt includes all existing tasks.

### 4B. Server-side dedup guard

- **File**: `automation/scripts/serve-dashboard.mjs` — cascade spawn logic
- **What**: Before spawning a follow-up, check title similarity against existing tasks. Skip if >80% similar (normalized Levenshtein or Jaccard on word tokens).
- **Acceptance**: Even if LLM proposes duplicate, system won't create it.

---

## Phase 5 — Real GitHub PR via `gh pr create`

*(unchanged from v2 — see original plan)*

---

## Phase 7 — Automated Validation Workflow

*(unchanged from v2 — see original plan)*

---

## Phase 8 — Follow-up Spawn UI + Proposal Management

*(unchanged from v2 — see original plan)*

---

## Phase 9 — Polish & Hardening

*(unchanged from v2 — see original plan)*

---

## Phase 10 — Follow-up Limits + Cascade Budget ✅ DONE

**Goal**: Prevent cascade explosion. Control how many follow-ups spawn per task and how many total tasks a single cascade produces.

### Problem Analysis

Currently: `maxDepth=3` but **no limit per level**. If LLM proposes 5 follow-ups with `should_spawn_now=true`, all 5 spawn. Worst case: 5^3 = 125 tasks from one root task. Mock mode hides this because mock follow-ups are predictable, but with real LLM calls this will explode costs and create noise.

### 10A. Add `maxFollowupsPerTask` parameter

- **File**: `automation/scripts/serve-dashboard.mjs` — cascade logic (~line 1048-1072)
- **What**:
  1. Add `maxFollowupsPerTask` parameter (default: 2) to cascade config
  2. After filtering proposals with `should_spawn_now=true`, sort by relevance/priority
  3. Only spawn the top N (where N = maxFollowupsPerTask)
  4. Log skipped proposals: `[CASCADE] Skipping proposal X (limit reached: 2/2)`
- **Acceptance**: A task with 5 follow-up proposals only spawns 2.

### 10B. Add `maxTotalTasks` cascade budget

- **File**: `automation/scripts/serve-dashboard.mjs` — cascade logic
- **What**:
  1. Add `maxTotalTasks` parameter (default: 8) — total tasks created across all depths
  2. Track a running counter in the cascade context
  3. When budget is exhausted, stop spawning but still finish current task's pipeline
  4. Log: `[CASCADE] Budget exhausted (8/8 tasks). Remaining proposals saved but not spawned.`
- **Acceptance**: Cascade from single root creates at most 8 tasks (including root).

### 10C. Cascade config in `project.config.yaml`

- **File**: `ai/project.config.yaml`
- **What**: Add cascade section:
  ```yaml
  cascade:
    max_depth: 3
    max_followups_per_task: 2
    max_total_tasks: 8
  ```
- **File**: `automation/scripts/serve-dashboard.mjs`
- **What**: Read cascade config from project.config.yaml, use as defaults for cascade runs. API params still override.
- **Acceptance**: Changing yaml changes cascade behavior without code changes.

### 10D. Merge Phase 4B dedup into cascade spawn logic

- **Depends on**: Phase 4B
- **What**: The dedup guard and the per-task limit work together:
  1. Filter proposals: remove duplicates (Phase 4B)
  2. Sort remaining by priority
  3. Take top N (Phase 10A)
  4. Check budget (Phase 10B)
  5. Spawn survivors
- **Acceptance**: Dedup + limit + budget all apply in correct order.

---

## Phase 11 — Error State + UI Error Display ✅ DONE

**Goal**: When a pipeline step fails, the error is captured, displayed in UI, and retryable.

### Problem Analysis

Currently: If `execSync()` throws in cascade, the task stays in the last successful state (e.g. "CRITIQUED") with `runtime_status: "running"` — forever. UI shows no error, just a frozen task. The toast shows briefly and disappears. No way to retry.

### 11A. Add error fields to task JSON

- **File**: `automation/scripts/serve-dashboard.mjs` — step execution handler
- **What**: When a step fails:
  1. Set `runtime_status: "FAILED"`
  2. Set `last_error: { step: "synthesize", message: "401 Unauthorized", timestamp: "..." }`
  3. Set `failed_step: "synthesize"` — marks where to retry from
  4. Do NOT advance state
- **File**: Task JSON schema update — add `last_error` and `failed_step` fields
- **Acceptance**: Failed task shows `runtime_status: "FAILED"` with error details.

### 11B. UI error display

- **File**: `automation/ui/dashboard.html`
- **What**:
  1. Add "ERROR" to state badge colors (red background)
  2. In pipeline flow view: failed step shows red icon with error tooltip
  3. Task card shows error banner: "Step 'synthesize' failed: 401 Unauthorized"
  4. Error persists across page refreshes (stored in task JSON, not just toast)
- **Acceptance**: Failed task is visually obvious in both pipeline and dashboard views.

### 11C. Retry from failed step

- **File**: `automation/scripts/serve-dashboard.mjs`
- **What**:
  1. Add `POST /api/tasks/:id/retry` endpoint
  2. Reads `failed_step` from task JSON
  3. Clears `last_error`, sets `runtime_status: "RUNNING"`
  4. Re-runs the cascade from `failed_step` (not from beginning)
- **File**: `automation/ui/dashboard.html`
- **What**: Add "Retry" button on failed tasks that calls the retry endpoint.
- **Acceptance**: Clicking retry on a task that failed at "synthesize" re-runs from synthesize, not from architect.

### 11D. Error log per task

- **File**: `automation/scripts/serve-dashboard.mjs`
- **What**:
  1. Each step execution appends to `state/tasks/T-XXXX.errors.json` (array of error entries)
  2. Track: `{ step, timestamp, error, attempt, resolved }`
  3. Serve via `GET /api/tasks/:id/errors`
- **File**: `automation/ui/dashboard.html`
- **What**: Task detail panel shows error history timeline.
- **Acceptance**: User can see full error history for any task.

---

## Phase 12 — Execute-Result Feeds Follow-ups ✅ DONE

**Goal**: The execution report from Claude/Codex is used as input for follow-up proposals, so follow-ups are based on what actually happened, not just the plan.

### Problem Analysis

Currently: `propose-followups-api.mjs` gets spec + review + brief as input. The execute result (`ai/results/T-XXXX_result.md`) is **never read**. If Claude discovers during execution "this module also needs X" or "I found a second bug here", that information is lost. Follow-ups are proposed based on the plan, not the reality.

### 12A. Structured execution report format

- **File**: `automation/scripts/execute-task-api.mjs`
- **What**: The execute step must produce a structured document with sections:
  ```markdown
  # Execution Report: T-XXXX

  ## What was done
  - Changed X in file Y
  - Added function Z

  ## What was NOT done (out of scope / blocked)
  - Feature A was skipped because...

  ## Issues discovered during execution
  - Found bug: collision detection also fails for...
  - Missing test coverage for...

  ## Suggested follow-ups (from executor perspective)
  - [ ] Fix collision edge case in enemy hitboxes
  - [ ] Add unit tests for physics module
  ```
- **Acceptance**: Execute step produces report with all 4 sections.

### 12B. Feed execution report into propose-followups

- **File**: `automation/scripts/propose-followups-api.mjs`
- **What**:
  1. Load the execution report from `task.result_path`
  2. Include it in the follow-up prompt **after** spec/review/brief:
     ```
     ## Execution Report (what actually happened)
     <execution report content>

     Based on the original plan AND the execution report, propose follow-up tasks.
     Pay special attention to:
     - Issues discovered during execution
     - Things that were NOT done
     - Suggested follow-ups from the executor
     ```
  3. Weight executor-suggested follow-ups higher
- **Acceptance**: Follow-up proposals reflect execution reality, not just the plan.

### 12C. Claude/Codex execution document → ChatGPT synthesis

- **What**: This creates the feedback loop the user requested:
  1. Claude (execute) writes structured execution report
  2. ChatGPT (propose-followups) reads that report + all prior docs
  3. ChatGPT synthesizes follow-ups that account for what Claude found
  4. Those follow-ups get architected → critiqued → synthesized → executed by Claude again
- **The flow becomes**:
  ```
  Claude executes → writes report → ChatGPT reads report → proposes follow-ups
       ↑                                                          ↓
       └──────────── next task cycle ←── architect ←── spawn ←────┘
  ```
- **Acceptance**: End-to-end: Claude's execution findings influence the next cycle's follow-ups.

---

## Phase 13 — Executor Routing Konfigurierbar ✅ DONE

**Goal**: Which LLM handles which pipeline step is configurable per task type, not hardcoded.

### Problem Analysis

Currently: Only the execute step respects `task.executor`. All other steps are hardcoded:
- Architect → always OpenAI
- Critique → always Gemini
- Synthesize → always OpenAI
- Follow-ups → always OpenAI
- PR Draft → always OpenAI

This is wrong for several reasons:
- Claude is better at code critique than Gemini for bug-lane tasks
- Analysis tasks should use Claude end-to-end
- Users should be able to override based on their API key situation

### 13A. Executor routing config in `project.config.yaml`

- **File**: `ai/project.config.yaml`
- **What**: Add routing section:
  ```yaml
  executor_routing:
    default:
      architect: openai
      critique: gemini
      synthesize: openai
      execute: codex
      followups: openai
      pr_draft: openai
    overrides:
      bug-lane:
        critique: claude
        execute: claude
      danger-lane:
        critique: claude
        execute: claude
      analysis-lane:
        critique: claude
        synthesize: claude
        execute: claude
  ```
- **Acceptance**: Config defines per-type, per-step provider assignment.

### 13B. Routing function in `_llm-utils.mjs`

- **File**: `automation/scripts/_llm-utils.mjs`
- **What**:
  1. Add `getProviderForStep(step, laneType)` function
  2. Reads `project.config.yaml` → `executor_routing`
  3. Checks `overrides[laneType][step]` first, falls back to `default[step]`
  4. Returns `"openai"` | `"gemini"` | `"claude"` | `"codex"`
- **Export**: Add to module exports
- **Acceptance**: `getProviderForStep('critique', 'bug-lane')` returns `'claude'`.

### 13C. Wire routing into all step scripts

- **Files**: `architect-task-api.mjs`, `critique-task-api.mjs`, `synthesize-task-api.mjs`, `propose-followups-api.mjs`, `generate-pr-draft.mjs`
- **What**: Each script:
  1. Loads task to get `lane_type`
  2. Calls `getProviderForStep(stepName, task.lane_type)`
  3. Routes to `callOpenAI` / `callGemini` / `callClaude` accordingly
  4. Falls back to current hardcoded provider if config missing
- **Acceptance**: Changing config yaml changes which LLM handles which step without code changes.

### 13D. UI displays actual provider per step

- **File**: `automation/ui/dashboard.html`
- **What**: Pipeline step badges should show the actual provider used (from task metadata), not hardcoded labels. Read from usage log or task JSON.
- **Acceptance**: If a bug-lane task uses Claude for critique, the UI shows "claude" not "gemini".

---

## Phase 14 — APP-Mode Prompt Lock + UI Feedback 🆕

**Goal**: In APP mode, prevent duplicate prompts, show waiting state in UI, allow abort.

### Problem Analysis

Currently: `callLLMApp` writes `.prompt.md` and polls for `.response.md`. No lock mechanism. If the same step is triggered twice (user clicks button twice, or cascade retries), two prompts are created. Two processes poll simultaneously. The UI shows no waiting state — user doesn't know a prompt is outstanding.

### 14A. Prompt lock mechanism

- **File**: `automation/scripts/_llm-utils.mjs` — `callLLMApp()`
- **What**:
  1. Before writing prompt, check if a `.prompt.md` for this task+step already exists with status "pending"
  2. If yes → don't write a new one, instead attach to the existing poll loop
  3. Use `.meta.json` status field: `"pending"` | `"completed"` | `"aborted"`
  4. Lock key: `{taskId}-{step}` (not timestamp-based)
- **Acceptance**: Double-clicking "Run architect" doesn't create two prompts.

### 14B. Abort endpoint

- **File**: `automation/scripts/serve-dashboard.mjs`
- **What**:
  1. `POST /api/prompts/:id/abort` — sets meta status to `"aborted"`
  2. The polling loop in `callLLMApp` checks for abort status and throws `AbortError`
  3. Task state rolls back to before the step started
- **Acceptance**: User can cancel a waiting prompt from the UI.

### 14C. UI waiting indicator

- **File**: `automation/ui/dashboard.html`
- **What**:
  1. When a task has an outstanding prompt (status "pending" in prompts queue), show:
     - Animated "waiting" icon on the step
     - Timer: "Waiting for response... (2m 34s)"
     - "Abort" button
  2. Poll `/api/prompts` periodically to update status
- **Acceptance**: User sees which tasks are waiting for manual paste and how long they've been waiting.

---

## Implementation Order (Updated)

| Priority | Phase | Depends on | Effort | Impact |
|----------|-------|------------|--------|--------|
| ~~P0~~ | ~~Phase 1-3, 6~~ | — | ~~Done~~ | ~~Done~~ |
| **P0** | **Phase 10 (Follow-up limits)** | — | Small | Prevents cascade explosion |
| **P0** | **Phase 11 (Error state + UI)** | — | Medium | Users can see & fix failures |
| **P0** | **Phase 12 (Execute→Follow-ups)** | — | Small | Closes the feedback loop |
| **P1** | **Phase 4 (Dedup detection)** | 10 | Small | Combined with Phase 10 |
| **P1** | **Phase 13 (Executor routing)** | — | Medium | Per-type LLM assignment |
| **P2** | **Phase 14 (APP-mode lock)** | — | Medium | Prevents duplicate prompts |
| **P2** | Phase 7 (Validation workflow) | 12 | Medium | Post-cascade testing |
| **P2** | Phase 8 (Proposal UI) | 4, 10 | Medium | Manual proposal management |
| **P3** | Phase 5 (Real GitHub PR) | — | Small | Nice to have |
| **P3** | Phase 9 (Polish) | All | Small | Final cleanup |

**Next implementation session: Phases 10 → 11 → 12 (highest impact, unblocked)**

---

## Key Design Decisions (Updated)

1. **No separate review step** — replaced by batch validation (Phase 7)
2. **Execute runs via Claude or Codex** — routed per task type (Phase 13)
3. **Merge is automatic** — no human gate
4. **Cascade is the default** — with budget limits (Phase 10)
5. **Duplicate detection is LLM-side + server-side** — Phase 4 + 10D
6. **Execute result feeds follow-ups** — Phase 12, closes the Claude→ChatGPT feedback loop
7. **Executor routing is configurable** — Phase 13, per-type and per-step in yaml
8. **Error states are first-class** — Phase 11, visible in UI, retryable
9. **APP-mode is idempotent** — Phase 14, no duplicate prompts
10. **Cascade budget** — max tasks per cascade configurable (Phase 10)

---

## Files Index (Updated)

| File | Action | Phase |
|------|--------|-------|
| `automation/scripts/_llm-utils.mjs` | Add `getProviderForStep()`, update `callLLMApp()` lock | 13B, 14A |
| `automation/scripts/serve-dashboard.mjs` | Cascade limits, error state, retry endpoint, abort | 10, 11, 14B |
| `automation/scripts/propose-followups-api.mjs` | Add existing tasks to prompt, read execute result | 4A, 12B |
| `automation/scripts/execute-task-api.mjs` | Structured execution report format | 12A |
| `automation/scripts/architect-task-api.mjs` | Use `getProviderForStep()` | 13C |
| `automation/scripts/critique-task-api.mjs` | Use `getProviderForStep()` | 13C |
| `automation/scripts/synthesize-task-api.mjs` | Use `getProviderForStep()` | 13C |
| `automation/scripts/generate-pr-draft.mjs` | `gh pr create`, use routing | 5, 13C |
| `automation/scripts/spawn-followup-task.mjs` | Mark proposals as spawned | 8 |
| `automation/scripts/validate-batch.mjs` | **New file** | 7 |
| `automation/ui/dashboard.html` | Error display, retry button, prompt wait indicator, provider badges | 11B, 11C, 14C, 13D |
| `ai/project.config.yaml` | Add `cascade:` and `executor_routing:` sections | 10C, 13A |

---

## Appendix: Gap Analysis (2026-04-07)

### Follow-up Spawning
- **Current**: maxDepth=3, no per-task limit, no total budget
- **Risk**: 5^3 = 125 tasks possible in real LLM mode
- **Fix**: Phase 10 — maxFollowupsPerTask=2, maxTotalTasks=8

### Duplicate Detection
- **Current**: None. T-0010, T-0011, T-0012 all had identical titles in test run
- **Fix**: Phase 4 (prompt injection) + Phase 10D (server-side Jaccard)

### Error Handling
- **Backend**: Retry with backoff works (transient: 429/500/502/503, permanent: 401/403/404)
- **UI**: No error state. Toast vanishes in 3s. Task freezes silently
- **Fix**: Phase 11 — first-class error state, red badges, retry button, error log

### Execute → Follow-ups Gap
- **Current**: Execute produces `result.md` but propose-followups never reads it
- **Impact**: Follow-ups based on plan, not reality. Claude's findings lost
- **Fix**: Phase 12 — structured report format, feed into follow-up prompt

### Executor Routing
- **Current**: Only execute step respects task.executor. Others hardcoded
- **Fix**: Phase 13 — configurable per lane_type per step in yaml

### APP Mode
- **Current**: No idempotency, no abort, no UI feedback for waiting
- **Fix**: Phase 14 — lock mechanism, abort endpoint, timer in UI
