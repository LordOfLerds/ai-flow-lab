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
const resultAbs = path.join(repoRoot, resultRel);

if (!fs.existsSync(resultAbs)) {
  console.error(`Executor report missing: ${resultRel}`);
  process.exit(1);
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
