import {
  loadTask,
  saveTask,
  repoRoot
} from "./_llm-utils.mjs";
import { execSync } from "node:child_process";

const [taskId] = process.argv.slice(2);

if (!taskId) {
  console.error("Usage: node scripts/merge-task.mjs <TASK_ID>");
  process.exit(1);
}

const task = loadTask(taskId);
const root = repoRoot();

// Commit any uncommitted changes on current branch
const commitMsg = `[${taskId}] execute: ${task.title || taskId}`;
try {
  execSync(`git add -A && git diff --cached --quiet || git commit -m "${commitMsg.replace(/"/g, '\\"')}"`, {
    cwd: root, stdio: 'pipe', timeout: 15000
  });
  console.log(`[merge] Committed pending changes: ${commitMsg}`);
} catch (e) {
  console.warn(`[merge] No changes to commit or commit failed: ${e.message?.substring(0, 80)}`);
}

// Check if task has a branch and if we need to merge
const branchName = task.branch_name;
if (branchName) {
  try {
    const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: root, encoding: "utf8" }).trim();

    if (currentBranch === branchName) {
      // We're on the task branch — switch to main and merge
      execSync("git checkout main", { cwd: root, stdio: "pipe", timeout: 10000 });
      const mergeMsg = `merge: ${taskId} — ${task.title || taskId}`;
      execSync(`git merge --no-ff "${branchName}" -m "${mergeMsg.replace(/"/g, '\\"')}"`, {
        cwd: root, stdio: "pipe", timeout: 15000
      });
      // Optionally delete branch
      try { execSync(`git branch -d "${branchName}"`, { cwd: root, stdio: "pipe" }); } catch (_) {}
      console.log(`[merge] Merged ${branchName} → main`);
    } else if (currentBranch === "main") {
      // Check if branch exists, merge it
      const exists = execSync(`git branch --list "${branchName}"`, { cwd: root, encoding: "utf8" }).trim();
      if (exists) {
        const mergeMsg = `merge: ${taskId} — ${task.title || taskId}`;
        execSync(`git merge --no-ff "${branchName}" -m "${mergeMsg.replace(/"/g, '\\"')}"`, {
          cwd: root, stdio: "pipe", timeout: 15000
        });
        try { execSync(`git branch -d "${branchName}"`, { cwd: root, stdio: "pipe" }); } catch (_) {}
        console.log(`[merge] Merged ${branchName} → main`);
      } else {
        throw new Error(`Branch ${branchName} does not exist — cannot merge. Was the execute step skipped or did it fail?`);
      }
    } else {
      throw new Error(`On branch ${currentBranch} — expected main or ${branchName}. Cannot merge from unknown branch.`);
    }
  } catch (e) {
    const errMsg = `Git merge failed for ${taskId}: ${e.message?.substring(0, 300)}`;
    console.error(`[merge] FATAL: ${errMsg}`);
    // Abort any in-progress merge to leave repo in clean state
    try { execSync("git merge --abort", { cwd: root, stdio: "pipe" }); } catch (_) {}
    throw new Error(errMsg);
  }
} else {
  // No branch — this is a commit-only task. Verify there are actual committed changes.
  console.log(`[merge] No branch_name set for ${taskId} — commit-only merge`);
}

// Update task state
task.state = "MERGED";
task.runtime_status = "QUEUED";
saveTask(taskId, task);

console.log(`[merge] ${taskId} marked as MERGED`);
