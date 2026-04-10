# T-0040 Implementation Brief

## Goal
Add an enhanced game over screen with score breakdown, XP bar, star rating, and action buttons. Implement parallax scrolling backgrounds with 2 themes, screen shake on damage, particle effects for collectibles, and animated menu transitions.

## Scope
1. **Game over overlay** — HTML-based overlay inside `#overlay` / `#menu-content` with score breakdown, animated XP bar, star rating, unlock notifications, and 3 action buttons
2. **Parallax background system** — 3-layer parallax drawn on canvas before game objects, with 2 themes (forest, city) that switch at distance milestones
3. **Screen shake** — CSS transform-based canvas shake on player hit/death (200ms, ±4px, decaying)
4. **Particle system** — Lightweight particle array (max 50) for coin and gem collection effects
5. **Menu transitions** — Fade-out/fade-in overlay transitions (150ms each) between menu screens

## Constraints
- All changes in `index.html` only
- No external dependencies
- Parallax drawn on existing canvas (no new canvas elements)
- Max 50 active particles at any time
- Screen shake via CSS `transform: translate()` on `<canvas>` element
- Must not break existing gameplay mechanics, collision, or physics
- Preserve all existing functions — add new code, don't refactor existing
- Must work offline

## File targets
| File | Action | Description |
|------|--------|-------------|
| `index.html` | MODIFY | Add game over screen, parallax system, particles, screen shake, menu transitions |

## Tests required
1. **Game over screen**: Play → die → verify score breakdown shows distance, coin bonus, gem bonus, total
2. **XP bar**: Verify animated fill on game over, handles level-up during animation
3. **Star rating**: Score 0 → 0 stars, 500 → 1 star, 2000 → 2 stars, 5000 → 3 stars
4. **Best score badge**: Beat best score → "NEW BEST!" visible; don't beat → no badge
5. **Buttons**: Retry restarts game, Main Menu returns to menu
6. **Parallax**: During gameplay, 3 layers move at different speeds (visual check)
7. **Theme switch**: Run past 2000m → background theme changes from forest to city
8. **Screen shake**: Take damage → canvas visibly shakes for ~200ms then returns to center
9. **Particles**: Collect coin → yellow burst, collect gem → colored burst
10. **Particle cap**: Collect many items rapidly → no more than 50 particles on screen
11. **No regression**: Existing jump, collision, scoring, skins still work correctly

## Chosen minimal policy

### Game over screen implementation
Use HTML elements inside `#overlay` rather than canvas rendering. This gives us proper button handling, text styling, and animation via CSS transitions. The overlay already exists and is used for menus.

### XP formula
`xpEarned = Math.floor(totalScore / 10) + (coinsCollected * 2) + (gemsCollected * 5)`
This gives meaningful XP per run. Level thresholds: `xpToNextLevel = 100 * currentLevel` (linear scaling).

### Rendering order (draw loop)
1. Clear canvas
2. Draw sky gradient (theme-based)
3. Draw parallax layer 1 (far, 0.2x speed)
4. Draw parallax layer 2 (mid, 0.5x speed)
5. Draw ground/platforms (1x speed) — existing
6. Draw game objects (player, enemies, collectibles) — existing
7. Draw particles
8. Draw HUD — existing

### Parallax layer data structure
```javascript
const THEMES = {
  forest: {
    sky: ['#1a1a2e', '#16213e', '#0f3460'],  // gradient stops
    far: { color: '#2d1b69', shapes: 'mountains', speed: 0.2 },
    mid: { color: '#1a472a', shapes: 'trees', speed: 0.5 }
  },
  city: {
    sky: ['#ff6b35', '#f7931e', '#1a1a2e'],
    far: { color: '#1a1a2e', shapes: 'skyscrapers', speed: 0.2 },
    mid: { color: '#2d2d44', shapes: 'buildings', speed: 0.5 }
  }
};
```

### Particle system
Simple array-based system:
```javascript
const particles = [];
function spawnParticles(x, y, color, count) { /* push new particles */ }
function updateParticles(dt) { /* move, fade, remove dead */ }
function drawParticles(ctx) { /* draw circles with alpha */ }
```

### Performance budget
If frame time exceeds 18ms consistently, reduce parallax to 2 layers (skip far layer). Particles are already capped at 50.

### Theme transitions
Hard switch at distance milestones (0-2000: forest, 2000-4000: city, then cycle). No crossfade in v1 to keep scope manageable.

## Risks
1. **Draw order refactoring**: The existing game loop may intermix update and render logic. The executor must identify the render section and insert parallax drawing before game objects without breaking the draw sequence.
2. **Performance on mobile**: 3 parallax layers + particles on a 2D canvas could cause frame drops on low-end devices. The particle cap and simple shapes mitigate this.
3. **Screen shake with game object positions**: CSS transform on the canvas doesn't affect canvas coordinate space, so mouse/touch coordinates remain accurate. This is the correct approach.
4. **Game over overlay styling conflicts**: New HTML elements in `#overlay` must not conflict with existing menu styling. Use scoped class names like `.gameover-*`.

## Explicit non-goals
- Level select functionality (T-0042)
- Shop or cosmetics store (T-0043)
- Battle pass progression (T-0044)
- Sound effects or music
- More than 2 background themes in this task
- Crossfade between themes
- Mobile-specific touch optimizations
- Save/load of visual preferences
