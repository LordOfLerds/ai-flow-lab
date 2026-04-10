# Implementation Brief: T-0046 — Fix critical game bugs

## Priority Order
1. Fix checkExitCollision (most critical — breaks level progression)
2. Add showLevelCompleteScreen (needed for exit to work properly)
3. Fix skin progression (quality of life)
4. Fix skill levelReq field (cosmetic)

## Detailed Changes

### 1. checkExitCollision() — line ~2149
**Current broken code:**
```js
function checkExitCollision(p) {
  const TS = CONFIG.TILE_SIZE;
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  if (getTileAt(cx, cy) === TILE.EXIT) {
    gs.levelNum++;
    startGame();
    initializeMovingPlatforms(gs.level);
  }
}
```

**Replace with:**
```js
function checkExitCollision(p) {
  const TS = CONFIG.TILE_SIZE;
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  if (getTileAt(cx, cy) === TILE.EXIT) {
    const totalScore = Math.floor(gs.score) + gs.coins * 10 + gs.gems * 50;
    completeLevel(gs.levelNum, totalScore);
    showLevelCompleteScreen(gs.levelNum, totalScore);
  }
}
```

### 2. Add showLevelCompleteScreen() — add after checkExitCollision
New function that shows celebration overlay with stars, score, XP earned, and navigation buttons.

Key behavior:
- Sets `gs.phase = 'LEVEL_COMPLETE'`
- Calculates star rating via existing `calculateStarRating()`
- Awards XP and Battle Pass progress
- Shows "Next Level" and "Back to Menu" buttons
- If last level (id === LEVELS.length), show "All Levels Complete!" instead of Next Level

### 3. Fix SKINS unlock requirements
Update SKINS array entries to have meaningful price/level gates:
```js
{ name: 'Runner', colors: [...], id: 'runner', level: 1, price: 0 }      // free
{ name: 'Ninja', colors: [...], id: 'ninja', level: 5, price: 200 }     // level 5 OR 200 coins
{ name: 'Robot', colors: [...], id: 'robot', level: 10, price: 500 }    // level 10 OR 500 coins
{ name: 'Ghost', colors: [...], id: 'ghost', level: 15, price: 100, currency: 'gems' }
{ name: 'Golden', colors: [...], id: 'golden', level: 25, price: 1000 }
{ name: 'Flame', colors: [...], id: 'flame', level: 40, price: 500, currency: 'gems' }
```

In `generateSkinShopContent()`, change `isOwned` check:
```js
const isOwned = gs.ownedSkins.includes(skin.id);
const canAfford = (skin.currency === 'gems') ? gs.totalGems >= skin.price : gs.totalCoins >= skin.price;
const meetsLevel = gs.playerLevel >= skin.level;
```

Add "Buy" button when `!isOwned && (canAfford || meetsLevel)`.

### 4. Fix SKILLS levelReq
Find SKILLS array definition. Each skill object likely has a `.level` field. The `showSkillsMenu()` template string accesses `.levelReq`. 

Fix: Add `levelReq` alias or update the template. Safest: add `levelReq` to each skill:
```js
{ name: 'Double Jump', icon: '⬆️', desc: '...', level: 2, levelReq: 2, ... }
```

## Files Modified
- `index.html` — all changes in the single game file

## Acceptance Criteria
- [ ] Exit collision saves progress and shows level complete screen
- [ ] Level complete screen shows stars (1-3), score, coins, XP
- [ ] "Next Level" button works, "Back to Menu" returns to main menu
- [ ] Skins require level/coins to unlock (not all free)
- [ ] Skills menu shows correct "Requires Level X" text
