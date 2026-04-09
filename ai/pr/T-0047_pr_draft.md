# [T-0047] Expand to 100 levels with progressive difficulty and themed biomes

## Summary
Expand to 100 levels with progressive difficulty and themed biomes

**Task ID**: T-0047
**Parent Goal**: G-0005
**Parent Task**: none
**Lane**: feature-lane
**Executor**: codex

## What Changed
- **Replaced hardcoded LEVELS array with 100 generated levels** — Created dynamic level generation across 10 biomes (Meadow, Forest, Desert, Cave, Ice, Lava, Ocean, Jungle, Ruins, Space), each with 10 levels
- **Added getLevelWidth() function** — Progressive level width from 200 tiles (level 1) to 6…

## Spec Summary
Expand the game from 12 to 100 levels across 10 themed biomes. Make levels progressively harder and longer with a visible progress bar.


Replace the current 12-level LEVELS array with 100 levels across 10 biomes (10 levels each):

| Biome (10 levels each) | Levels | Theme Color | Special Feature |
…

## Review Highlights
The spec is solid and well-structured. The 10-biome structure with progressive difficulty makes sense.



1. **Biome unlock logic**: The spec says "complete 8/10 levels to unlock next biome" — this should be configurable. Consider 6/10 for a more forgiving curve, especially for casual players.

2. *…

## Implementation Brief
Replace the hardcoded 12-level LEVELS array with a loop generating 100 levels across 10 biomes. Each biome has 10 levels. Keep the existing LEVELS structure (id, theme, name, icon, baseScore, difficulty).


- Replace `CONFIG.LEVEL_WIDTH_TILES` with `getLevelWidth(levelNum)`: 200 tiles (level 1) → 60…

## Linked Decisions
(none)

## Validation
- [ ] Spec written and reviewed
- [ ] Implementation brief synthesized
- [ ] Executor report completed
- [ ] Follow-ups proposed

- [ ] Tests pass (if applicable)
- [ ] No regressions in existing functionality

## Risks
Issues

## Non-Goals
(see spec)

## Follow-Up Notes
- **lane_type:** feature-lane
- **executor:** codex
- **priority:** NORMAL
- **rationale:** 100 levels exist but all look visually the same. Each biome should have distinct background colors, tile colors, and ambient effects.
- **should_spawn_now:** false


- **lane_type:** feature-lane
- **executor…

---
**Branch**: `feature/T-0047` → `main`
**Generated**: 2026-04-09T00:03:28.295Z
**Generator**: generate-pr-draft.mjs
