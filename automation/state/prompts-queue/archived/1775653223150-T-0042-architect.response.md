# T-0042 Spec

## Task metadata
- **task_id:** T-0042
- **title:** Level Select Screen and Multi-Level System
- **lane_type:** feature-lane
- **executor:** codex
- **parent_goal_id:** G-0003

## Problem statement

The Pixel Runner game currently generates a single procedurally-generated level at game start and loops infinitely. There is no level progression system, difficulty scaling, or visual distinction between level segments. Players have no control over which level to play and no sense of progression through distinct environments. The game lacks:

1. A level selection interface to browse and choose levels
2. Multiple distinct level themes with unique visual identities (Forest, Cave, Ice, Lava, Sky)
3. Difficulty progression and level unlock mechanics
4. Level-specific configuration (tile palettes, enemy difficulty, platform density)
5. Level completion tracking and star rating system
6. A world map or grid UI for level selection
7. Progression-based level unlocking (score/level requirements)

## Source of truth

- `/sessions/gracious-eloquent-sagan/mnt/ai-flow-lab/index.html` — Main game file; contains CONFIG object, level generation logic, game phase logic, and HUD rendering
- `/sessions/gracious-eloquent-sagan/mnt/ai-flow-lab/docs/DOMAIN_MODEL.md` — Game state structure, level entity definition, power-up and scoring systems
- `/sessions/gracious-eloquent-sagan/mnt/ai-flow-lab/docs/ARCHITECTURE.md` — Game loop, rendering pipeline, physics engine, level generation procedure
- `/sessions/gracious-eloquent-sagan/mnt/ai-flow-lab/docs/INVARIANTS.md` — Game phase transitions, level generation constraints, scoring rules

## Desired behavior

### 11.1 Level Select Screen UI
A dedicated game phase (`'LEVEL_SELECT'`) displays a grid-based level select interface:
- **Grid Layout**: Levels arranged in a 5-column grid (5 levels per row)
- **Level Cards**: Each card shows:
  - Level number (1–12+)
  - Theme icon/preview (emoji or visual indicator: 🌲 Forest, 🏔️ Cave, ❄️ Ice, 🌋 Lava, ☁️ Sky)
  - Star rating (0–3 stars earned, empty stars for unearned)
  - Best score achieved in that level
  - Lock status (if locked, display unlock requirement and progress: "Beat Level 3 with 1000+ score")
- **Scrollable Area**: If levels exceed grid bounds, support vertical scrolling
- **Navigation**: Buttons to return to MENU phase

### 11.2 Multi-Level System (12+ Levels)
Define 12 distinct levels with increasing difficulty:
- **Levels 1–4 (Forest Theme)**: Grassland with simple obstacles; 0–2 enemies; basic platforms; difficulty 1
- **Levels 5–8 (Cave/Ice/Lava themes)**: Mixed environments; 2–4 enemies; moving platforms; spikes; difficulty 2–3
- **Levels 9–12 (Sky/Advanced)**: Aerial challenges; 4–6 enemies; complex platforming; dense hazards; difficulty 4–5

