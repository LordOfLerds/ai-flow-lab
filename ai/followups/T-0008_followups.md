# T-0008 Follow-ups

## Task outcome summary
T-0008 completed its verification goal successfully.

Confirmed outcome:
- No approved truth source currently defines archive behavior.
- `docs/DOMAIN_MODEL.md` limits `Task.status` to `"open" | "done"`.
- `docs/INVARIANTS.md` and `docs/ARCHITECTURE.md` add no archive or soft-delete semantics.
- `docs/ADR/` is absent on the filesystem, so there is no ADR-based archive guidance.
- Secondary evidence shows `deleteTask` exists in code/tests, but that does not establish archive behavior.
- The undocumented deletion behavior was correctly treated as drift and recorded in `ai/current-state/drift-register.md`.

This means the original verification question is resolved, and the repo now has an explicit drift record for the adjacent lifecycle discrepancy.

## Remaining risks
- The repository still has an unresolved product truth gap around task removal behavior: tested deletion exists, but approved docs do not define whether deletion is valid domain behavior.
- Future work on archive behavior could be confused with existing deletion behavior unless planners explicitly distinguish:
  - hard delete,
  - soft delete,
  - archive,
  - and status transitions.
- If a follow-up updates docs to bless deletion, it must avoid accidentally implying archive semantics that are still undefined.
- If a follow-up removes deletion from code/tests instead, care is needed to ensure the drift entry is closed consistently and all tests remain aligned with the documented lifecycle.

## Candidate follow-up tasks

### F-1
- title: document whether task deletion is an approved domain operation
- lane_type: docs-lane
- executor: codex
- rationale: T-0008 established that deletion exists in tested code but is absent from approved truth docs, and that discrepancy is now registered as drift. The smallest next step is to make an explicit documentation decision on whether deletion belongs in the domain model at all.
- smallest_safe_scope: Update the approved truth docs only enough to either define deletion as supported behavior or explicitly state that task lifecycle is limited to the currently documented operations; do not introduce archive semantics.
- depends_on: T-0008
- priority: high
- should_spawn_now: true

### F-2
- title: align implementation and tests if deletion is not approved by docs
- lane_type: code-lane
- executor: codex
- rationale: If planners decide deletion should not be part of the domain model, the implementation and tests will need to be brought back into alignment with documented truth.
- smallest_safe_scope: Remove or adjust only deletion-related implementation/tests and update drift status accordingly after a docs decision is made.
- depends_on: F-1
- priority: medium
- should_spawn_now: false

### F-3
- title: add explicit lifecycle terminology note to prevent delete/archive confusion
- lane_type: docs-lane
- executor: codex
- rationale: Even after T-0008, future contributors may conflate deletion with archive behavior. A narrow terminology clarification could reduce that risk without designing archive behavior.
- smallest_safe_scope: Add a brief clarification in approved docs or planning notes that current truth does not define archive behavior and that deletion, if later documented, is a separate decision.
- depends_on: F-1
- priority: low
- should_spawn_now: false

## Recommended next task
### F-1
Document whether task deletion is an approved domain operation.

Why this should be next:
- T-0008 already completed the verification and drift-registration work.
- The remaining issue is not discovery; it is an explicit product-truth decision.
- A docs-first decision is the smallest safe next move because repository policy makes docs authoritative.
- This task can remain narrow and reviewable if it avoids introducing archive semantics and focuses only on whether deletion is part of the supported task lifecycle.

## Notes for planner
- No additional verification follow-up is needed for archive truth sources; that scope is complete.
- The next planner decision is fundamentally a choice between:
  - documenting deletion as intended behavior, or
  - rejecting deletion and later aligning code/tests.
- Keep archive behavior out of the next task unless there is a separate approved requirement; T-0008 confirmed it is currently undefined.
- If F-1 is spawned, its acceptance criteria should explicitly forbid inventing archive/soft-delete semantics while resolving only the deletion drift.