---
type: architecture
created: 2026-04-10
tags: [ai-flow-lab, architecture]
---

# Architecture

## System Overview

```
    Dashboard (SPA)
         ↓ HTTP
    Serve-Dashboard.mjs (port 3847)
         ↓
    API Router & Cascade Engine
         ↓
    LLM Router (_llm-utils.mjs)
         ↓
    ┌─────────────────────────────────────┐
    │  OpenAI    Gemini   Claude  Codex   │
    │  API       API      CLI     CLI     │
    │  (or APP prompt queue)              │
    └─────────────────────────────────────┘
         ↓
    State Store (JSON files currently)
         ↓
    Dashboard (via polling)
```

## Components

### serve-dashboard.mjs
- **HTTP Server**: Listen on port 3847, routes requests to API handlers
- **Cascade Engine**: orchestrates the 7-step pipeline for each task (cascadeRunTask function)
- **State Management**: reads/writes state/, handles file locks (state/locks/)
- **API Endpoints**: /api/state, /api/tasks, /api/cascade/run, /api/cascade/retry, /api/usage, /api/cascade/status
- **Startup Cleanup**: cleanStaleStatus() resets ghost "running" states on boot

### _llm-utils.mjs
- **Task I/O**: loadTask(), saveTask(), taskFilePath()
- **LLM Router**: getLLMMode() returns "api", "cli", "app", or "mock"
- **Provider Bridges**: callOpenAI(), callGemini(), callClaudeCLI() (two modes), callCodexCLI()
- **callClaudeCLI() — Tool Mode** (steps: execute, cowork-test, diagnose, generate-fix): Uses `claude --print --allowed-tools "Read,Edit,Write,Glob,Grep" --permission-mode acceptEdits --output-format json --max-budget-usd N`. Claude reads/edits files directly. Returns structured JSON with result, cost, turns, token usage.
- **callClaudeCLI() — Plain Mode** (all other steps): Uses `claude --print --output-format text`. Text in, text out, no tool access. Automatic fallback from tool mode to plain mode if `--allowed-tools` is unavailable.
- **APP Mode**: callLLMApp() writes .prompt.md + .meta.json to state/prompts-queue/, polls for .response.md (1hr timeout)
- **Fallback Logic**: Codex CLI has 5min timeout + Claude CLI fallback. Diagnosis/Fix falls back to `callGeminiDirect()` (Gemini API) when Claude CLI unavailable.
- **Usage Tracking**: logUsage() appends to state/usage-log/usage-log.jsonl (now includes costUsd, numTurns, cacheReadTokens for tool mode)
- **Mock Support**: loadMockResponse() from test-fixtures/ for testing
- **Token Estimation**: estimateTokens() for logging

### dashboard.html
- **SPA (Vanilla JS)**: no framework, ~2700 lines
- **Multiple Views**: Flow (cascade timeline), Kanban (by state), Tree (goal→task hierarchy), ChatGPT (raw API)
- **Usage Display**: Token counts AND dollar costs (from Claude CLI JSON output). Per-provider and per-executor breakdown.
- **Dynamic Executor**: Execute step badge resolves from task.executor (codex/claude) instead of hardcoded value.
- **Sandbox Banner**: Auto-detects DNS/network errors and shows warning with instructions to run locally.
- **Polling**: polls /api/state every 1-2s, updates UI reactively
- **Controls**: Run Cascade, Retry, Spawn Followup, View Details buttons
- **Real-Time Feedback**: shows runtime_status (IDLE, RUNNING, ERROR), current_step, last_error

### Step Scripts (7+1 separate files)
Each runs as a child process spawned by cascade engine:
1. **architect-task-api.mjs**: OpenAI → spec_path (markdown)
2. **critique-task-api.mjs**: Gemini → review_path (markdown)
3. **synthesize-task-api.mjs**: OpenAI → brief_path (markdown)
4. **prepare-worktree.mjs**: local git → creates worktree at worktree_path
5. **execute-task-api.mjs**: Claude/Codex → result_path, written_files. **Includes file-safety guardrail**: classifies changes as Green/Yellow/Red, saves snapshots.
5.5. **cowork-test.mjs** (NEW, ADR-0003): Claude CLI → state/cowork-tests/CT-{taskId}.result.json. Runs when guardrail is Yellow (auto) or Red (user choice). Generates test prompt from spec+brief+code+snapshot, calls `claude --print`, parses JSON report, auto-creates bug tasks on FAIL.
6. **propose-followups-api.mjs**: Gemini → proposals/
7. **generate-pr-draft.mjs**: OpenAI → pr_draft_path

### LLM Instructions & Function-Preservation Rules
Execute-task-api.mjs now includes explicit LLM guardrails (rules 9-11) that forbid removing functions or classes not mentioned in the spec. These rules prevent accidental scope creep and maintain code stability. The executor validates that function names snapshots match before/after execution; functions present at start of execution must be present at end (unless explicitly listed in removal_targets from the spec).

