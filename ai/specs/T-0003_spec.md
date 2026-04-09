# T-0003: Level System Architecture Spec

## Overview
Implement a complete tile-based level system with procedurally generated platforms, multiple tile types for visual variety, and a side-scrolling camera that follows the player. The system supports level progression with increasing difficulty.

## Target File
`index.html` (single HTML file with embedded JavaScript and Canvas)

## Technical Design

### 1. Level Data Structure
**Tilemap Format:**
A 2D array representing the level, where each cell is a tile type:
```javascript
const levelMap = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],  // Row 0 (top)
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 1, 0, 1, 0, 1, 0, 0, 0],
  [0, 0, 1, 0, 1, 0, 1, 0, 0, 0],
  [2, 2, 2, 0, 2, 2, 2, 0, 2, 2]   // Row 4 (ground)
];
```

**Tile Types:**
- `0`: Empty/air (no collision)
- `1`: Grass platform (solid, grass texture)
- `2`: Stone platform (solid, stone texture)
- `3`: Ice platform (solid, ice texture, slippery)
- `4`: Breakable platform (solid initially, breaks after landing)
- `5`: Moving platform (animated, moves in pattern)

**Grid System:**
- Each tile is TILE_SIZE (16px) × TILE_SIZE (16px)
- Tilemap dimensions: WIDTH_TILES (50) × HEIGHT_TILES (25)
- Total level area: 800px wide × 400px tall (matches canvas)

### 2. Tilemap Rendering
**Sprite Sheet:**
- Single image containing all 6 tile types
- Each tile 16×16 pixels
- Arrange as horizontal strip or grid for efficient lookup
- Define tile offset mapping:
```javascript
const tileOffsets = {
  0: null,           // Empty - don't render
  1: {x: 0, y: 0},   // Grass
  2: {x: 16, y: 0},  // Stone
  3: {x: 32, y: 0},  // Ice
  4: {x: 48, y: 0},  // Breakable
  5: {x: 64, y: 0}   // Moving
};
```

**Rendering:**
- Iterate through visible tilemap area only (cull offscreen tiles)
- Draw each solid tile using Canvas 2D drawImage
- Update moving platform positions each frame
- Apply visual tint/overlay for ice tiles

### 3. Collision System Integration
**Tile Collision:**
- Solid tiles (1-5) block player movement
- Check collision against tiles in player path each frame
- Return collision results as axis-aligned boxes
- Store active collision tiles for physics resolution

**Platform-Specific Logic:**
- **Grass (1)**: Standard solid platform
- **Stone (2)**: Standard solid platform (no special behavior)
- **Ice (3)**: Reduce friction for player (reduce deceleration by 50%)
- **Breakable (4)**: When player lands, apply damage and trigger break animation (5 frames), then become passable
- **Moving (5)**: Calculate position based on sine wave or linear path pattern, move player with platform if standing on it

### 4. Level Generation System
**Procedural Generation:**
Generate levels with increasing difficulty across sections:
```javascript
function generateLevel(difficultyLevel) {
  const sectionCount = Math.ceil(LEVEL_WIDTH_TILES / 10);
  const baseGapSize = 2 + Math.floor(difficultyLevel * 0.5);

  for (let section = 0; section < sectionCount; section++) {
    let platformCount = 3 + Math.floor(difficultyLevel * 0.3);
    let platformSpacing = baseGapSize + Math.random() * 3;

    // Place platforms with gaps
    // Vary tile type: 60% grass, 25% stone, 15% special
    // Ensure player can traverse by limiting gap size
  }
}
```

**Difficulty Scaling:**
- Level 0: Gap size 2-4 tiles, 3 platforms per section
- Level 1: Gap size 3-5 tiles, 4 platforms per section
- Level 2: Gap size 4-6 tiles, 5 platforms per section
- Mix in special tile types as difficulty increases
- Guarantee traversable path (no impossible gaps)

