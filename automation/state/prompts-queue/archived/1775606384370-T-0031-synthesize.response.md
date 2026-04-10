# T-0031 Implementation Brief

## Goal
Move moving platform position calculation from `renderMovingPlatforms()` into the game loop and add one-way collision so the player can land on and ride moving platforms horizontally and vertically.

## Scope
Modify only `index.html` (repo root). Add `updateMovingPlatforms()` and `checkMovingPlatformCollision()` functions. Update `renderMovingPlatforms()` to use stored positions. Wire into `gameLoop()` and `startGame()`.

## Constraints
1. **Single file:** All changes in `index.html` only
2. **Preserve existing:** Do not modify `generateLevel()`, `createPlayer()`, `updateEnemies()`, `checkEnemyCollision()`, `initHUD()`, `updateHUD()`, `updatePlayer()` internals (only add the moving platform collision call at the end)
3. **One-way collision only:** Player passes through from below, collides only when falling onto top
4. **No crushing mechanics:** If platform pushes player into wall, clamp player position — don't kill
5. **Single platform per frame:** Break after first collision to prevent double-delta (Gemini fix #1)
6. **No vertical delta on ride:** Snap to platform top each frame — don't add deltaY (Gemini fix #2)

## File targets
- `index.html` (repo root) — add new functions, update `renderMovingPlatforms()`, update `gameLoop()`, update `startGame()`

### Implementation details (addressing Gemini critique):

**1. Add `updateMovingPlatforms()` function** — insert before `updateEnemies()`:

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

**2. Add `checkMovingPlatformCollision()` function** — addresses all Gemini fixes:

```javascript
function checkMovingPlatformCollision(player) {
  const p = player;
  p._onMovingPlatform = false;

  for (const mp of gs.level.movingPlatforms) {
    if (mp.currentX === undefined) continue;

    const platTop = mp.currentY;
    const platLeft = mp.currentX;
    const platRight = mp.currentX + mp.w;

    // One-way: player must be falling or stationary vertically
    if (p.vy < 0) continue; // Moving upward = pass through

    // Horizontal overlap check
    if (p.x + p.w <= platLeft || p.x >= platRight) continue;

    // Vertical landing check: player's feet at or near platform top
    const playerBottom = p.y + p.h;
    if (playerBottom < platTop || playerBottom > platTop + 10) continue;

    // Previous frame check: was player above the platform?
    // Use vy to estimate previous bottom position
    const prevBottom = playerBottom - p.vy;
    if (prevBottom > platTop + 2) continue; // Was already overlapping — not a landing

    // COLLISION — snap to top (Gemini fix #2: do NOT add deltaY, snap handles it)
    p.y = platTop - p.h;
    p.vy = 0;
    p.onGround = true;
    p.coyoteTimer = CONFIG.COYOTE_FRAMES;
    p.jumpsLeft = p.maxJumps;
    p.canDash = true;

    // Ride horizontally only — apply deltaX with wall clamping (Gemini fix #3)
    if (Math.abs(mp.deltaX) > 0) {
      const newX = p.x + mp.deltaX;
      // Basic wall check: don't push into solid tiles
      const checkX = mp.deltaX > 0 ? newX + p.w : newX;
      const midY = p.y + p.h / 2;
      if (!isSolid(getTileAt(checkX, midY))) {
        p.x = newX;
      }
    }

    p._onMovingPlatform = true;
    break; // Gemini fix #1: only one platform collision per frame
  }
}
```

**Key Gemini fixes applied:**
- **Fix #1 (break):** After resolving collision with one platform, `break` immediately — prevents double-delta from overlapping platforms
- **Fix #2 (no vertical delta):** For vertical platforms, snap `p.y = platTop - p.h` each frame. Since `platTop` already reflects the platform's new position, this inherently tracks vertical movement without adding `deltaY`. The platform's motion IS the snap target.
- **Fix #3 (wall clamping):** Before applying horizontal ride delta, check if the destination would push the player into a solid tile. If so, skip the horizontal movement. This prevents wall penetration from horizontal platform rides.

**3. Update `renderMovingPlatforms()` to use stored positions:**

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

**4. Update `gameLoop()` execution order:**

```javascript
function gameLoop() {
  frameCount++;
  if (gs.phase === 'PLAYING') {
    updateMovingPlatforms(); // Platform positions FIRST
    updateEnemies();
    updatePlayer();
    checkMovingPlatformCollision(gs.player); // After player movement
    checkEnemyCollision();
  }
  render();
  requestAnimationFrame(gameLoop);
}
```

Note: `checkMovingPlatformCollision` runs AFTER `updatePlayer()` (which handles tile collision and gravity) but BEFORE the next frame, so the snap position is fresh.

**5. Initialize platform positions in `startGame()`:**

After `gs.level = generateLevel(gs.levelNum)`, add:
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

Also add this same initialization in `checkExitCollision()` where the next level is generated (Gemini edge case: level transitions).

## Tests required
1. Player lands on horizontal moving platform from above
2. Player rides horizontally with the platform (moves with it)
3. Player lands on vertical moving platform from above
4. Player stays on vertical platform as it moves up and down
5. Player can jump through a moving platform from below (no collision)
6. Player can jump off a moving platform normally
7. Coyote time works when walking off moving platform edge
8. Platform visual position matches collision position (no desync)
9. Horizontal platform doesn't push player into walls
10. Two overlapping platforms don't cause double-speed movement
11. Level transition re-initializes platform positions
12. No console errors
13. 60fps maintained

## Chosen minimal policy
- **Vertical ride = snap each frame:** Don't track vertical delta. Each frame, snap `p.y = platTop - p.h`. This is simpler and eliminates the double-movement bug identified by Gemini.
- **Horizontal ride = delta + wall check:** Apply `mp.deltaX` to `p.x` with a basic `isSolid()` check to prevent wall penetration.
- **Single platform per frame:** Break after first collision. Overlapping platforms are rare and the simplest solution is correct here.
- **Landing threshold = 10px:** Generous enough for normal platform speeds. Fast platforms (unlikely at current config) could theoretically skip over this window but the max speed is ~1.3 * amplitude * 0.02 ≈ 1-2 px/frame, well within the threshold.
- **frameCount timing:** `frameCount` is incremented at the top of `gameLoop()` before `updateMovingPlatforms()`, so positions are calculated with the current frame's index. Render uses the same positions (stored on the platform object), so there's no desync.

## Risks
1. **Vertical jitter:** Snapping `p.y` each frame while gravity also sets `p.vy` could cause micro-oscillation. Mitigated by setting `p.vy = 0` on collision.
2. **Sub-pixel drift:** `Math.sin()` returns floats. Player position may accumulate floating-point artifacts over long rides. Acceptable — canvas rendering floors pixel positions.
3. **Platform speed limits:** Max velocity at current config is ~2 px/frame. The 10px landing threshold handles this. If future tasks increase platform speed, the threshold needs revisiting.

## Explicit non-goals
- Crushing mechanics (platform pushing player into ceiling/floor)
- Enemy interaction with moving platforms
- Breakable or disappearing moving platforms
- Moving platform sound effects
- Variable platform motion patterns (only sinusoidal)
- Moving platform visual indicators (arrows, glow)