## Data Flow

```
User Action (Dashboard)
    ↓
POST /api/cascade/run (serve-dashboard.mjs)
    ↓
cascadeRunTask(taskId, currentStep=null, depth=0, budget=1000)
    ↓
Load task from state/tasks/T-XXXX.json
    ↓
For each step in pipeline (if not already done):
    - deriveFailedStep() checks if resuming from error
    - spawn child process (e.g., architect-task-api.mjs T-XXXX)
    - step script calls LLM (OpenAI/Gemini/Claude/Codex/APP mode)
    - step script updates task JSON (spec_path, review_path, etc.)
    - cascade engine validates output
    ↓
If execute step creates followups: spawn-followup-task.mjs
    ↓
If followups within budget & dedup: recursively cascadeRunTask() for each
    ↓
On success: merge-task.mjs (git merge --no-ff), set state=PR_DRAFTED
    ↓
Dashboard polls /api/state, sees PR_DRAFTED, renders completion
```

## State Store (Current)

JSON files in state/:
- **state/tasks/**: T-XXXX.json (task metadata, state, step outputs)
- **state/goals/**: G-XXXX.json (goal metadata, child task IDs)
- **state/proposals/**: P-XXXX.json (followup proposals)
- **state/prompts-queue/**: T-XXXX.step.prompt.md + .response.md (APP mode only)
- **state/locks/**: task:T-XXXX (1-byte lock files)
- **state/usage-log/**: usage-log.jsonl (token tracking)
- **state/pr_drafts/**: T-XXXX_pr_draft.md

Task JSON schema: task_id, title, repo, lane_type, executor, state, runtime_status, branch_name, worktree_path, spec_path, review_path, brief_path, result_path, followup_path, pr_draft_path, owner_lock, created_at, updated_at, written_files, last_error, current_step

**Planned**: migrate to SQLite (local) or Supabase (cloud). Goals: multi-project namespaces, query performance, audit trail, transaction safety.

## Concurrency Model

**Current**: Single cascade at a time (file lock `state/locks/task:T-XXXX` prevents parallel execution).

**Planned**:
- Task queue with concurrency limit
- Conflict detection before execute step (checks git merge --no-ff viability)
- Auto-rebase before merge if main diverged
- Dependency solver to respect parent task completion

## Executor File-Safety Guardrail (T-0032)

When execute-task-api.mjs runs, it now protects the worktree from unintended file modifications:

1. **Snapshot**: Before executing code, walk the worktree directory tree and record file paths, sizes, hashes
2. **Execute**: Run the executor-generated code (Claude or Codex)
3. **Validate**: After code execution, walk the tree again and compare against snapshot
   - Check: no new files outside written_files list
   - Check: no deleted files (unless in written_files)
   - Check: no modified files (unless in written_files)
   - **Check 3 (NEW)**: Snapshot function/class names before execution, validate they still exist after. If >10% of functions are missing, auto-restore and FAIL.
4. **Restore/Fail**: If any validation fails:
   - Restore all files from snapshot (git checkout)
   - Set task state to FAILED
   - Log diagnostic message identifying which files violated scope
   - Do NOT merge

This prevents executor from accidentally (or maliciously) corrupting unrelated code while still allowing full autonomy over intentional files. The function-existence check (Check 3) works in conjunction with LLM guardrail rules 9-11 to prevent unintended removals.

**Guardrail Redesign (ADR-0003)**: The auto-restore behavior is being replaced with a tiered response:
- **Green** (0 issues): Continue to merge (no user intervention)
- **Yellow** (1-2 functions changed): Route to Cowork Test Step for Claude CLI verification
- **Red** (>10% functions missing): Pause pipeline, create Decision Proposal, user decides
Files are never silently restored. See `COWORK_TEST_FEATURE.md` for full spec.

## Error Recovery

### Startup Cleanup
cleanStaleStatus() in serve-dashboard.mjs resets any task with runtime_status="RUNNING" to "IDLE" (ghost processes on crash).

### Retry Logic
POST /api/tasks/:id/retry:
- deriveFailedStep() finds the first failed step (checks step output files, catches errors)
- Resumes cascade from that step (skips completed steps)
- Now also spawns followups if they're enabled and budget permits

### Codex Fallback
callCodexCLI() has 5min timeout. On timeout or failure, falls back to callClaudeCLI() automatically.

## Planned Changes

1. **Database Migration**: SQLite (local) or Supabase (multi-project + auth)
2. **Multi-Project Namespaces**: state/{projectId}/, config/{projectId}/
3. **Conflict Detection Engine**: pre-execute validation of git merge viability
4. **Audit Trail**: immutable log of all cascade runs, step outputs, retries
5. **Configurable Pipeline**: enable/disable steps, custom step conditions per lane
6. **Parallelism**: queue + concurrency limit, dependency solver
