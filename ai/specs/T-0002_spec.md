# T-0002: Player Character Architecture Spec

## Overview
Implement a fully-functional player character with physics simulation, collision detection, and input controls. The player will be a 16x24 pixel sprite with gravity-based movement, jumping mechanics with coyote time, and support for WASD and arrow key controls.

## Target File
`index.html` (single HTML file with embedded JavaScript and Canvas)

## Technical Design

### 1. Player Object Structure
Create a Player class with the following properties:
- `x, y`: Current position (pixels)
- `width: 16, height: 24`: Sprite dimensions
- `velocityX, velocityY`: Current velocity
- `isJumping: false`: Jump state
- `isGrounded: false`: Ground collision state
- `coyoteCounter: 0`: Coyote time grace period counter
- `coyoteTime: 4`: Max frames of coyote time (allows jump shortly after leaving ground)
- `currentAnimation`: Current animation state (idle, run-left, run-right, jump)
- `animationFrame: 0`: Current frame in animation sequence
- `animationTimer: 0`: Counter for animation frame timing
- `jumpForce: 0`: Current jump impulse being applied
- `isRunning: false`: Horizontal input state

### 2. Physics System
**Gravity and Velocity:**
- Apply gravity constant: `0.6` pixels/frame²
- Max fall speed: `12` pixels/frame
- Apply velocity each frame: `player.y += velocityY`
- Clamp velocityY to max fall speed

**Horizontal Movement:**
- Acceleration: `0.5` pixels/frame² when keys pressed
- Deceleration: `0.4` pixels/frame² when no keys pressed
- Max horizontal speed: `4` pixels/frame
- Apply velocity each frame: `player.x += velocityX`

**Jump Mechanics:**
- Jump input sets up a charge system
- While jump button held: increase jumpForce up to max impulse `10`
- On release: apply jumpForce as negative velocityY (upward)
- Prevents multiple jumps in air (requires grounded or coyote time)

### 3. Collision Detection

**Ground Detection:**
- Check if player bottom (y + height) intersects platform/terrain at y+1
- Check TILE_SIZE grid below current position
- Set `isGrounded = true` if collision found
- Increment coyoteCounter when grounded, reset to 0 when airborne

**Wall Collision:**
- Check left/right tiles when moving horizontally
- Block movement if collision detected in direction of travel
- Prevent tunneling by checking multiple collision points

**Platform Collision:**
- Platforms are defined by tilemap data
- Check collisions against solid tiles at TILE_SIZE (16px) intervals
- Allow one-way platforms (bottom collision only)

### 4. Input Handling
**Keyboard Support:**
- WASD: W=up, A=left, D=right, S=down (optional)
- Arrow keys: left/right for movement, up/space for jump
- Track key press/release events in input state object
- Continuous polling in game loop

**Input Processing:**
- Left/Right (A/D or arrows): set horizontal input direction
- Up/Space: initiate jump sequence
- Maintain state between frames for smooth movement

### 5. Animation System
**State-based animations:**
- `idle`: 2 frames, default state
- `run-left`: 4 frames, plays when moving left
- `run-right`: 4 frames, plays when moving right
- `jump`: 2 frames, plays when airborne

**Animation Timing:**
- Update animationTimer each frame
- Switch frame every 6-8 ticks (adjust for smoothness)
- Loop animations when completed
- Reset when state changes

### 6. Game Loop Integration
```
Each frame:
1. Process input
2. Update velocities (apply gravity, acceleration)
3. Update position (apply velocities)
4. Collision detection (ground, walls)
5. Update animation state and frames
6. Render player sprite at current position
```

## Acceptance Criteria
1. Player sprite renders on canvas at correct position
2. Gravity pulls player down at correct rate
3. Jump applies upward impulse and can be charged (hold duration matters)
4. Player lands on platforms and stops falling
5. Horizontal movement accelerates/decelerates smoothly
6. WASD and arrow keys both work for input
7. Coyote time allows jumping within 4 frames of leaving ground
8. Animation switches between idle, run-left, run-right, jump states
9. Player cannot jump while airborne (except via coyote time)
10. Player stops at screen edges and platform boundaries
11. Wall collisions prevent horizontal movement into solid tiles
12. No sprite tunneling through solid objects
13. State persists correctly between frames (velocities, positions, animations)

## Constants Reference
- `CANVAS_WIDTH: 800`
- `CANVAS_HEIGHT: 400`
- `TILE_SIZE: 16`
- `GRAVITY: 0.6`
- `MAX_FALL_SPEED: 12`
- `PLAYER_WIDTH: 16`
- `PLAYER_HEIGHT: 24`
- `PLAYER_MAX_SPEED: 4`
- `PLAYER_JUMP_IMPULSE: 10`
- `PLAYER_ACCELERATION: 0.5`
- `PLAYER_DECELERATION: 0.4`
- `COYOTE_TIME: 4`
