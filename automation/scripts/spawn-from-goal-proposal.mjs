import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { normalizeLaneType, normalizeExecutor, automationRoot } from "./_llm-utils.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const _scriptsDir = __dirname;

const [proposalId, newTaskId] = process.argv.slice(2);

if (!proposalId || !newTaskId) {
  console.error("Usage: node scripts/spawn-from-goal-proposal.mjs <PROPOSAL_ID> <NEW_TASK_ID>");
  process.exit(1);
}

const autoRoot = automationRoot();
const proposalFile = path.join(autoRoot, "state", "proposals", `${proposalId}.json`);

if (!fs.existsSync(proposalFile)) {
  console.error(`Proposal file not found: ${proposalFile}`);
  process.exit(1);
}

const proposal = JSON.parse(fs.readFileSync(proposalFile, "utf8"));

const laneType = normalizeLaneType(proposal.lane_type);
const executor = normalizeExecutor(proposal.executor, laneType);

execFileSync(
  "node",
  [
    path.join(_scriptsDir, "new-task.mjs"),
    newTaskId,
    laneType,
    proposal.title,
    executor,
    "",
    "goal-planner"
  ],
  { cwd: path.dirname(_scriptsDir), stdio: "inherit", env: { ...process.env, AUTOMATION_ROOT: autoRoot } }
);

const taskFile = path.join(autoRoot, "state", "tasks", `${newTaskId}.json`);
const task = JSON.parse(fs.readFileSync(taskFile, "utf8"));

task.parent_goal_id = proposal.parent_goal_id;
task.goal_source_proposal_id = proposalId;
task.planner_notes = {
  rationale: proposal.rationale,
  smallest_safe_scope: proposal.smallest_safe_scope,
  depends_on: proposal.depends_on,
  priority: proposal.priority
};

fs.writeFileSync(taskFile, JSON.stringify(task, null, 2));
console.log(`Spawned task ${newTaskId} from goal proposal ${proposalId}`);
