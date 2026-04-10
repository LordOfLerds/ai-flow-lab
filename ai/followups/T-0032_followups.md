# T-0032 Follow-ups

## Task outcome summary
T-0032 added a file safety guardrail to the executor pipeline in `execute-task-api.mjs`. Before the LLM call, all source files in the repo root are snapshotted (line count + content stored in memory). After file writing, each written file is validated against its snapshot: files that shrink by > 30% or contain placeholder/truncation patterns are flagged as critical issues and automatically restored from the snapshot. Results are included in the executor report. The guardrail is non-blocking — the pipeline continues even if destruction is detected, but the original file is restored.

## Remaining risks
- The guardrail only scans the repo root directory, not subdirectories. Future tasks modifying nested files won't be protected.
- The 70% threshold is empirical — may need tuning as more tasks run.
- The `repoRoot` import and function parameter shadowing in `snapshotSourceFiles()` works correctly but could be confusing for future maintainers.

## Candidate follow-up tasks

### F-1
- title: Add game over screen with stats and retry flow
- lane_type: feature-lane
- executor: codex
- rationale: Core game mechanics are complete (physics, enemies, HUD, moving platforms). The game needs a polished death/game-over experience with stats display (score, coins, gems, enemies stomped, level reached) and proper retry/menu flow.
- smallest_safe_scope: Enhanced death overlay with stats, Retry and Main Menu buttons. No level select, no leaderboard, no animation.
- depends_on: T-0031
- priority: high
- should_spawn_now: yes

### F-2
- title: Extend executor guardrail to subdirectories
- lane_type: feature-lane
- executor: claude
- rationale: The current guardrail only snapshots files in the repo root. As the project grows, important files in subdirectories (automation/scripts, docs, etc.) won't be protected.
- smallest_safe_scope: Add configurable scan depth to snapshotSourceFiles(). Scan repo root + one level of subdirectories. Skip node_modules, .git, dist. No persistent backup.
- depends_on: T-0032
- priority: low
- should_spawn_now: no

## Recommended next task
**F-1 (Game over screen)** — the game needs this to feel complete. All core systems are in place.

## Notes for planner
- The executor guardrail is now active for all future executor runs. If it triggers, the report will document the detection and restoration.
- The server needs to be restarted for the updated execute-task-api.mjs to take effect on future runs.
- Consider running a quick manual test of the guardrail by temporarily modifying the threshold.
