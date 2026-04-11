---
type: brief
task_id: T-0028
created: 2026-04-10
tags: [ai-flow-lab, brief]
---

# T-0028 Implementation Brief

## Goal
Add a complete `updatePlayer()` function to `index.html` that handles keyboard input, gravity, tile collision, jumping (with coyote time and jump buffering), collectible pickup, spike damage, death/respawn, and exit detection. After this task, the player can run and jump through the level.

## Scope
Modify only `index.html` (repo root). Add `updatePlayer()`, `getTileAt()`, `isSolid()`, `killPlayer()` helper functions. Update `gameLoop()` to call `updatePlayer()`. Add a DEAD phase to `render()`.

## Constraints
1. **Single file:** All changes in `index.html` only
2. **Preserve rendering:** Do not modify renderBackground, renderTiles, renderMovingPlatforms, renderEntities, renderPlayer, updateCamera
3. **Preserve existing:** Do not modify generateLevel, createPlayer, CONFIG, TILE, TILE_COLORS, SKINS, SKILLS
4. **No enemy AI/collision:** Enemies are rendered but don't move or interact (separate task)
5. **No dash mechanic:** Out of scope
6. **Single jump only:** jumpsLeft logic present but maxJumps stays 1 until double_jump skill is unlocked
7. **Platform one-way:** PLATFORM tiles block from above only — not from sides or below

## File targets
- `index.html` (repo root) — add new functions before `render()`, update `gameLoop()`

### Implementation details (addressing Gemini critique):

**1. Helper functions** — insert before `renderBackground()`:

```javascript
function getTileAt(px, py) {
  const col = Math.floor(px / CONFIG.TILE_SIZE);
  const row = Math.floor(py / CONFIG.TILE_SIZE);
  if (row < 0 || row >= gs.level.height || col < 0 || col >= gs.level.width) return TILE.EMPTY;
  return gs.level.tiles[row][col];
}

function isSolid(tileType) {
  return tileType === TILE.GRASS || tileType === TILE.STONE || tileType === TILE.ICE || tileType === TILE.BREAKABLE;
  // NOTE: PLATFORM is NOT included here — it has special one-way logic
}

function isOnIce(player) {
  // Check tile directly below player's feet
  const belowTile = getTileAt(player.x + player.w / 2, player.y + player.h + 1);
  return belowTile === TILE.ICE;
}
```

