---
type: followup
task_id: T-0029
created: 2026-04-10
tags: [ai-flow-lab, followup]
---

# T-0029 Follow-ups

## Task outcome summary
T-0029 implemented enemy AI movement and player-enemy collision for Pixel Runner. Walkers now patrol back and forth on platforms with wall reversal and ledge detection. Flyers bob vertically with horizontal drift. Player can stomp enemies from above (bounce + 25 score) or take damage from side/below contact (shield absorbs first hit, then death). Dead enemies flash for 10 frames then get cleaned up. The execution order is updateEnemies → updatePlayer → checkEnemyCollision (collision after all movement, per Gemini recommendation).

## Remaining risks
- The Codex executor destroyed index.html again (reduced to 32 lines). The file was manually rebuilt with all T-0027/T-0028/T-0029 code intact. This is a recurring issue — executor needs guardrails against destructive overwrites.
- Moving platforms are still visual-only — player passes through them. Needs separate implementation.
- HUD is not displayed — score/coins/gems are tracked internally but invisible to player.

## Candidate follow-up tasks

### F-1
- title: Build on-canvas HUD with score, coins, level, and health display
- lane_type: feature-lane
- executor: codex
- rationale: All gameplay metrics (score, coins, gems, level number, shield HP, powerup timers) are tracked in game state but invisible to the player. Without visual feedback, players can't track progress, know their score, or see when powerups are active. The HTML HUD elements exist in the DOM but are not wired to game state. This task either wires the HTML HUD or draws an on-canvas HUD overlay.
- smallest_safe_scope: On-canvas HUD showing: score (top-left), coin count with icon, level number, shield indicator. No minimap, no enemy health bars, no elaborate animations.
- depends_on: T-0029
- priority: high
- should_spawn_now: yes

### F-2
- title: Add moving platform collision and ride mechanics
- lane_type: feature-lane
- executor: codex
- rationale: Moving platforms are rendered with sinusoidal animation but exist only in the render layer. The player passes through them because collision detection doesn't account for them. This task moves platform position calculation into the game loop and adds one-way collision similar to static PLATFORM tiles, plus riding (player moves with platform).
- smallest_safe_scope: Moving platform position update in game loop, player landing on top, player rides horizontally/vertically with platform movement. No crushing mechanics.
- depends_on: T-0029
- priority: normal
- should_spawn_now: no

### F-3
- title: Add game over screen with stats and level select
- lane_type: feature-lane
- executor: codex
- rationale: Currently death just shows "You Died! Press R to retry" with a dark overlay. There's no game-over flow, no stats summary (enemies killed, coins collected, distance traveled), and no way to select a level. This task enhances the death/game-over experience with a proper stats screen and retry/menu options.
- smallest_safe_scope: Enhanced death overlay with stats (score, coins, deaths, enemies stomped), "Retry" and "Main Menu" buttons. No level select yet.
- depends_on: T-0029
- priority: normal
- should_spawn_now: no

## Recommended next task
**F-1 (HUD)** — score, coins, and health are the most requested missing visual elements. Without them the game feels incomplete. This is high priority and relatively straightforward since all data already exists in game state.

## Notes for planner
- The recurring index.html destruction by the Codex executor is a significant risk. Consider adding a pre-execution file backup or line count guard to the pipeline.
- Enemy count is low (2 in test levels). Level generation randomness means some levels may have 0 enemies. Consider ensuring minimum enemy count in generation.
- The `gs.entities` array is filtered every 60 frames to remove dead enemies, keeping memory clean.


## Related Documents
- [[ai/specs/T-0029_spec.md|T-0029 spec]]
- [[ai/reviews/T-0029_gemini_review.md|T-0029 review]]
- [[ai/briefs/T-0029_implementation.md|T-0029 document]]
- [[ai/results/T-0029_executor_report.md|T-0029 result]]
- [[ai/pr/T-0029_pr_draft.md|T-0029 pr-draft]]
