---
type: spec
task_id: T-0021
created: 2026-04-10
tags: [ai-flow-lab, spec]
---

# T-0021 Spec

## Task metadata

- **Task ID:** T-0021
- **Title:** Provision a headless-friendly Chrome binary for the Start UI smoke test in CI/test environments
- **Lane type:** test-lane
- **Executor:** claude

## Problem statement

The task title indicates a need to make a Chrome-family browser binary available for a Start UI smoke test when running in CI and other test-oriented environments.

From the provided repo truth, there is clear evidence of browser-facing UI entry points (`index.html`, `game.html`) and prior automation/test infrastructure work referenced in project notes, including mock-mode and CI-related next steps. However, no explicit repository documentation for the Start UI smoke test, its runner, its browser dependency model, or current CI setup was provided in the source bundle for this task.

Because of that, the most supportable problem statement is:

- a UI smoke test exists or is expected to exist for the Start UI,
- that smoke test depends on launching Chrome or Chromium in a headless-capable manner,
- current CI/test environments do not reliably provide that browser binary,
- and the task is to define how the project should provision that dependency so the smoke test can run consistently outside a developer’s manually configured machine.

Uncertainty note: the exact test harness, exact command surface, and whether the project currently uses Chrome, Chromium, Playwright-managed browsers, or Puppeteer-managed browsers are not documented in the provided truth files.

## Source of truth

Primary documented source of truth, per `AGENTS.md`:

- `docs/DOMAIN_MODEL.md`
- `docs/INVARIANTS.md`
- `docs/ARCHITECTURE.md`
- `docs/ADR/`

But those files were referenced, not included in the provided context. Therefore they remain the authoritative locations to consult during implementation, and this spec cannot assert details that would belong to them.

Additional repo truth available in this task context:

- `index.html`
  - confirms a browser UI entry point exists
  - confirms a script-based front-end experience is present
- `game.html`
  - confirms browser navigation/redirect behavior exists
- `CLAUDE.md`
  - instructs minimal safe changes and documentation of blockers/drift
- `AGENTS.md`
  - states docs are primary truth
  - requires documenting doc/code conflicts in `ai/current-state/drift-register.md`

Relevant inferred-but-not-authoritative context from project notes included in the prompt:

- CI integration has been identified as a future step
- automated and mock test infrastructure exists in some form

If implementation discovers that code or existing workflow files define the smoke test more concretely than docs do, that should be treated as possible doc/code drift and called out explicitly rather than silently resolved.

## Desired behavior

In CI and designated test environments, the Start UI smoke test should be able to run without assuming that a suitable Chrome binary is preinstalled on the host.

Desired end state:

- the project has a documented and repeatable way to obtain a headless-capable Chrome-family browser binary for test execution;
- the smoke test uses that provisioned browser path or browser installation mechanism consistently in CI/test environments;
- local developer workflows are not unnecessarily broken or made heavier if they already have a compatible browser installed;
- failure mode is clear when browser provisioning fails, rather than producing a vague launch error;
- the approach is compatible with headless execution.

Because the exact smoke-test runner is not documented in the provided truth set, this spec does **not** prescribe a specific provisioning mechanism beyond the behavioral requirement that the browser dependency be explicit and reproducible.

## Constraints

- **Docs are primary truth.**
  - Implementation must check the missing `docs/DOMAIN_MODEL.md`, `docs/INVARIANTS.md`, `docs/ARCHITECTURE.md`, and `docs/ADR/` before deciding final mechanics.
- **Do not invent business rules.**
  - This task should only address test-environment browser provisioning, not broader product behavior.
- **Prefer minimal safe changes.**
  - Changes should be limited to what is needed for smoke-test browser availability.
- **Headless-friendly requirement is explicit.**
  - The provisioned browser must support the smoke test in headless execution contexts.
- **CI/test environment focus.**
  - The primary target is non-interactive environments; local developer support is secondary and should remain minimally disruptive.
- **Do not silently resolve drift.**
  - If docs say one browser/runtime strategy and code/test tooling uses another, record the conflict in `ai/current-state/drift-register.md`.
- **Unspecified tooling.**
  - Since no authoritative runner config was provided, this spec cannot require Playwright, Puppeteer, Selenium, system package install, vendored binary, or container image changes unless existing docs/code establish that choice.

## Acceptance criteria

- There is a documented browser provisioning strategy for the Start UI smoke test in CI/test environments.
- The strategy ensures a headless-capable Chrome-family binary is available when the smoke test runs in CI/test contexts.
- The smoke test execution path in CI/test environments no longer depends on an implicit machine-level Chrome installation.
- The implementation defines or wires a deterministic way for the test runner to locate or use the provisioned browser.
- If browser provisioning fails or the binary is unavailable, the failure is surfaced clearly enough to diagnose the missing dependency.
- Any discrepancy between repository docs and implementation reality is explicitly documented in `ai/current-state/drift-register.md`.
- Existing browser UI entry points (`index.html` / redirect flow via `game.html`) remain unaffected in application behavior by this task.

## Risks

- **Doc/code drift risk**
  - The required primary docs were not included in the provided context; implementation may discover a prescribed testing architecture that differs from current code or assumptions.
- **Tooling mismatch risk**
  - The actual smoke test may rely on a specific browser automation stack whose browser provisioning model is already opinionated.
- **CI platform variance**
  - Different CI runners may require different installation paths, sandbox flags, or dependency packages for headless Chrome operation.
- **Binary size / setup time**
  - Provisioning a browser in CI can increase job time or cache complexity.
- **Local/CI divergence**
  - A solution that works in CI may behave differently on local machines unless browser resolution rules are explicit.
- **Name ambiguity**
  - “Chrome binary” may mean Google Chrome specifically, or any Chrome-compatible Chromium binary; the repo truth provided here does not resolve that distinction.

## Open questions

- Where is the authoritative definition of the “Start UI smoke test” located?
- What test runner or browser automation framework currently executes that smoke test?
- Does existing project documentation already standardize on Chrome, Chromium, or framework-managed browsers?
- Which CI system and runner image are in scope for this task?
- Should the browser be provisioned:
  - by the test framework,
  - by project scripts,
  - by CI workflow setup,
  - or by a prebuilt environment/container?
- Is the expected behavior to provision only in CI/test environments, or also to provide a fallback for local developers without Chrome installed?
- Does the current smoke test require a concrete executable path, or can it use a framework-default managed browser installation?
- If code is already ahead of docs on this topic, what exact drift entry should be recorded before implementation proceeds?

## Related Documents
- [[ai/reviews/T-0021_gemini_review.md|T-0021 review]]
- [[ai/briefs/T-0021_implementation.md|T-0021 document]]
- [[ai/results/T-0021_executor_report.md|T-0021 result]]
- [[ai/followups/T-0021_followups.md|T-0021 followup]]
- [[ai/pr/T-0021_pr_draft.md|T-0021 pr-draft]]
