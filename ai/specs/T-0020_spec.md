# T-0020 Spec

## Task metadata
- task_id: T-0020
- title: Add true headless-browser smoke coverage for Start UI visibility after runtime scripts execute
- lane_type: test-lane
- executor: claude

## Problem statement
The task requests smoke-test coverage that verifies the Start UI is actually visible in a real browser context after the page’s runtime scripts have executed.

From the provided repo truth, `index.html` renders the game shell and includes:
- static overlay markup (`#overlay`)
- dynamic content container (`#menu-content`)
- a module script (`./auth-state.js`)
- an inline runtime script that is not fully included in the prompt

This means a non-browser or static-file assertion is insufficient for the requested confidence level. A test must load the page in a true headless browser, allow client-side scripts to run, and then verify that the Start-related UI is visible to the user.

There is also uncertainty: the provided source does not include the docs named in `AGENTS.md` (`docs/DOMAIN_MODEL.md`, `docs/INVARIANTS.md`, `docs/ARCHITECTURE.md`, `docs/ADR/`), nor the full inline script body from `index.html`. Because of that, the exact runtime mechanism that creates or reveals the Start UI is not fully documented in the provided materials.

## Source of truth
Primary truth available in this prompt:
- `AGENTS.md`
- `CLAUDE.md`
- `index.html`
- `game.html`

Relevant observed facts from source:
- `index.html` contains a visible overlay root: `#overlay`
- `#overlay` is hidden only when `.hidden` is applied
- `#menu-content` is empty in static HTML and appears intended for runtime population
- runtime behavior depends on:
  - `<script type="module" src="./auth-state.js"></script>`
  - an inline `<script>` whose full contents were not provided
- `game.html` redirects to `index.html`

Uncertainty to preserve:
- The exact selector, text, or control that constitutes the canonical “Start UI” is not documented in the provided prompt.
- The exact test framework already present in the repo is not included in the provided materials.
- If current code already contains partial browser tests ahead of docs, that cannot be confirmed from the provided context.

## Desired behavior
Add smoke-test coverage that:
1. launches a real headless browser,
2. opens the user-facing game entry page,
3. waits for runtime scripts to execute,
4. verifies the Start-related UI is visible in the rendered page state, not merely present in static HTML.

The intended behavior of the test should be:
- validate post-script rendered UI, especially content under the overlay/menu area;
- fail when runtime execution breaks and the Start UI never appears;
- avoid relying on static-file inspection alone;
- target the actual entry experience a user reaches, preferably `index.html` directly, while accounting for the existence of `game.html` redirect behavior if the current test strategy uses that route.

Because the exact Start control is not documented in the provided sources, the implementation should anchor assertions to the actual rendered Start UI exposed by current code, and if that differs from assumptions, the executor should document the discrepancy explicitly rather than silently redefining the requirement.

## Constraints
- Do not invent new product behavior; only verify existing behavior.
- Treat docs as primary truth, but the docs referenced by `AGENTS.md` were not provided here, so implementation may require additional repo inspection.
- If docs and code disagree about what the Start UI is or when it should appear, the conflict must be documented explicitly per `AGENTS.md` drift rule.
- Coverage must use a true headless browser, not a DOM-only environment.
- The test should wait for runtime scripts to complete enough work for the Start UI to render, without depending on brittle arbitrary delays where a more deterministic condition is available.
- The task is in the test lane, so scope should remain focused on adding/adjusting test coverage and only the minimal supporting test harness changes required for that coverage.
- Since the full inline runtime script was not provided, any assumptions about exact asynchronous timing or auth-state effects should be treated as uncertain until verified in-repo.

## Acceptance criteria
- A browser-based smoke test exists for the game start page.
- The test runs in a true headless browser environment.
- The test loads the page through normal browser navigation rather than static HTML parsing.
- The test allows page scripts to execute before asserting UI state.
- The test asserts that the Start UI is visible in the rendered page.
- The test would fail if runtime scripts did not populate or reveal the Start UI.
- If the canonical Start UI selector/text is ambiguous in code or docs, the chosen assertion target is documented in the test or accompanying notes.
- If a docs/code mismatch is discovered while identifying the Start UI, it is recorded explicitly in `ai/current-state/drift-register.md`.

## Risks
- The exact Start UI may be dynamically generated by the omitted inline script, making selector choice unclear until code is inspected.
- Runtime behavior may depend on browser APIs, module loading, or auth/session state from `auth-state.js`, which could make tests flaky if not isolated.
- If no existing browser test harness exists, introducing one may require setup decisions not documented in the provided sources.
- If the app depends on local file loading quirks or a dev server, smoke coverage may require environment setup beyond a simple test file.
- If assertions depend on literal button text and the UI is rendered differently than expected, the test may become brittle.

## Open questions
- What exact element is the canonical “Start UI” in current code: a button, a menu panel, specific text, or another control?
- What test framework and browser runner already exist in the repo, if any?
- Should the smoke test navigate to `index.html` directly, or should it also validate the `game.html` redirect entry path?
- Does `auth-state.js` introduce any async preconditions or session-dependent states that can alter initial Start UI visibility?
- Are there project docs under `docs/` that further define startup invariants or preferred testing tools, and do they agree with current code?