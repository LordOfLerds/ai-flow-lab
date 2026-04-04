# T-0100 Gemini Review

## Review target
- File: `ai/specs/T-0100_spec.md`
- Task: Record explicit decision set for reversible archive behavior

## Contradictions
- **Lane Type vs. Executor Goal**: The spec is categorized as a `feature-lane`, which typically implies implementation of code. However, the "Desired behavior" and "Acceptance criteria" focus almost exclusively on the act of documenting decisions and identifying gaps. There is a contradiction between a "feature" lane and a task that behaves like a "design/discovery" phase.
- **Drift Policy**: `AGENTS.md` states: "If docs and tested code disagree, do not decide silently. Document the conflict in `ai/current-state/drift-register.md`." The spec notes the drift regarding `deleteTask` but does not explicitly list "Update `ai/current-state/drift-register.md`" as a required action in the Acceptance Criteria, only as a risk/open question.

## Missing edge cases
- **Status Restoration Logic**: If a task is moved from `done` -> `archived` -> `restored`, the spec doesn't prompt for a decision on whether it returns to `done` or resets to `open`.
- **Constraint Conflicts**: If a task is archived, can it still be "marked done"? The domain rule "Only existing tasks can be marked done" needs a decision on whether an "archived" task counts as "existing" in the context of state transitions.
- **Uniqueness during Archive**: If a task is archived, does its ID remain reserved? (Relevant if "Archive" is used as a workaround for "Delete" to reuse IDs).

## Scope risks
- **Infinite Loop of Specification**: The spec defines its goal as producing a "decision record." If the executor (Codex) simply produces another list of questions, the task doesn't actually progress the codebase or the documentation toward a state of alignment.
- **Vague Artifact Target**: The spec does not define *where* the "explicit decision set" should be recorded. It mentions `docs/DOMAIN_MODEL.md` and `docs/INVARIANTS.md` as needing updates *if* changes are made, but doesn't mandate the creation of an ADR (Architecture Decision Record) which is usually where "decision sets" are stored according to the `Source of truth` section in `AGENTS.md`.

## Missing tests
- **Listing Invariant Test**: Tests must verify that `listTasks(tasks, "open")` and `listTasks(tasks, "done")` strictly exclude tasks with an `archived` status (or flag), maintaining the documented invariant that only exact matches are returned.
- **State Transition Tests**: Tests for the "reversible" aspect—verifying the object state before and after the archive/restore cycle.

## Hidden assumptions
- **Assumption of Status Expansion**: The spec assumes that "Archive" will likely be a new status in the `Task.status` union. It does not explicitly force a decision on whether "Archive" could be a boolean flag (`archived: boolean`), which would avoid changing the existing `status` type but complicate listing logic.
- **Assumption of Drift**: The spec assumes the existing `deleteTask` in code is "undocumented drift" rather than "canonical behavior with missing docs."

## Recommended corrections
- **Define the Output Artifact**: Explicitly state that the outcome of this task should be an ADR (e.g., `docs/ADR/001-reversible-archive.md`) and/or direct PRs to `docs/DOMAIN_MODEL.md` and `docs/INVARIANTS.md`.
- **Mandate Drift Registration**: Add a requirement to the Acceptance Criteria to update `ai/current-state/drift-register.md` regarding the `deleteTask` discrepancy discovered during the research phase.
- **Clarify Lane Type**: If no code is to be written, change the lane type or clarify that this task is a prerequisite "Design" task.
- **Enforce State Rules**: Add a requirement to define the valid "from/to" transitions for the archived state (e.g., `open -> archived`, `done -> archived`, `archived -> ?`).