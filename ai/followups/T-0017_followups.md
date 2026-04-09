# T-0017 Follow-ups

## Task outcome summary
T-0017 appears successfully completed and well-contained.

Implemented outcomes from the executor report:
- Passive time-based score gain was removed.
- Scoring now advances from forward progress only, using a dedicated `ScoreTracker`.
- Backtracking no longer reduces score and does not generate additional score until the prior high-water mark is exceeded.
- HUD score rendering was centralized through a shared sync helper.
- Domain/invariant docs were updated to reflect the new scoring model.
- Focused unit tests were added and executed successfully.

Notable remaining gaps called out by the executor:
- No browser-level end-to-end regression covers the actual `game.html` HUD behavior.
- Progress scoring pace is still controlled by a hard-coded unit constant.
- The chosen progress definition is horizontal world-front position only, which is a reasonable minimal policy but still an assumption.

## Remaining risks
- The meaning of “progress” is still partially policy-based rather than explicitly owner-approved; current code assumes horizontal world-front advancement only.
- The progress scoring unit is fixed in code, so pacing may feel too slow or too fast and currently requires code edits to tune.
- Unit coverage exists for the scoring utility, but there is still no browser-level regression proving the live page keeps `gs.score` and `#hud-score` synchronized under actual runtime conditions.
- Because the implementation added a new browser-loaded module dependency, any future script ordering or loading regressions could break scoring/HUD behavior without being caught by current tests.

## Candidate follow-up tasks

### F-1
- title: Expose progress scoring unit through game config
- lane_type: feature-lane
- executor: codex
- rationale: The executor identified the progress unit as a hard-coded pacing constant (`8px`). Moving that value into existing game configuration is a small, reviewable improvement that lets maintainers tune score pacing without changing scoring logic.
- smallest_safe_scope: Define the progress scoring unit in the existing config path, wire `ScoreTracker` instantiation to read it from config, and update docs/tests to reflect the configurable source while preserving current default behavior.
- depends_on: T-0017
- priority: medium
- should_spawn_now: true

### F-2
- title: Add headless browser regression for live HUD score synchronization
- lane_type: test-lane
- executor: codex
- rationale: The executor explicitly noted that coverage remains at the unit level. A small browser-level test would verify module loading, score updates, and DOM synchronization in the real page, protecting against integration regressions not caught by `score-tracker.test.js`.
- smallest_safe_scope: Add one headless browser test that loads `automation/ui/game.html`, exercises a minimal scoring progression path, and asserts the visible HUD score matches the underlying score state before and after no-progress and forward-progress steps.
- depends_on: T-0017
- priority: medium
- should_spawn_now: true

## Recommended next task
### F-2
- title: Add headless browser regression for live HUD score synchronization
- lane_type: test-lane
- executor: codex
- rationale: This closes the most concrete validation gap left by T-0017 and directly follows the executor’s primary recommendation. It is low-risk, reviewable, and improves confidence in the new module wiring and HUD sync behavior without changing gameplay policy.
- smallest_safe_scope: Add one headless browser test that loads `automation/ui/game.html`, exercises a minimal scoring progression path, and asserts the visible HUD score matches the underlying score state before and after no-progress and forward-progress steps.
- depends_on: T-0017
- priority: medium
- should_spawn_now: true

## Notes for planner
- No owner decision is strictly required to continue with the recommended test follow-up.
- The horizontal-only definition of progress remains a design assumption, but it does not block safe follow-up work because T-0017 intentionally chose the minimal policy and documented it.
- Do not spawn a “rebalance scoring values” task from this report; the executor explicitly said that was out of scope and no concrete defect was reported.
- If only one follow-up is scheduled now, prefer the test task first; the config-tuning task can safely follow later.