# T-0034 Spec: Score does not reset on game restart

## Overview

Fix the bug where player score, coins, and gems persist across game restarts instead of resetting to zero.

## Root Cause

The `startGame()` function in `index.html` calls `createPlayer()` which creates a new player object, but does not reset the score-related properties on the game state object (`gs`). The `gs.score`, `gs.coins`, and `gs.gems` values from the previous run carry over.

## Target File

- `index.html` — the self-contained game file

## Technical Design

### Changes Required

In the `startGame()` function (around line 1194), after the `gs.phase = 'PLAYING'` assignment, add explicit resets:

```javascript
gs.score = 0;
gs.coins = 0;
gs.gems = 0;
gs.health = CONFIG.PLAYER_MAX_HEALTH || 3;
```

### HUD Reset

The `initHUD()` function (called from `startGame()`) already resets the DOM display to show zeros, so the HUD will automatically reflect the reset values on the next `updateHUD()` call.

### What NOT to Change

- Do not modify `createPlayer()` — it correctly creates player physics/position state
- Do not modify `updateHUD()` — it correctly reads from `gs`
- Do not touch enemy, platform, or level generation code
- Do not modify the scoring logic in `checkTilePickups()` or `updatePlayer()`

## Acceptance Criteria

1. After dying and restarting, `gs.score === 0`, `gs.coins === 0`, `gs.gems === 0`
2. HUD displays 0 for all score fields on restart
3. Score increments correctly during the new run
4. No regression in other game mechanics (movement, collision, enemies)

## Risk Assessment

**Low risk** — This is a 4-line addition to a single function with no side effects. The change is purely additive (setting values that were previously left stale).
