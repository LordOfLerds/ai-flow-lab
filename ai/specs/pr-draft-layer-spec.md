# PR-Draft Layer + End-to-End Test — Architecture Spec from ChatGPT

Architectural task: build the PR-draft layer and define the first end-to-end system test.

## Context
- Goal planning, task orchestration, follow-up generation, and decision gates now exist.
- Dashboard integration for decisions exists.
- The next bottleneck is the handoff from completed task to reviewable GitHub PR.
- Human merge must remain the gate.

## Mission
1. Build a PR-draft generation layer.
2. Make it compatible with tasks, goals, follow-ups, and decisions.
3. Define one canonical end-to-end test path for the whole system.

## Required outcomes

### A. PR draft artifacts
Add:
- `ai/pr/`
- `automation/state/pr_drafts/`

For a completed task, generate:
- `ai/pr/T-XXXX_pr_draft.md`
- `automation/state/pr_drafts/T-XXXX.json`

The PR draft must include:
- task_id
- parent_goal_id if present
- parent_task_id if present
- linked decisions
- branch_name
- suggested base branch
- title
- summary
- validation
- risks
- non-goals
- follow-up notes

### B. PR draft generator
Implement a script, e.g.: `generate-pr-draft.mjs`

It should:
- read the task JSON
- read spec/review/brief/result/followup artifacts
- include decisions if relevant
- produce a review-ready draft without creating a merge

### C. Optional GitHub draft creation
If feasible and clean, add a separate script for creating a GitHub Draft PR.
Keep it separate from artifact generation.
Do not make it mandatory for the core system.

### D. State integration
Add a clean way to represent: `PR_DRAFTED`
without overcomplicating the state machine

### E. Dashboard integration
Show:
- PR drafts ready
- which completed tasks do not yet have drafts
- linked decisions and follow-up references

### F. End-to-end architecture test
Add one documented reference flow:
Goal -> decision gate -> decision resolution -> task execution -> finalize -> follow-up proposal -> PR draft

This should be represented as:
- one markdown architecture note
- one reproducible CLI walkthrough

## Non-goals
- no auto-merge
- no auto-approval
- no full GitHub workflow refactor
- no broad dashboard redesign
- no speculative new state explosion

## Output format back to ChatGPT
1. What changed
2. How PR draft generation works
3. How the end-to-end test works
4. What remains risky
5. What should come after this
