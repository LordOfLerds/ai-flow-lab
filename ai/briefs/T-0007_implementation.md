# T-0007 Implementation Brief

## Goal

Document the current state of archive-related behavior without inventing new archive semantics.

The brief must ensure the docs clearly state:
- archive behavior is not defined in the current source-of-truth files
- the existing documented model only supports task statuses `"open"` and `"done"`
- any interaction between a future archive concept and existing operations is currently unspecified
- `deleteTask` is implementation/test context ahead of docs and must be treated as docs/code drift, not canonical domain behavior

## Scope

Tight scope for this docs-lane task:

- Update repository documentation to describe the current documented boundaries relevant to archive discussions.
- Enumerate the existing documented operations/archive-adjacent touchpoints:
  - `Task`
  - `createTask`
  - `markDone`
  - `listTasks`
- Explicitly state that no documented archive concept currently exists:
  - no archive status
  - no archive flag/property
  - no archive entity
  - no archive operation
- Explicitly document unresolved interaction questions rather than answering them:
  - whether archive would be a status vs separate property
  - whether archived tasks remain listable
  - whether archived tasks can be marked done
  - whether archived tasks can be deleted
  - whether archive complements or replaces deletion
  - whether unarchive exists
- Record the code/docs drift for `deleteTask` in `ai/current-state/drift-register.md` if not already present, because tested behavior and docs disagree.

Resolve contradiction explicitly:
- The request asks to document archive interactions, but source-of-truth docs do not define archive.
- Chosen resolution: document the absence, boundaries, and open questions only; do not define archive rules.

## Constraints

- Do not implement code.
- Do not invent archive business rules.
- Do not add new status values to the documented model.
- Do not silently reconcile `deleteTask` with archive.
- Do not treat code/tests as authoritative over docs.
- If code or tests are referenced, label them as current implementation context or drift.
- Preserve existing documented truths exactly:
  - `Task.status` is only `"open" | "done"`
  - `createTask` starts tasks as `"open"`
  - `markDone` applies only to existing tasks
  - `listTasks(tasks, status)` returns only tasks with that exact status
- Acknowledge uncertainty that ADR content was not provided; do not claim archive is undefined repo-wide beyond the provided truth set.
- No edits outside assigned task scope.

## File targets

Primary expected targets:
- `docs/DOMAIN_MODEL.md`
- `docs/INVARIANTS.md` only if needed to add clarifying non-semantic wording about current absence of archive rules; avoid changing invariants unless strictly necessary
- `docs/ARCHITECTURE.md` only if needed to clarify documentation boundaries; avoid unless necessary
- `ai/current-state/drift-register.md`

Preferred minimal edit strategy:
- Put archive-gap clarification in the most appropriate docs file(s), likely domain-oriented documentation.
- Put `deleteTask` mismatch in `ai/current-state/drift-register.md`.
- Avoid broad restructuring or creating new feature docs unless required by repository patterns.

## Tests required

Verification for this docs task should be minimal but explicit:

- Confirm documentation states archive behavior is currently undefined in the provided source-of-truth docs.
- Confirm documentation still reflects only documented status values:
  - `"open"`
  - `"done"`
- Confirm documentation does not introduce:
  - archive invariants
  - archive transitions
  - archive/list semantics
  - archive/delete semantics
  as settled rules.
- Confirm `deleteTask` docs/code drift is recorded in `ai/current-state/drift-register.md`.
- Run relevant tests per agent rules to ensure no incidental breakage from documentation-only changes.
- Verify changed files are limited to scoped documentation targets.

## Chosen minimal policy

Document absence, not invention.

Applied policy:
1. Source-of-truth docs win over code/tests.
2. Archive is treated as an undocumented concept in current truth files.
3. Existing operations are documented as the only canonical interactions:
   - create
   - mark done
   - list by exact status
4. `deleteTask` is treated as implementation/test drift, not a basis for archive semantics.
5. Open questions are preserved explicitly instead of resolved.
6. If future archive behavior is desired, it should be introduced via an explicit truth update, ideally ADR-backed if it changes domain semantics.

## Risks

- The requester may expect actual archive rules, but this task should not create them from inference.
- Over-editing could accidentally change the documented domain rather than clarifying its current limits.
- Mentioning `deleteTask` without clear drift labeling could imply it is canonical.
- If undisclosed ADRs define archive behavior, the brief may understate repo truth; wording should stay bounded to the provided truth sources / available truth set.
- A too-minimal doc update may feel unsatisfying, but it is safer than fabricating behavior.

## Explicit non-goals

- Defining an archive feature.
- Adding an `archived` status.
- Specifying archive/unarchive transitions.
- Deciding whether archived tasks appear in listings.
- Deciding whether archived tasks can be marked done.
- Deciding whether done tasks can be archived.
- Deciding whether archived tasks can be deleted.
- Deciding whether archive replaces or complements `deleteTask`.
- Documenting `deleteTask` as canonical domain behavior.
- Creating or changing implementation code.