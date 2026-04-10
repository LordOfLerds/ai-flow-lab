# T-0001 Gemini Review

## Review target
T-0001 Spec: Set up HTML canvas, game loop, and pixel-art rendering engine

## Contradictions

1. **Game state machine scope mismatch**: The spec declares a state machine with `MENU, PLAYING, GAME_OVER, SKIN_SELECT` but acceptance criterion #6 only requires "transitions between phases" without specifying which states or transitions must be implemented. The spec should clarify whether all four states must be functional or if this is future scope.

2. **Camera clamping vs. level bounds ambiguity**: The spec states "Camera clamped to level bounds" but doesn't define what `level` is or how bounds are established. The `gameState` object initializes `level: null`, suggesting level data structure is undefined at this stage.

3. **HUD overlay scope**: The spec mentions "HUD overlay div above canvas for score/XP display" in HTML structure, but doesn't define how these values are populated or rendered. Are scores calculated in the game loop? This feels like future-task scope bleeding into T-0001.

## Missing edge cases

1. **Canvas context loss**: No mention of handling canvas context loss or recovery (important for browser tab backgrounding).

2. **High-DPI displays**: The spec uses fixed pixel sizes (TILE_SIZE: 16, canvas 800x400) but doesn't address rendering on high-DPI displays or device pixel ratio scaling. The `image-rendering: pixelated` CSS won't fully address this.

3. **Keyboard input edge cases**:
   - What happens if a key is pressed, held, then the window loses focus? Should keys auto-release?
   - Should preventDefault be applied to all supported keys or only gameplay keys?
   - No mention of mobile/touch input support.

4. **Delta-time edge case**: Fixed timestep with accumulator is good, but spec doesn't address:
   - What happens if a frame takes > 16.67ms (skipped frame)?
   - Should there be a maximum accumulation cap to prevent runaway update loops?

5. **Camera lerp edge case**: Lerp factor of 0.1 is hardcoded. What if player moves faster than camera can follow? Should there be bounds checking or max camera velocity?

## Scope risks

1. **"Smooth lerp following player" requires player entity**: The camera system assumes `gameState.player` exists and has x, y position. But player entity definition is outside T-0001 scope. Should T-0001 define a minimal player stub for testing?

2. **Game state machine completeness**: Only the `MENU` phase is mentioned in acceptance criteria. Implementing all four states (`PLAYING, GAME_OVER, SKIN_SELECT`) is unclear — are transitions wired up or just the shell?

3. **"Predefined color palettes"**: Spec mentions this but doesn't define what colors should be included. Is this just the palette framework, or should specific game colors be hardcoded?

4. **Level bounds definition**: Without defining level structure, "camera clamped to level bounds" is unimplementable in acceptance testing.

## Missing tests

1. No test specifications for:
   - Game loop maintains 60 FPS (or near it) under typical load
   - Delta-time calculation accuracy
   - Camera lerp smoothness and final positioning
   - Input key state persistence across frames
   - State transitions complete without errors

2. No mention of how to verify "pixel-art from 2D color arrays" renders correctly without a visual inspection system.

3. No acceptance test for canvas context availability or recovery.

## Hidden assumptions

1. **Browser environment**: Assumes modern browser with requestAnimationFrame, Canvas API 2D context. No fallback or polyfill mentioned.

2. **Input device**: Assumes keyboard is the primary input. Mobile/touch is not mentioned.

3. **Rendering performance**: Assumes 60 FPS is achievable with canvas 2D context and simple sprite rendering. No performance requirements or target devices specified.

4. **Single-threaded execution**: Game loop assumes synchronous update/render with no Workers or async patterns.

5. **Player entity existence**: Camera system assumes `gameState.player` is defined and positioned, but player creation is out of scope.

## Recommended corrections

1. **Clarify HUD rendering scope**: Remove HUD update logic from T-0001 or define minimal placeholder rendering. Store score/coins/xp in gameState but don't require UI integration in this task.

2. **Define minimal player stub**: Include a placeholder player object in gameState for camera testing:
   ```
   player: { x: 0, y: 0, width: TILE_SIZE, height: TILE_SIZE }
   ```

3. **Add accumulator cap**: Specify max accumulation in fixed timestep to prevent runaway loops:
   ```
   const MAX_ACCUMULATION = 0.1; // Cap at 100ms to prevent spiral
   ```

4. **Clarify state machine scope**: Specify which states require functional transitions for T-0001. Suggest: implement `MENU → PLAYING → GAME_OVER → MENU` cycle, defer `SKIN_SELECT` to follow-up task.

5. **Define level bounds default**: Provide sensible defaults for level bounds in gameState:
   ```
   level: { width: 1600, height: 800 } // 2x canvas size
   ```

6. **Add device pixel ratio handling**: Document or implement basic high-DPI support via canvas scaling.

7. **Specify preventDefault behavior**: Clarify which keys trigger preventDefault (likely arrow keys, space, wasd to prevent page scroll).

8. **Add test acceptance criteria**: Include specific measurements:
   - Game loop executes update/render cycle within budget (< 16.67ms per frame)
   - Camera position updates smoothly and reaches target position
   - Input state persists correctly across frames
