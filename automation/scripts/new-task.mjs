import fs from "node:fs";
import path from "node:path";

const [taskId, laneType, title, executor, parentTaskId = "", origin = "user"] = process.argv.slice(2);

if (!taskId || !laneType || !title || !executor) {
  console.error("Usage: node scripts/new-task.mjs <TASK_ID> <LANE_TYPE> <TITLE> <EXECUTOR> [PARENT_TASK_ID] [ORIGIN]");
  process.exit(1);
}

const root = path.resolve(process.cwd());
const stateDir = path.join(root, "state", "tasks");
fs.mkdirSync(stateDir, { recursive: true });

const branchPrefixMap = {
  "analysis-lane": "analysis",
  "bug-lane": "bug",
  "feature-lane": "feature",
  "danger-lane": "danger",
};

const slug = title
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

const branchPrefix = branchPrefixMap[laneType] || "task";
const branchName = `${branchPrefix}/${taskId}-${slug}`;

const task = {
  task_id: taskId,
  title,
  repo: "ai-flow-lab",
  lane_type: laneType,
  executor,
  parent_task_id: parentTaskId,
  origin,
  state: "NEW",
  runtime_status: "QUEUED",
  branch_name: branchName,
  worktree_path: `../wt/${taskId}`,
  spec_path: "",
  review_path: "",
  brief_path: "",
  result_path: `ai/results/${taskId}_executor_report.md`,
  followup_path: `ai/followups/${taskId}_followups.md`,
  owner_lock: `task:${taskId}`,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const file = path.join(stateDir, `${taskId}.json`);
fs.writeFileSync(file, JSON.stringify(task, null, 2));
console.log(`Created ${file}`);
