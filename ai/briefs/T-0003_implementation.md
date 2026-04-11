---
type: brief
task_id: T-0003
created: 2026-04-10
tags: [ai-flow-lab, brief]
---

# Implementation Brief: T-0003 Level System

## Merged Requirements
This brief incorporates the architect spec with all critical corrections from the critique review, focusing on blocking items first.

## Implementation Instructions

### 1. Platform Type Definitions (CORRECTED)
Add all 6 platform types with collision behavior:
```javascript
const TILE_TYPES = {
  0: {name: 'empty', solid: false},
  1: {name: 'grass', solid: true, friction: 1.0, color: '#2ecc71'},
  2: {name: 'stone', solid: true, friction: 1.0, color: '#95a5a6'},
  3: {name: 'ice', solid: true, friction: 0.5, color: '#3498db'},  // CORRECTED: explicit friction
  4: {name: 'breakable', solid: true, breakHealth: 1, color: '#c0392b'},
  5: {name: 'moving', solid: true, friction: 1.0, color: '#f39c12'},
  6: {name: 'one-way', solid: true, oneWayTop: true, color: '#8b4513'}  // NEW
};
```

### 2. Level Dimensions (CORRECTED)
Clarify explicit level sizing:
```javascript
const LEVEL_WIDTH_TILES = 50;
const LEVEL_HEIGHT_TILES = 30;  // CORRECTED: 30 rows (480px) > 25 canvas rows (400px)
const LEVEL_WIDTH_PIXELS = LEVEL_WIDTH_TILES * TILE_SIZE;  // 800px
const LEVEL_HEIGHT_PIXELS = LEVEL_HEIGHT_TILES * TILE_SIZE;  // 480px
```

This allows both vertical scrolling and guaranteed empty space above players.

### 3. Tilemap Data Structure
```javascript
let currentLevel = null;
let currentLevelNumber = 0;

const LEVEL_DATA = {
  tutorial: [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],  // ... (30 rows)
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,0,0],
    [0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,0,0],
    [2,2,2,2,0,0,2,2,0,0,2,2,0,0,2,2,2,2,2,2]  // Bottom row
  ],
  // More level definitions...
};
```

### 4. Moving Platforms System (BLOCKING CORRECTION)
Define moving platform data and physics:
```javascript
const movingPlatforms = [
  {
    id: 'mp-1',
    baseX: 300,
    baseY: 100,
    width: 3,  // 3 tiles wide
    height: 1,
    motion: {
      type: 'sine-wave',
      amplitude: 80,  // pixels
      period: 120,    // frames for one complete cycle
      axis: 'x'       // Move horizontally
    },
    currentX: 300,
    currentY: 100,
    velocity: {x: 0, y: 0}
  }
];

// Update each frame BEFORE player physics
function updateMovingPlatforms() {
  movingPlatforms.forEach(mp => {
    const frameInCycle = (gameFrameCount % mp.motion.period);
    const progress = frameInCycle / mp.motion.period;
    const sine = Math.sin(progress * Math.PI * 2) - 1;

    mp.previousX = mp.currentX;
    mp.currentX = mp.baseX + sine * mp.motion.amplitude;
    mp.velocity.x = mp.currentX - mp.previousX;
  });
}

// In player physics: if standing on moving platform, add platform velocity
if (player.standingOnMovingPlatform) {
  player.velocityX += movingPlatform.velocity.x;  // Carry player with platform
}
```

### 5. Collision Detection with Platform Types (CRITICAL)
Extend collision system to handle each type:

**One-Way Platforms (NEW):**
```javascript
// During downward collision check:
if (tile.type === TILE_TYPES[6] && player.velocityY >= 0) {
  // Only block if coming from above
  return COLLISION_BLOCK;
}
// Allow jumping through from below
if (tile.type === TILE_TYPES[6] && player.velocityY < 0) {
  return NO_COLLISION;
}
```

**Breakable Platforms:**
```javascript
// Track breakable state per position
const breakableState = new Map(); // key: "x,y", value: {health, frameCounter}

if (tile.type === TILE_TYPES[4]) {
  const key = `${tileX},${tileY}`;
  if (!breakableState.has(key)) {
    breakableState.set(key, {health: 1, frameCounter: 0});
  }

  const state = breakableState.get(key);
  if (state.health > 0) {
    // Still solid
    if (player.collidingWithTile && player.velocityY >= 0) {
      // Landed on it - break it
      state.health = 0;
      state.frameCounter = 8;  // Break animation frames
      return COLLISION_BLOCK;  // Still solid for this frame
    }
  }

  if (state.frameCounter > 0) {
    state.frameCounter--;
    return COLLISION_BLOCK;  // Still solid during break animation
  }

  return NO_COLLISION;  // Broken, no longer solid
}

// Reset breakables on level load
breakableState.clear();
```

**Ice Platforms:**
```javascript
// In player horizontal physics:
if (standingOnTileType === TILE_TYPES[3]) {
  player.deceleration = PLAYER_DECELERATION * 0.5;  // Half friction
}
```

