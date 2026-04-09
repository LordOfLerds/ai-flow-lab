# T-0029 Gemini Review

## Review target
- **File:** `ai/specs/T-0029_spec.md`
- **Context:** Implementing AI movement (Walkers/Flyers) and Collision (Stomp/Hit) logic for a single-file JavaScript game.

## Contradictions
1.  **Update Order vs. Collision Timing:** The spec suggests calling `updateEnemies()` before `updatePlayer()`. However, for a "Stomp" check to feel responsive (detecting `p.vy > 0`), collision detection usually needs to happen *after* both entities have moved for the current frame, or specifically after the player's vertical movement is applied.
2.  **Flyer Movement Logic:** Section 3 says flyers should "Reverse horizontal... (same as walker)", but Walkers have three reversal conditions (bounds, walls, and ledges). It is unclear if Flyers should also perform wall/ledge detection or strictly patrol bounds.
3.  **Dead Enemy Removal:** Section 5 suggests skipping rendering `alive === false` *OR* removing them after a delay. If they are removed from `gs.entities` while iterating for collisions or rendering without careful index management, it may cause runtime errors or skipped entities.

## Missing edge cases
1.  **Flyer Ceiling Collision:** The vertical "bobbing" (sin wave) does not account for tiles. A flyer near a ceiling might bob into a solid tile.
2.  **Tunneling:** At high `vy` (falling fast), the player might skip the 8px "stomp" threshold and move directly into the "hit" zone or through the enemy entirely in a single frame.
3.  **Entity-Entity Overlap:** If two enemies overlap and the player jumps on them, the `break` in the collision loop ensures only one dies. While acceptable, if one is a Flyer and one a Walker, the player might stomp one and still take damage from the other in the same frame if the "hit" check isn't prioritized or handled.
4.  **Invincibility Decrement:** The spec mentions setting `p.invincible = 60`, but does not explicitly define where this value is decremented (assumed to be in `updatePlayer`, but not stated as a dependency).

## Scope risks
1.  **`getTileAt` Sensitivity:** The specific offsets used (`+16`, `-1`, `+8`, `+17`) assume the entity is exactly 16x16 and perfectly aligned with its `x, y` coordinate being the top-left. If the collision box or sprite center differs, walkers might "float" or "stutter" at edges.
2.  **Death Animation State:** The recommendation suggests a 10-frame flash. This requires adding a new property (e.g., `enemy.deathTimer`) to the entity model, which increases the complexity of the "Source of Truth" entity definition.

## Missing tests
1.  **Ledge Reversal:** Test if walkers correctly reverse at the very edge of a platform without falling off or jittering.
2.  **Wall Reversal:** Test if walkers reverse when hitting a wall before their patrol boundary is reached.
3.  **Shield Depletion:** Verify that `shieldHP` decrementing to 0 correctly triggers death on the *next* contact, not the same one (unless `p.invincible` is applied immediately).
4.  **Bounce Consistency:** Ensure the stomp bounce (`JUMP_VELOCITY * 0.6`) is sufficient to clear the enemy's hitbox to avoid immediate re-collision.

## Hidden assumptions
1.  **`getTileAt` return value:** Assumes the function returns a truthy value for any solid tile and falsy for air/non-collidables.
2.  **Hitbox size:** Assumes all enemies (walkers and flyers) share the same 16x16 hitbox despite different visual behaviors (bobbing/wings).
3.  **Coordinate System:** Assumes `y` increases downwards (standard for canvas), meaning `y + 17` is below the feet.

## Recommended corrections
1.  **Clarify Flyer Reversal:** Explicitly state that Flyers only reverse on `patrolRange` and ignore wall/ledge checks to simplify their "airborne" behavior.
2.  **Refine Collision Loop:** If the "death animation" (10-frame flash) is implemented, the collision check must skip enemies that are already in the "dying" state, not just `!alive`.
3.  **Execution Order:** Update the `gameLoop` logic to:
    ```javascript
    updateEnemies();
    updatePlayer();
    checkEnemyCollision(); // Perform collision after all movement
    ```
4.  **Define Ledge Check Offsets:** Use `enemy.vx > 0 ? 16 : -1` for the ledge check X-offset to ensure it looks exactly one pixel beyond the current horizontal footprint.