---
type: document
created: 2026-04-10
tags: [ai-flow-lab, document]
---

# AI Flow Lab Pipeline: Concurrency & Retry Safety Analysis

**Analysis Date:** 2026-04-08
**Scope:** serve-dashboard.mjs, _llm-utils.mjs, pipeline architecture
**Status:** Research only — no changes recommended until review

---

## Executive Summary

The AI Flow Lab pipeline has **several HIGH and CRITICAL concurrency issues** despite being single-threaded. Key problems:

1. **No atomic file writes** — task JSON can be corrupted mid-update during concurrent file access
2. **Weak retry guards** — clicking "Retry" twice quickly causes dual execution
3. **APP Mode has indefinite blocking potential** — no timeout recovery mechanism
4. **Cowork test crash handling is incomplete** — process crash != test failure distinction missing
5. **Race condition in state transitions** — RED guardrail decision can be overwritten by running cascade

The analysis below details each issue with severity classification and remediation strategies.

---

## 1. Retry Logic Safety

### Finding 1.1: No Guard Against Concurrent Retries (HIGH)

**Location:** `/automation/scripts/serve-dashboard.mjs:1627-1759`

**Issue:** The retry endpoint does NOT check if a cascade is already running when the retry is triggered.

```javascript
"POST /api/tasks/:id/retry": async (req, res, params) => {
  // ... minimal state check ...
  if (task.runtime_status !== "FAILED") {
    respondError(res, 400, `Task ${taskId} is not in FAILED state`);
    return;
  }

  // Clear error, set running
  task.runtime_status = "running";
  task.last_error = null;
  task.failed_step = null;
  task.updated_at = new Date().toISOString();
  fs.writeFileSync(taskFile, JSON.stringify(task, null, 2));

  respondJSON(res, 202, { success: true, ... });

  // Run cascade from the failed step onward (in background)
  (async () => {
    // ... executes steps ...
  })();
}
```

**Problem:**
- User clicks "Retry" at time T1 → endpoint responds 202 immediately
- User clicks "Retry" again at T1+100ms (double-click)
- Both requests pass the `runtime_status !== "FAILED"` check
- Both spawn background cascade processes simultaneously
- Both write to the same task JSON file, **creating race condition**

**Example Scenario:**
```
T1.00: User clicks Retry
T1.05: Endpoint A acquires task JSON, changes runtime_status → "running"
T1.10: User double-clicks Retry
T1.15: Endpoint B acquires task JSON, changes runtime_status → "running" (same state, passes check!)
T1.20: Cascade A writes task state after architect step
T1.25: Cascade B writes task state, OVERWRITES Cascade A's update
Result: Task advances but some state information is lost
```

**Severity:** HIGH

**Root Cause:** No distributed lock or atomic compare-and-swap when transitioning from FAILED → RUNNING.

**Mitigation Strategies:**
1. **Immediate:** Add file-based lock in retry handler: check for existence of `state/locks/tasks/{taskId}.running.lock` before allowing retry
2. **Short-term:** Implement atomic CAS: read task JSON, verify runtime_status=FAILED AND no lock file exists, write both atomically
3. **Long-term:** Migrate to SQLite with transaction support; use `BEGIN TRANSACTION` to atomic ally update status + set lock

---

### Finding 1.2: No Retry Limit (MEDIUM)

**Location:** `/automation/scripts/serve-dashboard.mjs:1627-1759`

**Issue:** Users can retry indefinitely with no limit tracking.

**Problem:**
- If a step consistently fails (e.g., API timeout), user can click Retry 100 times
- Each attempt consumes API quota and wastes resources
- No exponential backoff or jitter
- No cumulative error tracking (how many times has this task retried?)

**Example:** If architect step always hits OpenAI API timeout, user retrying 50 times wastes 50 API calls + token usage.

**Severity:** MEDIUM

**Current State:** Task JSON stores `failed_step` and `last_error` but not `retry_count` or `failed_attempts`.

**Mitigation:** Add `failed_attempts: []` to task schema, track each retry with timestamp + error. Display in UI. Warn after 3 consecutive retries of same step.

---

### Finding 1.3: Retry During Active Cascade is Possible (HIGH)

**Location:** Multiple

**Issue:** The retry endpoint **does not check** if a cascade is currently running on the same task.

