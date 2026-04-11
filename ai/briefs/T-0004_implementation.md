---
type: brief
task_id: T-0004
created: 2026-04-10
tags: [ai-flow-lab, brief]
---

# T-0004 Implementation Brief

## Goal
Add static obstacles (spikes), destructible platforms (crumbling), moving platforms, and enemy NPCs (walkers, flyers) to create challenging platformer gameplay. Players can defeat enemies by jumping on them but take damage from side contact.

## Scope
1. **Spike tiles** - Instant kill on any contact; static; no animation
2. **Crumbling platforms** - Solid for 0.5s contact, then crack animation (0.3s), then non-solid for 2s, auto-respawn
3. **Moving platforms** - Horizontal (2 tiles/sec) and vertical (1 tile/sec) patrol; carry player as moving parent
4. **Walker enemies** - 2x2 tile, patrol left-right at 1.5 tiles/sec, 2-frame walk animation
5. **Flyer enemies** - 2x2 tile, patrol horizontally in mid-air at 2 tiles/sec, 2-frame walk animation
6. **Collision system** - Extend T-0003 AABB collision to identify direction (top, bottom, left, right) for different entity responses
7. **Tilemap encoding** - Support spike (2), crumble (3), patrol-h (4), patrol-v (5) tile IDs; patrol-h and patrol-v objects store bounds and speed metadata

## Constraints
- Single-file HTML (index.html)
- Max 8 concurrent dynamic entities (enemies + moving platforms, excluding static spikes/crumbles)
- 60 FPS game loop; collision runs every frame
- Animations frame-based, not time-based (use `gameState.frameCounter % spritesheetFrames`)
- Sprites are 16x16 or 32x32 (multiples of TILE_SIZE:16)
- No external libraries; canvas drawImage with sprite sheet
- Tilemap grid size: 50x25 tiles (800x400px ÷ 16px/tile)

## File targets
- **index.html** - Add entity types (Spike, Crumble, MovingPlatform, Enemy), collision detection handlers, animation frame counters, entity update/draw functions

## Tests required
1. Spike kills player on any direction contact
2. Crumbling platform: solid 0.5s, cracks 0.3s, broken 2s, respawns automatically
3. Moving platform horizontal: transports player with correct relative velocity
4. Moving platform vertical: transports player with correct relative velocity
5. Walker enemy: patrols left-right, dies on top collision, bounces player (velocity.y = -5.0)
6. Flyer enemy: patrols in mid-air, dies on top collision, bounces player
7. Enemy side collision: game over
8. Top vs. side collision disambiguation: velocity.y < 0 → top; else → side
9. Platform carry velocity: player input velocity.x is added to platform velocity.x
10. Multiple enemies on same platform: independent patrol, no mutual collisions

## Chosen minimal policy
- **Collision direction**: Use velocity.y sign: if < 0 (downward velocity), treat as top collision; else treat as side. No corner-case averaging.
- **Crumbling platform timer**: Track per-tile standTime in platform object; reset to 0 on new landing (not re-landing during break).
- **Enemy bounce**: Set velocity.y = -5.0 (concrete value) for upward bounce.
- **Patrol bounds**: Walkers reverse at platform edge (rightmost solid platform tile); flyers reverse at configurable waypoint bounds (or screen edge if none specified).
- **Respawn behavior**: Moving platforms and enemies respawn at spawn position if center moves off-screen (x < -32 or x > CANVAS_WIDTH + 32).
- **Sprite animation**: All enemies use shared 2-frame walk cycle; update frame on `gameState.frameCounter % 6 == 0` (10 FPS from 60 FPS game loop).
- **Performance**: Enemies and platforms use simple AABB collision; limit total dynamic entities to 8 per level (enforced at level design time).

## Risks
1. **Collision detection regression** - Adding 5+ entity types to collision system may slow frame rate. Mitigation: profile before/after; optimize AABB checks if FPS drops.
2. **Edge case: multiple collisions same frame** - Player could collide with spike and enemy simultaneously. Mitigation: process collisions in order (spike first, fatal). Once player is dead, skip remaining collision checks.
3. **Tilemap encoding collision** - If tilemap uses numeric IDs, must carefully avoid conflicts with existing IDs. Mitigation: ensure IDs (2, 3, 4, 5) don't collide with any prior encoding.
4. **Moving platform velocity bleed** - If platform moves fast (> 2 tiles/sec), player velocity.y might not update. Mitigation: apply platform velocity as offset, not replacement; test with max speed.
5. **Enemy respawn collision** - Enemy respawns at spawn position while player is still alive nearby. Mitigation: disable collision during first 0.5s of respawn (invulnerable phase) or respawn only when player is 4+ tiles away.

## Explicit non-goals
- No advanced AI (enemies follow fixed patrol only, no targeting or pathfinding)
- No particle effects for deaths/bounces (reserved for T-0007)
- No sound effects (reserved for T-0007)
- No difficulty levels or enemy variety scaling (fixed walker and flyer types)
- No boss encounters
- No dynamic platform creation/destruction (all platforms spawned at level start)
- No enemy knockback (enemy dies, no momentum transfer to player except upward bounce)
- No multi-hit enemies (all enemies die in one jump)


## Related Documents
- [[ai/specs/T-0004_spec.md|T-0004 spec]]
- [[ai/reviews/T-0004_gemini_review.md|T-0004 review]]
- [[ai/followups/T-0004_followups.md|T-0004 followup]]
- [[ai/pr/T-0004_pr_draft.md|T-0004 pr-draft]]
