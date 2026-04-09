# T-0029 Implementation Brief

## Goal
Add enemy AI movement (walker patrol, flyer bobbing) and player-enemy collision (stomp-kill with bounce, side-hit damage/death) to `index.html`. After this task, enemies patrol their areas and the player can defeat them by jumping on top or die from contact.

## Scope
Modify only `index.html` (repo root). Add `updateEnemies()`, `checkEnemyCollision()` functions. Update `gameLoop()` to call them. Add `alive` guard in `renderEntities()`.

## Constraints
1. **Single file:** All changes in `index.html` only
2. **Preserve rendering style:** Do not change enemy visual appearance in `renderEntities()` — only add alive/death guards
3. **Preserve existing:** Do not modify `generateLevel()`, `createPlayer()`, `CONFIG`, `TILE`, or any T-0028 physics code
4. **No enemy spawning:** Enemies come from level generation only
5. **No enemy-enemy interaction:** Enemies pass through each other
6. **Execution order (Gemini fix #3):** `updateEnemies()` → `updatePlayer()` → `checkEnemyCollision()` (collision after all movement)

## File targets
- `index.html` (repo root) — add new functions, update `gameLoop()`, update `renderEntities()`

### Implementation details (addressing Gemini critique):

**1. `updateEnemies()` function** — insert after `updatePlayer()`:

```javascript
function updateEnemies() {
  for (const e of gs.entities) {
    if (!e.alive) {
      // Death animation countdown
      if (e.deathTimer !== undefined && e.deathTimer > 0) {
        e.deathTimer--;
      }
      continue;
    }

    if (e.type === 'walker') {
      // Patrol movement
      e.x += e.vx;

      // Patrol bounds reversal
      if (e.x < e.startX - e.patrolRange) {
        e.vx = Math.abs(e.vx);
      } else if (e.x > e.startX + e.patrolRange) {
        e.vx = -Math.abs(e.vx);
      }

      // Wall collision reversal (Gemini fix #4: use proper offsets)
      const wallCheckX = e.vx > 0 ? e.x + 16 : e.x - 1;
      if (isSolid(getTileAt(wallCheckX, e.y + 8))) {
        e.vx = -e.vx;
      }

      // Ledge detection: check tile below leading foot
      const ledgeCheckX = e.vx > 0 ? e.x + 16 : e.x - 1;
      const tileBelow = getTileAt(ledgeCheckX, e.y + 17);
      if (!isSolid(tileBelow) && tileBelow !== TILE.PLATFORM) {
        e.vx = -e.vx;
      }

      // Walking animation
      e.frame = (e.frame + 0.1) % 2;

    } else if (e.type === 'flyer') {
      // Vertical bobbing
      e.flyPhase += 0.03;
      e.y = e.baseY + Math.sin(e.flyPhase) * 20;

      // Horizontal drift (Gemini fix #1: flyers only reverse on patrol bounds, no wall/ledge checks)
      e.x += e.vx * 0.5;
      if (e.x < e.startX - e.patrolRange) {
        e.vx = Math.abs(e.vx);
      } else if (e.x > e.startX + e.patrolRange) {
        e.vx = -Math.abs(e.vx);
      }

      // Wing animation
      e.frame = (e.frame + 0.08) % 2;
    }
  }
}
```

**Key Gemini fixes applied:**
- Flyers only reverse on patrol bounds — no wall/ledge checks (fix #1)
- Ledge check uses `e.vx > 0 ? 16 : -1` for proper leading-edge offset (fix #4)
- Death timer for animation (fix #2)

**2. `checkEnemyCollision()` function** — called AFTER both `updateEnemies()` and `updatePlayer()` (Gemini fix #3):

```javascript
function checkEnemyCollision() {
  const p = gs.player;
  if (!p || !p.alive || p.invincible > 0) return;

  for (const e of gs.entities) {
    // Skip dead and dying enemies (Gemini fix #2)
    if (!e.alive) continue;

    // AABB overlap — enemy hitbox 16×16
    const ew = 16, eh = 16;
    if (p.x + p.w > e.x && p.x < e.x + ew &&
        p.y + p.h > e.y && p.y < e.y + eh) {

      // Stomp: player falling AND feet near enemy head
      const feetOverlap = (p.y + p.h) - e.y;
      if (p.vy > 0 && feetOverlap < 10) {
        // STOMP KILL
        e.alive = false;
        e.deathTimer = 10; // 10-frame flash before removal
        p.vy = CONFIG.JUMP_VELOCITY * 0.6; // Bounce up (enough to clear hitbox)
        gs.score += 25;
      } else {
        // PLAYER HIT
        if (p.shieldHP > 0) {
          p.shieldHP--;
          p.invincible = 60; // Already decremented in updatePlayer()
        } else {
          killPlayer();
        }
      }
      return; // One collision per frame
    }
  }
}
```

**Key change vs spec:** Stomp threshold increased from 8px to 10px for more generous feel. `feetOverlap` is `(p.y + p.h) - e.y` which measures how deep the player's feet are into the enemy — if small, it's a stomp.

**3. Update `renderEntities()`** — add alive/death guards:

```javascript
// Inside renderEntities(), before drawing each enemy:
for (const e of gs.entities) {
  // Skip fully dead enemies (death animation finished)
  if (!e.alive && (e.deathTimer === undefined || e.deathTimer <= 0)) continue;

  // Flash effect during death animation
  if (!e.alive && e.deathTimer > 0) {
    if (e.deathTimer % 2 === 0) continue; // Skip every other frame = flash
  }

  // ... existing rendering code ...
}
```

**4. Update `gameLoop()`:**

```javascript
function gameLoop() {
  frameCount++;
  if (gs.phase === 'PLAYING') {
    updateEnemies();
    updatePlayer();
    checkEnemyCollision(); // After all movement (Gemini fix #3)
  }
  render();
  requestAnimationFrame(gameLoop);
}
```

**5. Clean up dead enemies periodically** (prevent array growth):
Add to `updateEnemies()` at the end:
```javascript
// Remove fully dead enemies every 60 frames
if (frameCount % 60 === 0) {
  gs.entities = gs.entities.filter(e => e.alive || (e.deathTimer !== undefined && e.deathTimer > 0));
}
```

## Tests required
1. Walkers move back and forth on platforms
2. Walkers reverse at walls
3. Walkers reverse at ledge edges (don't fall off)
4. Flyers bob up and down smoothly
5. Flyers drift horizontally within patrol range
6. Jumping on enemy kills it (score +25)
7. Player bounces up after stomp
8. Side contact with enemy damages player
9. Shield absorbs first hit, invincibility frames activate
10. No shield + contact = death screen
11. Dead enemies flash and disappear
12. No console errors
13. Multiple enemies can be stomped in sequence

## Chosen minimal policy
- **Execution order:** enemies move → player moves → collision check (Gemini recommendation)
- **Flyer reversal:** patrol bounds only, no wall/ledge checks (airborne enemies)
- **Stomp threshold:** 10px overlap (generous for playability)
- **Death animation:** 10-frame flash, then removal
- **Entity cleanup:** filter dead entities every 60 frames to prevent memory growth

## Risks
1. **Stomp feel:** 10px threshold may still need tuning. Too generous = accidental stomps, too tight = frustrating.
2. **Walker jitter:** If wall and ledge checks fire on alternating frames, walker may jitter in place. Mitigated by reversing vx (not setting to 0).
3. **Fast enemies at high difficulty:** `vx` scales with difficulty — very fast walkers might tunnel through walls. Acceptable for current scope.

## Explicit non-goals
- Enemy spawning or respawning
- Enemy-enemy collision or interaction
- Boss enemies
- Ranged enemy attacks
- Enemy pathfinding
- Sound effects on stomp/hit
