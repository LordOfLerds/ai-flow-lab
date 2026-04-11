---
type: domain-model
created: 2026-04-10
tags: [ai-flow-lab, domain-model]
---

# DOMAIN MODEL

> **Note**: This documentation is inferred from code implementation in `index.html` as of T-0045. Updated to reflect authentication, multi-level progression, shop, battle pass, and themed environment systems added in G-0003.

## Core Entities

### Game State (`gs`)
The global game state object that manages all application data:

#### Core Game Data
- **phase**: `'MENU' | 'LEVEL_SELECT' | 'SHOP' | 'BATTLE_PASS' | 'SKIN_SELECT' | 'SKILL_SELECT' | 'PLAYING' | 'GAME_OVER'` - Current application phase
- **player**: Player entity instance
- **camera**: Camera position `{ x: number, y: number }`
- **level**: Current level data with tiles, enemies, platforms
- **levelNum**: Current active level number (1-based)
- **selectedLevelId**: Level ID selected for play (1-12)
- **levelProgress**: Object mapping levelId → completion data `{ unlocked, completed, bestScore, stars }`

#### Session Game Data  
- **score**: Current session score
- **coins**: Current session coins collected
- **gems**: Current session gems collected
- **levelTime**: Current level elapsed time in frames
- **progressBase**: Accumulated world offset maintaining global progress continuity
- **entities**: Array of active enemies
- **particles**: Array of visual effect particles
- **floatingTexts**: Array of score/notification texts

#### Player Progression
- **xp**: Current experience points accumulated this session
- **playerLevel**: Current player account level (unlocks skills/skins)  
- **unlockedSkills**: Array of skill IDs unlocked by player level
- **selectedSkin**: Index of currently equipped skin (0-based)
- **totalCoins**: Lifetime coins collected across all sessions
- **totalGems**: Lifetime gems collected across all sessions  
- **totalScore**: Lifetime score accumulated across all sessions
- **bestScore**: Highest single-session score achieved
- **deathCount**: Total number of deaths across all sessions

#### Shop and Inventory
- **shopTab**: Current shop interface tab `'skins' | 'boosters' | 'cosmetics'`  
- **ownedSkins**: Array of skin IDs purchased through shop (beyond level unlocks)
- **inventory**: Object containing:
  - **boosters**: Array of `{ id, quantity }` for consumable power-ups
  - **cosmetics**: Array of `{ id, quantity, active }` for visual effects

#### Battle Pass System
- **battlePass**: Object containing:
  - **season**: Current season number (integer)
  - **seasonStartDate**: ISO date string when current season began
  - **totalXP**: Cumulative XP earned across all levels this season  
  - **lastDailyReset**: Timestamp (ms) of last daily challenge reset
  - **premiumUnlocked**: Boolean indicating premium track purchase
  - **tiers**: Array of tier progress and reward claim status
  - **dailyChallenges**: Array of active daily challenges with progress

#### UI and Effects
- **powerUps**: Active power-up timers `{ speed, shield, magnet }`
- **hudLastUpdate**: Timestamp (ms) of last DOM-based HUD update (throttling)
- **shakeFrames**: Screen shake effect duration
- **shakeIntensity**: Screen shake effect magnitude
- **scoreTracker** (global singleton): Forward-progress scorer preventing backtracking exploits

### Score Tracker
Browser-level helper exposed via `score-tracker.js` that enforces forward-progress-based scoring:
- **unitSize**: Minimum displacement in pixels required to earn one score point (defaults to `TILE_SIZE / 2`)
- **highWater**: Furthest world-front coordinate (progressBase + player.x + player.w) ever reached in the current run
- **reset(initialPosition)**: Initializes the tracker for a new run or level start, anchoring the high-water mark to the player's starting front coordinate
- **award(currentPosition)**: Returns how many scoring units were earned since the last call (0 if stationary or moving backward) and updates `highWater`
- **getHighWater()**: Exposes the current high-water value for systems (like level transitions) that need to realign `progressBase`

### Authentication State (`authState`)
Client-side authentication management:
- **isLoggedIn**: Boolean session status
- **email**: User account identifier
- **sessionToken**: Session authentication token
- **loginAttempts**: Failed login attempt tracking
- **lastLoginTime**: Timestamp of successful authentication

### Level Configuration
Static level definitions with theme-based grouping:
- **id**: Unique level identifier (1-12)  
- **theme**: Visual theme `'Forest' | 'Desert' | 'Ice' | 'Lava' | 'Sky'`
- **name**: Display name for level selection
- **baseScore**: Target score for 100% completion rating
- **difficulty**: Numeric difficulty rating (1-5) affecting enemy density and obstacles
- **icon**: Emoji icon for theme representation

