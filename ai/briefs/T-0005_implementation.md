# T-0005 Implementation Brief

## Goal
Add an `updateTaskTitle(tasks, id, title)` function to the task domain module so an existing task’s `title` can be changed while preserving its `id` and `status`.

## Scope
- Implement the new domain function in `starter-test/src/tasks.ts`.
- Export it consistently with the existing task-domain API.
- Add focused tests in `starter-test/tests/tasks.test.ts` for documented and minimally inferred behavior.
- If missing-task behavior is implemented as throwing, record that as undocumented behavior in `ai/current-state/drift-register.md` per workflow policy.

## Constraints
- Follow docs as primary truth:
  - `Task` shape remains `{ id: integer, title: string, status: "open" | "done" }`.
  - Do not add new fields or alter status semantics.
- Keep changes within assigned scope; do not broaden to unrelated refactors.
- Do not invent title validation rules:
  - no non-empty requirement
  - no trimming
  - no uniqueness
  - no max-length rule
- Resolve spec uncertainty explicitly:
  - The docs do not define `updateTaskTitle`.
  - The spec infers likely behavior from current patterns.
  - Therefore implement only the smallest consistent behavior and document any inferred behavior that is not directly documented.
- Use concrete `id` terminology aligned to the domain model: integer id.
- Allow title updates regardless of current status unless code/docs explicitly prohibit it; no such prohibition exists in truth docs.

## File targets
- `starter-test/src/tasks.ts`
- `starter-test/tests/tasks.test.ts`
- `ai/current-state/drift-register.md` only if implementation/tests enforce behavior not directly stated in docs, especially throwing for missing ids

## Tests required
Add or update tests covering:
- updating the title for an existing task
- preserving `id` on the updated task
- preserving `status` on the updated task
- allowing update when target task is `"done"` and keeping it `"done"`
- leaving non-target tasks unchanged in value
- preserving collection order after update
- updating one task in a collection of at least 3 tasks
- behavior on empty collection when updating a missing id

Conditional test:
- if chosen implementation throws for missing id, add tests asserting throw for:
  - missing id in non-empty collection
  - missing id in empty collection

Avoid tests for undocumented validation rules.

## Chosen minimal policy
Implement `updateTaskTitle` as an immutable array transformation over the task collection:
- inputs: task array, integer id, new title string
- output: task array of same shape/order
- update only the matching task’s `title`
- preserve all other task properties and tasks

Missing-id policy:
- Choose consistency with existing domain behavior if current `markDone` throws for missing ids.
- Because this behavior is not documented for `updateTaskTitle`, if throwing is implemented, it must be recorded in `ai/current-state/drift-register.md`.
- Do not silently add stronger guarantees beyond this.

Immutability policy:
- Keep implementation aligned with existing project style by returning a new collection rather than mutating task shape/structure.
- Do not add broader invariant documentation in this task unless drift documentation is needed.

## Risks
- `updateTaskTitle` behavior is underspecified in docs, so missing-id handling is inferred rather than directly grounded.
- Tests may accidentally over-specify immutability/reference behavior beyond current documentation.
- Implementing throw-on-missing-id without drift logging would violate workflow policy.
- Broad refactoring of task utilities would exceed task scope.

## Explicit non-goals
- No changes to `createTask`, `markDone`, `listTasks`, or `deleteTask` behavior unless required for exports/imports.
- No new validation for title contents.
- No documentation rewrite of domain model or invariants beyond necessary drift entry.
- No UI/demo changes in `starter-test/src/index.ts` unless strictly required for compilation.
- No introduction of new task lifecycle rules.
- No change to collection type or task ordering semantics beyond preserving existing behavior.