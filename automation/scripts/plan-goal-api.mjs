import fs from "node:fs";
import path from "node:path";
import {
  readRepoFile,
  writeRepoFile,
  callOpenAI,
  repoRoot
} from "./_llm-utils.mjs";

const [goalId] = process.argv.slice(2);

if (!goalId) {
  console.error("Usage: node scripts/plan-goal-api.mjs <GOAL_ID>");
  process.exit(1);
}

const automationRoot = process.cwd();
const root = repoRoot();

const goalJsonPath = path.join(automationRoot, "state", "goals", `${goalId}.json`);
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

Important formatting rule:
For each candidate task, set:
- should_spawn_now: true
or
- should_spawn_now: false

Do not use yes/no for that field.`;

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

const markdown = await callOpenAI({ instructions, input });

const planRel = `goals/${goalId}_plan.md`;
writeRepoFile(planRel, markdown);

const proposalDir = path.join(automationRoot, "state", "proposals");
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

const candidateBlocks = [...markdown.matchAll(/###\s+(P-\d+)\n([\s\S]*?)(?=\n###\s+P-\d+|\n##\s|$)/g)];

const proposals = candidateBlocks.map((m, idx) => {
  const id = m[1];
  const body = m[2];

  function field(name) {
    const r = new RegExp(`- ${name}:\\s*(.*)`);
    const mm = body.match(r);
    return mm ? mm[1].trim() : "";
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

goal.state = "PLANNED";
goal.updated_at = new Date().toISOString();
fs.writeFileSync(goalJsonPath, JSON.stringify(goal, null, 2));

console.log(`Wrote goals/${goalId}_plan.md`);
console.log(`Created ${proposals.length} proposal file(s)`);
