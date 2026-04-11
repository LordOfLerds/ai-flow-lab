---
type: brief
task_id: T-0027
created: 2026-04-10
tags: [ai-flow-lab, brief]
---

# T-0027 Implementation Brief

## Goal
Replace the placeholder "Game Started!" text in `render()` with a full tile-based level renderer, camera system, and entity drawing. After this task, clicking "Start Game" shows the actual generated level with tiles, player sprite, enemies, moving platforms, and a parallax background.

## Scope
Modify only `index.html` (repo root). Add new rendering functions and update `render()` and `gameLoop()`. Do not add physics, collision, input handling, or HUD.

### Deliverables:
1. `renderBackground()` — gradient + parallax star field
2. `updateCamera()` — smooth camera follow with lerp and clamping
3. `renderTiles()` — draw visible tiles with per-type decorations
4. `renderMovingPlatforms()` — draw sinusoidal-position platforms
5. `renderEntities()` — draw walker/flyer enemies
6. `renderPlayer()` — draw player sprite with shield/invincibility effects
7. Update `render()` to call these in order during `PLAYING` phase
8. Increment `frameCount` in `gameLoop()`

## Constraints
1. **Single file:** All changes in `index.html` only
2. **No physics/collision:** Rendering only — no movement, no collision detection
3. **No HUD:** Out of scope
4. **Preserve existing functions:** Do not modify `generateLevel()`, `createPlayer()`, `startGame()`, `showMainMenu()`, `makePlayerSprite()`, `drawSprite()`, `CONFIG`, `TILE`, `TILE_COLORS`, `SKINS`, `SKILLS`, or game state initialization
5. **Keep MENU rendering:** The `gs.phase === 'MENU'` block stays unchanged
6. **No module imports:** Regular `<script>` tag only
7. **Camera culling required:** Only render visible tiles
8. **Deterministic decorations:** Use position-based hash, not `Math.random()`
9. **Transparency safety:** Use `ctx.save()`/`ctx.restore()` around any globalAlpha changes

## File targets
- `index.html` (repo root) — lines ~406–434 (render/gameLoop area), plus new functions inserted before `render()`

### Exact edit locations:
1. **Add star array initialization** — insert a lazy-init block at top of `renderBackground()`:
   ```
   let _stars = null;
   function initStars() {
     _stars = [];
     for (let i = 0; i < 80; i++) {
       _stars.push({
         x: Math.random() * CONFIG.CANVAS_WIDTH * 4,
         y: Math.random() * CONFIG.CANVAS_HEIGHT,
         size: i < 40 ? 1 : (1 + Math.random()),
         color: i < 40 ? '#335' : '#668',
         parallax: i < 40 ? 0.05 : 0.1
       });
     }
   }
   ```

