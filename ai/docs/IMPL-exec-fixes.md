# Implementation Document: Execute-Step Fixes & Pipeline Bugs

**Date:** 2026-04-07
**Status:** PLANNED — do NOT implement yet
**Scope:** 7 issues across `_llm-utils.mjs` and `serve-dashboard.mjs`

---

## Issue Overview

| # | Issue | File | Severity |
|---|-------|------|----------|
| A | `execSync` blocks Node event loop in CLI calls | `_llm-utils.mjs` | **Critical** |
| B | Codex CLI hangs on interactive prompts, no timeout fallback | `_llm-utils.mjs` | **High** |
| C | Ghost "running" states survive server restart mid-execSync | `serve-dashboard.mjs` | **Medium** (already mitigated) |
| D | T-0017 follow-up tasks not spawned despite proposals existing | `serve-dashboard.mjs` | **High** |
| E | T-0017 retry restarted at architect instead of failed step | `serve-dashboard.mjs` / UI | **High** |
| F | T-0016 shows `executor: "claude"` despite being feature-lane | `spawn-followup-task.mjs` | **Low** (cosmetic) |
| G | T-0017 had result file but was still stuck at "running" | `_llm-utils.mjs` | **Resolved by Fix C** |

---

## Fix A: `execSync` → Async in `callClaudeCLI` and `callCodexCLI`

### Problem

Both `callClaudeCLI` (line 817) and `callCodexCLI` (line 888) in `_llm-utils.mjs` use `execSync` to shell out to CLI tools. This **blocks the entire Node.js event loop** for up to 15 minutes per call, meaning:

- The dashboard HTTP server is completely unresponsive during execution
- No API requests can be served (polling, status checks, prompt submissions all freeze)
- APP mode prompt polling in `callLLMApp` cannot respond to submitted responses
- Other concurrent cascade tasks cannot progress

### Root Cause

The file already imports `execFile` and `promisify` at lines 791-793 of `callClaudeCLI`, but then uses `execSync` anyway at line 817. This looks like an incomplete migration from sync to async.

### Fix

**File:** `automation/scripts/_llm-utils.mjs`

#### callClaudeCLI (lines 790-860)

Replace the `execSync` block (lines 815-827) with async `execFile`:

```javascript
// BEFORE (line 815-827):
const { execSync } = await import("node:child_process");
// ...
const raw = execSync(cmd, { timeout: 900000, maxBuffer: 10*1024*1024, encoding: "utf8" });

// AFTER:
const { execFile } = await import("node:child_process");
const { promisify } = await import("node:util");
const execFileAsync = promisify(execFile);

const { stdout: raw } = await execFileAsync("bash", ["-c", cmd], {
  timeout: 900000,
  maxBuffer: 10 * 1024 * 1024,
  encoding: "utf8"
});
```

#### callCodexCLI (lines 867-930)

Replace `execSync` block (lines 868, 888) similarly:

```javascript
// BEFORE (line 888):
const { execSync } = await import("node:child_process");
// ...
const raw = execSync(cmd, { timeout: 900000, maxBuffer: 10*1024*1024, encoding: "utf8" });

// AFTER:
const { execFile } = await import("node:child_process");
const { promisify } = await import("node:util");
const execFileAsync = promisify(execFile);

const { stdout: raw } = await execFileAsync("bash", ["-c", cmd], {
  timeout: 900000,
  maxBuffer: 10 * 1024 * 1024,
  encoding: "utf8"
});
```

### Side Effects & Callers

Both functions are already `async` and all callers already `await` them:

| Caller | Lines | Already awaits? |
|--------|-------|-----------------|
| `callLLMForStep` | 222, 233, 236, 245 | Yes (`return await`) |
| `callOpenAI` | 386, 399 | Yes (`return await`) |
| `callGemini` | 506 | Yes (`return await`) |
| `callClaude` | 697 | Yes (`return await`) |

**No caller changes needed.** The function signatures and return values remain identical.

### Upstream Impact

`cascadeRunTask` (line 1593) and the retry handler (line 1393) both call step scripts via `execAsync` (which is already async). Those scripts internally import `_llm-utils.mjs` and call `callLLMForStep`. Since the step scripts run as separate Node processes (`node scripts/execute-task-api.mjs`), the async change inside the step script means:

