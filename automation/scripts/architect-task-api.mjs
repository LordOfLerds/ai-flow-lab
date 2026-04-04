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
  console.error("Usage: node scripts/architect-task-api.mjs <TASK_ID>");
  process.exit(1);
}

let task = loadTask(taskId);
task = ensureTaskPaths(task, taskId);

const instructions = `You are the project architect.
Return ONLY markdown for the spec file.
Do not implement code.
Do not invent business rules.
Treat docs as primary truth.
If code may be ahead of docs, state uncertainty explicitly.`;

const input = `
Task metadata:
- task_id: ${task.task_id}
- title: ${task.title}
- lane_type: ${task.lane_type}
- executor: ${task.executor}

Write a spec with these sections exactly:
- # <task id> Spec
- ## Task metadata
- ## Problem statement
- ## Source of truth
- ## Desired behavior
- ## Constraints
- ## Acceptance criteria
- ## Risks
- ## Open questions

Repo truth files:

[docs/DOMAIN_MODEL.md]
${readRepoFile("docs/DOMAIN_MODEL.md")}

[docs/INVARIANTS.md]
${readRepoFile("docs/INVARIANTS.md")}

[docs/ARCHITECTURE.md]
${readRepoFile("docs/ARCHITECTURE.md")}

[AGENTS.md]
${readRepoFile("AGENTS.md")}

[ai/project.config.yaml]
${readRepoFile("ai/project.config.yaml")}

Optional current code context:

[starter-test/src/tasks.ts]
${readRepoFile("starter-test/src/tasks.ts")}

[starter-test/tests/tasks.test.ts]
${readRepoFile("starter-test/tests/tasks.test.ts")}
`;

const text = await callOpenAI({ instructions, input });

writeRepoFile(task.spec_path, text);
saveTask(taskId, task);

console.log(`Wrote ${task.spec_path}`);
