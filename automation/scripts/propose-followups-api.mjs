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
If no follow-up task is needed, say so explicitly.`;

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

const markdown = await callOpenAI({ instructions, input });

writeRepoFile(followupPath, markdown);

const proposalDir = path.join(process.cwd(), "state", "proposals");
fs.mkdirSync(proposalDir, { recursive: true });

const candidateBlocks = [...markdown.matchAll(/###\s+(F-\d+)\n([\s\S]*?)(?=\n###\s+F-\d+|\n##\s|$)/g)];

const proposals = candidateBlocks.map((m, idx) => {
  const id = m[1];
  const body = m[2];

  function field(name) {
    const r = new RegExp(`- ${name}:\\s*(.*)`);
    const mm = body.match(r);
    return mm ? mm[1].trim() : "";
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
    should_spawn_now: /^true$/i.test(field("should_spawn_now")),
    created_at: new Date().toISOString(),
    index: idx + 1
  };
});

for (const proposal of proposals) {
  const file = path.join(proposalDir, `${proposal.proposal_id}.json`);
  fs.writeFileSync(file, JSON.stringify(proposal, null, 2));
}

task.followup_path = followupPath;
saveTask(taskId, task);

console.log(`Wrote ${followupPath}`);
console.log(`Created ${proposals.length} proposal file(s)`);
