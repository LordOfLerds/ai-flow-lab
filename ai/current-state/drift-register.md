# Drift Register

Records conflicts between documented truth and tested code.

## Active Drift

### DRIFT-001: `deleteTask` exists in code but not in docs
- **Discovered**: T-0100 (2026-04-04)
- **Source code**: `starter-test/src/tasks.ts` — `deleteTask(tasks, id)` filters out the task by ID.
- **Tests**: `deleteTask` is tested and passes.
- **DOMAIN_MODEL.md**: Does not mention delete or removal operations.
- **INVARIANTS.md**: Does not mention delete behavior or constraints.
- **Status**: UNRESOLVED — requires owner decision (see ADR-0001, Decision D1).
- **Risk**: If archive behavior is built on top of current `deleteTask`, undocumented
  assumptions about permanent removal become load-bearing. Any later change to
  `deleteTask` semantics could break archive behavior silently.
- **Action required**: Owner must decide whether `deleteTask` is approved domain
  behavior before any archive implementation proceeds.

## Resolved Drift
(none yet)
