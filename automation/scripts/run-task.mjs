import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { automationRoot, repoRoot } from "./_llm-utils.mjs";

const args = process.argv.slice(2);
const [taskId] = args;

if (!taskId) {
  console.error("Usage: node scripts/run-task.mjs <TASK_ID> [--skip-worktree]");
  process.exit(1);
}

const skipWorktree = args.includes("--skip-worktree");

function taskJson(taskId) {
  return path.join(automationRoot(), "state", "tasks", `${taskId}.json`);
}

function logStep(stepName, message = "") {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] ${stepName}`;
  if (message) {
    console.log(`\n${prefix}: ${message}`);
  } else {
    console.log(`\n${prefix}`);
  }
}

function updateTaskStatus(taskId, status) {
  const file = taskJson(taskId);
  if (fs.existsSync(file)) {
    const task = JSON.parse(fs.readFileSync(file, "utf8"));
    task.runtime_status = status;
    task.updated_at = new Date().toISOString();
    fs.writeFileSync(file, JSON.stringify(task, null, 2));
  }
}

function run(cmd, stepName = "run", onError = "throw") {
  logStep(stepName, cmd);
  try {
    const startMs = Date.now();
    execSync(cmd, { stdio: "inherit", shell: true, cwd: automationRoot() });
    const durationMs = Date.now() - startMs;
    logStep(stepName, `completed in ${durationMs}ms`);
    return { success: true, durationMs };
  } catch (e) {
    const durationMs = Date.now() - startMs;
    const errorMsg = `failed after ${durationMs}ms: ${e.message}`;

    if (onError === "throw") {
      logStep(stepName, errorMsg);
      throw e;
    } else if (onError === "retry") {
      logStep(stepName, `${errorMsg} (will retry)`);
      return { success: false, transient: true, durationMs };
    } else {
      logStep(stepName, errorMsg);
      return { success: false, transient: false, durationMs };
    }
  }
}

function commitArtifacts(taskId, message) {
  const repo = repoRoot();
  const task = JSON.parse(fs.readFileSync(taskJson(taskId), "utf8"));

  const files = [task.spec_path, task.review_path, task.brief_path].filter(Boolean);
  const existing = files.filter((rel) => fs.existsSync(path.join(repo, rel)));

  if (existing.length === 0) {
    logStep("commitArtifacts", `No artifact files to commit for ${taskId}`);
    return;
  }

  for (const rel of existing) {
    try {
      execSync(`git -C "${repo}" add "${rel}"`, { stdio: "pipe" });
    } catch (e) {
      logStep("commitArtifacts", `Warning: failed to add ${rel}`);
    }
  }

  try {
    run(`git -C "${repo}" commit -m "${message}"`, "commitArtifacts", "log");
  } catch {
    logStep("commitArtifacts", `No new commit created for ${taskId} (possibly no changes)`);
  }
}

async function runTask() {
  try {
    logStep("init", `Starting task execution for ${taskId}`);
    updateTaskStatus(taskId, "RUNNING");

    // Architecture phase
    try {
      const architectStep = run(`node scripts/architect-task-api.mjs ${taskId}`, "architect-task-api");
      if (architectStep.success) {
        run(`node scripts/set-state.mjs ${taskId} ARCHITECTED`, "set-state-architected");
        commitArtifacts(taskId, `docs: add spec for ${taskId}`);
      }
    } catch (e) {
      if (e.message.includes("503") || e.message.includes("timeout")) {
        logStep("architect-task-api", "Transient error detected, marking for retry");
        updateTaskStatus(taskId, "BLOCKED_RETRY");
        process.exit(1);
      }
      throw e;
    }

    // Critique phase
    try {
      const critiqueStep = run(`node scripts/critique-task-api.mjs ${taskId}`, "critique-task-api");
      if (critiqueStep.success) {
        run(`node scripts/set-state.mjs ${taskId} CRITIQUED`, "set-state-critiqued");
        commitArtifacts(taskId, `docs: add review for ${taskId}`);
      }
    } catch (e) {
      if (e.message.includes("503") || e.message.includes("timeout")) {
        logStep("critique-task-api", "Transient error detected, marking for retry");
        updateTaskStatus(taskId, "BLOCKED_RETRY");
        process.exit(1);
      }
      throw e;
    }

    // Synthesis phase
    try {
      const synthesisStep = run(`node scripts/synthesize-task-api.mjs ${taskId}`, "synthesize-task-api");
      if (synthesisStep.success) {
        run(`node scripts/check-artifacts.mjs ${taskId}`, "check-artifacts");
        run(`node scripts/set-state.mjs ${taskId} SYNTHESIZED`, "set-state-synthesized");
        commitArtifacts(taskId, `docs: add implementation brief for ${taskId}`);
      }
    } catch (e) {
      if (e.message.includes("503") || e.message.includes("timeout")) {
        logStep("synthesize-task-api", "Transient error detected, marking for retry");
        updateTaskStatus(taskId, "BLOCKED_RETRY");
        process.exit(1);
      }
      throw e;
    }

    // Worktree setup phase (skip if flag set)
    if (!skipWorktree) {
      try {
        run(`node scripts/prepare-worktree.mjs ${taskId}`, "prepare-worktree");
        run(`node scripts/bootstrap-worktree.mjs ${taskId}`, "bootstrap-worktree");
      } catch (e) {
        if (e.message.includes("503") || e.message.includes("timeout")) {
          logStep("worktree-setup", "Transient error detected, marking for retry");
          updateTaskStatus(taskId, "BLOCKED_RETRY");
          process.exit(1);
        }
        throw e;
      }
    } else {
      logStep("prepare-worktree", "Skipped (--skip-worktree flag set)");
      logStep("bootstrap-worktree", "Skipped (--skip-worktree flag set)");
    }

    run(`node scripts/set-state.mjs ${taskId} IMPLEMENTING`, "set-state-implementing");

    logStep("complete", `Task ${taskId} execution completed successfully`);
    updateTaskStatus(taskId, "IMPLEMENTING");
    process.exit(0);
  } catch (e) {
    logStep("error", `Task execution failed: ${e.message}`);
    updateTaskStatus(taskId, "ERROR");
    console.error(e);
    process.exit(1);
  }
}

runTask();
