# T-0100 Implementation Brief

## Goal
Produce a documentation-only decision record that makes the current archive/delete uncertainty explicit and unblocks later implementation of any reversible archive behavior.

Resolve the task contradiction explicitly:
- Although this is labeled a `feature-lane`, the truth sources do not define archive behavior well enough for safe code changes.
- Therefore the minimal valid execution for T-0100 is **recording the decision set and current drift**, not implementing archive logic.

## Scope
In scope:
- Add a written decision artifact capturing that reversible archive behavior is currently underdefined.
- Record the current doc/code drift around `deleteTask`.
- Enumerate the exact decisions that must be made before archive behavior can become domain truth.
- Keep all currently documented domain rules intact unless explicitly marked as future decision points.

Out of scope for this task:
- Adding archive code.
- Adding restore/unarchive code.
- Changing task state model in implementation.
- Updating tests to enforce archive behavior that is not yet documented.

## Constraints
- Docs are the primary truth.
- Do not invent archive business rules as settled behavior.
- Current documented rules remain authoritative:
  - `Task.status` is `"open" | "done"`.
  - new tasks start `"open"`.
  - only existing tasks can be marked done.
  - `listTasks(tasks, status)` returns only exact-status matches.
  - task IDs remain unique.
  - immutability invariants remain unchanged.
- If docs and tested code disagree, the conflict must be written to `ai/current-state/drift-register.md`.
- Resolve review concern about artifact placement explicitly: the decision record should live in `docs/ADR/`, because `AGENTS.md` identifies `docs/ADR/` as a source of truth and this task is about recording decisions, not changing domain rules yet.
- Do not silently treat current `deleteTask` behavior as approved domain behavior.

## File targets
- `docs/ADR/`  
  - Add a new ADR for reversible archive decision framing and unresolved choices.
- `ai/current-state/drift-register.md`  
  - Add or update an entry for the mismatch between documented operations/statuses and current `deleteTask` code/tests.
- `ai/specs/T-0100_spec.md`  
  - Only if needed to align wording with the chosen minimal policy and artifact target; keep edits minimal.

## Tests required
Required verification for this task:
- Run relevant existing tests to confirm current baseline and to surface existing delete behavior under test.
- Confirm no new tests are added for archive behavior, because archive is not yet documented truth.
- If any test/doc mismatch is observed, ensure it is reflected in `ai/current-state/drift-register.md`.

No new functional tests are required for T-0100 because:
- this task does not implement archive behavior,
- and adding archive tests now would falsely harden undecided rules.

## Chosen minimal policy
1. **Treat T-0100 as a documentation decision-record task despite `feature-lane` labeling.**
   - This resolves the lane contradiction in favor of truth-source safety.

2. **Create an ADR, not a code change, as the primary artifact.**
   - The ADR must state that archive behavior is not yet domain truth.
   - The ADR must capture the minimum decision set required before implementation.

3. **Record `deleteTask` as current drift/uncertainty, not approved product behavior.**
   - Because docs omit deletion while code/tests include it, this must be logged in the drift register.

4. **Do not choose archive semantics yet.**
   The ADR must explicitly mark these as unresolved decisions:
   - whether archive exists,
   - whether archive replaces delete or coexists with it,
   - whether current delete is valid behavior or drift,
   - whether archive is reversible,
   - what restore means,
   - whether archive is represented by status expansion or another field,
   - whether archived tasks are still considered “existing,”
   - whether `done -> archived -> restored` returns to `done`, `open`, or another defined state,
   - listing semantics for archived tasks,
   - whether ID uniqueness and immutability guarantees apply unchanged through archive/restore.

5. **Do not revise `docs/DOMAIN_MODEL.md` or `docs/INVARIANTS.md` yet unless the task executor finds they must reference the ADR.**
   - Since no archive policy is actually decided here, avoid prematurely changing domain truth docs.

## Risks
- The task may appear incomplete to stakeholders expecting feature implementation; mitigate by explicitly documenting that missing domain decisions block safe implementation.
- Recording only the decision set may leave the archive feature still unimplemented; this is intentional and should be stated clearly.
- If the ADR wording accidentally implies chosen archive semantics, it could create new ambiguity; keep unresolved items clearly labeled as undecided.
- Existing `deleteTask` tests may continue to normalize undocumented behavior until a later task resolves whether delete remains supported.
- If `docs/ADR/` has naming conventions not visible in provided truth files, the chosen ADR filename may need minor adjustment.

## Explicit non-goals
- Do not implement `archiveTask`, `restoreTask`, or any replacement for `deleteTask`.
- Do not add `archived` to `Task.status`.
- Do not add an `archived` field or any other model field.
- Do not alter `listTasks` behavior.
- Do not remove `deleteTask` from code/tests in this task.
- Do not decide restoration semantics.
- Do not decide whether archived tasks count as existing for transition rules.
- Do not add archive-related tests.