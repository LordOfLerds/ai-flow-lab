import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import {
  loadTask,
  saveTask,
  readRepoFile,
  writeRepoFile,
  callOpenAI,
  repoRoot
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

const resultText = readTaskArtifact(resultRel);
const specText = task.spec_path ? readTaskArtifact(task.spec_path) : "";
const reviewText = task.review_path ? readTaskArtifact(task.review_path) : "";
const briefText = task.brief_path ? readTaskArtifact(task.brief_path) : "";

let changedFiles = "";
try {
  changedFiles = execSync(
    `git -C "${root}" diff --name-only main...${task.branch_name}`,
    { encoding: "utf8" }
  );
} catch {
  changedFiles = "";
}

const instructions = `You are the lead architect continuing a patch-based development plan.
Return ONLY markdown.
Do not implement code.
Do not propose broad refactors unless clearly necessary.
Prefer small, reviewable follow-up tasks.
If no follow-up task is needed, say so explicitly.

CRITICAL: Distinguish between:
1. Spawnable follow-up tasks — safe work that can proceed without owner input
2. Decision blockers — questions that require owner/maintainer decision before further implementation

If any follow-up requires an owner decision, emit it in the "Decision blockers" section using:

### DB-<n>
- topic:
- rationale:
- blocking_scope: task | goal | system
- options: option A, option B, option C
- recommended_default:
- urgency: high | medium | low`;

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

Truth docs:

[docs/DOMAIN_MODEL.md]
${readRepoFile("docs/DOMAIN_MODEL.md")}

[docs/INVARIANTS.md]
${readRepoFile("docs/INVARIANTS.md")}

[docs/ARCHITECTURE.md]
${readRepoFile("docs/ARCHITECTURE.md")}

Task spec:
${specText}

Task review:
${reviewText}

Implementation brief:
${briefText}

Executor result report:
${resultText}

Changed files:
${changedFiles}
`;

const markdown = await callOpenAI({ instructions, input, taskId, step: "propose-followups" });

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

// Tolerant regex: handles \r\n, extra whitespace after heading
const candidateBlocks = [...markdown.matchAll(/###\s+(F-\d+)\s*\r?\n([\s\S]*?)(?=\r?\n###\s+F-\d+|\r?\n##\s|$)/g)];

if (candidateBlocks.length === 0) {
  console.warn("WARNING: No follow-up blocks (### F-N) found in output.");
  console.warn("This may indicate an LLM format issue. Check: " + followupPath);
}

const proposals = candidateBlocks.map((m, idx) => {
  const id = m[1];
  const body = m[2];

  function field(name) {
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

  return {
    proposal_id: `${taskId}-${id}`,
    parent_task_id: taskId,
    title: field("title"),
    lane_type: field("lane_type") || "feature-lane",
    executor: field("executor") || "codex",
    rationale: field("rationale"),
    smallest_safe_scope: field("smallest_safe_scope"),
    depends_on: field("depends_on"),
    priority: field("priority") || "normal",
    should_spawn_now: parseTruthy(field("should_spawn_now")),
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