**Scenario:**
1. User starts cascading T-100
2. Architect step completes, cascade is now running critique
3. Critique hangs (bug in LLM call, network timeout)
4. User sees runtime_status=running and waits 2 minutes
5. User assumes it's stuck and clicks Retry
6. Retry endpoint checks `runtime_status !== "FAILED"` → it's "running", so retry is REJECTED

**Good news:** This case is actually blocked by the check.

**Bad news:** There IS a race window:
- Critique step times out at T1.00, updates task to runtime_status=FAILED, failed_step=critique
- User clicks Retry at T1.05
- Cascade engine's cleanup at T1.10 tries to mark task IDLE after successful cascade completion
- But retry has already updated the task state

**Result:** Retry and cascade completion can race to update task.state, causing lost state updates.

**Severity:** HIGH (race condition in state machine)

---

### Finding 1.4: failed_step Not Cleared During Active Cascade (MEDIUM)

**Location:** `/automation/scripts/serve-dashboard.mjs:2279-2433`

**Issue:** During a fresh cascade (non-retry), `failed_step` is set in cascadeRunTask but only CLEARED on success (line 2294):

```javascript
if (tf && stateAfterStep[stepName]) {
  tf.state = stateAfterStep[stepName];
  tf.current_step = stepName;
  tf.last_error = null;       // ← cleared on success
  tf.failed_step = null;      // ← cleared on success
  tf.updated_at = new Date().toISOString();
  fs.writeFileSync(taskFile, JSON.stringify(tf, null, 2));
}
```

**Problem:** If a fresh cascade (not from retry) encounters an error after previously failing:

```
Scenario:
1. T-100 fails at step 2 (critique) → failed_step="critique"
2. User manually edits the spec file (fixes the issue)
3. User clicks "Retry" → cascade restarts from critique
4. Critique succeeds → failed_step is cleared ✓ (good)

BUT:

5. User clicks "Run Cascade" (not Retry, which starts from architect)
6. Architect runs and completes
7. During architect step execution, failed_step is NOT cleared (it's only cleared AFTER a step succeeds)
8. If cascade is interrupted mid-step, failed_step might still say "critique" from the previous failure
```

**Severity:** MEDIUM

**Fix:** Ensure `failed_step` is cleared at the START of a fresh cascade (when starting from architect on a NEW task).

---

## 2. Concurrent Task Execution

### Finding 2.1: No Concurrency Control (CRITICAL)

**Location:** `/automation/scripts/serve-dashboard.mjs:1073-1108, 2217-2505`

**Issue:** Multiple tasks can run their cascades simultaneously with NO serialization, NO queue, NO lock mechanism.

**Current Architecture:**
```javascript
"POST /api/cascade/run-task": async (req, res) => {
  // ... validate task ...
  respondJSON(res, 202, { success: true, ... });

  // Run cascade asynchronously in background
  (async () => {
    await cascadeRunTask(taskId, ctx.maxDepth, 0, ctx);
  })();
}
```

Each POST request spawns an immediate background cascade. If 5 users (or 1 user with webhook triggers) start 5 tasks simultaneously:

```
T1.00: POST /api/cascade/run-task T-1 → spawns cascade for T-1
T1.05: POST /api/cascade/run-task T-2 → spawns cascade for T-2
T1.10: POST /api/cascade/run-task T-3 → spawns cascade for T-3
...
Result: 3-5 child Node processes running architect, critique, execute steps in parallel
```

**Resource Exhaustion Risk:**
- Each cascade spawns ~7 child processes (one per pipeline step)
- Each child process calls external LLM APIs (OpenAI, Gemini, Claude)
- Network bandwidth: 5 concurrent cascades × 5 API calls = 25 simultaneous LLM requests
- Local resource: 35+ child Node processes on a single machine
- Memory: Each step script loads entire codebase, task state, spec, review, brief — easily 10MB per process

**API Quota Exhaustion:**
- OpenAI rate limiting: typically 500 requests per minute per account
- With 5 concurrent cascades, architect step alone fires 5 parallel API calls
- Concurrent quota exceeded quickly

**Severity:** CRITICAL (resource exhaustion, API quota burned, unpredictable behavior)

**Current Documentation:** ARCHITECTURE.md lines 110-116 list this as "Planned" but not implemented:

```
## Planned
- Task queue with concurrency limit
- Conflict detection before execute step
- Auto-rebase before merge if main diverged
- Dependency solver to respect parent task completion
```

