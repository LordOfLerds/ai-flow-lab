# API Reference

**Base URL:** `http://localhost:3847`
**Source:** `automation/scripts/serve-dashboard.mjs`

---

## Health & Settings

### GET /api/health
System diagnostics for LLM mode, API keys, and CLI availability.

**Response:**
```json
{
  "mode": "app",
  "keys": { "openai": true, "gemini": true, "anthropic": false },
  "cli": { "claude": true, "claudeVersion": "1.x.x", "codex": false },
  "claudeReady": true,
  "issues": []
}
```

### GET /api/settings/llm-mode
Returns current LLM execution mode.

**Response:** `{ "mode": "app" }`

### POST /api/settings/llm-mode
Change the LLM execution mode at runtime.

**Body:** `{ "mode": "app|api|cli|mock" }`
**Response:** `{ "success": true, "mode": "app" }`

---

## State & Project

### GET /api/state
Complete system state: goals, tasks, proposals, decisions, PR drafts, mode.

**Response:**
```json
{
  "goals": [...],
  "tasks": [...],
  "proposals": [...],
  "decision_proposals": [...],
  "decisions": [...],
  "pr_drafts": [...],
  "e2e_test_result": null,
  "mode": "app"
}
```
Includes doc existence checks per task (`spec_path`, `review_path`, `brief_path`, `result_path`, `followup_path`, `pr_draft_path`).

### GET /api/project
Project metadata and configuration from `project.config.yaml`.

**Response:**
```json
{
  "name": "pixel-runner",
  "root": "/path/to/repo",
  "automation_root": "/path/to/repo/automation",
  "config": { ... },
  "has_agents": true,
  "has_claude": true,
  "has_domain_model": true,
  "has_invariants": true,
  "has_architecture": true
}
```

### POST /api/project/init
Initialize a new project or import existing one.

**Body:** `{ "mode": "new|import|chat", "name": "...", "description": "...", "importPath": "..." }`
**Response:** `{ "success": true, "message": "..." }` (202 Accepted, runs async)

### POST /api/project/analyze
Analyze a codebase and generate architecture/structure report.

**Body:** `{ "projectPath": "/path/to/project" }`
**Response:** Parsed JSON analysis output.

### POST /api/project/apply-response
Parse and apply bootstrap/import response, writing docs to repo.

**Body:** `{ "response": "...", "projectName": "..." }`
**Response:** `{ "success": true, "written": ["docs/ARCHITECTURE.md", ...] }`

---

## Goals

### POST /api/goals/create
Create a new goal.

**Body:** `{ "goalId": "G-001", "title": "...", "description": "...", "priority": "high" }`
**Response:** `{ "success": true, "goalId": "G-001" }`

### POST /api/goals/:goalid/edit
Edit goal properties.

**Body:** `{ "title?": "...", "description?": "...", "priority?": "...", "state?": "..." }`
**Response:** `{ "success": true, "goal": { ... } }`

### POST /api/run/goal
Trigger background execution of a goal's first task.

**Body:** `{ "goalId": "G-001", "firstTaskId": "T-0001" }`
**Response:** `{ "success": true, "goalId": "G-001", "firstTaskId": "T-0001", "message": "..." }` (202)

---

## Tasks — CRUD

### POST /api/tasks/create
Create a new task.

**Body:**
```json
{
  "taskId": "T-0052",
  "title": "Add user authentication",
  "laneType": "feature-lane",
  "executor": "codex",
  "description": "...",
  "parentGoalId": "G-001"
}
```
**Response:** `{ "success": true, "taskId": "T-0052", "message": "..." }`

### POST /api/tasks/:taskid/edit
Edit task fields (title, executor, lane_type, state, runtime_status, branch_name, description, parent_goal_id).

**Body:** `{ "title?": "...", "executor?": "claude", ... }`
**Response:** `{ "success": true, "task": { ... } }`

### POST /api/tasks/:taskid/advance
Manually advance task to next pipeline stage with artifact validation.

**Body:** `{ "targetState?": "CRITIQUED" }`
**Response:** `{ "success": true, "task": { ... } }`

---

## Tasks — Execution & Pipeline

### POST /api/run/task
Trigger background execution of a single task through full pipeline.

**Body:** `{ "taskId": "T-0052" }`
**Response:** `{ "success": true, "taskId": "T-0052", "message": "..." }` (202)

### POST /api/run/step
Run a specific pipeline step (plan-goal or individual task step).

**Body:** `{ "goalId?": "G-001", "taskId?": "T-0052", "step": "architect|critique|synthesize|execute|merge|propose-followups|pr-draft" }`
**Response:** `{ "success": true, "message": "..." }` (202)

