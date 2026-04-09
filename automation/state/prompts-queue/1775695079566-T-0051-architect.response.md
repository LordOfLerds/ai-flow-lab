# T-0051 Spec

## Task metadata
- task_id: T-0051
- title: Polish: level complete celebration, progress bar, smooth transitions
- lane_type: feature-lane
- executor: codex

## Problem statement
The game lacks polish: level completion just shows a basic "Level Complete" text, there's no in-game progress indicator, menu transitions are inconsistent, the death screen provides minimal info, back buttons are inconsistent across submenus, and ESC key behavior varies. These polish items make the game feel unfinished.

## Source of truth
- `index.html` — current level complete handling, menu system, HUD rendering, death screen

## Desired behavior

### 1. Level Complete Screen
When player reaches the end of a level, show a celebration overlay:
```
╔═══════════════════════════╗
║    ⭐ LEVEL COMPLETE ⭐     ║
║                           ║
║  Stars:    ★★★ (3/3)      ║
║  Coins:    42 collected    ║
║  XP:       +120 earned     ║
║  Time:     1:23            ║
║  Distance: 2400px          ║
║                           ║
║  [Next Level]  [Menu]      ║
╚═══════════════════════════╝
```
- Stars based on performance: 1 star = completed, 2 stars = under time target, 3 stars = no deaths + under time
- Confetti particle burst animation (30 particles, random colors, gravity fall)
- XP bar animation showing progress to next player level
- If player levels up from this XP, show "LEVEL UP!" flash

### 2. In-Game Progress Bar
- Thin (4px) bar at very top of canvas
- Color: gradient from red (0%) → yellow (50%) → green (100%)
- Width: `(player.x / totalLevelWidth) * canvasWidth`
- Small diamond marker at current position
- Label: "42%" on right side of bar

### 3. Smooth Menu Transitions
Implement consistent fade transition system:
```js
const transition = { active: false, alpha: 0, direction: 'in', callback: null, speed: 0.05 };
```
- Before any menu switch: trigger `transitionOut(callback)` — fades to black
- After fade complete: execute callback (change screen), then `transitionIn()` — fades from black
- All `showXxxMenu()` calls should go through this transition system
- Transition duration: ~20 frames (0.67s at 30fps)

### 4. Death Screen Improvement
When player dies, show enhanced death screen:
```
╔═══════════════════════════╗
║      💀 YOU DIED 💀         ║
║                           ║
║  Cause: Hit by spike      ║
║  Distance: 1200px (48%)   ║
║  Coins: 23 collected      ║
║                           ║
║  [Retry]  [Menu]           ║
╚═══════════════════════════╝
```
- Track death cause in `gs.lastDeathCause` (set during collision: 'spike', 'enemy', 'fall', 'lava')
- Show distance as percentage of level

### 5. Consistent Back Buttons
All submenus (Skills, Shop, Skins, Settings, Leaderboard) must have:
- "← Back" button in top-left corner
- Same styling: white text, rounded rect background, hover highlight
- Clicking returns to parent menu (not always main menu)
- Standard function: `renderBackButton(targetScreen)` used by all submenus

### 6. ESC Key Navigation
Implement menu stack:
```js
gs.menuStack = []; // Stack of previous screens
```
- On entering any submenu: push current screen to stack
- ESC key: pop stack, go to previous screen
- If stack empty: ESC does nothing (already at main menu)
- During gameplay: ESC opens pause menu (push 'playing' to stack)

## Constraints
- All changes in `index.html` only
- Confetti particles: max 30, reuse from pool, do not allocate new arrays per celebration
- Transition system must not break existing menu navigation
- Progress bar must not overlap with existing HUD elements
- Death cause tracking must be set at the exact collision point, not retroactively
- Back button size: 80x30px, position: (10, 10) relative to canvas

## Acceptance criteria
- [ ] Level complete shows stars, coins, XP, time
- [ ] Confetti animation plays on level complete
- [ ] Progress bar visible during gameplay showing level percentage
- [ ] Fade transitions between all menus
- [ ] Death screen shows cause of death and distance
- [ ] Back button present and consistent in all submenus
- [ ] ESC key navigates back through menu stack
- [ ] ESC during gameplay opens pause menu

## Risks
- Menu stack could get corrupted if transitions interrupt each other. Need a lock: if transition active, ignore new menu switches.
- Progress bar position might conflict with the existing score/level HUD at top.
- Confetti particles could conflict with existing trail particles if sharing the same array.

## Open questions
- Should star ratings unlock bonus rewards (e.g., extra coins for 3 stars)?
- Should there be a "best time" per level display?
