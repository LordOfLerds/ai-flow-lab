#!/usr/bin/env node
/**
 * import-goals.mjs — Import goals + tasks from ChatGPT JSON response
 *
 * Usage:
 *   node scripts/import-goals.mjs <json-file>
 *   OR paste JSON via stdin:
 *   cat response.json | node scripts/import-goals.mjs
 *
 * The JSON should be an array of goal objects as defined in the
 * aurena-wbs-goal-extraction.md prompt.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Allow override via env or --state-dir flag for multi-project support
const stateDirArg = process.argv.find(a => a.startsWith("--state-dir="));
const automationRoot = process.env.AUTOMATION_ROOT || path.resolve(__dirname, "..");
const stateDir = stateDirArg
  ? stateDirArg.split("=")[1]
  : path.join(automationRoot, "state");
const goalsDir = path.join(stateDir, "goals");
const tasksDir = path.join(stateDir, "tasks");

// Read JSON input
let jsonText;
const jsonFile = process.argv[2];
if (jsonFile) {
  jsonText = fs.readFileSync(jsonFile, "utf8");
} else {
  // Read from stdin
  jsonText = fs.readFileSync("/dev/stdin", "utf8");
}

// Strip markdown fences if present
jsonText = jsonText.replace(/^```json?\s*\n?/m, "").replace(/\n?```\s*$/m, "").trim();

let goals;
try {
  goals = JSON.parse(jsonText);
} catch (e) {
  console.error("Failed to parse JSON:", e.message);
  console.error("First 200 chars:", jsonText.substring(0, 200));
  process.exit(1);
}

if (!Array.isArray(goals)) {
  console.error("Expected a JSON array of goals");
  process.exit(1);
}

fs.mkdirSync(goalsDir, { recursive: true });
fs.mkdirSync(tasksDir, { recursive: true });

// Find highest existing task number
const existingTasks = fs.readdirSync(tasksDir).filter(f => f.match(/^T-\d+\.json$/));
let taskCounter = 0;
for (const t of existingTasks) {
  const num = parseInt(t.match(/T-(\d+)/)?.[1] || "0", 10);
  if (num > taskCounter) taskCounter = num;
}

const laneMap = {
  feature: "feature-lane",
  bug: "bug-lane",
  test: "feature-lane",
  danger: "danger-lane"
};

const executorMap = {
  feature: "codex",
  bug: "claude",
  test: "codex",
  danger: "claude"
};

let goalsCreated = 0;
let tasksCreated = 0;

for (const goal of goals) {
  const goalId = goal.id || `G-${String(goalsCreated + 1).padStart(3, "0")}`;

  // Create goal state file
  const goalState = {
    goal_id: goalId,
    title: goal.title,
    description: goal.description || "",
    priority: goal.priority || "P2",
    depends_on: goal.depends_on || [],
    state: "NEW",
    task_ids: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Create tasks for this goal
  if (Array.isArray(goal.tasks)) {
    for (const task of goal.tasks) {
      taskCounter++;
      const taskId = `T-${String(taskCounter).padStart(4, "0")}`;
      const laneType = laneMap[task.lane_type] || "feature-lane";
      const executor = executorMap[task.lane_type] || "codex";

      const taskState = {
        task_id: taskId,
        title: task.title,
        description: task.description || "",
        acceptance_criteria: task.acceptance_criteria || [],
        lane_type: laneType,
        executor,
        state: "NEW",
        parent_task_id: null,
        parent_goal_id: goalId,
        runtime_status: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        current_step: null,
        spec_path: null,
        review_path: null,
        brief_path: null,
        last_error: null,
        failed_step: null,
        result_path: null,
        written_files: [],
        guardrail_result: null,
        followup_path: null
      };

      fs.writeFileSync(
        path.join(tasksDir, `${taskId}.json`),
        JSON.stringify(taskState, null, 2)
      );
      goalState.task_ids.push(taskId);
      tasksCreated++;
      console.log(`  Task ${taskId}: ${task.title} [${laneType}/${executor}]`);
    }
  }

  fs.writeFileSync(
    path.join(goalsDir, `${goalId}.json`),
    JSON.stringify(goalState, null, 2)
  );
  goalsCreated++;
  console.log(`Goal ${goalId}: ${goal.title} (${goalState.task_ids.length} tasks)`);
}

console.log(`\nDone: ${goalsCreated} goals, ${tasksCreated} tasks created.`);
console.log(`State dir: ${stateDir}`);
