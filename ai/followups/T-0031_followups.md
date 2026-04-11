---
type: followup
task_id: T-0031
created: 2026-04-10
tags: [ai-flow-lab, followup]
---

# T-0031 Follow-ups

## Task outcome summary
T-0031 implemented moving platform collision and ride mechanics for Pixel Runner. Platform positions are now calculated in the game loop (`updateMovingPlatforms()`) rather than the render function. The player can land on moving platforms from above (one-way collision), ride horizontal platforms, and track vertical platform movement. Wall clamping prevents horizontal ride-through-wall bugs. The executor successfully preserved all existing code (1239 lines, no destruction this time).

## Remaining risks
- Moving platforms may still have edge cases with fast vertical motion or sub-pixel jitter.
- No crushing detection — player pushed into ceiling by a vertical platform will just stop riding.
- Game still lacks a proper game-over screen with stats.
- XP system and XP bar are not connected.

## Candidate follow-up tasks

### F-1
- title: Add game over screen with stats and retry flow
- lane_type: feature-lane
- executor: codex
- rationale: Currently death shows a minimal dark overlay with "You Died! Press R to retry." There's no stats summary and no proper menu flow. With all core mechanics now implemented (physics, enemies, HUD, moving platforms), the game needs a polished death/game-over experience to feel complete.
- smallest_safe_scope: Enhanced death overlay showing final score, coins, gems, enemies stomped, death count, level reached, and time survived. "Retry" button to restart current level. "Main Menu" button to return to menu. No level select, no leaderboard.
- depends_on: T-0031
- priority: high
- should_spawn_now: yes

### F-2
- title: Add sound effects for key game events
- lane_type: feature-lane
- executor: codex
- rationale: The game is completely silent. Sound effects for jumping, landing, coin pickup, enemy stomp, death, and powerup collection would significantly improve the feel. Can use the Web Audio API to generate simple synthesized sounds (no asset files needed).
- smallest_safe_scope: Web Audio API beep/chirp sounds for: jump, coin pickup, gem pickup, enemy stomp, player death, powerup collect. No music, no volume controls, no sound settings menu.
- depends_on: T-0031
- priority: normal
- should_spawn_now: no

### F-3
- title: Add executor file-safety guardrail to pipeline
- lane_type: bug-lane
- executor: claude
- rationale: The Codex executor destroyed index.html three times during T-0027, T-0029, and T-0030 (though T-0031 executed successfully). The pipeline needs a pre-execution backup and post-execution line-count validation to prevent future destruction.
- smallest_safe_scope: Before executor runs, copy target files to `.backup/` directory. After executor completes, compare line counts — if any file shrinks by more than 30%, restore from backup and fail the step with a descriptive error.
- depends_on: none
- priority: critical
- should_spawn_now: yes

## Recommended next task
**F-1 (Game over screen)** — with all core mechanics complete (physics, enemies, HUD, moving platforms), the game needs a proper game-over flow. This is the last major visual feature before the game loop is considered "complete."

**F-3 (Executor guardrail)** should also be spawned to prevent future file destruction, though T-0031's executor succeeded this time.

## Notes for planner
- The T-0031 executor worked correctly this time — it produced 1239 lines with all existing code preserved and new functions properly integrated. The difference from previous failures may be that the brief was more explicit about preserving existing functions.
- Core game loop is now complete: physics → enemies → moving platforms → HUD → collision. The remaining features are polish (game-over screen, sound, level select).
- Consider reducing the `maxDepth` on cascades spawned from follow-ups to avoid chains going too deep without human review.


## Related Documents
- [[ai/specs/T-0031_spec.md|T-0031 spec]]
- [[ai/reviews/T-0031_gemini_review.md|T-0031 review]]
- [[ai/briefs/T-0031_implementation.md|T-0031 document]]
- [[ai/results/T-0031_executor_report.md|T-0031 result]]
- [[ai/pr/T-0031_pr_draft.md|T-0031 pr-draft]]