### Shop Items
Purchasable content with multiple categories:

#### Boosters (Consumable)
- **id**: Unique booster identifier
- **name**: Display name for shop interface
- **desc**: Effect description text
- **price**: Cost amount (integer)
- **currency**: Payment type `'coins' | 'gems'`  
- **icon**: Emoji icon for visual representation

#### Cosmetics (Permanent)
- **id**: Unique cosmetic identifier  
- **name**: Display name for shop interface
- **desc**: Visual effect description
- **price**: Cost amount (0 for free items)
- **currency**: Payment type `'coins' | 'gems'`
- **icon**: Emoji icon for visual representation  
- **color**: Particle effect color (hex string or 'rainbow')
- **free**: Boolean indicating free availability

### Battle Pass Entities

#### Battle Pass Tier
- **tier**: Tier number (1-20) 
- **xpThreshold**: Cumulative XP required to unlock this tier
- **freeReward**: Reward for free track users
- **premiumReward**: Reward for premium track users (requires purchase)
- **claimed**: Boolean indicating if rewards have been collected

#### Daily Challenge  
- **id**: Unique challenge identifier
- **text**: Challenge description text
- **target**: Objective value (e.g., score threshold, coins to collect)
- **progress**: Current progress toward target
- **reward**: Reward amount (coins or XP)
- **claimed**: Boolean indicating completion and reward collection
- **resetTime**: Timestamp when challenge expires and resets

### Themed Environment
- **theme**: Theme identifier `'Forest' | 'Desert' | 'Ice' | 'Lava' | 'Sky'`
- **tileColorPalette**: Array of color substitutions for base tiles
- **backgroundProperties**: Visual environment settings (parallax, ambiance)
- **particleEffects**: Theme-specific particle configurations
- **unlockCondition**: Player level or progression requirement to access theme

### Player
The player character entity:
- **Position**: `x, y` coordinates in pixels
- **Velocity**: `vx, vy` velocity components
- **Dimensions**: `w=12, h=16` hitbox size
- **Movement State**: `onGround, facing, frame, frameTimer`
- **Vitality**: `alive, invincible` (invincible timer in frames)
- **Jump Mechanics**: `coyoteTimer, jumpBufferTimer, jumpsLeft, maxJumps`
- **Dash Mechanics**: `dashTimer, dashDir, canDash`
- **Shield**: `shieldHP, shieldMax` (from shield skill/powerup)
- **Skin**: Reference to equipped skin configuration

### Level
Procedurally generated level data:
- **tiles**: 2D array `[height][width]` of tile types
- **enemies**: Array of enemy entities
- **movingPlatforms**: Array of moving platform entities
- **width**: Level width in tiles (typically 200)
- **height**: Level height in tiles (typically 25)

### Tile Types
Enumerated tile constants with specific behaviors:
- **EMPTY (0)**: Passable air
- **GRASS (1)**: Standard solid ground
- **STONE (2)**: Solid foundation block
- **SPIKE (3)**: Damages player on contact
- **ICE (4)**: Solid with reduced friction
- **BREAKABLE (5)**: Solid until broken by player from above
- **COIN (6)**: Collectible, gives XP and score
- **GEM (7)**: Valuable collectible, more XP and score
- **POWERUP_SPEED (8)**: Temporary speed boost
- **POWERUP_SHIELD (9)**: Temporary shield protection
- **POWERUP_MAGNET (10)**: Attracts coins and gems
- **PLATFORM (11)**: One-way platform (passable from below)
- **EXIT (20)**: Level completion trigger

### Enemies (T-0029)
Two enemy types with distinct AI behavior and collision:
- **Common Properties**: `x, y, type, vx, startX, patrolRange, frame, alive, width, height` (all 12x12 hitboxes)
- **Walker**: Ground-based enemy, constant horizontal patrol speed. Reverses at patrol boundaries and ground gaps (checks for solid tile below). Killed when player lands on top (stomp) or during dash attack.
- **Flyer**: Aerial enemy with sinusoidal vertical oscillation. Patrols horizontally around startX ± patrolRange while oscillating around baseY. Uses `flyPhase` (sine argument) to drive up/down motion. Killed by stomp or dash.
- **Collision**: Player-enemy AABB collision triggers damage (1 HP). Player gains invincibility frames (90 frames) on hit. Enemies remain in array even when `alive=false` until level change.

