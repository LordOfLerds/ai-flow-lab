# T-0042 Gemini Review: Level Select Screen and Multi-Level System

## Review target
Spec for implementing a scrollable level select screen with multi-level progression system, star rating display, unlock logic, and theme transitions. Replaces single-level prototype.

## Contradictions
- Unlock logic specifies "previous level must be completed (3 stars)" but Player.cs only tracks boolean completion, not star count. Clarify: is 1 star completion enough to unlock next level, or must it be 3?
- Theme transition spec says "fade over 0.5s" but doesn't specify what happens to in-flight particles or active effects during fade. Need guidance on cleanup behavior.
- Stars are described as "cosmetic" initially, but unlock system depends on star threshold. Inconsistent narrative—clarify if stars are cosmetic or gating-mechanic.

## Missing edge cases
- What if player completes Level 5 but has only 2 stars? Can they proceed to Level 6, or are 3 stars required for any progression?
- Level count: spec assumes linear progression, but doesn't define maximum level count or what happens when player reaches the end. Need end-game handling.
- Star reckalk: if player retries a level and scores fewer stars (e.g., 3→1), does the unlock system re-evaluate? Must update unlock state on each completion.
- Network/save corruption: if level completion data is corrupted mid-save, does level select crash or gracefully degrade?

## Scope risks
- Scrolling performance: spec does not mention pooling, paging, or lazy-loading for large level counts (50+ levels). Recommend object pool strategy to prevent GC spikes.
- Aesthetic scope creep: "theme transitions" is underspecified. Risk that UI finishes before animation system catches up. Need clear ownership (who destroys old theme objects?).
- Stat persistence: spec relies on Player.cs completion flags but doesn't confirm save/load hooks are in place before this task begins. Verify Player.cs ↔ PersistenceManager contract.

## Missing tests
- Unit test for unlock state transition: complete L1→L2 should unlock; complete L2 with 1 star→L3 still locked.
- UI state test: clicking locked level should show "requires 3 stars" message, not crash or silent-fail.
- Theme fade integration test: old theme particles cleaned up before new theme spawns.
- Boundary test: completing final level should not crash or attempt to unlock non-existent level.

## Hidden assumptions
- Assumes unlock logic is strictly linear (Level N requires Level N-1 completion). No branching paths or conditional locks mentioned. Confirm this is the intent.
- Assumes all levels have same unlock requirement (3 stars). If future content needs variable thresholds, architecture must support it.
- Assumes theme directory structure (Assets/Themes/{ThemeName}/) without documenting it. Need asset naming convention doc.

## Recommended corrections
1. Clarify star-based unlock rule: define minimum star count required per level, and whether it's always 3 or configurable per level.
2. Add end-game handler: define behavior when player completes final level (e.g., show completion screen, loop back, or enable infinite mode).
3. Specify theme cleanup contract: who owns destroying old theme GameObjects? Level Select or Theme Manager?
4. Add performance guardrails: if 50+ levels, mandate object pooling for level buttons. Document max levels before re-architecture needed.
5. Confirm Player.cs save/load integration is complete before starting implementation.

## Overall assessment
**Good spec with moderate gaps.** Unlock logic and theme transitions need clarification before implementation. Recommend proceeding after addressing star threshold rule, end-game scenario, and theme cleanup ownership.
