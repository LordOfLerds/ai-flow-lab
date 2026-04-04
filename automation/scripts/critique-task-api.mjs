import {
  loadTask,
  saveTask,
  ensureTaskPaths,
  readRepoFile,
  writeRepoFile,
  callGemini
} from "./_llm-utils.mjs";

const [taskId] = process.argv.slice(2);

if (!taskId) {
  console.error("Usage: node scripts/critique-task-api.mjs <TASK_ID>");
  process.exit(1);
}

let task = loadTask(taskId);
task = ensureTaskPaths(task, taskId);

const spec = readRepoFile(task.spec_path);
if (!spec.trim()) {
  throw new Error(`Spec file missing or empty: ${task.spec_path}`);
}

const prompt = `
You are the critical reviewer for task ${task.task_id}.

Task:
- title: ${task.title}

Write ONLY markdown.
Do not implement code.
Do not rewrite the spec completely.

Use these sections exactly:
- # ${task.task_id} Gemini Review
- ## Review target
- ## Contradictions
- ## Missing edge cases
- ## Scope risks
- ## Missing tests
- ## Hidden assumptions
- ## Recommended corrections

Truth files:

[docs/DOMAIN_MODEL.md]
${readRepoFile("docs/DOMAIN_MODEL.md")}

[docs/INVARIANTS.md]
${readRepoFile("docs/INVARIANTS.md")}

[docs/ARCHITECTURE.md]
${readRepoFile("docs/ARCHITECTURE.md")}

[AGENTS.md]
${readRepoFile("AGENTS.md")}

Spec under review:

[${task.spec_path}]
${spec}
`;

const text = await callGemini({ prompt });

writeRepoFile(task.review_path, text);
saveTask(taskId, task);

console.log(`Wrote ${task.review_path}`);
