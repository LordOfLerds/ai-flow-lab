---
type: followup
task_id: T-0003
created: 2026-04-10
tags: [ai-flow-lab, followup]
---

# T-0003 Follow-ups

## Task outcome summary
T-0003 successfully implemented a tile-based level system with platform rendering, scrolling support, and camera clamping to level bounds. The system supports simple tile maps and provides a foundation for complex level design.

## Remaining risks
1. **Large level performance**: Tile rendering is O(visible_tiles); very large levels may strain frame rate if culling is not optimized.
2. **Level loading time**: No async level loading; level transitions may cause frame hitches.
3. **Platform edge collision**: Collision is simplified; may allow unintended corner-cutting or floor-clipping.
4. **Camera snap on level load**: Camera doesn't smooth transition when loading new levels; may feel jarring.

## Candidate follow-up tasks

### F-1
- title: Add obstacles and enemies
- lane_type: feature-lane
- executor: codex
- rationale: Level geometry is now solid. Obstacles increase challenge and drive narrative arc.
- smallest_safe_scope: Single obstacle type (spike or moving platform), basic patrol AI, collision with player triggers damage/death.
- depends_on: T-0001, T-0002, T-0003
- priority: HIGH
- should_spawn_now: true

### F-2
- title: Implement collectibles, rewards, and power-ups
- lane_type: feature-lane
- executor: codex
- rationale: Engagement loop now viable with stable levels. Collectibles drive score progression.
- smallest_safe_scope: Coin entity type, pickup collision detection, score increment, particle feedback.
- depends_on: T-0001, T-0002, T-0003
- priority: HIGH
- should_spawn_now: true

### F-3
- title: Build XP, leveling, skills, and skins system
- lane_type: feature-lane
- executor: codex
- rationale: Long-term progression system. Depends on collectible loop being established.
- smallest_safe_scope: XP counter tied to collectibles, level thresholds, basic skill unlock display.
- depends_on: T-0001, T-0002, T-0003, collectibles (F-2)
- priority: MEDIUM
- should_spawn_now: false

### F-4
- title: Add HUD, score tracking, game over, menus, and polish
- lane_type: feature-lane
- executor: codex
- rationale: Completes feedback loop and player experience. Visual polish ties gameplay together.
- smallest_safe_scope: Render score/XP to HUD, game-over screen with restart, main menu transitions.
- depends_on: T-0001, T-0002, T-0003
- priority: MEDIUM
- should_spawn_now: false

## Recommended next task
Spawn **F-1 (Add obstacles and enemies)** and **F-2 (Implement collectibles)** in parallel. Both are independent gameplay layers that can be developed concurrently, unblocking F-3 once both complete.

## Notes for planner
- T-0003 level system is performant and extensible. Tile-based architecture supports dynamic level generation if needed later.
- F-1 and F-2 should share collision detection framework; coordinate implementation to avoid duplication.
- F-3 can follow once core reward loop (F-2) is in place; introduces progression mechanics.
- F-4 should wait until F-1, F-2, F-3 baseline is stable; focuses on visual feedback and state transitions.


## Related Documents
- [[ai/specs/T-0003_spec.md|T-0003 spec]]
- [[ai/reviews/T-0003_gemini_review.md|T-0003 review]]
- [[ai/briefs/T-0003_implementation.md|T-0003 document]]
- [[ai/pr/T-0003_pr_draft.md|T-0003 pr-draft]]
