# T-0048 Gemini Review

## Review target
Spec T-0048: Expand skill system from 3 to 8 skills with progression tree.

## Contradictions
- None found. The spec correctly extends the existing SKILLS array pattern.

## Missing edge cases
1. **Magnet + collectibles already collected**: Need to ensure magnet only targets uncollected items and doesn't re-pull collected ones.
2. **Wall Jump infinite climb**: Without a cooldown or wall-slide mechanic, players could chain wall jumps up a single wall infinitely. Add a wall-slide state requirement (must be falling against wall).
3. **Time Slow stacking**: What happens if the player presses T while time_slow is already active? Spec should clarify: ignore, reset timer, or queue.
4. **Stomp on ground**: If player is barely above ground and triggers stomp, the landing detection might not fire. Add minimum height check.
5. **Glide + Double Jump combo**: If player double jumps then glides, does landing reset both? Clarify interaction.

## Scope risks
- Adding 5 new physics mechanics to a single-file game increases function complexity. Risk of regressions in existing jump/collision logic.
- Time Slow affecting gravity but not player input could feel inconsistent — test carefully.

## Missing tests
- No test plan for skill interactions (e.g., dash + wall jump, stomp + shield).
- No performance test for magnet scanning every frame across many collectibles.

## Hidden assumptions
- Assumes wall tiles are detectable from horizontal collision checks (left/right). Current collision system may only check vertical (top/bottom).
- Assumes `gs.timeScale` can be multiplied into all relevant update loops without breaking frame-dependent logic.
- Assumes skill menu grid layout fits 8 items without scrolling.

## Recommended corrections
1. Add wall-slide prerequisite for wall jump (must be pressing into wall + falling).
2. Add cooldown display for Time Slow (UI indicator showing remaining duration / cooldown).
3. Specify magnet pull radius scales with level or is fixed at 80px.
4. Add stomp minimum-height check (at least 2 tiles above ground).
5. Clarify that Time Slow cooldown is 10s and pressing T during active slow-mo does nothing.
