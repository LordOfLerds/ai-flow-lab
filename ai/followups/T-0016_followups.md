# T-0016 Follow-ups

## Task outcome summary

T-0016 appears complete and well-contained.

Implemented outcome:
- mock auth now has a reusable shared state module in `auth-state.js`
- `index.html` exposes:
  - login form
  - visible logged-in session chip
  - explicit logout control
  - game/menu gating so play requires login
- tests in `starter-test/tests/auth-session.test.js` now cover:
  - indicator visibility
  - login success label behavior
  - logout reset behavior
  - validation failures
  - failure-state messaging

Executor explicitly reported:
- tests passed via `npm test`
- no unfinished implementation items remained

## Remaining risks

- The current logout path is only available when the overlay/menu is visible, so an actively playing user must reopen the menu before signing out.
- Session visibility during gameplay may still be weak because the logged-in indicator is not mirrored into the always-visible HUD.
- The current test coverage is state-module focused; if browser-level smoke coverage for the new UI interactions is still needed, that is already handled by T-0015 rather than a new duplicate follow-up.

## Candidate follow-up tasks

### F-1
- title: Add in-play pause/menu affordance with session chip and logout access during active runs
- lane_type: feature-lane
- executor: claude
- rationale: The executor reported a concrete usability gap: logout is only reachable when the overlay/menu is visible. A small in-play pause/menu affordance would let players access logout without needing to finish or abandon flow awkwardly.
- smallest_safe_scope: Add a minimal pause/menu entry point during gameplay that opens an existing-style overlay or panel containing the current session summary and logout button, reusing current mock-auth state and avoiding broader gameplay/menu redesign.
- depends_on: T-0016
- priority: medium
- should_spawn_now: true

### F-2
- title: Mirror logged-in session indicator into the gameplay HUD
- lane_type: feature-lane
- executor: claude
- rationale: The executor recommended keeping session state visible while the overlay is hidden. A HUD-level indicator is a narrow usability improvement that complements T-0016 without changing auth behavior.
- smallest_safe_scope: Add a compact HUD session label/chip that appears only while logged in and reuses existing auth-state helpers for visibility and label content, without adding new auth actions or persistence behavior.
- depends_on: T-0016
- priority: low
- should_spawn_now: true

## Recommended next task

### F-1
Add in-play pause/menu affordance with session chip and logout access during active runs.

Reason:
- it addresses the executor’s primary discovered issue directly
- it improves completeness of the logout flow rather than only visibility
- it remains a small, reviewable extension of the current implementation

## Notes for planner

- No decision blocker is required from the provided evidence; both follow-ups can proceed as safe incremental work.
- Do not spawn any follow-up for browser-based smoke coverage of the new auth UI unless T-0015 is confirmed incomplete, because that area is already handled by T-0015.
- If capacity is limited, F-2 can wait; F-1 has the stronger usability impact.
- If no immediate UX polish is desired beyond the accepted scope of T-0016, it is also reasonable to stop here and declare no mandatory follow-up.