### Skins
Unlockable player appearances with gameplay bonuses:
- **id**: Unique skin identifier
- **name**: Display name
- **colors**: Array of 5 color values for sprite rendering
- **level**: Player level required to unlock
- **bonus**: Bonus type (`null, 'speed', 'jump', 'shield_dur', 'xp', 'dash'`)
- **bonusDesc**: Human-readable bonus description

### Skills
Unlockable abilities by player level:
- **id**: Unique skill identifier (`'double_jump', 'dash', 'shield'`)
- **name**: Display name
- **desc**: Description text
- **level**: Player level required to unlock
- **icon**: Display emoji

### Moving Platforms (T-0031)
Oscillating platform entities with sinusoidal motion:
- **Position**: `x, y` coordinates
- **Dimensions**: `w, h` platform size
- **Motion**: `dir` ('h' or 'v' for horizontal/vertical), `speed` (pixels/frame), `phase` (0-360 degrees), `amplitude` (max displacement in pixels)
- **Behavior**: oscillates around initial position using sin(phase). Player can ride by standing on top (position tracks platform). One-way: passable from below/sides.
- **Physics**: moving platform movement does not affect player velocity directly, only position when contact occurs

### Particles
Visual effect entities with lifecycle:
- **Position**: `x, y` coordinates
- **Velocity**: `vx, vy` motion vectors
- **Appearance**: `color, size`
- **Lifecycle**: `life, maxLife` (decreasing frame counter)

### Floating Texts
Score and notification display entities:
- **Position**: `x, y` coordinates (y decreases over time)
- **Content**: `text, color`
- **Lifecycle**: `life, maxLife` (40 frame duration)

## Key Relationships

### Core Game Relationships
- **Game State → Player**: 1:1 composition, player is owned by game state
- **Game State → Level**: 1:1 composition, one active level at a time  
- **Game State → Authentication**: 1:1 composition, auth state managed by game state
- **Level → Enemies**: 1:N composition, enemies belong to specific level
- **Level → Moving Platforms**: 1:N composition, platforms belong to specific level
- **Level → Tiles**: 1:N composition, 2D grid of tiles per level

### Progression Relationships  
- **Player → Skin**: N:1 reference, player equips one of multiple skins
- **Player → Skills**: N:N reference, player unlocks subset of available skills based on level
- **Player → Level Progress**: 1:N composition, player tracks completion status of multiple levels
- **Level Configuration → Level Progress**: 1:1 reference, progress data linked to level definition

### Inventory and Shop Relationships
- **Player → Inventory**: 1:1 composition, player owns inventory with boosters and cosmetics
- **Shop Items → Inventory**: N:N reference, purchased items added to player inventory
- **Skin → Player Level**: N:1 reference, skins unlock at specific player levels
- **Booster → Inventory**: N:N reference, consumable items with quantity tracking

### Battle Pass Relationships
- **Player → Battle Pass**: 1:1 composition, player has one active seasonal progression
- **Battle Pass → Tiers**: 1:N composition, battle pass contains multiple tier definitions
- **Battle Pass → Daily Challenges**: 1:N composition, battle pass manages rotating challenges
- **Player XP → Tier Unlocks**: 1:N derived, cumulative XP determines accessible tier rewards
- **Daily Challenge → Rewards**: 1:1 reference, each challenge grants specific rewards

### Theme and Visual Relationships  
- **Level Configuration → Theme**: N:1 reference, multiple levels share theme configurations
- **Theme → Visual Palette**: 1:1 composition, each theme defines color and particle systems
- **Player → Selected Theme**: N:1 reference, player chooses active theme for level rendering
- **Theme → Unlock Condition**: 1:1 reference, themes become available based on progression

### Persistence Relationships
- **Game State → localStorage**: 1:N composition, different game systems save to separate storage keys
- **Authentication State → Session**: 1:1 composition, auth state persists across browser sessions  
- **Level Progress → localStorage**: 1:1 composition, completion data persisted per level
- **Battle Pass Progress → localStorage**: 1:1 composition, seasonal data persisted independently
- **Shop Inventory → localStorage**: 1:1 composition, purchase history and owned items persisted

## Entity Lifecycle

### Authentication Lifecycle  
1. **Anonymous**: Default state, local-only progression
2. **Logging In**: Validation of credentials and session creation
3. **Authenticated**: Full feature access with persistent progression
4. **Logged Out**: Session cleanup while preserving anonymous data

### Player Progression Lifecycle
1. **Account Creation**: Initial level 1 with basic skills
2. **XP Accumulation**: Gaining experience through gameplay
3. **Level Advancement**: Unlocking new skills and skins at level thresholds
4. **Skill Activation**: Persistent skill availability across sessions

