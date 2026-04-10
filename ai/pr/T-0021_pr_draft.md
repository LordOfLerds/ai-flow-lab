# [T-0021] Provision a headless-friendly Chrome binary for the Start UI smoke test in CI/test environments

## Summary
Provision a headless-friendly Chrome binary for the Start UI smoke test in CI/test environments

**Task ID**: T-0021
**Parent Goal**: none
**Parent Task**: T-0020
**Lane**: test-lane
**Executor**: claude

## What Changed
Provision a headless-friendly Chrome binary for the Start UI smoke test in CI/test environments


claude


- `.gitignore`
- `starter-test/package.json`
- `starter-test/scripts/ensure-chrome.mjs`
- `starter-test/scripts/run-vitest-with-chrome.mjs`
- `starter-test/README.md`




- Added `starter-test/…

## Spec Summary
- **Task ID:** T-0021
- **Title:** Provision a headless-friendly Chrome binary for the Start UI smoke test in CI/test environments
- **Lane type:** test-lane
- **Executor:** claude



The task title indicates a need to make a Chrome-family browser binary available for a Start UI smoke test when runn…

## Review Highlights
- **Task ID:** T-0021
- **Spec Title:** Provision a headless-friendly Chrome binary for the Start UI smoke test in CI/test environments
- **Focus:** Ensuring consistent browser availability for UI testing in non-interactive environments.


- **Authority vs. Implementation:** The spec identifies `doc…

## Implementation Brief
Provide a deterministic, headless-capable Chrome-family browser for the Start UI smoke test in CI and other test-oriented environments, without relying on whatever browser may or may not already be installed on the host.

Resolve the main spec ambiguity this way:

- use the browser automation framew…

## Linked Decisions
(none)

## Validation
- [ ] Spec written and reviewed
- [ ] Implementation brief synthesized
- [ ] Executor report completed
- [ ] Follow-ups proposed

- [ ] Tests pass (if applicable)
- [ ] No regressions in existing functionality

## Risks
(none identified in review)

## Non-Goals
(see spec)

## Follow-Up Notes
T-0021 appears successfully implemented at the project-script level.

Completed work:
- Added a Chrome-for-Testing provisioner script with:
  - platform detection,
  - cache reuse,
  - release/channel overrides,
  - `CHROME_PATH` override support,
  - executable verification via `--version`.
- Added…

---
**Branch**: `test/T-0021-provision-a-headless-friendly-chrome-binary-for-the-start-ui-smoke-test-in-ci-test-environments` → `main`
**Generated**: 2026-04-07T20:49:17.596Z
**Generator**: generate-pr-draft.mjs
