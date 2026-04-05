# ADR-0003: End-to-End Reference Flow

## Status
ACCEPTED

## Context
The AI Flow Lab automation system now has all layers required for a complete lifecycle:
- Goal planning (plan-goal-api.mjs)
- Decision gates (decision-gate.mjs)
- Task orchestration (new-task, architect, critique, synthesize, run-task)
- Follow-up generation (propose-followups-api.mjs)
- PR draft generation (generate-pr-draft.mjs)

We need one canonical, documented, reproducible test path that exercises the full system
end-to-end to validate architectural integrity.

## Decision
Define a single reference flow that every future system change must be tested against.

### Reference Flow

```
Goal
  → Plan (plan-goal-api.mjs)
    → Decision Proposal (decision-gate.mjs propose)
      → Decision Resolution (decision-gate.mjs resolve / dashboard)
        → Task Spawning (spawn-from-goal-proposal.mjs)
          → Task Execution Pipeline
            → Architect (architect-task-api.mjs)
            → Critique (critique-task-api.mjs)
            → Synthesize (synthesize-task-api.mjs)
            → Execute (run-task.mjs)
          → Finalize (finalize-task.mjs)
            → Follow-up Proposal (propose-followups-api.mjs)
            → PR Draft (generate-pr-draft.mjs)
              → Human Review → Merge
```

### State Transitions

```
Goal:   NEW → PLANNED → IN_PROGRESS → BLOCKED_ON_DECISION → IN_PROGRESS → COMPLETE
Task:   NEW → ARCHITECTED → CRITIQUED → SYNTHESIZED → IMPLEMENTING → FOLLOWUPS_PROPOSED → PR_DRAFTED → MERGED
Decision: DP-NNNN (open) → DEC-NNNN (resolved)
```

### Artifacts Generated Per Task

| Stage | File | Description |
|-------|------|-------------|
| Plan | `ai/specs/T-XXXX_spec.md` | Task specification |
| Review | `ai/reviews/T-XXXX_*_review.md` | Architectural review |
| Brief | `ai/briefs/T-XXXX_implementation.md` | Implementation brief |
| Execute | `ai/results/T-XXXX_executor_report.md` | Executor report |
| Follow-up | `ai/followups/T-XXXX_followups.md` | Follow-up proposals |
| PR Draft | `ai/pr/T-XXXX_pr_draft.md` | PR draft document |
| PR State | `automation/state/pr_drafts/T-XXXX.json` | Machine-readable draft |
| Decision | `docs/decisions/DEC-NNNN.md` | Decision record |

### Validation Criteria
For the reference flow to pass:
1. Goal transitions through all expected states
2. Decision proposal is created and resolved before task execution
3. Task transitions through the full state machine
4. All 7 artifact types are generated
5. PR draft references linked decisions and follow-ups
6. No manual intervention required except decision resolution
7. Dashboard displays all states correctly

## Consequences
- Every architectural change must be tested against this flow
- New scripts must document where they fit in the pipeline
- The CLI walkthrough below provides a reproducible test sequence

## CLI Walkthrough

See `docs/e2e-test-walkthrough.md` for the reproducible CLI script.
