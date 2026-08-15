import fs from "node:fs";
import path from "node:path";
import { automationRoot, repoRoot } from "./_llm-utils.mjs";

const [taskId] = process.argv.slice(2);

if (!taskId) {
  console.error("Usage: node scripts/synthesize-task.mjs <TASK_ID>");
  process.exit(1);
}

const autoRoot = automationRoot();
const _repoRoot = repoRoot();
const taskFile = path.join(autoRoot, "state", "tasks", `${taskId}.json`);
const promptsDir = path.join(autoRoot, "prompts");
fs.mkdirSync(promptsDir, { recursive: true });

if (!fs.existsSync(taskFile)) {
  console.error(`Task file not found: ${taskFile}`);
  process.exit(1);
}

const task = JSON.parse(fs.readFileSync(taskFile, "utf8"));

if (!task.spec_path || !task.review_path) {
  console.error("Task must have spec_path and review_path. Run architect-task and critique-task first.");
  process.exit(1);
}

const specAbs = path.join(_repoRoot, task.spec_path);
const reviewAbs = path.join(_repoRoot, task.review_path);

if (!fs.existsSync(specAbs) || !fs.existsSync(reviewAbs)) {
  console.error("Spec or review file missing.");
  process.exit(1);
}

const briefRel = `ai/briefs/${taskId}_implementation.md`;
const briefAbs = path.join(_repoRoot, briefRel);

if (!fs.existsSync(briefAbs)) {
  fs.writeFileSync(
    briefAbs,
`# ${taskId} Implementation Brief

## Goal
[TBD]

## Scope
[TBD]

## Constraints
[TBD]

## File targets
[TBD]

## Tests required
[TBD]

## Risks
[TBD]

## Explicit non-goals
[TBD]
`
  );
}

const promptPath = path.join(promptsDir, `${taskId}_chatgpt_synthesis_prompt.md`);
fs.writeFileSync(
  promptPath,
`You are the architecture synthesizer for task ${task.task_id}.

Task:
- title: ${task.title}
- lane_type: ${task.lane_type}
- intended executor: ${task.executor}

Read:
- docs/DOMAIN_MODEL.md
- docs/INVARIANTS.md
- docs/ARCHITECTURE.md
- AGENTS.md
- ${task.spec_path}
- ${task.review_path}

Write a concise execution-ready implementation brief into:
- ${briefRel}

Requirements:
- resolve contradictions explicitly
- keep scope tight
- list concrete file targets
- define tests required
- include non-goals
- do not implement code
`
);

task.brief_path = briefRel;
task.updated_at = new Date().toISOString();
fs.writeFileSync(taskFile, JSON.stringify(task, null, 2));

console.log(`Brief scaffold: ${briefRel}`);
console.log(`Synthesis prompt: automation/prompts/${taskId}_chatgpt_synthesis_prompt.md`);
