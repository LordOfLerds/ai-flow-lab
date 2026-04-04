# T-0006 Implementation Brief

## Goal

Add an `archiveTask` function to the task domain in a way that is executable by the coding agent while explicitly resolving the current doc/spec contradiction.

Resolution: because the request is for a new feature and the current docs do not define archive semantics, this task must include the minimum documentation update needed to make the feature valid, rather than relying on undocumented drift as the primary implementation path.

## Scope

Implement the smallest coherent archive model:

- Extend the task lifecycle to support an `"archived"` status.
- Add `archiveTask(tasks, id)` in `starter-test/src/tasks.ts`.
- Preserve the existing domain style: operate on a task array and target a task by id.
- Update domain docs/invariants only as needed to legitimize the new status and operation.
- Add focused tests for archive behavior and for interaction with existing listing behavior.

Minimal behavioral policy to implement:

- `archiveTask` changes the matching task’s `status` to `"archived"`.
- It only affects an existing matching task.
- It must not mutate the input array or unrelated task objects.
- Archived tasks remain in the collection.
- `listTasks(tasks, status)` continues exact-status filtering, so `"archived"` becomes a valid filter value once docs/types are updated.

## Constraints

- Docs are primary truth; do not leave archive semantics as silent code-only behavior.
- Resolve the status-union contradiction explicitly by updating docs to include `"archived"`.
- Keep changes tight to task-domain logic, its tests, and necessary truth docs.
- Preserve existing documented invariants unless explicitly extended.
- Do not broaden scope into restore/unarchive flows, UI behavior, storage, or architectural refactors.
- If any pre-existing unrelated code/doc drift is noticed, do not expand this task to fix it unless required for archiveTask.

## File targets

- `starter-test/src/tasks.ts`
- `starter-test/tests/tasks.test.ts`
- `docs/DOMAIN_MODEL.md`
- `docs/INVARIANTS.md`

Conditional only if implementation/tests still temporarily diverge from docs during execution:
- `ai/current-state/drift-register.md`

## Tests required

Add or update tests to cover:

- `archiveTask` archives the matching task by id.
- `archiveTask` returns updated data without mutating the original input array.
- `archiveTask` only changes the matching task and leaves other tasks untouched.
- `archiveTask` on a non-existent id follows the project’s established behavior for invalid ids; if existing `markDone` behavior is throw-based, archive should match it. If tests/code show otherwise, align with existing domain pattern and document any necessary drift.
- `listTasks(tasks, "archived")` returns only archived tasks.
- Existing `listTasks(tasks, "open" | "done")` behavior remains exact-status only.

Avoid adding speculative tests for:
- double-archive idempotency unless required by existing function style
- unarchive behavior
- implicit exclusion of archived tasks from unfiltered lists unless current code already defines unfiltered list semantics and archive must integrate with that behavior

## Chosen minimal policy

Chosen implementation policy for this task:

- Represent archiving as `status: "archived"`.
- Update the `Task` domain model status union from `"open" | "done"` to `"open" | "done" | "archived"`.
- `archiveTask` signature should mirror existing task operations: task collection plus task id, returning the updated task collection.
- `archiveTask` should be immutable in effect: return a new array and only replace the matching task object.
- Archived tasks are not deleted; they stay addressable by list/filter operations.
- `listTasks(tasks, status)` remains exact-match filtering; no special casing for archived tasks.
- For non-existent ids, prefer consistency with current `markDone` semantics over inventing a new rule.

This resolves the contradiction noted in the review: archive is not provisional drift; it becomes a documented extension of the model.

## Risks

- Existing tests/code may have undocumented behavior around invalid ids; archiveTask must align with the established domain pattern without widening scope.
- Adding `"archived"` to the status union may require minor updates wherever status is typed or asserted.
- Pre-existing undocumented `deleteTask` behavior exists in the repo; do not use it to infer archive semantics.
- If there is an unfiltered `listTasks(tasks)` behavior in code, archived-task inclusion may already be implicitly defined; avoid altering that behavior unless required for type compatibility or failing tests.

## Explicit non-goals

- No restore/unarchive function.
- No changes to `deleteTask` behavior.
- No new task fields beyond what is required to support archive as a status value.
- No special archive-only list behavior beyond exact status filtering.
- No UI/demo enhancements unless compilation requires a minimal touch.
- No broad cleanup of unrelated repo drift.