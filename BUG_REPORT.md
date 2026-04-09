# Pixel Runner — Post-Pipeline Bug Report

**Date:** 2026-04-09  
**Tasks covered:** T-0046 through T-0051  
**Tested on:** Chrome via localhost:3847/game  
**Tester:** Claude (automated pipeline + manual browser testing)

---

## Summary

After running all 6 tasks (T-0046 to T-0051) through the AI Flow Lab pipeline in APP mode, 8 critical bugs were discovered during browser testing. All 8 have been fixed in `index.html`.

| # | Severity | Bug | Introduced by | Status |
|---|----------|-----|---------------|--------|
| 1 | Critical | `ReferenceError: diff is not defined` in `generateLevel()` | T-0047 (100 levels) | FIXED |
| 2 | Critical | `SyntaxError: Identifier 'jumpBuffered' already declared` | T-0048 (wall jump) | FIXED |
| 3 | Critical | `SyntaxError: Identifier 'supabase' already declared` | T-0050 (Supabase CDN) | FIXED |
| 4 | Critical | Menu transitions stuck (buttons unresponsive) | T-0051 (transitions) | FIXED |
| 5 | Critical | `TypeError: Cannot read properties of undefined (reading 'sky')` — missing THEMES | T-0047 + T-0051 | FIXED |
| 6 | Critical | `TypeError: Cannot read properties of undefined (reading '0')` — Shop skin colors | T-0049 (shop) | FIXED |
| 7 | Critical | `ReferenceError: checkLevelUp is not defined` | T-0051 (level complete) | FIXED |
| 8 | Critical | `ReferenceError: saveGameState is not defined` | T-0051 (level complete) | FIXED |

---

## Bug Details

### BUG-001: `diff` not defined in `generateLevel()`

**Error:** `ReferenceError: diff is not defined`  
**Location:** `generateLevel()` — lines using `diff * 0.002` and `0.01 * diff`  
**Root cause:** T-0047's 100-level expansion introduced a `diff` variable in the level generation code but never declared it. The variable was used in 3 places: gem chance calculation and ice tile generation.  
**Fix:** Replaced all `diff` references with `levelNum` (the function parameter).  
**Lines affected:** 2 locations — `gemChance` line and ice tile `if (levelNum > 3)` block.

### BUG-002: Duplicate `jumpBuffered` declaration

**Error:** `SyntaxError: Identifier 'jumpBuffered' has already been declared`  
**Location:** Jump physics code — two `const jumpBuffered` in same scope  
**Root cause:** T-0048's wall jump code added `const jumpBuffered` at one location, but existing normal jump code already declared `const jumpBuffered` later in the same function scope.  
**Fix:** Renamed the second declaration to `const jumpBufferedNormal`.

### BUG-003: `supabase` identifier conflict

**Error:** `SyntaxError: Identifier 'supabase' has already been declared`  
**Location:** Script initialization — `const supabase = ...` after CDN `<script>` tag  
**Root cause:** T-0050 added `<script src="supabase CDN">` which sets `window.supabase` as a global. Then `const supabase = window.supabase.createClient(...)` in the next script block conflicted with the global.  
**Fix:** Renamed all ~20 references from `supabase` to `supabaseClient` using regex replacement. Required a second pass to catch `!supabase` patterns (preceded by `!` not `\w`).

### BUG-004: Menu transitions stuck / buttons non-responsive

**Error:** No JS error — game became unresponsive after clicking any menu button  
**Location:** `transitionTo()` function  
**Root cause:** T-0051's transition system used `requestAnimationFrame` for a canvas-based alpha fade, but menu screens are DOM-based with no active canvas rendering loop. The transition got stuck at `active: true, alpha: 0.75` with no game loop to advance it, permanently blocking all subsequent menu navigation.  
**Fix:** Added CSS-based fade fallback for menu-to-menu transitions (when `gs.phase !== 'PLAYING' && gs.phase !== 'DEAD'`). Uses `element.style.opacity` with `setTimeout` instead of `requestAnimationFrame`. Canvas-based transitions still used during gameplay.

### BUG-005: Missing THEMES for 6 biomes

**Error:** `TypeError: Cannot read properties of undefined (reading 'sky')` in `renderBackground()`  
**Location:** `renderBackground()` — `THEMES[theme.toLowerCase()]` returned `undefined`  
**Root cause:** T-0047 defined 10 biomes (Meadow, Forest, Desert, Cave, Ice, Lava, Ocean, Jungle, Ruins, Space) but the THEMES constant only had 5 entries (forest, desert, ice, lava, sky). The 6 missing themes (meadow, cave, ocean, jungle, ruins, space) caused `undefined.sky[0]` crash, which killed the entire `render()` call inside `gameLoop()`, freezing the game at `frameCount = 2`.  
**Fix:** Added all 6 missing theme definitions with appropriate color palettes (sky gradients, parallax colors, tile colors).

### BUG-006: Shop crashes on skin rendering — property name mismatch

