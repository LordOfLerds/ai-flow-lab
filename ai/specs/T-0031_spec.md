# T-0031 Spec

## Task metadata
- **task_id:** T-0031
- **title:** Add moving platform collision and ride mechanics
- **lane_type:** feature-lane
- **executor:** codex
- **parent_task_id:** T-0030

## Problem statement
Moving platforms are generated during level creation with sinusoidal motion parameters (`dir`, `speed`, `phase`, `amplitude`) but their position is calculated only inside `renderMovingPlatforms()`. The player passes through them because no collision detection exists for moving platforms. The position calculation happens in the render layer, not the game loop, so there's no game-state position to collide against.

## Source of truth
- `index.html` (repo root) — self-contained game file (~1163 lines)

### Key existing code references:
- `gs.level.movingPlatforms` — array of platform objects from `generateLevel()`
- Moving platform object: `{ x, y, w, h, dir: 'h'|'v', speed, phase, amplitude }`
- Base position: `x`, `y` — the center/origin of oscillation
- Current render position calculation (in `renderMovingPlatforms()`):
  - Horizontal: `vx = p.x + Math.sin(frameCount * p.speed * 0.02 + p.phase) * p.amplitude`
  - Vertical: `vy = p.y + Math.sin(frameCount * p.speed * 0.02 + p.phase) * p.amplitude`
- `w`: platform width in pixels (48-80px, i.e. 3-5 tiles), `h`: CONFIG.TILE_SIZE (16px)
- `resolveYCollision(p, oldBottom)` — existing vertical collision with one-way PLATFORM tile support
- `updatePlayer()` — existing player physics function
- `gs.player` — `{ x, y, vx, vy, w: 12, h: 16, onGround, ... }`
- `CONFIG.TILE_SIZE`: 16
- `frameCount` — global frame counter used for sin wave timing

## Desired behavior

### 1. Move position calculation from render to game loop
Add `updateMovingPlatforms()` function, called from `gameLoop()` during PLAYING phase. Each platform stores its current world position (`currentX`, `currentY`) and its previous position (`prevX`, `prevY`) for delta calculation.

```javascript
function updateMovingPlatforms() {
  for (const mp of gs.level.movingPlatforms) {
    mp.prevX = mp.currentX !== undefined ? mp.currentX : mp.x;
    mp.prevY = mp.currentY !== undefined ? mp.currentY : mp.y;

    if (mp.dir === 'h') {
      mp.currentX = mp.x + Math.sin(frameCount * mp.speed * 0.02 + mp.phase) * mp.amplitude;
      mp.currentY = mp.y;
    } else if (mp.dir === 'v') {
      mp.currentX = mp.x;
      mp.currentY = mp.y + Math.sin(frameCount * mp.speed * 0.02 + mp.phase) * mp.amplitude;
    }

    mp.deltaX = mp.currentX - mp.prevX;
    mp.deltaY = mp.currentY - mp.prevY;
  }
}
```

### 2. Add moving platform collision in player update
After standard tile collision in `updatePlayer()`, check each moving platform for overlap. One-way collision only (player can jump through from below, lands on top):

```javascript
function checkMovingPlatformCollision(player) {
  const p = player;
  for (const mp of gs.level.movingPlatforms) {
    if (mp.currentX === undefined) continue;

    const platTop = mp.currentY;
    const platLeft = mp.currentX;
    const platRight = mp.currentX + mp.w;

    // One-way: player must be falling and was above platform last frame
    if (p.vy >= 0 &&
        p.x + p.w > platLeft && p.x < platRight &&
        p.y + p.h >= platTop && p.y + p.h <= platTop + 8) {

      // Only collide if player's feet were above platform top last frame
      const prevBottom = p.y + p.h - p.vy;
      if (prevBottom <= platTop + 2) {
        p.y = platTop - p.h;
        p.vy = 0;
        p.onGround = true;
        p.coyoteTimer = CONFIG.COYOTE_FRAMES;
        p.jumpsLeft = p.maxJumps;
        p.canDash = true;

        // Ride the platform: apply platform delta to player
        p.x += mp.deltaX;
        p.y += mp.deltaY;

        p._onMovingPlatform = true; // Flag for this frame
      }
    }
  }
}
```

