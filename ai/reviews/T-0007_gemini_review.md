# T-0007 Gemini Review

## Review target
`ai/specs/T-0007_spec.md`

## Contradictions
There are no direct contradictions between the spec and the truth files. The spec correctly identifies that the "archive" concept is absent from `docs/DOMAIN_MODEL.md` and `docs/INVARIANTS.md`. It also correctly identifies the drift between the implementation (which contains `deleteTask`) and the documentation (which does not), adhering to the rules in `ARCHITECTURE.md` and `AGENTS.md`.

## Missing edge cases
- **Status transitions**: The spec identifies the interaction with `markDone`, but fails to prompt for an edge case: can a task be moved from "archived" back to "open"? If archive is treated as a status, the rule "A newly created task must start with status 'open'" is documented, but "unarchiving" transitions are undefined.
- **ListTasks Filter behavior**: The `INVARIANTS.md` states `listTasks(tasks, status)` must only return tasks with that exact status. The spec should explicitly ask how `listTasks` behaves if a status is *not* provided—specifically, should archived tasks be excluded from default listings?
- **Immutability of Archive**: If archive logic is added to `tasks.ts`, the invariant "`createTask` must not mutate prior task objects" suggests a functional approach. The spec should explicitly mention checking if archive operations (once defined) must also follow this immutability pattern.

## Scope risks
- **Analysis Paralysis**: Because the spec strictly forbids "inventing" rules, the executor might produce a document that only says "Archive is not defined," which may not satisfy the requester's intent to actually *establish* those interactions.
- **Drift Bloat**: By treating `deleteTask` as drift rather than a missing doc, the spec risks creating a permanent discrepancy if the executor is not empowered to propose a resolution (e.g., an ADR).

## Missing tests
- **Drift Register Verification**: The spec should explicitly require a verification step that checks if the `ai/current-state/drift-register.md` was updated with the `deleteTask` discrepancy as per the `ARCHITECTURE.md` Workflow Truth Policy.
- **Negative Documentation Test**: The spec mentions documenting uncertainty, but it should require a check that no *new* undocumented invariants are introduced into `docs/INVARIANTS.md` without an ADR.

## Hidden assumptions
- **Archive is a Domain Concept**: The spec assumes "archive" belongs in the domain model/logic (`tasks.ts`). It could potentially be a persistence-layer concern or a UI-only filter, which would change where it is documented.
- **Single Source of Truth**: The spec assumes that because archive isn't in the *provided* files, it isn't defined in the repo at all. It correctly acknowledges the missing `docs/ADR/` content as a potential blind spot.

## Recommended corrections
- **Propose ADR Path**: Add a requirement that if the executor identifies that "archive" behavior is necessary for the project, they should define a placeholder ADR (Architectural Decision Record) or recommend one be created, rather than just documenting the absence.
- **Define Relationship to `deleteTask`**: Explicitly task the executor to decide if "Archive" is intended to replace the undocumented `deleteTask` or coexist with it, and document this decision in the `drift-register.md`.
- **Clarify `listTasks` Invariant**: Add a requirement to specify if the existing `listTasks` invariant needs to be updated to handle a third status or a visibility flag.