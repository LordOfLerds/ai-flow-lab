---
type: brief
task_id: T-0020
created: 2026-04-10
tags: [ai-flow-lab, brief]
---

# T-0020 Implementation Brief

## Goal
Add one true headless-browser smoke test that proves the Start UI becomes visibly rendered on the real entry page only after runtime scripts execute.

## Scope
- Inspect current repo truth to identify:
  - the existing browser-capable test framework, if any;
  - the canonical entry path (`index.html` vs redirected `game.html`);
  - the actual selector/text/control that represents the Start UI.
- Add the smallest test-harness support needed to run one real browser smoke test.
- Load the app through normal browser navigation, not static HTML parsing.
- Wait on a deterministic rendered condition tied to the Start UI.
- Assert visible rendered Start UI in the browser.
- Document any docs/code mismatch or missing-source conflict in `ai/current-state/drift-register.md` if encountered.

## Constraints
- Use a true headless browser runner only; DOM-only environments are insufficient.
- Keep changes in the test lane: prefer adding a single smoke test plus minimal harness/setup changes.
- Do not invent or alter product behavior to make the test pass.
- Resolve the spec/review contradiction explicitly:
  - `AGENTS.md` names docs as primary truth, but those docs may be absent in-repo.
  - Policy: inspect the named docs first; if absent or non-authoritative for this behavior, use checked-in app code as operational truth and record the gap in `ai/current-state/drift-register.md`.
- Resolve the redirect contradiction explicitly:
  - Do not assume `game.html` redirects to `index.html` until verified in-repo.
  - Prefer testing the canonical user-facing entry actually used by current code/tests; only cover redirect behavior if already established and essentially free.
- Do not rely on brittle arbitrary sleeps where a specific locator/state/event can be awaited.
- If `auth-state.js` or other startup logic makes the Start UI nondeterministic, prefer minimal deterministic test setup already supported by the app/test harness; do not build broad mocking infrastructure unless required to make the smoke test runnable.

## File targets
- `ai/current-state/drift-register.md` — only if missing docs or docs/code mismatch is discovered.
- Existing browser test config/setup files — only if required for minimal headless execution.
- One new or updated browser smoke test file in the repo’s existing test location.
- Minimal package/test-runner config files only if no equivalent browser smoke path already exists.

## Tests required
- One headless browser smoke test that:
  - launches a real browser;
  - navigates to the verified app entry URL;
  - waits for runtime script execution to produce the Start UI;
  - asserts the actual Start UI element is visible to the user.
- The assertion target must be specific to the Start state/control, not just `#overlay` or `#menu-content` container visibility.
- If selector/text identity is ambiguous, first perform repo discovery and then document the chosen canonical assertion target inline in the test.
- Run the new smoke test locally.
- Run any directly related test command needed to prove the harness/config still works.

## Chosen minimal policy
1. Discover before editing:
   - inspect `docs/` files named by `AGENTS.md`;
   - inspect `index.html`, `game.html`, runtime scripts, and existing test tooling;
   - identify the real Start UI locator.
2. Reuse existing browser tooling if present.
3. If no browser tooling exists, add the smallest mainstream headless path that fits the repo with minimal config.
4. Test the canonical entry page directly.
5. Do not add redirect coverage unless current code clearly relies on `game.html` and the extra assertion is trivial.
6. Prefer deterministic waiting on the Start locator becoming visible.
7. Record any missing-docs or docs/code drift explicitly.

## Risks
- Start UI identity may be dynamic and require discovery before a robust assertion is possible.
- Browser navigation may require a local server rather than `file://` loading for module scripts to execute correctly.
- Startup/auth logic may create nondeterministic initial state and cause flakiness.
- If no browser harness exists, even minimal setup may be larger than expected.
- Container-only assertions could create false positives if not narrowed to the actual Start control.

## Explicit non-goals
- Do not redesign startup flow, auth flow, or menu rendering.
- Do not add broad end-to-end coverage beyond this smoke test.
- Do not add mobile/responsive matrix coverage.
- Do not add click-through gameplay assertions unless required to identify the canonical Start control.
- Do not assume or implement `game.html` redirect verification unless repo inspection confirms it is part of the real entry path and it can be covered with negligible extra scope.

## Related Documents
- [[ai/specs/T-0020_spec.md|T-0020 spec]]
- [[ai/reviews/T-0020_gemini_review.md|T-0020 review]]
- [[ai/results/T-0020_executor_report.md|T-0020 result]]
- [[ai/followups/T-0020_followups.md|T-0020 followup]]
- [[ai/pr/T-0020_pr_draft.md|T-0020 pr-draft]]
