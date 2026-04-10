#!/usr/bin/env node
/**
 * run-e2e-test.mjs — Automated E2E Regression Runner
 *
 * Exercises the full deterministic pipeline in LLM_MODE=mock:
 *   Goal → Plan → Decision Proposal → Decision Resolution → Task Spawn
 *     → Architect → Critique → Synthesize → (mock execute)
 *     → Finalize → Follow-ups → PR Draft
 *
 * Usage:
 *   LLM_MODE=mock node scripts/run-e2e-test.mjs [--keep]
 *
 * Options:
 *   --keep  Don't clean up test state after run (for debugging)
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

// ── Config ──────────────────────────────────────────────────────────────────

const GOAL_ID = "G-E2E";
const TASK_ID = "T-E2E-P1";
const PROPOSAL_ID = `${GOAL_ID}-P-1`;
const KEEP = process.argv.includes("--keep");

const automationRoot = process.cwd();
const repoRoot = path.resolve(automationRoot, "..");
const fixturesDir = path.join(automationRoot, "test-fixtures");

// Force mock mode
process.env.LLM_MODE = "mock";

// ── Helpers ─────────────────────────────────────────────────────────────────

let passCount = 0;
let failCount = 0;
const failures = [];
const startTime = Date.now();

function log(msg) {
  console.log(`  ${msg}`);
}

function heading(msg) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${msg}`);
  console.log(`${"═".repeat(60)}`);
}

function step(msg) {
  console.log(`\n── ${msg} ${"─".repeat(Math.max(0, 55 - msg.length))}`);
}

function assert(condition, label) {
  if (condition) {
    passCount++;
    log(`✓ ${label}`);
  } else {
    failCount++;
    failures.push(label);
    log(`✗ FAIL: ${label}`);
  }
}

function assertFileExists(filePath, label) {
  assert(fs.existsSync(filePath), label || `File exists: ${path.basename(filePath)}`);
}

function assertJsonField(filePath, field, expected, label) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const value = field.split(".").reduce((obj, key) => obj?.[key], data);
    if (expected === undefined) {
      assert(value !== undefined && value !== null, label || `${field} is set`);
    } else {
      assert(value === expected, label || `${field} === ${JSON.stringify(expected)}`);
    }
  } catch (e) {
    assert(false, label || `JSON read error for ${field}: ${e.message}`);
  }
}

function run(cmd, opts = {}) {
  const cwd = opts.cwd || automationRoot;
  try {
    const output = execSync(cmd, {
      cwd,
      env: { ...process.env, LLM_MODE: "mock" },
      stdio: "pipe",
      timeout: 30000,
      shell: true
    });
    return { ok: true, stdout: output.toString(), stderr: "" };
  } catch (e) {
    return {
      ok: false,
      stdout: (e.stdout || "").toString(),
      stderr: (e.stderr || "").toString(),
      error: e.message
    };
  }
}

// ── Cleanup / Setup ─────────────────────────────────────────────────────────

function safeRemove(filePath) {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // Can't delete — silently skip. Setup will overwrite as needed.
  }
}

function cleanTestState() {
  // Remove test goal state
  safeRemove(path.join(automationRoot, "state", "goals", `${GOAL_ID}.json`));

  // Remove test task state
  safeRemove(path.join(automationRoot, "state", "tasks", `${TASK_ID}.json`));

  // Remove proposals
  const proposalsDir = path.join(automationRoot, "state", "proposals");
  if (fs.existsSync(proposalsDir)) {
    for (const f of fs.readdirSync(proposalsDir)) {
      if (f.startsWith(GOAL_ID) || f.startsWith(TASK_ID)) {
        safeRemove(path.join(proposalsDir, f));
      }
    }
  }

  // Remove decision proposals from this test
  const dpDir = path.join(automationRoot, "state", "decision_proposals");
  if (fs.existsSync(dpDir)) {
    for (const f of fs.readdirSync(dpDir)) {
      try {
        const dp = JSON.parse(fs.readFileSync(path.join(dpDir, f), "utf8"));
        if (dp.source_goal_id === GOAL_ID || dp.source_task_id === TASK_ID) {
          safeRemove(path.join(dpDir, f));
        }
      } catch {}
    }
  }

  // Remove test artifacts from repo
  const artifactPaths = [
    path.join(repoRoot, "goals", `${GOAL_ID}_plan.md`),
    path.join(repoRoot, "goals", `${GOAL_ID}.md`),
    path.join(repoRoot, `ai/specs/${TASK_ID}_spec.md`),
    path.join(repoRoot, `ai/reviews/${TASK_ID}_gemini_review.md`),
    path.join(repoRoot, `ai/briefs/${TASK_ID}_implementation.md`),
    path.join(repoRoot, `ai/results/${TASK_ID}_executor_report.md`),
    path.join(repoRoot, `ai/followups/${TASK_ID}_followups.md`),
    path.join(repoRoot, `ai/pr/${TASK_ID}_pr_draft.md`),
  ];

  for (const p of artifactPaths) {
    safeRemove(p);
  }

  // Remove PR draft state
  safeRemove(path.join(automationRoot, "state", "pr_drafts", `${TASK_ID}.json`));

  // Remove test decision records
  const decisionsDir = path.join(automationRoot, "state", "decisions");
  if (fs.existsSync(decisionsDir)) {
    for (const f of fs.readdirSync(decisionsDir)) {
      try {
        const dec = JSON.parse(fs.readFileSync(path.join(decisionsDir, f), "utf8"));
        if (dec.source_goal_id === GOAL_ID || dec.source_task_id === TASK_ID) {
          safeRemove(path.join(decisionsDir, f));
        }
      } catch {}
    }
  }
}

function setupTestGoal() {
  // Copy goal fixture to state
  const fixture = path.join(fixturesDir, "goals", `E2E-TEST.json`);
  const goalState = path.join(automationRoot, "state", "goals", `${GOAL_ID}.json`);
  fs.mkdirSync(path.dirname(goalState), { recursive: true });
  fs.copyFileSync(fixture, goalState);

  // Create the goal markdown in repo (plan-goal-api reads it from repoRoot/goals/)
  const goalMd = path.join(repoRoot, "goals", `${GOAL_ID}.md`);
  fs.mkdirSync(path.dirname(goalMd), { recursive: true });
  fs.writeFileSync(goalMd, `# ${GOAL_ID}\n\nAdd a friendly greeting to the project README as an end-to-end system test.\n`);

  // Ensure required directories exist
  const dirs = [
    "state/proposals",
    "state/decision_proposals",
    "state/decisions",
    "state/pr_drafts",
    "state/tasks",
    "state/usage-log"
  ];
  for (const d of dirs) {
    fs.mkdirSync(path.join(automationRoot, d), { recursive: true });
  }
  const repoDirs = [
    "ai/specs", "ai/reviews", "ai/briefs", "ai/results", "ai/followups", "ai/pr"
  ];
  for (const d of repoDirs) {
    fs.mkdirSync(path.join(repoRoot, d), { recursive: true });
  }
}

// ── Test Phases ─────────────────────────────────────────────────────────────

function phase1_PlanGoal() {
  step("Phase 1: Plan Goal");
  const result = run(`node scripts/plan-goal-api.mjs ${GOAL_ID}`);
  assert(result.ok, "plan-goal-api.mjs exits cleanly");

  // Goal state should be PLANNED or BLOCKED_ON_DECISION
  const goalState = path.join(automationRoot, "state", "goals", `${GOAL_ID}.json`);
  assertFileExists(goalState, "Goal state file exists after planning");
  const goal = JSON.parse(fs.readFileSync(goalState, "utf8"));
  assert(
    ["PLANNED", "BLOCKED_ON_DECISION"].includes(goal.state),
    `Goal state is PLANNED or BLOCKED_ON_DECISION (got: ${goal.state})`
  );

  // Plan markdown should exist in repo
  const planMd = path.join(repoRoot, "goals", `${GOAL_ID}_plan.md`);
  assertFileExists(planMd, "Goal plan markdown exists");

  // At least one proposal should exist
  const proposalsDir = path.join(automationRoot, "state", "proposals");
  const proposals = fs.readdirSync(proposalsDir).filter(f => f.startsWith(GOAL_ID));
  assert(proposals.length >= 1, `At least 1 proposal created (found: ${proposals.length})`);

  // P-1 specifically should exist and have should_spawn_now: true
  const p1File = path.join(proposalsDir, `${GOAL_ID}-P-1.json`);
  if (fs.existsSync(p1File)) {
    const p1 = JSON.parse(fs.readFileSync(p1File, "utf8"));
    assert(p1.should_spawn_now === true, "P-1 has should_spawn_now: true");
    assert(p1.title && p1.title.length > 0, "P-1 has a title");
    assert(p1.lane_type && p1.lane_type.length > 0, "P-1 has a lane_type");
  } else {
    assert(false, "P-1 proposal file exists");
  }

  // Check if decision proposals were created (from DB-1 in fixture)
  const dpDir = path.join(automationRoot, "state", "decision_proposals");
  const dps = fs.readdirSync(dpDir).filter(f => f.startsWith("DP-"));
  log(`  (${dps.length} decision proposal(s) found)`);
}

function phase2_ResolveDecisions() {
  step("Phase 2: Resolve Decision Proposals (if any)");

  const dpDir = path.join(automationRoot, "state", "decision_proposals");
  const dpFiles = fs.readdirSync(dpDir).filter(f => f.startsWith("DP-") && f.endsWith(".json"));

  if (dpFiles.length === 0) {
    log("No decision proposals to resolve — skipping");
    return;
  }

  for (const dpFile of dpFiles) {
    let dp;
    try {
      dp = JSON.parse(fs.readFileSync(path.join(dpDir, dpFile), "utf8"));
    } catch {
      continue; // Skip corrupt or unreadable files
    }
    if (dp.status !== "open") continue;
    if (dp.source_goal_id !== GOAL_ID && dp.source_task_id !== TASK_ID) continue;

    const dpId = dp.proposal_id || dpFile.replace(".json", "");
    const defaultOption = dp.recommended_default || (dp.options ? dp.options[0] : "option-a");
    const result = run(
      `node scripts/decision-gate.mjs resolve ${dpId} "${defaultOption}" --rationale "E2E test auto-resolve"`
    );
    assert(result.ok, `Resolved decision ${dpId}`);
  }

  // Verify at least one decision record was created
  const decisionsDir = path.join(automationRoot, "state", "decisions");
  if (fs.existsSync(decisionsDir)) {
    const decs = fs.readdirSync(decisionsDir).filter(f => f.startsWith("DEC-"));
    assert(decs.length >= 1, `At least 1 decision record created (found: ${decs.length})`);
  }
}

function phase3_SpawnTask() {
  step("Phase 3: Spawn Task from Proposal");

  const proposalFile = path.join(automationRoot, "state", "proposals", `${PROPOSAL_ID}.json`);
  assertFileExists(proposalFile, "P-1 proposal file exists for spawning");

  const result = run(`node scripts/spawn-from-goal-proposal.mjs ${PROPOSAL_ID} ${TASK_ID}`);
  assert(result.ok, "spawn-from-goal-proposal.mjs exits cleanly");

  const taskFile = path.join(automationRoot, "state", "tasks", `${TASK_ID}.json`);
  assertFileExists(taskFile, "Task state file created");
  assertJsonField(taskFile, "state", "NEW", "Task state is NEW");
  assertJsonField(taskFile, "parent_goal_id", GOAL_ID, "Task linked to parent goal");
  assertJsonField(taskFile, "task_id", TASK_ID, "Task ID is correct");
}

function phase4_Architect() {
  step("Phase 4: Architect Task (Spec Generation)");

  const result = run(`node scripts/architect-task-api.mjs ${TASK_ID}`);
  assert(result.ok, "architect-task-api.mjs exits cleanly");

  // Spec should exist
  const taskFile = path.join(automationRoot, "state", "tasks", `${TASK_ID}.json`);
  const task = JSON.parse(fs.readFileSync(taskFile, "utf8"));
  const specPath = task.spec_path || `ai/specs/${TASK_ID}_spec.md`;
  const specAbs = path.join(repoRoot, specPath);
  assertFileExists(specAbs, "Spec markdown exists");

  // Spec should have content
  const specContent = fs.readFileSync(specAbs, "utf8");
  assert(specContent.length > 100, `Spec has substantial content (${specContent.length} chars)`);

  // Update task state manually (architect doesn't always set state)
  run(`node scripts/set-state.mjs ${TASK_ID} ARCHITECTED`);
  assertJsonField(taskFile, "state", "ARCHITECTED", "Task state is ARCHITECTED");
}

function phase5_Critique() {
  step("Phase 5: Critique Task (Review)");

  const result = run(`node scripts/critique-task-api.mjs ${TASK_ID}`);
  assert(result.ok, "critique-task-api.mjs exits cleanly");

  // Review should exist
  const taskFile = path.join(automationRoot, "state", "tasks", `${TASK_ID}.json`);
  const task = JSON.parse(fs.readFileSync(taskFile, "utf8"));
  const reviewPath = task.review_path || `ai/reviews/${TASK_ID}_gemini_review.md`;
  const reviewAbs = path.join(repoRoot, reviewPath);
  assertFileExists(reviewAbs, "Review markdown exists");

  const reviewContent = fs.readFileSync(reviewAbs, "utf8");
  assert(reviewContent.length > 100, `Review has substantial content (${reviewContent.length} chars)`);

  run(`node scripts/set-state.mjs ${TASK_ID} CRITIQUED`);
  assertJsonField(taskFile, "state", "CRITIQUED", "Task state is CRITIQUED");
}

function phase6_Synthesize() {
  step("Phase 6: Synthesize Task (Implementation Brief)");

  const result = run(`node scripts/synthesize-task-api.mjs ${TASK_ID}`);
  assert(result.ok, "synthesize-task-api.mjs exits cleanly");

  // Brief should exist
  const taskFile = path.join(automationRoot, "state", "tasks", `${TASK_ID}.json`);
  const task = JSON.parse(fs.readFileSync(taskFile, "utf8"));
  const briefPath = task.brief_path || `ai/briefs/${TASK_ID}_implementation.md`;
  const briefAbs = path.join(repoRoot, briefPath);
  assertFileExists(briefAbs, "Brief markdown exists");

  const briefContent = fs.readFileSync(briefAbs, "utf8");
  assert(briefContent.length > 100, `Brief has substantial content (${briefContent.length} chars)`);

  run(`node scripts/set-state.mjs ${TASK_ID} SYNTHESIZED`);
  assertJsonField(taskFile, "state", "SYNTHESIZED", "Task state is SYNTHESIZED");
}

function phase7_MockExecute() {
  step("Phase 7: Mock Executor (Simulate Implementation)");

  // Create a mock executor report (simulating what Codex/Claude would produce)
  const resultPath = path.join(repoRoot, `ai/results/${TASK_ID}_executor_report.md`);
  fs.mkdirSync(path.dirname(resultPath), { recursive: true });

  fs.writeFileSync(resultPath, `# ${TASK_ID} Executor Report

## Summary
Added a friendly greeting section to the README as specified.

## Changes made
- Inserted "## Welcome" section after the main h1 title in README.md
- Added 4 sentences of welcoming text with conversational tone
- Validated markdown syntax renders correctly

## Files changed
- README.md (inserted 6 lines after line 1)

## Test results
- Markdown lint: PASS
- Link check: PASS (0 broken links)
- Visual review: greeting is visible and readable

## Notes
- No table of contents was found, so P-2 (ToC update) may not be needed
- Greeting tone matches AGENTS.md voice guidance
`);

  assertFileExists(resultPath, "Mock executor report created");

  // Set state to IMPLEMENTING → then we'll finalize
  run(`node scripts/set-state.mjs ${TASK_ID} IMPLEMENTING`);

  // Update the task with result_path
  const taskFile = path.join(automationRoot, "state", "tasks", `${TASK_ID}.json`);
  const task = JSON.parse(fs.readFileSync(taskFile, "utf8"));
  task.result_path = `ai/results/${TASK_ID}_executor_report.md`;
  task.runtime_status = "DONE";
  fs.writeFileSync(taskFile, JSON.stringify(task, null, 2));

  assertJsonField(taskFile, "state", "IMPLEMENTING", "Task state is IMPLEMENTING");
  assertJsonField(taskFile, "runtime_status", "DONE", "Runtime status is DONE");
}

function phase8_Finalize() {
  step("Phase 8: Finalize Task (Follow-ups + Close + PR Draft)");

  // finalize-task calls: propose-followups-api → close-task → generate-pr-draft
  // close-task will try to remove worktree and locks — we'll need to handle that gracefully
  // Since we're in mock mode without a real worktree, close-task may warn but shouldn't hard-fail

  // First run propose-followups-api directly (finalize-task delegates to it)
  const followupResult = run(`node scripts/propose-followups-api.mjs ${TASK_ID}`);
  assert(followupResult.ok, "propose-followups-api.mjs exits cleanly");

  // Check follow-up artifacts
  const followupPath = path.join(repoRoot, `ai/followups/${TASK_ID}_followups.md`);
  assertFileExists(followupPath, "Follow-ups markdown exists");

  const followupContent = fs.readFileSync(followupPath, "utf8");
  assert(followupContent.length > 100, `Follow-ups have substantial content (${followupContent.length} chars)`);

  // Check follow-up proposals
  const proposalsDir = path.join(automationRoot, "state", "proposals");
  const followupProposals = fs.readdirSync(proposalsDir).filter(f => f.startsWith(`${TASK_ID}-F-`));
  assert(followupProposals.length >= 1, `At least 1 follow-up proposal created (found: ${followupProposals.length})`);

  // Set state to FOLLOWUPS_PROPOSED
  const taskFile = path.join(automationRoot, "state", "tasks", `${TASK_ID}.json`);
  const task = JSON.parse(fs.readFileSync(taskFile, "utf8"));
  task.state = "FOLLOWUPS_PROPOSED";
  task.updated_at = new Date().toISOString();
  fs.writeFileSync(taskFile, JSON.stringify(task, null, 2));

  assertJsonField(taskFile, "state", "FOLLOWUPS_PROPOSED", "Task state is FOLLOWUPS_PROPOSED");
}

function phase9_PRDraft() {
  step("Phase 9: Generate PR Draft");

  const result = run(`node scripts/generate-pr-draft.mjs ${TASK_ID}`);
  assert(result.ok, "generate-pr-draft.mjs exits cleanly");

  // PR draft markdown
  const prMd = path.join(repoRoot, `ai/pr/${TASK_ID}_pr_draft.md`);
  assertFileExists(prMd, "PR draft markdown exists");

  const prContent = fs.readFileSync(prMd, "utf8");
  assert(prContent.length > 50, `PR draft has content (${prContent.length} chars)`);

  // PR draft JSON state
  const prJson = path.join(automationRoot, "state", "pr_drafts", `${TASK_ID}.json`);
  assertFileExists(prJson, "PR draft JSON state exists");
  assertJsonField(prJson, "task_id", TASK_ID, "PR draft linked to correct task");
  assertJsonField(prJson, "validation.spec_exists", true, "Validation: spec_exists = true");
  assertJsonField(prJson, "validation.review_exists", true, "Validation: review_exists = true");
  assertJsonField(prJson, "validation.brief_exists", true, "Validation: brief_exists = true");

  // Task state should be PR_DRAFTED
  const taskFile = path.join(automationRoot, "state", "tasks", `${TASK_ID}.json`);
  assertJsonField(taskFile, "state", "PR_DRAFTED", "Task state is PR_DRAFTED");
}

function phase10_Invariants() {
  step("Phase 10: Cross-cutting Invariants");

  const taskFile = path.join(automationRoot, "state", "tasks", `${TASK_ID}.json`);
  const task = JSON.parse(fs.readFileSync(taskFile, "utf8"));

  // 1. All artifact paths should be set
  assert(task.spec_path && task.spec_path.length > 0, "Task has spec_path");
  assert(task.review_path && task.review_path.length > 0, "Task has review_path");
  assert(task.brief_path && task.brief_path.length > 0, "Task has brief_path");
  assert(task.result_path && task.result_path.length > 0, "Task has result_path");
  assert(task.followup_path && task.followup_path.length > 0, "Task has followup_path");

  // 2. All artifact files should actually exist
  for (const [name, relPath] of Object.entries({
    spec: task.spec_path,
    review: task.review_path,
    brief: task.brief_path,
    result: task.result_path,
    followups: task.followup_path
  })) {
    if (relPath) {
      const abs = path.join(repoRoot, relPath);
      assertFileExists(abs, `Artifact file exists: ${name} (${relPath})`);
    }
  }

  // 3. Parent goal link is consistent
  assert(task.parent_goal_id === GOAL_ID, "Task parent_goal_id matches goal");

  // 4. Usage log should have entries
  const usageLog = path.join(automationRoot, "state", "usage-log", "usage-log.jsonl");
  if (fs.existsSync(usageLog)) {
    const lines = fs.readFileSync(usageLog, "utf8").trim().split("\n").filter(Boolean);
    const testEntries = lines.filter(l => {
      try { return JSON.parse(l).taskId === TASK_ID || JSON.parse(l).taskId === GOAL_ID; }
      catch { return false; }
    });
    assert(testEntries.length >= 1, `Usage log has entries for this test (found: ${testEntries.length})`);
  } else {
    log("(Usage log not found — skipping check)");
  }

  // 5. Proposal → Task linkage
  const proposalFile = path.join(automationRoot, "state", "proposals", `${PROPOSAL_ID}.json`);
  if (fs.existsSync(proposalFile)) {
    const proposal = JSON.parse(fs.readFileSync(proposalFile, "utf8"));
    assert(proposal.parent_goal_id === GOAL_ID, "Proposal linked to correct goal");
  }

  // 6. No orphan state: task created_at < updated_at
  assert(
    new Date(task.updated_at) >= new Date(task.created_at),
    "Task updated_at >= created_at"
  );
}

// ── Main ────────────────────────────────────────────────────────────────────

heading("AI Flow Lab — E2E Regression Test");
console.log(`  LLM_MODE=mock | Goal: ${GOAL_ID} | Task: ${TASK_ID}`);
console.log(`  Started: ${new Date().toISOString()}`);

step("Setup: Clean previous test state");
cleanTestState();
setupTestGoal();
log("Test state initialized");

try {
  phase1_PlanGoal();
  phase2_ResolveDecisions();
  phase3_SpawnTask();
  phase4_Architect();
  phase5_Critique();
  phase6_Synthesize();
  phase7_MockExecute();
  phase8_Finalize();
  phase9_PRDraft();
  phase10_Invariants();
} catch (e) {
  console.error(`\n❌ Unexpected error: ${e.message}`);
  console.error(e.stack);
  failCount++;
  failures.push(`Unexpected error: ${e.message}`);
}

// ── Cleanup ─────────────────────────────────────────────────────────────────

if (!KEEP) {
  step("Cleanup: Removing test state");
  cleanTestState();
  log("Cleaned up");
} else {
  step("Cleanup: --keep flag set, preserving test state");
  log(`Goal state: state/goals/${GOAL_ID}.json`);
  log(`Task state: state/tasks/${TASK_ID}.json`);
}

// ── Results ─────────────────────────────────────────────────────────────────

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

heading("Results");
console.log(`  Passed: ${passCount}`);
console.log(`  Failed: ${failCount}`);
console.log(`  Total:  ${passCount + failCount}`);
console.log(`  Time:   ${elapsed}s`);

if (failures.length > 0) {
  console.log(`\n  Failures:`);
  for (const f of failures) {
    console.log(`    ✗ ${f}`);
  }
}

console.log();

// Write result to state for dashboard
const resultFile = path.join(automationRoot, "state", "e2e-test-result.json");
fs.writeFileSync(resultFile, JSON.stringify({
  timestamp: new Date().toISOString(),
  passed: passCount,
  failed: failCount,
  total: passCount + failCount,
  elapsed_seconds: parseFloat(elapsed),
  failures,
  goal_id: GOAL_ID,
  task_id: TASK_ID
}, null, 2));

process.exit(failCount > 0 ? 1 : 0);