### 3. Update renderMovingPlatforms() to use stored positions
Instead of recalculating position in the render function, use `mp.currentX` and `mp.currentY`:

```javascript
function renderMovingPlatforms() {
  for (const mp of gs.level.movingPlatforms) {
    const vx = mp.currentX !== undefined ? mp.currentX : mp.x;
    const vy = mp.currentY !== undefined ? mp.currentY : mp.y;

    const px = vx - gs.camera.x;
    const py = vy - gs.camera.y;

    ctx.fillStyle = TILE_COLORS[TILE.PLATFORM][0];
    ctx.fillRect(px, py, mp.w, mp.h);
    ctx.fillStyle = '#9c7';
    ctx.fillRect(px, py, mp.w, 1);
    ctx.fillStyle = TILE_COLORS[TILE.PLATFORM][1];
    ctx.fillRect(px, py + mp.h - 1, mp.w, 1);
  }
}
```

### 4. Wire into gameLoop()
Execution order in `gameLoop()`:
```
updateMovingPlatforms();  // Calculate platform positions first
updateEnemies();
updatePlayer();           // Now includes moving platform collision
checkEnemyCollision();
```

`updateMovingPlatforms()` must run BEFORE `updatePlayer()` so platform positions are current when collision is checked.

### 5. Call moving platform collision from updatePlayer()
At the end of `updatePlayer()`, after tile collision resolution but before interaction checks:
```javascript
p._onMovingPlatform = false;
checkMovingPlatformCollision(p);
```

### 6. Initialize platform positions in startGame()
In `startGame()`, after generating the level, initialize `currentX`/`currentY` for each moving platform so the first frame has valid positions:
```javascript
for (const mp of gs.level.movingPlatforms) {
  mp.currentX = mp.x;
  mp.currentY = mp.y;
  mp.prevX = mp.x;
  mp.prevY = mp.y;
  mp.deltaX = 0;
  mp.deltaY = 0;
}
```

## Constraints
- **Single file only:** All changes in `index.html`
- **Preserve existing functions:** Do not modify `generateLevel()`, `createPlayer()`, `updateEnemies()`, `checkEnemyCollision()`, `initHUD()`, `updateHUD()`
- **One-way collision only:** Player can jump up through moving platforms, only collides when falling onto the top surface
- **No crushing:** If a moving platform pushes the player into a ceiling or wall, do NOT kill the player — just stop platform ride (out of scope for this task)
- **Render function change is minimal:** Only change `renderMovingPlatforms()` to use stored positions instead of recalculating
- **No new platform types:** Use existing platform data structure, only add `currentX`, `currentY`, `prevX`, `prevY`, `deltaX`, `deltaY` properties

## Acceptance criteria
1. Player can land on a moving platform from above
2. Player cannot collide with moving platforms from below (one-way)
3. Player rides horizontal moving platforms (moves with the platform)
4. Player rides vertical moving platforms (moves with the platform)
5. Player can jump off a moving platform normally
6. Coyote time works when walking off a moving platform edge
7. Moving platform visual position matches collision position exactly (no desync)
8. No console errors
9. No performance regression (60fps maintained)
10. Existing tile collision and enemy collision still work correctly

## Risks
- **Ride jitter:** Applying platform delta after position resolution could cause micro-jitter on vertical platforms. Mitigate by applying delta before next frame's collision.
- **Edge detection:** The 8px overlap threshold for landing detection needs tuning — too tight means missing landings on fast platforms, too loose means snapping from far away.
- **Fast platforms:** High-speed platforms (amplitude * speed) could move the player through walls when riding. Acceptable for current speed ranges (0.5-1.3 speed, 40-100 amplitude).
- **Platform-to-platform transfer:** Landing on one moving platform while riding another is not explicitly handled. Should work naturally since collision runs for all platforms each frame.

## Open questions
1. Should the player maintain horizontal momentum when jumping off a moving horizontal platform? **Recommendation:** No — current physics already handle this since player.vx is independent of platform movement.
2. Should moving platforms affect enemies? **Recommendation:** No — out of scope. Enemies don't interact with moving platforms.
3. Should there be a visual indicator that a platform is moving (e.g., arrows)? **Recommendation:** No — the sinusoidal motion is already visible.