**Level Progression:**
- Load level data at game start
- On level completion (reach far right), increment difficulty
- Generate next level procedurally
- Fade transition between levels

### 5. Camera System
**Follow Behavior:**
- Camera position X follows player X with smooth lerp
- Clamp camera X to level bounds (0 to levelWidth - CANVAS_WIDTH)
- Clamp camera Y to level bounds (0 to levelHeight - CANVAS_HEIGHT)
- Target offset: keep player at 1/3 from left edge

```javascript
const cameraX = lerp(currentCameraX, playerX - 200, 0.1);
const cameraY = levelHeight < CANVAS_HEIGHT ? 0 : lerp(currentCameraY, playerY - 200, 0.1);
```

**Viewport:**
- Apply camera translation to all renders
- Only draw tiles within visible viewport (+ small margin for safety)
- Translate player render by (-cameraX, -cameraY)

**Bounds Checking:**
- If player falls below level (y > levelHeight): reset to start or game over
- If player reaches right edge (x > levelWidth - 50): trigger level complete

### 6. Level Data Format
**Stored Levels:**
Define at least 3 pre-made starting levels with varying designs:
```javascript
const LEVEL_DATA = {
  tutorial: [
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,1,1,0,0,1,1,0,0],
    [0,0,1,1,0,0,1,1,0,0],
    [2,2,2,2,0,0,2,2,2,2]
  ],
  level1: [
    // ... 25 rows of tile data
  ]
};
```

### 7. Level Progression
**Meta System:**
- Track currentLevel (0, 1, 2, ...)
- On completion: increment level
- Mix procedural + pre-made levels
- Maintain player score/distance traveled

### 8. Game Loop Integration (Camera Phase)
```
Each frame:
1. Update level state (moving platforms, breakable damage timers)
2. Update camera position based on player
3. Render visible tilemap using camera offset
4. Render player using camera offset
5. Update UI (level, distance, etc.)
```

## Acceptance Criteria
1. Tilemap renders with 16×16 pixel tiles at correct positions
2. At least 3 distinct visual tile types visible (grass, stone, ice)
3. Solid tiles block player movement (collision works)
4. Camera follows player smoothly with 1/3 offset
5. Camera clamps at level boundaries (doesn't show beyond edges)
6. Player cannot fall through solid platforms
7. Ice tiles reduce player friction (visually different and mechanically different)
8. Breakable platforms break after player lands on them
9. Moving platforms move smoothly and carry player when standing on them
10. Level data stored as 2D arrays (compact, readable)
11. Procedural generation creates playable levels with varying difficulty
12. Gap sizes scale with difficulty level (wider gaps in later levels)
13. Player can traverse all generated levels (no impossible gaps)
14. Level completion detected when player reaches right edge
15. Transition between levels works smoothly
16. UI shows current level/section number
17. Off-screen tiles are not rendered (optimization)
18. Camera stays smooth with no jittering

## Constants Reference
- `CANVAS_WIDTH: 800`
- `CANVAS_HEIGHT: 400`
- `TILE_SIZE: 16`
- `GRAVITY: 0.6`
- `LEVEL_WIDTH_TILES: 50`
- `LEVEL_HEIGHT_TILES: 25`
- `LEVEL_WIDTH_PIXELS: 800`
- `LEVEL_HEIGHT_PIXELS: 400`
- `CAMERA_LERP_SPEED: 0.1`
- `CAMERA_OFFSET_X: 200` (keeps player at 1/3 from left)
- `CAMERA_OFFSET_Y: 200` (center vertically when possible)
- `ICE_FRICTION_MULTIPLIER: 0.5` (half deceleration)
- `BREAKABLE_BREAK_TIME: 5` (frames to break)
- `MIN_GAP_SIZE: 1` (tiles)
- `MAX_GAP_SIZE_LEVEL0: 4`
- `MAX_GAP_SIZE_LEVEL1: 5`
- `MAX_GAP_SIZE_LEVEL2: 6`
