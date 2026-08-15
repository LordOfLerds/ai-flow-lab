import fs from "node:fs";
import path from "node:path";
import { automationRoot, repoRoot } from "./_llm-utils.mjs";

const [taskId] = process.argv.slice(2);

if (!taskId) {
  console.error("Usage: node scripts/architect-task.mjs <TASK_ID>");
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

const specRel = `ai/specs/${taskId}_spec.md`;
const specAbs = path.join(_repoRoot, specRel);

if (!fs.existsSync(specAbs)) {
  fs.writeFileSync(
    specAbs,
`# ${taskId} Spec

## Task metadata
- task_id: ${task.task_id}
- title: ${task.title}
- lane_type: ${task.lane_type}
- executor: ${task.executor}

## Problem statement
[TBD]

## Source of truth
- docs/DOMAIN_MODEL.md
- docs/INVARIANTS.md
- docs/ARCHITECTURE.md
- docs/ADR/

## Desired behavior
[TBD]

## Constraints
[TBD]

## Acceptance criteria
[TBD]

## Risks
[TBD]

## Open questions
[TBD]
`
  );
}

const promptPath = path.join(promptsDir, `${taskId}_chatgpt_architect_prompt.md`);
fs.writeFileSync(
  promptPath,
`You are the project architect for task ${task.task_id}.

Task:
- title: ${task.title}
- lane_type: ${task.lane_type}
- intended executor: ${task.executor}

Read these repo files first:
- docs/DOMAIN_MODEL.md
- docs/INVARIANTS.md
- docs/ARCHITECTURE.md
- AGENTS.md
- ai/project.config.yaml

Write a precise implementation spec for this task into:
- ${specRel}

Requirements:
- do not implement code
- do not invent unstated business rules
- treat docs as primary truth
- if code is likely ahead of docs, explicitly mark uncertainty
- include: problem statement, desired behavior, constraints, acceptance criteria, risks, open questions
`
);

task.spec_path = specRel;
task.updated_at = new Date().toISOString();
fs.writeFileSync(taskFile, JSON.stringify(task, null, 2));

console.log(`Spec scaffold: ${specRel}`);
console.log(`Architect prompt: automation/prompts/${taskId}_chatgpt_architect_prompt.md`);
