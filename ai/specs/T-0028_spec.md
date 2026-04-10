# T-0028 Spec

## Task metadata
- **task_id:** T-0028
- **title:** Implement player physics, movement, and collision detection
- **lane_type:** feature-lane
- **executor:** codex
- **parent_task_id:** T-0027

## Problem statement
The player sprite renders at its start position but cannot move. The game has input handling (`keys` object tracks pressed keys), physics constants in CONFIG (GRAVITY, MAX_FALL_SPEED, PLAYER_SPEED, JUMP_VELOCITY, COYOTE_FRAMES, JUMP_BUFFER_FRAMES), and a player object with velocity/state properties — but there is no `updatePlayer()` function to process input, apply physics, or check tile collisions. The player needs to run, jump, and interact with the tile world.

## Source of truth
- `index.html` (repo root) — self-contained game file (~726 lines)
- `docs/DOMAIN_MODEL.md` — player entity model
- `docs/INVARIANTS.md` — physics invariants

### Key existing code references:
- `CONFIG` — `GRAVITY: 0.6, MAX_FALL_SPEED: 12, PLAYER_SPEED: 3.2, JUMP_VELOCITY: -10.5, COYOTE_FRAMES: 5, JUMP_BUFFER_FRAMES: 4, DASH_SPEED: 12, DASH_FRAMES: 8, TILE_SIZE: 16`
- `keys` object — populated by keydown/keyup listeners (ArrowLeft, ArrowRight, ArrowUp, Space, KeyA, KeyD, KeyW, ShiftLeft, ShiftRight)
- `lastJumpPress` / `lastDashPress` — frame timestamps for buffered input
- `frameCount` — incremented each frame in gameLoop
- `gs.player` — `{ x, y, vx, vy, w: 12, h: 16, onGround, coyoteTimer, jumpBufferTimer, facing, frame, frameTimer, alive, invincible, dashTimer, dashDir, canDash, jumpsLeft, maxJumps, shieldHP, shieldMax, skin }`
- `gs.level.tiles` — 2D array `[row][col]` of TILE enum values
- `TILE` — `{ EMPTY: 0, GRASS: 1, STONE: 2, SPIKE: 3, ICE: 4, BREAKABLE: 5, COIN: 6, GEM: 7, POWERUP_SPEED: 8, POWERUP_SHIELD: 9, POWERUP_MAGNET: 10, PLATFORM: 11, EXIT: 20 }`
- Solid tiles (block movement): GRASS, STONE, ICE, BREAKABLE, PLATFORM
- Hazard tiles: SPIKE
- Collectible tiles: COIN, GEM, POWERUP_*
- `gs.camera` — follows player via `updateCamera()` (already implemented in T-0027)

## Desired behavior

### 1. Add `updatePlayer()` function
Called once per frame from `gameLoop()`, before `render()`. Handles all player physics and input.

### 2. Horizontal movement
- If `keys.ArrowLeft` or `keys.KeyA`: `gs.player.vx = -CONFIG.PLAYER_SPEED`; `gs.player.facing = -1`
- If `keys.ArrowRight` or `keys.KeyD`: `gs.player.vx = CONFIG.PLAYER_SPEED`; `gs.player.facing = 1`
- If neither: `gs.player.vx = 0` (instant stop for precise platformer feel)
- On ICE tiles: instead of instant stop, apply friction: `gs.player.vx *= 0.96` when no input, and acceleration is slower `+= 0.15 * direction` instead of instant speed
- Speed skin bonus: if `gs.player.skin.bonus === 'speed'`, multiply speed by 1.1
- Active speed powerup: if `gs.powerUps.speed > 0`, multiply speed by 1.3

### 3. Gravity and vertical movement
- Apply gravity: `gs.player.vy += CONFIG.GRAVITY`
- Clamp fall speed: `gs.player.vy = Math.min(gs.player.vy, CONFIG.MAX_FALL_SPEED)`
- Apply velocity: first move X (`gs.player.x += gs.player.vx`), resolve X collisions, then move Y (`gs.player.y += gs.player.vy`), resolve Y collisions

### 4. Tile collision detection
Create helper `function getTileAt(px, py)` that returns the tile type at pixel position:
- `col = Math.floor(px / CONFIG.TILE_SIZE)`, `row = Math.floor(py / CONFIG.TILE_SIZE)`
- Return `gs.level.tiles[row]?.[col] ?? TILE.EMPTY`

Create helper `function isSolid(tileType)`:
- Returns true for: GRASS, STONE, ICE, BREAKABLE, PLATFORM

**X-axis collision resolution:**
- After moving X, check the player's leading edge (4 corner points):
  - Top-left: `(player.x, player.y)`
  - Top-right: `(player.x + player.w - 1, player.y)`
  - Bottom-left: `(player.x, player.y + player.h - 1)`
  - Bottom-right: `(player.x + player.w - 1, player.y + player.h - 1)`
- Also check midpoints for tall players: `(player.x, player.y + player.h/2)` and `(player.x + player.w - 1, player.y + player.h/2)`
- If any point is inside a solid tile, push the player back:
  - Moving right: `player.x = col * TILE_SIZE - player.w`
  - Moving left: `player.x = (col + 1) * TILE_SIZE`
- Set `player.vx = 0` after push-back

