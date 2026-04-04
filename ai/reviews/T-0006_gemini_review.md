# T-0006 Gemini Review

## Review target
- File: `ai/specs/T-0006_spec.md`
- Task: Add `archiveTask` function to the task domain.

## Contradictions
- **Status Union Conflict:** The spec acknowledges that `DOMAIN_MODEL.md` restricts status to `"open" | "done"`. However, the "Desired behavior" section suggests introducing the function without resolving this type-level restriction. If `archiveTask` sets status to `"archived"`, it directly violates the documented entity definition.
- **Invariant Conflict:** `INVARIANTS.md` states `listTasks(tasks, status)` must return tasks with that exact status. If archiving is implemented via a status change to `"archived"`, but `"archived"` is not a valid status in the domain model, the invariant becomes logically impossible to satisfy within the current type system.

## Missing edge cases
- **Double Archiving:** Behavior when `archiveTask` is called on a task that is already archived.
- **Archiving Non-existent Tasks:** Whether the function should throw an error or return the original array (to match `markDone` behavior which implies "only existing tasks").
- **State Prerequisites:** Can an `"open"` task be archived directly, or must it be `"done"`?
- **Immutability:** While mentioned as a risk, the spec does not explicitly mandate that `archiveTask` must return a new array and new object, which is a core pattern in `createTask` and `markDone`.

## Scope risks
- **Ambiguity as Implementation Strategy:** The spec defines the behavior as "underdocumented" and suggests using `drift-register.md` as a primary path. This creates a risk where the developer (Codex) may implement a solution that doesn't align with the stakeholder's intent because the spec failed to provide a concrete proposal (e.g., "Add 'archived' to the status union").
- **Feature Creep vs. Incompleteness:** By not deciding if `archiveTask` is a status change or a filter-level removal, the scope might inadvertently include changes to `listTasks` logic to exclude archived tasks by default, which is not defined.

## Missing tests
- **Immutability Test:** Verify that the original task list is not mutated.
- **Type Integrity Test:** Verify that after archiving, the task list still adheres to the (potentially updated) domain model.
- **Exclusion Test:** Verify if `listTasks` (without status filter) includes or excludes archived tasks.
- **Idempotency Test:** Verify that archiving an already archived task results in no state change.

## Hidden assumptions
- **Persistence Assumption:** Assumes that an "archived" task remains in the collection (unlike `deleteTask`).
- **Signature Assumption:** Assumes the signature will be `(tasks: Task[], id: number) => Task[]` to match existing domain patterns, though this is not explicitly stated.
- **Drift Acceptance:** Assumes that documenting drift is an acceptable substitute for updating the source of truth (`DOMAIN_MODEL.md`) during the feature implementation.

## Recommended corrections
- **Define Data Strategy:** Instead of leaving the implementation "uncertain," the spec should mandate a specific approach: "Update `DOMAIN_MODEL.md` to include `"archived"` in the `status` union" OR "Add a `deleted: boolean` field." (Status union is recommended for consistency).
- **Explicit Signature:** Define the expected TypeScript signature for the new function.
- **Mandate Invariant Consistency:** Explicitly state that `archiveTask` must follow the same immutability rules as `markDone` and `createTask`.
- **Pre-emptive Doc Update:** Change the instruction from "documenting drift" to "The executor must update `docs/DOMAIN_MODEL.md` and `docs/INVARIANTS.md` as part of this task to reflect the new state."
- **Define listTasks Interaction:** Explicitly state whether archived tasks should be filtered out of standard lists.