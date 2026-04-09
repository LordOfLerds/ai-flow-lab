# INVARIANTS

> **Note**: This documentation is inferred from code implementation in `index.html` as of T-0045. Updated to reflect authentication, multi-level progression, shop, battle pass, and themed environment systems added in G-0003.

## Game Phase Invariants

- **Phase Exclusivity**: Game state `phase` must be exactly one of: `'MENU'`, `'LEVEL_SELECT'`, `'SHOP'`, `'BATTLE_PASS'`, `'SKIN_SELECT'`, `'SKILL_SELECT'`, `'PLAYING'`, `'GAME_OVER'`
- **Phase Transitions**: Valid transitions are:
  - `MENU → LEVEL_SELECT` (open level selection)
  - `MENU → SHOP` (open shop interface) 
  - `MENU → BATTLE_PASS` (open battle pass)
  - `MENU → SKIN_SELECT` (open skin customization)
  - `MENU → SKILL_SELECT` (open skill management)
  - `LEVEL_SELECT → PLAYING` (start selected level)
  - `LEVEL_SELECT → MENU` (return to main menu)
  - `SHOP → MENU` (return from shop)
  - `BATTLE_PASS → MENU` (return from battle pass)
  - `SKIN_SELECT → MENU` (return from skin selection)
  - `SKILL_SELECT → MENU` (return from skill selection)
  - `PLAYING → GAME_OVER` (player death or level completion)
  - `GAME_OVER → PLAYING` (restart same level)
  - `GAME_OVER → LEVEL_SELECT` (return to level selection)
  - `GAME_OVER → MENU` (return to main menu)
- **Phase Context**: Only `PLAYING` phase runs physics simulation; all other phases are UI-only states

## Player Invariants

- **Position Bounds**: Player `x` must be `≥ 0` and `≤ (level.width * TILE_SIZE - player.w)`
- **Death Condition**: Player dies if `y > level.height * TILE_SIZE + 50` (fall out of level)
- **Jump Limits**: `jumpsLeft ≤ maxJumps` at all times
- **Jump Refresh**: When `onGround = true`, `jumpsLeft` resets to `maxJumps`
- **Coyote Time**: `coyoteTimer` resets to `COYOTE_FRAMES` when landing, decreases when airborne
- **Dash Cooldown**: `canDash` resets to `true` only when landing (`onGround = true`)
- **Invincibility**: `invincible` timer decreases each frame, prevents damage when `> 0`
- **Shield Integrity**: `shieldHP ≤ shieldMax` always

## Level Generation Invariants

- **Ground Presence**: Bottom row (`groundY + 1`) is always filled with `STONE` tiles
- **Exit Placement**: Exactly one `EXIT` tile placed at level end coordinates
- **Gap Safety**: Gaps in ground trigger platform generation with 70% probability
- **Patrol Boundaries**: Enemy `patrolRange` prevents walking off platforms or into walls
- **Spike Placement**: Spikes only placed above solid ground tiles
- **Breakable Behavior**: Breakable tiles only break when player falls onto them from above

## Collision Detection Invariants

- **Tile Solidity**: Tiles `GRASS`, `STONE`, `ICE`, `BREAKABLE`, `PLATFORM` are solid for collision
- **Platform One-Way**: `PLATFORM` tiles are solid only from above (player can pass through from below/sides)
- **Spike Damage**: `SPIKE` tiles damage player on any overlap when not invincible
- **Moving Platform Adhesion**: Player position tracks platform movement when standing on moving platform

## Authentication Invariants

- **Session Exclusivity**: Only one active authentication session per browser instance
- **Logout Cleanup**: All session data cleared on logout while preserving anonymous progression
- **Guest Mode Isolation**: Anonymous progression tracked locally but marked as device-specific
- **Auto-Save on Authentication**: Game state loaded into memory immediately on successful login
- **Session Persistence**: Authentication state persists across browser sessions until explicit logout
- **Credential Validation**: Login attempts validated before session creation

## Level Progression Invariants

- **Sequential Unlock**: Level N+1 unlocks only after Level N completion (bestScore > 0)
- **Unlock Monotonicity**: Level unlock status only advances, never regresses
- **Star Rating Formula**: 3-star system based on score thresholds (60%, 80%, 95% of baseScore)
- **Progress Persistence**: Level completion and best scores persist across sessions
- **Level Isolation**: Each level maintains independent best score and star rating
- **Theme Independence**: Visual theme selection does not affect level unlock requirements

## XP and Progression Invariants

- **XP Formula**: Player level N requires exactly `N * 100` cumulative XP to unlock
- **Level Advancement**: XP accumulation is monotonic; levels only increase, never decrease
- **Skill Unlock**: Skills unlock immediately when player level reaches requirement
- **Skin Unlock**: Skins become selectable when player level reaches requirement  
- **Skill Persistence**: Once unlocked, skills remain available permanently across sessions
- **Bonus Application**: Skin bonuses apply immediately when skin is equipped and persist until changed
- **XP Sources**: XP earned through level completion, score milestones, and daily challenge completion

