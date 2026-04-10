# T-0004 Follow-ups

## Task outcome summary
T-0004 successfully added obstacles and enemies to the game, including spike traps, moving platforms, and basic patrol/chase enemy AI. The implementation integrates collision detection and damage handling into the existing player physics and level system.

## Remaining risks
1. **Enemy AI simplicity**: Patrol and chase only; no jumping or advanced tactics. May feel predictable.
2. **Spike detection edge case**: Collision with spikes uses bounding-box; player may pass through thin spikes at certain speeds.
3. **Moving platform physics**: Platform movement not integrated with player gravity; may cause clipping or unexpected behavior.
4. **Respawn system missing**: No player respawn on death; game requires page reload or restart.

## Candidate follow-up tasks

### F-1
- title: Implement collectibles, rewards, and power-ups
- lane_type: feature-lane
- executor: codex
- rationale: Rewards motivate player progression. Gameplay loop is now complete with hazards in place.
- smallest_safe_scope: Coin entity, pickup collision, score increment, optional power-up (temporary invulnerability or speed boost).
- depends_on: T-0001, T-0002, T-0003, T-0004
- priority: HIGH
- should_spawn_now: true

### F-2
- title: Build XP, leveling, skills, and skins system
- lane_type: feature-lane
- executor: codex
- rationale: Progression mechanics engage long-term play. Depends on collectible/reward system being in place.
- smallest_safe_scope: XP counter tied to collectibles, level unlock thresholds, skill tree UI (display only, no gameplay effects).
- depends_on: T-0001, T-0002, T-0003, T-0004, collectibles (F-1)
- priority: MEDIUM
- should_spawn_now: false

### F-3
- title: Add HUD, score tracking, game over, menus, and polish
- lane_type: feature-lane
- executor: codex
- rationale: Completes player feedback loop. Visual polish and state management tie everything together.
- smallest_safe_scope: HUD rendering (score, XP, lives), game-over screen with restart button, main menu state transitions.
- depends_on: T-0001, T-0002, T-0003, T-0004
- priority: MEDIUM
- should_spawn_now: false

### F-4
- title: Improve enemy AI and add advanced obstacles
- lane_type: feature-lane
- executor: codex
- rationale: Optional polish. Increases difficulty curve and replayability.
- smallest_safe_scope: Jumping enemies, boss-type obstacles, environmental hazards (lava, wind).
- depends_on: T-0001, T-0002, T-0003, T-0004
- priority: LOW
- should_spawn_now: false

## Recommended next task
Spawn **F-1 (Implement collectibles, rewards, and power-ups)** immediately. Reward loop is critical for engagement; once in place, F-2 and F-3 can complete the experience.

## Notes for planner
- T-0004 obstacle/enemy system is functional but minimal. AI behavior is predictable; advanced tactics deferred to F-4 (optional).
- F-1 should include at least one power-up type (e.g., invulnerability) to add strategic depth and player agency.
- F-2 progression system should tie XP to both collectibles and enemy defeats to create multiple reward vectors.
- F-3 is critical path item; prioritize completion before considering F-4 polish.
