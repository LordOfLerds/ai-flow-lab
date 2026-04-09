# T-0029 Spec

## Task metadata
- **task_id:** T-0029
- **title:** Implement enemy AI movement and player-enemy collision
- **lane_type:** feature-lane
- **executor:** codex
- **parent_task_id:** T-0028

## Problem statement
Enemies (walkers and flyers) are spawned during level generation with properties like `vx`, `startX`, `patrolRange`, `baseY`, `flyPhase` — but no `updateEnemies()` function exists. Enemies are rendered statically at their initial positions and don't move or interact with the player. The game needs enemy patrol movement and player-enemy collision for actual gameplay challenge.

## Source of truth
- `index.html` (repo root) — self-contained game file (~980 lines)
- `docs/DOMAIN_MODEL.md` — enemy entity model
- `docs/INVARIANTS.md` — enemy behavior rules

### Key existing code references:
- `gs.entities` — array of enemy objects, cloned from `gs.level.enemies` at game start
- Enemy object: `{ x, y, type: 'walker'|'flyer', vx, startX, patrolRange, frame, alive }`
- Flyer extras: `{ baseY, flyPhase }`
- Walker `vx`: initial direction * (1 + diff * 0.15), typically ~1-1.5 px/frame
- `patrolRange`: 60-140 pixels from `startX`
- `renderEntities()` — already renders walkers (red body, legs) and flyers (purple body, wings) — exists at ~line 873
- `CONFIG.TILE_SIZE`: 16
- `gs.player` — player object with `{ x, y, w: 12, h: 16, alive, invincible, shieldHP, vy }`
- `killPlayer()` — already implemented, sets `gs.phase = 'DEAD'`

## Desired behavior

### 1. Add `updateEnemies()` function
Called once per frame from `gameLoop()` when `gs.phase === 'PLAYING'`, before `updatePlayer()`.

### 2. Walker patrol movement
- Move walker by `enemy.vx` each frame: `enemy.x += enemy.vx`
- Reverse direction when walker reaches patrol boundary:
  - If `enemy.x < enemy.startX - enemy.patrolRange`: `enemy.vx = Math.abs(enemy.vx)`
  - If `enemy.x > enemy.startX + enemy.patrolRange`: `enemy.vx = -Math.abs(enemy.vx)`
- Also reverse if walker hits a solid tile (wall):
  - Check `getTileAt(enemy.x + (enemy.vx > 0 ? 16 : -1), enemy.y + 8)` — if solid, reverse
- Also reverse if walker would walk off a ledge:
  - Check `getTileAt(enemy.x + (enemy.vx > 0 ? 16 : 0), enemy.y + 17)` — if NOT solid, reverse (don't walk off edge)
- Animate: `enemy.frame = (enemy.frame + 0.1) % 2` (for walking animation)

### 3. Flyer bobbing movement
- Update fly phase: `enemy.flyPhase += 0.03`
- Update Y position: `enemy.y = enemy.baseY + Math.sin(enemy.flyPhase) * 20`
- Optional horizontal drift: `enemy.x += enemy.vx * 0.5`
- Reverse horizontal when hitting patrol bounds (same as walker)

### 4. Player-enemy collision detection
After updating all enemies, check player overlap with each living enemy:

```
function checkEnemyCollision() {
  const p = gs.player;
  if (!p || !p.alive || p.invincible > 0) return;

  for (const e of gs.entities) {
    if (!e.alive) continue;

    // AABB overlap check (enemy hitbox: 16x16)
    const ew = 16, eh = 16;
    if (p.x + p.w > e.x && p.x < e.x + ew &&
        p.y + p.h > e.y && p.y < e.y + eh) {

      // Stomp check: player falling AND player's feet are near enemy's head
      if (p.vy > 0 && p.y + p.h - e.y < 8) {
        // STOMP KILL
        e.alive = false;
        p.vy = CONFIG.JUMP_VELOCITY * 0.6; // Bounce
        gs.score += 25;
      } else {
        // PLAYER HIT
        if (p.shieldHP > 0) {
          p.shieldHP--;
          p.invincible = 60;
        } else {
          killPlayer();
        }
      }
      break; // Only one collision per frame
    }
  }
}
```

### 5. Remove dead enemies from rendering
- In `renderEntities()`, skip enemies where `e.alive === false`
- OR remove dead enemies from `gs.entities` array after a death animation delay

### 6. Wire into gameLoop
```
function gameLoop() {
  frameCount++;
  if (gs.phase === 'PLAYING') {
    updateEnemies();
    updatePlayer();
  }
  render();
  requestAnimationFrame(gameLoop);
}
```

## Constraints
- **Single file only:** All changes in `index.html`
- **Preserve existing rendering:** Do not modify `renderEntities()` visual style — only add the `alive` check
- **Preserve existing functions:** Do not modify `generateLevel()`, `createPlayer()`, `CONFIG`, `TILE`
- **No enemy spawning:** Enemies are generated during level generation only
- **No enemy-enemy interaction:** Enemies don't collide with each other
- **Player stomp physics:** Only count as stomp if `p.vy > 0` (falling) AND player bottom is within 8px of enemy top
- **Invincibility frames:** After taking damage (shield absorb), player has 60 frames of invincibility where enemies can't hurt them

## Acceptance criteria
1. Walkers patrol back and forth on their platforms
2. Walkers reverse at walls and ledge edges
3. Flyers bob up and down vertically
4. Jumping on top of an enemy kills it (stomp)
5. Player bounces upward after stomping
6. Touching enemy from side or below damages player
7. Shield absorbs first hit, then invincibility frames
8. No shield + enemy contact = death
9. Dead enemies disappear
10. Score increases by 25 on stomp kill
11. No console errors

## Risks
- Stomp detection threshold (8px) may feel too tight or too loose — tune as needed
- Walker ledge detection: checking one tile ahead may not work for fast-moving walkers at tile edges
- Flyer hitbox during bobbing: collision box moves with visual position

## Open questions
1. Should dead enemies have a death animation (flash/fade)? **Recommendation:** Yes, but keep it minimal — flash for 10 frames then remove.
2. Should stomping give temporary invincibility? **Recommendation:** No — the bounce upward provides natural protection.
3. Should enemy speed scale with level difficulty? **Recommendation:** Already happens — `vx` includes `diff * 0.15` from generation.
