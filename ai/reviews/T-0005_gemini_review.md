---
type: review
task_id: T-0005
created: 2026-04-10
tags: [ai-flow-lab, review]
---

# T-0005 Gemini Review

## Review target
Spec for implementing collectible coins, gems, and three power-up types (speed boost, shield, magnet) with pickup animations and per-level persistence.

## Contradictions
1. **Power-up expiry vs. death** - Spec says "expires on level restart" for shield but also "8 seconds" for speed boost/magnet. Unclear: does shield persist across deaths within a level, or does it also expire on death? Recommend: clarify that all power-ups (including shield) expire either on 8s timer OR on player death, whichever comes first.

2. **Magnet coin behavior during collection** - Spec says "coins within 5 tiles move toward player at 3 tiles/sec" and "stop when picked up or magnet expires". Does "move toward" mean coins reach the player in ~1.3 seconds (5 tiles ÷ 3 tiles/sec)? What if player moves faster than coins? Recommend: specify that coins move toward player's current position (not predicted), and automatically collected when within 1 tile of player.

3. **Collectible vs. Collision processing order** - Risk mitigation says "process collectibles before obstacles" but doesn't specify if both happen in same frame or if they're sequential. Recommend: clarify that collision check happens after collectible pickup (if coin collected and spike hit same frame, spike is checked second and kills player after XP awarded).

## Missing edge cases
1. **Multi-collectible pickup** - Can player pick up multiple coins in same frame? If yes, how many? Recommend: define collision radius (currently "distance < 16px") and allow all coins within radius to be collected in same frame.

2. **Magnet + moving coin** - If coin is already being carried by magnet and player moves away, does coin stop tracking or keep chasing? Recommend: specify that magnet coins always chase player position, ignoring level boundaries.

3. **Speed boost during jump** - Spec says "velocity.x multiplier = 1.5x; jump velocity unchanged". Does this mean jump height is unaffected? Or does jump_velocity.x also benefit? Recommend: clarify that only horizontal movement is boosted; vertical (jump) is unchanged.

4. **Shield + magnet overlap** - Can player have both shield and magnet active? Spec assumes yes (power-ups stack), but does shield protect from magnet side effects (none specified)? Recommend: confirm stacking is safe and no conflicts exist.

5. **Gem particles** - Spec mentions "emit 3-5 particle sparks" on gem pickup but T-0004 and T-0006 don't require particles. Is this a deferred feature to T-0007? Recommend: mark as "placeholder for particle system; implement in T-0007 if available".

## Scope risks
1. **Collectible limit scalability** - "Max 50 collectibles per level" is a design assumption, not a hard constraint. Recommend: verify that tilemap encoding supports 50+ unique collectible objects without performance degradation. Test with worst-case tilemap.

2. **Magnet algorithm complexity** - Pulling coins toward player at 3 tiles/sec requires per-coin position update every frame. With 50 coins, this is 50 * 60 = 3000 distance calculations per second. Recommend: optimize by culling coins off-screen or using spatial partitioning if performance degrades.

3. **XP dependency on T-0006** - Spec defines XP values (+10, +50) but T-0006 handles XP bar and leveling. Recommend: ensure T-0005 simply accumulates XP in gameState.totalXP (no XP bar logic), leaving all XP display to T-0006.

4. **Tilemap encoding collision** - Spec proposes new collectible tile IDs but doesn't verify against T-0004 obstacle IDs (spike=2, crumble=3, patrol-h=4, patrol-v=5). Recommend: reserve coin=6, gem=7, speed-boost=8, shield=9, magnet=10 to avoid conflicts.

## Missing tests
1. No test for collecting multiple coins in same frame (multi-collectible radius).
2. No test for magnet with moving coins vs. player movement (chase accuracy).
3. No test for power-up stacking behavior (picking up speed + shield simultaneously).
4. No test for collectible pickup before obstacle collision (processing order).
5. No test for gem sparkle animation (frame count validation).

## Hidden assumptions
1. **XP accumulation** - Assumes gameState.totalXP exists and coins/gems simply add to it. Not verified against T-0006 implementation.

2. **Frame-based power-up expiry** - Assumes gameState.frameCounter is incremented every game frame. Not verified; may differ from T-0004 animation frame counter.

3. **Magnet coins don't collide** - Assumes coins pulled by magnet can pass through obstacles/platforms. No mention of collision checks during magnet pull.

4. **Collectible tilemap entries** - Assumes tilemap can store collectible objects with positions. Current tilemap format (spike=2, etc.) may not support variable placement; recommend JSON/object-based tilemap.

5. **Pickup radius** - Spec uses "distance < 16px" for pickup, but collision system may use AABB or circle collision. Recommend: specify exact collision shape (circle with radius 8px, or AABB 16x16).

## Recommended corrections
1. **Clarify power-up expiry for all types** - Change "shield expires on level restart" to "all power-ups expire after 8 seconds OR on player death/level restart, whichever comes first". Apply consistently to shield, speed boost, magnet.

2. **Define magnet pull distance and speed precisely** - Change "5 tiles at 3 tiles/sec" to "80px pull distance, coins move at 3 tiles/sec (48px/sec) toward player's current position, auto-collected when within 1 tile (16px) of player".

3. **Add tilemap ID reservation** - Explicitly reserve: coin=6, gem=7, speed-boost=8, shield=9, magnet=10 (or document chosen values) to avoid conflicts with T-0004.

4. **Specify processing order in acceptance criteria** - Add AC: "Collectible pickup (XP added to gameState) happens before obstacle collision checks. If player picks up coin and hits spike same frame, coin value is credited before game-over is triggered."

5. **Document gem particles as deferred** - Change "emit 3-5 particle sparks" to "placeholder for particle effects; defer to T-0007 if particle system is implemented. For now, play scale+fade animation only."

6. **Verify XP system integration** - Add open question: "Confirm T-0006 will define gameState.totalXP and XP bar logic. T-0005 only accumulates (e.g., gameState.totalXP += 10 on coin)."



## Related Documents
- [[ai/specs/T-0005_spec.md|T-0005 spec]]
- [[ai/briefs/T-0005_implementation.md|T-0005 document]]
- [[ai/followups/T-0005_followups.md|T-0005 followup]]
- [[ai/pr/T-0005_pr_draft.md|T-0005 pr-draft]]