## Power-up Invariants

- **Timer Monotonicity**: Power-up timers (`speed`, `shield`, `magnet`) only decrease, never increase
- **Duration Limits**: 
  - Speed: 480 frames (8 seconds at 60fps)
  - Shield: 600 frames (10 seconds)
  - Magnet: 480 frames (8 seconds)
- **Shield Stacking**: Shield power-up restores `shieldHP` to `shieldMax`, does not exceed
- **Magnet Range**: Magnet effect only applies to coins/gems within 5 tiles (80 pixels)

## Shop Currency Invariants

- **Non-Negative Balances**: Coins and gems balances must be ≥ 0 at all times
- **Transaction Atomicity**: Currency debits and item grants succeed together or both fail
- **Purchase Validation**: Item can only be purchased if price ≤ current balance AND unlock conditions met
- **Inventory Persistence**: All purchased items persist across sessions in localStorage
- **Currency Sources**: Coins earned through gameplay; gems earned through collectibles and challenges
- **Price Stability**: Item prices remain constant; no inflation or dynamic pricing

## Shop Inventory Invariants

- **Quantity Tracking**: Consumable boosters tracked with integer quantities ≥ 0
- **Ownership Binary**: Cosmetics and permanent items have boolean ownership (owned/not owned)
- **Duplicate Prevention**: Same cosmetic item cannot be purchased multiple times
- **Active Status**: Only one cosmetic trail can be active at a time per category
- **Skin Integration**: Shop skins integrate with level-unlocked skins in unified selection UI

## Battle Pass Invariants

- **Tier Monotonicity**: Current tier only increases within a season, never decreases
- **XP Accumulation**: Total seasonal XP is monotonically non-decreasing
- **Tier Unlock Sequence**: Tier N unlocks only when cumulative XP ≥ tier N threshold
- **Reward Claim Idempotency**: Claiming tier N reward multiple times grants items only once
- **Premium Gate**: Premium track rewards only claimable if premium status purchased
- **Season Isolation**: Each season maintains independent progress; seasons do not affect each other

## Daily Challenge Invariants

- **Progress Monotonicity**: Challenge progress only increases toward target, never decreases
- **Completion Threshold**: Challenge marked complete only when progress ≥ target value
- **Reset Cycle**: Challenges reset every 24 hours from lastDailyReset timestamp
- **Reward Collection**: Rewards can only be claimed after challenge completion
- **Challenge Variety**: At least 3 active challenges available at any time
- **Target Validation**: Challenge targets must be achievable within normal gameplay parameters

## Theme Application Invariants

- **Visual Consistency**: All tiles in active level use same theme palette consistently
- **Gameplay Isolation**: Theme choice affects only visual appearance, not physics or collision detection  
- **Fallback Safety**: If theme data missing/corrupted, system falls back to default theme without error
- **Theme Persistence**: Selected theme persists across level replays until manually changed
- **Performance Isolation**: Theme switching does not affect frame rate or game performance

## Enemy Behavior Invariants (T-0029)

- **Patrol Boundaries**: Enemies reverse direction when `abs(x - startX) > patrolRange`
- **Ground Check**: Walker enemies reverse at ground gaps (no solid tile below) to prevent falling
- **Flyer Oscillation**: Flyer enemies oscillate around `baseY ± 30` pixels using sinusoidal phase
- **Death Persistence**: `alive = false` enemies remain in entity array until level change
- **Stomp Criteria**: Enemy dies from stomp only if player approaches from above with `vy > 0`
- **Collision Damage**: Any AABB overlap with active enemy deals 1 HP damage (unless invincible)
- **Invincibility Grace**: After enemy collision, player gains 90 frames of invincibility
- **Collision Resolution**: When player hits enemy, both collider resolution stops at AABB edge (no penetration)

## Moving Platform Invariants (T-0031)

- **Motion Integrity**: Platform position follows `basePos + sin(phase) * amplitude` within each frame
- **Ride Mechanics**: When player stands on platform (AABB contact from above), player position updates to follow platform's new position
- **One-Way Collision**: Platform acts as solid only when approached from above. Side/below approaches allow pass-through.
- **Phase Continuity**: Phase value increments by `speed` each frame and wraps at 360 degrees (or 2π in radians)
- **No Velocity Transfer**: Moving platform motion does not change player velocity; only position is updated
- **Landing Consistency**: If player lands on moving platform at frame N, position is synchronized at frame N+1 regardless of platform's velocity

## Game State Persistence Invariants

