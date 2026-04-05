import {
  loadTask,
  saveTask,
  ensureTaskPaths,
  readRepoFile,
  writeRepoFile,
  callOpenAI
} from "./_llm-utils.mjs";

const [taskId] = process.argv.slice(2);

if (!taskId) {
  console.error("Usage: node scripts/synthesize-task-api.mjs <TASK_ID>");
  process.exit(1);
}

let task = loadTask(taskId);
task = ensureTaskPaths(task, taskId);

const spec = readRepoFile(task.spec_path);
const review = readRepoFile(task.review_path);

if (!spec.trim()) {
  throw new Error(`Spec file missing or empty: ${task.spec_path}`);
}
if (!review.trim()) {
  throw new Error(`Review file missing or empty: ${task.review_path}`);
}

const instructions = `You are the architecture synthesizer.
Return ONLY markdown for an execution-ready implementation brief.
Do not implement code.
Keep scope tight.
Resolve contradictions explicitly.`;

const input = `
Task metadata:
- task_id: ${task.task_id}
- title: ${task.title}
- lane_type: ${task.lane_type}
- executor: ${task.executor}

Write a brief with these sections exactly:
- # ${task.task_id} Implementation Brief
- ## Goal
- ## Scope
- ## Constraints
- ## File targets
- ## Tests required
- ## Chosen minimal policy
- ## Risks
- ## Explicit non-goals

Truth files:

[docs/DOMAIN_MODEL.md]
${readRepoFile("docs/DOMAIN_MODEL.md")}

[docs/INVARIANTS.md]
${readRepoFile("docs/INVARIANTS.md")}

[docs/ARCHITECTURE.md]
${readRepoFile("docs/ARCHITECTURE.md")}

[AGENTS.md]
${readRepoFile("AGENTS.md")}

Spec:

[${task.spec_path}]
${spec}

Review:

[${task.review_path}]
${review}
`;

const text = await callOpenAI({ instructions, input, taskId, step: "synthesize" });

writeRepoFile(task.brief_path, text);
saveTask(taskId, task);

console.log(`Wrote ${task.brief_path}`);
