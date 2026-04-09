# Review: T-0047 — Expand to 100 levels

## Overall Assessment: APPROVE with minor suggestions

The spec is solid and well-structured. The 10-biome structure with progressive difficulty makes sense.

## Suggestions

1. **Biome unlock logic**: The spec says "complete 8/10 levels to unlock next biome" — this should be configurable. Consider 6/10 for a more forgiving curve, especially for casual players.

2. **Performance**: 100 level cards in the select screen could cause lag on mobile. Consider lazy rendering or virtual scrolling. For now, the biome-tab approach should mitigate this.

3. **Level width formula**: `200 + Math.floor((levelNum - 1) * 4.04)` gives level 100 = 600 tiles. This is a good range. Consider also varying height for some biomes (Cave levels could be taller, Space levels could have more vertical space).

4. **Missing from spec**: How does the existing `initializeLevelProgress()` handle the expansion from 12 to 100 levels? The function iterates `LEVELS` so it should auto-expand, but existing saves might have stale data. Add a migration step.

5. **Progress bar position**: The spec puts it at y=0 which overlaps with HUD. Move it to y=2 or below the HUD bar.

## Blocking Issues: None
The spec is implementable as-is. The above are nice-to-haves.
