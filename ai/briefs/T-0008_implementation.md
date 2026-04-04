# T-0008 Implementation Brief

## Goal
Verify, using approved repository truth sources, whether task archive behavior is already defined anywhere.

Resolve the current ambiguity narrowly:
- Confirm whether any primary truth source defines `archive`, archived state, soft-delete-like semantics, or an equivalent task lifecycle behavior.
- Distinguish documented truth from non-truth implementation context.
- If tested code defines adjacent behavior such as deletion that is absent from primary docs, require drift registration rather than treating it as authoritative.

## Scope
In scope:
- Review approved truth sources named by repository policy:
  - `docs/DOMAIN_MODEL.md`
  - `docs/INVARIANTS.md`
  - `docs/ARCHITECTURE.md`
  - `docs/ADR/` (actual filesystem contents, if present)
- Review `ai/current-state/drift-register.md` to determine whether relevant drift is already recorded.
- Review implementation/tests only as secondary evidence for possible drift, not as truth, specifically to verify whether task lifecycle behavior exists in tested code that is not documented.
- Produce a concise outcome stating one of:
  - archive behavior is documented in truth sources, with file references; or
  - no archive behavior is documented in truth sources, with explicit note that deletion/test behavior is not equivalent and may be drift.

Out of scope:
- Defining archive semantics.
- Updating domain rules beyond documenting verification findings and required drift handling.
- Reconciling delete vs archive by design decision.

## Constraints
- Docs are the primary truth.
- Do not invent archive behavior, archived status values, restore rules, retention rules, filtering rules, or delete/archive interactions.
- Search must not rely only on the literal word `archive`; also check likely synonyms or adjacent concepts, at minimum:
  - `archive`
  - `archived`
  - `soft-delete`
  - `soft delete`
  - `delete`
  - `deleted`
  - `retire`
  - `retired`
  - `inactive`
  - `hidden`
  - `remove`
- `docs/ADR/` must be checked on the actual filesystem if the directory exists. The prompt summary is insufficient.
- `ai/project.config.yaml` is not a provided truth file here; do not depend on it.
- Contradiction resolved explicitly: the spec’s “possible drift” wording is too weak. Per `docs/ARCHITECTURE.md` and `AGENTS.md`, if tested code defines deletion behavior absent from primary docs, that discrepancy must be recorded in `ai/current-state/drift-register.md` if not already present.
- Stay within docs-lane scope: verification and documentation only.

## File targets
Primary review targets:
- `docs/DOMAIN_MODEL.md`
- `docs/INVARIANTS.md`
- `docs/ARCHITECTURE.md`
- `docs/ADR/` (all files under this directory, if present)
- `ai/current-state/drift-register.md`

Secondary evidence targets for drift confirmation:
- `starter-test/src/tasks.ts`
- `starter-test/tests/tasks.test.ts`

Likely output targets:
- `ai/current-state/drift-register.md` only if deletion/test behavior is confirmed and not already registered
- task/report artifact only if the workflow expects a written verification note elsewhere; otherwise keep changes minimal

## Tests required
Manual verification checklist:
1. Enumerate all files inspected under `docs/ADR/`, or explicitly record that the directory does not exist / contains no files.
2. Search all truth sources for archive-related terms and synonyms listed above.
3. Confirm whether any truth source defines:
   - an archived task state
   - an archive operation
   - a soft-delete equivalent
   - any task lifecycle state beyond `open` and `done`
4. Confirm from `docs/DOMAIN_MODEL.md` that `Task.status` is limited to `"open" | "done"` unless another truth source explicitly extends it.
5. Check `ai/current-state/drift-register.md` for an existing entry covering undocumented deletion or archive-adjacent lifecycle behavior.
6. Inspect `starter-test/src/tasks.ts` and `starter-test/tests/tasks.test.ts` only to determine whether tested deletion behavior exists.
7. If deletion behavior exists in tested code and is absent from truth docs and not already registered, add a drift entry.
8. Report:
   - files searched
   - terms searched
   - whether archive behavior was found in truth sources
   - whether deletion drift was already recorded or newly registered

## Chosen minimal policy
Adopt the narrowest valid conclusion:
- Archive behavior is considered defined only if it appears in approved truth sources.
- Implemented or tested deletion behavior does not define archive behavior.
- If code/tests include deletion behavior absent from truth docs, treat that as documentation drift and register it if missing.
- If `docs/ADR/` contains no archive-related guidance, conclude: no approved truth source currently defines archive behavior.

## Risks
- `docs/ADR/` may contain relevant lifecycle guidance; skipping it would make the verification incomplete.
- Delete behavior in code/tests may be mistaken for archive semantics if the result is not phrased carefully.
- Existing drift may already be recorded; duplicating entries would add noise.
- Search terms that are too narrow could miss synonym-based definitions.

## Explicit non-goals
- Do not add archive behavior to docs.
- Do not change code or tests to align with docs.
- Do not decide whether delete should mean archive.
- Do not introduce new task states or APIs.
- Do not treat non-truth files as authoritative product behavior.