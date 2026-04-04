# T-0004 Spec

## Task metadata
- task_id: T-0004
- title: add deleteTask function
- lane_type: feature-lane
- executor: codex

## Problem statement
The current task domain supports:
- creating tasks
- listing tasks
- marking tasks as done

There is currently no function to remove a task from the task collection.

For this small workflow-lab project, that means the domain API is incomplete for a basic task lifecycle, because tasks can be created and updated but not removed.

## Source of truth
- docs/DOMAIN_MODEL.md
- docs/INVARIANTS.md
- docs/ARCHITECTURE.md
- docs/ADR/

## Desired behavior
Add a domain-level function `deleteTask(tasks, id)` to remove a task by id from the task array.

The desired scope is intentionally small:
- domain function only
- minimal demo integration if needed
- tests that document the chosen behavior

## Constraints
- Do not implement unrelated task features.
- Do not change the meaning of existing functions unless strictly necessary.
- Keep the implementation small and reviewable.
- Treat docs as primary truth.
- If the current code suggests behavior not specified in docs, mark it explicitly rather than silently expanding scope.
- Preserve the functional style already used in `starter-test/src/tasks.ts`.

## Acceptance criteria
1. A new domain function `deleteTask(tasks, id)` exists.
2. Deleting an existing task id removes that task from the returned array.
3. The function does not mutate the original array in place.
4. Tasks other than the deleted one remain unchanged.
5. Existing task behavior for:
   - `createTask`
   - `listTasks`
   - `markDone`
   remains intact unless explicitly required for correctness.
6. Tests are added or updated to cover:
   - deleting an existing task
   - preserving the remaining tasks
   - preserving array immutability or non-destructive behavior at the collection level
7. If a minimal demo path is added in `starter-test/src/index.ts`, it must remain consistent with the existing small CLI/demo style.

## Risks
1. **Unspecified missing-id behavior**
   The current docs do not define what should happen if `deleteTask` is called with a non-existing id.
   This must not be silently treated as settled domain policy.

2. **Id reuse semantics after deletion**
   `createTask` currently derives the next id from the maximum id present in the current array.
   If the highest-id task is deleted, a later created task may reuse that numeric id.
   This is not forbidden by current docs, but it is also not explicitly defined as desired behavior.

3. **Potential hidden coupling with future rules**
   If later docs introduce stronger identity guarantees (for example monotonic non-reused ids), a simple delete implementation may interact with that expectation.

## Open questions
1. What should `deleteTask(tasks, id)` do when the id does not exist?
   - return the unchanged array
   - throw an error
   - use another explicit signal

2. Should task ids be unique only within the current collection state, or should deleted ids never be reused later?
   Current docs only require uniqueness, not monotonicity or permanence.

3. Should deleting a task preserve the relative order of remaining tasks?
   This is the most natural minimal behavior, but it is not explicitly stated in docs.

## Proposed minimal direction for review
Pending review, the smallest conservative implementation appears to be:
- remove the matching task by id
- return a new array
- preserve the order of the remaining tasks
- avoid changing unrelated domain behavior
- leave missing-id behavior explicitly reviewable rather than hiding it behind a broader refactor
