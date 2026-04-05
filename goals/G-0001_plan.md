# G-0001 Plan

## Goal summary
Introduce an archive-capable task lifecycle in a reversible way, while keeping the rollout incremental and avoiding undocumented semantic guesses. The current truth docs only define `Task.status` as `"open" | "done"`, so the safest path is to first clarify lifecycle semantics in documentation before changing domain logic or tests.

## Constraints
- Keep patches small and reviewable.
- Do not invent lifecycle semantics without explicit documentation.
- Prefer docs/truth work before implementation when semantics are unclear.
- Current truth docs define:
  - `Task.status` as `"open" | "done"`
  - creation starts at `"open"`
  - only existing tasks can be marked done
  - filtering must match exact status
- Any conflict between docs and tested behavior must be recorded in `ai/current-state/drift-register.md`.
- Avoid broad refactors, persistence changes, or UI-oriented changes.

## Candidate initial tasks

### P-1
- title: Define archive lifecycle semantics in truth docs
- lane_type: docs
- executor: writing-agent
- rationale: The goal explicitly warns against inventing semantics, and current docs do not describe archive behavior, reversibility, or whether archive is a new status versus another state representation.
- smallest_safe_scope: Update truth documentation to specify the intended task lifecycle, including archive-related state transitions and whether unarchive is in or out of initial scope; if any existing tests or code already imply conflicting behavior, record that in `ai/current-state/drift-register.md`.
- depends_on: []
- priority: high
- should_spawn_now: true

### P-2
- title: Record explicit decision set for reversible archive behavior
- lane_type: product/docs
- executor: writing-agent
- rationale: Several key behaviors are presently unspecified, including whether `done -> archived`, `open -> archived`, and `archived -> open` or `archived -> done` are allowed. Capturing these as explicit decisions reduces implementation risk.
- smallest_safe_scope: Add or update an ADR or goal-adjacent decision record that answers missing lifecycle questions without changing code.
- depends_on: []
- priority: high
- should_spawn_now: true

### P-3
- title: Add tests that codify the newly documented archive lifecycle
- lane_type: test
- executor: writing-agent
- rationale: Once semantics are documented, tests should lock in allowed statuses, transitions, and exact filtering behavior before domain logic changes.
- smallest_safe_scope: Extend `starter-test/tests/tasks.test.ts` with focused lifecycle tests for archive behavior only, avoiding unrelated refactors.
- depends_on: [P-1, P-2]
- priority: high
- should_spawn_now: false

### P-4
- title: Implement minimal domain support for archive lifecycle in tasks module
- lane_type: implementation
- executor: writing-agent
- rationale: Domain logic should follow documented semantics and test coverage, with the smallest possible change in `starter-test/src/tasks.ts`.
- smallest_safe_scope: Update task domain types and lifecycle functions only as required to satisfy the archive tests, without broad API redesign.
- depends_on: [P-3]
- priority: high
- should_spawn_now: false

### P-5
- title: Update demo entry point to reflect archive-capable lifecycle
- lane_type: integration
- executor: writing-agent
- rationale: The demo entry point should remain aligned with the domain model, but this should happen only after semantics and core behavior are stable.
- smallest_safe_scope: Make narrowly scoped adjustments in `starter-test/src/index.ts` if needed to compile or demonstrate archive behavior.
- depends_on: [P-4]
- priority: medium
- should_spawn_now: false

### P-6
- title: Verify drift between current tests/code and updated lifecycle docs
- lane_type: validation
- executor: writing-agent
- rationale: The workflow requires documenting any disagreement between docs and tested behavior rather than resolving it silently.
- smallest_safe_scope: Compare updated truth docs against existing tests and current implementation; if mismatches exist, append them to `ai/current-state/drift-register.md` without broad remediation.
- depends_on: [P-1]
- priority: high
- should_spawn_now: false

## Recommended first task
### P-1
Define archive lifecycle semantics in truth docs.

This is the safest first step because the current source-of-truth documents do not yet authorize any archive behavior. Implementing tests or code first would force assumptions about:
- whether `archived` is a new `status`
- which transitions are legal
- whether archiving is allowed from both `open` and `done`
- what “reversible” specifically means in the first increment
- how `listTasks(tasks, status)` should behave once archive exists

P-1 keeps the patch small, reviewable, and aligned with the stated constraint to prefer docs/truth work before implementation when semantics are unclear.

## Decision blockers
- Is `archived` represented as:
  - a new `Task.status` value, or
  - separate metadata distinct from `status`?
- Which transitions are allowed initially?
  - `open -> archived`
  - `done -> archived`
  - `archived -> open`
  - `archived -> done`
- Does “reversible lifecycle” require unarchive in the first implementation, or only preserving a design path for it later?
- If unarchive is deferred, what exact semantics must be documented now to ensure future compatibility?
- Should archived tasks be returned by existing `listTasks(tasks, status)` through exact-status filtering, or handled differently?
- Are there any existing tests or unstated expectations that conflict with introducing archive as a status value?

## Notes for planner
- Sequence work as docs/decisions first, then tests, then implementation.
- Keep the first code patch narrow to `starter-test/src/tasks.ts` unless compilation forces a small change elsewhere.
- Prefer adding focused lifecycle tests over renaming or restructuring existing APIs prematurely.
- If decision documentation lands in an ADR, ensure it is consistent with `docs/DOMAIN_MODEL.md` and `docs/INVARIANTS.md`.
- If any current code/tests already imply archive-like behavior or conflict with the new docs, log it in `ai/current-state/drift-register.md` rather than silently reconciling it.