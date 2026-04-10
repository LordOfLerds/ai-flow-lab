#!/usr/bin/env node
/**
 * generate-pr-draft.mjs — PR Draft Generator
 *
 * Reads a completed task's artifacts (JSON, spec, review, brief, executor report,
 * follow-ups, linked decisions) and produces:
 *   1. ai/pr/T-XXXX_pr_draft.md       — human-readable PR draft
 *   2. automation/state/pr_drafts/T-XXXX.json — machine-readable PR draft state
 *
 * Usage:
 *   node scripts/generate-pr-draft.mjs <TASK_ID> [--base-branch main]
 *
 * Non-goals: no auto-merge, no auto-rebase, no auto-delete-branch.
 */

import fs from "node:fs";
import path from "node:path";
import { loadTask, saveTask, readRepoFile, writeRepoFile, automationRoot, repoRoot } from "./_llm-utils.mjs";
import { listDecisions } from "./decision-gate.mjs";

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const taskId = args.find(a => !a.startsWith("--"));
const baseBranchArg = args.includes("--base-branch")
  ? args[args.indexOf("--base-branch") + 1]
  : null;

if (!taskId) {
  console.error("Usage: node scripts/generate-pr-draft.mjs <TASK_ID> [--base-branch main]");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readArtifact(relPath) {
  if (!relPath) return "";
  return readRepoFile(relPath);
}

function extractSection(md, heading) {
  if (!md) return "";
  const re = new RegExp(`^#+\\s*${heading}[\\s\\S]*?(?=\\n#+\\s|$)`, "im");
  const match = md.match(re);
  return match ? match[0].trim() : "";
}

function summarize(text, maxLen = 300) {
  if (!text) return "(none)";
  const clean = text.replace(/^#+.*$/gm, "").trim();
  return clean.length > maxLen ? clean.slice(0, maxLen) + "…" : clean;
}

function inferBaseBranch(task) {
  if (baseBranchArg) return baseBranchArg;
  // Convention: feature branches merge to main or develop
  if (task.branch_name?.startsWith("feature/")) return "main";
  if (task.branch_name?.startsWith("bug/")) return "main";
  if (task.branch_name?.startsWith("danger/")) return "main";
  return "main";
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const task = loadTask(taskId);

// Guard: only generate PR drafts for tasks that are far enough along
const allowedStates = ["MERGED", "FOLLOWUPS_PROPOSED", "PR_DRAFTED", "REVIEWED"];
const allowedRuntimeStatuses = ["DONE", "COMPLETED"];
if (!allowedStates.includes(task.state) && !allowedRuntimeStatuses.includes(task.runtime_status)) {
  console.error(`Task ${taskId} is in state=${task.state} / runtime=${task.runtime_status}.`);
  console.error(`PR drafts should only be generated for completed/finalized tasks.`);
  process.exit(1);
}

// Read all artifacts
const spec = readArtifact(task.spec_path);
const review = readArtifact(task.review_path);
const brief = readArtifact(task.brief_path);
const result = readArtifact(task.result_path);
const followups = readArtifact(task.followup_path);

// Linked decisions
let linkedDecisions = [];
try {
  const allDecisions = listDecisions();
  linkedDecisions = allDecisions.filter(d =>
    d.linked_tasks?.includes(taskId) ||
    d.source_task_id === taskId ||
    (task.parent_goal_id && d.linked_goals?.includes(task.parent_goal_id))
  );
} catch {
  // Decision-gate module may not have data yet
}

// Also check task.open_decisions
if (task.open_decisions?.length) {
  try {
    const { listProposals } = await import("./decision-gate.mjs");
    const proposals = listProposals("resolved");
    for (const dp of proposals) {
      if (task.open_decisions.includes(dp.decision_proposal_id)) {
        // Already captured via linkedDecisions or add context
      }
    }
  } catch { /* ignore */ }
}

const baseBranch = inferBaseBranch(task);
const headBranch = task.branch_name || `feature/${taskId}`;

// Extract useful info from artifacts
const specSummary = summarize(spec);
const reviewHighlights = summarize(review);
const briefSummary = summarize(brief);
const resultSummary = summarize(result);
const followupSummary = summarize(followups);

// Build risks from review
const risksSection = extractSection(review, "Risks?|Concerns?|Issues?|Blockers?") || "(none identified in review)";
const nonGoalsSection = extractSection(spec, "Non.?goals?|Out of scope") || "(see spec)";

// Generate title
const title = `[${taskId}] ${task.title}`;

// Build PR body
const prBody = `# ${title}

## Summary
${task.title}

**Task ID**: ${taskId}
**Parent Goal**: ${task.parent_goal_id || "none"}
**Parent Task**: ${task.parent_task_id || "none"}
**Lane**: ${task.lane_type || "feature-lane"}
**Executor**: ${task.executor || "unknown"}

## What Changed
${resultSummary}

## Spec Summary
${specSummary}

## Review Highlights
${reviewHighlights}

## Implementation Brief
${briefSummary}

## Linked Decisions
${linkedDecisions.length > 0
  ? linkedDecisions.map(d => `- **${d.decision_id || d.decision_proposal_id}**: ${d.topic} → ${d.selected_option || d.status}`).join("\n")
  : "(none)"}

## Validation
- [ ] Spec written and reviewed
- [ ] Implementation brief synthesized
- [ ] Executor report completed
- [ ] Follow-ups proposed
${linkedDecisions.length > 0 ? "- [ ] All linked decisions resolved" : ""}
- [ ] Tests pass (if applicable)
- [ ] No regressions in existing functionality

## Risks
${summarize(risksSection, 500)}

## Non-Goals
${summarize(nonGoalsSection, 300)}

## Follow-Up Notes
${followupSummary}

---
**Branch**: \`${headBranch}\` → \`${baseBranch}\`
**Generated**: ${new Date().toISOString()}
**Generator**: generate-pr-draft.mjs
`;

// Build JSON state
const prDraftJson = {
  task_id: taskId,
  parent_goal_id: task.parent_goal_id || null,
  parent_task_id: task.parent_task_id || null,
  linked_decisions: linkedDecisions.map(d => d.decision_id || d.decision_proposal_id),
  branch_name: headBranch,
  base_branch: baseBranch,
  title,
  summary: task.title,
  validation: {
    spec_exists: !!spec,
    review_exists: !!review,
    brief_exists: !!brief,
    result_exists: !!result,
    followups_exist: !!followups,
    all_decisions_resolved: linkedDecisions.every(d => d.status === "resolved" || d.status === "accepted")
  },
  risks: risksSection,
  non_goals: nonGoalsSection,
  followup_notes: followupSummary,
  status: "draft",
  created_at: new Date().toISOString()
};

// Write artifacts
const mdPath = `ai/pr/${taskId}_pr_draft.md`;
writeRepoFile(mdPath, prBody);
console.log(`✓ PR draft markdown: ${mdPath}`);

const jsonDir = path.join(automationRoot(), "state", "pr_drafts");
fs.mkdirSync(jsonDir, { recursive: true });
const jsonPath = path.join(jsonDir, `${taskId}.json`);
fs.writeFileSync(jsonPath, JSON.stringify(prDraftJson, null, 2));
console.log(`✓ PR draft JSON: automation/state/pr_drafts/${taskId}.json`);

// Update task state to PR_DRAFTED (if not already past that)
if (!["PR_DRAFTED", "MERGED", "REVIEWED"].includes(task.state)) {
  task.state = "PR_DRAFTED";
  task.pr_draft_path = mdPath;
  saveTask(taskId, task);
  console.log(`✓ Task ${taskId} state → PR_DRAFTED`);
} else {
  // Just record the path
  task.pr_draft_path = mdPath;
  saveTask(taskId, task);
  console.log(`✓ Task ${taskId} pr_draft_path updated (state unchanged: ${task.state})`);
}

console.log(`\nPR draft ready for review. Human merge remains the gate.`);
