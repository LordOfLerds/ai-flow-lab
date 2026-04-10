import {
  loadTask,
  saveTask,
  ensureTaskPaths,
  readRepoFile,
  writeRepoFile,
  callLLMForStep,
  discoverSourceContext,
  repoRoot
} from "./_llm-utils.mjs";
import fs from "node:fs";
import path from "node:path";
const [taskId] = process.argv.slice(2);

if (!taskId) {
  console.error("Usage: node scripts/architect-task-api.mjs <TASK_ID>");
  process.exit(1);
}

let task = loadTask(taskId);
task = ensureTaskPaths(task, taskId);

// --- Dynamic truth & context discovery ---

function loadTruthFiles() {
  const root = repoRoot();
  let truthSources = [];

  // Try to read project.config.yaml for truth_sources
  const configPath = path.join(root, "ai", "project.config.yaml");
  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, "utf8");
      // Simple YAML parse for truth_sources array (no dependency needed)
      const lines = raw.split("\n");
      let inTruth = false;
      for (const line of lines) {
        if (/^truth_sources\s*:/.test(line)) { inTruth = true; continue; }
        if (inTruth && /^\s+-\s+(.+)/.test(line)) {
          truthSources.push(line.match(/^\s+-\s+(.+)/)[1].trim());
        } else if (inTruth && /^\S/.test(line)) { inTruth = false; }
      }
    } catch (_) {}
  }

  // Fallback: scan for common truth files if config has none
  if (truthSources.length === 0) {
    const candidates = [
      "CLAUDE.md", "AGENTS.md", "README.md",
      "docs/DOMAIN_MODEL.md", "docs/INVARIANTS.md", "docs/ARCHITECTURE.md",
      "ai/project.config.yaml"
    ];
    for (const c of candidates) {
      if (fs.existsSync(path.join(root, c))) truthSources.push(c);
    }
  }

  // Build context string from found truth files
  const parts = [];
  for (const src of truthSources) {
    const content = readRepoFile(src);
    if (content.trim()) {
      parts.push(`[${src}]\n${content}`);
    }
  }
  return parts.join("\n\n");
}

const truthContext = loadTruthFiles();
const codeContext = discoverSourceContext(10, 60);

// Add task description if available
const descriptionBlock = task.description ? `\nTask description:\n${task.description}\n` : "";

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
${descriptionBlock}
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

${truthContext || "(no truth files found in repo)"}

Current code context:

${codeContext || "(no source files found)"}
`;

const text = await callLLMForStep({
  instructions,
  input,
  taskId,
  step: "architect",
  laneType: task.lane_type || "feature-lane"
});

writeRepoFile(task.spec_path, text);
saveTask(taskId, task);

console.log(`Wrote ${task.spec_path}`);