**Key fix (Gemini contradiction #2):** `isSolid()` does NOT include PLATFORM. Platform collision is handled separately with one-way logic only in Y-axis resolution.

**2. updatePlayer() function** — the core physics loop:

```javascript
function updatePlayer() {
  const p = gs.player;
  if (!p || !p.alive) return;

  // Store old Y for platform one-way check (Gemini recommendation)
  const oldY = p.y;
  const oldBottom = oldY + p.h;

  // Decrement timers
  if (p.invincible > 0) p.invincible--;
  if (gs.powerUps.speed > 0) gs.powerUps.speed--;
  if (gs.powerUps.shield > 0) gs.powerUps.shield--;
  if (gs.powerUps.magnet > 0) gs.powerUps.magnet--;

  // === HORIZONTAL MOVEMENT ===
  const onIce = isOnIce(p);
  const wantLeft = keys['ArrowLeft'] || keys['KeyA'];
  const wantRight = keys['ArrowRight'] || keys['KeyD'];

  let baseSpeed = CONFIG.PLAYER_SPEED;
  if (p.skin && p.skin.bonus === 'speed') baseSpeed *= 1.1;
  if (gs.powerUps.speed > 0) baseSpeed *= 1.3;

  if (onIce) {
    // Ice: gradual acceleration, friction-based deceleration (Gemini fix)
    if (wantLeft) { p.vx -= 0.15; p.facing = -1; }
    else if (wantRight) { p.vx += 0.15; p.facing = 1; }
    else { p.vx *= 0.96; } // Friction when no input
    p.vx = Math.max(-baseSpeed, Math.min(p.vx, baseSpeed)); // Clamp
    if (Math.abs(p.vx) < 0.1 && !wantLeft && !wantRight) p.vx = 0;
  } else {
    // Normal: instant speed
    if (wantLeft) { p.vx = -baseSpeed; p.facing = -1; }
    else if (wantRight) { p.vx = baseSpeed; p.facing = 1; }
    else { p.vx = 0; }
  }

  // === GRAVITY ===
  p.vy += CONFIG.GRAVITY;
  if (p.vy > CONFIG.MAX_FALL_SPEED) p.vy = CONFIG.MAX_FALL_SPEED;

  // === X MOVEMENT + COLLISION ===
  p.x += p.vx;
  // Clamp to map bounds (Gemini: out-of-bounds check)
  p.x = Math.max(0, Math.min(p.x, gs.level.width * CONFIG.TILE_SIZE - p.w));

  // X collision resolution — check 6 points (4 corners + 2 midpoints)
  resolveXCollision(p);

  // === Y MOVEMENT + COLLISION ===
  p.y += p.vy;

  // Fall out of map = death (Gemini: out-of-bounds)
  if (p.y > gs.level.height * CONFIG.TILE_SIZE + 50) {
    killPlayer();
    return;
  }

  const wasAbove = oldBottom; // Save for platform check
  resolveYCollision(p, wasAbove);

  // === COYOTE TIME ===
  if (p.onGround) {
    p.coyoteTimer = CONFIG.COYOTE_FRAMES;
    p.jumpsLeft = p.maxJumps;
  } else {
    if (p.coyoteTimer > 0) p.coyoteTimer--;
  }

  // === JUMPING ===
  const jumpBuffered = (frameCount - lastJumpPress) < CONFIG.JUMP_BUFFER_FRAMES;
  if (jumpBuffered && (p.onGround || p.coyoteTimer > 0) && p.jumpsLeft > 0) {
    let jumpVel = CONFIG.JUMP_VELOCITY;
    if (p.skin && p.skin.bonus === 'jump') jumpVel *= 1.12;
    p.vy = jumpVel;
    p.onGround = false;
    p.coyoteTimer = 0;
    p.jumpsLeft--;
    lastJumpPress = -100; // Consume the buffer
  }

  // === ANIMATION ===
  if (p.onGround && Math.abs(p.vx) > 0.5) {
    p.frameTimer++;
    if (p.frameTimer >= 8) { p.frame = (p.frame + 1) % 4; p.frameTimer = 0; }
  } else {
    p.frame = 0; p.frameTimer = 0;
  }

  // === TILE INTERACTIONS ===
  checkTilePickups(p);
  checkSpikeCollision(p);
  checkExitCollision(p);

  // === SCORE TRACKING ===
  scoreTracker.award(gs.progressBase + p.x + p.w);
  gs.score = scoreTracker.getHighWater();
}
```

**3. Collision resolution helpers:**

```javascript
function resolveXCollision(p) {
  const TS = CONFIG.TILE_SIZE;
  // Check points along player edges
  const checkYs = [p.y + 1, p.y + p.h / 2, p.y + p.h - 1];

  if (p.vx > 0) { // Moving right
    const rightEdge = p.x + p.w;
    for (const cy of checkYs) {
      const tile = getTileAt(rightEdge, cy);
      if (isSolid(tile)) {
        const col = Math.floor(rightEdge / TS);
        p.x = col * TS - p.w;
        p.vx = 0;
        break;
      }
    }
  } else if (p.vx < 0) { // Moving left
    for (const cy of checkYs) {
      const tile = getTileAt(p.x, cy);
      if (isSolid(tile)) {
        const col = Math.floor(p.x / TS);
        p.x = (col + 1) * TS;
        p.vx = 0;
        break;
      }
    }
  }
}

function resolveYCollision(p, oldBottom) {
  const TS = CONFIG.TILE_SIZE;
  const checkXs = [p.x + 1, p.x + p.w / 2, p.x + p.w - 1];

  p.onGround = false;

  if (p.vy > 0) { // Falling
    const bottomEdge = p.y + p.h;
    for (const cx of checkXs) {
      const tile = getTileAt(cx, bottomEdge);
      const row = Math.floor(bottomEdge / TS);
      const platformTop = row * TS;

      if (isSolid(tile)) {
        p.y = platformTop - p.h;
        p.vy = 0;
        p.onGround = true;
        break;
      }
      // One-way platform: only collide if player was above before (Gemini fix)
      if (tile === TILE.PLATFORM && oldBottom <= platformTop + 2) {
        p.y = platformTop - p.h;
        p.vy = 0;
        p.onGround = true;
        break;
      }
    }
  } else if (p.vy < 0) { // Rising
    for (const cx of checkXs) {
      const tile = getTileAt(cx, p.y);
      if (isSolid(tile)) {
        const row = Math.floor(p.y / TS);
        p.y = (row + 1) * TS;
        p.vy = 0;
        // Breakable tiles break on head-bonk (Gemini recommendation)
        if (tile === TILE.BREAKABLE) {
          gs.level.tiles[row][Math.floor(cx / TS)] = TILE.EMPTY;
        }
        break;
      }
      // NOTE: Do NOT collide with PLATFORM when rising — player passes through
    }
  }
}
```

**4. Tile interactions:**

```javascript
function checkTilePickups(p) {
  const TS = CONFIG.TILE_SIZE;
  // Check all tiles the player overlaps
  const startCol = Math.floor(p.x / TS);
  const endCol = Math.floor((p.x + p.w - 1) / TS);
  const startRow = Math.floor(p.y / TS);
  const endRow = Math.floor((p.y + p.h - 1) / TS);

  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      if (row < 0 || row >= gs.level.height || col < 0 || col >= gs.level.width) continue;
      const tile = gs.level.tiles[row][col];

      if (tile === TILE.COIN) {
        gs.coins++; gs.score += 10;
        gs.level.tiles[row][col] = TILE.EMPTY;
      } else if (tile === TILE.GEM) {
        gs.gems++; gs.score += 50;
        gs.level.tiles[row][col] = TILE.EMPTY;
      } else if (tile === TILE.POWERUP_SPEED) {
        gs.powerUps.speed = 600;
        gs.level.tiles[row][col] = TILE.EMPTY;
      } else if (tile === TILE.POWERUP_SHIELD) {
        gs.player.shieldHP = gs.player.shieldMax || 1;
        gs.level.tiles[row][col] = TILE.EMPTY;
      } else if (tile === TILE.POWERUP_MAGNET) {
        gs.powerUps.magnet = 600;
        gs.level.tiles[row][col] = TILE.EMPTY;
      }
    }
  }
}

function checkSpikeCollision(p) {
  const TS = CONFIG.TILE_SIZE;
  const checkPoints = [
    [p.x + 2, p.y + p.h - 2],
    [p.x + p.w - 2, p.y + p.h - 2],
    [p.x + p.w / 2, p.y + p.h - 1]
  ];
  for (const [cx, cy] of checkPoints) {
    if (getTileAt(cx, cy) === TILE.SPIKE) {
      if (p.invincible > 0) return;
      if (p.shieldHP > 0) { p.shieldHP--; p.invincible = 60; return; }
      killPlayer();
      return;
    }
  }
}

function checkExitCollision(p) {
  const TS = CONFIG.TILE_SIZE;
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  if (getTileAt(cx, cy) === TILE.EXIT) {
    gs.levelNum++;
    startGame();
  }
}
```

**5. Kill/Death system:**

```javascript
function killPlayer() {
  gs.player.alive = false;
  gs.deathCount++;
  gs.phase = 'DEAD';
}
```

**6. Update render() — add DEAD phase** after the PLAYING block:

```javascript
} else if (gs.phase === 'DEAD') {
  // Still render the level in background
  updateCamera();
  renderBackground();
  renderTiles();
  renderMovingPlatforms();
  renderEntities();
  // Dark overlay
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
  // Death text
  ctx.fillStyle = '#f44';
  ctx.font = '32px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('You Died!', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 - 20);
  ctx.fillStyle = '#aaa';
  ctx.font = '16px monospace';
  ctx.fillText('Press R or click to retry', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 + 20);
}
```

**7. Add retry input** — in the keydown handler, add:
```javascript
if (e.code === 'KeyR' && gs.phase === 'DEAD') { startGame(); }
```
Also add click handler on canvas: `canvas.addEventListener('click', () => { if (gs.phase === 'DEAD') startGame(); });`

**8. Update gameLoop():**
```javascript
function gameLoop() {
  frameCount++;
  if (gs.phase === 'PLAYING') {
    updatePlayer();
  }
  render();
  requestAnimationFrame(gameLoop);
}
```

## Tests required
1. Arrow keys move player left/right
2. Space/Up/W makes player jump
3. Player lands on ground tiles
4. Player cannot walk through walls
5. Camera follows as player moves
6. Coins disappear when touched, coin counter increases
7. Spikes kill player (death screen appears)
8. Press R to retry after death
9. ICE tiles cause slippery movement
10. Platforms allow jumping up through from below
11. Player cannot walk off left edge of map
12. Falling below map kills player
13. Breakable tiles break on head-bonk
14. EXIT tile advances to next level
15. No console errors

## Chosen minimal policy
- **Platform collision:** Separate from `isSolid()` — handled with `oldBottom` check in Y-resolution only. No X collision with platforms.
- **Ice detection:** Check tile below player center, not corner points.
- **Death state:** Minimal — dark overlay + text + R to retry. No animation.
- **Enemy collision:** Not implemented — enemies are visual only for now.
- **Dash/Double jump:** Not implemented — requires skill unlocks.

## Risks
1. **Platform edge cases:** Player moving fast might skip through thin platforms. Mitigated by checking `oldBottom <= platformTop + 2` with tolerance.
2. **Corner sticking:** Player might get stuck at tile corners. Mitigated by checking midpoints in addition to corners.
3. **Ice feel:** May need tuning. Friction 0.96 and acceleration 0.15 are starting values.

## Explicit non-goals
- Enemy movement or collision (separate task)
- Dash mechanic (skill unlock system)
- Double jump (skill unlock system)
- Particle effects on pickup/death
- Sound effects
- HUD updates (separate task)
- Moving platform collision with player (separate task)


## Related Documents
- [[ai/specs/T-0028_spec.md|T-0028 spec]]
- [[ai/reviews/T-0028_gemini_review.md|T-0028 review]]
- [[ai/results/T-0028_executor_report.md|T-0028 result]]
- [[ai/followups/T-0028_followups.md|T-0028 followup]]
- [[ai/pr/T-0028_pr_draft.md|T-0028 pr-draft]]
