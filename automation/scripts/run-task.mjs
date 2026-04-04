import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const [taskId] = process.argv.slice(2);

if (!taskId) {
  console.error("Usage: node scripts/run-task.mjs <TASK_ID>");
  process.exit(1);
}

function run(cmd) {
  console.log(`\n>>> ${cmd}`);
  execSync(cmd, { stdio: "inherit", shell: true, cwd: process.cwd() });
}

function repoRoot() {
  return path.resolve(process.cwd(), "..");
}

function taskJson(taskId) {
  return path.join(process.cwd(), "state", "tasks", `${taskId}.json`);
}

function commitArtifacts(taskId, message) {
  const repo = repoRoot();
  const task = JSON.parse(fs.readFileSync(taskJson(taskId), "utf8"));

  const files = [task.spec_path, task.review_path, task.brief_path].filter(Boolean);
  const existing = files.filter((rel) => fs.existsSync(path.join(repo, rel)));

  if (existing.length === 0) {
    console.log(`No artifact files to commit for ${taskId}`);
    return;
  }

  for (const rel of existing) {
    run(`git -C "${repo}" add "${rel}"`);
  }

  try {
    run(`git -C "${repo}" commit -m "${message}"`);
  } catch {
    console.log(`No new commit created for ${taskId} (possibly no changes).`);
  }
}

run(`node scripts/architect-task-api.mjs ${taskId}`);
run(`node scripts/set-state.mjs ${taskId} ARCHITECTED`);
commitArtifacts(taskId, `docs: add spec for ${taskId}`);

run(`node scripts/critique-task-api.mjs ${taskId}`);
run(`node scripts/set-state.mjs ${taskId} CRITIQUED`);
commitArtifacts(taskId, `docs: add review for ${taskId}`);

run(`node scripts/synthesize-task-api.mjs ${taskId}`);
run(`node scripts/check-artifacts.mjs ${taskId}`);
run(`node scripts/set-state.mjs ${taskId} SYNTHESIZED`);
commitArtifacts(taskId, `docs: add implementation brief for ${taskId}`);

run(`node scripts/prepare-worktree.mjs ${taskId}`);
run(`node scripts/bootstrap-worktree.mjs ${taskId}`);
run(`node scripts/set-state.mjs ${taskId} IMPLEMENTING`);
