---
type: review
task_id: T-0019
created: 2026-04-10
tags: [ai-flow-lab, review]
---

# T-0019 Gemini Review

## Review target
The spec `T-0019_spec.md` aims to establish browser-based smoke test coverage for the initial user interface (Start UI) of the application, ensuring it is accessible via both the canonical `index.html` and the redirecting `game.html` entry points.

## Contradictions
*   **Minimal vs. Uncertain Framework:** The spec mandates "minimal safe changes" (per `CLAUDE.md`) but acknowledges the absence of an established test framework in the provided truth files. Implementing a smoke test without a framework implies either a massive scope expansion (installing/configuring Playwright/Cypress) or a trivial script that might not meet project standards.
*   **Code-Derived vs. Doc-Primary:** The spec correctly identifies that documentation is the primary truth, yet it proceeds to define acceptance criteria based entirely on "code-derived facts" (`#overlay`, `#menu-content`) because the docs are missing. There is a risk that the implementation will cement a "wrong" state if the code is currently in drift.

## Missing edge cases
*   **The `/game` Path:** The logic in `game.html` specifically checks if the path ends in `/game` (without `.html`). The smoke tests should explicitly verify this extension-less route if the web server configuration supports it.
*   **Redirect Loop/Failure:** The spec doesn't account for what happens if the redirect fails or loops (e.g., if `index.html` were to redirect back to `game.html`).
*   **Asset Loading:** Smoke tests often fail not because the HTML is missing, but because a critical JS/CSS bundle failed to load. The visibility check should implicitly or explicitly ensure the UI isn't just a "broken" HTML shell.
*   **JavaScript Disabled:** `game.html` uses a meta-refresh fallback. A robust smoke test would verify if the redirect works even when the script-based `window.location.replace` is unavailable (though this may be out of scope for "minimal" coverage).

## Scope risks
*   **Infrastructure Creep:** If the repo has no testing infrastructure, this task could devolve into a "Testing Strategy & Setup" task rather than just "Add coverage."
*   **Environment Variables:** Browser tests often require specific URLs (localhost vs. staging). The spec does not define how the test should discover the target URL.
*   **Race Conditions:** The "redirect resolution" mentioned in the criteria is a common source of flakiness. Without a defined "wait-for" strategy (e.g., waiting for a specific network idle state or element), the tests may be unstable in CI.

## Missing tests
*   **Interactivity Check:** Simply being "visible" (CSS `display: block`) doesn't mean the UI is functional. A smoke test should ideally verify that the "Start" or "Menu" buttons are `pointer-events: auto` or clickable.
*   **The "Clean Slate" test:** Verify that visiting the entry point doesn't immediately trigger game-over or gameplay sounds/states without user interaction.
*   **Mobile Emulation:** Since the UI mentions "🎮 PIXEL RUNNER," it might be a mobile-first game. A smoke test for visibility on a mobile viewport size is missing.

## Hidden assumptions
*   **Server Availability:** Assumes the executor has a way to serve the static files during the test run.
*   **Selector Stability:** Assumes `#overlay` and `#menu-content` are stable IDs. If the project uses CSS modules or a framework like Tailwind/React, these might be implementation details subject to change.
*   **Single-Page Logic:** Assumes that once the Start UI is visible, the "Entry Point" requirement is satisfied, ignoring potential hydration issues.

## Recommended corrections
*   **Mandate Route Coverage:** Explicitly include the `/game` route (no extension) in the acceptance criteria to match the script logic found in `game.html`.
*   **Define Framework Blocker:** Add a requirement that if no test framework exists, the executor must document the recommended tool (e.g., Playwright) in `drift-register.md` and seek approval before proceeding with a heavy installation.
*   **Add Interactivity Requirement:** Change "visibility" to "visibility and readiness." The test should assert that a primary action element (like a "Start Game" button) is visible and enabled.
*   **Specify Timeout Policy:** Define a standard timeout for the `game.html` redirect (e.g., 5000ms) to prevent indefinite hanging in CI.
*   **Environment Agnosticism:** Require the test to use an environment variable (e.g., `BASE_URL`) rather than hardcoding `localhost`.

## Related Documents
- [[ai/specs/T-0019_spec.md|T-0019 spec]]
- [[ai/briefs/T-0019_implementation.md|T-0019 document]]
- [[ai/results/T-0019_executor_report.md|T-0019 result]]
- [[ai/followups/T-0019_followups.md|T-0019 followup]]
- [[ai/pr/T-0019_pr_draft.md|T-0019 pr-draft]]