### POST /api/tasks/:taskid/run-step
Run a single pipeline step with optional auto-advance (chains subsequent steps).

**Body:** `{ "step": "architect|critique|...", "autoAdvance?": true }`
**Response:** `{ "success": true, "message": "..." }` (202, runs in background)

---

## Tasks — Git & Merge

### POST /api/tasks/:taskid/create-branch
Create a git branch for a task.

**Response:** `{ "success": true, "taskId": "T-0052" }`

### POST /api/tasks/:taskid/merge
Merge a task's git branch back to main.

**Response:** `{ "success": true }`

### POST /api/tasks/merge-batch
Merge multiple task branches in batch.

**Body:** `{ "taskIds": ["T-0050", "T-0051", "T-0052"] }`
**Response:** `{ "results": [{ "taskId": "T-0050", "success": true }, ...] }`

---

## Cascade Engine

### POST /api/cascade/run-task
Run a task through the full pipeline with follow-up spawning, dedup, and depth limits.

**Body:**
```json
{
  "taskId": "T-0052",
  "maxDepth": 3,
  "maxFollowupsPerTask": 5,
  "maxTotalTasks": 20
}
```
**Response:** `{ "success": true, "message": "..." }` (202)

### POST /api/cascade/run-goal
Decompose a goal into tasks, spawn them, and run them recursively.

**Body:** `{ "goalId": "G-001", "maxDepth": 3 }`
**Response:** `{ "success": true, "message": "..." }` (202)

### GET /api/cascade/status
Get cascade execution status and statistics.

**Response:**
```json
{
  "running": [{ "id": "T-0052", "step": "execute" }],
  "failed": [{ "id": "T-0050", "step": "critique", "error": "..." }],
  "queued": 2,
  "completed": 5,
  "total": 10,
  "pending_auto_spawns": 1,
  "cascade_config": { ... }
}
```

---

## Prompts & Responses (APP Mode)

### GET /api/prompts
List all queued/pending prompts with metadata.

**Response:**
```json
[{
  "id": "T-0052-architect-1712678400000",
  "text": "...",
  "hasPrompt": true,
  "hasResponse": false,
  "promptSize": 4500,
  "responseSize": 0,
  "meta": { "taskId": "T-0052", "step": "architect", ... }
}]
```

### POST /api/prompts/:id/respond
Submit a response to a queued prompt.

**Body:** `{ "response": "ChatGPT's response text..." }`
**Response:** `{ "success": true, "id": "...", "responseFile": "..." }`

### POST /api/chatgpt/queue
Queue a prompt for ChatGPT response (manual queueing).

**Body:** `{ "prompt": "...", "taskId?": "T-0052", "step?": "architect" }`
**Response:** `{ "success": true, "id": "...", "message": "..." }` (201)

---

## Documents & Knowledge

### GET /api/document
Retrieve a single document by relative path.

**Query:** `?path=state/specs/T-0052.spec.md`
**Response:** `{ "path": "...", "content": "...", "size": 4500 }`

### GET /api/documents
List all documents organized by category.

**Response:**
```json
{
  "specs": [...],
  "reviews": [...],
  "briefs": [...],
  "results": [...],
  "followups": [...],
  "pr_drafts": [...],
  "reports": [...],
  "current_state": [...],
  "goals": [...],
  "project_docs": [...],
  "decisions": [...],
  "adr": [...]
}
```

---

## Decisions & Proposals

### GET /api/decisions
List all decision proposals and resolved decisions.

**Response:** `{ "decision_proposals": [...], "resolved_proposals": [...], "decisions": [...] }`

### POST /api/decisions/resolve
Resolve a decision proposal by selecting an option.

**Body:** `{ "proposalId": "...", "selectedOption": "option_a", "rationale": "..." }`
**Response:** `{ "success": true, "decisionId": "...", "proposalId": "..." }`
Side effect: Unblocks tasks/goals waiting on this decision.

### GET /api/proposals
List all proposals (follow-up candidates) with optional parent filter.

**Query:** `?parent=T-0052`
**Response:** `{ "proposals": [{ ..., "spawned_as?": "T-0053" }] }`

### POST /api/proposals/:id/spawn
Spawn a proposal into a new task (with dedup check).

**Response (201):** `{ "success": true, "task_id": "T-0053", "proposal_id": "...", "title": "...", "message": "..." }`
**Response (409):** `{ "success": false, "error": "duplicate", "duplicate_of": "T-0050" }`

---

## Guardrails & Testing

### POST /api/tasks/:id/guardrail-decision
Handle guardrail decision after execute step.

**Body:** `{ "action": "accept|restore|test", "proposalId?": "..." }`
**Response:** `{ "ok": true, "taskId": "...", "action": "accept", "message": "..." }`

