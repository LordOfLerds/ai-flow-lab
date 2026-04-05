# Decision-Gate Layer — Deliverable Report for ChatGPT

## 1. What Changed

### A. T-0100 Repair (DONE)
- Pruned stale worktree reference (`git worktree prune`)
- Checked out T-0100 branch directly
- Created ADR-0001: 5 unresolved decisions for archive behavior (D1-D5)
- Updated drift-register.md with DRIFT-001: `deleteTask` undocumented
- Wrote executor report with postmortem
- Merged T-0100 into feature/chatgpt-app-overhaul

### B. Decision-Gate Model (NEW)
- `automation/scripts/decision-gate.mjs` — CLI + library
  - `propose`: create decision proposals (DP-0001, DP-0002, ...)
  - `resolve`: resolve proposals → create decision records (DEC-0001, ...)
  - `list`: list proposals by status
  - `check`: check if a task is blocked on open decisions
- State directories: `state/decision_proposals/`, `state/decisions/`
- Markdown artifacts: `docs/decisions/DEC-NNNN.md`

### C. Planner Integration
- `plan-goal-api.mjs`: LLM prompt now requests `DB-<n>` blocks for decision blockers
  - Parsed and stored as decision proposals automatically
  - Goals set to `BLOCKED_ON_DECISION` if high-urgency decisions exist
- `propose-followups-api.mjs`: Same extraction for follow-up planning

### D. Runtime/Task States
- Added: `BLOCKED_ON_DECISION`, `WAITING_FOR_DECISION`, `READY_AFTER_DECISION`
- Resolution endpoint automatically unblocks tasks/goals when decisions are resolved

### E. Dashboard Integration
- New "Decision Gates" section with:
  - Open proposals with urgency badges and clickable option buttons
  - Rationale text input for each decision
  - Resolved decisions history
- `/api/state` now returns `decision_proposals` and `decisions` arrays
- `/api/decisions/resolve` POST endpoint for resolving proposals
- `/api/decisions` GET endpoint for listing all decisions
- State colors updated for new blocked states

### F. Architecture Note
- `docs/ADR/ADR-0002-decision-gate-model.md` — full ADR documenting the model

### G. Template
- `decision-gate.mjs` copied to portable template

## 2. What T-0100 Proved
- The worktree-based isolation model breaks when execution context changes (sandbox vs host machine)
- Fix: `git worktree prune` + direct branch checkout works as recovery
- The planning→spec→review→brief→execute pipeline works correctly when the worktree lock is cleared
- T-0100 is now cleanly recoverable and reproducible: YES

## 3. What Remains Risky
- Worktree creation still assumes same-machine execution (needs `--force-local` flag for remote/sandbox)
- Decision proposals are only emitted when the LLM formats `DB-<n>` blocks correctly — no fallback parsing
- No automated test suite for the decision-gate layer yet
- App mode prompt queue has not been tested with decision proposal workflow

## 4. What Should Come Next After This
1. **Automated PR-Draft generation** — now that decisions are cleanly modeled
2. **End-to-end integration test** — run a full goal through planning → decision → task → completion
3. **Template validation** — apply template to an existing project (Aurena copies) to verify portability
4. **Owner-facing documentation** — how-to guide for resolving decisions via dashboard
