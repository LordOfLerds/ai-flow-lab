---
type: brief
task_id: T-0019
created: 2026-04-10
tags: [ai-flow-lab, brief]
---

# T-0019 Implementation Brief

## Goal
Add minimal browser smoke coverage that verifies the Start UI is visible when the app is opened through confirmed supported browser entry points.

Resolved interpretation:
- Treat `index.html` as the canonical entry point.
- Treat `game.html` as a supported compatibility entry point because current code explicitly redirects it to `index.html`.
- Do **not** expand support claims beyond those two entry points unless existing repo docs/tests already do so.
- Do **not** include `/game` route coverage by default: Gemini raised it as a possible edge case, but the spec acceptance criteria only require canonical `index.html` and redirect `game.html`. Include `/game` only if an existing local server/router in the repo already serves it without new infra work.

## Scope
Implement only smoke-level browser coverage for:
1. Direct visit to `index.html` shows Start UI.
2. Visit to `game.html` resolves to the Start UI after redirect.

Keep assertions narrow and resilient:
- Prefer stable visible UI markers already present in `index.html`, such as `#overlay`, `#menu-content`, and/or visible title text like `PIXEL RUNNER`.
- Wait for redirect/navigation stabilization on `game.html` before asserting.
- Reuse the repo’s existing browser test framework and existing dev/test server pattern if present.

If the repo lacks an established browser automation setup, do not silently introduce broad new infrastructure; document that as drift/blocker per repo rules.

## Constraints
- Follow doc-primary policy from `AGENTS.md`: check referenced docs first if present in repo.
- If docs and code disagree on supported entry points or Start UI contract, record the conflict in `ai/current-state/drift-register.md`.
- Keep changes minimal and test-lane only; do not modify entry-point runtime behavior unless strictly required to make an already-supported test harness work.
- Do not redesign selectors or UI just to make tests easier.
- Do not assume a new framework if one is not already present.
- Use environment/config conventions already used by the repo for browser tests or local serving.
- Redirect assertions must be bounded with an explicit timeout/wait strategy supported by the existing test tool.
- Resolve spec/review tension explicitly:
  - Required: visibility smoke coverage.
  - Not required: button clickability, gameplay readiness, asset-health diagnostics, mobile emulation, JS-disabled behavior.
- `/game` extensionless coverage is optional follow-up only unless already supported by current repo infrastructure/docs.

## File targets
Adjust only the smallest set needed, likely in these areas depending on existing repo layout:
- Existing browser/e2e smoke test file for app entry points, or a new minimal browser smoke spec under the repo’s established test directory.
- Browser test config only if needed for route/base URL alignment within current framework conventions.
- `ai/current-state/drift-register.md` only if:
  - source-of-truth docs contradict code,
  - supported entry points are unclear,
  - or no approved browser test framework/server pattern exists.

Avoid unrelated production-file edits unless an existing test harness requires a tiny wiring change.

## Tests required
Add or update browser smoke tests that cover:

1. **Canonical entry smoke**
   - Navigate to `index.html` using the repo’s existing browser test base URL pattern.
   - Assert Start UI visible using stable selector/text already present in page markup.

2. **Redirect entry smoke**
   - Navigate to `game.html`.
   - Wait for redirect completion or final Start UI state using explicit bounded waiting.
   - Assert Start UI visible on the resolved page.

Assertion policy:
- Prefer one primary stable assertion plus at most one corroborating assertion.
- Good examples:
  - `#overlay` visible
  - `#menu-content` visible
  - title text `PIXEL RUNNER` visible
- Do not add deeper flow tests such as starting gameplay, auth, session, audio, or state progression.

Conditional only if already supported with near-zero extra scope:
- Add `/game` coverage if the current repo server/test setup already serves that path and the route is documented or demonstrably supported without new infrastructure.

## Chosen minimal policy
Use the repo’s existing browser test tool and serving pattern if available; otherwise do not introduce a new end-to-end framework under this task.

Concrete policy decisions:
- **Selector choice:** assert visible Start UI via existing stable page elements, preferring `#overlay` and/or visible title text.
- **Entry-point set:** required = `index.html`, `game.html`; optional = `/game` only if already supported.
- **Redirect handling:** explicit bounded wait for final page/UI state; no open-ended sleeps.
- **Framework policy:** reuse existing toolchain; if absent, document blocker/drift instead of expanding scope.
- **Readiness definition:** “visible Start UI” only, not interactability or gameplay readiness.

## Risks
- Repo docs named in `AGENTS.md` may redefine supported entry points; if so, code-derived assumptions may be drift.
- If no browser test framework or local static-server convention exists, this task may be blocked or require follow-up.
- `game.html` redirect timing may be flaky if the test waits on brittle navigation signals instead of final visible UI.
- Start UI may be dynamically altered at runtime, making a single selector less stable than visible title text or combined assertions.
- If extensionless `/game` is expected by docs but unsupported in current local test serving, there may be uncovered drift that should be documented, not patched broadly here.

## Explicit non-goals
- Introducing a brand-new browser testing stack if the repo has none.
- Expanding coverage into gameplay, auth, persistence, audio, asset integrity, or menu interactions.
- Verifying JS-disabled/meta-refresh behavior separately.
- Verifying mobile viewport behavior.
- Changing `index.html` or `game.html` product behavior beyond minimal test harness compatibility.
- Declaring `/game` extensionless route as required support without confirmation from existing docs/infrastructure.

## Related Documents
- [[ai/specs/T-0019_spec.md|T-0019 spec]]
- [[ai/reviews/T-0019_gemini_review.md|T-0019 review]]
- [[ai/results/T-0019_executor_report.md|T-0019 result]]
- [[ai/followups/T-0019_followups.md|T-0019 followup]]
- [[ai/pr/T-0019_pr_draft.md|T-0019 pr-draft]]
