# T-0008 Gemini Review

## Review target
- **Spec File:** `ai/specs/T-0008_spec.md`
- **Task:** Verify no additional truth sources already define archive behavior.

## Contradictions
- **Drift Handling:** The spec classifies the existence of `deleteTask` in code/tests as "uncertainty and possible drift." However, `docs/ARCHITECTURE.md` and `AGENTS.md` are explicit: "If docs and tested code disagree, do not decide silently. Document the conflict in `ai/current-state/drift-register.md`." The spec should move from "noting uncertainty" to "requiring registration of drift" for the `deleteTask` functionality, as it exists in tested code but is absent from `DOMAIN_MODEL.md`.

## Missing edge cases
- **Synonym Search:** The verification should not only search for the literal string "archive" but also related state-management concepts like "soft-delete," "retired," "hidden," or "cleanup" that might exist in `docs/ADR/`.
- **Existing Drift Register:** The spec does not mention checking the `ai/current-state/drift-register.md` itself. It is possible this lack of "archive" or the presence of "delete" has already been flagged by a previous agent.

## Scope risks
- **ADR Accessibility:** The spec correctly identifies that ADRs were not provided in the prompt. There is a risk that the Executor might assume because they weren't in the spec context, they don't exist. The spec needs to reinforce that the *actual* filesystem must be searched, not just the text provided in the spec's "Source of truth" summary.
- **Project Config:** The spec references `ai/project.config.yaml` in its source-of-truth list, but this file was not provided in the truth files for this review. This introduces a risk where the spec relies on a file whose actual existence/schema is unverified.

## Missing tests
- **Verification Checklist:** As this is a `docs-lane` task, "tests" are manual verification steps. The spec lacks a requirement for the executor to provide a specific list of files searched and the grep/search terms used to ensure thoroughness.
- **Negative Confirmation:** No explicit requirement to confirm that `Task.status` is strictly limited to the union of strings defined in `DOMAIN_MODEL.md` across all documentation.

## Hidden assumptions
- **Archive != Delete:** The spec assumes that "archive" and "delete" are fundamentally different behaviors. While logically true in most domain models, some systems use "archive" as a synonym for "soft-delete."
- **Current State:** Assumes that if a behavior is not in the listed docs, it is "undefined," ignoring the possibility that it might be defined in a truth source not listed in `AGENTS.md` (though `AGENTS.md` is meant to be exhaustive).

## Recommended corrections
- **Explicit Drift Registration:** Update the "Desired behavior" to mandate that if `deleteTask` remains undocumented in the primary truth files after verification, an entry *must* be created in `ai/current-state/drift-register.md`.
- **Search Methodology:** Add a constraint requiring the executor to search for synonyms (e.g., "soft-delete", "inactive") in addition to "archive".
- **ADR Verification:** Strengthen the Acceptance Criteria to require a "null result" report for the `docs/ADR/` directory (e.g., "Checked X ADR files, zero mentions found").
- **Drift Register Check:** Add `ai/current-state/drift-register.md` to the list of files to be reviewed during verification to see if this discrepancy is already known.