# T-0046 Gemini Review

## Review target
Spec T-0046 addresses 4 critical game bugs: exit collision not saving progress, missing level complete screen, broken skin progression, and undefined skill level requirements. The fixes involve UI flow changes, game state management, and data structure updates.

## Contradictions
- **Skin unlock logic contradiction**: Bug 3 states skins should have "level 5 or 200 coins" requirements but then says `isOwned` should "check `gs.ownedSkins.includes(skin.id)` only (not playerLevel)". This removes level-based unlocking entirely, contradicting the stated requirements.
- **Dual unlock criteria unclear**: Spec mentions both level requirements AND coin/gem prices for skins but doesn't specify if it's level OR payment, level AND payment, or level-gated purchase options.

## Missing edge cases
- **End of game scenario**: What happens when player clicks "Next Level" but `gs.levelNum + 1` exceeds available levels?
- **Multiple exit collisions**: No debouncing mechanism to prevent rapid-fire calls to `checkExitCollision()` if player stays on exit tile.
- **Null/undefined values**: No validation for `getTileAt()` returning undefined, or `gs.coins`/`gs.gems` being undefined.
- **Save failure handling**: No error handling if `completeLevel()` or game save operations fail.
- **Negative scores**: Score calculation could theoretically result in negative values if game state is corrupted.

## Scope risks
- **Function bloat**: `showLevelCompleteScreen()` handles UI rendering, XP calculation, battle pass updates, challenge updates, and navigation - high risk of introducing new bugs due to complexity.
- **Breaking changes to SKINS**: Adding `price` and `currency` fields could break existing code that relies on current structure without proper migration.
- **Missing dependency validation**: Code assumes existence of functions (`calculateStarRating`, `earnBattlePassXP`) and DOM elements (`overlay`, `menuContent`) without verification.

## Missing tests
- **No testing strategy**: Spec doesn't mention testing current behavior before changes or regression testing after fixes.
- **Integration tests needed**: No tests for the complete level flow from exit collision through celebration screen.
- **Skin unlock verification**: No tests to verify skin unlock mechanics work correctly with new pricing structure.
- **UI state management**: No tests for proper game state transitions (PLAYING → LEVEL_COMPLETE → next level).

## Hidden assumptions
- **Required functions exist**: Assumes `calculateStarRating()`, `checkLevelUp()`, `earnBattlePassXP()`, `updateChallengeProgress()` functions are implemented and working.
- **LEVELS data structure**: Assumes LEVELS array has `baseScore` field for star calculation.
- **Battle pass system**: Assumes battle pass and challenge systems are implemented and functional.
- **Save system integrity**: Assumes `completeLevel()` properly saves game state and handles errors.
- **DOM elements available**: Assumes `overlay` and `menuContent` elements exist and are properly styled.

## Recommended corrections
1. **Clarify skin unlock logic**: Specify whether requirements are "level 5 AND 200 coins" (level-gated purchases) or "level 5 OR 200 coins" (alternative unlock paths).

2. **Add end-game handling**: Check if next level exists before allowing progression:
   ```javascript
   const nextLevel = LEVELS.find(l => l.id === gs.levelNum + 1);
   if (!nextLevel) {
     // Show "Game Complete" or return to menu
   }
   ```

3. **Break down complex function**: Split `showLevelCompleteScreen()` into separate concerns:
   - `calculateLevelRewards()`
   - `updatePlayerProgress()`
   - `renderLevelCompleteUI()`

4. **Add validation and error handling**: Check for required dependencies and handle failures gracefully.

5. **Include testing requirements**: Add acceptance criteria for testing current behavior, verifying fixes, and regression testing.

6. **Specify data migration**: If changing SKINS structure, include migration strategy for existing save data.