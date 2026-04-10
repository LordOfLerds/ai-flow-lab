# T-0028 Follow-ups

## Task outcome summary
T-0028 implemented complete player physics, movement, and collision detection for Pixel Runner. The `updatePlayer()` function and supporting helpers (`getTileAt`, `isSolid`, `isOnIce`, `resolveXCollision`, `resolveYCollision`, `checkTilePickups`, `checkSpikeCollision`, `checkExitCollision`, `killPlayer`) were added to `index.html`. Players can now run left/right with WASD/arrows, jump with space/up/W, collect coins and gems, die on spikes, retry after death, and advance levels via EXIT tiles. ICE tiles apply friction-based slippery movement. One-way PLATFORM collision works correctly. Breakable tiles break on head-bonk. Coyote time and jump buffering provide responsive controls.

## Remaining risks
- Enemy sprites are rendered but don't move or interact with the player — they're purely visual.
- Moving platforms are rendered with sinusoidal animation in the render layer but don't have physics collision — the player passes through them.
- HUD is not yet implemented — score, coins, gems, and level number are tracked in game state but not displayed on-screen.
- The game loop uses `requestAnimationFrame` which Chrome throttles when the tab is in the background.

## Candidate follow-up tasks

### F-1
- title: Implement enemy AI movement and player-enemy collision
- lane_type: feature-lane
- executor: codex
- rationale: Enemies (walkers and flyers) are rendered at their positions but are completely static. This task adds patrol AI (walkers walk back and forth on platforms, flyers bob vertically), player-enemy collision detection (damage from sides, stomp-kill from above with bounce), and enemy death/removal. This is the next major gameplay feature needed to make the levels challenging.
- smallest_safe_scope: Walker patrol movement (reverse at edges/walls), flyer vertical bobbing, player-enemy overlap detection, stomp-kill with bounce, side-hit damage/death. No enemy spawning or enemy-enemy interaction.
- depends_on: T-0028
- priority: high
- should_spawn_now: yes

### F-2
- title: Build on-canvas HUD with score, coins, level, and health display
- lane_type: feature-lane
- executor: codex
- rationale: All gameplay metrics (score, coins, gems, level number, shield HP, powerup timers) are tracked in game state but invisible to the player. This task adds a persistent HUD overlay drawn on top of the game canvas showing these values in real-time. Without a HUD, players can't see their progress or know when powerups are active.
- smallest_safe_scope: On-canvas HUD with: score counter (top-left), coin counter with icon, gem counter, level number, shield indicator, active powerup timers. No minimap or enemy health bars.
- depends_on: T-0028
- priority: normal
- should_spawn_now: yes

### F-3
- title: Add moving platform collision and ride mechanics
- lane_type: feature-lane
- executor: codex
- rationale: Moving platforms are rendered with sinusoidal animation but their positions are calculated only in the render layer. The player passes through them because there's no collision. This task moves the position calculation into the game loop, adds collision detection similar to static platforms, and makes the player ride along with moving platforms.
- smallest_safe_scope: Moving platform position update in game loop, player-platform collision (landing on top), player rides with platform movement. No platform crushing or breakable moving platforms.
- depends_on: T-0028
- priority: normal
- should_spawn_now: no

## Recommended next task
**F-1 (Enemy AI and collision)** — enemies are the biggest missing gameplay element. Without them, levels have no challenge beyond spike placement. F-2 (HUD) is also high-value but less critical since the game is playable without it.

## Notes for planner
- The physics code is well-structured with separate collision helpers, making it straightforward to add enemy collision on top.
- The `checkSpikeCollision` pattern (check points at player edges) can be adapted for enemy overlap detection.
- Moving platform collision (F-3) requires refactoring `renderMovingPlatforms` to separate position calculation from rendering — consider this scope when planning.
