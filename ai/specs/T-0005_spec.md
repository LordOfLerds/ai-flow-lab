# T-0005 Spec

## Task metadata

- **Task ID:** T-0005
- **Title:** add `updateTaskTitle` function
- **Lane type:** feature-lane
- **Executor:** codex
- **Primary implementation area:** `starter-test/src/tasks.ts`
- **Likely test area:** `starter-test/tests/tasks.test.ts`

## Problem statement

The task requests adding an `updateTaskTitle` function to the task domain logic. Current documented domain entities define that a `Task` includes `id`, `title`, and `status`, but there is no documented operation for updating a task title. The current code exposes functions for creating, listing, marking done, and deleting tasks, but not for renaming an existing task.

A spec is needed to define the expected behavior of `updateTaskTitle` using repository documentation as the primary source of truth, while explicitly noting where the docs do not yet define this new operation.

## Source of truth

Primary truth sources reviewed:

- `docs/DOMAIN_MODEL.md`
- `docs/INVARIANTS.md`
- `docs/ARCHITECTURE.md`
- `AGENTS.md`
- `ai/project.config.yaml`

Relevant documented facts:

- `Task` has:
  - `id: integer`
  - `title: string`
  - `status: "open" | "done"`
- Task ids must be unique.
- `createTask` must not mutate prior task objects.
- `markDone` must only change the matching task.
- `listTasks(tasks, status)` must only return tasks with that exact status.
- Domain logic lives in `starter-test/src/tasks.ts`.
- Tests live in `starter-test/tests/tasks.test.ts`.
- Docs are the primary truth.
- If tested behavior and docs disagree, the conflict must be recorded in `ai/current-state/drift-register.md`.

Code context reviewed for current behavior:

- `starter-test/src/tasks.ts` currently exports:
  - `createTask`
  - `listTasks`
  - `markDone`
  - `deleteTask`
- There is currently no `updateTaskTitle`.
- Existing functions generally operate in an immutable style by returning new arrays; however, only some invariants are explicitly documented.

Uncertainty to note:

- There is no explicit documentation yet defining rename/update semantics for task titles.
- There is no explicit documented rule for behavior when updating a non-existing task.
- There is no explicit documented validation rule for title contents, emptiness, trimming, length, or uniqueness.

## Desired behavior

Add an `updateTaskTitle` function in the task domain module to update the `title` of an existing task.

Based on the existing model and patterns in current code, the desired behavior should be:

- The function accepts:
  - the current `tasks` collection
  - a task identifier
  - a new title string
- The function returns a task collection where:
  - the task with the matching `id` has its `title` updated
  - all other tasks remain unchanged
  - the task’s `status` is preserved
  - the task’s `id` is preserved

Behavior for a missing task is not documented for title updates. However, the existing `markDone` function throws when the target task does not exist. Because docs do not define `updateTaskTitle`, the safest spec is to treat this as a likely alignment target with current domain behavior, but mark it as uncertain until confirmed.

Likely expected missing-task behavior, pending confirmation:

- If no task exists for the provided `id`, throw an error rather than silently doing nothing.

Immutability expectations are also not explicitly documented for `updateTaskTitle`, but current domain patterns and existing invariants suggest the function should avoid mutating unrelated tasks and should only change the matching task. Since this exact invariant is not yet written for `updateTaskTitle`, that expectation should be implemented cautiously and documented if needed.

## Constraints

- Must align with documented `Task` shape from `docs/DOMAIN_MODEL.md`.
- Must be implemented in the domain logic area: `starter-test/src/tasks.ts`.
- Must not invent undocumented business rules for title validation.
  - No spec requirement for non-empty titles
  - No spec requirement for trimming whitespace
  - No spec requirement for title uniqueness
  - No spec requirement for max length
- If implementation or tests introduce behavior not grounded in docs, that should be called out as uncertainty.
- If code behavior or tests end up conflicting with docs, the conflict must be recorded in `ai/current-state/drift-register.md`.
- Changes should remain within assigned task scope.

## Acceptance criteria

- A new `updateTaskTitle` function exists in `starter-test/src/tasks.ts`.
- The function updates the `title` of the task whose `id` matches the provided identifier.
- The returned result preserves:
  - the same `id` for the updated task
  - the same `status` for the updated task
  - all non-target tasks unchanged in value
- The function returns an updated task collection rather than changing the task shape.
- Relevant tests are added or updated in `starter-test/tests/tasks.test.ts` to cover:
  - updating the title of an existing task
  - preserving `status` when the title is updated
  - leaving non-target tasks unchanged
- If missing-task behavior is implemented as throwing, tests should assert that behavior.
- If missing-task behavior differs from the current `markDone` pattern, that difference should be treated as undocumented behavior and explicitly called out.
- No undocumented title validation rules are added unless separately documented.

## Risks

- **Underspecified behavior:** The docs do not currently define rename semantics, so error handling and immutability expectations for `updateTaskTitle` are partially inferred from existing code patterns rather than directly documented.
- **Potential drift risk:** If tests are written to enforce missing-task throwing behavior for `updateTaskTitle`, that behavior may be ahead of docs and should be noted as such.
- **Validation ambiguity:** Adding title validation would introduce new business rules not present in docs.
- **Consistency risk:** If `updateTaskTitle` behaves differently from `markDone` for nonexistent ids, the task API may become inconsistent.

## Open questions

- Should `updateTaskTitle(tasks, id, title)` throw when the target task does not exist, or should it return the original collection unchanged?
- Should immutability for `updateTaskTitle` be explicitly documented, similar to the existing invariant for `createTask`?
- Should there be a documented invariant that title updates must only change the matching task, analogous to the rule for `markDone`?
- Are empty-string titles allowed, given that the docs only specify `title: string` and no validation rules?
- If implementation or tests define missing-task behavior before docs are updated, should that be recorded as a documentation gap or as drift?