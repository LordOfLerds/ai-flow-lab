import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const [taskId] = process.argv.slice(2);

if (!taskId) {
  console.error("Usage: node scripts/prepare-worktree.mjs <TASK_ID>");
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

if (fs.existsSync(branchLock) || fs.existsSync(taskLock)) {
  console.error("Task or branch already locked.");
  process.exit(1);
}

fs.writeFileSync(taskLock, `locked by ${task.executor} for ${taskId}\n`);
fs.writeFileSync(branchLock, `locked branch ${task.branch_name}\n`);

const wtRoot = path.resolve(repoRoot, "../wt");
fs.mkdirSync(wtRoot, { recursive: true });

const worktreePath = path.resolve(wtRoot, taskId);
task.worktree_path = worktreePath;

try {
  execSync(`git -C "${repoRoot}" worktree add "${worktreePath}" -b "${task.branch_name}"`, {
    stdio: "inherit"
  });
} catch (err) {
  if (fs.existsSync(taskLock)) fs.unlinkSync(taskLock);
  if (fs.existsSync(branchLock)) fs.unlinkSync(branchLock);
  throw err;
}

task.runtime_status = "RUNNING";
task.updated_at = new Date().toISOString();
fs.writeFileSync(taskFile, JSON.stringify(task, null, 2));

console.log(`Prepared worktree at ${worktreePath}`);
