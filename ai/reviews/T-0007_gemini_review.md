# T-0007 Gemini Review

## Review target
Spec for implementing HUD (score, coins, XP, level, power-ups, skills), game-over screen, start menu, character select, visual polish (screen shake, particle effects, transitions), and speed progression.

## Contradictions
1. **Scroll speed vs. player movement** - Spec says "camera scroll only; player input unchanged" but also mentions "scrolling camera follows player; all entities move together". If camera scrolls at 2x and player walks at 1x, player appears to move backward relative to camera. Recommend: clarify that scrolling speed is a camera/world multiplier that applies to all entity positions; player still responds to input normally, but world moves around them.

2. **Goal definition for Next Level button** - "Next Level button appears if goal is reached" but "goal" is undefined. Spec mentions "all coins collected" but also mentions XP thresholds. Is goal just coins, or both coins + XP + level? Recommend: explicitly define win condition (e.g., "reach level exit tile" or "collect all coins").

3. **Game-over screen display time contradiction** - "Persist for 3 seconds before allowing input" and "Display stats for 0.5s before player can interact". Are these sequential (0.5s + 3s = 3.5s total) or overlapping? Recommend: clarify timeline: show stats immediately (0s), disable input for 3s, then allow input.

4. **Speed progression effect on collectibles** - Spec says scrolling applies to "all entities", but are collectibles moved by camera scroll or do they have independent velocity? If moved by camera, coins appear to drift away from player. Recommend: clarify that camera scroll is applied to all entity x-positions equally; coins don't have independent horizontal velocity unless magnet is active.

## Missing edge cases
1. **Particle collision with level** - Particles created mid-level may clip through walls or platforms. Spec doesn't address. Recommend: particles use simple point collision (ignore level geometry) or spawn at safe distance from walls.

2. **HUD overlap with game objects** - HUD at top-left may overlap with player or collectibles. Spec doesn't address visibility. Recommend: reserve top-left area as HUD zone (first 150px width x 100px height); avoid spawning collectibles in this zone.

3. **Screen shake during menu** - If screen shake is active when transitioning to menu, does jitter persist during fade transition? Recommend: disable screen shake on state transitions (game → menu).

4. **Speed progression on level complete** - If player completes level at 120+ seconds, speed is at 2x. Next level starts at 1x speed again? Or continues at 2x? Recommend: reset speed to 1x on new level start.

5. **Power-up timer precision** - Spec shows "Speed Boost 3.2s" (one decimal place); actual timer uses frame counter. If timer expires mid-frame, does display show "0.0s" then immediately disappear? Recommend: cap display at "0.1s" minimum before removal.

## Scope risks
1. **HUD rendering overhead** - Rendering HUD with 5+ text elements, power-up list, skill list every frame may impact FPS. Recommend: profile HUD rendering; cache text layouts if possible; use smaller font if performance degrades.

2. **Particle system complexity** - Managing 50+ particles with fade/collision may be complex. Recommend: implement simple particle pool (pre-allocate array); reuse particles on spawn/expire.

3. **State machine expansion** - Adding START_SCREEN and CHARACTER_SELECT to prior state machine (from T-0006) increases complexity. Recommend: verify state transitions are complete (all edges covered); document state machine diagram.

4. **Menu transition fades** - Fading entire canvas to black (0.3s) requires full-screen overlay. May conflict with game rendering. Recommend: use dedicated fade layer (render game, then fade overlay on top).

5. **Speed progression level design impact** - Levels designed for 1x speed may be unplayable at 2x. Recommend: design all levels with speed curve in mind; document expected difficulty curve; test at 2x speed.

## Missing tests
1. No test for HUD update accuracy (real-time stat sync during gameplay).
2. No test for game-over input delay (accidental restart prevention).
3. No test for particle lifetime (fade duration, max count).
4. No test for screen shake intensity (jitter consistency, alignment).
5. No test for speed progression curve (speed at 30s, 60s, 120s matches formula).
6. No test for scrolling entity positioning (collectibles don't drift off-screen).

## Hidden assumptions
1. **Canvas text rendering** - Assumes canvas.drawText and canvas.fillText are used; no specifics on font family, size, or styling. May differ from T-0006 menu text.

2. **Particle sprite** - Assumes particles are simple shapes (circles, squares); no sprite sheet referenced. How are particles rendered (drawCircle, drawRect)?

3. **Camera/scroll implementation** - Assumes camera position is tracked in gameState; not verified against prior tasks. May not exist yet.

4. **Goal definition** - Assumes "level exit tile" or "collect all coins" defines win condition; T-0005/T-0004 don't specify goal. What triggers game-over vs. level-complete?

5. **Frame counting for transitions** - Assumes gameState.frameCounter is available and synchronized; used for fade timing and particles. Must verify consistency with T-0004/T-0005 frame counters.

## Recommended corrections
1. **Clarify camera scroll vs. player movement** - Change "camera scroll only; player input unchanged" to "Scroll speed is a world-wide multiplier applied to all entity x-positions. Player input velocity.x remains unchanged; effective x-velocity = input.x + scrollSpeed bonus. This creates game-over condition if player falls behind camera position."

2. **Define explicit win condition** - Add section: "Win Condition: Level is won when player reaches level exit tile (trigger tile type=EXIT:20) OR collects all coins if no exit tile exists. Triggers level-complete state, shows game-over screen with Next Level button."

3. **Clarify game-over timeline** - Change "Display stats for 0.5s before player can interact" to "Show game-over screen immediately. Disable input for 3s. Display stats during this period. After 3s, enable input; player can click Restart/Back/Next buttons."

4. **Specify particle collision** - Add Constraint: "Particles are point-based; no collision with level geometry. Spawn at center of collected item (no clipping check). If spawn point is inside platform, particles still render normally."

5. **Clarify speed progression application** - Add explicit formula: "scrollSpeed = 1.0 + min(elapsedSeconds / 120, 1.0). All entity x-positions adjusted by: x += (scrollSpeed - 1.0) * 0.5 pixels/frame. Applies to platforms, obstacles, collectibles, and camera."

6. **Define HUD reserve area** - Add Constraint: "HUD occupies top-left 160px x 120px. Level design must avoid spawning collectibles in this zone. If collectible spawns there, nudge to safe location (right of HUD)."

7. **Specify exit tile** - Add to Tilemap Encoding: "exit=20 (level complete trigger tile). Unlocked after all coins collected or after 60 seconds."

8. **Document particle system limits** - Add Constraint: "Max 50 concurrent particles. Use particle pool (pre-allocate). On spawn limit, remove oldest particle and reuse slot."