- The step script's own event loop is unblocked (useful if it has other async operations)
- The parent `serve-dashboard.mjs` process was never blocked by step scripts (they run as child processes via `execAsync`)

**Wait — important nuance:** The dashboard server (`serve-dashboard.mjs`) runs step scripts as child processes via `execAsync`. So the dashboard's event loop is NOT blocked by execSync inside the child process. The blocking issue is within the step script itself. This means:

- **Dashboard responsiveness is NOT affected** by execSync in _llm-utils.mjs (the dashboard spawns step scripts as separate processes)
- **But the step script itself is blocked** — so if the step script needs to do anything else async (cleanup, progress reporting), it can't

This makes Fix A a **correctness improvement** rather than a critical fix. The dashboard stays responsive regardless. However, it's still best practice and prevents future issues.

---

## Fix B: Codex CLI Timeout with Fallback

### Problem

`codex exec --full-auto -` reads from stdin via pipe (`cat promptFile | codex exec --full-auto -`). If codex doesn't recognize the piped input or requires interactive confirmation, it can hang indefinitely until the 15-minute timeout kills it.

Evidence: `automation/state/tmp/cli-prompt-T-0016-execute-codex.md` (37KB) still exists, proving callCodexCLI was invoked but never cleaned up — the process was killed or the server crashed.

### Fix

**File:** `automation/scripts/_llm-utils.mjs`, inside `callCodexCLI`

Add a shorter timeout (5 minutes) with automatic fallback to Claude CLI:

```javascript
// After converting to async (Fix A), add try/catch with fallback:
try {
  const { stdout: raw } = await execFileAsync("bash", ["-c", cmd], {
    timeout: 300000,  // 5 min instead of 15 min
    maxBuffer: 10 * 1024 * 1024,
    encoding: "utf8"
  });
  // ... existing success path ...
} catch (err) {
  // Clean up temp file
  try { fs.unlinkSync(promptFile); } catch (_) {}

  if (err.killed || err.signal === 'SIGTERM') {
    console.warn(`[callCodexCLI] Codex timed out after 5min, falling back to Claude CLI`);
    return callClaudeCLI(prompt, { systemPrompt, taskId, step });
  }
  throw err;  // Non-timeout errors propagate normally
}
```

### Side Effects

- `callCodexCLI` is called from `callLLMForStep` (line 233) and `callOpenAI` (line 386)
- Both already have fallback logic to Claude CLI on codex-not-found. This adds timeout as another fallback trigger
- The fallback preserves the same function signature (returns `{ text, usage }`)
- No changes needed in callers

---

## Fix C: Startup Recovery for Ghost Running States

### Problem

When the server crashes or restarts while a task has `runtime_status: "running"`, the task is stuck forever because no process is actually executing it.

### Current Status: ALREADY IMPLEMENTED

The `cleanStaleStatus()` IIFE at lines 1849-1926 of `serve-dashboard.mjs` already handles this correctly:

1. Scans all task JSON files at startup
2. If `runtime_status === "running"` and state is terminal (PR_DRAFTED/MERGED): resets to IDLE
3. If `runtime_status === "running"` and state is mid-pipeline: resets to FAILED with `failed_step = deriveFailedStep(tf)` and descriptive error message
4. Cleans up orphaned lock files

**No code changes needed.** This is working as designed.

### Minor Enhancement (Optional)

Also clean up orphaned temp files in `automation/state/tmp/`:

```javascript
// Add to cleanStaleStatus() after lock cleanup:
const tmpDir = path.join(getStateDir(), "tmp");
if (fs.existsSync(tmpDir)) {
  let tmpCleaned = 0;
  for (const f of fs.readdirSync(tmpDir).filter(f => f.startsWith("cli-prompt-"))) {
    try { fs.unlinkSync(path.join(tmpDir, f)); tmpCleaned++; } catch (_) {}
  }
  if (tmpCleaned > 0) console.log(`[STARTUP] Cleaned ${tmpCleaned} orphaned CLI temp file(s)`);
}
```

---

## Fix D: T-0017 Follow-Up Tasks Not Spawned

