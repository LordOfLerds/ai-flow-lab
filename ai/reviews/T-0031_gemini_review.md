---
type: review
task_id: T-0031
created: 2026-04-10
tags: [ai-flow-lab, review]
---

# T-0031 Gemini Review

## Review target
The spec aims to transition moving platform position calculations from the rendering phase to the game logic phase, enabling one-way collision detection and "ride" mechanics (player moving with the platform).

## Contradictions
*   **Vertical Double-Movement:** In `checkMovingPlatformCollision`, the code sets `p.y = platTop - p.h` (snapping the player to the platform's *current* top) and then immediately applies `p.y += mp.deltaY`. Since `platTop` already incorporates the platform's movement for the current frame, adding `deltaY` again will result in the player moving twice as far as the platform vertically, causing them to float or jitter.
*   **Update Order vs. FrameCount:** The spec relies on `frameCount` for position calculation. If `frameCount` is incremented at the end of the `gameLoop`, `updateMovingPlatforms` will calculate positions based on the "old" frame index, but the render will use the same index, potentially causing a 1-frame lag in logic vs. visuals depending on where the increment happens.

## Missing edge cases
*   **Overlapping Platforms:** The loop in `checkMovingPlatformCollision` does not `break` upon finding a collision. If two moving platforms overlap, the player will have `mp.deltaX` and `mp.deltaY` applied from *both* platforms, doubling their movement speed.
*   **High-Speed Clipping:** The collision check uses hardcoded offsets (`+ 8` and `+ 2`). If a platform moves vertically faster than 8 pixels per frame (possible with high `speed` and `amplitude`), the player may fall through it entirely because the "previous frame" and "current frame" checks will both fail to overlap the threshold.
*   **Ride-into-Wall:** The spec applies `p.x += mp.deltaX` after standard tile collision. If a platform moves the player into a solid wall tile, the player will penetrate the wall. While the spec says "No crushing," simple penetration allows players to bypass level boundaries or get stuck inside geometry.

## Scope risks
*   **Vertical Jitter:** Character "vibration" is common on vertical platforms when `p.vy` is reset to 0 every frame while the platform's `platTop` is also moving. 
*   **Sub-pixel Desync:** JavaScript's `Math.sin` returns floats. If `p.x` and `p.y` are rounded elsewhere but platform positions are not, the player might appear to "slide" slightly or vibrate visually while standing still on a platform.

## Missing tests
*   **Jump-through Verification:** Ensure player can jump from below a platform and pass through it without `vy` being reset to 0.
*   **Coyote Time Verification:** Test walking off the side of a moving platform to ensure the `coyoteTimer` allows a jump in mid-air.
*   **Static Platform Parity:** Verify that a platform with `amplitude: 0` behaves identically to a standard `TILE.PLATFORM`.
*   **Ceiling Interaction:** Test what happens when a vertical platform moves the player up into a solid ceiling tile.

## Hidden assumptions
*   **Global Access:** Assumes `frameCount` and `gs` are globally accessible to the new functions.
*   **Initialization Timing:** Assumes `startGame()` is the only entry point; if there are level transitions that don't call the specific initialization loop, `currentX/Y` will be `undefined`, breaking collision.
*   **Constant Speed:** Assumes `0.02` multiplier in the sine wave remains the constant for all platform types.

## Recommended corrections
*   **Fix Vertical Ride Logic:** In `checkMovingPlatformCollision`, snap the player to the top: `p.y = platTop - p.h;`. Then apply horizontal delta: `p.x += mp.deltaX;`. Do **not** apply `p.y += mp.deltaY` as the snap already accounts for it.
*   **Prevent Multiple Delta Application:** Add `break;` at the end of the collision detection logic once a platform is found and resolved.
*   **Safe Horizontal Ride:** Wrap the `p.x += mp.deltaX` in a basic tile check or move the `checkMovingPlatformCollision` call to *before* the horizontal tile collision resolution in `updatePlayer` (though this requires a more significant refactor of `updatePlayer`).
*   **Initialization:** Ensure the initialization loop for `currentX/Y` is also present in any "Reset Level" or "Next Level" logic, not just `startGame()`.

## Related Documents
- [[ai/specs/T-0031_spec.md|T-0031 spec]]
- [[ai/briefs/T-0031_implementation.md|T-0031 document]]
- [[ai/results/T-0031_executor_report.md|T-0031 result]]
- [[ai/followups/T-0031_followups.md|T-0031 followup]]
- [[ai/pr/T-0031_pr_draft.md|T-0031 pr-draft]]
