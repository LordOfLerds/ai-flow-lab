# T-0048 Implementation Brief

## Goal
Expand the skill system from 3 skills to 8 skills with meaningful gameplay mechanics and a progression tree tied to player level.

## Scope
1. Replace SKILLS array with 8 skills: Double Jump (Lv2), Dash (Lv3), Shield (Lv5), Magnet (Lv7), Wall Jump (Lv10), Glide (Lv15), Ground Pound (Lv20), Time Slow (Lv30).
2. Implement gameplay logic for 5 new skills (Magnet, Wall Jump, Glide, Ground Pound, Time Slow) — existing 3 (Double Jump, Dash, Shield) remain unchanged.
3. Update `checkSkillUnlocks()` to iterate all 8 skills.
4. Update `showSkillsMenu()` to display 8 skills in a 2x4 grid with unlock status.

## Constraints
- All changes in `index.html` only (single-file game).
- Do NOT modify existing Double Jump, Dash, or Shield logic.
- Wall Jump requires player to be falling AND pressing into a wall (no infinite climb — require `player.wallSlideTimer` cooldown of 10 frames between wall jumps on the same wall).
- Time Slow: pressing T during active slow-mo is ignored. Cooldown = 300 frames (10s at 30fps). Add `gs.timeScale` multiplied into enemy/obstacle updates but NOT player input.
- Stomp: only activates if player is at least 2 tiles (64px) above nearest ground.
- Magnet: only targets uncollected collectibles. Fixed 80px radius, 3px/frame pull speed.
- Glide: caps fall speed at 1.5. Resets on landing (same as double jump).

## File targets
- `index.html` — SKILLS array, `updatePlayer()`, `checkSkillUnlocks()`, `showSkillsMenu()`, collision handling, game loop update

## Tests required
- Verify all 8 skills appear in skills menu
- Verify skills unlock at correct player levels
- Verify wall jump doesn't allow infinite climb (cooldown between same-wall jumps)
- Verify time slow affects enemies but not player movement speed
- Verify stomp only triggers when airborne above threshold
- Verify magnet pulls coins but not already-collected items

## Chosen minimal policy
- Add `gs.timeScale = 1.0` initialization, multiply it into enemy/obstacle speed updates.
- Wall jump: add `player.wallJumpCooldown` counter, decrement per frame, only allow wall jump when 0.
- Stomp: check `player.y + player.h < nearestGroundY - 64` before activating.
- Magnet: in collectible update loop, check distance to player; if < 80 and magnet unlocked, lerp position toward player.
- Glide: in `updatePlayer()` gravity section, if jump held and vy > 1.5 and glide unlocked, clamp vy to 1.5.
- Keep skill menu as simple grid render with green/gray borders.

## Risks
- Time Slow `gs.timeScale` integration could break frame-dependent animations if any use raw frame counts instead of scaled values.
- Wall collision detection may need horizontal checks that don't exist yet — executor must verify current collision system supports left/right wall detection.
- 8-skill grid may need scroll if screen is small (mobile). Accept this as non-goal for now.

## Explicit non-goals
- Skill upgrade trees or skill levels (just unlock/locked).
- Skill combinations or synergy bonuses.
- Mobile-responsive skill menu layout.
- Animated skill unlock effects.
- Balancing skill power levels.
