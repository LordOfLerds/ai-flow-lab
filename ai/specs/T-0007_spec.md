# T-0007 Spec

## Task metadata

- Task id: T-0007
- Title: document archive interactions with existing operations
- Lane type: docs-lane
- Executor: codex
- Project: `ai-flow-lab`

## Problem statement

The current documented domain covers `Task`, `createTask`, `markDone`, and `listTasks`, but it does not define any archive behavior or how an archive concept should interact with existing task operations.

Optional code context shows an additional `deleteTask` operation in `starter-test/src/tasks.ts` with test coverage in `starter-test/tests/tasks.test.ts`, but this operation is not described in the documented source of truth. There is no documented archive entity, archive state, or archive operation in the provided truth files.

This creates a documentation gap for the requested topic: "archive interactions with existing operations." The spec must therefore define the documentation work needed without inventing archive business rules that are not present in the current docs.

## Source of truth

Primary truth sources identified in repository documentation:

- `docs/DOMAIN_MODEL.md`
- `docs/INVARIANTS.md`
- `docs/ARCHITECTURE.md`
- `docs/ADR/` (listed as a truth source, but no ADR content was provided in the task context)
- `AGENTS.md`
- `ai/project.config.yaml`

Relevant documented facts from provided truth files:

- `Task` has:
  - `id: integer`
  - `title: string`
  - `status: "open" | "done"`
- Rules:
  - Task ids should be unique.
  - A newly created task must start with status `"open"`.
  - Only existing tasks can be marked done.
- Invariants:
  - `createTask` must not mutate prior task objects.
  - `markDone` must only change the matching task.
  - `listTasks(tasks, status)` must only return tasks with that exact status.
- Architecture:
  - Domain logic is in `starter-test/src/tasks.ts`
  - Tests are in `starter-test/tests/tasks.test.ts`
  - Docs are the primary truth.
  - If tested behavior and docs disagree, the conflict must be written to `ai/current-state/drift-register.md`.

Optional code context introduces uncertainty:

- `deleteTask(tasks, id)` exists in code and tests.
- No archive operation exists in the provided code.
- No archive behavior is defined in the provided docs.
- Because docs are primary truth, `deleteTask` and any inferred archive semantics cannot be treated as established business rules from docs alone.

## Desired behavior

This task should produce documentation that explains archive interactions with existing operations only to the extent supported by current repository truth, while explicitly calling out missing or conflicting definitions.

The spec should guide documentation to:

1. State that archive behavior is currently undocumented in the provided source-of-truth files.
2. Enumerate the existing documented operations and rules that any future archive behavior would need to relate to:
   - task creation
   - marking a task done
   - listing tasks by exact status
3. Call out that the current documented task status model only includes:
   - `"open"`
   - `"done"`
4. Explicitly identify that no documented archive status, archive flag, archive entity, or archive operation exists in the provided docs.
5. Explicitly identify the code/docs drift around `deleteTask`:
   - code and tests include `deleteTask`
   - docs do not describe `deleteTask`
   - therefore any relationship between archive and delete is currently unspecified in documentation
6. Require uncertainty to be preserved rather than resolved by assumption.
7. If documentation work references code behavior beyond the docs, require that it be labeled as current implementation context rather than canonical documented behavior.
8. If archive behavior is intended to be added later, require follow-up clarification before specifying:
   - whether archive is a new status
   - whether archived tasks remain listable
   - whether archived tasks can be marked done
   - whether archived tasks can be deleted
   - whether archive replaces or complements delete

## Constraints

- Do not invent archive business rules not present in the provided docs.
- Do not treat optional code context as authoritative over documentation.
- Do not silently reconcile undocumented `deleteTask` with any archive concept.
- Preserve the documented status model exactly as currently stated unless a separate truth update is provided.
- Any mention of `deleteTask` must be marked as implementation/test context that is ahead of docs, or as a docs/code drift item.
- Per architecture and agent guidance, any disagreement between docs and tested behavior must be documented in `ai/current-state/drift-register.md`.
- The output is a documentation spec, not an implementation plan or code change.

## Acceptance criteria

- The spec uses the repository docs as primary truth.
- The spec explicitly states that archive behavior is not defined in the provided source-of-truth files.
- The spec documents the existing task model and operations relevant to archive discussions:
  - `Task`
  - `createTask`
  - `markDone`
  - `listTasks`
- The spec explicitly notes that documented task status values are only `"open"` and `"done"`.
- The spec explicitly identifies undocumented implementation context:
  - `deleteTask` exists in code/tests
  - `deleteTask` is absent from provided docs
- The spec explicitly states uncertainty about how archive should interact with:
  - listing
  - marking done
  - deletion
  - status representation
- The spec references the drift handling rule requiring documentation in `ai/current-state/drift-register.md` when docs and tested behavior disagree.
- The spec does not define new archive semantics, status values, or invariants without supporting documentation.

## Risks

- The request may imply a desired archive feature that is not yet represented in the documented domain model.
- Optional code context may tempt over-specification, especially by inferring archive behavior from `deleteTask`.
- Documenting archive interactions without explicit truth could create false product rules.
- The current code/docs drift around `deleteTask` may confuse readers if not clearly labeled as uncertainty.
- If ADRs contain archive guidance not included in the provided context, this spec may be incomplete; that uncertainty should be acknowledged.

## Open questions

- Is "archive" intended to be:
  - a new task status,
  - a separate boolean/property,
  - a separate collection,
  - or a behavior layered on top of deletion?
- Should archived tasks still be returned by `listTasks(tasks)` with no status filter?
- Should archived tasks be filterable through `listTasks`, and if so, how, given the documented status model only includes `"open"` and `"done"`?
- Can an archived task be marked done?
- Can a done task be archived?
- Can an archived task be deleted?
- Is `deleteTask` intended to remain supported, be documented, or be replaced by archive behavior?
- Are there ADRs or other missing truth documents that already define archive semantics?