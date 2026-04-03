import fs from "node:fs";
import path from "node:path";

const [taskId, newState] = process.argv.slice(2);

if (!taskId || !newState) {
  console.error("Usage: node scripts/set-state.mjs <TASK_ID> <NEW_STATE>");
  process.exit(1);
}

const allowedStates = [
  "NEW",
  "ARCHITECTED",
  "CRITIQUED",
  "SYNTHESIZED",
  "IMPLEMENTING",
  "PR_OPEN",
  "REVIEWED",
  "MERGED",
  "RETRO_CAPTURED"
];

if (!allowedStates.includes(newState)) {
  console.error(`Invalid state: ${newState}`);
  process.exit(1);
}

const automationRoot = process.cwd();
const taskFile = path.join(automationRoot, "state", "tasks", `${taskId}.json`);

if (!fs.existsSync(taskFile)) {
  console.error(`Task file not found: ${taskFile}`);
  process.exit(1);
}

const task = JSON.parse(fs.readFileSync(taskFile, "utf8"));
task.state = newState;
task.updated_at = new Date().toISOString();

fs.writeFileSync(taskFile, JSON.stringify(task, null, 2));
console.log(`Updated ${taskId} state -> ${newState}`);
