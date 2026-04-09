# T-0027 Spec

## Task metadata
- **task_id:** T-0027
- **title:** Implement tile rendering and camera system for Pixel Runner
- **lane_type:** feature-lane
- **executor:** codex
- **parent_goal:** G-0002

## Problem statement
The `render()` function in `index.html` currently displays only placeholder text ("Game Started!" / "Demo version") when `gs.phase === 'PLAYING'`. The game already has a complete level generation system (`generateLevel`), tile constants (`TILE`, `TILE_COLORS`), sprite rendering functions (`drawSprite`, `makePlayerSprite`), camera state (`gs.camera`), enemy/entity data, and moving platforms — but none of it is wired into the render loop. The player sees a blank screen with text instead of an actual playable level.

## Source of truth
- `index.html` (repo root) — the self-contained game file; lines 197–434 contain all game logic
- `docs/DOMAIN_MODEL.md` — tile types, entity model
- `docs/ARCHITECTURE.md` — rendering architecture
- `docs/INVARIANTS.md` — rendering invariants

### Key existing code references in `index.html`:
- `CONFIG` (line ~197): `CANVAS_WIDTH: 800, CANVAS_HEIGHT: 400, TILE_SIZE: 16, CAMERA_LERP: 0.08`
- `TILE` enum (line ~236): EMPTY, GRASS, STONE, SPIKE, ICE, BREAKABLE, COIN, GEM, POWERUP_*, PLATFORM, EXIT
- `TILE_COLORS` (line ~237): maps tile types to `[primary, secondary]` color pairs
- `gs.camera` (line ~253): `{ x: 0, y: 0 }` — initialized in `startGame()` at line ~387
- `gs.level` structure: `{ tiles: 2D array, enemies: [], movingPlatforms: [], width, height }`
- `drawSprite()` (line ~286): renders pixel-art sprite data to canvas at (x, y) with scale and flipX
- `makePlayerSprite()` (line ~299): generates 16-row sprite from skin colors and animation frame
- `generateLevel()` (line ~330): builds full tile grid with enemies, moving platforms, gaps, coins, gems, powerups, exit
- `createPlayer()` (line ~373): returns player object with `{ x, y, vx, vy, w: 12, h: 16, facing, frame, ... }`
- Moving platforms: `{ x, y, w, h, dir: 'h'|'v', speed, phase, amplitude }`
- Enemies: `{ x, y, type: 'walker'|'flyer', vx, startX, patrolRange, frame, alive, baseY?, flyPhase? }`

## Desired behavior

### 1. Camera system
Replace the static rendering with a camera that follows the player:
- Camera target: center the player horizontally in the viewport, position vertically so player is in the lower third
- Smooth follow using `CONFIG.CAMERA_LERP` (0.08): `camera.x += (targetX - camera.x) * CONFIG.CAMERA_LERP`; same for y
- Clamp camera to level bounds: `x` in `[0, levelPixelWidth - CANVAS_WIDTH]`, `y` in `[0, levelPixelHeight - CANVAS_HEIGHT]`
- On `startGame()`, snap camera immediately to player position (no lerp on first frame)
- All world-space rendering offset by `(-camera.x, -camera.y)`

### 2. Background rendering
- Fill canvas with dark gradient: vertical linear gradient from `#0a0a1a` (top) to `#0f1520` (bottom)
- Parallax star field: render ~80 small dots at random positions, offset by `camera.x * 0.1` and `camera.y * 0.05` (slow parallax). Stars should wrap around when scrolling. Use a seeded or fixed array so stars don't change every frame.
- Stars in 2 layers: 40 dim stars (`#335`, 1px) at parallax 0.05, 40 bright stars (`#668`, 1-2px) at parallax 0.1

### 3. Tile rendering
Only render tiles visible in the current viewport (camera culling for performance):
- Calculate visible tile range: `startCol = Math.floor(camera.x / TILE_SIZE)`, `endCol = Math.ceil((camera.x + CANVAS_WIDTH) / TILE_SIZE)`, same for rows
- For each visible tile that is not `TILE.EMPTY`:
  - Look up `TILE_COLORS[tileType]` for `[primary, secondary]` color pair
  - Draw a filled rect at `(col * TILE_SIZE - camera.x, row * TILE_SIZE - camera.y)` sized `TILE_SIZE x TILE_SIZE` using primary color
  - Add pixel-art detail based on type:
    - **GRASS:** 2px dark-green (`secondary`) bottom border, 2-3 random grass blade pixels on top edge using deterministic hash `(col * 7 + row * 13) % N`
    - **STONE:** 1px grid lines using `secondary` color at every 4px for a brick pattern
    - **SPIKE:** Draw as a triangle (primary) pointing up, 1px outline in secondary
    - **ICE:** Primary fill with 2-3 highlight pixels (`#def`) for shine effect
    - **BREAKABLE:** Primary fill with an X crack pattern in secondary (2 diagonal lines)
    - **PLATFORM:** Primary fill with 1px top highlight (`#9c7`) and bottom shadow
    - **COIN:** Draw as a small yellow circle (6px) with highlight, or simple 4x4 pixel pattern using `#fc4`/`#da2`. Add subtle bob animation: `y offset = Math.sin(frameCount * 0.08 + col) * 2`
    - **GEM:** Draw as a small diamond shape (8px) in `#4ef`/`#2cd` with sparkle
    - **POWERUP_SPEED/SHIELD/MAGNET:** Draw as colored orb (8px circle). Speed=`#4f4`, Shield=`#48f`, Magnet=`#f4f`. Gentle pulse: scale oscillates `1.0 +/- 0.1` using `Math.sin(frameCount * 0.06)`
    - **EXIT:** Glowing door/portal shape. Two tile-height column with pulsing yellow/gold border. Inner area cycles between `#ff0` and `#fc0`

