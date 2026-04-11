---
type: spec
task_id: T-0022
created: 2026-04-10
tags: [ai-flow-lab, spec]
---

# T-0022 Spec

## Task metadata

- **Task ID:** T-0022
- **Title:** Document browser binary discovery and setup for the headless Start UI smoke test
- **Lane:** docs-lane
- **Executor:** claude

## Problem statement

The task requests documentation for how a headless Start UI smoke test should discover and use a browser binary.

Based on the repository material provided, there is currently no visible documentation describing:
- a headless Start UI smoke test,
- how that test is invoked,
- which browser automation tool is used,
- how browser binaries are discovered,
- or what setup steps are required across environments.

This creates ambiguity for anyone trying to run or maintain such a smoke test, especially in environments where browser binaries may not already be installed or may live at non-default paths.

There is also an uncertainty gap: the current repo truth shown includes static browser-facing HTML (`index.html`, `game.html`) and agent/process documentation, but no explicit test docs or test runner configuration. If code elsewhere in the repo already implements a smoke test, that implementation is ahead of the provided docs and should be treated as uncertain until confirmed against actual repository documentation or test files.

## Source of truth

Primary source-of-truth guidance is defined in `AGENTS.md`, which says to consult first:
- `docs/DOMAIN_MODEL.md`
- `docs/INVARIANTS.md`
- `docs/ARCHITECTURE.md`
- `docs/ADR/`

However, those documents were not included in the provided repo truth excerpt, so their contents cannot be used directly in this spec.

Documents and files available in the provided context that inform this spec:
- `AGENTS.md`
- `CLAUDE.md`
- `index.html`
- `game.html`

Observed repository facts from provided files:
- `index.html` contains the visible Start UI for the project’s browser experience.
- `game.html` redirects to `index.html`.
- No provided file documents a headless smoke test or browser binary configuration.
- No provided file identifies a specific automation framework such as Playwright, Puppeteer, or Selenium.

Because the docs named as primary source of truth were not present in the supplied context, this spec must remain conservative and explicitly avoid inventing framework-specific business rules.

## Desired behavior

The documentation produced for this task should make browser setup for the headless Start UI smoke test understandable and repeatable.

At minimum, the documentation should:

- identify the Start UI target under test in repo terms, using available evidence (`index.html`, and `game.html` redirecting to it where relevant);
- explain whether the smoke test expects a browser binary to be:
  - auto-discovered by the chosen test framework/tooling, or
  - explicitly configured by environment variable, config file, or CLI argument;
- describe the supported discovery paths or mechanisms, but only if those mechanisms are confirmed by docs or code;
- describe required local setup steps to make the smoke test runnable in a headless environment;
- clarify what a contributor should verify when the browser binary is missing, incompatible, or not executable;
- distinguish confirmed behavior from inferred behavior whenever repository evidence is incomplete.

The resulting documentation should allow a maintainer to answer:
- what page the smoke test should open,
- what browser dependency must exist,
- how the test locates that dependency,
- what configuration knobs exist, if any,
- and what failure modes are expected when setup is incomplete.

## Constraints

- This is a **docs-lane** task; the deliverable is documentation/specification only.
- Do **not** implement test code, setup scripts, or browser installation logic.
- Do **not** invent business rules or framework behavior not supported by repository docs or visible code.
- Treat repository documentation as primary truth.
- If code appears to be ahead of docs, state uncertainty explicitly rather than normalizing undocumented behavior.
- The spec should stay scoped to:
  - browser binary discovery,
  - browser setup,
  - and the headless Start UI smoke test.
- The spec should not expand into unrelated gameplay, auth, or UI feature documentation unless directly needed to identify the smoke test target.
- If no test framework or browser configuration exists in the confirmed source material, the documentation should say so and frame required additions or clarifications as open questions, not settled facts.

## Acceptance criteria

- A documentation artifact is defined for this task that covers browser binary discovery and setup for the headless Start UI smoke test.
- The documentation references confirmed repository facts about the Start UI entry point:
  - `index.html` is the primary browser UI page.
  - `game.html` redirects to `index.html`.
- The documentation clearly separates:
  - confirmed repo truth,
  - assumptions requiring verification,
  - and unresolved gaps.
- If a browser automation framework is documented, its discovery/setup behavior is described only from verified repo evidence.
- If no such framework is documented in repo truth, the documentation explicitly states that the framework and discovery mechanism are currently unconfirmed.
- The documentation includes expected operator guidance for missing-browser scenarios, at least at the level supported by repo truth.
- The documentation does not include implementation code.
- The documentation does not claim support for specific browser binaries, install commands, or environment variables unless those are confirmed by repository sources.

## Risks

- **Missing primary docs risk:** `AGENTS.md` points to `docs/DOMAIN_MODEL.md`, `docs/INVARIANTS.md`, `docs/ARCHITECTURE.md`, and `docs/ADR/` as primary sources, but those were not included in the provided context. Relevant test documentation may exist there.
- **Code-ahead-of-docs risk:** There may already be test runner code or CI configuration elsewhere in the repository that defines browser discovery behavior. If so, any documentation based only on the provided files may be incomplete.
- **Framework ambiguity risk:** Without confirmed tooling, the documentation could become too vague to be operational, or too specific if it guesses a framework.
- **Environment-specific drift risk:** Browser binary handling often differs between local development, CI, and sandboxed environments. If these environments are not documented in the repo, the resulting spec may leave operational gaps.
- **Target ambiguity risk:** “Start UI smoke test” is not a term present in the provided files. It likely refers to the initial `index.html` overlay/start screen, but that should be verified.

## Open questions

- Which file or test suite currently defines the “headless Start UI smoke test”?
- What browser automation framework, if any, is actually used in this repository?
- Is browser binary discovery automatic via the framework, or does the project rely on explicit configuration?
- Are there existing environment variables, config files, or npm scripts for browser path setup?
- Is the smoke test intended to target:
  - `index.html` directly,
  - `game.html` redirect behavior,
  - or both?
- Are there CI-specific browser setup requirements that must be documented separately from local setup?
- Do the missing primary documentation files under `docs/` already define testing architecture or runtime prerequisites?
- If repository code and docs disagree once full repo inspection occurs, should the discrepancy be recorded in `ai/current-state/drift-register.md` per `AGENTS.md`?

## Related Documents
- [[ai/reviews/T-0022_gemini_review.md|T-0022 review]]
- [[ai/briefs/T-0022_implementation.md|T-0022 document]]
- [[ai/results/T-0022_executor_report.md|T-0022 result]]
- [[ai/followups/T-0022_followups.md|T-0022 followup]]
- [[ai/pr/T-0022_pr_draft.md|T-0022 pr-draft]]
