import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { loadTask, saveTask } from "./_llm-utils.mjs";

const [taskId, finalRuntimeStatus = "DONE"] = process.argv.slice(2);

if (!taskId) {
  console.error("Usage: node scripts/finalize-task.mjs <TASK_ID> [DONE|STALE|SUPERSEDED]");
  process.exit(1);
}

const automationRoot = process.cwd();
const repoRoot = path.resolve(automationRoot, "..");
const task = loadTask(taskId);

const resultRel = task.result_path || `ai/results/${taskId}_executor_report.md`;
const repoResultAbs = path.join(repoRoot, resultRel);
const wtResultAbs = task.worktree_path ? path.join(task.worktree_path, resultRel) : null;

const hasRepoResult = fs.existsSync(repoResultAbs);
const hasWtResult = wtResultAbs ? fs.existsSync(wtResultAbs) : false;

if (!hasRepoResult && !hasWtResult) {
  console.error(`Executor report missing in both repo and worktree: ${resultRel}`);
  process.exit(1);
}

if (!hasRepoResult && hasWtResult) {
  fs.mkdirSync(path.dirname(repoResultAbs), { recursive: true });
  fs.copyFileSync(wtResultAbs, repoResultAbs);
  console.log(`Copied executor report from worktree to repo: ${resultRel}`);
}

execSync(`node scripts/propose-followups-api.mjs ${taskId}`, {
  cwd: automationRoot,
  stdio: "inherit",
  shell: true
});

execSync(`node scripts/close-task.mjs ${taskId} ${finalRuntimeStatus}`, {
  cwd: automationRoot,
  stdio: "inherit",
  shell: true
});

const reloaded = loadTask(taskId);
reloaded.state = "FOLLOWUPS_PROPOSED";
saveTask(taskId, reloaded);

console.log(`Task ${taskId} finalized and follow-ups proposed`);

// Generate PR draft
try {
  execSync(`node scripts/generate-pr-draft.mjs ${taskId}`, {
    cwd: automationRoot,
    stdio: "inherit",
    shell: true
  });
  console.log(`PR draft generated for ${taskId}`);
} catch (e) {
  console.error(`Warning: PR draft generation failed for ${taskId}: ${e.message}`);
  console.error("This is non-blocking — you can generate it manually later.");
}
