# Mock-LLM Test Harness + E2E Runner — Deliverable Report for ChatGPT

## 1. What Changed

### A. Mock LLM Mode (NEW)
- `_llm-utils.mjs`: Added `LLM_MODE=mock` support
- `loadMockResponse({ taskId, step, provider })`: Fixture fallback chain
  - Try: `test-fixtures/llm/<step>/<taskId>.md` (specific)
  - Try: `test-fixtures/llm/<step>/default.md` (step default)
  - Try: `test-fixtures/llm/default.md` (global default)
  - Fallback: Generate minimal deterministic response
- `callOpenAI()` and `callGemini()` both check mock mode before making any API call
- Usage logging works in mock mode (tracks with `model: "mock"`)

### B. Step/TaskId Params Added to All Pipeline Scripts
- `plan-goal-api.mjs`: passes `{ taskId: goalId, step: "plan-goal" }`
- `architect-task-api.mjs`: passes `{ taskId, step: "architect" }`
- `critique-task-api.mjs`: passes `{ taskId, step: "critique" }`
- `synthesize-task-api.mjs`: passes `{ taskId, step: "synthesize" }`
- `propose-followups-api.mjs`: passes `{ taskId, step: "propose-followups" }`
- This was required for mock mode fixture routing to work correctly

### C. Test Fixture Structure (NEW)
```
automation/test-fixtures/
├── goals/E2E-TEST.json            # Test goal fixture
└── llm/
    ├── plan-goal/default.md       # Mock planner output (### P-N, ### DB-N blocks)
    ├── architect/default.md       # Mock spec output
    ├── critique/default.md        # Mock review output
    ├── synthesize/default.md      # Mock implementation brief
    ├── propose-followups/default.md # Mock follow-up output (### F-N blocks)
    └── generic/default.md         # Global fallback
```

All fixtures use realistic content that matches the expected markdown format (headings, field lists, sections).

### D. Automated E2E Test Runner (NEW)
- `run-e2e-test.mjs`: Full 10-phase deterministic regression runner
- Phases:
  1. Plan Goal (G-E2E → proposals + decision proposals)
  2. Resolve Decisions (auto-resolve with recommended defaults)
  3. Spawn Task (proposal → T-E2E-P1 task)
  4. Architect (generate spec)
  5. Critique (generate review)
  6. Synthesize (generate implementation brief)
  7. Mock Execute (simulate executor report)
  8. Finalize (follow-ups + state transition)
  9. PR Draft (generate PR draft markdown + JSON)
  10. Cross-cutting Invariants (artifact paths, linkage, usage log)
- **59 assertions**, all passing in 0.3s
- Writes `state/e2e-test-result.json` for dashboard consumption
- Cleanup: removes all test state after run (or `--keep` flag to preserve)

### E. Format Hardening
- **Tolerant regex**: `\r\n` support, optional whitespace after headings
- **Tolerant field parser**: Handles `- field:`, `**field**:`, and bare `field:` variations (case-insensitive)
- **Warning on empty parse**: Logs explicit warning when no candidate blocks found
- Applied to: `plan-goal-api.mjs` (P-N, DB-N blocks), `propose-followups-api.mjs` (F-N, DB-N blocks)

### F. Dashboard Enhancements
- **Mock mode indicator**: Purple badge when `LLM_MODE=mock` is active
- **E2E test result widget**: Shows pass/fail count, elapsed time, and relative timestamp in header
- `serve-dashboard.mjs`: Returns `mode` and `e2e_test_result` in `/api/state` response

### G. Template Updated
- All modified scripts, new runner, fixtures, and dashboard copied to `template/`

## 2. How the E2E Runner Works

```
LLM_MODE=mock node scripts/run-e2e-test.mjs [--keep]

Flow:
  Setup → Clean state, create goal from fixture
  Phase 1 → plan-goal-api.mjs G-E2E        → plan.md + proposals + decision proposals
  Phase 2 → decision-gate.mjs resolve DP-*  → decision records
  Phase 3 → spawn-from-goal-proposal.mjs    → T-E2E-P1 task
  Phase 4 → architect-task-api.mjs          → spec
  Phase 5 → critique-task-api.mjs           → review
  Phase 6 → synthesize-task-api.mjs         → brief
  Phase 7 → (mock executor report created)
  Phase 8 → propose-followups-api.mjs       → followups + proposals
  Phase 9 → generate-pr-draft.mjs           → PR draft markdown + JSON
  Phase 10 → Cross-cutting invariant checks
  Cleanup → Remove all test state
```

Result: `state/e2e-test-result.json` with pass/fail counts, visible in dashboard header.

## 3. What Remains Risky

1. **Worktree/branch steps not tested**: E2E runner skips `bootstrap-worktree.mjs` and `prepare-worktree.mjs` since they require real git branches. Could add mock worktree support later.
2. **close-task.mjs not tested in E2E**: It tries to remove worktree and locks — E2E skips this step and sets state manually.
3. **Decision resolution is auto-resolved**: Always picks `recommended_default`. Doesn't test manual resolution flow.
4. **Fixture content is hand-crafted**: If the LLM output format drifts significantly from fixture format, the E2E won't catch it until live testing.

## 4. What Should Come After This

1. **GitHub Draft PR Script** (`create-github-pr.mjs`) — thin wrapper to push PR draft to GitHub
2. **Template validation on Aurena copies** — apply template, run `run-e2e-test.mjs`
3. **Worktree mock support** — allow E2E to test branch/worktree lifecycle
4. **Fixture variety** — task-specific fixtures, error cases, edge cases
5. **CI integration** — run `run-e2e-test.mjs` in GitHub Actions