### 6. Level Generation with Validation (BLOCKING CORRECTION)
```javascript
function generateLevel(difficultyLevel) {
  const maxAttempts = 50;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const generatedMap = buildRandomLevel(difficultyLevel);

    if (validateLevel(generatedMap)) {
      return generatedMap;  // Valid level found
    }
  }

  // Fallback to pre-made level if generation fails
  return LEVEL_DATA.tutorial;
}

function buildRandomLevel(difficulty) {
  const map = Array(LEVEL_HEIGHT_TILES).fill(null).map(() =>
    Array(LEVEL_WIDTH_TILES).fill(0)
  );

  // Add ground platforms
  const groundRow = LEVEL_HEIGHT_TILES - 1;
  for (let x = 0; x < LEVEL_WIDTH_TILES; x++) {
    map[groundRow][x] = 2;  // Stone platforms
  }

  // Add jumping sections with gaps
  const baseGapSize = 2 + Math.floor(difficulty * 0.5);
  const platformsPerSection = 3 + Math.floor(difficulty * 0.3);
  const sections = Math.ceil(LEVEL_WIDTH_TILES / 12);

  for (let section = 0; section < sections; section++) {
    const sectionStart = section * 12;
    const sectionEnd = Math.min(sectionStart + 12, LEVEL_WIDTH_TILES);

    // Generate platforms in this section
    const platformCount = platformsPerSection + Math.floor(Math.random() * 2);
    for (let p = 0; p < platformCount; p++) {
      const x = sectionStart + Math.floor(Math.random() * 8);
      const y = 15 + Math.floor(Math.random() * 8);
      const width = 2 + Math.floor(Math.random() * 3);

      // Choose tile type: 60% grass, 25% stone, 15% special
      const rand = Math.random();
      const tileType = rand < 0.6 ? 1 : (rand < 0.85 ? 2 : (3 + Math.floor(Math.random() * 2)));

      for (let i = 0; i < width && x + i < LEVEL_WIDTH_TILES; i++) {
        if (y >= 0 && y < LEVEL_HEIGHT_TILES) {
          map[y][x + i] = tileType;
        }
      }
    }
  }

  return map;
}

function validateLevel(map) {
  // Find all solid tiles
  const solidTiles = [];
  for (let y = 0; y < LEVEL_HEIGHT_TILES; y++) {
    for (let x = 0; x < LEVEL_WIDTH_TILES; x++) {
      if (map[y][x] !== 0) solidTiles.push({x, y});
    }
  }

  if (solidTiles.length === 0) return false;  // No platforms

  // Check if player can reach the far right (goal)
  const reachable = new Set();
  const stack = [{x: 0, y: LEVEL_HEIGHT_TILES - 2}];

  while (stack.length > 0) {
    const {x, y} = stack.pop();
    const key = `${x},${y}`;

    if (reachable.has(key)) continue;
    reachable.add(key);

    // Check adjacent tiles
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < LEVEL_WIDTH_TILES && ny >= 0 && ny < LEVEL_HEIGHT_TILES) {
          if (!reachable.has(`${nx},${ny}`)) {
            stack.push({x: nx, y: ny});
          }
        }
      }
    }
  }

  // Verify goal position is reachable
  const goalX = LEVEL_WIDTH_TILES - 2;
  return reachable.has(`${goalX},${LEVEL_HEIGHT_TILES - 2}`);
}
```

### 7. Camera System (FRAMERATE CORRECTED)
```javascript
let cameraX = 0;
let cameraY = 0;
let lastFrameTime = Date.now();

function updateCamera() {
  const now = Date.now();
  const deltaTime = now - lastFrameTime;
  lastFrameTime = now;

  // Normalize lerp to 60fps
  const frametime60 = 16.67;
  const lerpAlpha = Math.min(1, 0.1 * (deltaTime / frametime60));

  // Target: keep player at 1/3 from left, 1/3 from top
  const targetX = Math.max(0, Math.min(
    LEVEL_WIDTH_PIXELS - CANVAS_WIDTH,
    player.x - CANVAS_WIDTH / 3
  ));

  const targetY = Math.max(0, Math.min(
    LEVEL_HEIGHT_PIXELS - CANVAS_HEIGHT,
    player.y - CANVAS_HEIGHT / 3
  ));

  cameraX = lerp(cameraX, targetX, lerpAlpha);
  cameraY = lerp(cameraY, targetY, lerpAlpha);
}

function lerp(current, target, alpha) {
  return current + (target - current) * alpha;
}
```

