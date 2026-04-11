---
type: brief
task_id: T-0001
created: 2026-04-10
tags: [ai-flow-lab, brief]
---

# T-0001 Implementation Brief

## Goal
Create a single-file HTML5 canvas game engine with a 60 FPS game loop, input handling, camera system, and pixel-art sprite rendering as the foundational layer for a Jump & Run platformer.

## Scope

### In Scope
- Single `index.html` file with embedded CSS and JavaScript
- Canvas initialization (800x400, dark background #0f0f23)
- Game loop with requestAnimationFrame and fixed timestep (60 FPS @ 16.67ms/tick)
- Input system: keyboard tracking for Arrow keys, WASD, Space, Shift
- Camera system with smooth lerp following (factor: 0.1)
- Pixel-art sprite renderer from 2D color array data
- Game state machine with MENU, PLAYING, GAME_OVER phases (SKIN_SELECT deferred)
- Placeholder player entity for camera testing
- Default level bounds for camera clamping
- HUD overlay structure (styling only, no dynamic updates yet)

### Out of Scope
- Player movement logic (physics, animation)
- Level design or tile map rendering
- Collision detection
- Particle effects or animations
- Audio system
- Skin/character selection UI
- Score calculation or HUD population
- Mobile/touch input
- Canvas context loss recovery

## Constraints

1. **Single file**: All HTML, CSS, JavaScript in one `index.html`. No external dependencies.
2. **Fixed timestep**: Game logic must use accumulator pattern with max cap (0.1s) to prevent runaway loops.
3. **Camera clamping**: Camera bounds are hardcoded defaults (level 1600x800, camera clamps to this).
4. **Pixel rendering**: Use `image-rendering: pixelated` CSS + canvas 2D context. No WebGL or external libraries.
5. **Keyboard only**: Support listed keys with preventDefault to prevent page scroll.
6. **Device pixel ratio**: Canvas must scale for high-DPI, but sprite sizes stay fixed at 16px.

## File targets

- **Target**: `index.html` (single file, ~400-500 lines)
  - HTML: canvas element, HUD div, menu overlay div
  - CSS: dark theme, flexbox centering, pixel rendering mode, subtle glow on canvas border
  - JavaScript: full game engine code

## Tests required

### Acceptance Tests (Manual/Visual)
1. Page loads with dark background (#0f0f23) and centered 800x400 canvas
2. Canvas is visible with subtle border glow
3. Game loop runs smoothly without console errors
4. Pressing arrow keys, WASD, Space shows key state in debug output (or console logging)
5. Camera position updates when a target is set (simulate with test sprite movement)
6. drawSprite() renders test sprite pattern correctly (checkerboard or simple sprite)
7. State transitions from MENU → PLAYING → GAME_OVER → MENU complete without errors

### Code Quality Tests
1. Game loop cycles with delta-time without drifting from 60 FPS target
2. Accumulator prevents frame skipping (test by capping at 0.1s max)
3. Camera lerp smoothly reaches target position over ~10 frames
4. Input state persists across frames until key is released
5. Canvas scales correctly on high-DPI devices (test with transform)

## Chosen minimal policy

1. **Player entity**: Use minimal stub: `{ x: 0, y: 0, width: 16, height: 16 }`. Placed at canvas center for camera test.
2. **Level bounds**: Fixed default `{ width: 1600, height: 800 }` (2x canvas width/height). Defer dynamic level loading.
3. **HUD rendering**: Render structure only. Update score/coins/xp in gameState but do NOT render values to screen. Defer HUD updates to follow-up task.
4. **State transitions**: Only MENU ↔ PLAYING ↔ GAME_OVER. Wire basic transitions via test keys (e.g., Space to start, R to restart). Defer SKIN_SELECT.
5. **Color palettes**: Include minimal primary colors (black, white, red, green, blue, yellow) as hex strings. Defer extended palette design.
6. **Draw helpers**: Implement drawRect() for pixel and drawSprite() for sprite data. Defer advanced rendering (animation, scaling, flip).

## Risks

1. **Camera follows undefined player**: If gameState.player is null, camera lerp will crash. Mitigation: Initialize player stub at startup; add null checks.
2. **Accumulator runaway**: If a frame takes > 100ms, multiple updates could stack. Mitigation: Cap accumulator at 0.1s; log warning if exceeded.
3. **High-DPI rendering misalignment**: Canvas scaling may not align with CSS pixels. Mitigation: Use devicePixelRatio for canvas resolution but keep logical size fixed.
4. **Input loss on window blur**: Keys may stick if window loses focus. Mitigation: Add blur listener to clear keys object.
5. **HUD expectations**: Spec mentions HUD div but doesn't require rendering. Executor may overstep and add dynamic updates. Mitigation: Document in code that HUD is future scope.

## Explicit non-goals

- Player movement, jumping, or physics
- Level rendering or tile maps
- Collision detection or spatial queries
- Animations or sprite sequences
- Sound/audio
- Save/load state
- Mobile or touch input
- Performance optimization beyond basic 60 FPS
- Accessibility features (ARIA labels, keyboard alt navigation)
- Responsive design for different screen sizes
- Game balancing or difficulty settings
- Leaderboards or scoring systems


## Related Documents
- [[ai/specs/T-0001_spec.md|T-0001 spec]]
- [[ai/reviews/T-0001_gemini_review.md|T-0001 review]]
- [[ai/followups/T-0001_followups.md|T-0001 followup]]
- [[ai/pr/T-0001_pr_draft.md|T-0001 pr-draft]]
