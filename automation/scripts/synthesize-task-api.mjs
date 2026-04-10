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

// Dynamic truth file discovery
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
  return truthSources.map(src => {
    const content = readRepoFile(src);
    return content.trim() ? `[${src}]\n${content}` : null;
  }).filter(Boolean).join("\n\n");
}

const truthContext = loadTruthFiles();

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

Note: Project truth files (CLAUDE.md, AGENTS.md, DOMAIN_MODEL.md, etc.) are already
incorporated in the spec and review above. Do NOT request them again — use the spec
and review as your authoritative sources.

Spec:

[${task.spec_path}]
${spec}

Review:

[${task.review_path}]
${review}
`;

const text = await callLLMForStep({
  instructions,
  input,
  taskId,
  step: "synthesize",
  laneType: task.lane_type || "feature-lane"
});

writeRepoFile(task.brief_path, text);
saveTask(taskId, task);

console.log(`Wrote ${task.brief_path}`);
