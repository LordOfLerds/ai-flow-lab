# T-0020 Gemini Review

## Review target
- **Task**: T-0020 (Add true headless-browser smoke coverage)
- **Spec**: `ai/specs/T-0020_spec.md`

## Contradictions
- **Primary Truth Access**: The spec lists `docs/DOMAIN_MODEL.md` and others as primary truth (per `AGENTS.md`), yet acknowledges they are missing from the prompt. It then proceeds to define "Desired behavior" based on `index.html` and `game.html` which are provided. There is a contradiction in following the "Source of Truth" hierarchy when the required docs are unavailable.
- **Redirection Logic**: The spec asserts `game.html` redirects to `index.html` as an "observed fact," but the provided prompt context does not include the content of `game.html` or the scripts that would perform this redirect. This is an assumption presented as a fact.

## Missing edge cases
- **Auth Failure**: If `auth-state.js` fails to initialize or returns a specific error state, does the "Start UI" still appear? The test should account for the possibility that the UI visibility is gated by authentication success.
- **Resource Timeouts**: Since this is a "true headless browser" test, it should handle cases where scripts or assets (like a CDN-hosted library) fail to load, preventing the `#menu-content` from populating.
- **Mobile/Responsive Viewports**: Headless browsers often default to specific resolutions. If the "Start UI" visibility depends on CSS media queries or layout-specific JS, the test might pass on desktop but fail on mobile (or vice versa).

## Scope risks
- **Harness Setup**: If the repository lacks a headless browser runner (e.g., Playwright, Puppeteer, Vitest Browser Mode), the scope of this task could balloon from "adding a test" to "architecting a browser-testing infrastructure."
- **Environment Parity**: Running a headless browser against a `file://` protocol vs. a local dev server (`http://localhost`) can lead to different module loading behaviors (CORS, MIME types). The spec does not define if a server must be spawned.
- **Omitted Inline Script**: The spec notes the inline script in `index.html` is truncated/omitted. If that script contains the core logic for the "Start" state transition, the test design is effectively "flying blind."

## Missing tests
- **Redirect Verification**: The spec mentions the `game.html` to `index.html` redirect but focuses assertions on visibility. A test should explicitly verify that hitting the "wrong" entry point results in a successful arrival at the UI-ready page.
- **Interactive Smoke**: A "Start UI" being visible is one thing; being interactive is another. A basic click test on the primary Start button would be more robust than a visibility-only check.

## Hidden assumptions
- **"Start UI" Identity**: The spec assumes that finding `#overlay` or `#menu-content` is sufficient. However, if these are containers for multiple states (Login, Settings, Start), simply checking for visibility might trigger a false positive for the "Start UI."
- **Deterministic Rendering**: Assumes that the runtime scripts produce a stable UI state that can be asserted against without complex "Wait for" logic beyond simple visibility.
- **Browser Availability**: Assumes the CI environment or local environment where Claude runs has the necessary browser binaries installed.

## Recommended corrections
- **Explicit Selector Discovery**: Add a required "Discovery Phase" to the execution plan where the executor must first grep/search for the specific string "Start" or the main button ID to define the assertion target before writing the test.
- **Define Test Environment**: Explicitly state whether the test should run against a spawned local server or direct file access.
- **Drift Register Requirement**: Since the primary docs are missing, mandate that the executor creates `ai/current-state/drift-register.md` immediately if the observed code behavior (like the redirect or the menu population) isn't documented anywhere else.
- **Mocking Auth**: Add a constraint to determine if `auth-state.js` needs to be mocked to ensure the "Start UI" appears deterministically regardless of actual network/session status.