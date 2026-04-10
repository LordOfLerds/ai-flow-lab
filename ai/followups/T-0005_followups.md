# T-0005 Follow-ups

## Task outcome summary
T-0005 successfully implemented collectibles (coins, gems), power-ups (invulnerability shield, speed boost), and reward mechanisms. The system integrates pickups with score/XP tracking and visual feedback (particles, sounds). Gameplay now has a complete reward loop driving player engagement.

## Remaining risks
1. **Power-up balance**: Duration and effect magnitude hardcoded; may feel overpowered or underwhelming without tuning.
2. **Particle effects performance**: Many simultaneous particles may cause frame drops on older hardware.
3. **Audio system missing**: Collectible/power-up pickups lack sound feedback; player experience feels incomplete.
4. **Respawn mechanics undefined**: Collected items don't respawn; single-play sessions may exhaust resources quickly.

## Candidate follow-up tasks

### F-1
- title: Build XP, leveling, skills, and skins system
- lane_type: feature-lane
- executor: codex
- rationale: Progression system adds depth and long-term engagement. Collectibles now provide resource for XP progression.
- smallest_safe_scope: XP counter, level thresholds, skill unlock display, basic character skin selection.
- depends_on: T-0001 through T-0005
- priority: HIGH
- should_spawn_now: true

### F-2
- title: Add HUD, score tracking, game over, menus, and polish
- lane_type: feature-lane
- executor: codex
- rationale: Completes feedback loop. HUD displays score, XP, lives; menus provide state management.
- smallest_safe_scope: HUD rendering, game-over screen, restart functionality, main menu with difficulty selection.
- depends_on: T-0001 through T-0005
- priority: HIGH
- should_spawn_now: true

### F-3
- title: Audio system and sound effects
- lane_type: feature-lane
- executor: codex
- rationale: Audio feedback significantly improves player experience and game feel.
- smallest_safe_scope: Web Audio API integration, sound effects for collectibles, power-ups, damage, level complete.
- depends_on: T-0001 through T-0005
- priority: MEDIUM
- should_spawn_now: false

### F-4
- title: Add level editor or dynamic level generation
- lane_type: feature-lane
- executor: codex
- rationale: Replayability and content generation. Optional but valuable for extended play.
- smallest_safe_scope: Simple in-game level editor or procedural level generation algorithm.
- depends_on: T-0001 through T-0005
- priority: LOW
- should_spawn_now: false

## Recommended next task
Spawn **F-1 (Build XP, leveling, skills, and skins system)** and **F-2 (Add HUD, score tracking, game over, menus, and polish)** in parallel. Both are critical for polishing the game experience; can be developed independently.

## Notes for planner
- T-0005 reward loop is robust. Collectible density and power-up spawn rates should be tuned during F-2 playtesting.
- F-1 should use collectibles as XP source; skill unlocks can be cosmetic (skins) or gameplay-affecting (modifiers).
- F-2 is final critical path item; post-completion, game is feature-complete for MVP release.
- F-3 (audio) adds significant polish but is not blocking release; defer to post-MVP if timeline is tight.
- F-4 (level editor/generation) is nice-to-have for content expansion; prioritize based on community feedback post-release.
