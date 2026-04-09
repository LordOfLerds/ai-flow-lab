# Drift Register

Records conflicts between documented truth and tested code.

## Active Drift

### DRIFT-002: Complete domain mismatch - docs describe task management, code implements jump-and-run game
- **Discovered**: T-0014 (2026-04-07)
- **Source code**: `index.html` — implements a complete 2D platformer jump-and-run game with player, enemies, levels, skills, power-ups, etc.
- **DOMAIN_MODEL.md**: Documents a task management system with Task entities (id, title, status).
- **INVARIANTS.md**: Documents task management rules (unique IDs, status transitions).
- **ARCHITECTURE.md**: Documents TypeScript project structure with tasks.ts, not browser-based game.
- **Status**: CRITICAL — documentation is completely unrelated to actual codebase.
- **Risk**: All domain documentation is incorrect and unusable for the actual implemented system. No documentation exists for the game entities, rules, or architecture that actually exist in the codebase.
- **Action required**: Owner must decide whether to:
  1. Keep task management docs and remove/replace jump-and-run game code, OR
  2. Update docs to reflect actual jump-and-run game implementation, OR
  3. Maintain separate documentation for both domains if both are intended

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

### DRIFT-004: LOGIN phase state access by external tests
- **Discovered**: T-0015 (2026-04-08)
- **Issue**: Browser-based smoke tests need to inspect and manipulate authentication state for validation
- **Clarification**: Tests access global `gs` object and call exposed game functions (`renderLogin()`) for state inspection and reset between test runs
- **Resolution**: This is acceptable test infrastructure, not game code modification. Tests are read-only validation with necessary state introspection.
- **Status**: RESOLVED — Test access to global state is documented as external validation methodology
- **Constraints applied**: 
  1. Tests must not modify game logic or implementation
  2. Tests can read `gs.phase` and `gs.auth` for state validation
  3. Tests can call exposed functions like `renderLogin()` for cleanup between tests
  4. Tests remain external to the game codebase (in `/tests` directory)

## Resolved Drift
- DRIFT-003: Start UI visibility for alternative entry points (resolved in T-0018)
- DRIFT-004: LOGIN phase state access by external tests (resolved in T-0015)
