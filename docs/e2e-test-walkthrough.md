---
type: document
created: 2026-04-10
tags: [ai-flow-lab, document]
---

# End-to-End Test Walkthrough

Reproducible CLI walkthrough for the AI Flow Lab reference flow.
Run from the `automation/` directory.

## Prerequisites
- Node.js 18+
- `npm install` completed in `automation/`
- `.env` configured (LLM_MODE=app or API keys set)

## Step 1: Create a Goal

```bash
node scripts/start-goal.mjs "E2E Test: Add greeting message to README" \
  --description "Add a friendly greeting to the project README as an end-to-end system test"
```

Expected: `state/goals/G-XXXX.json` created with state=NEW

## Step 2: Plan the Goal

```bash
node scripts/plan-goal-api.mjs G-XXXX
```

Expected:
- Goal state → PLANNED
- Task proposals created in `state/proposals/`
- If decision blockers found: `state/decision_proposals/DP-XXXX.json` created, goal → BLOCKED_ON_DECISION

## Step 3: Resolve Decisions (if any)

Via CLI:
```bash
node scripts/decision-gate.mjs list --status open
node scripts/decision-gate.mjs resolve DP-XXXX "Option A" --rationale "Simplest approach"
```

Or via Dashboard:
1. Open http://localhost:3847
2. Find the open decision in "Decision Gates" section
3. Click the preferred option button
4. Add rationale (optional)

Expected: Decision resolved → `state/decisions/DEC-XXXX.json` + `docs/decisions/DEC-XXXX.md`

## Step 4: Spawn a Task from the Plan

```bash
node scripts/spawn-from-goal-proposal.mjs G-XXXX-P-1
```

Expected: `state/tasks/T-XXXX.json` created with state=NEW

## Step 5: Run the Task Pipeline

### 5a. Architect (spec generation)
```bash
node scripts/architect-task-api.mjs T-XXXX
```
Expected: `ai/specs/T-XXXX_spec.md`, task state → ARCHITECTED

### 5b. Critique (review)
```bash
node scripts/critique-task-api.mjs T-XXXX
```
Expected: `ai/reviews/T-XXXX_*_review.md`, task state → CRITIQUED

### 5c. Synthesize (implementation brief)
```bash
node scripts/synthesize-task-api.mjs T-XXXX
```
Expected: `ai/briefs/T-XXXX_implementation.md`, task state → SYNTHESIZED

### 5d. Execute
```bash
node scripts/run-task.mjs T-XXXX
```
Expected: `ai/results/T-XXXX_executor_report.md`, task state → IMPLEMENTING

## Step 6: Finalize the Task

```bash
node scripts/finalize-task.mjs T-XXXX
```

Expected:
- Follow-ups proposed: `ai/followups/T-XXXX_followups.md`
- PR draft generated: `ai/pr/T-XXXX_pr_draft.md` + `state/pr_drafts/T-XXXX.json`
- Task state → PR_DRAFTED (via FOLLOWUPS_PROPOSED)

## Step 7: Verify PR Draft

```bash
cat ../ai/pr/T-XXXX_pr_draft.md
cat state/pr_drafts/T-XXXX.json
```

Expected: PR draft contains:
- task_id, parent_goal_id
- branch info
- linked decisions (if any)
- validation checklist
- risks and follow-up notes

## Step 8: Verify on Dashboard

Open http://localhost:3847 and confirm:
- Goal shows correct state
- Task appears in kanban with PR_DRAFTED state
- PR Drafts section shows the draft with validation badges
- Decision Gates section shows resolved decisions (if any)

## Quick Smoke Test (existing task)

For a quick verification without running the full pipeline:

```bash
# Generate PR draft for an already-completed task
node scripts/generate-pr-draft.mjs T-0100

# Verify outputs
cat ../ai/pr/T-0100_pr_draft.md | head -20
cat state/pr_drafts/T-0100.json | head -10

# Start dashboard and check
node scripts/serve-dashboard.mjs &
# Open http://localhost:3847
```

## Validation Checklist

- [ ] Goal created and planned
- [ ] Decisions proposed and resolved (if applicable)
- [ ] Task spawned from goal proposal
- [ ] Spec, review, brief generated
- [ ] Task executed with result
- [ ] Follow-ups proposed
- [ ] PR draft generated
- [ ] Dashboard shows all states correctly
- [ ] PR draft includes linked decisions
- [ ] No auto-merge or auto-approval occurred
