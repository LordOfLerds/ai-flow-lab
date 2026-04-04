import { execSync } from "node:child_process";

const [taskId] = process.argv.slice(2);

if (!taskId) {
  console.error("Usage: node scripts/run-task.mjs <TASK_ID>");
  process.exit(1);
}

function run(cmd) {
  console.log(`\n>>> ${cmd}`);
  execSync(cmd, { stdio: "inherit", shell: true, cwd: process.cwd() });
}

run(`node scripts/architect-task-api.mjs ${taskId}`);
run(`node scripts/set-state.mjs ${taskId} ARCHITECTED`);

run(`node scripts/critique-task-api.mjs ${taskId}`);
run(`node scripts/set-state.mjs ${taskId} CRITIQUED`);

run(`node scripts/synthesize-task-api.mjs ${taskId}`);
run(`node scripts/check-artifacts.mjs ${taskId}`);
run(`node scripts/set-state.mjs ${taskId} SYNTHESIZED`);

run(`node scripts/prepare-worktree.mjs ${taskId}`);
run(`node scripts/bootstrap-worktree.mjs ${taskId}`);
run(`node scripts/set-state.mjs ${taskId} IMPLEMENTING`);
