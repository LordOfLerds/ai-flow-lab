---
type: architecture
created: 2026-04-10
tags: [ai-flow-lab, architecture]
---

# ARCHITECTURE

> **Note**: This documentation is inferred from code implementation in `index.html` as of T-0045. Updated to reflect login system, multi-level progression, shop, battle pass, and themed environments added in G-0003.

## System Overview

The jump-and-run game is implemented as a single-page browser application contained entirely within `index.html`. The architecture follows a traditional game engine pattern with a main game loop, component-based entities, and immediate mode rendering, extended with a full UI flow including authentication, progression tracking, and monetization features.

### UI Layers
- **Authentication Layer**: Login/registration screens with localStorage persistence and session management
- **Main Menu Layer**: Central hub with access to level select, shop, profile, and battle pass
- **Level Select Layer**: Grid-based level selection with themed groupings, progress tracking, and star ratings  
- **Shop Layer**: Multi-tab interface (skins, boosters, cosmetics) with inventory management and currency handling
- **Battle Pass Layer**: Seasonal progression with tier rewards, daily challenges, and premium track
- **Game Layer**: Core gameplay with enhanced HUD showing progression stats and active effects
- **Game Over Layer**: Enhanced stats screen with XP rewards, level progression, and navigation options

### State Management
The global game state (`gs`) manages four primary data categories:
- **Player State**: Account data, progression level, unlocked content, equipped items
- **Game State**: Active level, physics simulation, entities, camera, input handling  
- **Inventory State**: Owned skins, purchased boosters, cosmetic trails, currency balances
- **Battle Pass State**: Season progress, tier unlocks, daily challenge completion, premium status

## Technology Stack

- **Platform**: Web Browser (HTML5)
- **Rendering**: HTML5 Canvas with 2D context for gameplay, DOM overlays for UI
- **Language**: Vanilla JavaScript (ES6+)
- **Styling**: Embedded CSS with flexbox layout and custom animations
- **Input**: Keyboard event listeners for gameplay, mouse/click handlers for UI
- **Assets**: Procedurally generated pixel art with theme-based color palettes
- **Persistence**: Browser localStorage with versioned schema and multiple data stores
- **Authentication**: Client-side session management with optional external auth module
- **State Management**: Single global state object with modular save/load per feature

## Runtime Architecture

### Entry Points and Authentication Flow

`index.html` is the primary browser entry page. On load, the application initializes authentication state and determines the entry flow:
1. **Anonymous Mode**: Direct access to main menu with limited features and local-only progression  
2. **Authenticated Mode**: Full feature access with cloud sync and cross-device progression
3. **Registration Flow**: New user onboarding with account creation and initial setup

### Application Phases

The application state machine manages multiple distinct phases:
- **MENU**: Main hub with navigation to all features
- **LOGIN/REGISTRATION**: Authentication screens  
- **LEVEL_SELECT**: Themed level grid with progression tracking
- **SHOP**: Multi-tab store interface (skins/boosters/cosmetics)
- **BATTLE_PASS**: Seasonal progression and daily challenges
- **SKIN_SELECT**: Player appearance customization
- **SKILL_SELECT**: Ability management interface  
- **PLAYING**: Active gameplay with physics simulation
- **GAME_OVER**: Results screen with progression rewards

### Single-File Structure

The entire application resides in `index.html` (3000+ lines as of T-0045). The file includes:
- HTML5 Canvas for gameplay rendering (800×400 viewport)  
- DOM overlay system for complex UI screens
- Complete game engine with fixed timestep main loop
- Authentication module with localStorage persistence
- Level progression system with 12 themed levels
- Shop system with multiple currency types and inventory tracking
- Battle pass system with seasonal tiers and daily challenges
- Sprite system with theme-based color palette rendering
- Physics engine with gravity, friction, and platform mechanics
- Procedural level generation with theme-specific variations
- Enemy AI system (walkers, flyers) with difficulty scaling  
- Particle and visual effects system with trail customization

## Core Systems

### Authentication System
- **Session Management**: Client-side authentication state with localStorage persistence
- **Account Creation**: Username/email registration with validation and duplicate checking
- **Guest Mode**: Anonymous play with local-only progression (no cross-device sync)  
- **Logout Flow**: Complete session cleanup and return to login screen
- **State Persistence**: Authentication state persists across browser sessions

### Level Progression System  
- **Themed Levels**: 12 levels across 5 themes (Forest, Desert, Ice, Lava, Sky)
- **Sequential Unlock**: Level N+1 unlocks only after completing Level N
- **Star Rating**: 3-star system based on score thresholds (60%, 80%, 95% of baseScore)
- **Progress Tracking**: Per-level best scores and completion status in localStorage
- **Difficulty Scaling**: Enemy density, gap frequency, and platform complexity increase per level

### Shop System
- **Multi-Tab Interface**: Separate inventories for skins, boosters, and cosmetics  
- **Currency Management**: Coins (earned through gameplay) and gems (rare collectibles)
- **Purchase Validation**: Price checking, balance deduction, and item granting as atomic operations
- **Inventory Persistence**: Owned items and quantities tracked in localStorage
- **Dynamic Pricing**: Items have different costs and currency requirements

