---
type: review
task_id: T-0030
created: 2026-04-10
tags: [ai-flow-lab, review]
---

# T-0030 Gemini Review

## Review target
- **Task ID:** T-0030
- **Title:** Build on-canvas HUD with score, coins, level, and health display
- **Spec File:** `ai/specs/T-0030_spec.md`

## Contradictions
- **Title vs. Implementation:** The task title specifies an "on-canvas HUD," but the primary solution (Sections 1-4) focuses on an HTML/DOM HUD. Section 5 introduces an on-canvas HUD as a "fallback." The architect should clarify if the goal is a hybrid approach or if one takes precedence.
- **Health vs. Shield:** The title mentions "health display," but the implementation logic uses `gs.player.shieldHP`. In many games, Health and Shields are distinct. If the player is 1-hit-kill without a shield, this should be explicitly noted to avoid confusion with a traditional HP bar.

## Missing edge cases
- **Null Player State:** The `updateHUD` function accesses `gs.player.shieldHP`. If `gs.player` is null (e.g., during the transition between death and respawn), the script will throw a TypeError.
- **UI Overflow:** If `gs.score` or `gs.coins` reaches very large numbers (e.g., millions), the current HTML structure/CSS might cause the `.hud-item` elements to wrap or overlap.
- **Visibility in Non-Playing Phases:** The spec mentions updating during the `PLAYING` phase, but does not explicitly state if the HUD should be hidden or "frozen" during `PAUSED`, `GAMEOVER`, or `MENU` phases. 
- **Powerup Icon Spam:** If multiple powerups are active or if the list grows, the `hud-powerups` container might overflow the `#hud` container.

## Scope risks
- **Redundancy/Sync Issues:** Implementing both an HTML HUD and an On-Canvas HUD creates two "views" for the same "model." This increases maintenance and the risk of visual desync (e.g., HTML shows 100 points, Canvas shows 99 due to rounding differences or update timing).
- **DOM Thrashing:** Running `innerHTML` updates and `getElementById` calls 60 times per second (inside the `render` loop) is inefficient and can cause garbage collection stutters.

## Missing tests
- **Reset Validation:** Test that all HUD values (Score, Coins, Gems, Powerups) return to 0/initial state exactly when `startGame()` is called.
- **Powerup Expiration:** Test that the Powerup indicator disappears immediately when the frame count reaches 0, not one frame late.
- **Scaling/Resolution Test:** Ensure the HTML HUD remains aligned/visible when the browser window is resized or zoomed.

## Hidden assumptions
- **Fixed Frame Rate:** The powerup timer math (`Math.ceil(gs.powerUps.speed/60)`) assumes a constant 60 FPS. If the game uses a variable delta time, the displayed "seconds" will be inaccurate.
- **DOM Availability:** Assumes the IDs `hud-score`, `hud-coins`, etc., do not already exist in the `index.html` or that the executor is free to rewrite that entire block.
- **Z-Index:** Assumes the `#hud` element is styled with a high enough `z-index` to appear above the canvas.

## Recommended corrections
1. **Cache DOM References:** Move `document.getElementById` calls outside the `updateHUD` function (e.g., in an `initHUD` function) to avoid repeated DOM lookups every frame.
2. **Throttle HTML Updates:** Only update `textContent` or `innerHTML` if the underlying value in `gs` has changed since the last frame.
3. **Null Check:** Add a guard clause for `gs.player` in `updateHUD` to prevent crashes: `if (!gs.player) return;`.
4. **Clarify Primary HUD:** If the HTML HUD is the primary interface, the Canvas HUD should be explicitly labeled as "Debug" or "Fallback" and perhaps disabled by default to save draw calls.
5. **Standardize Time:** Use a constant `CONFIG.FPS` or similar for the timer math instead of hardcoded `60`.

## Related Documents
- [[ai/specs/T-0030_spec.md|T-0030 spec]]
- [[ai/briefs/T-0030_implementation.md|T-0030 document]]
- [[ai/results/T-0030_executor_report.md|T-0030 result]]
- [[ai/followups/T-0030_followups.md|T-0030 followup]]
- [[ai/pr/T-0030_pr_draft.md|T-0030 pr-draft]]
