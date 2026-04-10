# ADR-0001: Reversible Archive Behavior — Decision Framing

## Status
OPEN — awaiting owner decisions before implementation

## Context
Goal G-0001 proposes introducing reversible task lifecycle with archive semantics.
The current domain model defines `Task.status` as `"open" | "done"` only.
Code contains a `deleteTask` function that permanently removes tasks, but this
function is not documented in DOMAIN_MODEL.md or INVARIANTS.md.

Before any archive behavior can be safely implemented, several unresolved
questions must be answered by the project owner.

## Unresolved Decisions

### D1: Should `deleteTask` become documented domain behavior?
- **Current state**: `deleteTask` exists in code and tests but is absent from
  DOMAIN_MODEL.md and INVARIANTS.md.
- **Options**:
  a. Document `deleteTask` as permanent removal — keep current behavior.
  b. Replace `deleteTask` with `archiveTask` — soft-delete with restore capability.
  c. Keep both: `archiveTask` for soft-delete, `deleteTask` for permanent removal.
  d. Remove `deleteTask` entirely — no deletion allowed.
- **Recommendation**: Option (b) or (c), but this is an owner decision.

### D2: Should `"archived"` become a first-class `TaskStatus`?
- **Current state**: `TaskStatus = "open" | "done"`.
- **Options**:
  a. Add `"archived"` as a third status value.
  b. Use a separate `isArchived: boolean` flag alongside status.
  c. Keep status as-is and track archive state in a separate data structure.
- **Implications**: Option (a) is simplest but changes the type union everywhere.
  Option (b) preserves the existing status semantics.

### D3: Which transitions should be allowed?
- **Candidates**:
  - `open → archived` (archive an incomplete task)
  - `done → archived` (archive a completed task)
  - `archived → open` (restore to active)
  - `archived → done` (restore as completed)
- **Constraint**: Each allowed transition must be documented in DOMAIN_MODEL.md
  and have corresponding invariants before implementation.

### D4: Should archived tasks appear in `listTasks` results?
- **Current invariant**: `listTasks(tasks, status)` returns only exact-status matches.
- **Options**:
  a. Archived tasks are excluded unless `status === "archived"` is explicitly passed.
  b. Archived tasks are always excluded from `listTasks`; a separate `listArchived` function is needed.
  c. Add an `includeArchived` parameter.

### D5: Are archive operations reversible by design?
- **Options**:
  a. Always reversible (archive is never permanent).
  b. Reversible within a time window, then permanent.
  c. Reversible only with explicit owner action.

## Consequences
- No archive code should be written until at least D1, D2, and D3 are resolved.
- `deleteTask` drift must be acknowledged (see drift-register.md).
- Safe preparatory work (docs, test audits) may proceed in parallel.

## Decision Record
| Decision | Status          | Selected Option | Decided By | Date |
|----------|-----------------|-----------------|------------|------|
| D1       | OPEN            | —               | —          | —    |
| D2       | OPEN            | —               | —          | —    |
| D3       | OPEN            | —               | —          | —    |
| D4       | OPEN            | —               | —          | —    |
| D5       | OPEN            | —               | —          | —    |
