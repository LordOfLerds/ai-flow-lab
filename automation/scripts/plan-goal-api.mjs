import fs from "node:fs";
import path from "node:path";
import {
  readRepoFile,
  writeRepoFile,
  callOpenAI,
  repoRoot,
  automationRoot
} from "./_llm-utils.mjs";
import { createProposal as createDecisionProposal } from "./decision-gate.mjs";

const [goalId] = process.argv.slice(2);

if (!goalId) {
  console.error("Usage: node scripts/plan-goal-api.mjs <GOAL_ID>");
  process.exit(1);
}

const root = repoRoot();

const goalJsonPath = path.join(automationRoot(), "state", "goals", `${goalId}.json`);
const goalMdRel = `goals/${goalId}.md`;
const goalMdAbs = path.join(root, goalMdRel);

if (!fs.existsSync(goalJsonPath)) {
  console.error(`Goal JSON missing: ${goalJsonPath}`);
  process.exit(1);
}
if (!fs.existsSync(goalMdAbs)) {
  console.error(`Goal markdown missing: ${goalMdAbs}`);
  process.exit(1);
}

const goal = JSON.parse(fs.readFileSync(goalJsonPath, "utf8"));
const goalMd = fs.readFileSync(goalMdAbs, "utf8");

const decisionsDir = path.join(root, "decisions");
let decisionsText = "";
if (fs.existsSync(decisionsDir)) {
  const files = fs.readdirSync(decisionsDir).filter((f) => f.endsWith(".md"));
  decisionsText = files
    .map((f) => `\n[decisions/${f}]\n${fs.readFileSync(path.join(decisionsDir, f), "utf8")}`)
    .join("\n");
}

const instructions = `You are the lead architect.
Return ONLY markdown.
Do not implement code.
Break the goal into small, reviewable patch tasks.
Prefer safe sequencing over broad refactors.
If a decision is missing, surface it explicitly instead of inventing it.

CRITICAL: Distinguish between:
1. Spawnable tasks — safe preparatory work that can proceed without owner input
2. Decision blockers — questions that require owner/maintainer input before implementation

Important formatting rule:
For each candidate task, set:
- should_spawn_now: true
or
- should_spawn_now: false

Do not use yes/no for that field.

In "Decision blockers", use this format per blocker:

### DB-<n>
- topic:
- rationale:
- blocking_scope: task | goal | system
- options: option A, option B, option C
- recommended_default:
- urgency: high | medium | low`;

const input = `
Goal metadata:
- goal_id: ${goal.goal_id}
- title: ${goal.title}
- priority: ${goal.priority}

Write markdown with exactly these sections:
- # ${goalId} Plan
- ## Goal summary
- ## Constraints
- ## Candidate initial tasks
- ## Recommended first task
- ## Decision blockers
- ## Notes for planner

In "Candidate initial tasks", use this repeated format:

### P-<n>
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

[AGENTS.md]
${readRepoFile("AGENTS.md")}

Goal:
[${goalMdRel}]
${goalMd}

Decisions:
${decisionsText || "(none)"}
`;

const markdown = await callOpenAI({ instructions, input, taskId: goalId, step: "plan-goal" });

const planRel = `goals/${goalId}_plan.md`;
writeRepoFile(planRel, markdown);

const proposalDir = path.join(automationRoot(), "state", "proposals");
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

// Tolerant regex: handles \r\n, extra whitespace after heading, optional colon after P-N
const candidateBlocks = [...markdown.matchAll(/###\s+(P-\d+)\s*\r?\n([\s\S]*?)(?=\r?\n###\s+P-\d+|\r?\n##\s|$)/g)];

if (candidateBlocks.length === 0) {
  console.warn("WARNING: No candidate task blocks (### P-N) found in plan output.");
  console.warn("This may indicate an LLM format issue. Check the plan at: goals/" + goalId + "_plan.md");
}

const proposals = candidateBlocks.map((m, idx) => {
  const id = m[1];
  const body = m[2];

  // Tolerant field parser: handles "- field:", "- Field:", "**field**:", variations
  function field(name) {
    const patterns = [
      new RegExp(`-\\s+${name}:\\s*(.*)`, "i"),
      new RegExp(`\\*\\*${name}\\*\\*:\\s*(.*)`, "i"),
      new RegExp(`${name}:\\s*(.*)`, "i")
    ];
    for (const r of patterns) {
      const mm = body.match(r);
      if (mm && mm[1].trim()) return mm[1].trim().replace(/^\*+\s*/, '').replace(/\*+$/, '');
    }
    return "";
  }

  return {
    proposal_id: `${goalId}-${id}`,
    parent_goal_id: goalId,
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

// Extract decision blockers from the plan
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
      blocking_scope: dfield("blocking_scope") || "goal",
      options: (dfield("options") || "").split(",").map(o => o.trim()).filter(Boolean),
      recommended_default: dfield("recommended_default"),
      urgency: dfield("urgency") || "medium",
      source_goal_id: goalId
    });
    decisionProposals.push(dp);
  } catch (e) {
    console.error(`Failed to create decision proposal: ${e.message}`);
  }
}

// Check if any proposals are blocked on open decisions
const hasBlockingDecisions = decisionProposals.some(dp => dp.urgency === "high");
goal.state = hasBlockingDecisions ? "BLOCKED_ON_DECISION" : "PLANNED";
goal.updated_at = new Date().toISOString();
if (decisionProposals.length > 0) {
  goal.open_decisions = decisionProposals.map(dp => dp.decision_proposal_id);
}
fs.writeFileSync(goalJsonPath, JSON.stringify(goal, null, 2));

console.log(`Wrote goals/${goalId}_plan.md`);
console.log(`Created ${proposals.length} proposal file(s)`);
if (decisionProposals.length > 0) {
  console.log(`Created ${decisionProposals.length} decision proposal(s)`);
}
