import fs from "node:fs";
import path from "node:path";

const [taskId] = process.argv.slice(2);

if (!taskId) {
  console.error("Usage: node scripts/critique-task.mjs <TASK_ID>");
  process.exit(1);
}

const automationRoot = process.cwd();
const repoRoot = path.resolve(automationRoot, "..");
const taskFile = path.join(automationRoot, "state", "tasks", `${taskId}.json`);
const promptsDir = path.join(automationRoot, "prompts");
fs.mkdirSync(promptsDir, { recursive: true });

if (!fs.existsSync(taskFile)) {
  console.error(`Task file not found: ${taskFile}`);
  process.exit(1);
}

const task = JSON.parse(fs.readFileSync(taskFile, "utf8"));

if (!task.spec_path) {
  console.error("Task has no spec_path. Run architect-task first.");
  process.exit(1);
}

const specAbs = path.join(repoRoot, task.spec_path);
if (!fs.existsSync(specAbs)) {
  console.error(`Spec file not found: ${specAbs}`);
  process.exit(1);
}

const reviewRel = `ai/reviews/${taskId}_gemini_review.md`;
const reviewAbs = path.join(repoRoot, reviewRel);

if (!fs.existsSync(reviewAbs)) {
  fs.writeFileSync(
    reviewAbs,
`# ${taskId} Gemini Review

## Review target
- ${task.spec_path}

## Contradictions
[TBD]

## Missing edge cases
[TBD]

## Scope risks
[TBD]

## Missing tests
[TBD]

## Hidden assumptions
[TBD]

## Recommended corrections
[TBD]
`
  );
}

const promptPath = path.join(promptsDir, `${taskId}_gemini_review_prompt.md`);
fs.writeFileSync(
  promptPath,
`You are the critical reviewer for task ${task.task_id}.

Task:
- title: ${task.title}

Read these repo files first:
- docs/DOMAIN_MODEL.md
- docs/INVARIANTS.md
- docs/ARCHITECTURE.md
- AGENTS.md
- ${task.spec_path}

Write a critical review into:
- ${reviewRel}

Focus on:
- contradictions
- missing edge cases
- hidden assumptions
- scope creep
- missing tests
- risky ambiguity

Do not implement code.
Do not rewrite the spec completely.
`
);

task.review_path = reviewRel;
task.updated_at = new Date().toISOString();
fs.writeFileSync(taskFile, JSON.stringify(task, null, 2));

console.log(`Review scaffold: ${reviewRel}`);
console.log(`Gemini prompt: automation/prompts/${taskId}_gemini_review_prompt.md`);
