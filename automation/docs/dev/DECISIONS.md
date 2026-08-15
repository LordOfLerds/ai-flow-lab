---
type: document
created: 2026-04-10
tags: [ai-flow-lab, document]
---

# Decision Register

## ADR-0001: 7-Step Pipeline Architecture

**Status**: Implemented

**Decision**: Decompose the cascade into 7 sequential steps, each with a dedicated LLM provider and state transition.

**Rationale**:
- Separation of concerns: architect (spec), critique (review), synthesize (plan), execute (code), propose (followups), draft (PR description)
- Observability: track cost and tokens per step
- Recoverability: retry from any step
- Flexibility: can replace/skip steps via configuration
- Clarity: clear responsibilities, easier to debug

**Consequences**:
- Longer cascade (7 serial LLM calls, ~2-3 minutes per task)
- Higher token cost (some redundant prompting)
- Mitigated by parallelism (followups run concurrently)

**Alternatives Considered**:
- 2-step (architect then execute): less observable, harder to recover
- Monolithic (single LLM call): less flexible, poor error isolation

---

## ADR-0002: Decision Gate Model

**Status**: Implemented (Phase 1+2, 2026-04-08)

**Decision**: Introduce a BLOCKED_ON_DECISION state where a task waits for human review before proceeding.

**Rationale**:
- Critical decisions (security, architecture) benefit from human review
- Cascade can run autonomously up to the gate
- Human can approve, reject, or modify before continuing

**Design**:
- New state: BLOCKED_ON_DECISION (between EXECUTED and IMPLEMENTING/MERGE)
- Guardrail routing: GREEN → auto-merge, YELLOW → Cowork Test, RED → Decision Proposal
- Decision Proposal UI with Accept/Restore/Test buttons in dashboard
- `POST /api/tasks/:id/guardrail-decision` API endpoint
- `POST /api/decisions/resolve` for general decision resolution
- Audit trail of all decisions stored in `state/decision_proposals/`

**Implementation** (FIX-021, FIX-022):
- Guardrail threshold routing after execute step (execute-task-api.mjs)
- Decision Proposal creation on RED guardrail results
- Dashboard UI: red guardrail box with issues + 3 action buttons
- Cowork Test step (cowork-test.mjs) validates executor output via Claude CLI
- Auto-bug creation on test failure with parent_task_id linking
- Retry flow also checks guardrails (FIX-028)

**Consequences**:
- Adds ~30-60s latency for Cowork Test step (Claude CLI call)
- New states: EXECUTED, COWORK_TESTING, TESTED, TEST_FAILED, BLOCKED_ON_DECISION
- Dashboard shows decision proposals in Decisions tab (open + resolved)

---

## DEC: execSync → Async Migration (Planned)

**Current**: All child process spawning uses execSync (blocking)

**Issue**: synchronous calls block the event loop, slow HTTP responses, poor concurrent request handling

**Solution**: Migrate to async execFileAsync (planned)
- callClaudeCLI(): use execFileAsync instead of execSync
- callCodexCLI(): use execFileAsync instead of execSync
- Timeout handling: Promise.race([execFileAsync(...), timeout])

**Impact**: No breaking changes to callers (all cascade paths already handle promises/async)

**Status**: Documented, not yet implemented

---

## DEC: Codex 5min Timeout + Claude Fallback

**Rationale**: Codex CLI sometimes hangs on interactive prompts (e.g., "do you approve? [y/n]")

**Implementation** (execute-task-api.mjs):
```javascript
try {
  const result = await callCodexCLI(prompt, 5 * 60 * 1000); // 5min
} catch (err) {
  if (err.code === "TIMEOUT") {
    console.warn("Codex timeout, falling back to Claude");
    const result = await callClaudeCLI(prompt, 15 * 60 * 1000); // 15min
  }
}
```

**Consequence**: Slower on Codex timeout (adds 5min latency), but ensures completion

**Alternative**: Increase timeout for Codex (defeats purpose, hangs longer)

---

## DEC: Gemini Not in APP Mode Prompt Queue

