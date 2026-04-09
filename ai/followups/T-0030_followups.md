# T-0030 Follow-ups

## Task outcome summary
T-0030 implemented the HUD system for Pixel Runner. The HTML HUD now displays real-time score, coins, gems, level number, shield indicator, and active powerup timers during gameplay. DOM references are cached in `initHUD()` and only updated when values change (throttled writes). A canvas-based debug HUD fallback exists behind `CONFIG.DEBUG_HUD`. The HUD is visible during PLAYING and DEAD phases, hidden during MENU. All Gemini critique items were addressed: cached DOM refs, throttled updates, null guards on gs.player, and canvas HUD gated as debug-only.

## Remaining risks
- The Codex executor destroyed index.html a third time (reduced from 1085 to 476 lines with a placeholder comment). File was manually rebuilt to 1163 lines with all T-0027/T-0028/T-0029/T-0030 code. **This recurring issue needs pipeline-level guardrails.**
- Moving platforms are still visual-only — player passes through them.
- XP bar elements exist in HTML but are not connected to any XP system.
- Game has no proper game-over screen with stats.

## Candidate follow-up tasks

### F-1
- title: Add moving platform collision and ride mechanics
- lane_type: feature-lane
- executor: codex
- rationale: Moving platforms are rendered with sinusoidal animation but the player passes through them. Position updates happen only in the render layer. This task moves platform position calculation into the game loop and adds one-way collision so the player can land on and ride moving platforms.
- smallest_safe_scope: Moving platform position update in game loop, player landing on top (one-way collision like static PLATFORM tiles), player rides horizontally/vertically with platform movement. No crushing mechanics, no breakable moving platforms.
- depends_on: T-0030
- priority: high
- should_spawn_now: yes

### F-2
- title: Add game over screen with stats and retry flow
- lane_type: feature-lane
- executor: codex
- rationale: Currently death shows a minimal dark overlay with "You Died! Press R to retry." There's no stats summary (score, coins collected, enemies stomped, time survived) and no proper menu flow. This task enhances the death screen into a proper game-over experience.
- smallest_safe_scope: Enhanced death overlay showing final score, coins, gems, death count, and level reached. "Retry" button to restart current level. "Main Menu" button to return to menu. No level select, no leaderboard.
- depends_on: T-0030
- priority: normal
- should_spawn_now: no

### F-3
- title: Add executor file-safety guardrail to pipeline
- lane_type: bug-lane
- executor: claude
- rationale: The Codex executor has destroyed index.html three times (T-0027, T-0029, T-0030), each time overwriting the complete file with truncated content or placeholder comments. This costs significant manual rebuild time. The pipeline needs a pre-execution backup and post-execution line-count validation to catch destructive overwrites before they merge.
- smallest_safe_scope: Before executor runs, snapshot target files (copy to `.backup/`). After executor completes, compare line counts — if any file shrinks by more than 30%, flag as potential destruction, restore from backup, and fail the step with a descriptive error. No UI changes needed.
- depends_on: none
- priority: critical
- should_spawn_now: yes

## Recommended next task
**F-1 (Moving platform collision)** — moving platforms are visible but non-functional, which is confusing to players. This is the most impactful remaining physics feature.

**F-3 (Executor guardrail)** should also be spawned immediately as a bug-lane task since it addresses a critical recurring issue that blocks every feature task.

## Notes for planner
- The executor destruction pattern is: it rewrites the entire file but loses ~600 lines of existing code, either truncating mid-file or inserting placeholder comments like `// ... [content continues] ...`. The file needs to be treated as append-only by the executor, or the pipeline needs backup/restore logic.
- Enemy AI, physics, rendering, and HUD are now all functional — the game is playable end-to-end with real gameplay mechanics.
- Consider prioritizing F-3 (guardrail) even above F-1 since every future feature task will risk the same destruction.
