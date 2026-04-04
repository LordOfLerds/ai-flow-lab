# T-0004 Implementation Brief

## Goal
Add a domain-level `deleteTask(tasks, id)` function that removes one existing task by id from the returned task array.

## Scope
In scope:
- add `deleteTask` in `starter-test/src/tasks.ts`
- add or update tests in `starter-test/tests/tasks.test.ts`
- optional minimal demo adjustment in `starter-test/src/index.ts` only if needed for consistency

Out of scope:
- changing task identity policy beyond what is required for deletion
- persistence
- soft delete / tombstones
- broader refactors
- redesign of `createTask`

## Constraints
- keep the change minimal and reviewable
- do not silently expand scope
- preserve the current functional style
- do not mutate the original input array in place
- keep existing behavior of unrelated functions intact unless correctness requires change
- if docs and tested code still disagree, document drift in `ai/current-state/drift-register.md`

## File targets
Primary:
- `starter-test/src/tasks.ts`
- `starter-test/tests/tasks.test.ts`

Optional:
- `starter-test/src/index.ts`

## Tests required
At minimum:
1. deleting an existing id removes exactly that task
2. remaining tasks are preserved
3. remaining tasks preserve relative order
4. the original input array is not mutated in place

Recommended additional tests:
5. deleting from an empty array
6. deleting a non-existing id

## Chosen minimal policy
Until docs state otherwise:
- `deleteTask(tasks, id)` should return a new array
- if the id exists, remove that task
- if the id does not exist, return the unchanged task collection content without throwing
- preserve order of remaining tasks

## Risks
1. The missing-id policy is not explicitly defined in the truth docs.
   The chosen behavior is conservative and minimal, but should be kept visible in tests.

2. Deleting tasks may interact indirectly with future id-generation policy questions.
   That policy is not to be changed in this task.

## Explicit non-goals
- no changes to `createTask` id generation
- no change to `markDone` behavior beyond already existing work
- no CLI redesign
- no collection class / persistence abstraction
