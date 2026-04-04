# T-0005 Gemini Review

## Review target
- **File:** `ai/specs/T-0005_spec.md`
- **Objective:** Define the implementation details for the `updateTaskTitle` function while adhering to the established domain model and invariants.

## Contradictions
- **Missing Task Behavior:** The spec notes uncertainty regarding missing-task behavior but then suggests "the safest spec is to... throw an error." However, the `AGENTS.md` and `ARCHITECTURE.md` state that if behavior is not in the docs, it must be recorded in `drift-register.md`. The spec should explicitly mandate that *if* throwing is implemented (to match `markDone`), it *must* be logged as drift since `DOMAIN_MODEL.md` currently only defines existence requirements for `markDone`.
- **Data Types:** The spec uses "task identifier," whereas `DOMAIN_MODEL.md` explicitly defines `id: integer`. The spec should use the concrete type to avoid ambiguity in implementation.

## Missing edge cases
- **Status Preservation (Done Tasks):** While the spec mentions preserving status, it does not explicitly state whether updating a title is permitted for tasks where `status: "done"`. Given `markDone` is a terminal state in many systems, this needs clarification.
- **Idempotent Updates:** Updating a task title to the exact same string it currently possesses.
- **Empty Collection:** Behavior when `updateTaskTitle` is called on an empty array.
- **Title Strings:** The spec notes "No spec requirement for non-empty titles," but does not address the behavior of whitespace-only strings or very long strings relative to the "small TypeScript test project" context.

## Scope risks
- **Documentation Drift:** There is a risk that the executor will implement specific error handling (like throwing) without updating `ai/current-state/drift-register.md`, violating the Workflow Truth Policy.
- **Over-Engineering Validation:** Since the spec explicitly says "not to invent undocumented business rules," there is a risk the developer might ignore standard defensive programming (like checking for `null/undefined`) which could lead to runtime crashes in the demo entry point.

## Missing tests
- **Order Preservation:** A test ensuring that the position of the task in the array (if an array is used) or the general structure of the collection is not disrupted (e.g., the updated task moving to the end).
- **Status Persistence:** A specific test case for a task with `status: "done"` to ensure it stays `done` after the title change.
- **Isolation Test:** A test with at least 3 tasks, updating the middle one, and verifying the first and last remain strictly identical (deep equality).

## Hidden assumptions
- **Collection Type:** The spec assumes `tasks` is an array-like structure (based on `listTasks` mention), but doesn't explicitly define the input/output type for the collection.
- **Immutability:** The spec assumes an immutable pattern ("returns a task collection") based on existing invariants for `createTask`, but `updateTaskTitle` is not yet listed in `INVARIANTS.md`.

## Recommended corrections
- **Explicit Drift Instruction:** Add a requirement to the Acceptance Criteria: "If the function is implemented to throw an error for missing IDs, this undocumented behavior must be added to `ai/current-state/drift-register.md`."
- **Status Clarification:** Specify that `updateTaskTitle` should function regardless of the task's current `status` ("open" or "done") unless a new rule is added to the domain model.
- **Type Strictness:** Change "task identifier" to "integer id" in the Desired Behavior section to match `DOMAIN_MODEL.md`.
- **Invariant Proposal:** Add a requirement to suggest a new invariant in the `drift-register.md`: "`updateTaskTitle` must only change the matching task's title."