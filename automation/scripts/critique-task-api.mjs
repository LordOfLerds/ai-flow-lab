import {
  loadTask,
  saveTask,
  ensureTaskPaths,
  readRepoFile,
  writeRepoFile,
  callLLMForStep,
  repoRoot
} from "./_llm-utils.mjs";
import fs from "node:fs";
import path from "node:path";

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

// Dynamic truth file discovery (same logic as architect)
function loadTruthFiles() {
  const root = repoRoot();
  let truthSources = [];
  const configPath = path.join(root, "ai", "project.config.yaml");
  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, "utf8");
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
  if (truthSources.length === 0) {
    const candidates = ["CLAUDE.md", "AGENTS.md", "README.md", "docs/DOMAIN_MODEL.md", "docs/INVARIANTS.md", "docs/ARCHITECTURE.md"];
    for (const c of candidates) {
      if (fs.existsSync(path.join(root, c))) truthSources.push(c);
    }
  }
  // Expand directories into their files (e.g. "docs/ADR/" → all .md files inside)
  const expanded = [];
  for (const src of truthSources) {
    const full = path.join(root, src);
    try {
      if (fs.statSync(full).isDirectory()) {
        const files = fs.readdirSync(full).filter(f => f.endsWith('.md')).sort();
        for (const f of files) expanded.push(path.join(src, f));
      } else {
        expanded.push(src);
      }
    } catch (_) {
      expanded.push(src); // let readRepoFile handle missing files
    }
  }
  return expanded.map(src => {
    try {
      const content = readRepoFile(src);
      return content.trim() ? `[${src}]\n${content}` : null;
    } catch (_) { return null; }
  }).filter(Boolean).join("\n\n");
}

const truthContext = loadTruthFiles();

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
- ## Acceptance criteria review (are criteria specific, measurable, and testable?)
- ## Contradictions
- ## Missing edge cases
- ## Scope risks
- ## Missing tests
- ## Hidden assumptions
- ## Recommended corrections

Truth files:

${truthContext || "(no truth files found)"}

Spec under review:

[${task.spec_path}]
${spec}
`;

const text = await callLLMForStep({
  prompt,
  taskId,
  step: "critique",
  laneType: task.lane_type || "feature-lane"
});

writeRepoFile(task.review_path, text);
saveTask(taskId, task);

console.log(`Wrote ${task.review_path}`);