### Battle Pass System
- **Seasonal Progression**: Season-based tiers (1-20) with XP requirements
- **Daily Challenges**: 3-4 rotating challenges with progress tracking and rewards
- **Dual Track**: Free tier rewards and premium track (unlocked with coin purchase)
- **XP Sources**: Level completion, score achievements, and challenge completion
- **Persistence**: Season progress and challenge state saved to localStorage

### Game Loop
- Runs at ~60 FPS using `requestAnimationFrame`
- Phases: MENU, LEVEL_SELECT, SHOP, BATTLE_PASS, SKIN_SELECT, SKILL_SELECT, PLAYING, GAME_OVER
- Each frame: update game state → check collisions → render → update UI

### Physics Engine
- Gravity: `0.6` pixels/frame² (affects falling)
- Max fall speed: `12` pixels/frame
- Friction: player decelerates at `0.85x` per frame on ground
- Ice tiles: reduced friction (`0.95x`) for slippery movement
- Coyote time: `6` frames of grace period after leaving ground
- Jump buffer: `8` frames to accept jump input before landing

### Collision Detection
- Pixel-perfect AABB (axis-aligned bounding box) collision
- Tile-based collision checks (16x16 grid)
- Tile solidity matrix: GRASS, STONE, ICE, BREAKABLE, PLATFORM solid
- Platform one-way collision: passable from below, solid from above/sides
- Spike hazards: damage on contact (unless invincible)
- Moving platform adhesion: player position tracks when standing on platform

### Entity System
- **Player**: single sprite, 12x16 pixel hitbox, tracks position/velocity/state
- **Enemies**: array of walkers (ground-based) and flyers (aerial with oscillation)
- **Particles**: visual effects with velocity and lifetime
- **Floating Texts**: score popups with fade-out animation
- **Moving Platforms**: sinusoidal motion (horizontal or vertical)

### Rendering
- **Canvas Rendering**: 2D context for gameplay with pixel-perfect aesthetic
- **Theme-Based Palettes**: Dynamic color substitution based on selected level theme
- **Sprite System**: Player and enemies with equipment-based appearance changes
- **DOM Overlays**: Complex UI screens (shop, battle pass, level select) rendered as HTML
- **Particle Effects**: Trail systems, impact effects, and collectible animations
- **Camera System**: Smooth lerp following with level boundaries and screen shake effects
- **Responsive HUD**: DOM-based overlay with real-time stat updates and power-up timers

### Themed Environment System
- **Visual Themes**: Forest, Desert, Ice, Lava, Sky with distinct color palettes
- **Dynamic Tile Rendering**: Base tiles re-colored per theme without asset changes  
- **Environment Effects**: Theme-specific particle effects and visual ambiance
- **Consistent Physics**: Visual themes do not affect collision detection or gameplay mechanics
- **Theme Persistence**: Selected theme persists across level replays and sessions

### HUD System (T-0030)
- DOM-based (not canvas) for better accessibility
- Displays: current score, coins, gems, level, health/shield bar
- Uses throttled update (60ms) to prevent excessive DOM repaints
- Shows power-up timers and active bonuses

### Moving Platforms (T-0031)
- Sinusoidal oscillation (horizontal or vertical direction)
- Configurable amplitude and speed
- One-way collision: can ride from above, pass through from below
- Player "sticks" to platform when standing on top (position updates follow platform)

### Score System
- Per-run score tracked via ScoreTracker (forward-progress only)
- Collectibles: coins (+10), gems (+50)
- Enemy kills: +20 per stomp
- Level completion: +100 bonus
- Lifetime stats: totalScore, bestScore, totalCoins, totalGems
- **Known issue (BUG-008):** Per-run score doesn't reset on restart

## Data Persistence Architecture

### localStorage Schema
The application uses multiple localStorage keys for feature isolation and data integrity:

- **`pixelRunner_levelProgress`**: Level completion tracking, best scores, and star ratings
- **`pixelRunner_battlePass`**: Season progress, tier unlocks, daily challenges, and premium status  
- **`pixelRunner_shop_state`**: Inventory, owned items, currency balances, and purchase history
- **`pixelRunnerBestScore`**: Legacy key for overall best score (maintained for compatibility)

### Save/Load Mechanisms
Each feature system manages its own persistence to prevent data corruption:

- **Automatic Save Triggers**: Level completion, item purchases, challenge progress, XP gains
- **Load on Startup**: All saved data loaded into global state during application initialization  
- **Error Handling**: Missing or corrupted data triggers reset to default state without error
- **Cross-Tab Sync**: localStorage changes reflect across browser tabs (manual refresh required)

### Session Management
- **Authentication State**: Login status and user profile data persist across browser sessions
- **Guest Mode Data**: Local progression saved but marked as device-specific  
- **Logout Cleanup**: Sensitive data cleared while preserving anonymous progression stats

### Data Versioning Strategy
- **Schema Evolution**: Each localStorage entry includes version metadata for future migrations
- **Backward Compatibility**: Older save data automatically upgraded on load when possible
- **Migration Safety**: Invalid data structures reset to defaults rather than breaking application