### Problem

T-0017 completed all pipeline steps (state = PR_DRAFTED, runtime_status = IDLE) and has two follow-up proposals with `should_spawn_now: true`:

- `T-0017-F-1`: "Expose progress scoring unit through game config"
- `T-0017-F-2`: "Add headless browser regression for live HUD score synchronization"

Yet no T-0018 or T-0019 tasks exist.

### Root Cause

**The retry endpoint does NOT spawn follow-up tasks.**

Looking at the two code paths:

1. **`cascadeRunTask`** (line 1537-1709): After completing all steps, checks for proposals and spawns follow-ups (lines 1650-1709). This is correct.

2. **Retry endpoint `POST /api/tasks/:id/retry`** (lines 1333-1420): Runs remaining pipeline steps from the failed step onward, but **its completion handler (line 1413-1416) only sets runtime_status to IDLE — it never checks for proposals or spawns follow-ups.**

T-0017 likely failed mid-pipeline, got recovered by startup cleanup (Fix C) to FAILED, then was retried via the Retry button. The retry successfully completed all remaining steps but never spawned follow-ups.

### Fix

**File:** `automation/scripts/serve-dashboard.mjs`, retry endpoint (around line 1413)

After the successful completion of all retry steps, add follow-up spawning logic:

```javascript
// CURRENT (line 1413-1416):
// Success
const tf = readJSON(taskFile);
if (tf) { tf.runtime_status = "IDLE"; tf.current_step = null; tf.updated_at = new Date().toISOString(); fs.writeFileSync(taskFile, JSON.stringify(tf, null, 2)); }
console.log(`[RETRY] ${taskId}: retry complete → ${readJSON(taskFile)?.state}`);

// PROPOSED — add follow-up spawning after the success block:
// Spawn follow-ups (same logic as cascadeRunTask)
try {
  const proposalsDir = path.join(getStateDir(), "proposals");
  if (fs.existsSync(proposalsDir)) {
    const allProposals = listFilesInDir(proposalsDir, /\.json$/)
      .map(f => readJSON(path.join(proposalsDir, f)))
      .filter(p => p && p.parent_task_id === taskId && p.should_spawn_now === true);

    if (allProposals.length > 0) {
      const cfg = loadCascadeConfig();
      const tasksDir = path.join(getStateDir(), "tasks");
      const existingTasks = listFilesInDir(tasksDir, /^T-\d+\.json$/)
        .map(f => readJSON(path.join(tasksDir, f))).filter(Boolean);

      let spawnable = allProposals.filter(p => !isDuplicateTitle(p.title, existingTasks));
      spawnable = spawnable.slice(0, cfg.max_followups_per_task);

      for (const proposal of spawnable) {
        const newId = nextTaskId();
        try {
          execSync(`node scripts/spawn-followup-task.mjs ${proposal.proposal_id} ${newId}`, {
            cwd: automationRoot, stdio: 'pipe', timeout: 15000
          });
          console.log(`[RETRY] Spawned follow-up ${newId} from ${proposal.proposal_id}`);
        } catch (spawnErr) {
          console.error(`[RETRY] Spawn failed for ${proposal.proposal_id}:`, spawnErr.message?.substring(0, 100));
        }
      }
    }
  }
} catch (fErr) {
  console.error(`[RETRY] Follow-up spawn error:`, fErr.message);
}
```

### Side Effects

- Follow-ups are spawned but NOT cascaded (no recursive `cascadeRunTask` call). This is intentional for retry — the user can manually run cascade on spawned tasks.
- Dedup check prevents double-spawning if proposals were already spawned by a previous cascade attempt.
- `loadCascadeConfig().max_followups_per_task` respects the limit.

### Alternative Approach

Extract follow-up spawning into a shared helper function called from both `cascadeRunTask` and the retry handler to avoid code duplication:

```javascript
async function spawnFollowUps(taskId, cascadeCtx = null) {
  // Shared logic for proposal loading, dedup, limits, spawning
  // Returns array of spawned task IDs
}
```

This is cleaner but adds more refactoring scope. The inline approach is safer for a minimal fix.

---

## Fix E: T-0017 Retry Restarted at Architect Instead of Failed Step

### Problem