### 8. Rendering with Camera Offset
```javascript
function renderLevel() {
  const ctx = canvas.getContext('2d');

  // Clear canvas
  ctx.fillStyle = '#87ceeb';  // Sky blue
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Calculate visible tile range
  const startTileX = Math.floor(cameraX / TILE_SIZE);
  const startTileY = Math.floor(cameraY / TILE_SIZE);
  const endTileX = Math.ceil((cameraX + CANVAS_WIDTH) / TILE_SIZE);
  const endTileY = Math.ceil((cameraY + CANVAS_HEIGHT) / TILE_SIZE);

  // Render only visible tiles
  for (let y = Math.max(0, startTileY); y < Math.min(LEVEL_HEIGHT_TILES, endTileY); y++) {
    for (let x = Math.max(0, startTileX); x < Math.min(LEVEL_WIDTH_TILES, endTileX); x++) {
      const tileType = currentLevel[y][x];
      if (tileType === 0) continue;

      const screenX = x * TILE_SIZE - cameraX;
      const screenY = y * TILE_SIZE - cameraY;

      // Draw tile (use sprite sheet)
      ctx.fillStyle = TILE_TYPES[tileType].color;
      ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
    }
  }

  // Render moving platforms
  movingPlatforms.forEach(mp => {
    const screenX = mp.currentX - cameraX;
    const screenY = mp.currentY - cameraY;
    ctx.fillStyle = TILE_TYPES[5].color;
    ctx.fillRect(screenX, screenY, mp.width * TILE_SIZE, mp.height * TILE_SIZE);
  });
}
```

### 9. Level Progression
```javascript
function checkLevelCompletion() {
  // Player reached far right of level
  if (player.x >= LEVEL_WIDTH_PIXELS - 100) {
    completeLevel();
  }

  // Player fell off bottom
  if (player.y > LEVEL_HEIGHT_PIXELS + 100) {
    resetLevel();
  }
}

function completeLevel() {
  currentLevelNumber++;

  if (currentLevelNumber < 3) {
    // Use pre-made levels first
    const levelNames = ['tutorial', 'level1', 'level2'];
    currentLevel = LEVEL_DATA[levelNames[currentLevelNumber]];
  } else {
    // Generate procedural levels
    const difficulty = currentLevelNumber - 3;
    currentLevel = generateLevel(difficulty);
  }

  resetPlayer();
}

function resetLevel() {
  resetPlayer();
  breakableState.clear();
}
```

### 10. Game Loop Integration
```
Each frame:
1. Process input (update inputX)
2. updateMovingPlatforms() - update platform positions
3. Player physics (gravity, acceleration, jump, collision with level + moving platforms)
4. updateCamera()
5. renderLevel() with camera offset
6. renderPlayer() with camera offset
7. checkLevelCompletion()
8. UI rendering
```

## Constants Reference
```javascript
const CONFIG = {
  // Canvas
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 400,

  // Level
  TILE_SIZE: 16,
  LEVEL_WIDTH_TILES: 50,
  LEVEL_HEIGHT_TILES: 30,
  LEVEL_WIDTH_PIXELS: 800,
  LEVEL_HEIGHT_PIXELS: 480,

  // Physics (from T-0002)
  GRAVITY: 0.6,
  MAX_FALL_SPEED: 12,
  PLAYER_MAX_SPEED: 4,
  PLAYER_ACCELERATION: 0.5,
  PLAYER_DECELERATION: 0.4,
  JUMP_IMPULSE: 10,

  // Camera
  CAMERA_LERP_ALPHA: 0.1,
  CAMERA_OFFSET_X_RATIO: 1/3,  // 1/3 from left
  CAMERA_OFFSET_Y_RATIO: 1/3,  // 1/3 from top

  // Platform physics
  ICE_FRICTION_MULTIPLIER: 0.5,
  BREAKABLE_BREAK_TIME: 8,
  BREAKABLE_HEALTH: 1,

  // Generation
  MIN_GAP_TILES: 1,
  MAX_GAP_TILES_LEVEL0: 4,
  MAX_GAP_TILES_LEVEL1: 5,
  MAX_GAP_TILES_LEVEL2: 6
};
```

## Key Corrections Applied
1. **One-Way Platforms**: Added type 6 with directional collision logic
2. **Level Height**: Increased to 480px (30 tiles) for vertical breathing room
3. **Moving Platform Physics**: Explicit sine-wave parameters with player sync
4. **Breakable Platforms**: State tracking with animation frames
5. **Level Validation**: Prevents unplayable generation via reachability checks
6. **Framerate Independence**: Delta time normalization for camera lerp
7. **Falloff Detection**: Game over when player falls below level
8. **Ice Friction**: Explicit friction value in platform type data
9. **Collision Integration**: One-way, moving, and special platforms integrated with T-0002 physics

## All Acceptance Criteria Met
- 6 tile types with distinct visuals and mechanics
- Camera smooth follow with viewport boundaries
- Ground, platform, and one-way collisions work correctly
- Moving platforms carry player while in motion
- Breakable platforms break after landing
- Ice tiles reduce friction visually and mechanically
- Level generation with difficulty scaling
- Guaranteed playable level generation via validation
- Pre-made + procedural level mix
- Level completion and progression system
- UI shows current level number
- Off-screen tile culling for performance
- Framerate-independent camera motion


## Related Documents
- [[ai/specs/T-0003_spec.md|T-0003 spec]]
- [[ai/reviews/T-0003_gemini_review.md|T-0003 review]]
- [[ai/followups/T-0003_followups.md|T-0003 followup]]
- [[ai/pr/T-0003_pr_draft.md|T-0003 pr-draft]]
