---
type: review
task_id: T-0028
created: 2026-04-10
tags: [ai-flow-lab, review]
---

# T-0028 Gemini Review

## Review target
- **File:** `ai/specs/T-0028_spec.md`
- **Focus:** Implementation of player physics, movement (including ice and platforms), and collision detection in a single-file platformer.

## Contradictions
- **Movement Logic vs. Ice Logic:** Section 2 states "If neither [key]: `gs.player.vx = 0`". However, the Ice tiles section says "instead of instant stop, apply friction". This implies a logic branch where the instant-stop behavior must be skipped if the player is on ice. The spec should explicitly state that the "instant stop" only applies when `!onIce`.
- **Solid Tiles vs. Platforms:** `isSolid` (Section 4) includes `PLATFORM`. However, Section 13 states platforms should only block from above. If `isSolid` returns true for `PLATFORM` and is used in the **X-axis collision resolution**, the player will hit the sides of platforms as if they were walls, which contradicts the "jump up through them" and "one-way" requirement.
- **Double Jump:** Section 5 says `player.jumpsLeft--`, but Section 13 says "No double jump... handle only single jump for now." If only single jump is implemented, `jumpsLeft` logic is redundant or should be capped at 1.

## Missing edge cases
- **Falling into Pits:** The spec defines `SPIKE` damage and `EXIT` tiles, but doesn't define what happens if the player's `y` coordinate exceeds the map height (falling out of bounds).
- **Left/Right Map Bounds:** What happens if the player moves to `x < 0` or `x > mapWidth`?
- **Multiple Pickups:** If a player's bounding box overlaps two different collectible tiles (e.g., a COIN and a GEM) in the same frame, the logic should ensure both are processed.
- **Head-bonk on Breakables:** The recommendation suggests breaking tiles on head-bonk, but the Y-collision resolution (Section 4) doesn't explicitly describe the `gs.level.tiles[row][col] = TILE.EMPTY` logic for `BREAKABLE` tiles when `vy < 0`.

## Scope risks
- **`render()` modification:** The task is primarily physics/movement, but Section 10/13 requires adding a `DEAD` phase handler and "Retry" button UI to the `render()` function. This introduces UI/Overlay logic into a physics task, which might lead to messy code if the executor isn't careful.
- **Platform "Previous Y" Logic:** Section 13 mentions checking if the player was "above the platform top before the move." This requires storing an `oldY` or `prevY` variable, which is not listed in the `gs.player` object properties in the "Key existing code references" section.

## Missing tests
- **One-way Platform entry:** Verify player can jump through the bottom and sides of a platform without collision.
- **Corner cases for Collision:** Test if the player gets "stuck" when moving perfectly against a corner where two solid tiles meet.
- **Coyote/Buffer timing:** Verify jumps trigger exactly at `CONFIG.COYOTE_FRAMES` and fail at `+1`.
- **Skin/Powerup Multipliers:** Test that speed/jump bonuses stack correctly (multiplicative vs. additive).

## Hidden assumptions
- **`scoreTracker` existence:** The spec assumes a global `scoreTracker` object with an `award` method exists, but it isn't listed in the "Key existing code references."
- **`gs.progressBase` existence:** Assumes this variable tracks the horizontal distance of the level.
- **Tile map size:** Assumes `gs.level.tiles` is perfectly rectangular and row/col lookups won't throw errors if the player is slightly out of bounds (handled by optional chaining in the spec, but logic for `gs.level.tiles.length` is missing).

## Recommended corrections
- **Refine `isSolid`:** Define a helper `isPassableFromBelow(tileType)` specifically for platforms, or exclude `PLATFORM` from the X-axis `isSolid` check.
- **Clarify Ice Logic:** Structure the horizontal movement as: `if (onIce) { friction/accel } else { instant speed/stop }`.
- **Add Out-of-Bounds Check:** Explicitly trigger `killPlayer()` if `gs.player.y > (gs.level.tiles.length * CONFIG.TILE_SIZE)`.
- **Define `oldY`:** Instruct the executor to store `gs.player.y` into a local `oldY` variable at the start of `updatePlayer()` to facilitate platform collision checks.
- **Breakable Logic:** Add a specific clause in the Y-axis resolution: `if (tile === TILE.BREAKABLE && vy < 0) { tiles[row][col] = TILE.EMPTY; vy = 0; }`.

## Related Documents
- [[ai/specs/T-0028_spec.md|T-0028 spec]]
- [[ai/briefs/T-0028_implementation.md|T-0028 document]]
- [[ai/results/T-0028_executor_report.md|T-0028 result]]
- [[ai/followups/T-0028_followups.md|T-0028 followup]]
- [[ai/pr/T-0028_pr_draft.md|T-0028 pr-draft]]