User reported: "bei retry von t17 wurde zuerst gezeigt retry failed und dann ist es wieder bei architect gestartet."

Translation: Retry first showed "retry failed", then it restarted at architect.

### Root Cause Analysis

Two-part issue:

**Part 1 — "Retry failed":** The retry endpoint (line 1336) requires `runtime_status === "FAILED"`. If T-0017 was still in `runtime_status: "running"` (ghost state), the retry endpoint would reject it with HTTP 400: `"Task T-0017 is not in FAILED state"`. The UI would show this as "retry failed".

**Part 2 — "Restarted at architect":** After retry failed, the user likely clicked **"Run Cascade"** instead, which calls `POST /api/cascade/run-task` → `cascadeRunTask()`. This function **always loops through ALL steps starting from architect** (line 1584: `for (const stepName of steps)`) — it does not skip completed steps.

### Fix

**File:** `automation/scripts/serve-dashboard.mjs`, `cascadeRunTask` function (line 1584)

Add logic to skip already-completed steps based on current task state:

```javascript
// CURRENT (line 1584):
for (const stepName of steps) {

// PROPOSED — add skip logic before the loop:
// Determine starting step: skip steps already completed
const tf0 = readJSON(taskFile);
let startIdx = 0;
if (tf0 && tf0.state && tf0.state !== 'NEW') {
  const nextStep = STATE_TO_NEXT_STEP[tf0.state];
  if (nextStep) {
    const idx = steps.indexOf(nextStep);
    if (idx > 0) {
      startIdx = idx;
      console.log(`[CASCADE] ${taskId}: state=${tf0.state}, skipping to step "${nextStep}" (index ${idx})`);
    }
  }
}

for (let i = startIdx; i < steps.length; i++) {
  const stepName = steps[i];
  // ... rest of loop body unchanged ...
```

### Side Effects

- `cascadeRunTask` is called from:
  - `POST /api/cascade/run-task` (line 1093) — user-initiated cascade
  - `POST /api/cascade/run-goal` (line 1173) — goal decomposition
  - Recursive follow-up spawning (line 1701)
- For NEW tasks (state = "NEW"), `startIdx` remains 0 → no behavior change
- For follow-up spawning, new tasks start at NEW → no behavior change
- For re-running a partially completed task, it correctly resumes from the next step

### Alternative Fix: Retry Endpoint Accepts "running" State

Also allow retry when `runtime_status === "running"` (for ghost states):

```javascript
// CURRENT (line 1338):
if (task.runtime_status !== "FAILED") {
  respondError(res, 400, `Task ${taskId} is not in FAILED state`); return;
}

// PROPOSED:
if (task.runtime_status !== "FAILED" && task.runtime_status !== "running") {
  respondError(res, 400, `Task ${taskId} is not in FAILED or running state`); return;
}
// If "running" with no live process, treat like FAILED
if (task.runtime_status === "running") {
  console.log(`[RETRY] ${taskId}: was in "running" state (likely ghost), treating as FAILED`);
}
```

This is a smaller change but less clean — it bypasses the startup cleanup safety net. **Recommendation:** Keep the retry endpoint strict (FAILED only) and instead ensure the startup cleanup runs reliably. The real fix is Fix E Part 2 (cascade skipping completed steps).

---

## Fix F: T-0016 Shows `executor: "claude"` Despite Being feature-lane

### Problem

T-0016 is a feature-lane task but its JSON shows `executor: "claude"`. According to `project.config.yaml`, feature-lane's execute step should route to codex.

### Root Cause

T-0016 was spawned as a follow-up from T-0013 via proposal `T-0013-F-2`. The `spawn-followup-task.mjs` script (line 27) passes the **proposal's executor field** directly to `new-task.mjs`:

```javascript
const cmd = [
  "node", "scripts/new-task.mjs", newTaskId,
  proposal.lane_type, JSON.stringify(proposal.title),
  proposal.executor,  // <-- comes from the proposal, not from config
  proposal.parent_task_id, "architect-followup"
].join(" ");
```

If T-0013 was a bug-lane or danger-lane task, its follow-up proposals would inherit `executor: "claude"` (because those lanes override execute to claude in project.config.yaml). Even if the proposal specifies `lane_type: "feature-lane"`, the executor field comes from the parent's routing.

