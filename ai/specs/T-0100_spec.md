# T-0100 Spec

## Task metadata

- **Task ID:** T-0100
- **Title:** Record current lifecycle gap and any doc/test drift
- **Lane type:** docs
- **Executor:** writer

## Problem statement

The documented task lifecycle currently defines only:
- task creation with initial status `"open"`
- transition to `"done"`
- listing by exact status

However, the current code and tests also include `deleteTask`, which represents lifecycle behavior not described in the documented domain model, invariants, or architecture-level behavioral documentation.

Per the documented workflow truth policy, docs are the primary truth, and any disagreement between docs and tested behavior must be recorded in `ai/current-state/drift-register.md`. This task exists to document the current lifecycle gap and explicitly capture any observed doc/test drift rather than resolving it silently.

## Source of truth

Primary truth sources for this task are:

- `docs/DOMAIN_MODEL.md`
- `docs/INVARIANTS.md`
- `docs/ARCHITECTURE.md`
- `AGENTS.md`
- `ai/project.config.yaml`

Observed implementation and test context, which may be ahead of docs and therefore must be treated as potentially non-authoritative:

- `starter-test/src/tasks.ts`
- `starter-test/tests/tasks.test.ts`

Documented facts from source-of-truth files:

- `Task.status` is documented as `"open" | "done"` in `docs/DOMAIN_MODEL.md`.
- New tasks must start with status `"open"`.
- Only existing tasks can be marked done.
- Invariants exist for `createTask`, `markDone`, and `listTasks`.
- `docs/ARCHITECTURE.md` states that if tested behavior and docs disagree, the conflict must be written to `ai/current-state/drift-register.md`.
- `AGENTS.md` repeats that drift must be documented rather than silently decided.

Observed current code/test facts, noted with uncertainty because docs are primary truth:

- `starter-test/src/tasks.ts` defines `deleteTask(tasks, id)`.
- `starter-test/tests/tasks.test.ts` includes a passing-looking test case for deleting a task.
- No provided truth doc defines deletion semantics, deletion constraints, or whether deletion is in scope at all.

## Desired behavior

This task should produce documentation that:

1. Records the current lifecycle gap between documented behavior and observed code/tests.
2. Identifies explicit drift where code/tests demonstrate behavior not covered by the documented domain model.
3. States uncertainty clearly instead of inferring intended business rules.
4. Points to `ai/current-state/drift-register.md` as the required location for recording the conflict, consistent with repository policy.

The documented output should reflect the current known state, including:

- The documented lifecycle includes creation, listing/filtering, and marking done.
- The observed implementation/test surface also includes deletion.
- Deletion is currently undocumented and therefore represents either:
  - an implementation/test addition ahead of docs, or
  - a behavior outside intended scope.

Because the docs do not decide between those interpretations, the spec must not choose one.

## Constraints

- Do not implement code.
- Do not invent new lifecycle rules or deletion semantics.
- Treat documentation as the primary truth.
- If code appears ahead of docs, state that uncertainty explicitly.
- Keep scope limited to documenting the lifecycle gap and drift.
- Do not silently reconcile the mismatch by updating business rules without documented authority.
- The spec should align with the repository rule that drift is recorded in `ai/current-state/drift-register.md`.

## Acceptance criteria

- The spec explicitly states that the documented lifecycle covers only `"open"` and `"done"` task states and associated operations described in docs.
- The spec explicitly notes that `deleteTask` exists in current code and is exercised by current tests.
- The spec explicitly identifies this as doc/code/test drift or a lifecycle documentation gap.
- The spec explicitly references the repository policy requiring such conflicts to be documented in `ai/current-state/drift-register.md`.
- The spec does not define new deletion business rules, such as whether deletion is allowed, forbidden, soft-delete, hard-delete, or subject to additional constraints.
- The spec states uncertainty that code/tests may be ahead of docs.
- No unsupported assumptions are introduced beyond the provided files.

## Risks

- The observed deletion behavior may be intentional but undocumented; documenting it as drift without further clarification could require follow-up decisions from maintainers.
- The observed deletion behavior may be out of scope for the intended domain model; if so, tests and code may need later correction.
- There may be additional undocumented drift not visible from the limited provided files.
- Because no current contents of `ai/current-state/drift-register.md` were provided, this spec cannot verify whether the drift has already been recorded.

## Open questions

- Is task deletion intended to be part of the supported domain lifecycle?
- If deletion is intended, which truth document should define it: `docs/DOMAIN_MODEL.md`, `docs/INVARIANTS.md`, or both?
- Should deletion have explicit invariants, such as behavior for non-existent task IDs or immutability expectations?
- Is the current delete test evidence of approved behavior, or is it test drift relative to the documented model?
- Has this specific conflict already been recorded in `ai/current-state/drift-register.md`?