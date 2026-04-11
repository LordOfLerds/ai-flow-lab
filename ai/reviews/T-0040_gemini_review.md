---
type: review
task_id: T-0040
created: 2026-04-10
tags: [ai-flow-lab, review]
---

# T-0040 Gemini Review

## Review target
- **Task:** T-0040 — Enhanced Game Over Screen and Visual Polish
- **Spec:** ai/specs/T-0040_spec.md
- **Lane:** feature-lane (codex executor)

## Contradictions

1. **Game over overlay vs canvas rendering**: The spec says the game over screen should render in the `#overlay` HTML element, but also says "score breakdown" and "animated XP bar" — it's unclear whether these use HTML elements inside the overlay or are drawn on a canvas within the overlay. The existing game already uses both canvas rendering and HTML overlay. **Recommendation:** Clarify that the game over screen uses HTML elements inside `#overlay` (not canvas), which allows easier styling and button handling.

2. **"Level Select" button**: The spec says to add a "Level Select" button but then says "(placeholder — shows main menu for now)." This is not a contradiction per se, but the button should either be disabled with a tooltip saying "Coming Soon" or simply redirect to main menu. The spec should be explicit about which approach to use.

## Missing edge cases

1. **XP bar overflow**: If the player earns enough XP to level up multiple times in one run, the animated bar needs to handle wrapping (fill to max → level up flash → reset → fill again). The spec only describes a single fill animation.

2. **Zero-score game over**: If the player dies immediately (distance=0, coins=0, gems=0), the score breakdown shows all zeros and 0 stars. This edge case should display a "Try again!" message instead of the star rating.

3. **Particle cleanup on game restart**: If the player hits "Retry" while particles are still animating, the particle array must be cleared to avoid ghost particles appearing in the new run.

4. **Theme transition at exact boundary**: If the player is at distance 1999 and moves to 2001, both themes briefly overlap. The spec mentions crossfade as optional — recommend making it a hard requirement to avoid visual glitches.

5. **Screen shake during pause**: If a pause mechanism exists or is added later, screen shake should be suppressed during pause state.

## Scope risks

1. **Scope is large for a single task**: This task combines 4 distinct features (game over screen, parallax, screen shake, particles) plus menu transitions. Each could be its own task. Risk of partial implementation or quality compromise. **Recommendation:** If the executor struggles with scope, prioritize game over screen and parallax as must-haves, and treat particles and screen shake as stretch goals.

2. **Rendering pipeline refactor**: Adding parallax layers likely requires restructuring the draw order in the game loop. This touches the core rendering pipeline and has high regression risk.

## Missing tests

1. No test for star rating calculation accuracy (exact threshold boundaries: 499→0 stars, 500→1 star, etc.)
2. No test for theme switching at distance boundaries
3. No performance benchmark test (verify 60fps with all effects active)
4. No test for particle cap enforcement (verify max 50 particles)
5. No test for screen shake ending cleanly (canvas returns to normal position)

## Hidden assumptions

1. **Assumes the game loop has a clear render phase**: If the current game loop intermixes update and render logic, adding parallax layers at the beginning of the render phase requires significant refactoring.
2. **Assumes CSS transforms work well with canvas**: Screen shake via CSS `transform: translate()` on the canvas element may cause subpixel rendering artifacts on some browsers. Testing on Chrome and Firefox is recommended.
3. **Assumes the XP system produces meaningful values**: The spec references XP earned but doesn't define how much XP each run awards. If the XP formula doesn't exist yet, this task needs to create it.
4. **Assumes `requestAnimationFrame` is used**: The particle and animation systems rely on smooth frame timing. If the game uses `setInterval` instead, animations will be jittery.

## Recommended corrections

1. **Split particle cap**: Use separate limits for coin particles (max 30) and gem particles (max 20) to prevent one type from starving the other.
2. **Add XP formula**: Define explicitly: `xpEarned = floor(totalScore / 10) + (coinsCollected * 2) + (gemsCollected * 5)` or similar.
3. **Specify draw order**: Explicitly state the rendering order: (1) clear canvas, (2) sky gradient, (3) parallax layer 1, (4) parallax layer 2, (5) ground/platforms, (6) game objects (player, enemies, collectibles), (7) particles, (8) HUD.
4. **Add performance budget**: "If frame time exceeds 18ms (below 55fps), disable particles first, then reduce parallax to 2 layers."
5. **Clarify theme data structure**: Define themes as objects with named properties (skyGradient, farObjects, midObjects, colors) so future themes can be added easily.

Overall assessment: **Ambitious but well-structured spec.** The main concern is scope — 4 features in one task is aggressive. The executor should implement in order of priority: game over screen → parallax → particles → screen shake → menu transitions. Recommend proceeding with the scope caveat noted.


## Related Documents
- [[ai/specs/T-0040_spec.md|T-0040 spec]]
- [[ai/briefs/T-0040_implementation.md|T-0040 document]]
- [[ai/results/T-0040_executor_report.md|T-0040 result]]
- [[ai/followups/T-0040_followups.md|T-0040 followup]]
- [[ai/pr/T-0040_pr_draft.md|T-0040 pr-draft]]
