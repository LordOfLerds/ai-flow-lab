---
type: review
task_id: T-0017
created: 2026-04-10
tags: [ai-flow-lab, review]
---

# T-0017 Gemini Review

## Review target
`ai/specs/T-0017_spec.md`

## Contradictions
- **Constraint vs. Implementation:** The spec instructs the executor to "Do not invent new business rules," yet the core requirement ("Score should only advance for progress ingame") requires defining exactly what "progress" is because the source docs are missing. The executor is forced to invent a definition to satisfy the "Desired behavior" section.
- **Stationary vs. Velocity:** The "Acceptance criteria" says "While the player is stationary... score remains unchanged." This contradicts some physics implementations where a player might have velocity (running into a wall) but no displacement.

## Missing edge cases
- **Backward Movement:** If "progress" is defined as horizontal displacement, does moving backward decrease the score, or does the score only track the "high-water mark" (max distance reached)?
- **Wall Running/Blocking:** If the player is running against a solid object (Input is active, velocity is non-zero, but position is constant), should the score increase?
- **Death/Game Over:** Should scoring stop immediately upon death, even if the player's corpse continues to slide or move due to physics?
- **Vertical Progress:** In a platformer, does climbing higher count as progress, or only horizontal movement?
- **Environmental Movement:** If the player stands on a moving platform or conveyor belt, does that count as progress?

## Scope risks
- **Definition of Progress:** Without the `DOMAIN_MODEL.md`, the executor might choose "Distance from X=0" while the game design might have intended "Survival time" as the actual mechanic. Changing this could fundamentally change the game's genre or difficulty.
- **Shared Timer:** If the score is currently tied to a global `ticks` or `frameCounter` used by other systems (like enemy spawns or difficulty scaling), decoupling it might lead to logic errors if not handled carefully.

## Missing tests
- **Displacement Test:** Verify score remains identical when `position.x` at `t1` equals `position.x` at `t0`.
- **High-Water Mark Test:** Verify score does not decrease if the player moves backward.
- **Input vs. Displacement Test:** Verify score does not increase when movement keys are pressed but the player is blocked by a collision.
- **Time-only Test:** Verify score remains constant over a 10-second interval with zero player input.

## Hidden assumptions
- **Assumption of Distance-based Scoring:** The spec assumes that "progress" equates to spatial movement. It ignores the possibility that progress could be objective-based (enemies killed, items collected).
- **Horizontal Priority:** Assumes the game is a side-scroller or similar where horizontal movement is the primary metric.

## Recommended corrections
- **Define Progress:** Explicitly define "progress" for this task as "Maximum horizontal distance traveled from the starting point" to remove ambiguity for the executor.
- **Address Directionality:** Add a requirement that score must never decrease even if the player moves backward.
- **Collision Handling:** Clarify that "progress" must be measured by changes in the player's world coordinates, not by player input or animation state.
- **Drift Instruction:** Add a specific instruction to check the existing code's `update()` loop for any variables like `scorePerFrame` or `timeBonus` and explicitly disable them.

## Related Documents
- [[ai/specs/T-0017_spec.md|T-0017 spec]]
- [[ai/briefs/T-0017_implementation.md|T-0017 document]]
- [[ai/results/T-0017_executor_report.md|T-0017 result]]
- [[ai/followups/T-0017_followups.md|T-0017 followup]]
- [[ai/pr/T-0017_pr_draft.md|T-0017 pr-draft]]
