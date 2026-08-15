import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { automationRoot } from "./_llm-utils.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const _scriptsDir = __dirname; // always points to ai-flow-lab/automation/scripts

const [proposalId, newTaskId] = process.argv.slice(2);

if (!proposalId || !newTaskId) {
  console.error("Usage: node scripts/spawn-followup-task.mjs <PROPOSAL_ID> <NEW_TASK_ID>");
  process.exit(1);
}

const autoRoot = automationRoot();
const proposalFile = path.join(autoRoot, "state", "proposals", `${proposalId}.json`);

if (!fs.existsSync(proposalFile)) {
  console.error(`Proposal file not found: ${proposalFile}`);
  process.exit(1);
}

const proposal = JSON.parse(fs.readFileSync(proposalFile, "utf8"));

const cmd = [
  "node",
  path.join(_scriptsDir, "new-task.mjs"),
  newTaskId,
  proposal.lane_type,
  JSON.stringify(proposal.title),
  proposal.executor,
  proposal.parent_task_id,
  "architect-followup"
].join(" ");

// CWD must be the scripts' automation dir (ai-flow-lab/automation) so new-task.mjs resolves correctly.
// AUTOMATION_ROOT env var tells new-task.mjs where the target project's state lives.
execSync(cmd, { cwd: path.dirname(_scriptsDir), stdio: "inherit", shell: true, env: { ...process.env, AUTOMATION_ROOT: autoRoot } });

const taskFile = path.join(autoRoot, "state", "tasks", `${newTaskId}.json`);
const task = JSON.parse(fs.readFileSync(taskFile, "utf8"));

task.followup_source_proposal_id = proposalId;
task.planner_notes = {
  rationale: proposal.rationale,
  smallest_safe_scope: proposal.smallest_safe_scope,
  depends_on: proposal.depends_on,
  priority: proposal.priority
};

// Inherit parent_goal_id from parent task
if (proposal.parent_task_id) {
  const parentFile = path.join(autoRoot, "state", "tasks", `${proposal.parent_task_id}.json`);
  try {
    const parent = JSON.parse(fs.readFileSync(parentFile, "utf8"));
    if (parent.parent_goal_id) task.parent_goal_id = parent.parent_goal_id;
  } catch (_) { /* parent task may not exist */ }
}

fs.writeFileSync(taskFile, JSON.stringify(task, null, 2));
console.log(`Spawned follow-up task ${newTaskId} from ${proposalId}`);