Actions:
- **accept**: Accept changes, continue to merge
- **restore**: Restore snapshot, fail task
- **test**: Launch Cowork Test async

### GET /api/cowork-tests
List all Cowork test results.

**Response:**
```json
[{
  "task_id": "T-0052",
  "title": "...",
  "state": "...",
  "lane_type": "...",
  "result": "PASS|FAIL",
  "summary": "...",
  "checks": [{ "criterion": "...", "status": "PASS|FAIL", "detail": "..." }],
  "regressions": [],
  "created_bugs": [],
  "tested_at": "ISO8601",
  "prompt_file": "...",
  "result_file": "..."
}]
```

---

## Error Handling & Recovery

### POST /api/tasks/:id/diagnose
Diagnose a failed task using LLM analysis.

**Response:** `{ "ok": true, "taskId": "...", "diagnosis": { "root_cause": "...", "details": "...", "suggested_fix": "..." } }`

### POST /api/tasks/:id/generate-fix
Generate a proposed fix for a failed step.

**Response:** `{ "ok": true, "taskId": "...", "fix": { "id": "fix-T-0052-...", "content": "...", "risk": "LOW|MEDIUM|HIGH", "status": "pending" } }`

### POST /api/tasks/:id/apply-fix
Apply a previously generated fix.

**Response:** `{ "ok": true, "taskId": "...", "fixId": "...", "apply_output": "...", "needs_restart": false, "message": "..." }`
Side effect: Creates git commit. Restarts server if fix touches serve-dashboard.mjs.

### POST /api/tasks/:id/reject-fix
Reject a proposed fix.

**Response:** `{ "ok": true, "taskId": "...", "fixId": "...", "message": "..." }`

### GET /api/tasks/:id/fix
Retrieve a proposed fix for a task.

**Response:** `{ "ok": true, "fix": { ... } }` (fix can be null)

### POST /api/tasks/:id/retry
Retry a failed task from the failed step onward.

**Response:** `{ "success": true, "message": "..." }` (202)
Includes guardrail check after execute, auto-diagnosis on failure, follow-up spawning on success.

### POST /api/tasks/:id/cancel
Cancel a running or idle task.

**Response:** `{ "ok": true, "taskId": "...", "message": "...", "wasRunning": true }`

### GET /api/tasks/:id/errors
Retrieve error log for a task.

**Response:** `{ "taskId": "...", "errors": [{ "step": "...", "message": "...", "timestamp": "...", "depth": 0 }] }`

---

## Git Information

### GET /api/git
Current branch, all branches, and recent commit log.

**Response:**
```json
{
  "current_branch": "main",
  "branches": [{ "name": "main", "hash": "abc123", "date": "...", "subject": "..." }],
  "log": [{ "hash": "abc123", "subject": "...", "date": "..." }]
}
```

### GET /api/git/graph
Detailed git commit graph with parent relationships for ancestry visualization.

**Response:**
```json
{
  "commits": [{ "hash": "...", "short": "...", "parents": [...], "subject": "...", "author": "...", "date": "...", "refs": [...] }],
  "branches": [{ "name": "...", "commit": "...", "upstream": "..." }],
  "current": "main"
}
```

---

## Usage Tracking

### GET /api/usage
Retrieve raw usage log entries.

**Response:**
```json
[{
  "timestamp": "2026-04-07T10:23:45.123Z",
  "taskId": "T-0001",
  "step": "architect",
  "provider": "openai",
  "model": "gpt-4o",
  "inputTokens": 1500,
  "outputTokens": 3200,
  "durationMs": 8500,
  "costUsd": 0.09,
  "numTurns": 3,
  "cacheReadTokens": 500
}]
```

---

## Endpoint Summary

| Category | Count | Methods |
|----------|-------|---------|
| Health & Settings | 3 | 1 GET, 2 POST |
| State & Project | 5 | 2 GET, 3 POST |
| Goals | 3 | 3 POST |
| Tasks CRUD | 3 | 3 POST |
| Tasks Execution | 3 | 3 POST |
| Tasks Git | 3 | 3 POST |
| Cascade Engine | 3 | 1 GET, 2 POST |
| Prompts (APP Mode) | 3 | 1 GET, 2 POST |
| Documents | 2 | 2 GET |
| Decisions & Proposals | 4 | 1 GET, 3 POST |
| Guardrails & Testing | 2 | 1 GET, 1 POST |
| Error Handling | 7 | 2 GET, 5 POST |
| Git Info | 2 | 2 GET |
| Usage | 1 | 1 GET |
| **Total** | **44** | **14 GET, 30 POST** |
