# Spec: T-0046 — Fix critical game bugs

## Overview
Fix 4 critical bugs found during UI testing that break core game loop and progression.

## Bug 1: checkExitCollision doesn't save progress
**File:** `index.html` line ~2149
**Current:** `checkExitCollision()` calls `gs.levelNum++; startGame()` without calling `completeLevel()`.
**Fix:** Before incrementing level, call `completeLevel(gs.levelNum, gs.score + gs.coins * 10 + gs.gems * 50)`. Then show a level-complete screen instead of immediately starting next level.

### Implementation
```
function checkExitCollision(p) {
  const TS = CONFIG.TILE_SIZE;
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  if (getTileAt(cx, cy) === TILE.EXIT) {
    // Calculate score
    const totalScore = Math.floor(gs.score) + gs.coins * 10 + gs.gems * 50;
    // Save progress
    completeLevel(gs.levelNum, totalScore);
    // Show level complete screen
    showLevelCompleteScreen(gs.levelNum, totalScore);
  }
}
```

## Bug 2: No level-complete celebration screen
**Fix:** Add `showLevelCompleteScreen(levelId, score)` function that:
1. Sets `gs.phase = 'LEVEL_COMPLETE'`
2. Shows overlay with: level name, stars earned (1-3), coins collected, XP gained
3. Two buttons: "Next Level" (increments levelNum, calls startGame) and "Back to Menu" (returnToMenu)
4. Earn Battle Pass XP on completion

### Implementation
```
function showLevelCompleteScreen(levelId, score) {
  gs.phase = 'LEVEL_COMPLETE';
  const level = LEVELS.find(l => l.id === levelId);
  const stars = calculateStarRating(score, level.baseScore);
  const xpEarned = Math.floor(score / 10) + gs.coins * 2 + gs.gems * 5;
  
  // Award XP
  gs.xp += xpEarned;
  checkLevelUp();
  earnBattlePassXP(xpEarned, "level_completion");
  updateChallengeProgress("levels", 1);
  updateChallengeProgress("score", score);
  updateChallengeProgress("coins", gs.coins);
  
  const starStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  
  overlay.classList.remove('hidden');
  menuContent.innerHTML = `
    <h2 style="color: #4f4;">✅ LEVEL COMPLETE!</h2>
    <div style="font-size: 18px; color: #6cf; margin: 8px 0;">${level.name}</div>
    <div style="font-size: 24px; margin: 12px 0;">${starStr}</div>
    <div class="stats">Score: ${score} | Coins: ${gs.coins} | Gems: ${gs.gems}</div>
    <div class="stats">+${xpEarned} XP</div>
    <div class="btn" onclick="gs.levelNum = ${levelId + 1}; startGame();">Next Level ▶</div>
    <div class="btn" onclick="returnToMenu()">Back to Menu</div>
  `;
}
```

## Bug 3: All skins unlocked (no progression)
**File:** `index.html` `generateSkinShopContent()` line ~1382
**Current:** `const isOwned = isSelected || gs.ownedSkins.includes(skin.id) || gs.playerLevel >= skin.level;`
This makes ALL skins "owned" if playerLevel >= skin.level. But skin.level is set low (1-3).
**Fix:** Skins should have proper level requirements:
- Runner: free (level 1)
- Ninja: level 5 or 200 coins
- Robot: level 10 or 500 coins  
- Ghost: level 15 or 300 gems
- Golden: level 25 or 1000 coins
- Flame: level 40 or 500 gems

Update SKINS array with `price` and `currency` fields. In shop, show "Buy for X coins" button. `isOwned` should check `gs.ownedSkins.includes(skin.id)` only (not playerLevel).

## Bug 4: Skills have undefined levelReq
**File:** `index.html` SKILLS array
**Current:** Skills use `.level` field but `showSkillsMenu` template accesses `.levelReq` which is undefined.
**Fix:** Either rename `.level` to `.levelReq` in SKILLS array, or update template to use `.level`. Prefer renaming to `.levelReq` for clarity.

## Acceptance Criteria
- [ ] Reaching TILE.EXIT saves level progress and shows celebration screen
- [ ] Level complete screen shows stars, score, XP, next level button
- [ ] Skins have meaningful unlock requirements (level + coins/gems)
- [ ] Skills show correct level requirements in menu
- [ ] All 4 bugs verified fixed in gameplay
