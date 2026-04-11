---
type: followup
task_id: T-0006
created: 2026-04-10
tags: [ai-flow-lab, followup]
---

# T-0006 Follow-ups

## Task outcome summary
T-0006 successfully implemented XP, leveling, skills, and character skins systems. The implementation includes XP accumulation from collectibles and defeats, level thresholds unlocking new skins, and skill tree UI for displaying unlocked abilities. Players now have visible progression and character customization options.

## Remaining risks
1. **Skill gameplay effects missing**: Skills are displayed but don't affect gameplay; feels incomplete without active bonuses.
2. **Balance tuning required**: XP rates and skill unlock thresholds are estimates; require playtesting to feel fair.
3. **Skin selection UI minimal**: Skins can be selected but lack visual preview or description.
4. **Save/load state missing**: Progress doesn't persist between sessions; losing motivation for long-term play.

## Candidate follow-up tasks

### F-1
- title: Add HUD, score tracking, game over, menus, and polish
- lane_type: feature-lane
- executor: codex
- rationale: Final critical path item. HUD displays score/XP/level; menus provide complete game experience.
- smallest_safe_scope: HUD overlay with dynamic score/level/skill display, game-over screen with stats, main menu with difficulty/character selection.
- depends_on: T-0001 through T-0006
- priority: HIGH
- should_spawn_now: true

### F-2
- title: Implement skill gameplay effects and balancing
- lane_type: feature-lane
- executor: codex
- rationale: Skills currently display only; active effects add strategic depth and make progression meaningful.
- smallest_safe_scope: Implement 2-3 skill types (damage boost, speed buff, air jump), test balance against difficulty.
- depends_on: T-0001 through T-0006
- priority: HIGH
- should_spawn_now: false

### F-3
- title: Add save/load and session persistence
- lane_type: feature-lane
- executor: codex
- rationale: Persistent progress encourages long-term engagement and protects player investment.
- smallest_safe_scope: localStorage-based save of player progress (level, XP, unlocked skins), load on game start.
- depends_on: T-0001 through T-0006
- priority: MEDIUM
- should_spawn_now: false

### F-4
- title: Audio system and sound effects
- lane_type: feature-lane
- executor: codex
- rationale: Audio feedback significantly improves game feel and player immersion.
- smallest_safe_scope: Web Audio API, effects for level-up, skill unlock, UI interactions.
- depends_on: T-0001 through T-0006
- priority: MEDIUM
- should_spawn_now: false

## Recommended next task
Spawn **F-1 (Add HUD, score tracking, game over, menus, and polish)** immediately. This is the final critical path task; completion makes the game feature-complete for MVP release.

## Notes for planner
- T-0006 progression system is solid. Level thresholds and XP rates should be tuned during F-1 playtesting.
- F-1 is blocking release; prioritize completion before considering polish items.
- F-2 (skill effects) should follow F-1 completion; adds gameplay depth without breaking core loop.
- F-3 (save/load) significantly improves long-term engagement; prioritize if targeting sustained play sessions.
- F-4 (audio) adds polish; defer to post-MVP if time is constrained.


## Related Documents
- [[ai/specs/T-0006_spec.md|T-0006 spec]]
- [[ai/reviews/T-0006_gemini_review.md|T-0006 review]]
- [[ai/briefs/T-0006_implementation.md|T-0006 document]]
- [[ai/pr/T-0006_pr_draft.md|T-0006 pr-draft]]
