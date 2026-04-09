# [T-0020] Add true headless-browser smoke coverage for Start UI visibility after runtime scripts execute

## Summary
Add true headless-browser smoke coverage for Start UI visibility after runtime scripts execute

**Task ID**: T-0020
**Parent Goal**: none
**Parent Task**: T-0019
**Lane**: test-lane
**Executor**: claude

## What Changed
Add true headless-browser smoke coverage for Start UI visibility after runtime scripts execute


claude


- `starter-test/tests/headless-start-ui.test.ts`




- Added `starter-test/tests/headless-start-ui.test.ts`, a Vitest-based CDP harness that launches real Chrome in headless mode, navigates to `…

## Spec Summary
- task_id: T-0020
- title: Add true headless-browser smoke coverage for Start UI visibility after runtime scripts execute
- lane_type: test-lane
- executor: claude


The task requests smoke-test coverage that verifies the Start UI is actually visible in a real browser context after the page’s runtim…

## Review Highlights
- **Task**: T-0020 (Add true headless-browser smoke coverage)
- **Spec**: `ai/specs/T-0020_spec.md`


- **Primary Truth Access**: The spec lists `docs/DOMAIN_MODEL.md` and others as primary truth (per `AGENTS.md`), yet acknowledges they are missing from the prompt. It then proceeds to define "Desire…

## Implementation Brief
Add one true headless-browser smoke test that proves the Start UI becomes visibly rendered on the real entry page only after runtime scripts execute.


- Inspect current repo truth to identify:
  - the existing browser-capable test framework, if any;
  - the canonical entry path (`index.html` vs red…

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
T-0020 completed the requested test-lane scope by adding a real headless-browser smoke test at `starter-test/tests/headless-start-ui.test.ts`.

What is now covered:
- launches a real Chrome/Chromium process via CDP,
- navigates to the actual entry page,
- waits for runtime-rendered Start/Login UI un…

---
**Branch**: `test/T-0020-add-true-headless-browser-smoke-coverage-for-start-ui-visibility-after-runtime-scripts-execute` → `main`
**Generated**: 2026-04-07T20:41:22.843Z
**Generator**: generate-pr-draft.mjs
