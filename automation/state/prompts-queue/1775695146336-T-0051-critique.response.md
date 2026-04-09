# T-0051 Gemini Review

## Review target
Spec T-0051: Polish — level complete celebration, progress bar, smooth transitions.

## Contradictions
- None found. All 6 polish items are well-specified and compatible.

## Missing edge cases
1. **Level complete on death**: If player reaches end of level but has 0 HP (edge case), should the level still count as complete?
2. **Progress bar on very short levels**: Early levels might be very short — progress bar would jump from 0% to 100% in seconds. Not a bug, but may look odd.
3. **Menu stack overflow**: If a bug causes repeated pushes without pops, the stack could grow unbounded. Add a max stack depth (e.g., 10).
4. **ESC during transition**: If user presses ESC while a fade transition is active, should it be queued or ignored? Spec says ignore — good.
5. **Confetti on mobile**: If game is played on mobile (touch), confetti particles at 30fps might cause jank on low-end devices.

## Scope risks
- Menu stack + transition system is a significant refactor of the navigation flow. Risk of breaking existing menu switches if any `showXxxMenu()` call is missed.
- 6 distinct polish items in one task is ambitious. Consider whether this should be split.

## Missing tests
- No test for menu stack integrity after navigating 5+ levels deep.
- No test for transition interruption handling.
- No test for progress bar accuracy at level boundaries (0% and 100%).

## Hidden assumptions
- Assumes `totalLevelWidth` is accessible during rendering (may need to store it on level generation).
- Assumes death cause can always be determined from collision type. Some deaths might not have a clear cause (e.g., falling off screen).
- Assumes all submenus call a consistent `showXxxMenu()` pattern that can be wrapped with transitions.

## Recommended corrections
1. Store `gs.currentLevelWidth` on level generation for progress bar calculation.
2. Add "fall" as a default death cause for any off-screen death.
3. Cap menu stack at 10 entries to prevent memory issues.
4. Add transition lock: `if (transition.active) return;` at top of all menu switch functions.
5. Consider making confetti particle count configurable (15 for mobile, 30 for desktop).
