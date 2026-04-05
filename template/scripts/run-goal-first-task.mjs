import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const [goalId, firstTaskId] = process.argv.slice(2);

if (!goalId || !firstTaskId) {
  console.error("Usage: node scripts/run-goal-first-task.mjs <GOAL_ID> <FIRST_TASK_ID>");
  process.exit(1);
}

const automationRoot = process.cwd();
const proposalDir = path.join(automationRoot, "state", "proposals");
const goalsDir = path.join(automationRoot, "state", "goals");

function logStep(stepName, message = "") {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] ${stepName}`;
  if (message) {
    console.log(`\n${prefix}: ${message}`);
  } else {
    console.log(`\n${prefix}`);
  }
}

function run(cmd) {
  logStep("run", cmd);
  try {
    const startMs = Date.now();
    execSync(cmd, { stdio: "inherit", shell: true, cwd: automationRoot });
    const durationMs = Date.now() - startMs;
    logStep("run", `completed in ${durationMs}ms`);
    return { success: true, durationMs };
  } catch (e) {
    const durationMs = Date.now() - startMs;
    logStep("run", `failed after ${durationMs}ms`);
    throw e;
  }
}

function parseTruthy(value) {
  const v = (value || "").trim().toLowerCase();
  return [
    "true",
    "yes",
    "y",
    "1",
    "spawn",
    "spawn-now",
    "spawn now",
    "recommended",
    "recommended-now"
  ].includes(v);
}

async function runGoalFirstTask() {
  try {
    logStep("init", `Starting goal execution for ${goalId}, first task: ${firstTaskId}`);

    // Verify goal file exists
    const goalJsonPath = path.join(goalsDir, `${goalId}.json`);
    if (!fs.existsSync(goalJsonPath)) {
      throw new Error(`Goal file not found: ${goalJsonPath}`);
    }

    logStep("verify", `Goal file verified: ${goalJsonPath}`);

    // Plan the goal
    logStep("plan-goal", `Planning goal: ${goalId}`);
    run(`node scripts/plan-goal-api.mjs ${goalId}`);

    // Load and validate proposals
    const proposalFiles = fs.readdirSync(proposalDir).filter((f) => f.startsWith(`${goalId}-P-`) && f.endsWith(".json"));
    if (proposalFiles.length === 0) {
      throw new Error(`No goal proposals found for ${goalId} after planning`);
    }

    logStep("proposals", `Found ${proposalFiles.length} proposal(s)`);

    const proposals = proposalFiles.map((f) => {
      const content = fs.readFileSync(path.join(proposalDir, f), "utf8");
      return JSON.parse(content);
    });
    proposals.sort((a, b) => a.index - b.index);

    // Select proposal: prefer spawnable, else first
    const spawnable = proposals.filter((p) => parseTruthy(p.should_spawn_now));
    const chosen = spawnable.length > 0 ? spawnable[0] : proposals[0];

    logStep("select-proposal", `Chose proposal: ${chosen.proposal_id}`);
    logStep("select-proposal", `  Title: ${chosen.title}`);
    logStep("select-proposal", `  Should spawn now: ${parseTruthy(chosen.should_spawn_now)}`);
    logStep("select-proposal", `  Lane type: ${chosen.lane_type}`);
    logStep("select-proposal", `  Executor: ${chosen.executor}`);

    // Write chosen proposal to goal file for tracking
    const goal = JSON.parse(fs.readFileSync(goalJsonPath, "utf8"));
    goal.chosen_proposal_id = chosen.proposal_id;
    goal.chosen_proposal_index = chosen.index;
    goal.chosen_proposal_title = chosen.title;
    goal.first_task_id = firstTaskId;
    goal.updated_at = new Date().toISOString();
    fs.writeFileSync(goalJsonPath, JSON.stringify(goal, null, 2));

    logStep("update-goal", `Updated goal with chosen proposal: ${chosen.proposal_id}`);

    // Spawn task from proposal
    logStep("spawn-task", `Spawning first task: ${firstTaskId}`);
    run(`node scripts/spawn-from-goal-proposal.mjs ${chosen.proposal_id} ${firstTaskId}`);

    // Run the task
    logStep("run-task", `Executing task: ${firstTaskId}`);
    run(`node scripts/run-task.mjs ${firstTaskId}`);

    logStep("complete", `Goal execution completed successfully`);
    process.exit(0);
  } catch (e) {
    logStep("error", `Goal execution failed: ${e.message}`);
    console.error(e);
    process.exit(1);
  }
}

runGoalFirstTask();