2. **Add `renderBackground()` function** — before `render()`:
   - Draw vertical gradient from `#0a0a1a` to `#0f1520`
   - If `!_stars` call `initStars()`
   - For each star: `screenX = ((star.x - gs.camera.x * star.parallax) % (CONFIG.CANVAS_WIDTH * 4) + CONFIG.CANVAS_WIDTH * 4) % (CONFIG.CANVAS_WIDTH * 4)`. Only draw if `screenX < CONFIG.CANVAS_WIDTH`. Use `ctx.fillRect(screenX, screenY, star.size, star.size)`. (Addresses Gemini's wrapping concern)

3. **Add `updateCamera()` function**:
   - Target: `targetX = gs.player.x - CONFIG.CANVAS_WIDTH / 2 + gs.player.w / 2`
   - Level pixel height = `gs.level.height * CONFIG.TILE_SIZE` = 25 * 16 = 400 = `CONFIG.CANVAS_HEIGHT`, so vertical camera y will be clamped to 0 (addresses Gemini's vertical alignment concern — camera y effectively stays at 0 for standard levels)
   - `targetY = Math.max(0, gs.player.y - CONFIG.CANVAS_HEIGHT * 0.65)`
   - Lerp: `gs.camera.x += (targetX - gs.camera.x) * CONFIG.CAMERA_LERP`
   - Clamp: `gs.camera.x = Math.max(0, Math.min(gs.camera.x, gs.level.width * CONFIG.TILE_SIZE - CONFIG.CANVAS_WIDTH))`
   - Same for y: `gs.camera.y = Math.max(0, Math.min(gs.camera.y, Math.max(0, gs.level.height * CONFIG.TILE_SIZE - CONFIG.CANVAS_HEIGHT)))`

4. **Add `renderTiles()` function**:
   - Calculate visible range with 1-tile padding: `startCol = Math.max(0, Math.floor(gs.camera.x / CONFIG.TILE_SIZE) - 1)`, `endCol = Math.min(gs.level.width, Math.ceil((gs.camera.x + CONFIG.CANVAS_WIDTH) / CONFIG.TILE_SIZE) + 1)`, same for rows
   - For each tile != TILE.EMPTY:
     - `sx = col * CONFIG.TILE_SIZE - gs.camera.x`, `sy = row * CONFIG.TILE_SIZE - gs.camera.y`
     - **GRASS:** Fill primary, 2px secondary bottom, grass blades at top using hash `h = ((col * 7 + row * 13) & 0x7FFFFFFF) % 4` (addresses Gemini's negative hash + N definition concerns)
     - **STONE:** Fill primary, secondary 1px lines at y%4==0 and x%4==0
     - **SPIKE:** Red triangle pointing up
     - **ICE:** Fill primary, 2-3 white highlight pixels
     - **BREAKABLE:** Fill primary, X crack in secondary
     - **PLATFORM:** Fill primary, 1px `#9c7` top highlight, 1px shadow bottom
     - **COIN:** Yellow 6px circle, bob: `sy += Math.sin(frameCount * 0.08 + col) * 2`
     - **GEM:** Diamond shape in `#4ef`/`#2cd`
     - **POWERUP_*:** Colored 8px circle (Speed=#4f4, Shield=#48f, Magnet=#f4f), pulse via `scale = 1 + Math.sin(frameCount * 0.06) * 0.1`
     - **EXIT:** Pulsing gold portal, cycle `#ff0`/`#fc0` using `Math.sin(frameCount * 0.04)`

5. **Add `renderMovingPlatforms()` function**:
   - For each platform in `gs.level.movingPlatforms`:
     - Calculate visual position only (not modifying the object — addresses Gemini's physics desync concern):
       - `let vx = p.x, vy = p.y`
       - If `p.dir === 'h'`: `vx += Math.sin(frameCount * p.speed * 0.02 + p.phase) * p.amplitude`
       - If `p.dir === 'v'`: `vy += Math.sin(frameCount * p.speed * 0.02 + p.phase) * p.amplitude`
     - Draw rect at `(vx - gs.camera.x, vy - gs.camera.y, p.w, p.h)` with platform colors
     - Add top highlight and bottom shadow

6. **Add `renderEntities()` function**:
   - For each entity in `gs.entities` where `entity.alive`:
     - Skip if off-screen (entity.x outside camera viewport with margin)
     - **Walker:** 8x8 red rectangle with 2px white "eyes"
     - **Flyer:** 10x8 purple rectangle with "wings" that flap using `Math.sin(frameCount * 0.15)`
     - Both offset by camera

7. **Add `renderPlayer()` function**:
   - If `gs.player.invincible > 0 && frameCount % 4 < 2`: skip (blink effect)
   - Get sprite: `const sprite = makePlayerSprite(gs.player.skin.colors, gs.player.frame)`
   - Draw: `drawSprite(sprite, gs.player.x - gs.camera.x, gs.player.y - gs.camera.y, 1, gs.player.facing === -1)`
   - Shield: if `gs.player.shieldHP > 0`, use `ctx.save()`, set `ctx.globalAlpha = 0.3`, draw blue circle, `ctx.restore()` (addresses Gemini's transparency safety concern)

8. **Update `render()` function** — replace lines 418–425 (`else if (gs.phase === 'PLAYING')` block):
   ```
   } else if (gs.phase === 'PLAYING') {
     updateCamera();
     renderBackground();
     renderTiles();
     renderMovingPlatforms();
     renderEntities();
     renderPlayer();
   }
   ```

9. **Update `gameLoop()`** — add `frameCount++` before `render()`:
   ```
   function gameLoop() { frameCount++; render(); requestAnimationFrame(gameLoop); }
   ```

## Tests required
1. Start game → canvas shows colored tiles (not placeholder text)
2. Camera position: verify camera.x centers on PLAYER_START_X after a few frames
3. Menu screen still renders correctly
4. No console errors on load or after clicking Start
5. Coin tiles visibly bob up and down
6. Moving platforms visibly oscillate
7. Player sprite visible at starting position
8. Stars visible in background, distinct from tiles

## Chosen minimal policy
- **Visual-only moving platform positions:** Calculate visual offset in render function using local variables (not modifying `gs.level.movingPlatforms[].x/y`). Physics task will own the actual position updates.
- **Simple enemy shapes:** Rectangles with eyes, not full pixel-art sprites. Follow-up task for detailed sprites.
- **Star lazy-init:** Stars array stored in module-level `_stars` variable, initialized on first `renderBackground()` call. Does not modify `gs` or any existing init functions.
- **Camera y = 0 for standard levels:** Since level height (400px) = canvas height (400px), vertical scrolling won't happen unless levels grow taller. This is correct behavior.

## Risks
1. **Performance on low-end devices:** ~800-1250 tile draw calls + decorations per frame. Mitigated by camera culling. If issues arise, batch tiles by color.
2. **Moving platform desync:** Visual position calculated in render ≠ logical position in game state. Acceptable for now — physics task must unify.
3. **frameCount overflow:** After ~24 hours at 60fps, frameCount reaches ~5.2M. No risk — `Math.sin` handles large values fine. No integer overflow in JS.

## Explicit non-goals
- Player movement or input handling (separate task)
- Collision detection (separate task)
- HUD/score display (separate task)
- Death/respawn logic (separate task)
- Sound effects (separate task)
- Full pixel-art enemy sprites (follow-up)
- Particle effects (follow-up)
- Mobile/touch support (follow-up)


## Related Documents
- [[ai/specs/T-0027_spec.md|T-0027 spec]]
- [[ai/reviews/T-0027_gemini_review.md|T-0027 review]]
- [[ai/results/T-0027_executor_report.md|T-0027 result]]
- [[ai/followups/T-0027_followups.md|T-0027 followup]]
- [[ai/pr/T-0027_pr_draft.md|T-0027 pr-draft]]