### 4. Moving platform rendering
- For each entry in `gs.level.movingPlatforms`:
  - Calculate current position using sinusoidal motion: if `dir === 'h'`, `currentX = x + Math.sin(frameCount * speed * 0.02 + phase) * amplitude`; if `dir === 'v'`, same for y
  - Draw filled rect at `(currentX - camera.x, currentY - camera.y, w, h)` using `TILE_COLORS[TILE.PLATFORM]` colors
  - Add 1px top highlight and bottom shadow like static platforms

### 5. Player rendering
- Call `makePlayerSprite(gs.player.skin.colors, gs.player.frame)` to get sprite data
- Call `drawSprite(spriteData, gs.player.x - camera.x, gs.player.y - camera.y, 1, gs.player.facing === -1)`
- If player has active shield (`gs.player.shieldHP > 0`), draw a semi-transparent blue circle around player
- If player is invincible (`gs.player.invincible > 0`), blink the sprite: skip rendering every other frame

### 6. Enemy rendering
- For each enemy in `gs.entities` where `alive === true`:
  - **Walker:** Draw a simple 8x8 pixel-art enemy sprite in red (`#f44`/`#c22`). Offset by camera.
  - **Flyer:** Draw a 10x8 sprite with wings in purple (`#a4f`/`#82d`). Add wing flap animation using frame counter.
  - Both types offset by `(-camera.x, -camera.y)`

### 7. HUD rendering (on-canvas, fixed position — not affected by camera)
After all world rendering, draw HUD elements at fixed screen positions:
- This task does NOT implement the HUD — that is a separate task. Just ensure the render function structure supports it (world rendering first, then HUD layer on top).

### 8. Integration into render()
Replace the `else if (gs.phase === 'PLAYING')` block in `render()` (lines 418–425) with calls to the new rendering sub-functions, in this order:
1. `renderBackground()`
2. `updateCamera()`
3. `renderTiles()`
4. `renderMovingPlatforms()`
5. `renderEntities()`
6. `renderPlayer()`
7. (future: `renderParticles()`, `renderHUD()`)

Each render sub-function should be a standalone function defined above `render()`. The `render()` function orchestrates them.

### 9. Frame counter
Increment `frameCount++` at the start of each `gameLoop()` call (before `render()`). This is needed for animations (coin bob, powerup pulse, enemy animation).

## Constraints
- **Single file only:** All changes in `index.html` (repo root). No external files.
- **No physics/collision:** This task is rendering only. Player movement, collision detection, and game logic are separate tasks.
- **No HUD implementation:** HUD is out of scope. Just structure the code to allow it later.
- **Performance:** Use camera culling — only iterate over visible tiles, not all 200x25 = 5000 tiles.
- **Deterministic decorations:** Tile decorations (grass blades, stone patterns) must be deterministic based on tile position, not random per frame.
- **Preserve existing code:** Do not modify `generateLevel()`, `createPlayer()`, `startGame()`, `showMainMenu()`, `makePlayerSprite()`, `drawSprite()`, `CONFIG`, `TILE`, `TILE_COLORS`, `SKINS`, `SKILLS`, or any game state initialization. Only modify `render()` and `gameLoop()`, and add new rendering functions.
- **Keep MENU phase rendering:** The `gs.phase === 'MENU'` branch in `render()` stays unchanged.
- **No module imports:** `index.html` uses a regular `<script>` tag (not `type="module"`). Keep it that way.

## Acceptance criteria
1. When the player clicks "Start Game", the canvas shows the generated level with colored tiles instead of placeholder text
2. Camera follows the player position (even though the player doesn't move yet — camera should center on PLAYER_START_X, PLAYER_START_Y)
3. Tiles outside the viewport are not rendered (camera culling)
4. All tile types defined in `TILE_COLORS` render with distinct visual appearance
5. COIN tiles bob up and down smoothly
6. POWERUP tiles pulse gently
7. EXIT tiles glow/pulse
8. Moving platforms render at their sinusoidal positions
9. Player sprite renders at player position using `drawSprite()` + `makePlayerSprite()`
10. Enemies render with distinct walker/flyer sprites
11. Background shows gradient + parallax star field that moves slower than the foreground
12. Stars wrap around and don't disappear when scrolling
13. Frame counter increments in `gameLoop()` so animations work
14. Menu screen still shows "PIXEL RUNNER" title correctly
15. No console errors on start or during gameplay

## Risks
- **Moving platform positions not updating:** Since there's no physics update loop yet, moving platforms may appear frozen. The render function should calculate their visual position using `frameCount` and their sinusoidal formula. This is a rendering-time calculation, not a physics update.
- **Enemy positions not updating:** Same issue. Enemies won't patrol yet (no update loop). Render them at their initial positions. This is expected — the physics task will add the update loop.
- **Player stuck at start position:** Expected — no movement code yet. Camera will just show the starting area.
- **Large tile count:** 200x25 grid is manageable with culling. Without culling it would be ~5000 draw calls per frame — with culling it's ~50x25 = 1250 max, typically ~800.

## Open questions
1. Should the star field positions be stored in an array generated once at init, or regenerated each frame with a seeded PRNG? **Recommendation:** Generate once at init and store in a `stars` array on `gs` or as a module-level constant.
2. Should enemy sprites be full pixel-art (like the player) or simple geometric shapes for now? **Recommendation:** Simple geometric shapes (rectangles with eyes) for now; full sprites can be a follow-up task.
3. Should COIN/GEM tiles be removed from the tile grid when collected, or just hidden? **Recommendation:** Out of scope for this task (no collection logic), but design rendering to support it — check `tile !== TILE.EMPTY` before rendering.
