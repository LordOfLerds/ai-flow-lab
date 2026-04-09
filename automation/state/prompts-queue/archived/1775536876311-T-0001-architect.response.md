# T-0001 Spec: Set up HTML canvas, game loop, and pixel-art rendering engine

## Overview
Create the foundational single-file HTML game with canvas rendering, core game loop, camera system, and pixel-art sprite utilities.

## Target File
- `index.html` — single file containing all HTML, CSS, and JavaScript

## Technical Design

### HTML Structure
- Dark-themed page (background: #0f0f23)
- Centered container with 800x400 canvas
- HUD overlay div above canvas for score/XP display
- Menu overlay div for start/game-over screens

### CSS
- Reset styles, dark background, pixel-art rendering (image-rendering: pixelated)
- Canvas border with subtle glow effect
- Flexbox centering

### Game Loop
- requestAnimationFrame with delta-time calculation
- Fixed timestep accumulator pattern (16.67ms tick = 60 FPS logic)
- State machine: MENU, PLAYING, GAME_OVER, SKIN_SELECT
- Separate update(dt) and render() functions

### Camera/Viewport System
- Camera object: { x, y, width: 800, height: 400 }
- Smooth lerp following player (0.1 factor)
- Camera clamped to level bounds
- All rendering offset by -camera.x, -camera.y

### Pixel-Art Sprite Renderer
- drawSprite(ctx, spriteData, x, y, scale) function
- Sprite data: 2D array of hex color strings (null = transparent)
- Base tile size: TILE_SIZE = 16
- drawRect helper for individual pixels
- Predefined color palettes

### Input System
- keys object tracking pressed state
- Support: ArrowLeft, ArrowRight, ArrowUp, Space, Shift, a, d, w, s
- keydown/keyup listeners with preventDefault

### Core Constants
CONFIG = { CANVAS_WIDTH: 800, CANVAS_HEIGHT: 400, TILE_SIZE: 16, GRAVITY: 0.6, MAX_FALL_SPEED: 12, FPS: 60 }

### Game State Object
gameState = { phase: 'MENU', player: null, level: null, camera: {x:0,y:0}, score: 0, coins: 0, xp: 0, entities: [], particles: [], powerUps: [] }

## Acceptance Criteria
1. Single HTML file loads with dark background and 800x400 canvas
2. Game loop runs at 60 FPS with delta-time
3. Camera system smoothly follows a target position
4. drawSprite() renders pixel-art from 2D color arrays
5. Input system tracks multiple simultaneous keys
6. Game state machine transitions between phases
7. No external dependencies