### 11.3 Level Themes and Visuals
Each theme has distinct tile colors, background layers, and environmental feel:
- **Forest**: Green grass (#4a7c4e), brown stone (#6b5344), dark green spikes (#2d5c2d); parallax tree background
- **Cave**: Gray stone (#5a5a5a), dark gray platform (#3a3a3a), orange spikes (#c84c0c); parallax rock formations
- **Ice**: Light blue tiles (#b3d9ff), cyan platforms (#7fbfff), white spikes (#e8e8e8); parallax icy peaks
- **Lava**: Red/orange rock (#c84c0c), dark red stone (#6b2c2c), yellow spikes (#ffff00); parallax magma background
- **Sky**: Light blue tiles (#87ceeb), white clouds (#e8e8e8), purple spikes (#8b5a8f); parallax cloud layers

### 11.4 Level Configuration
Each level is defined by:
- **theme**: String identifier (`'forest'`, `'cave'`, `'ice'`, `'lava'`, `'sky'`)
- **difficulty**: Number 1–5 (affects enemy count, platform complexity, hazard density)
- **tileConfig**: Overrides for tile colors in level generation
- **backgroundConfig**: Parallax layer definitions (2–3 layers per theme)
- **enemyDensity**: Multiplier for enemy spawn count (0.5–1.5)
- **platformDensity**: Probability multiplier for moving platform generation
- **targetScore**: Optional recommended score target for 3-star rating

### 11.5 Level Unlock Progression
Levels unlock based on previous level performance:
- **Level 1**: Always unlocked (starting level)
- **Levels 2–12**: Unlock when player:
  - Completes the previous level (reaches EXIT tile at least once)
  - AND achieves a minimum score in that level:
    - Level N unlock requirement: `(N-1) * 500` points minimum in level N-1
    - Examples:
      - Level 2 unlocks when Level 1 is completed
      - Level 3 unlocks when Level 2 is completed with 500+ score
      - Level 5 unlocks when Level 4 is completed with 2000+ score

### 11.6 Level Completion and Star Rating
After completing a level (reaching EXIT), calculate stars based on score:
- **1 Star**: Score ≥ `baseScore * 0.5` (completed the level)
- **2 Stars**: Score ≥ `baseScore * 0.75` (good performance)
- **3 Stars**: Score ≥ `baseScore * 1.0` (mastery)
  - `baseScore` is the `targetScore` from level config (default 1000)

**Persistence**: Best score and star count per level stored in `localStorage` under key `pixel-runner-levels`

### 11.7 Phase Transitions
Update game phase state machine:
- **MENU → LEVEL_SELECT**: User clicks "Play" or equivalent button
- **LEVEL_SELECT → PLAYING**: User clicks a level card (only if unlocked)
- **PLAYING → LEVEL_SELECT**: User presses Escape or clicks "Back" during gameplay (restart to level select, not MENU)
- **PLAYING → GAME_OVER**: Player dies (existing behavior, but "Retry" goes back to LEVEL_SELECT, not MENU)
- **GAME_OVER → LEVEL_SELECT**: New "Back to Level Select" button instead of returning to MENU

### 11.8 Level-Specific Generation
When entering PLAYING phase for a level:
1. Load level config from level definition
2. Generate level with theme-specific tile colors and parallax layers
3. Apply enemy density and platform density multipliers to generation algorithm
4. Place EXIT tile at end of level
5. Initialize score tracker for that level
6. Store current `levelId` in `gs` for tracking and persistence

### 11.9 Persistent State
Save/load level progress in `localStorage`:
- **Key**: `pixel-runner-levels`
- **Value**: JSON object mapping `{ levelId: { completed: boolean, bestScore: number, stars: number }, ... }`
- **Updates**: Save after each level completion or on phase change
- **Load**: On MENU phase, restore level unlock/star state to `gs`

## Constraints

- **Single file deployment**: All code remains in `index.html`; no external JavaScript files or assets
- **No external dependencies**: No libraries, frameworks, or external APIs (pure JavaScript)
- **Canvas-based rendering**: All UI (level select, cards, stars) rendered to canvas or DOM overlays
- **Backward compatibility**: Existing player progression, skills, skins, HUD systems must continue working
- **Mobile responsive**: Level select grid and cards must scale to viewport dimensions
- **Storage limit**: localStorage persistence must not exceed ~50 KB (reasonable constraint for ~12 levels)
- **Performance**: Level select rendering and phase transitions must not introduce frame rate drops
- **Phase isolation**: LEVEL_SELECT phase must not modify PLAYING, GAME_OVER, or MENU logic

## Acceptance criteria

- [ ] **AC1**: Game has a `'LEVEL_SELECT'` phase distinct from MENU, PLAYING, GAME_OVER
- [ ] **AC2**: Level select screen displays a 5-column grid of up to 12 level cards
- [ ] **AC3**: Each level card shows: level number, theme icon, star rating (0–3 filled/empty), best score
- [ ] **AC4**: Level cards are clickable; clicking an unlocked card starts that level; clicking a locked card shows unlock requirement
- [ ] **AC5**: 12 levels defined in CONFIG with distinct themes (Forest, Cave, Ice, Lava, Sky distributed across 12 levels)
- [ ] **AC6**: Each theme has unique tile color palette (5+ colors overriding defaults for that theme)
- [ ] **AC7**: Parallax background layers render correctly per theme (2–3 layers) during gameplay
- [ ] **AC8**: Level 1 is always unlocked; levels 2–12 unlock based on previous level completion + score threshold
- [ ] **AC9**: Unlock requirement is calculated as `(N-1) * 500` for level N; UI displays requirement on locked cards
- [ ] **AC10**: Star rating calculated after level completion: 1 star ≥50%, 2 stars ≥75%, 3 stars ≥100% of `targetScore`
- [ ] **AC11**: Player can press Escape during gameplay to return to LEVEL_SELECT; "Retry" button in GAME_OVER returns to LEVEL_SELECT
- [ ] **AC12**: Level progress (completion, best score, stars) persisted in `localStorage` and restored on page reload
- [ ] **AC13**: Enemy count and platform density vary by level difficulty; easier levels (1–4) spawn fewer enemies than hard levels (9–12)
- [ ] **AC14**: No console errors or warnings; game loop remains stable at 60 FPS

## Risks

1. **Large state expansion**: Adding 12 level definitions + configs could exceed reasonable CONFIG object size. Risk: code readability and maintainability. **Mitigation**: Organize levels into theme-grouped data structures; consider separating level definitions into a structured table at top of CONFIG.

2. **localStorage serialization overhead**: Persisting level state for 12 levels on every completion could cause noticeable lag. Risk: poor UX on older devices. **Mitigation**: Batch updates; only serialize/write on phase changes (not per-frame); test on low-end hardware.

3. **Rendering performance of level select grid**: Rendering 12 card canvases + text + stars every frame could be expensive. Risk: frame rate drops during level select. **Mitigation**: Cache card renders; only re-render on unlock/completion events; use DOM overlays for text labels instead of canvas.

4. **Theme color bleeding**: If tile color overrides are applied globally, previous levels' colors might persist if cleanup is missed. Risk: visual inconsistency. **Mitigation**: Apply theme colors at level start (`initLevel()` function); explicitly reset tile color arrays before generation.

5. **Phase transition ambiguity**: Multiple entry points to LEVEL_SELECT (MENU, PLAYING, GAME_OVER) could create dead-end loops. Risk: player gets stuck without escape route. **Mitigation**: Always allow "Back to MENU" from LEVEL_SELECT; ensure all buttons have clear targets.

6. **Parallax layer performance**: Rendering 2–3 parallax layers per frame could compete with canvas rendering. Risk: scrolling frame rate drops. **Mitigation**: Render parallax layers at camera tick (not per-entity); reuse layer canvases where possible.

7. **Mobile grid layout**: 5-column grid may be too wide on small phones. Risk: cards become unreadably small. **Mitigation**: Detect viewport width; switch to 3-column or 4-column grid on mobile; test at common breakpoints (320px, 480px, 768px).

## Open questions

1. **How many levels should we ship with for launch?**
   - **Current spec says**: 12 levels (3 per theme × 4 themes + 1 bonus sky level)
   - **Alternative**: Start with 5 levels, design architecture to scale to 12+
   - **Recommended answer**: Ship with 12 as specified; use the CONFIG table structure to make adding future levels trivial. 12 is a nice "complete game" milestone.

2. **Should we support custom/user-generated levels or level codes?**
   - **Current spec says**: No; all levels are hard-coded in CONFIG
   - **Alternative**: Add a "Level Code" input to load custom seed + difficulty
   - **Recommended answer**: No custom levels for this task (T-0042). Leave as future enhancement (separate task). This keeps scope manageable and ensures predictable, tuned difficulty curves.

3. **What happens to player level/XP progression when switching between levels?**
   - **Current spec says**: Each level play session is independent; XP/skills earned during a level persist across level changes
   - **Alternative**: Reset player level to 1 per level; make each level a "run"
   - **Recommended answer**: XP and player progression are global/persistent across all levels. Switching levels does NOT reset player level, skins, or skills. Only per-run score resets. This preserves the existing progression system and allows skill growth to compound across multiple level attempts.
