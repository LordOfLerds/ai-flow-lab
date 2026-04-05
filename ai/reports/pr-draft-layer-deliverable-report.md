# PR-Draft Layer + End-to-End Test — Deliverable Report for ChatGPT

## 1. What Changed

### A. PR Draft Generator (NEW)
- `automation/scripts/generate-pr-draft.mjs` — CLI script
- Reads: Task JSON, Spec, Review, Brief, Executor Report, Follow-ups, Decisions
- Writes:
  - `ai/pr/T-XXXX_pr_draft.md` — human-readable PR draft
  - `automation/state/pr_drafts/T-XXXX.json` — machine-readable state
- PR draft includes: task_id, parent_goal_id, parent_task_id, linked decisions, branch_name, base_branch, title, summary, validation checklist, risks, non-goals, follow-up notes
- Guards: only runs for completed/finalized tasks (MERGED, FOLLOWUPS_PROPOSED, etc.)

### B. State Integration
- New task state: `PR_DRAFTED`
- `finalize-task.mjs` now calls `generate-pr-draft.mjs` after follow-up generation
- Flow: FOLLOWUPS_PROPOSED → (auto) → PR_DRAFTED
- Tasks already in MERGED stay in MERGED (no regression)

### C. Dashboard Integration
- New "PR Drafts" section between Decision Gates and Token Usage
- Shows: draft cards with title, branch info, validation badges, linked decisions
- Shows: "completed tasks without PR drafts" warning list
- CSS: `.pr-draft-card`, `.pr-check`, `.pr-draft-badge` styles
- `renderPRDrafts()` function in dashboard JS
- `TASK_STATES` array updated with PR_DRAFTED
- `/api/state` now returns `pr_drafts` array

### D. decision-gate.mjs Fix
- Added `isMainModule` guard so CLI code only runs when the file is the entry point
- Previously, importing decision-gate.mjs from another script would trigger CLI arg parsing and fail
- This was a bug exposed by generate-pr-draft.mjs importing listDecisions()

### E. End-to-End Architecture Test (NEW)
- `docs/ADR/ADR-0003-end-to-end-reference-flow.md` — architecture decision record
- `docs/e2e-test-walkthrough.md` — reproducible CLI walkthrough
- Reference flow: Goal → Plan → Decision → Task → Pipeline → Finalize → Follow-ups → PR Draft
- Artifact table documenting all 7 artifact types per task
- Validation checklist with 7 pass criteria
- Quick smoke test section using existing T-0100

### F. Template Updated
- `generate-pr-draft.mjs` copied to template
- `init-ai-flow.sh` updated: adds `pr_drafts` state dir and `ai/pr/` artifact dir
- Updated `decision-gate.mjs`, `finalize-task.mjs`, `serve-dashboard.mjs`, `dashboard.html` in template

## 2. How PR Draft Generation Works

```
finalize-task.mjs T-XXXX
  → propose-followups-api.mjs T-XXXX     (follow-ups)
  → close-task.mjs T-XXXX DONE           (cleanup)
  → generate-pr-draft.mjs T-XXXX         (NEW)
      1. Load task JSON
      2. Load spec, review, brief, result, followups
      3. Query decision-gate for linked decisions
      4. Compute base branch from branch naming convention
      5. Generate markdown PR draft with all sections
      6. Generate JSON state with validation flags
      7. Update task.pr_draft_path
```

The generator is also available standalone:
```bash
node scripts/generate-pr-draft.mjs T-0100 --base-branch main
```

GitHub Draft PR creation is deliberately separate and optional (not implemented yet — can be added as a thin `create-github-pr.mjs` wrapper).

## 3. How the End-to-End Test Works

Reference flow (ADR-0003):
```
Goal → Decision Proposal → Decision Resolution → Task Spawn
     → Architect → Critique → Synthesize → Execute
     → Finalize → Follow-ups → PR Draft → Human Review
```

The walkthrough (`docs/e2e-test-walkthrough.md`) provides:
1. Step-by-step CLI commands for each stage
2. Expected outputs per step
3. Validation checklist
4. Quick smoke test using T-0100

Verified: `generate-pr-draft.mjs T-0100` produces correct output:
- Markdown with spec summary, review highlights, risk section
- JSON with validation flags (spec_exists: true, review_exists: true, etc.)
- Dashboard integration loads and displays the draft

## 4. What Remains Risky

1. **No automated test suite**: The e2e walkthrough is manual. Next step should be a Node test runner.
2. **GitHub Draft PR creation not implemented**: Deliberately kept out of scope. Easy to add but needs GitHub token.
3. **LLM-dependent steps not testable in sandbox**: architect, critique, synthesize require API keys or app mode.
4. **PR body content quality**: Currently uses summarize() with character limits. LLM-generated summaries would be better but add API dependency.
5. **decision-gate isMainModule guard**: Uses filename check which could break with symlinks or bundlers.

## 5. What Should Come After This

1. **Automated Node test runner** for the e2e reference flow (mock LLM responses)
2. **GitHub Draft PR creation script** (`create-github-pr.mjs`) for projects with GitHub remotes
3. **Template validation on Aurena copies** — apply template, run smoke test
4. **DB-n format hardening** per your critical feedback (structured output or post-parsing fallback)
5. **Smarter BLOCKED_ON_DECISION logic** — only block when no safe-tasks remain or blocker is global
