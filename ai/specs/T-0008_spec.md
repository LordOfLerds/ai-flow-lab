# T-0008 Spec

## Task metadata

- **Task ID:** T-0008
- **Title:** verify no additional truth sources already define archive behavior
- **Lane type:** docs-lane
- **Executor:** codex

## Problem statement

The task is to verify whether any existing truth sources in the repository already define "archive" behavior for tasks.

Current primary documentation defines the Task entity and core task rules, but the provided truth files do not mention an `archive` concept, archived task state, or archive-related operations. There is also optional code context that includes `deleteTask`, which may indicate behavior in code that is not reflected in the primary docs. Per repository policy, docs remain the primary truth, and any divergence between docs and tested code must be recorded rather than silently resolved.

This spec should therefore define the verification goal narrowly: confirm whether archive behavior is already specified anywhere in the approved truth sources, and document uncertainty where only code or tests suggest adjacent behavior.

## Source of truth

Primary truth sources, per `AGENTS.md` and `ai/project.config.yaml`:

- `docs/DOMAIN_MODEL.md`
- `docs/INVARIANTS.md`
- `docs/ARCHITECTURE.md`
- `docs/ADR/`

Repository findings from provided materials:

- `docs/DOMAIN_MODEL.md`
  - Defines `Task` with fields:
    - `id`
    - `title`
    - `status: "open" | "done"`
  - No archive state or archive operation is defined.
- `docs/INVARIANTS.md`
  - Defines invariants for `createTask`, `markDone`, and `listTasks`.
  - No archive behavior is defined.
- `docs/ARCHITECTURE.md`
  - Defines workflow truth policy and project structure.
  - No archive behavior is defined.
- `AGENTS.md`
  - Reaffirms source-of-truth ordering and drift handling.
  - Does not define archive behavior.
- `ai/project.config.yaml`
  - Reaffirms truth source locations.
  - Does not define archive behavior.

Optional code context, which is not primary truth:

- `starter-test/src/tasks.ts` includes `deleteTask`
- `starter-test/tests/tasks.test.ts` includes deletion tests

This suggests there is implemented and tested deletion behavior, but it does **not** establish archive behavior in the documented truth sources. If code is ahead of docs, that must be treated as uncertainty and possible drift.

## Desired behavior

- Verification should confirm whether any approved truth source already defines archive behavior.
- Based on the provided truth files, the result should currently be:
  - no documented archive behavior found in the listed truth sources.
- The outcome should distinguish clearly between:
  - **documented truth**: no archive behavior found
  - **non-truth implementation context**: deletion behavior exists in code/tests, but that is not equivalent to archive behavior and is not sufficient to define it
- No new business rules for archive should be introduced in this spec.
- If additional repository review includes `docs/ADR/`, that review should explicitly confirm whether any ADR defines archive semantics. The provided task inputs do not include ADR contents, so this remains an unresolved verification step unless inspected directly.

## Constraints

- Docs are the primary truth.
- Do not invent archive semantics, archive state values, retention behavior, restore behavior, filtering rules, or interactions with delete.
- Do not treat tested or implemented behavior as authoritative when docs do not define it.
- If code or tests appear ahead of docs, state uncertainty explicitly.
- If a conflict between docs and tested code is confirmed, it must be documented in `ai/current-state/drift-register.md` per:
  - `docs/ARCHITECTURE.md`
  - `AGENTS.md`
- Stay within task scope: verification of existing truth sources only.

## Acceptance criteria

- The spec identifies the approved truth sources for determining whether archive behavior already exists.
- The spec records that, in the provided documentation set:
  - `Task.status` is only `"open" | "done"`
  - no archive operation or archived state is documented
- The spec explicitly notes that code/test deletion behavior is not a valid substitute for documented archive behavior.
- The spec explicitly states uncertainty about `docs/ADR/` because no ADR contents were provided in the task input.
- The spec does not define or imply new archive business logic.
- The spec reflects the drift policy if later verification finds code behavior that conflicts with docs.

## Risks

- `docs/ADR/` may contain archive-related guidance not included in the task input, so concluding "no archive behavior exists anywhere" without checking ADR contents would be premature.
- Code and tests currently include deletion behavior that is absent from primary docs; this may create confusion between delete and archive concepts.
- A future implementer may incorrectly infer archive behavior from adjacent code patterns unless the absence of documented archive semantics is stated clearly.
- If repository code or tests are ahead of docs, failing to register drift could obscure the actual system state.

## Open questions

- Does any file under `docs/ADR/` define archive behavior, archived status, soft-delete semantics, or a replacement for delete?
- Should deletion behavior already present in code/tests be considered documentation drift relative to current truth docs?
- If archive behavior is needed in the future, should it be modeled as:
  - a new `Task.status` value,
  - a separate field,
  - or a distinct operation?
  
These are design questions only and are **not** answered by the current truth sources.