**Y-axis collision resolution:**
- After moving Y, check the same corner/edge points
- If falling (vy > 0) and bottom edge hits solid: `player.y = row * TILE_SIZE - player.h`; `player.vy = 0`; `player.onGround = true`
- If rising (vy < 0) and top edge hits solid: `player.y = (row + 1) * TILE_SIZE`; `player.vy = 0` (head bonk)
- If no ground below: `player.onGround = false`

### 5. Jumping with coyote time and jump buffering
- **Coyote time:** When player walks off a ledge (was onGround, now isn't), start `coyoteTimer = CONFIG.COYOTE_FRAMES`. Decrement each frame. While coyoteTimer > 0, player can still jump.
- **Jump buffering:** When player presses jump (Space/ArrowUp/W), record in `lastJumpPress = frameCount`. In updatePlayer, check if `frameCount - lastJumpPress < CONFIG.JUMP_BUFFER_FRAMES` — if so, and player is on ground or has coyote time, execute jump.
- **Jump execution:** `player.vy = CONFIG.JUMP_VELOCITY` (-10.5); `player.onGround = false`; `player.coyoteTimer = 0`; `player.jumpsLeft--`
- Jump skin bonus: if `gs.player.skin.bonus === 'jump'`, multiply jump velocity by 1.12

### 6. Animation frame update
- When moving horizontally on ground: increment `player.frameTimer++`. When `frameTimer >= 8`, advance `player.frame = (player.frame + 1) % 4`, reset frameTimer
- When not moving or in air: `player.frame = 0`

### 7. Spike collision (damage)
- After position resolution, check if any player corner overlaps a SPIKE tile
- If so and `player.invincible <= 0`:
  - If `player.shieldHP > 0`: decrement shieldHP, set `player.invincible = 60` (1 second)
  - Else: call `killPlayer()` (defined below)

### 8. Collectible pickup
- After position resolution, check which tile cells the player overlaps
- For COIN: increment `gs.coins++`, `gs.score += 10`, set tile to EMPTY
- For GEM: increment `gs.gems++`, `gs.score += 50`, set tile to EMPTY
- For POWERUP_SPEED: `gs.powerUps.speed = 600` (10 seconds), set tile to EMPTY
- For POWERUP_SHIELD: `gs.player.shieldHP = gs.player.shieldMax || 1`, set tile to EMPTY
- For POWERUP_MAGNET: `gs.powerUps.magnet = 600`, set tile to EMPTY

### 9. Exit tile detection
- If player overlaps EXIT tile: advance to next level
- `gs.levelNum++`; call `startGame()` (which regenerates level, resets player)

### 10. Kill and respawn
- `function killPlayer()`: set `gs.phase = 'DEAD'`; `gs.deathCount++`
- In `render()`, add a `DEAD` phase handler: show "You Died!" with a "Retry" button
- Retry: reset player to start position, keep score/coins, call `startGame()` with same level

### 11. Powerup timers
- In `updatePlayer()`, decrement active powerup timers: `if (gs.powerUps.speed > 0) gs.powerUps.speed--`; same for shield, magnet
- Decrement `player.invincible` if > 0

### 12. Score tracking
- After each frame, call `scoreTracker.award(gs.progressBase + gs.player.x + gs.player.w)` to track progress-based score
- Update HUD score display

### 13. Wire into gameLoop
Update `gameLoop()`:
```
function gameLoop() {
  frameCount++;
  if (gs.phase === 'PLAYING') {
    updatePlayer();
  }
  render();
  requestAnimationFrame(gameLoop);
}
```

## Constraints
- **Single file only:** All changes in `index.html`
- **Preserve existing rendering:** Do not modify any render* functions from T-0027
- **Preserve existing functions:** Do not modify `generateLevel()`, `createPlayer()`, `CONFIG`, `TILE`, `TILE_COLORS`, `SKINS`, `SKILLS`
- **No enemy AI:** Enemies don't move or collide with player (separate task)
- **No dash mechanic:** Dash is a skill unlock, not base gameplay (separate task)
- **No double jump:** Double jump is a skill unlock, handle only single jump for now
- **Platform one-way collision:** PLATFORM tiles should only block from above (player can jump up through them). Check: only resolve Y collision if `player.vy > 0` (falling) and `player.y + player.h` was above the platform top before the move.

## Acceptance criteria
1. Arrow keys / WASD move the player left and right
2. Space / ArrowUp / W makes the player jump
3. Player falls with gravity and lands on solid tiles
4. Player cannot walk through walls (X collision works)
5. Player cannot fall through floors (Y collision works)
6. Camera follows player smoothly as they move
7. Coyote time allows jumping briefly after walking off a ledge
8. Jump buffer allows pressing jump slightly before landing
9. Collecting coins increases coin count and score
10. Collecting gems increases gem count and score
11. Hitting spikes with no shield kills player (shows death screen)
12. Reaching EXIT advances to next level
13. Player animation cycles while running
14. ICE tiles make movement slippery
15. Platforms allow jumping up through them but landing on top
16. No console errors

## Risks
- PLATFORM one-way collision is tricky — must track previous Y position to know if player was above before
- ICE friction may feel wrong without playtesting — keep values tunable
- collectible pickup area: if player is smaller than tile, might miss pickups. Use center-of-overlap check.

## Open questions
1. Should BREAKABLE tiles break when hit from below (Mario-style)? **Recommendation:** Yes, break on head-bonk, replace with EMPTY.
2. Should player bounce when stomping enemies? **Recommendation:** Out of scope — enemy collision is a separate task.
3. Should score display update in real-time or only on changes? **Recommendation:** Update every frame — it's cheap.
