import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const [taskId, finalStatus = "DONE"] = process.argv.slice(2);

if (!taskId) {
  console.error("Usage: node scripts/close-task.mjs <TASK_ID> [DONE|SUPERSEDED|STALE]");
  process.exit(1);
}

const automationRoot = process.cwd();
const repoRoot = path.resolve(automationRoot, "..");
const taskFile = path.join(automationRoot, "state", "tasks", `${taskId}.json`);

if (!fs.existsSync(taskFile)) {
  console.error(`Task file not found: ${taskFile}`);
  process.exit(1);
}

const task = JSON.parse(fs.readFileSync(taskFile, "utf8"));

const branchLock = path.join(
  automationRoot,
  "state",
  "locks",
  "branches",
  `${task.branch_name.replace(/\//g, "__")}.lock`
);
const taskLock = path.join(
  automationRoot,
  "state",
  "locks",
  "tasks",
  `${taskId}.lock`
);

if (fs.existsSync(taskLock)) fs.unlinkSync(taskLock);
if (fs.existsSync(branchLock)) fs.unlinkSync(branchLock);

try {
  if (task.worktree_path && fs.existsSync(task.worktree_path)) {
    execSync(`git -C "${repoRoot}" worktree remove "${task.worktree_path}" --force`, {
      stdio: "inherit"
    });
  }
} catch {
  console.error("Warning: could not remove worktree cleanly");
}

task.runtime_status = finalStatus;
task.updated_at = new Date().toISOString();
fs.writeFileSync(taskFile, JSON.stringify(task, null, 2));

console.log(`Closed ${taskId} with status ${finalStatus}`);
