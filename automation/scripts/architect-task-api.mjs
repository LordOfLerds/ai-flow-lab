import {
  loadTask,
  saveTask,
  ensureTaskPaths,
  readRepoFile,
  writeRepoFile,
  callLLMForStep,
  discoverSourceContext,
  repoRoot,
  addFrontmatter,
  automationRoot
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
    } catch (_) { expanded.push(src); }
  }
  const parts = [];
  for (const src of expanded) {
    try {
      const content = readRepoFile(src);
      if (content.trim()) parts.push(`[${src}]\n${content}`);
    } catch (_) {}
  }
  return parts.join("\n\n");
}

const truthContext = loadTruthFiles();
const codeContext = discoverSourceContext(10, 60);

// Load resolved clarification answers from previous runs (if re-running after user answered)
function loadResolvedClarifications() {
  const decisionsDir = path.join(automationRoot(), "state", "decisions");
  if (!fs.existsSync(decisionsDir)) return "";
  try {
    const decisions = fs.readdirSync(decisionsDir)
      .filter(f => f.endsWith('.json'))
      .map(f => { try { return JSON.parse(fs.readFileSync(path.join(decisionsDir, f), 'utf8')); } catch { return null; } })
      .filter(d => d && d.source_type === 'clarification' && d.linked_tasks?.includes(taskId));
    if (decisions.length === 0) return "";
    return "\n\nOwner clarifications (use these as authoritative answers):\n" +
      decisions.map(d => `- Q: ${d.topic}\n  A: ${d.selected_option}`).join("\n") + "\n";
  } catch { return ""; }
}
const clarificationContext = loadResolvedClarifications();

// Add task description if available
const descriptionBlock = task.description ? `\nTask description:\n${task.description}\n` : "";

const instructions = `You are the project architect.
Return ONLY markdown for the spec file.
Do not implement code.
Do not invent business rules.
Treat docs as primary truth.
If code may be ahead of docs, state uncertainty explicitly.

IMPORTANT: If you need information that is NOT available in the truth docs or code context,
do NOT invent it. Instead, add a "## Clarification Needed" section at the end of your spec.
Only use this when critical information is genuinely missing — not for nice-to-haves.`;

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
- ## Clarification Needed (optional — only if critical info is missing from truth docs)

If you include "## Clarification Needed", use this format per question:

### CQ-1
- question: <the specific question>
- why_needed: <why this info is critical and cannot be inferred>
- blocking: true

Repo truth files:

${truthContext || "(no truth files found in repo)"}

Current code context:

${codeContext || "(no source files found)"}
${clarificationContext}`;

const text = await callLLMForStep({
  instructions,
  input,
  taskId,
  step: "architect",
  laneType: task.lane_type || "feature-lane"
});

const withFm = addFrontmatter(text, {
  type: 'spec',
  task_id: taskId,
  goal_id: task.parent_goal_id || '',
  created: new Date().toISOString().split('T')[0],
  tags: `[ai-flow-lab, spec, ${task.lane_type || 'feature'}]`
});
writeRepoFile(task.spec_path, withFm);
saveTask(taskId, task);

console.log(`Wrote ${task.spec_path}`);
