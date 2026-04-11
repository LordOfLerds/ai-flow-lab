---
type: brief
task_id: T-0051
created: 2026-04-10
tags: [ai-flow-lab, brief]
---

# T-0051 Implementation Brief

## Goal
Add 6 polish features: level complete celebration screen, in-game progress bar, smooth menu transitions, enhanced death screen, consistent back buttons, and ESC key navigation stack.

## Scope
1. **Level Complete Screen**: Stars (1-3), coins collected, XP gained, time, confetti particles (30 max), "Next Level" and "Menu" buttons.
2. **Progress Bar**: 4px bar at canvas top, gradient red→yellow→green, percentage label.
3. **Menu Transitions**: Fade out/in system (20 frames), wrap all `showXxxMenu()` calls.
4. **Death Screen**: Show cause of death (`gs.lastDeathCause`), distance reached as percentage.
5. **Back Buttons**: `renderBackButton(targetScreen)` function, top-left corner, used by all submenus.
6. **ESC Key Stack**: `gs.menuStack[]` with push/pop, ESC pops to previous screen, max 10 entries.

## Constraints
- All changes in `index.html` only.
- Confetti: reuse particle pool, max 30 particles, gravity fall, random colors.
- Transition lock: `if (transition.active) return;` at top of menu switch functions.
- Progress bar: `gs.currentLevelWidth` stored on level generation.
- Death causes: 'spike', 'enemy', 'fall', 'lava', 'unknown' (default).
- Back button: 80x30px at (10, 10), white text on semi-transparent dark background.
- Menu stack capped at 10 entries.
- Do NOT modify game physics or level generation.

## File targets
- `index.html` — transition system, level complete overlay, progress bar rendering, death screen, `renderBackButton()`, menu stack logic, ESC key handler, confetti system.

## Tests required
- Verify level complete shows all stats (stars, coins, XP, time)
- Verify progress bar goes from 0% to 100% across a level
- Verify fade transitions work between all menus
- Verify ESC returns to previous menu
- Verify back buttons present in Skills, Shop, Settings, Leaderboard
- Verify death screen shows cause

## Chosen minimal policy
- Add `transition` object to gs. `transitionTo(callback)` starts fadeout, executes callback at full black, then fades in.
- Add `gs.menuStack = []`. Each `showXxxMenu()` pushes current screen before switching. ESC pops.
- `renderBackButton(targetScreen)` draws a styled button, on click transitions to target.
- Level complete: overlay drawn on top of game canvas, pause game loop updates.
- Progress bar: drawn first in HUD render, below any existing elements.
- Death cause: set in collision handlers (`gs.lastDeathCause = 'spike'` etc.).
- Confetti: `gs.confetti[]` array, spawned on level complete, rendered/updated in overlay draw.

## Risks
- Wrapping ALL menu calls in transitions is invasive — could miss some paths and cause inconsistency.
- Progress bar might overlap with score HUD — use y-offset of 0 (very top, above everything).
- ESC during gameplay needs to distinguish from ESC in menus.

## Explicit non-goals
- Sound effects for transitions or celebrations.
- Star rating bonus rewards.
- Best-time-per-level tracking.
- Animated XP bar in level complete screen.
- Mobile-specific particle count tuning.


## Related Documents
- [[ai/specs/T-0051_spec.md|T-0051 spec]]
- [[ai/reviews/T-0051_gemini_review.md|T-0051 review]]
- [[ai/results/T-0051_executor_report.md|T-0051 result]]
- [[ai/followups/T-0051_followups.md|T-0051 followup]]
- [[ai/pr/T-0051_pr_draft.md|T-0051 pr-draft]]
