import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const [proposalId, newTaskId] = process.argv.slice(2);

if (!proposalId || !newTaskId) {
  console.error("Usage: node scripts/spawn-from-goal-proposal.mjs <PROPOSAL_ID> <NEW_TASK_ID>");
  process.exit(1);
}

const automationRoot = process.cwd();
const proposalFile = path.join(automationRoot, "state", "proposals", `${proposalId}.json`);

if (!fs.existsSync(proposalFile)) {
  console.error(`Proposal file not found: ${proposalFile}`);
  process.exit(1);
}

const proposal = JSON.parse(fs.readFileSync(proposalFile, "utf8"));

const cmd = [
  "node",
  "scripts/new-task.mjs",
  newTaskId,
  proposal.lane_type,
  JSON.stringify(proposal.title),
  proposal.executor,
  "",
  "goal-planner"
].join(" ");

execSync(cmd, { cwd: automationRoot, stdio: "inherit", shell: true });

const taskFile = path.join(automationRoot, "state", "tasks", `${newTaskId}.json`);
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
