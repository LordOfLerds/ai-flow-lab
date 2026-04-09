# T-0021 Implementation Brief

## Goal

Provide a deterministic, headless-capable Chrome-family browser for the Start UI smoke test in CI and other test-oriented environments, without relying on whatever browser may or may not already be installed on the host.

Resolve the main spec ambiguity this way:

- use the browser automation framework or existing test toolchain already present in the repo if one exists;
- only add CI/setup wiring needed to make that existing path reliable;
- do not introduce a new browser stack unless repo truth shows there is no existing one.

## Scope

In scope:

- inspect authoritative docs first: `docs/DOMAIN_MODEL.md`, `docs/INVARIANTS.md`, `docs/ARCHITECTURE.md`, and `docs/ADR/`
- inspect the existing Start UI smoke test and its runner/config
- identify how that test currently resolves a Chrome/Chromium executable
- make the browser dependency explicit for CI/test environments
- ensure the selected provisioning path is headless-friendly
- wire the smoke test to use the provisioned browser deterministically in CI/test contexts
- add a clear preflight or failure surface for missing/unlaunchable browser binaries
- document any doc/code mismatch in `ai/current-state/drift-register.md` if discovered

Out of scope within this task:

- redesigning the Start UI smoke test
- changing product UI behavior
- broad CI refactors unrelated to browser availability
- adding cross-platform desktop browser support unless already required by existing test infra
- introducing a second parallel browser strategy

## Constraints

- Docs are primary truth and must be checked before final implementation choices.
- Keep changes minimal and isolated to test-lane browser provisioning.
- Do not silently resolve contradictions between docs and code; record them in `ai/current-state/drift-register.md`.
- “Chrome binary” is treated as a Chrome-family executable acceptable to the existing runner; prefer Chromium if that is what the current framework manages.
- Headless execution is mandatory for CI/test environments.
- Determinism is required: no implicit dependence on a machine-global browser installation in CI.
- Resolve the spec/review tension explicitly:
  - version pinning is desirable, but only enforce it through the existing toolchain’s lockfile/framework mechanism if available;
  - do not invent a bespoke pinning system for this task.
- Resolve the “minimal changes vs infrastructure changes” contradiction explicitly:
  - CI/setup file edits are allowed if they are the smallest reliable place to provision the browser.

## File targets

Touch only files needed after repo inspection. Expected target classes:

- test runner config for the Start UI smoke test
- package/dependency manifest or lockfile only if the existing framework-managed browser path requires it
- CI workflow/test-environment setup file(s) that execute the smoke test
- a small test helper/setup script if needed for browser path resolution or preflight validation
- `ai/current-state/drift-register.md` only if doc/code drift is found
- existing test documentation only if a concise usage note is necessary

Prefer modifying existing files over creating new abstraction layers.

## Tests required

Required verification should stay tight and execution-oriented:

- smoke test passes in the intended CI/test execution path with the provisioned browser
- a preflight verification confirms the browser binary is discoverable and launchable in headless mode before or during test startup
- failure case is clear when the browser is absent or unusable
- existing Start UI entry behavior remains unchanged outside test provisioning concerns

If the repo already has relevant automated coverage, extend or use that path rather than adding a new test suite.

## Chosen minimal policy

1. Consult docs and existing test/CI code first.
2. Reuse the repo’s current browser automation stack if present.
3. Prefer framework-managed or workflow-managed browser provisioning over vendoring a binary.
4. Make CI/test runs explicit about browser resolution.
5. Add the smallest possible preflight/check so failures say “browser missing/unlaunchable” instead of failing deep in the smoke test.
6. If CI architecture or shared-library issues are already part of the chosen runner image, fix only what is required for the current CI target; do not generalize beyond observed need.
7. If no authoritative strategy exists in docs but code clearly uses one, implement the minimal code-consistent path and record drift.

## Risks

- Primary docs may prescribe a different test dependency model than current code.
- The smoke test may hardcode a browser path, expanding scope slightly into runner configuration.
- CI runner images may be missing shared libraries required by headless Chrome-family binaries.
- Downloaded browser setup may increase CI time if caching is not already available.
- Browser/version drift may occur if the existing toolchain does not already lock the browser deterministically.
- Architecture-specific issues may appear on non-default runners; this task should only solve the currently used CI/test target unless repo truth says otherwise.

## Explicit non-goals

- Do not migrate the project to Playwright, Puppeteer, Selenium, or any other framework solely for this task.
- Do not vendor a browser binary into the repository.
- Do not redesign the Start UI smoke test beyond what is necessary to point it at an explicit browser.
- Do not solve every possible OS/architecture combination unless already in documented scope.
- Do not refactor unrelated CI jobs, app code, or browser-facing pages.
- Do not add broad caching, containerization, or test-matrix work unless strictly required for this smoke test to run.