- **Score Accumulation**: `totalScore`, `totalCoins`, `totalGems` only increase, never decrease
- **Best Score**: `bestScore` is maximum of all session scores achieved
- **Death Counter**: `deathCount` only increases, tracks lifetime deaths
- **Time Tracking**: `levelTime` resets to 0 on level start, increments each frame

## Scoring Invariants

- **Forward Progress Only**: The per-run score can only increase in response to (a) the `ScoreTracker` registering that `progressBase + player.x + player.w` exceeded its previous high-water mark or (b) explicit gameplay events (collectibles, kills, level completion). Passive frame progression or held input with zero displacement never yields score.
- **High-Water Monotonicity**: `ScoreTracker.highWater` must be monotonically non-decreasing within a run. Moving backward or remaining stationary leaves both `highWater` and the player score unchanged.
- **Level Continuity**: On each level transition, `progressBase` realigns so that the player's new spawn point produces the same world-front position (`progressBase + player.x + player.w`) that was recorded at the end of the prior level. This prevents double-counting while still allowing further advancement to earn score.
- **No Backtracking Penalty**: Score never decreases when the player backtracks; the tracker simply requires exceeding the prior high-water mark to unlock additional points.

## HUD Display Invariants (T-0030)

- **DOM Throttling**: HUD DOM updates are throttled to once per 60ms to prevent excessive repaints
- **Update Condition**: HUD updates only if `currentTime - gs.hudLastUpdate >= 60` milliseconds
- **Displayed Stats**: HUD shows score, coins, gems, level number, health/shield bar
- **Power-up Display**: Active power-up timers are shown when their remaining frames > 0
- **Real-Time Updates**: Game state changes are reflected in HUD within the next throttled update window

## Input Handling Invariants

- **Jump Buffer**: Jump input within `JUMP_BUFFER_FRAMES` is accepted when landing
- **Coyote Grace**: Jump allowed within `COYOTE_FRAMES` after leaving ground
- **Dash Restrictions**: Dash only triggers when `canDash = true` and skill unlocked
- **Variable Jump**: Jump height depends on button hold duration

## Camera Invariants

- **Smooth Following**: Camera position approaches player with `CAMERA_LERP` rate
- **Level Boundaries**: Camera `x` bounded by `[0, level.width * TILE_SIZE - CANVAS_WIDTH]`
- **Camera Y Bounds**: Camera `y` bounded by `[0, level.height * TILE_SIZE - CANVAS_HEIGHT]`
- **Screen Shake**: Shake effects apply as temporary camera offset, do not persist

## Constants and Configuration Invariants

- **Tile Size**: `TILE_SIZE = 16` pixels, fundamental unit for all positioning
- **Gravity**: `GRAVITY = 0.6` applied each frame when airborne
- **Terminal Velocity**: Fall speed capped at `MAX_FALL_SPEED = 12`
- **Frame Rate**: Game logic designed for `60 FPS` fixed timestep
- **Level Dimensions**: Standard level is `200 × 25` tiles (`3200 × 400` pixels)

## Data Persistence Invariants

- **localStorage Atomicity**: Each feature system saves to separate localStorage keys to prevent corruption
- **Schema Versioning**: All saved data includes version metadata for future migration compatibility  
- **Corruption Recovery**: Missing or invalid localStorage data triggers reset to defaults without application error
- **Cross-Tab Sync**: localStorage changes in one browser tab reflect in others after manual refresh
- **Save Triggers**: Data automatically saved on level completion, purchases, XP gains, and challenge progress
- **Load Safety**: All save data loaded and validated during application initialization

### localStorage Key Management
- **`pixelRunner_levelProgress`**: Level completion tracking, best scores, and star ratings
- **`pixelRunner_battlePass`**: Season progress, tier unlocks, daily challenges, and premium status
- **`pixelRunner_shop_state`**: Inventory, owned items, currency balances, and purchase history
- **`pixelRunnerBestScore`**: Legacy best score key (maintained for backward compatibility)

## Game State Integrity Invariants

- **State Consistency**: Global state object maintains data consistency across all feature systems
- **Phase Isolation**: Each game phase operates on appropriate subset of state data
- **Error Boundaries**: Failures in one system (shop, battle pass, etc.) do not affect core gameplay
- **Memory Management**: Visual effects, particles, and temporary objects cleaned up automatically
- **Performance Stability**: Frame rate maintained regardless of active feature complexity

## System Integration Invariants

- **Feature Independence**: Shop, battle pass, and level systems can operate independently if others fail
- **UI State Synchronization**: DOM overlays and canvas rendering remain synchronized
- **Input Handling**: Keyboard/mouse input routed correctly based on current phase
- **Resource Cleanup**: Unused assets and event listeners cleaned up during phase transitions
- **Error Recovery**: System can recover gracefully from individual feature failures without data loss
