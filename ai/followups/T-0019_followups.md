# T-0019 Follow-ups

## Task outcome summary
T-0019 completed successfully as a minimal, reviewable test-lane change.

The executor added a Vitest smoke suite in `starter-test/tests/browser-smoke.test.ts` that:
- validates `index.html` contains the visible Start UI shell,
- validates `game.html` redirects to `./index.html` via both meta refresh and inline script behavior,
- re-checks the canonical Start UI after simulated redirect resolution.

`starter-test/package.json` was also normalized for formatting consistency, and the full `starter-test` Vitest suite passed.

This satisfies the current task’s scoped acceptance in a lightweight way without introducing a new browser automation stack.

## Remaining risks
- The new coverage is not a true runtime browser test; it relies on static HTML inspection plus sandboxed execution of the inline redirect script.
- If future runtime JavaScript hides or mutates the Start UI before user interaction, the current smoke test may still pass and miss the regression.
- The suggested compatibility behavior of `game.html` as a redirect target remains code-derived unless already documented elsewhere; this can become a docs/code drift point.
- Extensionless `/game` behavior is still not covered, but that was intentionally left out of scope for this task and should not be added without confirming existing support/infrastructure.

## Candidate follow-up tasks

### F-1
- title: Add true headless-browser smoke coverage for Start UI visibility after runtime scripts execute
- lane_type: test-lane
- executor: claude
- rationale: The executor explicitly reported that current coverage cannot catch regressions caused by runtime JavaScript hiding the Start UI. A small follow-up can raise fidelity by loading the actual pages through a local HTTP server and asserting computed visibility in a real browser context.
- smallest_safe_scope: Add one minimal browser automation smoke spec covering `index.html` and `game.html` only, reusing any existing repo test/server conventions if present and avoiding broader e2e expansion.
- depends_on: T-0019
- priority: medium
- should_spawn_now: yes

### F-2
- title: Document `game.html` as a compatibility redirect entry point in architecture docs
- lane_type: docs-lane
- executor: claude
- rationale: The executor recommended documenting that `game.html` is only a compatibility redirect so future tasks and tests align on `index.html` as the canonical entry point. This is a small docs-only clarification and reduces future ambiguity.
- smallest_safe_scope: Update `docs/ARCHITECTURE.md` to note `index.html` as the canonical interactive entry and `game.html` as a compatibility redirect, with a brief note that smoke coverage should assert Start UI on the resolved canonical page.
- depends_on: T-0019
- priority: medium
- should_spawn_now: yes

## Recommended next task
Spawn **F-2** first.

Reason:
- It is smaller, low-risk, and directly addresses a now-exposed ambiguity in system behavior.
- It reduces the chance that later tests encode assumptions that are only implied by current code.
- The higher-fidelity browser automation in F-1 is useful, but it is a somewhat heavier follow-up and can proceed more safely once the entry-point intent is documented.

## Notes for planner
- Do not spawn follow-ups that expand into `/game` route coverage unless existing docs or infrastructure clearly support it; that would be new scope beyond T-0019.
- Do not treat “real browser smoke” as urgent unless there is active churn in startup/runtime UI logic; current coverage already provides meaningful regression protection for shipped markup and redirect wiring.
- No owner decision blocker is required based on the executor report alone; both follow-ups are safe, independent, and consistent with the existing task history.