**Mitigation:**
1. **Immediate (Prototype):** Global in-memory queue with max 2 concurrent cascades (checked at start of cascadeRunTask)
2. **Short-term:** Persistent queue in `state/queue/` with task priority/ordering
3. **Long-term:** Queue service (Bull, RabbitMQ) with proper worker pool

---

### Finding 2.2: No Locking on Shared Git Repository (HIGH)

**Location:** `/automation/scripts/prepare-worktree.mjs:38-56`, `/automation/scripts/merge-task.mjs:29-67`

**Issue:** Git operations on shared repository are not serialized.

**Scenario:**
```
T1.00: Task A's prepare-worktree runs: git worktree add ../wt/T-A feature/T-A
T1.05: Task B's prepare-worktree runs: git worktree add ../wt/T-B feature/T-B
       (Both reading main branch simultaneously)

T2.00: Task A's merge-task: git checkout main, git merge feature/T-A
T2.05: Task B's merge-task: git checkout main, git merge feature/T-B
       (Both attempting to merge concurrently)
```

**Git Problems:**
- `git worktree add` can fail if another process is manipulating the same branch
- `git merge` can deadlock if both processes are in the middle of cherry-pick/rebase
- `.git/index.lock` can be left stale by crashed child processes

**Severity:** HIGH

**Mitigation:** Add file-based locking around git operations in prepare-worktree and merge-task:

```javascript
// In prepare-worktree.mjs
const gitLock = path.join(repoRoot, ".git", "ai-flow.lock");
let acquired = false;
let attempts = 0;
while (!acquired && attempts < 10) {
  try {
    const fd = fs.openSync(gitLock, fs.constants.O_CREAT | fs.constants.O_EXCL);
    fs.closeSync(fd);
    acquired = true;
  } catch {
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));
    attempts++;
  }
}
if (!acquired) throw new Error("Git lock acquisition timeout");
```

---

## 3. Concurrent Retries

### Finding 3.1: Double-Retry Creates Duplicate Cascade (HIGH)

**Location:** `/automation/scripts/serve-dashboard.mjs:1627-1759`

**Issue:** Same as Finding 1.1, but more likely in manual user scenario.

