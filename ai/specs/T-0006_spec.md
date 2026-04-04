# T-0006 Spec

## Task metadata

- **Task ID:** T-0006
- **Title:** add archiveTask function
- **Lane type:** feature-lane
- **Executor:** codex
- **Project:** ai-flow-lab

## Problem statement

The task requests adding an `archiveTask` function, but the current documented domain model does not define any archive concept, archived status, or archive lifecycle for `Task`.

Current docs define `Task.status` as only:

- `"open"`
- `"done"`

The current code also reflects this model and exposes task operations for create, list, mark done, and delete. There is no documented behavior for archiving, no archive-related invariants, and no acceptance rules for how an archived task should appear in listing or interact with existing operations.

Because docs are the primary truth, the feature request cannot be fully specified as implementation behavior without explicitly calling out this documentation gap.

## Source of truth

Primary truth reviewed:

- `docs/DOMAIN_MODEL.md`
- `docs/INVARIANTS.md`
- `docs/ARCHITECTURE.md`
- `AGENTS.md`
- `ai/project.config.yaml`

Relevant documented facts:

- `Task` has fields:
  - `id: integer`
  - `title: string`
  - `status: "open" | "done"`
- Rules:
  - Task ids should be unique.
  - A newly created task must start with status `"open"`.
  - Only existing tasks can be marked done.
- Invariants:
  - Task ids must be unique.
  - `createTask` must not mutate prior task objects.
  - `markDone` must only change the matching task.
  - `listTasks(tasks, status)` must only return tasks with that exact status.
- Architecture:
  - Domain logic lives in `starter-test/src/tasks.ts`
  - Tests live in `starter-test/tests/tasks.test.ts`
  - If tested behavior and docs disagree, the conflict must be written to `ai/current-state/drift-register.md`

Optional code context reviewed:

- `starter-test/src/tasks.ts`
- `starter-test/tests/tasks.test.ts`

Observed code supports:
- `createTask`
- `listTasks`
- `markDone`
- `deleteTask`

Uncertainty:
- The repository contains `deleteTask` in code and tests, but deletion is not described in the provided docs. That is pre-existing code/doc drift context, not enough to infer archive behavior.

## Desired behavior

Given the documentation-first policy, the spec can only safely state the minimum supported intent:

- Introduce an `archiveTask` function in the task domain module.
- The function should operate on the task collection and target a task by id, consistent with the style of existing task operations.

However, the exact business behavior is currently **underdocumented**. The following aspects are not defined by the source-of-truth docs and therefore remain uncertain:

- Whether archiving is represented by:
  - a new `status` value such as `"archived"`, or
  - removal from the active list, or
  - an additional boolean/field, or
  - another mechanism
- Whether only existing tasks can be archived
- Whether archiving should be reversible
- Whether archived tasks should appear in `listTasks`
- Whether `markDone` can be applied to archived tasks
- Whether archived tasks should be deletable
- Whether archiving must preserve immutability guarantees similar to `createTask` and `markDone`

If implementation proceeds before docs are updated, that behavior should be treated as provisional and the uncertainty should be documented as drift.

## Constraints

- Must follow the documented truth policy: docs are primary truth.
- Must not invent undocumented business rules.
- Must keep scope within task-domain logic and related tests/docs for this task.
- Any behavior added beyond current docs should be explicitly flagged as uncertain.
- If implementation or tests introduce archive semantics not present in docs, the conflict must be recorded in:
  - `ai/current-state/drift-register.md`
- Existing documented invariants must remain true unless docs are updated.
- Current documented `Task.status` union is only `"open" | "done"`, so any archive status would require a documentation change or a documented drift entry.

## Acceptance criteria

- A written spec exists for task `T-0006`.
- The spec explicitly states that `archiveTask` is requested but not fully defined by current documentation.
- The spec identifies the documentation gap around archive semantics.
- The spec avoids asserting undocumented archive rules as settled behavior.
- The spec points to the required drift-handling path if code/tests move ahead of docs.
- Any eventual implementation derived from this spec must not silently change documented task semantics.

## Risks

- **Primary risk: undocumented feature semantics.** Implementing `archiveTask` without doc updates may introduce unsupported business behavior.
- **Type/model drift risk.** If archive is modeled as a new status, it conflicts with the documented `Task.status` union.
- **Invariant ambiguity risk.** Existing invariants do not say whether archive operations must be immutable or affect listing behavior.
- **Test/doc divergence risk.** Adding tests for archive behavior before docs are updated may create a known drift situation.
- **Interaction risk with existing functions.** Archive behavior may conflict with `listTasks`, `markDone`, and `deleteTask` because their interaction with archived tasks is unspecified.

## Open questions

- How should archiving be represented in the domain model?
  - New `status` value?
  - Separate field?
  - Removal from active collection?
- Should `Task.status` be expanded beyond `"open" | "done"`?
- Should `archiveTask(tasks, id)` throw if the task does not exist, mirroring `markDone`?
- Can `"open"` tasks be archived?
- Can `"done"` tasks be archived?
- Should archived tasks still be returned by `listTasks(tasks)` with no status filter?
- Should `listTasks(tasks, status)` support an `"archived"` filter?
- Should `markDone` be allowed on archived tasks?
- Should `deleteTask` be allowed on archived tasks?
- Must `archiveTask` preserve immutability in the same way as other task operations?
- Should docs be updated first before implementation, or should any implementation be treated as provisional and recorded in `ai/current-state/drift-register.md`?