### Level Progress Lifecycle
1. **Locked**: Level inaccessible until prerequisite completed
2. **Unlocked**: Available for play after previous level completion
3. **Attempted**: In-progress gameplay with temporary score  
4. **Completed**: Best score saved, star rating awarded, next level unlocked

### Shop Purchase Lifecycle  
1. **Available**: Item visible in shop with price display
2. **Purchase Validation**: Currency balance checked, transaction authorized
3. **Inventory Addition**: Item quantity increased or ownership granted
4. **Persistent Ownership**: Purchase state saved across sessions

### Battle Pass Progression Lifecycle
1. **Season Start**: New tier progression initialized, daily challenges generated
2. **XP Earning**: Cumulative experience gained through gameplay
3. **Tier Unlocking**: Sequential tier access based on XP thresholds  
4. **Reward Claiming**: One-time reward collection per unlocked tier
5. **Season End**: Progress archived, new season content activated

### Daily Challenge Lifecycle
1. **Generated**: Created at season start or daily reset (24-hour intervals)  
2. **In Progress**: Player actions tracked toward challenge target
3. **Completed**: Target reached, reward available for collection
4. **Claimed**: Reward granted, challenge marked complete
5. **Reset**: New challenges replace expired ones

### Theme Application Lifecycle
1. **Selection**: Player chooses theme from available options
2. **Validation**: Theme unlock requirements checked
3. **Applied**: Color palette and particle effects activated
4. **Persistence**: Theme choice saved across sessions and level changes

### Power-up Lifecycle
1. **Placed**: Created during level generation as collectible tile
2. **Collected**: Removed from tile grid when player touches
3. **Active**: Timer counts down in game state
4. **Expired**: Timer reaches zero, effect ends

### Level Generation Lifecycle
1. **Theme Selection**: Based on player choice or level configuration  
2. **Procedural Generation**: Tiles, enemies, and platforms created algorithmically
3. **Active Gameplay**: Physics simulation and collision detection  
4. **Completion**: EXIT tile triggers level end and progress save

## Integrated Systems Status (Post G-0003)

All core systems have been fully implemented and integrated as of T-0045:

### Authentication and Progression System
- **Status**: Fully implemented
- **Features**:
  - Complete login/registration flow with form validation  
  - XP accumulation with level-up calculation (N * 100 XP formula)
  - Skill and skin unlock triggers tied to player level progression
  - Persistent save/load for player data, level progress, and battle pass state
  - Real-time HUD display of player level and progression stats
  - Cross-session persistence of totalScore, totalCoins, totalGems
- **Integration**: Seamlessly connected to all other game systems

### Enhanced Skins System  
- **Status**: Fully implemented and extended
- **Features**:
  - Complete skin selection UI with unlock status and preview
  - Player sprite rendering with dynamic color palette substitution
  - Skin bonus application to player stats (speed, jump, shield, XP, dash bonuses)
  - Shop integration for purchasing additional skins beyond level unlocks
  - Theme-aware color blending and visual effects
- **Integration**: Connected to shop system, level progression, and visual renderer

### Extended Skills System
- **Status**: Fully implemented and extended  
- **Features**:
  - Automatic skill unlock based on player level with visual notifications
  - Complete double-jump mechanic with midair control
  - Dash ability with directional physics and cooldown management
  - Shield system with HP tracking and visual feedback
  - Skills UI display with real-time status and cooldown indicators
- **Integration**: Fully integrated with player progression and combat systems

### Multi-Level System
- **Status**: Newly implemented
- **Features**:
  - 12 unique levels across 5 themed environments
  - Sequential unlock progression with star rating system
  - Level selection UI with theme grouping and progress visualization
  - Per-level best score tracking and completion persistence
  - Dynamic difficulty scaling based on level progression
- **Integration**: Connected to progression system and theme management

### Shop and Economy System
- **Status**: Newly implemented
- **Features**:
  - Multi-tab shop interface (skins, boosters, cosmetics)
  - Dual currency system (coins earned through gameplay, gems from collectibles)
  - Inventory management with quantity tracking and persistence  
  - Purchase validation with balance checking and transaction recording
  - Dynamic item availability and pricing
- **Integration**: Connected to player progression, battle pass rewards, and visual systems

### Battle Pass and Challenges System
- **Status**: Newly implemented
- **Features**:
  - Seasonal tier progression (20 tiers) with dual free/premium tracks
  - Daily challenge system with rotating objectives and rewards
  - XP-based tier unlocking with threshold requirements
  - One-time reward claiming with persistent tracking
  - Premium track purchase with coin-based economy
- **Integration**: Connected to XP system, shop currency, and daily challenge objectives
