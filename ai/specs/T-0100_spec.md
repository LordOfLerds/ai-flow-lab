# T-0100 Spec

## Task metadata

- task_id: `T-0100`
- title: `Record explicit decision set for reversible archive behavior`
- lane_type: `feature-lane`
- executor: `codex`

## Problem statement

The documented domain model defines only three task operations and states:

- create a task
- mark a task done
- list tasks by exact status
- statuses limited to `"open"` and `"done"`

The current code and tests also include `deleteTask`, but deletion is not documented in the primary truth files. The task title requests a spec for a “reversible archive behavior,” which implies an alternative to destructive deletion and likely introduces explicit decisions about whether archived items can be restored.

However, no provided truth source defines:

- an archive concept
- an `archived` status
- whether archive replaces delete
- whether archive is reversible and how
- how archived tasks should appear in listing behavior

Because docs are the primary truth, this spec must record the decision space and constraints without inventing business rules that are not documented.

## Source of truth

Primary truth sources consulted:

- `docs/DOMAIN_MODEL.md`
- `docs/INVARIANTS.md`
- `docs/ARCHITECTURE.md`
- `AGENTS.md`
- `ai/project.config.yaml`

Relevant documented facts:

- `Task.status` is documented as `"open" | "done"`.
- Newly created tasks must start as `"open"`.
- Only existing tasks can be marked done.
- `listTasks(tasks, status)` must only return tasks with that exact status.
- Docs are the primary truth.
- If docs and tested behavior disagree, the conflict must be recorded in `ai/current-state/drift-register.md`.

Observed but undocumented implementation detail:

- `starter-test/src/tasks.ts` contains `deleteTask(tasks, id)`.
- `starter-test/tests/tasks.test.ts` verifies deletion behavior.

This indicates current code/tests are ahead of docs or in drift from docs. That uncertainty must be treated explicitly.

## Desired behavior

This task should produce an explicit decision record for reversible archive behavior before implementation changes are treated as settled.

Given the current documentation, the spec can safely establish the following desired outcome for the decision record:

1. **Archive behavior must be documented before it is treated as domain truth.**
   - The current docs do not define archive behavior.
   - Any feature work introducing reversible archive behavior must first resolve the missing domain decisions in documentation.

2. **The relationship between delete and archive must be made explicit.**
   - Current code/tests support deletion.
   - Current docs do not mention deletion.
   - A decision is required on whether:
     - archive replaces delete,
     - archive coexists with delete, or
     - current delete behavior is removed as unsupported drift.

3. **If archive is reversible, the reversal operation must be explicitly defined.**
   - The task title implies reversibility.
   - The docs do not define whether reversal restores the prior state, restores to `"open"`, or follows some other rule.
   - This must be documented rather than inferred.

4. **Status model changes must be explicitly documented if archive is represented in status.**
   - The documented `Task.status` union currently allows only `"open"` and `"done"`.
   - If archive introduces a new state such as `"archived"`, the domain model and list invariants must be updated accordingly.
   - If archive is not represented as status, the alternative representation must be documented.

5. **List behavior for archived tasks must be explicitly defined.**
   - Current invariant states exact-status filtering only.
   - If archived tasks exist, the docs must state whether:
     - they are listable by exact status,
     - hidden from default listing,
     - included in unfiltered listing, or
     - excluded unless specifically requested.

6. **Non-destructive behavior expectations must be documented if archive is intended as reversible.**
   - “Reversible archive” strongly suggests preserving task data rather than removing it.
   - This should be captured as an explicit rule if adopted.

7. **Any conflict between current delete behavior and the archive decision must be recorded as drift until docs and implementation align.**
   - Because tests currently assert deletion, and docs do not define it, this cannot be silently resolved.

## Constraints

- Do not invent business rules not present in the provided documentation.
- Docs are the primary truth.
- Current code/tests may be ahead of docs; this remains uncertain and must be stated as uncertainty, not treated as approved behavior.
- Existing documented domain rules must remain valid unless intentionally revised in docs:
  - task IDs unique
  - created tasks start `"open"`
  - only existing tasks can be marked done
  - `listTasks(tasks, status)` returns only exact-status matches
- Any archive design that changes the `Task` shape or status values requires corresponding updates to:
  - `docs/DOMAIN_MODEL.md`
  - `docs/INVARIANTS.md`
- Any disagreement between docs and tested code must be recorded in:
  - `ai/current-state/drift-register.md`
- No implementation details should be assumed beyond what is necessary to define the decision set.

## Acceptance criteria

- A written spec exists that explicitly identifies reversible archive behavior as **underdocumented** in current truth sources.
- The spec explicitly records that current docs do **not** define:
  - archive
  - restore/unarchive
  - archived listing semantics
  - delete vs archive precedence
- The spec explicitly records that current code/tests include `deleteTask`, while docs do not, and labels this as a documented uncertainty/drift situation rather than accepted domain truth.
- The spec identifies the minimum decision areas that must be resolved before implementation can be considered aligned:
  - whether archive exists
  - whether archive is reversible
  - whether delete remains supported
  - how archive is represented in the model
  - how listing behaves for archived tasks
  - what restoration does
- The spec does not introduce undocumented business rules as if already decided.
- The spec preserves existing documented invariants unless they are explicitly called out as needing revision if archive is adopted.

## Risks

- **Doc/code drift risk:** Current tests validate deletion, but docs do not. Adding archive behavior without first resolving this may deepen inconsistency.
- **Model expansion risk:** Introducing archive may require changing the documented `Task.status` union, which impacts invariants and list semantics.
- **Ambiguity risk:** “Reversible archive” can mean multiple behaviors; implementing without explicit documentation could produce incorrect domain behavior.
- **Compatibility risk:** If archive replaces delete, existing tests and any consumers relying on deletion semantics may need updates.
- **Listing semantics risk:** Without explicit rules, archived tasks may be inconsistently included or excluded in task queries.

## Open questions

1. Is archive intended to replace `deleteTask`, or exist alongside it?
2. Is current `deleteTask` considered valid product behavior, or undocumented drift that should be reconciled?
3. Should archive be represented as:
   - a new `status` value,
   - a separate field,
   - or another mechanism not yet documented?
4. If a task is archived, should `listTasks(tasks)` include it by default?
5. If a task is archived, should `listTasks(tasks, status)` support querying archived tasks, and if so, how?
6. What does “reversible” mean exactly:
   - restore to prior status,
   - restore to `"open"`,
   - or another defined state?
7. Can a `"done"` task be archived?
8. Can an archived task be marked done, or must it be restored first?
9. Are archived tasks considered “existing tasks” for the rule “Only existing tasks can be marked done”?
10. Should ID uniqueness and immutability guarantees apply unchanged to archive and restore operations?
11. Should the unresolved delete/archive discrepancy be entered into `ai/current-state/drift-register.md` as part of this task, if not already recorded?