**Current**: APP mode manually queues OpenAI prompts (architect, synthesize, pr-draft). Gemini (critique, propose) runs via API directly.

**Rationale**:
- OpenAI has limited free tier, warrants manual review before spending tokens
- Gemini is faster/cheaper, acceptable to run autonomously
- Claude CLI is async + local, always safe

**Consequence**: Inconsistent: some steps queue, some run automatically

**Alternative Considered**: Queue all steps to APP mode (too slow, defeats automation)

**Planned**: Configurable per-step (architecture/costs/strategy) instead of hard-coded per provider

---

## DEC: Configurable Pipeline (Planned)

**Current**: 7 steps are hard-coded in cascadeRunTask()

**Issue**: Some projects need only certain steps (e.g., skip test, skip propose)

**Solution**: pipeline.yaml per project
```yaml
steps:
  - name: architect
    enabled: true
  - name: critique
    enabled: true
  - name: synthesize
    enabled: true
  - name: bootstrap
    enabled: true
  - name: execute
    enabled: true
  - name: test
    enabled: false  # skip test
  - name: propose
    enabled: true
  - name: pr-draft
    enabled: true
```

**Cascade Logic**: skip disabled steps, adjust state machine accordingly

**Complexity**: state machine becomes conditional (IMPLEMENTING → FOLLOWUPS_PROPOSED if test disabled, else → TESTED → FOLLOWUPS_PROPOSED)

---

## ADR-0003: Cowork Test Step & Guardrail Redesign

**Status**: Phase 1+2 Implemented (2026-04-08) — guardrail routing, decision UI, API, cowork-test.mjs, CLI invocation, report parsing, auto bug creation. Phase 3 (Dashboard Tests tab) and Phase 5 (visual UI testing) pending.

**Decision**: Replace the automatic file-restore guardrail with a tiered response system, and add a Cowork Test Step (position 5.5, between Execute and Merge) that validates executor output using Claude CLI.

**Rationale**:
- T-0027 incident showed that auto-restoring files without user awareness is dangerous — the user never knows what was restored or why
- Pipeline currently has no visual/functional verification of code changes
- Code that compiles is not necessarily code that works

**Design** (full spec: `COWORK_TEST_FEATURE.md`):
- **Green** (no issues): Skip test, continue to Merge (unless lane forces test)
- **Yellow** (1-2 functions changed): Run Cowork test via Claude CLI — reads spec, reads code, checks correctness, outputs structured report
- **Red** (>10% functions missing): Pipeline pauses, Decision Proposal created, user chooses Accept/Restore/Test
- On test failure: auto-create bug task that re-enters the pipeline

**Consequences**:
- Adds ~30-60s latency for Cowork test step (Claude CLI call)
- Requires Claude CLI with OAuth (already available)
- New states: COWORK_TESTING, TESTED, TEST_FAILED, BLOCKED_ON_DECISION
- Dashboard gets a new "Tests" tab

**Migration**: 5 phases — guardrail routing → test script → dashboard tab → auto bug creation → visual UI testing

---

## DEC: JSON → DB Migration (Planned)

**Current**: state files are JSON in state/tasks/, state/goals/, state/proposals/

