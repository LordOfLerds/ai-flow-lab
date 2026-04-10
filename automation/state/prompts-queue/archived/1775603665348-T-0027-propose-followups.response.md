# T-0027 Follow-ups

## Task outcome summary
T-0027 implemented the tile rendering and camera system for Pixel Runner. The `render()` function in `index.html` was replaced from placeholder text with a full rendering pipeline including: background gradient with parallax star field, camera system with lerp smoothing, tile rendering with per-type visual decorations (grass, stone, spike, ice, breakable, platform, coin, gem, powerups, exit), moving platform rendering with sinusoidal animation, enemy rendering (walker/flyer), and player sprite rendering with shield/invincibility effects. Camera culling ensures only visible tiles are drawn. The `gameLoop()` now increments `frameCount` for animations.

## Remaining risks
- The executor report was malformed (contained leaked internal reasoning text instead of a clean report). The actual code changes need verification — visual testing by loading the game in a browser is essential.
- Moving platform visual positions are calculated in the render function but the actual game state positions remain static. The physics task must reconcile these.
- No automated tests were added for rendering (canvas testing is inherently visual).

## Candidate follow-up tasks

### F-1
- title: Implement player physics, movement, and collision detection
- lane_type: feature-lane
- executor: codex
- rationale: The rendering system is in place but the player cannot move. This is the critical next step — add keyboard input handling for left/right movement, gravity, jumping (with coyote time and jump buffering from CONFIG), ground detection via tile collision, wall collision, and ice physics. Wire the existing `keys` input state and `createPlayer()` physics properties into an `updatePlayer()` function called from `gameLoop()`.
- smallest_safe_scope: Player horizontal movement, gravity, ground/wall tile collision, single jump. No double jump, dash, or special abilities yet.
- depends_on: T-0027
- priority: high
- should_spawn_now: yes

### F-2
- title: Add collectible pickup logic (coins, gems, powerups)
- lane_type: feature-lane
- executor: codex
- rationale: Coins, gems, and powerups are rendered but cannot be collected. Add collision detection between player and collectible tiles, remove collected tiles from the grid, update score/coins/gems counters, apply powerup effects (speed boost, shield, magnet), and show floating text feedback.
- smallest_safe_scope: Coin/gem collection with score update, powerup pickup with timed effects. No HUD display yet.
- depends_on: F-1
- priority: normal
- should_spawn_now: no

### F-3
- title: Implement enemy collision and death/respawn system
- lane_type: feature-lane
- executor: codex
- rationale: Enemies are rendered at their positions but don't move or interact with the player. Add enemy patrol movement (walker walks back and forth, flyer bobs vertically), player-enemy collision (damage or stomp-kill), death animation, and respawn at level start with life tracking.
- smallest_safe_scope: Enemy patrol AI, player-enemy collision, player death + respawn at start. No game-over screen yet.
- depends_on: F-1
- priority: normal
- should_spawn_now: no

### F-4
- title: Build HUD with score, coins, XP bar, and level display
- lane_type: feature-lane
- executor: codex
- rationale: The rendering pipeline is structured to support a HUD layer drawn after world rendering. Add on-canvas HUD showing current score, coin count, gem count, XP bar, player level, and current game level number. Wire the HTML HUD elements (already in the DOM) to game state.
- smallest_safe_scope: On-canvas HUD with score, coins, level number. XP bar fill based on gs.xp.
- depends_on: T-0027
- priority: normal
- should_spawn_now: no

## Recommended next task
**F-1 (Player physics and movement)** — this is the highest-priority follow-up because without player movement, the game is just a static scene. The rendering system is ready, the level is generated, the camera follows the player — all that's missing is the ability to actually move through the level.

## Notes for planner
- The executor report for T-0027 was malformed (Codex leaked internal reasoning). Consider adding report validation to the pipeline to detect and flag this.
- Visual verification of the rendering output should be done before spawning physics tasks — if tiles don't render correctly, the physics task will be building on a broken foundation.
- The existing tasks T-0001 through T-0008 from the original project bootstrap cover similar ground but were designed for a different architecture. The new tasks (F-1 through F-4) are specifically designed for the current single-file `index.html` architecture and should take precedence.
