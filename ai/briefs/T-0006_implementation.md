# T-0006 Implementation Brief

## Goal
Implement XP/leveling (cumulative thresholds: 100, 250, 500, 1000, 2000), skill tree (double jump, dash, shield start), 5 unlockable skins with stat bonuses, character select menu, and localStorage persistence.

## Scope
1. **XP bar and leveling** - Display current/next threshold; level-up at cumulative thresholds; grant 1 skill point per level-up; cap at level 6
2. **Skills** - Double Jump (level 2, jump twice mid-air), Dash (level 3, shift key, 3x speed 0.5s, once per ground), Shield Start (level 5, spawn with shield)
3. **Skins** - Default, Ninja (+10% speed), Robot (+15% jump height), Wizard (cosmetic), Golden (+5% XP gain); unlock at levels 1/2/3/4/5
4. **Character select** - Show level, XP, unlocked skills/skins; allow skin selection; skill management (enable/disable); reset progress button
5. **Persistence** - localStorage keys: platformer_totalXP, platformer_playerLevel, platformer_activeSkills, platformer_unlockedSkins, platformer_activeSkin
6. **Menu state machine** - START_MENU → CHARACTER_SELECT → GAME_RUNNING → LEVEL_COMPLETE → CHARACTER_SELECT

## Constraints
- Single-file HTML (index.html)
- XP thresholds table-driven (easy to adjust)
- Skills apply to gameState properties (velocity multipliers, shield flag)
- Skins visual-only; no gameplay balance differences except listed bonuses
- localStorage prefix: "platformer_"
- Character select rendered on canvas (menu overlay, not DOM)
- Menu state machine with explicit transitions
- localStorage fallback: in-memory gameState if unavailable; warn on save failure

## File targets
- **index.html** - Add XP bar rendering; level-up logic; skill tree UI; character select screen; skin sprite/tinting; localStorage save/load; menu state machine

## Tests required
1. XP bar fills correctly at each level threshold (0, 100, 250, 500, 1000, 2000)
2. Level-up grants 1 skill point; new skills unlocked at correct levels (2, 3, 5)
3. Double Jump active: player jumps twice mid-air; second jump has same velocity as first
4. Double Jump disabled: player can only jump once mid-air
5. Dash active: shift key triggers 3x speed dash for 0.5s; resets on ground contact
6. Dash disabled: shift key has no effect
7. Shield Start active: player spawns with shield at level start
8. All 5 skins unlock at correct levels (1/2/3/4/5)
9. Skin bonuses apply: ninja +10% speed, robot +15% jump, golden +5% XP gain
10. Character select shows level, XP, unlocked skills/skins; allows selection
11. Progress saved to localStorage; loaded on game start
12. localStorage unavailable: degrade to in-memory, show warning on complete
13. XP excess carries over: if need 30 more XP to level and gain 100, remaining 70 applies to next threshold
14. Dash collision: dash velocity subject to wall collision; stops on impact

## Chosen minimal policy
- **Max level**: 6 (2000 cumulative XP); further XP tracked in totalXP but no new levels unlock
- **XP excess carry-over**: Always apply excess XP to next level threshold (not discarded)
- **Skill unlock timing**: Skills become active immediately on unlock (mid-level if needed); no level restart required
- **Skin unlock timing**: Visual changes immediately; officially marked unlocked for next level start
- **Dash invulnerability**: No; dash velocity subject to collision detection (walls stop dash)
- **Shield stacking**: Shield Start skill and Shield power-up do not stack. Picking up Shield power-up overwrites skill shield; both expire independently on hit or timeout.
- **Double Jump air phase**: Track jumpCount in gameState. Reset to 0 on ground contact; increment on jump; allow jump if jumpCount < 2.
- **Skill point UI**: Display unlocked/locked skills with descriptions in skill tree menu
- **Menu state transitions**: START_MENU → CHARACTER_SELECT (on first run or reset) → GAME_RUNNING (on start level) → LEVEL_COMPLETE (on goal) → CHARACTER_SELECT (between levels)
- **localStorage fallback**: Wrap in try/catch; on failure, log warning and use in-memory state; display save error on level complete
- **Wizard bonus**: Cosmetic only in T-0006; +20% skill point generation deferred to future system. Standard 1 skill point per level.

## Risks
1. **Skill balance and level design** - Double Jump + Dash enable sequence breaking. Mitigation: review all T-0004/T-0005 levels; redesign if shortcuts exist; document skill-aware level design guidelines.
2. **Sprite asset creation** - 5 distinct skins require visual assets. Mitigation: start with color tinting (hue shift) for quick implementation; plan separate sprite sheets for future.
3. **localStorage limits** - ~5MB quota per domain; 10+ years progression = small data. Mitigation: only store XP/level/skins (minimal); estimate ~1KB per save.
4. **Double Jump collision edge case** - If player clips into platform, double jump allows escape. Mitigation: double jump only works if velocity.y != 0 (airborne, not grounded).
5. **Menu state complexity** - State machine with 5+ states may be complex. Mitigation: define explicit transitions; implement state enum for clarity.

## Explicit non-goals
- No chat/messaging in menus
- No avatar customization beyond skins (no color picker)
- No skill tree upgrades (1 point = 1 skill unlock, not stacking)
- No prestige system or New Game+ (level cap at 6)
- No quest log or achievements (reserved for T-0007 polish)
- No sound for menu interactions (reserved for T-0007 audio)
- No analytics or telemetry for progression tracking
- No cross-platform progression (single device localStorage only)
