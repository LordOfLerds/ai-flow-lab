# T-0006 Follow-ups

## Task outcome summary
T-0006 appears complete and coherent.

Delivered changes, per executor report:
- Added archive support to the documented `Task` model by extending `status` to include `"archived"`.
- Updated truth docs in:
  - `docs/DOMAIN_MODEL.md`
  - `docs/INVARIANTS.md`
- Implemented `archiveTask` in:
  - `starter-test/src/tasks.ts`
- Updated tests in:
  - `starter-test/tests/tasks.test.ts`
- Touched demo/entrypoint behavior in:
  - `starter-test/src/index.ts`
- Test suite passed via `npm test` in `starter-test/`.

This resolves the main T-0006 spec risk: archive behavior is no longer only implied in code; it is now documented as part of the domain model.

## Remaining risks
- The archive lifecycle is still one-way. There is no documented or implemented `unarchiveTask`, so archival is currently terminal unless tasks are edited by some future mechanism.
- Interaction boundaries with other operations may still be only partially specified, especially:
  - whether `markDone` on an archived task is allowed, rejected, or a no-op
  - whether `deleteTask` has any archive-specific expectations
- `index.ts` was changed as part of the task. That is acceptable if minimal, but any demo-facing behavior should remain aligned with the new docs and not imply extra archive semantics beyond exact status filtering.
- If the implementation chose behavior for non-existent ids by mirroring existing patterns, that behavior should remain stable; otherwise, this area could still be a source of future drift if not explicitly documented.

## Candidate follow-up tasks

### F-1
- title: document archive interactions with existing operations
- lane_type: docs-lane
- executor: codex
- rationale: Archive status is now documented, but cross-operation rules may still be implicit, especially for `markDone` and `deleteTask` when tasks are archived.
- smallest_safe_scope: Update `docs/DOMAIN_MODEL.md` and/or `docs/INVARIANTS.md` to explicitly state allowed behavior for archived tasks with existing operations, without changing implementation.
- depends_on: T-0006
- priority: medium
- should_spawn_now: yes

### F-2
- title: add tests for archived-task interactions with markDone and deleteTask
- lane_type: test-lane
- executor: codex
- rationale: If current behavior for archived-task interactions is already implemented or observable, focused tests would lock it in and reduce accidental regressions.
- smallest_safe_scope: Add narrowly scoped tests covering archived-task behavior with `markDone` and `deleteTask`, matching current documented or existing behavior only.
- depends_on: T-0006, F-1
- priority: medium
- should_spawn_now: no

### F-3
- title: add unarchiveTask function
- lane_type: feature-lane
- executor: codex
- rationale: The executor report identified possible future need to restore archived tasks, but this is not required to complete the current archive feature.
- smallest_safe_scope: Add a reversible archive flow via `unarchiveTask`, with minimal doc, logic, and test updates, only after lifecycle expectations are specified.
- depends_on: T-0006
- priority: low
- should_spawn_now: no

### F-4
- title: improve demo visibility for archived tasks
- lane_type: feature-lane
- executor: codex
- rationale: The demo entry point was already touched; a small follow-up could make archived-task behavior easier to verify manually without affecting domain logic.
- smallest_safe_scope: Adjust `starter-test/src/index.ts` output or argument handling to explicitly demonstrate archived-task listing, with no domain-model changes.
- depends_on: T-0006
- priority: low
- should_spawn_now: no

## Recommended next task
### F-1
- title: document archive interactions with existing operations
- lane_type: docs-lane
- executor: codex
- rationale: T-0006 resolved the main model contradiction, but the most likely remaining ambiguity is behavioral: how archived tasks interact with pre-existing operations. A small docs-only task is the safest next step because it clarifies intended rules before spawning more tests or features.
- smallest_safe_scope: Update docs to state expected behavior for archived tasks with `markDone`, `deleteTask`, and any relevant list semantics, without changing code.
- depends_on: T-0006
- priority: medium
- should_spawn_now: yes

## Notes for planner
- No corrective implementation follow-up is clearly required for T-0006 itself; the core task appears complete.
- The safest next increment is clarification, not new feature work.
- Prefer a docs-first follow-up before adding more archive-related tests, so tests can validate explicitly chosen behavior rather than freeze accidental implementation details.
- Do not spawn `unarchiveTask` yet unless there is explicit product intent for reversible archival.