---
type: brief
task_id: T-0034
created: 2026-04-10
tags: [ai-flow-lab, brief]
---

# T-0034 Implementation Brief: Score does not reset on game restart

## Agreed Changes

### 1. Reset score state in `startGame()`

**File:** `index.html`
**Location:** `startGame()` function, after `gs.phase = 'PLAYING'` and before `initHUD()`

Add these reset lines:

```javascript
// Reset score state for new run
gs.score = 0;
gs.coins = 0;
gs.gems = 0;
gs.health = CONFIG.PLAYER_MAX_HEALTH || 3;
```

**Rationale:** The Gemini review confirmed this is the correct fix location. The `createPlayer()` function handles player position/physics state but not game-level scoring state. Adding the reset here ensures it happens exactly once per game start, before `initHUD()` writes the initial display values.

### 2. No other changes needed

The review confirmed:
- `initHUD()` already resets DOM display elements — it will show the zeroed values automatically
- `updateHUD()` reads from `gs.*` so it will reflect the reset correctly
- `checkTilePickups()` increments from whatever the current value is, so starting from 0 is correct
- No changes needed to enemy, platform, or rendering code

## Executor Instructions

1. Find the `startGame()` function (approximately line 1194)
2. After the line `gs.phase = 'PLAYING';` add the four reset lines above
3. Ensure the reset lines come BEFORE the `initHUD()` call
4. Do NOT modify any other function
5. Do NOT restructure or reformat existing code — surgical insertion only

## Verification

After the fix, restarting the game after death should show:
- Score: 0
- Coins: 0/0
- Gems: 0
- Health: full (3 hearts or configured max)


## Related Documents
- [[ai/specs/T-0034_spec.md|T-0034 spec]]
- [[ai/reviews/T-0034_gemini_review.md|T-0034 review]]
- [[ai/results/T-0034_executor_report.md|T-0034 result]]
