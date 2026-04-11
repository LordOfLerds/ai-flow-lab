---
type: brief
task_id: T-0047
created: 2026-04-10
tags: [ai-flow-lab, brief]
---

# Implementation Brief: T-0047 — 100 Levels with Progressive Difficulty

## Changes Required

### 1. Replace LEVELS array with generated 100 levels
Replace the hardcoded 12-level LEVELS array with a loop generating 100 levels across 10 biomes. Each biome has 10 levels. Keep the existing LEVELS structure (id, theme, name, icon, baseScore, difficulty).

### 2. Update generateLevel() for progressive difficulty
- Replace `CONFIG.LEVEL_WIDTH_TILES` with `getLevelWidth(levelNum)`: 200 tiles (level 1) → 600 tiles (level 100)
- Scale all difficulty parameters linearly with levelNum
- gapChance: 0.02 + levelNum * 0.0008
- spikeChance: 0.01 + levelNum * 0.0005
- enemyChance: 0.008 + levelNum * 0.0003
- Enemy speed multiplier: 1 + (levelNum - 1) * 0.015
- Gap width: 3 + Math.floor(levelNum / 20) extra max

### 3. Add progress bar to render
In the main render function (the canvas drawing loop), after rendering everything else, draw a thin 3px bar at y=42 (below HUD):
```
const levelWidthPx = gs.level.width * CONFIG.TILE_SIZE;
const progress = Math.min(1, gs.player.x / levelWidthPx);
ctx.fillStyle = 'rgba(0,0,0,0.4)';
ctx.fillRect(0, 42, canvas.width, 3);
ctx.fillStyle = '#4f4';
ctx.fillRect(0, 42, canvas.width * progress, 3);
```

### 4. Update showLevelSelect() for 100 levels
- Add biome tabs at top for quick navigation
- Level cards in a scrollable grid (add `max-height: 400px; overflow-y: auto` to level-grid)
- Biome unlock: need 6/10 levels completed in current biome to unlock next biome
- Update initializeLevelProgress() to handle 100 levels (it loops LEVELS so auto-expands)

### 5. Update showLevelSelect theme filter
The current theme filter uses hardcoded `['Forest', 'Desert', 'Ice', 'Lava', 'Sky']`. Replace with dynamic biome extraction from LEVELS array: `[...new Set(LEVELS.map(l => l.theme))]`

## Files Modified
- `index.html` — all changes

## Acceptance Criteria
- [ ] 100 levels generated across 10 biomes
- [ ] Levels get progressively wider and harder
- [ ] Progress bar visible during gameplay
- [ ] Level select shows biome organization with scroll
- [ ] Biome unlock requires 6/10 previous biome levels
- [ ] Existing saved progress migrates correctly


## Related Documents
- [[ai/specs/T-0047_spec.md|T-0047 spec]]
- [[ai/reviews/T-0047_gemini_review.md|T-0047 review]]
- [[ai/results/T-0047_executor_report.md|T-0047 result]]
- [[ai/followups/T-0047_followups.md|T-0047 followup]]
- [[ai/pr/T-0047_pr_draft.md|T-0047 pr-draft]]
