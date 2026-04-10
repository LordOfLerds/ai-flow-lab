# Spec: T-0047 — Expand to 100 levels with progressive difficulty

## Overview
Expand the game from 12 to 100 levels across 10 themed biomes. Make levels progressively harder and longer with a visible progress bar.

## LEVELS Array Expansion
Replace the current 12-level LEVELS array with 100 levels across 10 biomes (10 levels each):

| Biome (10 levels each) | Levels | Theme Color | Special Feature |
|------------------------|--------|-------------|-----------------|
| 1. Meadow | 1-10 | Green | Basic — learning levels |
| 2. Forest | 11-20 | Dark Green | Dense platforms, more gaps |
| 3. Desert | 21-30 | Sandy | Quicksand tiles (slow player) |
| 4. Cave | 31-40 | Dark Gray | Low visibility (fog), bats |
| 5. Ice | 41-50 | Light Blue | Ice tiles (slippery) |
| 6. Lava | 51-60 | Red/Orange | Lava pits (instant death), fire enemies |
| 7. Ocean | 61-70 | Blue | Water sections (swim physics) |
| 8. Jungle | 71-80 | Lime | Vine platforms, swinging hazards |
| 9. Ruins | 81-90 | Brown/Gold | Crumbling platforms, trap triggers |
| 10. Space | 91-100 | Purple/Dark | Low gravity, floating obstacles |

### Level Generation
```js
const LEVELS = [];
const BIOMES = [
  { theme: 'Meadow', icon: '🌱', color: '#4a4' },
  { theme: 'Forest', icon: '🌲', color: '#2a6' },
  { theme: 'Desert', icon: '🏜️', color: '#da4' },
  { theme: 'Cave', icon: '🦇', color: '#666' },
  { theme: 'Ice', icon: '❄️', color: '#8cf' },
  { theme: 'Lava', icon: '🌋', color: '#f42' },
  { theme: 'Ocean', icon: '🌊', color: '#48f' },
  { theme: 'Jungle', icon: '🌴', color: '#4d2' },
  { theme: 'Ruins', icon: '🏛️', color: '#a86' },
  { theme: 'Space', icon: '🚀', color: '#a4f' }
];

for (let i = 0; i < 100; i++) {
  const biome = BIOMES[Math.floor(i / 10)];
  const levelInBiome = (i % 10) + 1;
  LEVELS.push({
    id: i + 1,
    theme: biome.theme,
    name: `${biome.theme} ${levelInBiome}`,
    icon: biome.icon,
    baseScore: 1500 + i * 100,
    difficulty: Math.floor(i / 10) + 1
  });
}
```

## Progressive Difficulty in generateLevel()
Current `CONFIG.LEVEL_WIDTH_TILES = 200` is fixed. Make it progressive:

```js
function getLevelWidth(levelNum) {
  // Level 1: 200 tiles, Level 100: 600 tiles (linear increase)
  return 200 + Math.floor((levelNum - 1) * 4.04);
}
```

Update generateLevel() to use `getLevelWidth(levelNum)` instead of `CONFIG.LEVEL_WIDTH_TILES`.

### Difficulty Scaling
- `gapChance`: 0.02 (level 1) → 0.10 (level 100)
- `spikeChance`: 0.01 → 0.06
- `enemyChance`: 0.008 → 0.04
- Enemy speed: 1x (level 1) → 2.5x (level 100)
- Gap width: 3-4 tiles (early) → 3-8 tiles (late)
- Platform rarity: common (early) → scarce (late)

## Level Progress Bar (HUD)
Add a thin progress bar at the very top of the canvas:
```js
// In renderHUD() or render function
const levelWidthPx = gs.level.width * CONFIG.TILE_SIZE;
const progress = Math.min(gs.player.x / levelWidthPx, 1);
ctx.fillStyle = 'rgba(0,0,0,0.3)';
ctx.fillRect(0, 0, canvas.width, 4);
ctx.fillStyle = '#4f4';
ctx.fillRect(0, 0, canvas.width * progress, 4);
```

## Level Select UI Update
The level-grid needs to handle 100 levels efficiently:
- Show biome tabs/headers (clickable to jump to biome)
- 10 levels per biome row
- Scroll within overlay if needed (max-height + overflow-y)
- Show biome unlock status (complete 8/10 levels to unlock next biome)

## Acceptance Criteria
- [ ] 100 levels defined across 10 biomes
- [ ] Level width increases from 200 to 600 tiles
- [ ] Difficulty scales smoothly (gaps, spikes, enemies, speed)
- [ ] Progress bar visible during gameplay
- [ ] Level select shows all 100 levels organized by biome
- [ ] Biome progression: complete 8/10 levels to unlock next biome
- [ ] First 10 levels (Meadow) feel easy and tutorialish
- [ ] Last 10 levels (Space) feel challenging
