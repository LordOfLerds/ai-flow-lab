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

function run(cmd) {
  console.log(`\n>>> ${cmd}`);
  execSync(cmd, { stdio: "inherit", shell: true, cwd: automationRoot });
}

run(`node scripts/plan-goal-api.mjs ${goalId}`);

const proposalFiles = fs.readdirSync(proposalDir).filter((f) => f.startsWith(`${goalId}-P-`) && f.endsWith(".json"));
if (proposalFiles.length === 0) {
  throw new Error(`No goal proposals found for ${goalId}`);
}

const proposals = proposalFiles.map((f) => JSON.parse(fs.readFileSync(path.join(proposalDir, f), "utf8")));
const spawnable = proposals.filter((p) => p.should_spawn_now);

if (spawnable.length === 0) {
  throw new Error(`No spawnable proposals for ${goalId}`);
}

spawnable.sort((a, b) => a.index - b.index);
const chosen = spawnable[0];

run(`node scripts/spawn-from-goal-proposal.mjs ${chosen.proposal_id} ${firstTaskId}`);
run(`node scripts/run-task.mjs ${firstTaskId}`);