### Impact

**This is cosmetic.** The `executor` field in the task JSON is an **informational label** set at creation time. The actual provider used at runtime is determined by `getProviderForStep()` (line 109-188 in `_llm-utils.mjs`), which reads from `project.config.yaml` based on lane_type. So T-0016's execute step would still route to codex at runtime if feature-lane config says codex.

However, the UI may show misleading information if it displays the task's `executor` field.

### Fix (Low Priority)

**Option A — Fix at spawn time:** In `spawn-followup-task.mjs`, derive executor from config instead of proposal:

```javascript
// Instead of using proposal.executor directly:
const executor = getExecutorForLane(proposal.lane_type);  // reads from config
```

**Option B — Fix at proposal generation time:** In `propose-followups-api.mjs`, set the proposal's executor based on the target lane_type's config rather than inheriting from the parent task.

**Recommendation:** Option B is cleaner — fix it at the source. But this is low priority since it doesn't affect actual execution routing.

---

## Fix G: T-0017 Had Result File But Was Still Stuck

### Problem

T-0017 had `ai/results/T-0017_executor_report.md` (40KB) and `ai/followups/T-0017_followups.md` (4.4KB) but was showing `runtime_status: "running"` with `state: "SYNTHESIZED"`.

### Root Cause

The execute step completed and wrote its result file, but the **state transition after the step** failed or never ran. Looking at the cascade runner (line 1593-1598):

```javascript
await execAsync(`node scripts/${scriptMap[stepName]} ${taskId}`, { ... });
// Step script completed and wrote result file ✓
const tf = readJSON(taskFile);
if (tf && stateAfterStep[stepName]) {
  tf.state = stateAfterStep[stepName];  // SYNTHESIZED → IMPLEMENTING
  // ...
  fs.writeFileSync(taskFile, JSON.stringify(tf, null, 2));
}
```

The step script (`execute-task-api.mjs`) writes the result file as its last action. But if the parent process (cascade runner in serve-dashboard.mjs) crashed between the child process completing and writing the state update, the result file exists but the state never advances.

This is the same root cause as the ghost running state (Fix C). The startup cleanup handles it by resetting to FAILED, and retry resumes from the correct step.

### Current Status: RESOLVED

T-0017 is now `state: "PR_DRAFTED"`, `runtime_status: "IDLE"`. It completed successfully through the retry/cascade path. The proposals exist but follow-ups weren't spawned (Fix D).

**No additional code changes needed** beyond Fixes C and D.

---

## Implementation Order

| Priority | Fix | Risk | Effort |
|----------|-----|------|--------|
| 1 | **D** — Retry endpoint spawns follow-ups | Low | Small |
| 2 | **E** — Cascade skips completed steps | Medium | Small |
| 3 | **A** — execSync → async | Low | Medium |
| 4 | **B** — Codex timeout + fallback | Low | Small |
| 5 | **C** — Temp file cleanup (enhancement) | None | Tiny |
| 6 | **F** — Executor label fix | None | Tiny |

Fixes D and E should go first because they directly affect pipeline correctness. Fix A is best practice but doesn't affect dashboard responsiveness (step scripts run as child processes). Fix B prevents future hangs.

---

## Files Modified

| File | Fixes |
|------|-------|
| `automation/scripts/_llm-utils.mjs` | A, B |
| `automation/scripts/serve-dashboard.mjs` | C (enhancement), D, E |
| `automation/scripts/spawn-followup-task.mjs` | F (optional) |

---

## Pre-Implementation Checklist

- [ ] Verify `callClaudeCLI` and `callCodexCLI` return types unchanged after async conversion
- [ ] Test that `execFileAsync("bash", ["-c", cmd])` handles pipe syntax correctly
- [ ] Verify retry endpoint follow-up spawning doesn't double-spawn with cascade
- [ ] Test cascade skip logic with NEW tasks (should still start from architect)
- [ ] Test cascade skip logic with SYNTHESIZED tasks (should start from execute)
- [ ] Confirm startup cleanup still works correctly after changes
- [ ] Reset T-0016 and T-0017 to clean states before testing
