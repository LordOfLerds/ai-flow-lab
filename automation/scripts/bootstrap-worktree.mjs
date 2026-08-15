import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { automationRoot } from "./_llm-utils.mjs";

const [taskId] = process.argv.slice(2);

if (!taskId) {
  console.error("Usage: node scripts/bootstrap-worktree.mjs <TASK_ID>");
  process.exit(1);
}

const autoRoot = automationRoot();
const taskFile = path.join(autoRoot, "state", "tasks", `${taskId}.json`);

if (!fs.existsSync(taskFile)) {
  console.error(`Task file not found: ${taskFile}`);
  process.exit(1);
}

const task = JSON.parse(fs.readFileSync(taskFile, "utf8"));
const worktreePath = task.worktree_path;

if (!worktreePath || !fs.existsSync(worktreePath)) {
  console.error(`Worktree path missing or not found: ${worktreePath}`);
  process.exit(1);
}

const aiDirs = [
  "ai/specs",
  "ai/reviews",
  "ai/briefs",
  "ai/retros",
  "ai/current-state"
];

for (const rel of aiDirs) {
  fs.mkdirSync(path.join(worktreePath, rel), { recursive: true });
}

const appDir = path.join(worktreePath, "starter-test");
const pkg = path.join(appDir, "package.json");

if (!fs.existsSync(pkg)) {
  console.error(`starter-test/package.json not found in ${appDir}`);
  process.exit(1);
}

const lockfile = path.join(appDir, "package-lock.json");
const cmd = fs.existsSync(lockfile) ? "npm ci" : "npm install";

console.log(`Running '${cmd}' in ${appDir}`);
execSync(cmd, { cwd: appDir, stdio: "inherit" });

console.log(`Bootstrapped worktree for ${taskId} at ${worktreePath}`);
