# T-0006 Spec

## Task metadata
- Task ID: T-0006
- Title: Build XP, leveling, skills, and skins system
- Lane: feature-lane
- Executor: codex (ChatGPT)
- Depends on: T-0005 (collectibles with XP), T-0002 (player movement for skill implementation)

## Problem statement
The game currently has no progression system. To provide long-term engagement, we need:
1. XP bar and leveling system (cumulative XP with increasing thresholds)
2. Skill tree unlocked by leveling (Double Jump, Dash, Shield Start)
3. Unlockable player skins tied to level milestones
4. Character select screen to choose active skin
5. Persistent progression using localStorage (cross-session)

## Source of truth
- CONFIG: CANVAS_WIDTH:800, CANVAS_HEIGHT:400, TILE_SIZE:16, GRAVITY:0.6
- Single-file implementation: index.html
- XP accumulation from T-0005 (coins +10, gems +50)
- Player movement from T-0002 (add jump, dash momentum)
- Existing gameState structure

## Desired behavior

### XP and Leveling
- XP bar displays current XP and threshold for next level
- Level thresholds (cumulative XP):
  - Level 1: 0 XP (start)
  - Level 2: 100 XP
  - Level 3: 250 XP (not 100+150; cumulative total)
  - Level 4: 500 XP
  - Level 5: 1000 XP
  - Level 6+: 2000 XP (max level, or continue scaling)
- Skill points awarded on each level-up (1 point per level)
- XP persists across sessions via localStorage

### Skills System
- **Double Jump** - Unlocks at Level 2; player can jump twice in air (up to 2 jumps before landing); jump velocity unchanged; visual: slight glow on second jump
- **Dash** - Unlocks at Level 3; shift key initiates 0.5s dash at 3x normal horizontal speed; can dash once per ground contact (not mid-air); visual: motion blur trail
- **Shield Start** - Unlocks at Level 5; player starts each level with a shield (same as magnet power-up shield)
- Skills are toggleable (player can disable skills via settings menu or skill tree)
- Active skills persisted in gameState.activeSkills = []; apply bonuses each frame

### Skins System
- 5 player skins with distinct visual appearance:
  - **Default** - Base character sprite (already implemented)
  - **Ninja** - Black/dark color, smaller sprite, 10% speed bonus
  - **Robot** - Metallic gray, bold geometric shapes, 15% jump height bonus
  - **Wizard** - Blue/purple robe, pointed hat, 20% skill point generation (unused in T-0006)
  - **Golden** - Bright yellow/gold, shiny texture, +5% XP gain from collectibles
- Skins unlocked at levels 1/2/3/4/5 (first skin free, others locked until level reached)
- Skin selection stored in localStorage; persist across sessions
- Visual: apply different sprite sheet or color tint to player character each frame

### Character Select Screen
- Pre-game menu shown before level start
- Display current level, total XP, unlocked skills, unlocked skins
- Allow player to select active skin from unlocked options
- Button to start level with selected skin
- Button to view/manage skills (enable/disable active skills)
- Button to reset progress (delete localStorage data, warning prompt)

### Persistence
- localStorage keys:
  - `gameState.totalXP` - Cumulative XP across all levels
  - `gameState.playerLevel` - Current player level
  - `gameState.activeSkills` - Array of active skill names (["double-jump", "dash"])
  - `gameState.unlockedSkins` - Array of unlocked skin names
  - `gameState.activeSkin` - Current selected skin name
- On game start, load from localStorage; if missing, use defaults (level 1, 0 XP, no skills, default skin)
- On level-up or skin unlock, save to localStorage immediately

## Constraints
- Single-file HTML implementation (no bundler)
- XP thresholds must be table-driven (easy to adjust for balancing)
- Skill bonuses apply to gameState properties (velocity multipliers, shield flag)
- Skins are visual-only; no gameplay balance differences (except listed bonuses)
- localStorage key prefix: "platformer_" to avoid conflicts (e.g., "platformer_totalXP")
- Character select screen uses same canvas as game (no separate DOM); render as overlay/menu state
- Skill tree UI shows locked/unlocked status and skill descriptions

## Acceptance criteria
1. XP bar displays current/next threshold; fills based on progress
2. Level-up at correct cumulative XP thresholds (100, 250, 500, 1000, 2000)
3. Each level-up grants 1 skill point; skill tree shows available skills to unlock
4. Double Jump active: player can jump twice mid-air; second jump has same velocity as first
5. Dash active: shift key triggers 0.5s dash at 3x speed; only once per ground contact; applies motion blur
6. Shield Start active: player spawns with shield at level start
7. All 5 skins visually distinct; unlocked at levels 1/2/3/4/5
8. Skins have correct bonuses: ninja +10% speed, robot +15% jump, wizard +20% skill points, golden +5% XP
9. Character select shows level, XP, unlocked skills, unlocked skins; allows selection and management
10. Progress persists: load from localStorage on game start; save on level-up, skin unlock, skill toggle

## Risks
1. **XP balance** - Thresholds may be too steep or too shallow; difficulty curve affects progression speed. Mitigation: design with golden skin +5% XP bonus to allow experimentation; adjust thresholds if needed.
2. **Double Jump edge case** - If player jumps at velocity.y boundary (near zero), second jump may not behave correctly. Mitigation: track jump count in gameState; decrement on jump, reset on ground contact.
3. **Dash mid-platform** - Dash may carry player through walls or off cliffs. Mitigation: Dash applies velocity.x only; collision detection (from T-0003) handles wall/cliff interaction.
4. **Skill interaction conflicts** - Double Jump + Dash could allow sequence breaking (reaching unintended areas). Mitigation: design levels assuming both skills active; test for softlock zones.
5. **localStorage quota exceeded** - If player plays many levels, localStorage may overflow (max ~5MB). Mitigation: only store XP/level/skins (small data); document limit of 10+ years progression.
6. **Skin sprite asset conflicts** - Different skins require different sprite sheets or color tints. Mitigation: use canvas tinting (e.g., hue shift) or sprite-swapping at draw time.

## Open questions
1. Should XP level cap at 6, or continue scaling (2000, 4000, 8000...)? (Assumption: cap at Level 6, no further progression)
2. Can skills be disabled after unlock, or are they permanent once obtained? (Assumption: toggleable; player can enable/disable in skill tree menu)
3. Do skill bonuses stack (e.g., double jump + dash = 4 jumps)? (Assumption: no stacking; bonuses are independent and apply per-skill)
4. Should character select screen be reachable mid-game (pause menu), or only at start? (Assumption: only at start; pausing deferred to T-0007)
5. What happens if player unlocks a skin mid-level? (Assumption: skin change only applies on next level start, not mid-level)