**Issues**:
- No transactions (concurrent writes can corrupt files)
- Slow queries (no indexes)
- No audit trail (can't see who changed what)
- No multi-project namespacing

**Planned**: SQLite (local) or Supabase (cloud + auth)

**Schema** (outline):
```sql
-- Tasks
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  task_id TEXT,
  title TEXT,
  state TEXT,
  runtime_status TEXT,
  ...
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  INDEX(project_id, state)
);

-- Audit Trail
CREATE TABLE task_events (
  id INTEGER PRIMARY KEY,
  task_id TEXT,
  event TEXT,
  old_value JSON,
  new_value JSON,
  timestamp TIMESTAMP,
  INDEX(task_id)
);
```

**Migration Strategy**:
1. Write SQLite version alongside JSON
2. Dual-write: save to JSON + SQLite
3. Dual-read: prefer SQLite, fall back to JSON
4. Migrate data incrementally
5. Drop JSON version (after validation)

**Timeline**: v2.0 release

---

## DEC: Parallelism Strategy (Planned)

**Current**: Single cascade at a time (file lock state/locks/task:T-XXXX)

**Issue**: Slow for multi-task goals (e.g., goal with 5 subtasks = 10-15 minutes sequential)

**Planned**:
1. **Task Queue** (Redis or in-memory): pending tasks with priority
2. **Worker Pool** (concurrency limit, default 2-4): spawn up to N parallel cascades
3. **Conflict Detection** (pre-execute): git merge --no-ff --dry-run to check viability
4. **Dependency Solver** (during queue): delay task if parent_task_id not MERGED
5. **Shared Worktree Pool** (optional): reuse worktrees if safe

**Constraints**:
- Max 4 parallel (avoid overloading LLM providers)
- One task per repo (no concurrent commits to same branch)
- Parent task must complete before dependent tasks start

---

## DEC: Prompts Are Fixed (Not User-Configurable)

**Current**: Prompts are hard-coded in architect-task-api.mjs, critique-task-api.mjs, etc.

**Decision**: Do not expose prompts for user customization (yet)

**Rationale**:
- Prompts are core tool logic, changes affect all users
- No validation that custom prompts are valid/safe
- Future: template system with variable interpolation (e.g., {{task_title}})

**Consequence**: Users cannot refine prompts without code changes

**Planned**: Prompt templates in config/{projectId}/prompts.yaml (v2.0)

---

## DEC: State Machine Is Implicit in Code (Planned: Explicit)

**Current**: State transitions are scattered across cascadeRunTask(), step scripts, and retry logic

**Issue**: Hard to understand valid transitions, easy to miss edge cases

**Planned**: Explicit state machine in code
```javascript
const STATE_MACHINE = {
  NEW: { transitions: [ARCHITECTED], errorResume: NEW },
  ARCHITECTED: { transitions: [CRITIQUED], errorResume: ARCHITECTED },
  CRITIQUED: { transitions: [SYNTHESIZED], errorResume: CRITIQUED },
  SYNTHESIZED: { transitions: [IMPLEMENTING], errorResume: SYNTHESIZED },
  IMPLEMENTING: { transitions: [IMPLEMENTED], errorResume: IMPLEMENTING },
  IMPLEMENTED: { transitions: [FOLLOWUPS_PROPOSED], errorResume: IMPLEMENTED },
  FOLLOWUPS_PROPOSED: { transitions: [PR_DRAFTED], errorResume: NEW }, // propose is non-blocking
  PR_DRAFTED: { transitions: [MERGED], errorResume: PR_DRAFTED },
  MERGED: { transitions: [], errorResume: null }
};
```

**Benefits**: Validates transitions, clear error recovery points, self-documenting

## ADR-0015: Multi-Project Path Resolution via ENV vars

**Date:** 2026-04-10
**Status:** Accepted

**Context:** Pipeline scripts live in ai-flow-lab but must operate on target projects (aurena-k-list, aurena-wbs). The server invokes scripts with `cwd: ai-flow-lab/automation` so Node can resolve `node scripts/X.mjs`. But scripts need to read/write state in the target project.

**Problem:** 25 scripts used `process.cwd()` to find state directories. This always resolved to ai-flow-lab, causing state (proposals, tasks, decisions) to be written to the wrong project.

**Decision:** All scripts use `automationRoot()` and `repoRoot()` from `_llm-utils.mjs`, which read `AUTOMATION_ROOT` and `REPO_ROOT` env vars (injected by `buildChildEnv()` in serve-dashboard.mjs). Fallback to `process.cwd()` only when env vars are unset (single-project mode).

**Rule:** Never use `process.cwd()` for state/config paths in pipeline scripts. Always use the imported functions. `process.cwd()` is only valid for script-relative paths (e.g. finding sibling scripts).

**Alternatives rejected:**
- Passing paths as CLI args: Too many args, brittle, every script signature changes
- Changing CWD per invocation: Breaks `node scripts/X.mjs` resolution
- Symlinks: Fragile across OS, doesn't work with git worktrees
