---
type: brief
task_id: T-0030
created: 2026-04-10
tags: [ai-flow-lab, brief]
---

# T-0030 Implementation Brief

## Goal
Wire the existing HTML HUD to game state so players see real-time score, coins, gems, level number, shield status, and active powerup timers during gameplay. Add a minimal on-canvas HUD as a debug fallback (disabled by default).

## Scope
Modify only `index.html` (repo root). Add `initHUD()`, `updateHUD()`, `updatePowerupIndicators()`, `renderCanvasHUD()` functions. Update the `#hud` HTML block with proper element IDs. Call from `render()` during PLAYING phase. Reset on `startGame()`.

## Constraints
1. **Single file:** All changes in `index.html` only
2. **Preserve existing:** Do not modify `generateLevel()`, `createPlayer()`, `updatePlayer()`, `updateEnemies()`, `checkEnemyCollision()`, or any render* functions except to ADD the HUD calls
3. **No DOM manipulation in hot loop:** Cache all element references in `initHUD()` — never call `getElementById` per frame (Gemini fix #1)
4. **Throttle updates:** Only update `textContent`/`innerHTML` when values change from previous frame (Gemini fix #2)
5. **Null guard:** Always check `gs.player` before accessing `shieldHP` (Gemini fix #3)
6. **Canvas HUD off by default:** Canvas fallback is gated behind `CONFIG.DEBUG_HUD = false` (Gemini fix #4)

## File targets
- `index.html` (repo root) — modify HTML HUD structure, add new JS functions, update `render()` and `startGame()`

### Implementation details (addressing Gemini critique):

**1. Update HTML HUD structure** — replace the contents of `<div id="hud">`:

```html
<div id="hud">
  <div class="hud-item"><span class="icon">⭐</span><span id="hud-score">0</span></div>
  <div class="hud-item"><span class="icon">🪙</span><span id="hud-coins">0</span></div>
  <div class="hud-item"><span class="icon">💎</span><span id="hud-gems">0</span></div>
  <div class="hud-item"><span class="icon">📊</span><span id="hud-level">Lv 1</span></div>
  <div class="hud-item" id="hud-shield" style="display:none"><span class="icon">🛡️</span></div>
  <div class="hud-item" id="hud-powerups"></div>
</div>
```

**2. Add `CONFIG.DEBUG_HUD`** — add to CONFIG object:
```javascript
DEBUG_HUD: false  // Set true to show on-canvas HUD fallback
```

**3. Add `initHUD()` function** — called once from `startGame()` to cache DOM refs (Gemini fix #1):

```javascript
// Cached HUD DOM references (set by initHUD)
let hudEls = {};
let hudPrev = {}; // Previous values for throttle check

function initHUD() {
  hudEls = {
    score: document.getElementById('hud-score'),
    coins: document.getElementById('hud-coins'),
    gems: document.getElementById('hud-gems'),
    level: document.getElementById('hud-level'),
    shield: document.getElementById('hud-shield'),
    powerups: document.getElementById('hud-powerups')
  };
  hudPrev = { score: -1, coins: -1, gems: -1, level: -1, shield: -1, speedPU: -1, magnetPU: -1 };

  // Reset display values
  if (hudEls.score) hudEls.score.textContent = '0';
  if (hudEls.coins) hudEls.coins.textContent = '0';
  if (hudEls.gems) hudEls.gems.textContent = '0';
  if (hudEls.level) hudEls.level.textContent = 'Lv 1';
  if (hudEls.shield) hudEls.shield.style.display = 'none';
  if (hudEls.powerups) hudEls.powerups.innerHTML = '';
}
```

**4. Add `updateHUD()` function** — called from `render()` during PLAYING phase, throttled (Gemini fixes #1, #2, #3):

```javascript
function updateHUD() {
  if (!gs.player) return; // Gemini fix #3: null guard

  // Score — only update DOM if changed (Gemini fix #2)
  const scoreVal = Math.floor(gs.score);
  if (scoreVal !== hudPrev.score && hudEls.score) {
    hudEls.score.textContent = scoreVal;
    hudPrev.score = scoreVal;
  }

  // Coins
  if (gs.coins !== hudPrev.coins && hudEls.coins) {
    hudEls.coins.textContent = gs.coins;
    hudPrev.coins = gs.coins;
  }

  // Gems
  if (gs.gems !== hudPrev.gems && hudEls.gems) {
    hudEls.gems.textContent = gs.gems;
    hudPrev.gems = gs.gems;
  }

  // Level
  if (gs.levelNum !== hudPrev.level && hudEls.level) {
    hudEls.level.textContent = 'Lv ' + gs.levelNum;
    hudPrev.level = gs.levelNum;
  }

  // Shield — show/hide based on shieldHP
  const shieldActive = gs.player.shieldHP > 0 ? 1 : 0;
  if (shieldActive !== hudPrev.shield && hudEls.shield) {
    hudEls.shield.style.display = shieldActive ? 'flex' : 'none';
    hudPrev.shield = shieldActive;
  }

  // Powerup indicators
  updatePowerupIndicators();
}
```

**5. Add `updatePowerupIndicators()` function** — throttled innerHTML updates:

```javascript
function updatePowerupIndicators() {
  if (!hudEls.powerups) return;

  const speedSec = gs.powerUps.speed > 0 ? Math.ceil(gs.powerUps.speed / 60) : 0;
  const magnetSec = gs.powerUps.magnet > 0 ? Math.ceil(gs.powerUps.magnet / 60) : 0;

  // Only update DOM if values changed
  if (speedSec === hudPrev.speedPU && magnetSec === hudPrev.magnetPU) return;
  hudPrev.speedPU = speedSec;
  hudPrev.magnetPU = magnetSec;

  let html = '';
  if (speedSec > 0) {
    html += '<span style="color:#ff0;font-size:10px">⚡' + speedSec + 's</span> ';
  }
  if (magnetSec > 0) {
    html += '<span style="color:#f0f;font-size:10px">🧲' + magnetSec + 's</span> ';
  }
  hudEls.powerups.innerHTML = html;
}
```

**6. Add `renderCanvasHUD()` function** — debug fallback, gated by CONFIG flag (Gemini fix #4):

```javascript
function renderCanvasHUD() {
  if (!CONFIG.DEBUG_HUD) return;

  ctx.save();
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('Score: ' + Math.floor(gs.score), 8, 14);
  ctx.fillText('Coins: ' + gs.coins, 8, 26);
  ctx.fillText('Gems: ' + gs.gems, 8, 38);

  ctx.textAlign = 'right';
  ctx.fillText('Level ' + gs.levelNum, CONFIG.CANVAS_WIDTH - 8, 14);

  if (gs.player && gs.player.shieldHP > 0) {
    ctx.fillStyle = '#4ef';
    ctx.fillText('Shield: ' + gs.player.shieldHP, CONFIG.CANVAS_WIDTH - 8, 26);
  }
  ctx.restore();
}
```

**7. Wire into `render()`:**
In the PLAYING branch of `render()`, after `renderPlayer()`:
```javascript
renderCanvasHUD(); // Debug fallback (off by default)
updateHUD();       // Primary HTML HUD sync
```

**8. Wire into `startGame()`:**
Call `initHUD()` at the start of `startGame()` to cache references and reset display.

**9. HUD visibility by phase (Gemini edge case):**
- PLAYING: HUD visible and updating
- DEAD: HUD frozen (stops updating, last values persist — player can see final score)
- MENU: HUD hidden (set `#hud` display:none when not PLAYING)

Add to `render()`:
```javascript
const hudContainer = document.getElementById('hud');
if (hudContainer) {
  hudContainer.style.display = gs.phase === 'PLAYING' || gs.phase === 'DEAD' ? 'flex' : 'none';
}
```

## Tests required
1. Score updates in real-time during gameplay
2. Coin count increments when coins are collected
3. Gem count increments when gems are collected
4. Level number updates on level advance
5. Shield indicator appears when shield is active, hidden when not
6. Powerup timers show countdown and disappear at 0
7. HUD resets to initial values on startGame()
8. No TypeError when gs.player is null (death transition)
9. HUD hidden during MENU phase, visible during PLAYING and DEAD
10. No console errors
11. 60fps maintained (no DOM thrashing)

## Chosen minimal policy
- **HTML HUD is primary** — the on-canvas HUD is a debug fallback gated by `CONFIG.DEBUG_HUD` (Gemini recommendation to avoid dual-view sync issues)
- **Cache all DOM refs** — `initHUD()` runs once, `updateHUD()` uses cached refs only (Gemini fix #1)
- **Throttle all DOM writes** — compare with previous values, skip if unchanged (Gemini fix #2)
- **Null guard on player** — `if (!gs.player) return` at top of `updateHUD()` (Gemini fix #3)
- **FPS constant assumption** — use hardcoded 60 for now since the game targets 60fps via rAF. A `CONFIG.FPS` constant would be premature since we don't use delta time yet
- **Health = Shield** — this game uses 1-hit-kill with optional shield pickup. "Health display" in the title means shield indicator. No traditional HP bar needed.

## Risks
1. **Powerup innerHTML once per second:** Even with throttle, innerHTML changes every second when a powerup is active. Acceptable for 1-2 elements.
2. **HUD z-index:** If `#hud` CSS doesn't set z-index above the canvas, it won't be visible. The existing CSS should handle this — verify after execution.
3. **Emoji rendering:** HUD icons use emoji (⭐🪙💎🛡️⚡🧲). Some browsers may render these differently. Acceptable for current scope.

## Explicit non-goals
- XP bar functionality (separate task)
- Death count in HUD (save for game-over screen)
- HUD animations (score counting up, coin pop effects)
- Minimap
- Enemy health bars
- Responsive HUD scaling (current fixed-size layout is sufficient)
- Delta-time based powerup timers


## Related Documents
- [[ai/specs/T-0030_spec.md|T-0030 spec]]
- [[ai/reviews/T-0030_gemini_review.md|T-0030 review]]
- [[ai/results/T-0030_executor_report.md|T-0030 result]]
- [[ai/followups/T-0030_followups.md|T-0030 followup]]
- [[ai/pr/T-0030_pr_draft.md|T-0030 pr-draft]]
