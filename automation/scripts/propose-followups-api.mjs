import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import {
  loadTask,
  saveTask,
  readRepoFile,
  writeRepoFile,
  callLLMForStep,
  repoRoot,
  automationRoot
} from "./_llm-utils.mjs";
import { createProposal as createDecisionProposal } from "./decision-gate.mjs";

const [taskId] = process.argv.slice(2);

if (!taskId) {
  console.error("Usage: node scripts/propose-followups-api.mjs <TASK_ID>");
  process.exit(1);
}

const task = loadTask(taskId);
const root = repoRoot();

const resultRel = task.result_path || `ai/results/${taskId}_executor_report.md`;
const followupPath = task.followup_path || `ai/followups/${taskId}_followups.md`;

function readTaskArtifact(relPath) {
  const repoAbs = path.join(root, relPath);
  if (fs.existsSync(repoAbs)) {
    return fs.readFileSync(repoAbs, "utf8");
  }

  if (task.worktree_path) {
    const wtAbs = path.join(task.worktree_path, relPath);
    if (fs.existsSync(wtAbs)) {
      return fs.readFileSync(wtAbs, "utf8");
    }
  }

  return "";
}

// --- Dynamic truth file discovery (same pattern as architect/critique/synthesize) ---
function loadTruthFiles() {
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

// --- Load existing tasks for dedup context ---
function loadExistingTasksSummary() {
  const tasksDir = path.join(automationRoot(), "state", "tasks");
  if (!fs.existsSync(tasksDir)) return "(no existing tasks)";
  const summaries = [];
  try {
    const files = fs.readdirSync(tasksDir).filter(f => /^T-\d+\.json$/.test(f));
    for (const f of files) {
      try {
        const t = JSON.parse(fs.readFileSync(path.join(tasksDir, f), "utf8"));
        summaries.push(`- ${t.task_id}: "${t.title}" [${t.lane_type}] (${t.status || "unknown"})`);
      } catch (_) {}
    }
  } catch (_) {}
  return summaries.length > 0 ? summaries.join("\n") : "(no existing tasks)";
}

const truthContext = loadTruthFiles();
const existingTasksSummary = loadExistingTasksSummary();

const resultText = readTaskArtifact(resultRel);
const specText = task.spec_path ? readTaskArtifact(task.spec_path) : "";
const reviewText = task.review_path ? readTaskArtifact(task.review_path) : "";
const briefText = task.brief_path ? readTaskArtifact(task.brief_path) : "";

let changedFiles = "";
try {
  if (task.branch_name) {
    changedFiles = execSync(
      `git -C "${root}" diff --name-only main...${task.branch_name}`,
      { encoding: "utf8" }
    );
  } else {
    // Fallback: use written_files from task state if no branch
    console.warn(`[propose-followups] WARNING: No branch_name for ${taskId}, using written_files from task state`);
    changedFiles = (task.written_files || []).join("\n");
  }
} catch {
  changedFiles = (task.written_files || []).join("\n");
}

const instructions = `You are the lead architect continuing a patch-based development plan.
Return ONLY markdown.
Do not implement code.
Do not propose broad refactors unless clearly necessary.
Prefer small, reviewable follow-up tasks.
If no follow-up task is needed, say so explicitly.

CRITICAL RULES:
1. Spawnable follow-up tasks — safe work that can proceed without owner input
2. Decision blockers — questions that require owner/maintainer decision before further implementation
3. DEDUPLICATION: You are given a list of ALL existing tasks below. Do NOT propose a follow-up
   that duplicates or substantially overlaps with any existing task. If the work is already
   covered, skip it or note it as "already handled by T-XXXX".
4. EXECUTOR REPORT PRIORITY: The executor result report is your PRIMARY input. It tells you
   exactly what was done, what was NOT done, what issues were discovered, and what the executor
   recommends as follow-ups. Weight this heavily.

If any follow-up requires an owner decision, emit it in the "Decision blockers" section using:

### DB-<n>
- topic:
- rationale:
- blocking_scope: task | goal | system
- options: option A, option B, option C
- recommended_default:
- urgency: high | medium | low

FORMAT RULE (CRITICAL — parser will fail if violated):
Each follow-up MUST start with a Markdown H3 heading in EXACTLY this format:

### F-1
### F-2

Rules:
- Use EXACTLY three hash marks (###), then a space, then F-<number>
- Do NOT use bold (**F-1**) — the parser cannot read it
- Do NOT use #### (four hashes) — only ### (three)
- Do NOT use numbered lists (1. F-1) — only ### headings
- The ### F-N heading must be on its own line with nothing before it
- You may add a title after: ### F-1: Some title (that is fine)
- Each field must be on its own line starting with "- field_name: value"`;

const input = `
Current completed task:
- task_id: ${task.task_id}
- title: ${task.title}
- lane_type: ${task.lane_type}
- executor: ${task.executor}
- parent_task_id: ${task.parent_task_id || "(none)"}

Write markdown with exactly these sections:
- # ${task.task_id} Follow-ups
- ## Task outcome summary
- ## Remaining risks
- ## Candidate follow-up tasks
- ## Recommended next task
- ## Notes for planner

In "Candidate follow-up tasks", use this repeated format per candidate:

### F-<n>
- title:
- lane_type:
- executor:
- rationale:
- smallest_safe_scope:
- depends_on:
- priority:
- should_spawn_now:

---

## EXECUTOR RESULT REPORT (PRIMARY INPUT — read this first!)
${resultText || "(no executor report available)"}

---

## Existing tasks (DO NOT duplicate these):
${existingTasksSummary}

---

Task spec (summary — focus on acceptance criteria):
${specText ? specText.substring(0, 3000) + (specText.length > 3000 ? "\n...(truncated)" : "") : "(no spec)"}

Task review (summary):
${reviewText ? reviewText.substring(0, 2000) + (reviewText.length > 2000 ? "\n...(truncated)" : "") : "(no review)"}

Implementation brief (summary):
${briefText ? briefText.substring(0, 2000) + (briefText.length > 2000 ? "\n...(truncated)" : "") : "(no brief)"}

Changed files:
${changedFiles}
`;

const markdown = await callLLMForStep({
  instructions,
  input,
  taskId,
  step: "propose-followups",
  laneType: task.lane_type || "feature-lane"
});

writeRepoFile(followupPath, markdown);

const proposalDir = path.join(process.cwd(), "state", "proposals");
fs.mkdirSync(proposalDir, { recursive: true });

function parseTruthy(value) {
  const v = (value || "").trim().toLowerCase();
  return [
    "true",
    "yes",
    "y",
    "1",
    "spawn",
    "spawn-now",
    "spawn now",
    "recommended",
    "recommended-now"
  ].includes(v);
}

// Multi-pattern matching with fallback chain for ChatGPT format variations
// Primary: exact ### F-N (three hashes)
const primaryBlocks = [...markdown.matchAll(/###\s+(F-\d+)[^\r\n]*\r?\n([\s\S]*?)(?=\r?\n###\s+F-\d+|\r?\n##\s|$)/g)];

// Fallback 1: #### F-N (four hashes — common ChatGPT mistake)
const fb1Blocks = primaryBlocks.length === 0
  ? [...markdown.matchAll(/####\s+(F-\d+)[^\r\n]*\r?\n([\s\S]*?)(?=\r?\n####\s+F-\d+|\r?\n##\s|$)/g)]
  : [];

// Fallback 2: **F-N** or **F-N:** (bold format — ChatGPT's favorite deviation)
const fb2Blocks = (primaryBlocks.length === 0 && fb1Blocks.length === 0)
  ? [...markdown.matchAll(/\*\*\s*(F-\d+)\s*\*\*:?[^\r\n]*\r?\n([\s\S]*?)(?=\r?\n\*\*\s*F-\d+|\r?\n##\s|$)/g)]
  : [];

// Fallback 3: numbered/bulleted list "1. F-1:" or "- F-1:"
const fb3Blocks = (primaryBlocks.length === 0 && fb1Blocks.length === 0 && fb2Blocks.length === 0)
  ? [...markdown.matchAll(/(?:^|\n)[-\d.]+\s*(F-\d+):?\s*[^\r\n]*\r?\n([\s\S]*?)(?=\r?\n[-\d.]+\s*F-\d+|\r?\n##\s|$)/g)]
  : [];

// Fallback 4: bare "F-N" on its own line (no heading/bold/list prefix — ChatGPT sometimes does this)
const prevFound = primaryBlocks.length > 0 || fb1Blocks.length > 0 || fb2Blocks.length > 0 || fb3Blocks.length > 0;
const fb4Blocks = !prevFound
  ? [...markdown.matchAll(/(?:^|\n\n)(F-\d+)\s*\r?\n([\s\S]*?)(?=\r?\n\n\s*F-\d+\s*\r?\n|\r?\n##\s|$)/g)]
  : [];

// Fallback 5: rescue — any line containing "F-N" followed by structured fields (title:, lane_type:, etc.)
const anyFound = prevFound || fb4Blocks.length > 0;
const fb5Blocks = !anyFound
  ? [...markdown.matchAll(/(?:^|\n).*?(F-\d+).*?\r?\n((?:[\s\S]*?(?:title|lane_type|rationale|executor)[\s\S]*?))(?=\n.*?F-\d+.*?\r?\n|\n##\s|$)/g)]
  : [];

const candidateBlocks = primaryBlocks.length > 0 ? primaryBlocks
  : fb1Blocks.length > 0 ? fb1Blocks
  : fb2Blocks.length > 0 ? fb2Blocks
  : fb3Blocks.length > 0 ? fb3Blocks
  : fb4Blocks.length > 0 ? fb4Blocks
  : fb5Blocks;

const usedFallback = primaryBlocks.length === 0 && candidateBlocks.length > 0;
if (usedFallback) {
  const fmt = fb1Blocks.length > 0 ? "#### (4 hashes)"
    : fb2Blocks.length > 0 ? "**bold**"
    : fb3Blocks.length > 0 ? "list format"
    : fb4Blocks.length > 0 ? "bare F-N"
    : "rescue (loose match)";
  console.warn(`[propose-followups] WARNING: F-N blocks found via fallback parser (${fmt}). LLM did not use the required ### F-N format.`);
}

if (candidateBlocks.length === 0) {
  // Last resort: if the response says "no follow-up needed" or similar, treat as zero proposals (not an error)
  const noFollowupPatterns = /no follow[- ]?up|no additional|none needed|no tasks? (needed|required|necessary)/i;
  if (noFollowupPatterns.test(markdown)) {
    console.log(`[propose-followups] LLM indicated no follow-ups needed for ${taskId}. Writing empty proposals.`);
    // Write empty proposals array and mark task as done
    const _autoRoot = automationRoot();
    const _proposalsDir = path.join(_autoRoot, "state", "proposals");
    fs.mkdirSync(_proposalsDir, { recursive: true });
    const emptyProposal = {
      proposal_id: `FP-${taskId}-none`,
      parent_task_id: taskId,
      followups: [],
      raw_markdown: markdown,
      created_at: new Date().toISOString()
    };
    fs.writeFileSync(path.join(_proposalsDir, `FP-${taskId}-none.json`), JSON.stringify(emptyProposal, null, 2));
    // Update task state to FOLLOWUPS_PROPOSED
    const _taskFile = path.join(_autoRoot, "state", "tasks", `${taskId}.json`);
    const tfDone = JSON.parse(fs.readFileSync(_taskFile, "utf8"));
    if (tfDone) {
      tfDone.state = "FOLLOWUPS_PROPOSED";
      tfDone.updated_at = new Date().toISOString();
      fs.writeFileSync(_taskFile, JSON.stringify(tfDone, null, 2));
    }
    console.log(`[propose-followups] ${taskId}: no follow-ups → FOLLOWUPS_PROPOSED`);
    process.exit(0);
  }

  const errMsg = `No follow-up blocks (### F-N) found in LLM output (tried 6 format variants). This usually means the response is malformed, truncated, or the prompt was pasted instead of the response. Check: ${followupPath}`;
  console.error("[propose-followups] FATAL: " + errMsg);
  throw new Error(errMsg);
}

// Deduplicate: if the same F-N appears multiple times (e.g. in "Candidate" AND "Recommended"),
// keep only the first occurrence (which has the structured fields).
const seenIds = new Set();
const uniqueBlocks = candidateBlocks.filter(m => {
  const id = m[1];
  if (seenIds.has(id)) return false;
  seenIds.add(id);
  return true;
});

const proposals = uniqueBlocks.map((m, idx) => {
  const id = m[1];
  const body = m[2];

  function field(name) {
    const patterns = [
      new RegExp(`-\\s+${name}:\\s*(.*)`, "i"),
      new RegExp(`[•\\*]\\s*${name}:\\s*(.*)`, "i"),  // Unicode bullet or asterisk
      new RegExp(`\\*\\*${name}\\*\\*:\\s*(.*)`, "i"),
      new RegExp(`${name}:\\s*(.*)`, "i")
    ];
    for (const r of patterns) {
      const mm = body.match(r);
      if (mm && mm[1].trim()) return mm[1].trim();
    }
    return "";
  }

  // Robust title extraction: try field() first, then fall back to first non-empty text line after heading
  let title = field("title");
  if (!title) {
    // Try: first line that has meaningful text (not just a field label like "- lane_type:")
    const lines = body.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip empty lines, field lines (- key: value or **key**: value), and markdown artifacts
      if (!trimmed) continue;
      if (/^-\s+\w[\w_]*\s*:/.test(trimmed)) continue;
      if (/^\*\*\w/.test(trimmed)) continue;
      if (/^```/.test(trimmed)) continue;
      // Use this as the title (strip leading - or * if present)
      title = trimmed.replace(/^[-*]\s*/, "").trim();
      if (title) break;
    }
  }
  // Final fallback: use the F-N id itself
  if (!title) title = `Follow-up ${id}`;

  // Robust should_spawn_now: also check for "yes" embedded in longer text
  let shouldSpawn = parseTruthy(field("should_spawn_now"));
  if (!shouldSpawn && !field("should_spawn_now")) {
    // If field was empty, check if there's a "spawn" field with yes/true
    const spawnField = field("spawn");
    if (spawnField) shouldSpawn = parseTruthy(spawnField);
  }

  return {
    proposal_id: `${taskId}-${id}`,
    parent_task_id: taskId,
    title,
    lane_type: field("lane_type") || "feature-lane",
    executor: field("executor") || "codex",
    rationale: field("rationale"),
    smallest_safe_scope: field("smallest_safe_scope"),
    depends_on: field("depends_on"),
    priority: field("priority") || "normal",
    should_spawn_now: shouldSpawn,
    created_at: new Date().toISOString(),
    index: idx + 1
  };
});

for (const proposal of proposals) {
  const file = path.join(proposalDir, `${proposal.proposal_id}.json`);
  fs.writeFileSync(file, JSON.stringify(proposal, null, 2));
}

// Extract decision blockers from follow-up markdown
const decisionBlocks = [...markdown.matchAll(/###\s+(DB-\d+)\s*\r?\n([\s\S]*?)(?=\r?\n###\s+DB-\d+|\r?\n##\s|$)/g)];

const decisionProposals = [];
for (const m of decisionBlocks) {
  const body = m[2];
  function dfield(name) {
    const patterns = [
      new RegExp(`-\\s+${name}:\\s*(.*)`, "i"),
      new RegExp(`\\*\\*${name}\\*\\*:\\s*(.*)`, "i"),
      new RegExp(`${name}:\\s*(.*)`, "i")
    ];
    for (const r of patterns) {
      const mm = body.match(r);
      if (mm && mm[1].trim()) return mm[1].trim();
    }
    return "";
  }
  try {
    const dp = createDecisionProposal({
      topic: dfield("topic"),
      rationale: dfield("rationale"),
      blocking_scope: dfield("blocking_scope") || "task",
      options: (dfield("options") || "").split(",").map(o => o.trim()).filter(Boolean),
      recommended_default: dfield("recommended_default"),
      urgency: dfield("urgency") || "medium",
      source_task_id: taskId,
      source_goal_id: task.parent_goal_id || ""
    });
    decisionProposals.push(dp);
  } catch (e) {
    console.error(`Failed to create decision proposal: ${e.message}`);
  }
}

task.followup_path = followupPath;
if (decisionProposals.length > 0) {
  task.open_decisions = decisionProposals.map(dp => dp.decision_proposal_id);
}
saveTask(taskId, task);

console.log(`Wrote ${followupPath}`);
console.log(`Created ${proposals.length} proposal file(s)`);
if (decisionProposals.length > 0) {
  console.log(`Created ${decisionProposals.length} decision proposal(s)`);
}
