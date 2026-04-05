# T-0007 Follow-ups

## Task outcome summary
T-0007 completed the intended docs-lane clarification without inventing archive behavior.

Delivered outcomes:
- Documented that current source-of-truth task status values remain only `"open"` and `"done"`.
- Clarified that no archive concept is currently defined in the documented domain:
  - no archive status
  - no archive flag/property
  - no archive entity
  - no archive operation
- Described archive interactions with existing documented operations only as unresolved boundaries around:
  - `createTask`
  - `markDone`
  - `listTasks`
- Added explicit wording that no archive invariants currently exist.
- Recorded the docs/code drift for `deleteTask` in `ai/current-state/drift-register.md`.
- Kept implementation context separate from canonical documented behavior.

This appears aligned with the task spec, implementation brief, and review guidance to preserve uncertainty rather than resolve it by assumption.

## Remaining risks
- Archive semantics are still undefined, so implementation work should not proceed as if archive behavior is settled.
- `deleteTask` remains a known docs/code drift item and could continue to confuse future contributors if left unresolved.
- If unprovided ADRs or other truth docs already discuss archive behavior, current documentation may still be incomplete relative to the full repository truth set.
- The new documentation clarifies absence of archive rules, but product intent is still unknown for:
  - archive representation
  - list visibility/default listing behavior
  - mark-done interaction
  - delete interaction
  - unarchive behavior
- There is still a planning risk of premature implementation based on code context instead of updated truth docs.

## Candidate follow-up tasks

### F-1
- title: define archive semantics in an ADR-backed truth update
- lane_type: docs-lane
- executor: codex
- rationale: The main remaining gap is not documentation clarity but missing canonical product/domain decisions for archive behavior. A small truth-definition task would let future work proceed safely.
- smallest_safe_scope: Create or update a truth-source document/ADR that answers only the minimum archive questions needed to make the domain coherent: representation, interaction with `listTasks`, interaction with `markDone`, relationship to delete, and whether unarchive exists.
- depends_on: product or maintainer decision input on intended archive behavior
- priority: high
- should_spawn_now: true

### F-2
- title: resolve whether deleteTask should be documented domain behavior or remain drift
- lane_type: docs-lane
- executor: codex
- rationale: T-0007 correctly recorded the mismatch, but the repository still has an unresolved truth conflict between tests/code and docs around `deleteTask`.
- smallest_safe_scope: Decide one narrow outcome for `deleteTask` and document it: either add it to source-of-truth docs as supported behavior, or explicitly mark it as non-canonical and schedule follow-up cleanup elsewhere.
- depends_on: maintainer decision on intended long-term role of deleteTask
- priority: high
- should_spawn_now: true

### F-3
- title: verify no additional truth sources already define archive behavior
- lane_type: docs-lane
- executor: codex
- rationale: The task spec acknowledged that unprovided ADR content could contain archive guidance. A quick truth audit would reduce the risk of redundant or conflicting future documentation.
- smallest_safe_scope: Review `docs/ADR/`, `AGENTS.md`, and `ai/project.config.yaml` for any archive- or deletion-related guidance and summarize whether T-0007 docs need reconciliation.
- depends_on: none
- priority: medium
- should_spawn_now: true

## Recommended next task
### F-1
- title: define archive semantics in an ADR-backed truth update
- lane_type: docs-lane
- executor: codex
- rationale: T-0007 intentionally stopped at documenting absence and uncertainty. The next smallest useful step is to establish canonical archive semantics before any implementation or further domain documentation expands.
- smallest_safe_scope: Produce a constrained ADR/truth update that decides only the unresolved archive interactions called out in T-0007, without coupling to implementation changes.
- depends_on: product or maintainer decision input on intended archive behavior
- priority: high
- should_spawn_now: true

## Notes for planner
- T-0007 appears complete; no corrective follow-up is required for the task itself.
- The highest-value follow-up is a truth-definition task, not a code task.
- If decision-maker input is not yet available, F-3 is a safe preparatory task that may uncover existing guidance before drafting new archive semantics.
- Do not schedule implementation of archive behavior until archive semantics are promoted into repository truth.
- Keep any `deleteTask` resolution as a separate, reviewable task unless archive decisions explicitly require combining them.