**UI Scenario:**
1. Task shows FAILED with red error box
2. User clicks "Retry" button
3. Button is slow to update (no immediate disabled state)
4. User clicks "Retry" again (thinks first click didn't register)
5. Both requests hit the endpoint before first cascade completes

**Current Code Has No Button Disable Logic**

Dashboard HTML renders retry button but has no tracking of whether a retry is in progress. User can spam retry.

**Severity:** HIGH

**Mitigation:**
1. Dashboard: Disable retry button immediately on click, re-enable only after response
2. Server: Mutex/lock-based guard (as mentioned in 1.1)

---

### Finding 3.2: Parent Task Retry While Child Task Running (MEDIUM)

**Location:** `/automation/scripts/serve-dashboard.mjs:2445-2505`

**Issue:** Task A spawns Task B as followup. Task A is later retried while Task B is still running.

**Scenario:**
```
T1.00: Cascade A completes execute step, proposes 2 followups
T1.05: Cascade A spawns Task B (state=NEW)
T2.00: Cascade B starts executing
T2.30: Cascade A still running (in propose-followups step)
T2.35: User notices Task A seems stuck, clicks Retry
T2.40: Retry spawns new cascade for A from failed_step
T2.50: Both cascades try to spawn followups again
Result: Duplicate task creation or orphaned dependency
```

**Severity:** MEDIUM

**Mitigation:** Add dependency tracking to task schema: `parent_task_id`, `depends_on_state`. Skip retry if children are active.

---

## 4. State Machine Consistency

### Finding 4.1: State Can Become Impossible (MEDIUM)

**Location:** `/automation/scripts/serve-dashboard.mjs:2217-2505, 1627-1759`

**Issue:** Task state transitions are not atomic. Task JSON is read, modified in memory, then written back. Between read and write, another process could have updated it.

**Example:**
```
Process A reads task: state=ARCHITECTED, runtime_status=IDLE
Process B reads task: state=ARCHITECTED, runtime_status=IDLE
Process A writes: state=CRITIQUED (it ran critique successfully)
Process B writes: state=SYNTHESIZED (it ran synthesize successfully, but architect wasn't run!)
Result: Task has state=SYNTHESIZED but never executed critique
```

**More Realistic Scenario:** Retry endpoint and cascade endpoint both read task.state, both decide to run execute step:

```
T1.00: deriveFailedStep(task) reads task.state=IMPLEMENTING
T1.05: deriveFailedStep(task) returns "execute"
T1.10: Cascade A updates task.state=IMPLEMENTED (execute succeeded)
T1.15: Retry process (from T1.00-1.05) now runs execute step again
T1.20: Retry overwrites task.state=IMPLEMENTED, losing update from step 1.10
```

**Severity:** MEDIUM (not data loss, but state inconsistency)

**Mitigation:** Use compare-and-swap: read state hash, verify it hasn't changed since read before writing.

```javascript
function saveTaskAtomic(taskId, updatedTask, expectedHash) {
  const taskFile = path.join(getStateDir(), "tasks", `${taskId}.json`);
  const currentHash = crypto.createHash('md5').update(fs.readFileSync(taskFile)).digest('hex');
  if (currentHash !== expectedHash) {
    throw new Error(`Task state changed during operation (race condition)`);
  }
  fs.writeFileSync(taskFile, JSON.stringify(updatedTask, null, 2));
}
```

---

### Finding 4.2: Writes to Task JSON Not Atomic (CRITICAL)

**Location:** Every `fs.writeFileSync(taskFile, JSON.stringify(...))` call

**Issue:** Node.js `fs.writeFileSync()` is NOT atomic on the filesystem. If the process crashes mid-write:

```
Original task.json: (full valid JSON)
Process starts write:
  - Open file handle
  - Write first 5000 bytes of new JSON
  - **CRASH (SIGKILL, power loss, OOM)**
  - File is left partially written

Result on disk:
{
  "task_id": "T-100",
  "title": "Add feature",
  "state": "IMPLEMENTIN
  // ← TRUNCATED, INVALID JSON
```

**Impact:** Next server restart calls `readJSON()` on corrupted task file:

```javascript
function readJSON(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));  // ← SyntaxError!
    }
    return null;
  } catch (e) {
    console.error(`Error reading ${filePath}:`, e.message);
    return null;  // ← Silently returns null instead of task data!
  }
}
```

**Result:** Task becomes invisible, no way to recover. User must manually edit JSON file.

**Severity:** CRITICAL

**Mitigation:**
1. **Immediate:** Write to temp file first, then atomic rename: `fs.renameSync(tempFile, taskFile)`
2. **Better:** Store JSON + hash; detect corruption on read
3. **Best:** SQLite with transactional writes

---

### Finding 4.3: State Transitions Missing Validation (HIGH)

**Location:** `/automation/scripts/serve-dashboard.mjs:2290-2296`

**Issue:** State transitions are blindly applied without checking if they're valid.

```javascript
const stateAfterStep = {
  'architect': 'ARCHITECTED',
  'critique': 'CRITIQUED',
  'synthesize': 'SYNTHESIZED',
  'execute': 'IMPLEMENTING',
  'merge': 'MERGED',
  'propose-followups': 'FOLLOWUPS_PROPOSED',
  'pr-draft': 'PR_DRAFTED'
};

// In cascade loop:
if (tf && stateAfterStep[stepName]) {
  tf.state = stateAfterStep[stepName];  // ← NO VALIDATION
  tf.current_step = stepName;
  tf.last_error = null;
  tf.failed_step = null;
  tf.updated_at = new Date().toISOString();
  fs.writeFileSync(taskFile, JSON.stringify(tf, null, 2));
}
```

**Problem:** No check that task state is valid before update:
- Task is SYNTHESIZED (execute not yet run)
- Bug in code causes step=propose-followups to somehow get called
- State gets updated to FOLLOWUPS_PROPOSED, skipping execute entirely
- Task is now in impossible state

**Severity:** HIGH

**Mitigation:** Before updating state, validate state transition:

```javascript
const validTransitions = {
  'NEW': ['ARCHITECTED'],
  'ARCHITECTED': ['CRITIQUED'],
  'CRITIQUED': ['SYNTHESIZED'],
  'SYNTHESIZED': ['IMPLEMENTING', 'EXECUTED'],
  'IMPLEMENTING': ['IMPLEMENTED', 'EXECUTED'],
  'EXECUTED': ['COWORK_TESTING', 'TESTED', 'IMPLEMENTED'],
  // ... etc
};

function validateStateTransition(fromState, toState) {
  const allowed = validTransitions[fromState];
  if (!allowed || !allowed.includes(toState)) {
    throw new Error(`Invalid state transition: ${fromState} → ${toState}`);
  }
}
```

---

## 5. File Conflict Resolution

### Finding 5.1: No Conflict Detection Between Tasks (HIGH)

**Location:** All cascade execution, especially merge step

**Issue:** Two tasks can edit the same files. Conflict is only discovered when merging, after expensive execution.

**Scenario:**
```
Task A: Modify src/game.js (lines 50-100)
Task B: Modify src/game.js (lines 80-150)

T1.00: Cascade A starts execute step on feature/T-A branch
T1.05: Cascade B starts execute step on feature/T-B branch
T2.00: Cascade A completes, merges feature/T-A → main (fast-forward)
T2.05: Cascade B completes, attempts merge feature/T-B → main
       git merge reports CONFLICT in src/game.js
       merge step throws error, Task B fails
       Task B spent 1 hour running expensive code for nothing!
```

**Severity:** HIGH (wasted computation, poor UX, unreliable)

**Mitigation:** Pre-execute conflict detection:

```javascript
// Before execute step:
async function detectFileConflicts(taskId, currentTask) {
  const activeTaskIds = getActiveTasksExcept(taskId);
  const otherTasks = activeTaskIds.map(id => loadTask(id));

  const myFiles = new Set(currentTask.written_files || []);
  for (const other of otherTasks) {
    const otherFiles = new Set(other.written_files || []);
    const overlap = [...myFiles].filter(f => otherFiles.has(f));
    if (overlap.length > 0) {
      throw new Error(`File conflict with ${other.task_id}: ${overlap.join(', ')}`);
    }
  }
}
```

---

### Finding 5.2: Worktree Branch Dependency Not Checked (MEDIUM)

**Location:** `/automation/scripts/prepare-worktree.mjs:53`

**Issue:** Worktree is created from parent task's branch, but parent task might not be merged yet.

**Scenario:**
```
Task A: "Add game component" → branch feature/T-A
Task B: "Implement player physics" → depends on Task A's component

T1.00: Cascade A starts, creates branch feature/T-A from main
T1.05: Cascade B starts, creates branch feature/T-B from feature/T-A (parent is A's branch!)
       BUT feature/T-A doesn't exist yet (Cascade A hasn't pushed it)
       OR Cascade A pushes feature/T-A, but it's incomplete (architect-only)

T2.00: Cascade B executes code, assuming component exists
       But component isn't on feature/T-B because it came from incomplete feature/T-A
       Execute step fails with "component not found"
       Cascade B is FAILED
```

**Severity:** MEDIUM

**Mitigation:** Add parent task dependency tracking:
- Task schema: `depends_on_task_id`
- Cascade: Before execute step, verify parent task is MERGED
- Queue: Defer task execution until parent is MERGED

---

## 6. APP Mode Edge Cases

### Finding 6.1: APP Mode Indefinite Blocking on User No-Response (MEDIUM)

**Location:** `/automation/scripts/_llm-utils.mjs:943-1005`

**Issue:** If user never responds to a prompt in APP mode, task is blocked forever (up to 1 hour).

```javascript
async function callLLMApp({ instructions, input, taskId, step, provider, model }) {
  // ... write prompt to queue ...

  const timeoutMs = parseInt(process.env.LLM_APP_TIMEOUT || "3600000", 10); // 1 hour default
  const startMs = Date.now();

  while (Date.now() - startMs < timeoutMs) {
    if (fs.existsSync(responseFile)) {
      // Response found, proceed
      return response;
    }
    await sleep(pollIntervalMs);
  }

  throw new Error(`App mode timeout waiting for response: ${baseId} (${timeoutMs}ms exceeded)`);
}
```

**Scenario:**
1. Cascade reaches architect step (OpenAI, APP mode)
2. Prompt written to queue, displayed in dashboard
3. User is at lunch, doesn't see notification
4. Cascade waits 1 hour polling for response file
5. Timeout triggers, cascade fails, task is FAILED
6. User returns from lunch, sees failed task, has to retry from scratch

**Severity:** MEDIUM

**Problems:**
- 1 hour is too long (blocks cascade, wastes Node.js process)
- No timeout notification sent to user
- No "resume from prompt queue" mechanism (if user eventually responds after timeout)

**Mitigation:**
1. Reduce timeout to 10 minutes (configurable)
2. Add server notification when prompt timeout approaches (5 min warning)
3. Add endpoint to "claim" an unanswered prompt after timeout and resume cascade
4. Add dashboard UI to show pending prompts with timeout countdown

---

### Finding 6.2: Malformed Response File Stalls Cascade (MEDIUM)

**Location:** `/automation/scripts/_llm-utils.mjs:979-986`

**Issue:** If response file is created but contains invalid/empty content, cascade continues with garbage.

**Scenario:**
1. User pastes response into APP mode textarea
2. Pasted text is accidentally corrupted (trailing backspace, partial paste)
3. Response file written: `{"error": "...`  ← incomplete JSON
4. Cascade's LLM parser receives this incomplete response
5. Parser fails → cascading errors

**Also:** If user pastes the original PROMPT instead of RESPONSE (data entry error):

```
Expected prompt: "Design a game feature..."
User pastes: "Design a game feature..."  ← PROMPT, not response!
LLM parser tries to parse prompt as response
→ Wrong variable assignments
→ Silent failure or corrupted execution
```

**Severity:** MEDIUM

**Mitigation:**
1. Validate response on upload: check it's valid JSON (if expected) or non-empty text
2. Add hash check: require response file size > 100 bytes to prevent accidental tiny pastes
3. Add checksum: compare response against original prompt to prevent paste-prompt-as-response

---

### Finding 6.3: Server Restart Leaves Prompt Queue Dangling (MEDIUM)

**Location:** `/automation/scripts/_llm-utils.mjs:943-1005` and `/automation/scripts/serve-dashboard.mjs:2217-2505`

**Issue:** If server restarts while a cascade is waiting for user response:

```
T1.00: Cascade A reaches architect step (APP mode)
T1.05: Prompt written to state/prompts-queue/1712345678-T-100-architect.prompt.md
T1.10: callLLMApp() enters polling loop, waiting for .response.md

T5.00: Server restarts (user kills process, deployment, crash)
T5.01: New server starts, no processes are in polling loops
T5.02: Cascade process is dead, can't resume polling

T5.30: User finally pastes response, writes .response.md
T5.35: No one is polling anymore!
       Old cascade process is dead
       Task is stuck in RUNNING state forever
```

**Severity:** MEDIUM

**Mitigation:**
1. On startup, scan prompts-queue for prompts in "pending" status
2. For each pending prompt, check if a cascade is actually waiting (compare process IDs or use lock files)
3. If no process is waiting, either:
   - Auto-resume polling if response was received during downtime
   - Mark prompt as "orphaned", notify user to retry

---

## 7. Cowork Test Integration

### Finding 7.1: Process Crash Not Handled Properly (HIGH)

**Location:** `/automation/scripts/serve-dashboard.mjs:2359-2386`

**Issue:** If cowork-test.mjs process crashes (segfault, OOM, uncaught exception), the distinction between "crashed" and "failed test" is lost.

```javascript
try {
  await execAsync(`node scripts/cowork-test.mjs ${taskId}`, {
    cwd: automationRoot,
    timeout: 300000,
    maxBuffer: 10 * 1024 * 1024
  });

  const tfAfterTest = readJSON(taskFile);
  if (tfAfterTest && tfAfterTest.state === 'TEST_FAILED') {
    console.log(`[CASCADE] ${taskId}: Cowork test FAILED — stopping cascade`);
    tfAfterTest.runtime_status = 'FAILED';
    // ...
  }
} catch (testErr) {
  // BOTH crash and test failure end up here
  console.error(`[CASCADE] ${taskId}: Cowork test execution error:`);
  const tfErr = readJSON(taskFile);
  if (tfErr) {
    tfErr.state = 'TEST_FAILED';  // ← Can't distinguish: crash vs actual test failure
    tfErr.failed_step = 'cowork-test';
    tfErr.runtime_status = 'FAILED';
    tfErr.last_error = { step: 'cowork-test', message: testErr.message };
  }
}
```

**Problem:**
- If cowork-test.mjs crashes (OOM, segfault): state set to TEST_FAILED, error message says "Cowork test execution error"
- If test legitimately fails (all checks passed but acceptance criteria failed): state set to TESTED or TEST_FAILED, depending on result

**User Confusion:** User sees TEST_FAILED and thinks the code is wrong, but actually the test infrastructure crashed.

**Severity:** HIGH

**Mitigation:**
1. Check exit code: distinguish `exit(1)` (intentional failure) from `exit(127)` (crash)
2. Add state `TEST_CRASHED` separate from `TEST_FAILED`
3. Expect cowork-test.mjs to write test result to `state/cowork-tests/{taskId}.json` even on partial failure
4. If result file is missing, it's a crash

---

### Finding 7.2: Test Timeout Not Distinguishable from Slow Test (MEDIUM)

**Location:** `/automation/scripts/serve-dashboard.mjs:2360` (300s timeout)

**Issue:** If test hits 300s timeout (stepErr.killed = true), it's treated same as test failure:

```javascript
const signal = stepErr.killed ? ` [KILLED signal=${stepErr.signal || 'SIGTERM'} — likely timeout]` : "";
const errMsg = (raw + signal || "Unknown error").substring(0, 2000);
```

**Problem:** Timeout might be a legitimate slow test (execution takes 280s), not a test bug:
- User might increase timeout
- But error message says "likely timeout", implying crash, not a slow test

**Severity:** MEDIUM

**Mitigation:** Log timeout explicitly: `tfErr.last_error.type = "test_timeout"` for dashboard to render differently (show "Increase timeout?" option).

---

### Finding 7.3: Test Result File Race (MEDIUM)

**Location:** `/automation/scripts/serve-dashboard.mjs:2362-2371`

**Issue:** Cascade reads task state AFTER waiting for test to complete, but cowork-test.mjs might still be writing the result file.

```javascript
await execAsync(`node scripts/cowork-test.mjs ${taskId}`, { ... });  // ← Waits for process exit

const tfAfterTest = readJSON(taskFile);  // ← Reads task JSON
if (tfAfterTest && tfAfterTest.state === 'TEST_FAILED') {
  // ...
}
```

**Scenario:**
1. cowork-test.mjs completes, writes test result to task JSON (line 1)
2. Returns from execAsync (process exits)
3. cascade engine's readJSON() reads task JSON (line 2)
4. Between lines 1 and 2, another process writes a different value to task JSON
5. Cascade reads stale data

**Severity:** MEDIUM (unlikely but possible in high concurrency)

**Mitigation:** Read test result from `state/cowork-tests/{taskId}.json` instead of task.json, since that's where cowork-test.mjs writes the detailed result.

---

## 8. APP Mode Decision Handling Race

### Finding 8.1: RED Guardrail Decision Overwritten by Concurrent Cascade (HIGH)

**Location:** `/automation/scripts/serve-dashboard.mjs:2305-2348` (guardrail routing after execute step)

**Issue:** If red guardrail is triggered but user's decision endpoint is called while another cascade is advancing, the decision can be lost.

**Scenario:**
```
Cascade A execute step completes with RED guardrail
→ state set to BLOCKED_ON_DECISION
→ decision_proposal created

User starts reviewing decision (takes 30 seconds)

Meanwhile: Cascade B (different task) completes, spawns followup Task C
           Task C.current_step = null (no cascade running)

User clicks "Accept Changes" on Cascade A's decision
→ guardrail-decision endpoint reads task
→ Updates task.state = IMPLEMENTED (advancing past guardrail)
→ Writes task JSON

BUT: Cascade A's guardrail routing has already decided to break (line 2348)
     Cascade A continues and writes task JSON again
     OR: cleanStaleStatus on next server restart sees stale state

Result: Decision accepted but task never advanced because cascade loop exited
```

**More Critical Scenario:**
```
T1.00: Cascade A hits RED guardrail, creates decision proposal, sets state=BLOCKED_ON_DECISION
T1.05: guardrail-decision endpoint called with decision="accept"
T1.10: Decision updates task.state = IMPLEMENTED, writes task JSON
T1.11: Decision runs: execSync(merge-task.mjs), but merge-task.mjs tries to check git state
T1.12: Meanwhile, Cascade B is in prepare-worktree, acquires git lock
T1.13: merge-task.mjs hangs waiting for git lock
       → merge fails after timeout
       → decision processor catches error, but task.state is already IMPLEMENTED
       → Task is stuck: state=IMPLEMENTED but not merged, no cascade running to fix it
```

**Severity:** HIGH

**Mitigation:**
1. State BLOCKED_ON_DECISION is a terminal waiting state; cascade must NOT resume without explicit decision
2. When decision is made, spawn a NEW cascade from that state, don't try to resume old cascade
3. Use decision ID as idempotence key: if decision is processed twice, second call is a no-op

---

## Summary Table

| # | Issue | Category | Severity | Status |
|---|-------|----------|----------|--------|
| 1.1 | No guard against concurrent retries | Retry | HIGH | **CRITICAL path** |
| 1.2 | No retry limit | Retry | MEDIUM | Monitor |
| 1.3 | Retry during active cascade race | Retry | HIGH | **CRITICAL path** |
| 1.4 | failed_step not cleared on fresh cascade | Retry | MEDIUM | Fix in next sprint |
| 2.1 | No concurrency control, unlimited parallel cascades | Concurrency | CRITICAL | **CRITICAL path** |
| 2.2 | No locking on git operations | Concurrency | HIGH | **CRITICAL path** |
| 3.1 | Double-retry creates duplicate cascade | Concurrency | HIGH | Same as 1.1 |
| 3.2 | Parent task retry while child running | Concurrency | MEDIUM | Future: dependency tracking |
| 4.1 | State transitions not atomic | State | MEDIUM | Migrate to SQLite |
| 4.2 | Task JSON writes not atomic | State | CRITICAL | **CRITICAL path** |
| 4.3 | State transitions missing validation | State | HIGH | **CRITICAL path** |
| 5.1 | No conflict detection between tasks | File Conflicts | HIGH | **CRITICAL path** |
| 5.2 | Worktree branch dependency not checked | File Conflicts | MEDIUM | Future: dependency tracking |
| 6.1 | APP mode indefinite blocking on no response | APP Mode | MEDIUM | Config timeout, notify user |
| 6.2 | Malformed response file stalls cascade | APP Mode | MEDIUM | Validate response on upload |
| 6.3 | Server restart leaves prompt queue dangling | APP Mode | MEDIUM | Auto-resume polling on startup |
| 7.1 | Process crash not handled properly | Cowork Test | HIGH | **CRITICAL path** |
| 7.2 | Test timeout not distinguishable | Cowork Test | MEDIUM | Better error classification |
| 7.3 | Test result file race condition | Cowork Test | MEDIUM | Read from result file, not task JSON |
| 8.1 | RED guardrail decision overwritten | Decision | HIGH | **CRITICAL path** |

---

## Recommended Immediate Actions (CRITICAL PATH)

**Priority 1 (Before Production):**
1. **2.1:** Implement concurrency limit (max 2 concurrent cascades with in-memory queue)
2. **4.2:** Implement atomic writes (write-to-temp, atomic rename)
3. **1.1 + 3.1:** Add retry lock check + disable button on UI
4. **2.2:** Add file-based lock around git operations
5. **4.3:** Add state transition validation

**Priority 2 (Next Sprint):**
1. **5.1:** Pre-execute conflict detection
2. **7.1:** Distinguish process crash from test failure
3. **8.1:** Redesign decision handling to spawn new cascade

**Priority 3 (Long-term):**
1. Migrate task state to SQLite with transactions
2. Implement proper task queue service
3. Add dependency tracking (parent_task_id)
4. Add audit trail for all state changes

---

## Testing Recommendations

1. **Chaos Test:** Spawn 5 concurrent cascades on different tasks → verify no resource exhaustion or state corruption
2. **Retry Double-Click Test:** Bind rapid retry clicks → verify second click is ignored
3. **Corruption Recovery:** Kill server mid-task-JSON-write → verify on restart, task can be recovered
4. **APP Mode Timeout:** Don't respond to prompt → verify timeout after N minutes, not 1 hour
5. **Conflict Test:** Two tasks edit same file → verify conflict detected before execute, not at merge

---

## Conclusion

The pipeline is **not production-ready for concurrent workloads**. The single-threaded JavaScript architecture provides NO concurrency safety; even without explicit parallelism, race conditions exist in retry logic and state machine transitions.

**Recommend:** Implement Priority 1 items before supporting multiple concurrent tasks. Start with concurrency=1 (sequential tasks) until fixes are in place.
