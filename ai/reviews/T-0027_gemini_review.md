---
type: review
task_id: T-0027
created: 2026-04-10
tags: [ai-flow-lab, review]
---

# T-0027 Gemini Review

## Review target
- **Task ID:** T-0027
- **Title:** Implement tile rendering and camera system for Pixel Runner
- **Spec File:** `ai/specs/T-0027_spec.md`

## Contradictions
- **Moving Platform Position Logic:** The spec states "No physics/collision: This task is rendering only" but then instructs the executor to "Calculate current position using sinusoidal motion" inside the rendering function. This creates a contradiction where "visual position" is calculated in the view layer while the "logical position" in `gs.level.movingPlatforms` remains static. This will cause desync issues once the physics task (T-0028+) is implemented.
- **Camera Vertical Alignment:** Section 1 says "position vertically so player is in the lower third," but the standard behavior for a runner often involves centering. If the level height (25 tiles * 16px = 400px) matches the `CANVAS_HEIGHT` (400px), the camera vertical clamping will force `y` to 0, making the "lower third" instruction impossible to satisfy unless the level height exceeds the canvas height.

## Missing edge cases
- **Level smaller than viewport:** If a level is generated with a width/height smaller than 800x400, the camera clamping logic `[0, levelPixelWidth - CANVAS_WIDTH]` will result in a negative upper bound.
- **Star field wrapping logic:** The spec suggests stars should "wrap around," but `gs.camera.x * 0.1` is a linear offset. Without a modulo operator against the canvas width/height, stars will eventually scroll off-screen and never return as the player progresses through a 3200px+ level.
- **Negative Hash results:** The deterministic hash `(col * 7 + row * 13) % N` can return negative values in some JavaScript environments if coordinates were negative (not applicable here due to clamping, but good to note). More importantly, `N` is not defined.

## Scope risks
- **Per-tile decoration performance:** Calculating deterministic grass blades and brick patterns inside a loop covering ~1250 tiles every frame using Canvas2D `rect` and `pixel` calls can be expensive on lower-end devices or mobile browsers.
- **Star initialization:** The spec suggests storing stars in a `stars` array on `gs` but forbids modifying "any game state initialization" in the constraints. This makes it unclear where the star array should be initialized (e.g., inside `startGame` vs. a one-time global check).

## Missing tests
- **Culling verification:** Test that tiles at `startCol - 1` and `endCol + 1` are truly not being rendered (e.g., via a counter in a debug mode).
- **Camera Clamping:** Verify camera does not show areas outside `(0, 0)` and `(levelWidth, levelHeight)`.
- **Parallax Direction:** Verify stars move in the correct direction relative to player movement (stars should move slower in the *same* direction as the player to simulate depth, or the background should shift *less* than the foreground).

## Hidden assumptions
- **Frame Count Persistence:** Assumes `frameCount` is initialized to 0 globally and persisted correctly across game restarts.
- **Sprite Alignment:** Assumes `drawSprite` handles the `-camera.x` offset correctly when passed as the `x` parameter without interfering with the internal scaling/flipping logic.
- **Global Alpha:** Assumes the semi-transparent shield and pulsing effects don't leave the global alpha state modified for subsequent draw calls.

## Recommended corrections
1. **Moving Platforms:** Update the spec to clarify that while the *visual* offset is calculated now, a follow-up task must move this logic to the physics update to prevent collision desync.
2. **Star Wrapping:** Explicitly define the wrapping formula: `screenX = (star.x - (camera.x * parallaxFactor)) % CANVAS_WIDTH`. If the result is negative, add `CANVAS_WIDTH`.
3. **Initialization:** Explicitly allow a one-time initialization block for the `stars` array within the `renderBackground` function if it hasn't been populated yet, to satisfy the constraint of not modifying existing init functions.
4. **Deterministic Hash:** Define `N` for the grass blade logic (e.g., `N=4`).
5. **Transparency Safety:** Add a requirement to use `ctx.save()` and `ctx.restore()` or ensure `ctx.globalAlpha` is reset after rendering the shield.

## Related Documents
- [[ai/specs/T-0027_spec.md|T-0027 spec]]
- [[ai/briefs/T-0027_implementation.md|T-0027 document]]
- [[ai/results/T-0027_executor_report.md|T-0027 result]]
- [[ai/followups/T-0027_followups.md|T-0027 followup]]
- [[ai/pr/T-0027_pr_draft.md|T-0027 pr-draft]]
