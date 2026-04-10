#!/usr/bin/env node
/**
 * decision-gate.mjs — First-class decision proposal and resolution layer.
 *
 * Usage:
 *   node scripts/decision-gate.mjs propose <topic> [--source-task T-XXXX] [--source-goal G-XXXX] [--urgency high|medium|low]
 *   node scripts/decision-gate.mjs resolve <decision_proposal_id> <selected_option> [--rationale "..."]
 *   node scripts/decision-gate.mjs list [--status open|resolved|all]
 *   node scripts/decision-gate.mjs check <task_id>   -- checks if task is blocked on unresolved decisions
 */

import fs from "node:fs";
import path from "node:path";
import { automationRoot } from "./_llm-utils.mjs";

// --- Paths ---

function proposalsDir() {
  const dir = path.join(automationRoot(), "state", "decision_proposals");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function decisionsDir() {
  const dir = path.join(automationRoot(), "state", "decisions");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function decisionsDocsDir() {
  const dir = path.join(automationRoot(), "..", "docs", "decisions");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// --- ID generation ---

function nextProposalId() {
  const files = fs.readdirSync(proposalsDir()).filter(f => f.endsWith(".json"));
  const nums = files.map(f => parseInt(f.match(/DP-(\d+)/)?.[1] || "0", 10)).filter(n => n > 0);
  const next = nums.length === 0 ? 1 : Math.max(...nums) + 1;
  return `DP-${String(next).padStart(4, "0")}`;
}

function nextDecisionId() {
  const files = fs.readdirSync(decisionsDir()).filter(f => f.endsWith(".json"));
  const nums = files.map(f => parseInt(f.match(/DEC-(\d+)/)?.[1] || "0", 10)).filter(n => n > 0);
  const next = nums.length === 0 ? 1 : Math.max(...nums) + 1;
  return `DEC-${String(next).padStart(4, "0")}`;
}

// --- CRUD ---

export function createProposal({
  topic,
  rationale = "",
  blocking_scope = "task",
  options = [],
  recommended_default = "",
  urgency = "medium",
  source_task_id = "",
  source_goal_id = ""
}) {
  // --- Dedup: skip if an open proposal with the same topic already exists ---
  const existing = fs.readdirSync(proposalsDir()).filter(f => f.endsWith(".json"));
  for (const f of existing) {
    try {
      const p = JSON.parse(fs.readFileSync(path.join(proposalsDir(), f), "utf8"));
      if (p.topic === topic && p.status === "open") {
        console.log(`Skipped duplicate proposal — open "${topic}" already exists as ${p.decision_proposal_id}`);
        return p;
      }
    } catch { /* ignore parse errors */ }
  }
  const id = nextProposalId();
  const proposal = {
    decision_proposal_id: id,
    source_task_id,
    source_goal_id,
    topic,
    rationale,
    blocking_scope,
    options,
    recommended_default,
    urgency,
    status: "open",
    created_at: new Date().toISOString()
  };
  const file = path.join(proposalsDir(), `${id}.json`);
  fs.writeFileSync(file, JSON.stringify(proposal, null, 2));
  console.log(`Created decision proposal ${id}: ${topic}`);
  return proposal;
}

export function resolveProposal(proposalId, selectedOption, rationale = "") {
  // Load proposal
  const propFile = path.join(proposalsDir(), `${proposalId}.json`);
  if (!fs.existsSync(propFile)) {
    throw new Error(`Decision proposal ${proposalId} not found`);
  }
  const proposal = JSON.parse(fs.readFileSync(propFile, "utf8"));

  // Update proposal status
  proposal.status = "resolved";
  proposal.resolved_at = new Date().toISOString();
  fs.writeFileSync(propFile, JSON.stringify(proposal, null, 2));

  // Create decision record
  const decId = nextDecisionId();
  const decision = {
    decision_id: decId,
    decision_proposal_id: proposalId,
    topic: proposal.topic,
    status: "accepted",
    selected_option: selectedOption,
    rationale: rationale || `Resolved from proposal ${proposalId}`,
    scope: proposal.blocking_scope,
    implications: "",
    linked_tasks: [proposal.source_task_id].filter(Boolean),
    linked_goals: [proposal.source_goal_id].filter(Boolean),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  const decFile = path.join(decisionsDir(), `${decId}.json`);
  fs.writeFileSync(decFile, JSON.stringify(decision, null, 2));

  // Write decision markdown
  const mdContent = `# ${decId}: ${proposal.topic}\n\n` +
    `## Status\nACCEPTED\n\n` +
    `## Context\n${proposal.rationale}\n\n` +
    `## Decision\n${selectedOption}\n\n` +
    `## Rationale\n${rationale || "Owner decision."}\n\n` +
    `## Scope\n${proposal.blocking_scope}\n\n` +
    `## Linked\n- Proposal: ${proposalId}\n` +
    (proposal.source_task_id ? `- Task: ${proposal.source_task_id}\n` : "") +
    (proposal.source_goal_id ? `- Goal: ${proposal.source_goal_id}\n` : "") +
    `\n## Date\n${new Date().toISOString()}\n`;

  fs.writeFileSync(path.join(decisionsDocsDir(), `${decId}.md`), mdContent);

  console.log(`Resolved ${proposalId} → ${decId}: ${selectedOption}`);
  return decision;
}

export function listProposals(statusFilter = "all") {
  const dir = proposalsDir();
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));
  const proposals = files.map(f => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
  if (statusFilter === "all") return proposals;
  return proposals.filter(p => p.status === statusFilter);
}

export function listDecisions() {
  const dir = decisionsDir();
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));
  return files.map(f => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
}

export function checkTaskBlocked(taskId) {
  const proposals = listProposals("open");
  return proposals.filter(p => p.source_task_id === taskId);
}

export function checkGoalBlocked(goalId) {
  const proposals = listProposals("open");
  return proposals.filter(p => p.source_goal_id === goalId);
}

// --- CLI (only when run directly) ---

const isMainModule = process.argv[1] && (
  process.argv[1].endsWith("decision-gate.mjs") ||
  process.argv[1].endsWith("decision-gate")
);

if (isMainModule) {

const [,, command, ...args] = process.argv;

if (command === "propose") {
  const topic = args[0];
  if (!topic) { console.error("Usage: decision-gate.mjs propose <topic> [options]"); process.exit(1); }
  const opts = {};
  for (let i = 1; i < args.length; i += 2) {
    const key = args[i]?.replace(/^--/, "");
    const val = args[i + 1];
    if (key && val) opts[key.replace(/-/g, "_")] = val;
  }
  if (opts.options) opts.options = opts.options.split(",");
  createProposal({ topic, ...opts });
}
else if (command === "resolve") {
  const [proposalId, ...rest] = args;
  const selectedOption = rest.filter(r => !r.startsWith("--")).join(" ");
  let rationale = "";
  const ratIdx = rest.indexOf("--rationale");
  if (ratIdx >= 0) rationale = rest[ratIdx + 1] || "";
  resolveProposal(proposalId, selectedOption, rationale);
}
else if (command === "list") {
  const statusFilter = args.includes("--status") ? args[args.indexOf("--status") + 1] : "all";
  const proposals = listProposals(statusFilter);
  console.log(JSON.stringify(proposals, null, 2));
}
else if (command === "check") {
  const taskId = args[0];
  if (!taskId) { console.error("Usage: decision-gate.mjs check <task_id>"); process.exit(1); }
  const blocked = checkTaskBlocked(taskId);
  if (blocked.length > 0) {
    console.log(`Task ${taskId} is BLOCKED on ${blocked.length} open decision(s):`);
    blocked.forEach(b => console.log(`  - ${b.decision_proposal_id}: ${b.topic}`));
    process.exit(1);
  } else {
    console.log(`Task ${taskId} has no blocking decisions.`);
  }
}
else if (command) {
  console.error(`Unknown command: ${command}`);
  process.exit(1);
}

} // end isMainModule guard
