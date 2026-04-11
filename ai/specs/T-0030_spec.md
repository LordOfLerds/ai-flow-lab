---
type: spec
task_id: T-0030
created: 2026-04-10
tags: [ai-flow-lab, spec]
---

# T-0030 Spec

## Task metadata
- **task_id:** T-0030
- **title:** Build on-canvas HUD with score, coins, level, and health display
- **lane_type:** feature-lane
- **executor:** codex
- **parent_task_id:** T-0029

## Problem statement
All gameplay metrics (score, coins, gems, level number, shield HP, active powerups, death count) are tracked in game state (`gs.score`, `gs.coins`, `gs.gems`, `gs.levelNum`, `gs.player.shieldHP`, `gs.powerUps`, `gs.deathCount`) but are completely invisible to the player during gameplay. The HTML HUD elements exist in the DOM (`#hud`, `.hud-item`, `#xp-bar-fill`) but are not wired to game state. Players need real-time visual feedback to understand their progress.

## Source of truth
- `index.html` (repo root) — self-contained game file (~1085 lines)
- HTML HUD element: `<div id="hud">` at the top of the game container

### Key existing code references:
- `gs.score` — integer, progress-based score
- `gs.coins` — integer, coins collected
- `gs.gems` — integer, gems collected
- `gs.levelNum` — integer, current level (1-based)
- `gs.deathCount` — integer, times died
- `gs.player.shieldHP` — integer, shield hit points (0 = no shield)
- `gs.powerUps.speed` — frames remaining (0 = inactive)
- `gs.powerUps.shield` — frames remaining
- `gs.powerUps.magnet` — frames remaining
- `gs.xp` — XP object (if present)
- `CONFIG.CANVAS_WIDTH` — 480
- `CONFIG.CANVAS_HEIGHT` — 384
- `ctx` — canvas 2D rendering context
- `render()` function — called every frame, handles all rendering
- HTML HUD: `#hud` div with `.hud-item` children, `#xp-bar-fill` for XP progress

## Desired behavior

### 1. Wire HTML HUD to game state
Update the existing HTML HUD elements every frame during the PLAYING phase. The DOM elements already exist with proper CSS styling.

### 2. Add `updateHUD()` function
Called from `render()` during the PLAYING phase, after all canvas drawing:

```javascript
function updateHUD() {
  // Score display
  const scoreEl = document.getElementById('hud-score');
  if (scoreEl) scoreEl.textContent = Math.floor(gs.score);

  // Coins display
  const coinsEl = document.getElementById('hud-coins');
  if (coinsEl) coinsEl.textContent = gs.coins;

  // Gems display
  const gemsEl = document.getElementById('hud-gems');
  if (gemsEl) gemsEl.textContent = gs.gems;

  // Level display
  const levelEl = document.getElementById('hud-level');
  if (levelEl) levelEl.textContent = 'Lv ' + gs.levelNum;

  // Shield indicator
  const shieldEl = document.getElementById('hud-shield');
  if (shieldEl) shieldEl.style.display = gs.player && gs.player.shieldHP > 0 ? 'flex' : 'none';

  // Powerup indicators
  updatePowerupIndicators();
}
```

### 3. Update HTML HUD structure
Modify the `#hud` div content to include proper elements with IDs:

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

### 4. Powerup timer indicators
Show active powerups with remaining time bars:

```javascript
function updatePowerupIndicators() {
  const container = document.getElementById('hud-powerups');
  if (!container) return;

  let html = '';
  if (gs.powerUps.speed > 0) {
    const pct = (gs.powerUps.speed / 600 * 100).toFixed(0);
    html += `<span style="color:#ff0;font-size:10px">⚡${Math.ceil(gs.powerUps.speed/60)}s</span> `;
  }
  if (gs.powerUps.magnet > 0) {
    html += `<span style="color:#f0f;font-size:10px">🧲${Math.ceil(gs.powerUps.magnet/60)}s</span> `;
  }
  container.innerHTML = html;
}
```

### 5. Also draw minimal on-canvas HUD as fallback
Draw a simple score/coins on the canvas itself (in case HTML overlay doesn't render properly):

```javascript
function renderCanvasHUD() {
  ctx.save();
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('Score: ' + Math.floor(gs.score), 8, 14);
  ctx.fillText('Coins: ' + gs.coins, 8, 26);
  ctx.fillText('Gems: ' + gs.gems, 8, 38);

  ctx.textAlign = 'right';
  ctx.fillText('Level ' + gs.levelNum, CONFIG.CANVAS_WIDTH - 8, 14);

  // Shield indicator
  if (gs.player && gs.player.shieldHP > 0) {
    ctx.fillStyle = '#4ef';
    ctx.fillText('Shield: ' + gs.player.shieldHP, CONFIG.CANVAS_WIDTH - 8, 26);
  }
  ctx.restore();
}
```

### 6. Wire into render()
Call `renderCanvasHUD()` at the end of the PLAYING branch in `render()`, after `renderPlayer()`.
Call `updateHUD()` after canvas drawing to sync HTML elements.

### 7. Reset HUD on game start
In `startGame()`, reset HUD elements to initial values.

## Constraints
- **Single file only:** All changes in `index.html`
- **Preserve existing rendering:** Do not modify any render* functions except to ADD the HUD call
- **Preserve existing functions:** Do not modify `generateLevel()`, `createPlayer()`, `updatePlayer()`, `updateEnemies()`, `checkEnemyCollision()`
- **Canvas HUD is minimal:** Small text, semi-transparent, top of screen — don't obstruct gameplay
- **HTML HUD already styled:** Use existing CSS classes (`.hud-item`, `#hud`)
- **No DOM manipulation in hot loop:** Cache element references, avoid `querySelector` per frame

## Acceptance criteria
1. Score displays on screen and updates in real-time during gameplay
2. Coin count displays with icon and updates when coins are collected
3. Gem count displays and updates when gems are collected
4. Level number displays and updates on level advance
5. Shield indicator appears when shield is active
6. Powerup timers show remaining duration with countdown
7. HUD is readable but doesn't obstruct gameplay view
8. HUD resets properly on game restart
9. No console errors
10. No performance regression (60fps maintained)

## Risks
- innerHTML updates for powerup indicators every frame could cause GC pressure — mitigate by only updating when values change
- Canvas text rendering is fast but adds draw calls — keep it minimal
- HTML HUD overlay might not align perfectly with canvas at all screen sizes

## Open questions
1. Should XP bar be functional? **Recommendation:** Show it but don't connect to XP system (separate task for XP/leveling).
2. Should death count show in HUD? **Recommendation:** No — save for game-over screen.
3. Should HUD animate (score counting up, coin pop)? **Recommendation:** Out of scope — basic display first.


## Related Documents
- [[ai/reviews/T-0030_gemini_review.md|T-0030 review]]
- [[ai/briefs/T-0030_implementation.md|T-0030 document]]
- [[ai/results/T-0030_executor_report.md|T-0030 result]]
- [[ai/followups/T-0030_followups.md|T-0030 followup]]
- [[ai/pr/T-0030_pr_draft.md|T-0030 pr-draft]]