**Error:** `TypeError: Cannot read properties of undefined (reading '0')` in `generateSkinShopContent()`  
**Location:** Shop skin tab — `skin.colors[0]` and `skin.colors[1]`  
**Root cause:** The SKINS array (defined in T-0046/47 era) uses `skin.color` (single string), `skin.cost`, `skin.unlockType`, and `skin.levelReq`. But the shop code (from T-0049) referenced `skin.colors` (array), `skin.price`, `skin.currency`, and `skin.level`. Complete property name mismatch between data definition and UI rendering.  
**Additional issues found:**
- `SHOP_BOOSTERS` referenced but never defined (should be `BOOSTERS`)
- `SHOP_COSMETICS` referenced but never defined (should be `TRAILS`)
- `booster.price` should be `booster.cost`
- `generateTrailShopContent` called but only `generateCosmeticShopContent` existed
- Trail shop referenced `gs.inventory.cosmetics` but trails are stored in `gs.purchases.owned_trails`
- `selectTrail()` function called but never defined  
**Fix:** Rewrote `generateSkinShopContent()` to use actual SKINS properties (`color`, `cost`, `unlockType`, `levelReq`). Renamed `SHOP_BOOSTERS` → `BOOSTERS`, `SHOP_COSMETICS` → `TRAILS`. Fixed `booster.price` → `booster.cost`. Fixed trail shop to use `gs.purchases.owned_trails` and `gs.purchases.active_trail`. Added `selectTrail()` function. Fixed `generateTrailShopContent` → `generateCosmeticShopContent` reference.

### BUG-007: `checkLevelUp` not defined

**Error:** `ReferenceError: checkLevelUp is not defined`  
**Location:** `showLevelCompleteScreen()` — called `checkLevelUp()` after awarding XP  
**Root cause:** T-0051's level complete screen calls `checkLevelUp()` to handle player leveling up after earning XP, but this function was never implemented.  
**Fix:** Added `checkLevelUp()` function that loops while XP >= threshold for current level, increments `playerLevel`, deducts XP cost, and unlocks any skills that meet the new level requirement.

### BUG-008: `saveGameState` not defined

**Error:** `ReferenceError: saveGameState is not defined`  
**Location:** `checkLevelUp()`, `selectTrail()`, `equipSkin()`  
**Root cause:** Multiple functions call `saveGameState()` but it was never defined. Only individual save functions existed (`savePlayerProgress`, `saveLevelProgress`, `saveShopData`).  
**Fix:** Added `saveGameState()` function that calls all three individual save functions as a convenience wrapper.

### Additional issue: `makePlayerSprite` — colors not iterable in Skin Select

**Error:** `TypeError: colors is not iterable` in `makePlayerSprite()`  
**Location:** `createSkinPreview()` in Skin Selection screen  
**Root cause:** `createSkinPreview()` passes `skin.colors` (undefined) to `makePlayerSprite()` which expects a 5-element array `[body, dark, highlight, belt, outline]`. SKINS only have `skin.color` (single string).  
**Fix:** Added `getSkinColors(skin)` helper that generates a 5-color palette from a single `skin.color` string, with special handling for the 'rainbow' skin.

---

## Test Results After Fixes

| Feature | Status | Notes |
|---------|--------|-------|
| Auth / Demo Mode | PASS | Shows "Demo Mode" with "Play as Guest" when Supabase CDN blocked |
| Main Menu | PASS | All 6 buttons visible and functional |
| Level Select | PASS | 10 biomes, 100 levels, star ratings, best scores |
| Gameplay | PASS | Parallax background, player, coins, enemies, HUD, progress bar |
| Progress Bar | PASS | Red→yellow→green gradient, percentage label, diamond marker |
| Death Screen | PASS | Shows cause of death, distance %, coins, score breakdown, XP earned |
| Level Complete | PASS | Stars, coins, XP, time, distance, confetti, Next Level/Menu buttons |
| Shop — Skins tab | PASS | 12 skins with color previews, prices, level requirements |
| Shop — Boosters tab | PASS | 4 boosters with icons, descriptions, prices |
| Shop — Trails tab | PASS | 5 trails with color previews, active state, purchase buttons |
| Skills Menu | PASS | 8 skills with icons, descriptions, level requirements |
| Leaderboard | PASS | Shows "unavailable" gracefully in demo mode |
| Battle Pass | PASS | Season info, daily challenges, tier rewards |
| Skin Select | PASS | 12 skins displayed (preview rendering fixed) |
| Menu Transitions | PASS | CSS fade for menus, canvas fade for gameplay |
| Back Buttons | PASS | Present in Shop, Skills, Leaderboard, Battle Pass |
| ESC Navigation | PASS | Returns to previous screen from submenus |

---

## Known Limitations (Not Bugs)

1. **Supabase CDN blocked in sandbox** — Expected behavior. Game falls back to guest/localStorage mode. Leaderboard shows "unavailable".
2. **Skin select previews are simplified** — Color squares instead of full pixel-art sprites because `getSkinColors()` generates a basic palette from a single color. The in-game player sprite renders correctly.
3. **Browser caching** — After code fixes, cache-busting query params (`?v=N`) are required to see changes. No runtime impact.
4. **Confetti particles use world coordinates** — During LEVEL_COMPLETE, confetti renders at camera-relative positions which may drift if the camera position was at a specific spot when level completed. Minor visual issue only.

---

## Recommendations for Future Tasks

1. **Add a `colors` array to each SKIN definition** — Instead of deriving colors from a single `color` string, define proper 5-color palettes for each skin to get better-looking character sprites in skin selection.
2. **Unify save system** — Currently there are 4+ separate save functions. Consider a single `saveAll()` that coordinates all persistence.
3. **Add error boundaries to shop rendering** — Wrap shop tab content generators in try/catch to prevent blank screens if data mismatches recur.
4. **Sound effects** — F-1 follow-up from T-0051 suggests adding audio feedback for transitions, level complete, and death.
