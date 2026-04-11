---
type: review
task_id: T-0004
created: 2026-04-10
tags: [ai-flow-lab, review]
---

# T-0004 Gemini Review

## Review target
Spec for adding obstacles (spikes, crumbling platforms, moving platforms) and enemy NPCs (walkers, flyers) with collision detection and gameplay mechanics.

## Contradictions
1. **Crumbling platform timing** - "solid for 0.5s" but also "player falls through during break phase" - does the player fall immediately at 0.5s, or after 0.3s more of cracking animation? Recommend: specify total 0.8s before player can fall (0.5s solid + 0.3s crack animation), then becomes non-solid.

2. **Enemy bounce velocity** - Spec says "+0.3 boost to velocity.y" but doesn't clarify: is this additive (velocity.y -= 0.3) or replacement (velocity.y = -0.3)? With GRAVITY:0.6, additive vs. replacement matters for jump height. Recommend: specify "set velocity.y = -5.0" or similar concrete value.

3. **Collision direction ambiguity in acceptance criteria** - AC #6 says "Jumping on enemy kills it and prevents simultaneous player death" and AC #9 says "correctly identifies top vs. side collisions" but doesn't specify: if player lands on corner (partially top, partially side), which wins? Recommend: clarify corner case (use majority contact area or highest velocity component).

## Missing edge cases
1. **Enemy on moving platform** - Can enemies patrol on moving platforms? If so, do they move relative to the platform (patrol resets) or with it? Not specified.

2. **Crumbling platform edge case** - What if player jumps OFF a crumbling platform mid-break, then re-lands during broken phase? Does the timer reset? Recommend: track which player instance is standing on it, reset only on new contact.

3. **Multiple enemies stacked** - Can two walkers patrol the same platform? If yes, do they collide with each other or pass through? Spec assumes independent patrol.

4. **Enemy patrol at screen boundary** - "Reverse at platform edges" - but what if no platform exists to the right? Does enemy turn around at platform end, or does it check for void? Recommend: specify that enemies reverse at platform tile boundaries (not player-detectable boundaries).

5. **Platform carry velocity loss** - If player jumps while standing on a moving platform, does player velocity.x include platform velocity? Or must player jump+move separately? Recommend: clarify that platform velocity is additive to player input velocity.

## Scope risks
1. **Collision detection complexity** - Spec adds 5+ new entity types (spike, crumble, moving-h, moving-v, walker, flyer) to existing player-platform collision system. Recommend: ensure T-0003 collision AABB logic supports multiple dynamic entities without performance degradation.

2. **Tilemap encoding ambiguity** - Spec proposes encoding as "spike = 2, crumble = 3, patrol-h = 4" but doesn't specify: how are patrol bounds stored in tilemap? A length value? Waypoint coordinates? Recommend: provide concrete tilemap format example (JSON or array structure).

3. **Moving platform respawn off-screen** - "Respawn at start position if they fall off-screen" but doesn't define off-screen boundary. Is it visible canvas, or a buffer zone? Recommend: specify 2x CANVAS boundary (32 tiles beyond visible).

4. **Performance with 8 concurrent entities** - Spec mentions 8-entity limit but doesn't specify: does this include spikes (static)? Recommend: clarify that limit applies to dynamic entities (enemies + moving platforms only).

## Missing tests
1. No test specified for crumbling platform timer reset behavior (re-landing during break phase).
2. No test for "corner case" collision (simultaneous top+side).
3. No test for enemy patrol at platform boundary transitions.
4. No test for platform carry velocity with player input (jump + move simultaneously).
5. No test for multiple enemies on same platform and their collision behavior.

## Hidden assumptions
1. **Sprite sheet format** - Assumes sprite sheet layout for enemies (2x2 tiles = 32x32px, 2-frame walk cycle). Format (horizontal strips? vertical? mixed?) not specified.

2. **Game state persistence** - Assumes gameState.enemies[] and gameState.platforms[] exist and are already initialized. Not verified against T-0002/T-0003 output.

3. **Death/respawn timing** - Assumes player respawns instantly at level start. No delay or animation specified. May conflict with expected game feel (see T-0007 polish).

4. **Collision detection order** - Assumes player-spike collision is checked before player-enemy collision, so spike kills are instant. Order not explicitly stated.

5. **Frame rate assumption** - Spec references "10 FPS" enemy animation and "frame % spritesheet size" but game is 60 FPS. Assumes frame counter exists (e.g., `gameState.frameCounter`). Not verified.

## Recommended corrections
1. **Clarify crumbling platform timeline** - Change "0.5s solid, 0.3s crack, 2s broken" to "solid for 0.5s of standing, cracks for 0.3s, non-solid for 2s, then instant respawn at original position". Use millisecond timers in gameState to track.

2. **Specify enemy bounce velocity** - Change "+0.3 boost" to "set velocity.y = -5.0 pixels/frame (approximately 0.83 tiles/sec upward)" for consistency with GRAVITY:0.6.

3. **Define corner case collision** - Add AC: "If player AABB overlaps both top and side of enemy, and velocity.y < 0, treat as top collision (kill enemy); otherwise treat as side (game over)."

4. **Add tilemap format example** - Provide JSON or pseudo-code showing:
   ```
   {
     "id": 4,
     "type": "patrol-h",
     "x": 5, "y": 10,
     "leftBound": 3, "rightBound": 12,
     "speed": 1.5
   }
   ```

5. **Clarify moving platform off-screen boundary** - Specify: "Platform respawns if center.x < -32 or center.x > CANVAS_WIDTH + 32".

6. **Verify gameState dependencies** - Confirm that gameState.enemies[], gameState.platforms[] are initialized in T-0002/T-0003, or add to this task's init logic.

7. **Remove or clarify "8 concurrent entities" limit** - Specify: "Max 8 dynamic entities (enemies + moving platforms) per screen, excluding static spikes and crumbling platforms".



## Related Documents
- [[ai/specs/T-0004_spec.md|T-0004 spec]]
- [[ai/briefs/T-0004_implementation.md|T-0004 document]]
- [[ai/followups/T-0004_followups.md|T-0004 followup]]
- [[ai/pr/T-0004_pr_draft.md|T-0004 pr-draft]]
