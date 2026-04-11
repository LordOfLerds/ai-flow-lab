---
type: brief
task_id: T-0005
created: 2026-04-10
tags: [ai-flow-lab, brief]
---

# T-0005 Implementation Brief

## Goal
Implement collectible coins (+10 XP), gems (+50 XP), and three power-up types (speed boost, shield, magnet) with pickup animations and frame-based persistence. Track collected coins per level for XP system integration in T-0006.

## Scope
1. **Coins** - Rotating 16x16 sprite, +10 XP, pickup animation (scale 1.5x + fade 0.3s), respawn per level
2. **Gems** - Sparkling 16x16 sprite (4-frame), +50 XP, pickup animation, respawn per level
3. **Speed Boost** - Orange 16x32 sprite, 8s duration, velocity.x *= 1.5
4. **Shield** - Blue 16x32 sprite, absorbs one hit (spike, enemy, obstacle), expires on hit or 8s timeout
5. **Magnet** - Purple 16x32 sprite, 8s duration, pulls coins within 80px at 48px/sec
6. **Collision system** - Extend T-0003 AABB to detect player-collectible overlap; distance threshold 16px
7. **Persistence** - Track per-level coin count in gameState.levelCoins; power-ups active in gameState.activePowerUps[]
8. **Tilemap encoding** - Reserve IDs: coin=6, gem=7, speed-boost=8, shield=9, magnet=10

## Constraints
- Single-file HTML (index.html)
- Max 50 collectibles per level
- 60 FPS game loop; pickup and magnet updates every frame
- Animations frame-based (use gameState.frameCounter)
- All sprites 16x16 or 16x32
- No external libraries
- Power-ups use frame counters: expiresAt = gameState.frameCounter + 480 (8 seconds @ 60 FPS)
- Magnet coins move in straight line, no pathfinding; pass through obstacles

## File targets
- **index.html** - Add Coin, Gem, PowerUp entity types; pickup detection; magnet pull logic; power-up application (speed, shield, magnet); per-level coin tracking

## Tests required
1. Coin picked up on player overlap, +10 XP added to gameState.totalXP
2. Gem picked up on player overlap, +50 XP added
3. Coin plays scale+fade animation (0.3s), disappears
4. Gem plays scale+fade animation (0.3s), disappears
5. Speed boost active: player.velocity.x *= 1.5 for 8s, expires after timer
6. Shield active: absorbs next hit (spike, enemy), player safe, shield removed
7. Magnet active: coins within 80px move at 48px/sec toward player, collected when within 16px
8. Power-ups stack: multiple active simultaneously (e.g., speed + shield both active)
9. Power-ups expire on death/level restart
10. Collectibles respawn fresh per level restart (gameState.levelCoins reset)

## Chosen minimal policy
- **Collision detection order**: Collectible pickup (XP awarded) happens before obstacle collision check. If both occur same frame, coin value credited before game-over.
- **Power-up expiry**: All power-ups (shield, speed, magnet) expire after 8s OR on player death/level restart, whichever comes first. Use frame counter: expiresAt = gameState.frameCounter + 480.
- **Magnet pull**: Coins move toward player's current position at 48px/sec in straight line; pass through obstacles (no path collision). Auto-collected when within 1 tile (16px) of player center.
- **Multi-collectible pickup**: Allow all coins within 16px radius to be collected in same frame. Accumulate XP for each.
- **Speed boost application**: Only horizontal movement boosted (velocity.x *= 1.5); jump velocity unchanged. Boost applies to both input and inertia.
- **Shield mechanics**: One-hit shield; absorbs any obstacle/enemy collision. Shield removed immediately after hit; player continues unharmed. Restores on next power-up pickup.
- **Tilemap IDs**: coin=6, gem=7, speed-boost=8, shield=9, magnet=10. Verify no conflicts with T-0004 IDs (spike=2, crumble=3, patrol-h=4, patrol-v=5).
- **Gem particles**: Defer to T-0007. For now, play scale+fade animation only (no particle system yet).
- **XP accumulation**: T-0005 only updates gameState.totalXP; leaves XP bar, leveling, and skill tree to T-0006.

## Risks
1. **Magnet performance** - 50 coins * distance check * 60 FPS = 3000 ops/sec. Mitigation: optimize with spatial grid or cull off-screen coins.
2. **Power-up stacking edge case** - Two speed boosts picked up simultaneously. Mitigation: store in array and apply all multipliers (or use highest/lowest).
3. **Collectible respawn vs. persistence** - Coins collected should not respawn in same run, but should respawn on level restart. Mitigation: track collected coins in level-specific state, reset on level load.
4. **Tilemap ID collision** - New IDs (6-10) may conflict with existing encoding. Mitigation: verify against active tilemap schema before implementation.
5. **Magnet coins off-screen** - If magnet pulls coins off-screen, they should still collect if player follows. Mitigation: no bounds check; coins move until collected or magnet expires.

## Explicit non-goals
- No particle effects for coin sparkles (deferred to T-0007)
- No procedural collectible placement (all via tilemap)
- No difficulty scaling (same XP values across all levels)
- No collectible powerup combinations (e.g., combining two shields for double durability)
- No collectible trading or shop system
- No sound effects on collection (deferred to T-0007)
- No visual effects during magnet pull (coins just move silently)
- No pathfinding for magnet coins (straight line only)


## Related Documents
- [[ai/specs/T-0005_spec.md|T-0005 spec]]
- [[ai/reviews/T-0005_gemini_review.md|T-0005 review]]
- [[ai/followups/T-0005_followups.md|T-0005 followup]]
- [[ai/pr/T-0005_pr_draft.md|T-0005 pr-draft]]
