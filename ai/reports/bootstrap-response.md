## OUTPUT: DOMAIN_MODEL.md

# Domain Model — snake-game

## Scope
This project is a **single-player Snake game implemented in one self-contained HTML file** using HTML, CSS, and JavaScript. There is **no backend database** and no external services. The domain model therefore focuses on **runtime state in the browser** and optional **local persistence via `localStorage`** for best score and settings.

---

## Core Entities

### 1. `GameSession`
Represents one playable run from start until game over or restart.

| Attribute | Type | Constraints | Description |
|---|---|---|---|
| `sessionId` | `string` | non-empty, unique per run | Unique identifier for the current play session |
| `status` | `'idle' \| 'running' \| 'paused' \| 'gameOver'` | required | Current lifecycle state |
| `score` | `number` | integer, `>= 0` | Current score |
| `tickMs` | `number` | integer, `> 0` | Current game loop interval in milliseconds |
| `baseTickMs` | `number` | integer, `> 0` | Initial speed before acceleration |
| `minTickMs` | `number` | integer, `> 0`, `<= baseTickMs` | Lower bound for speed increase |
| `speedStepMs` | `number` | integer, `>= 0` | Milliseconds reduced after qualifying score/food events |
| `foodsEaten` | `number` | integer, `>= 0` | Count of food consumed in this session |
| `gridWidth` | `number` | integer, `>= 5` | Number of horizontal grid cells |
| `gridHeight` | `number` | integer, `>= 5` | Number of vertical grid cells |
| `cellSizePx` | `number` | integer, `>= 8` | Render size of one grid cell |
| `lastTickAt` | `number` | timestamp in ms, nullable | Time of most recent game update |
| `startedAt` | `number` | timestamp in ms | Session start time |
| `endedAt` | `number` | timestamp in ms, nullable | Session end time if game over |

#### Key Invariants
- `score >= 0`
- `foodsEaten >= 0`
- `tickMs >= minTickMs`
- `status === 'gameOver'` implies `endedAt != null`
- `status === 'running'` implies snake, food, and board are initialized

---

### 2. `Board`
Represents the playable grid and its dimensions.

| Attribute | Type | Constraints | Description |
|---|---|---|---|
| `width` | `number` | integer, `>= 5` | Grid columns |
| `height` | `number` | integer, `>= 5` | Grid rows |
| `pixelWidth` | `number` | integer, `> 0` | Canvas width in pixels |
| `pixelHeight` | `number` | integer, `> 0` | Canvas height in pixels |
| `cellSizePx` | `number` | integer, `>= 8` | Pixel size of each logical cell |
| `wrapWalls` | `boolean` | must be `false` for this project | Whether crossing edges wraps the snake |

#### Key Invariants
- `pixelWidth === width * cellSizePx`
- `pixelHeight === height * cellSizePx`
- `wrapWalls === false`
- Board dimensions must be large enough to fit initial snake and one food item

---

### 3. `Snake`
Represents the player-controlled snake.

| Attribute | Type | Constraints | Description |
|---|---|---|---|
| `segments` | `GridPosition[]` | length `>= 1`; all unique while alive | Ordered body segments, head at index `0` |
| `direction` | `'up' \| 'down' \| 'left' \| 'right'` | required | Current committed movement direction |
| `nextDirection` | `'up' \| 'down' \| 'left' \| 'right'` | required | Queued direction to apply next tick |
| `pendingGrowth` | `number` | integer, `>= 0` | Number of future ticks where tail removal is skipped |
| `alive` | `boolean` | required | Whether snake is alive |
| `initialLength` | `number` | integer, `>= 2` | Starting length for restart/reset |

#### Key Invariants
- `segments[0]` is always the head
- All `segments` positions are within board bounds while `alive === true`
- `segments` contain no duplicates while `alive === true`
- `nextDirection` cannot be direct opposite of `direction` when snake length `> 1`
- `pendingGrowth >= 0`

---

### 4. `GridPosition`
Represents a coordinate on the board.

| Attribute | Type | Constraints | Description |
|---|---|---|---|
| `x` | `number` | integer, `0 <= x < board.width` | Column index |
| `y` | `number` | integer, `0 <= y < board.height` | Row index |

#### Key Invariants
- Position must always lie inside board bounds
- Equality is structural: two positions are equal if both `x` and `y` match

---

### 5. `Food`
Represents the consumable item the snake must eat.

| Attribute | Type | Constraints | Description |
|---|---|---|---|
| `position` | `GridPosition` | required, unoccupied by snake | Current food location |
| `value` | `number` | integer, default `1`, `> 0` | Score increment when eaten |
| `visible` | `boolean` | required | Whether food is currently rendered |

#### Key Invariants
- Exactly one visible food item exists during `running` state
- `food.position` must not overlap any snake segment
- `value` is fixed at `1` unless game design changes

---

### 6. `InputState`
Tracks keyboard intent for movement and restart.

| Attribute | Type | Constraints | Description |
|---|---|---|---|
| `lastKey` | `'ArrowUp' \| 'ArrowDown' \| 'ArrowLeft' \| 'ArrowRight' \| 'Enter' \| 'Space' \| null` | nullable | Most recent relevant key pressed |
| `queuedDirection` | `'up' \| 'down' \| 'left' \| 'right' \| null` | nullable | Latest valid direction input waiting for next tick |
| `restartRequested` | `boolean` | required | Whether restart has been requested from keyboard/button |

#### Key Invariants
- `queuedDirection` must map from an allowed arrow key only
- Restart input is ignored unless game state allows restart

---

### 7. `ScoreRecord`
Represents persisted scoring metadata in the browser.

| Attribute | Type | Constraints | Description |
|---|---|---|---|
| `currentScore` | `number` | integer, `>= 0` | Mirrors session score in UI |
| `bestScore` | `number` | integer, `>= 0` | Highest score stored in `localStorage` |
| `updatedAt` | `number` | timestamp in ms | Last persistence time |

#### Key Invariants
- `bestScore >= currentScore` is **not required**
- `bestScore` must be the maximum historical score observed and persisted
- `bestScore` never decreases unless storage is manually cleared

---

### 8. `RenderState`
Represents UI-facing display state derived from core entities.

| Attribute | Type | Constraints | Description |
|---|---|---|---|
| `showOverlay` | `boolean` | required | Whether game over/start overlay is visible |
| `overlayMode` | `'start' \| 'gameOver' \| null` | nullable | Overlay type |
| `scoreText` | `string` | non-empty during active UI | Score label |
| `bestScoreText` | `string` | non-empty if best score shown | Best score label |
| `restartButtonVisible` | `boolean` | required | Whether restart button is rendered/enabled |
| `canvasFocused` | `boolean` | required | Whether keyboard input should be accepted |

#### Key Invariants
- `overlayMode === 'gameOver'` implies `showOverlay === true`
- `restartButtonVisible === true` only in start/game-over contexts
- RenderState is always derivable from game/session state and must not become an independent source of truth

---

## Relationships Between Entities

### 1:1
- `GameSession` ↔ `Board`
  - One active session uses one board configuration.
- `GameSession` ↔ `Snake`
  - One active session has one snake.
- `GameSession` ↔ `Food`
  - One active session has one active food item at a time.
- `GameSession` ↔ `InputState`
  - One active session receives one current input state.
- `GameSession` ↔ `RenderState`
  - One active session produces one render state snapshot.
- `GameSession` ↔ `ScoreRecord`
  - One active session references one browser-local score record context.

### 1:N
- `Snake` ↔ `GridPosition`
  - One snake has many ordered segment positions.
- `Board` ↔ `GridPosition`
  - One board bounds many valid positions.

### M:N
- None required in this project.
  - The app is local, single-player, and has no accounts, multiplayer entities, or backend persistence graphs.

---

## Business Rules

1. **Snake movement**
   - On each tick, the snake advances one cell in `nextDirection` if valid; otherwise it continues in `direction`.
   - A direct 180-degree reversal is forbidden when snake length is greater than 1.
   - If snake length is 1, opposite direction may be allowed, but for simplicity the same no-reversal rule should still be applied consistently.

2. **Food consumption**
   - If snake head enters the food cell, score increases by `food.value`.
   - `foodsEaten` increments by 1.
   - `pendingGrowth` increments so the snake grows on this or subsequent movement resolution.
   - New food must spawn on a currently unoccupied board cell.

3. **Collision handling**
   - If head moves outside board bounds, game state becomes `gameOver`.
   - If head moves into any snake segment occupied after movement resolution rules, game state becomes `gameOver`.

4. **Speed increase**
   - After a defined number of food events or score thresholds, `tickMs` decreases by `speedStepMs`.
   - `tickMs` must never go below `minTickMs`.

5. **Responsive layout**
   - Canvas should resize to fit available viewport while preserving square cells and integer grid logic.
   - Visual scaling must not change logical board coordinates.

6. **Restart**
   - Restart resets snake, score, food, speed, and status for a new `sessionId`.
   - Persisted `bestScore` is retained across restarts.

7. **Persistence**
   - Only lightweight browser persistence is allowed, specifically `localStorage` for best score and optional user preferences.
   - Absence or failure of `localStorage` must not break gameplay.

---

## Entity Lifecycle States and Transitions

### `GameSession`
```text
idle -> running -> gameOver
idle -> running -> paused
paused -> running
gameOver -> running (via restart/new session)
```

#### Transition Rules
- `idle -> running`: triggered by initial start interaction
- `running -> paused`: optional if pause is implemented
- `running -> gameOver`: wall or self collision
- `gameOver -> running`: restart button or restart key creates a fresh session

---

### `Snake`
```text
initialized -> moving -> collided -> reset
```

#### Transition Rules
- `initialized`: created at game start with initial segments
- `moving`: once first tick is processed
- `collided`: head intersects wall or self
- `reset`: on restart, replaced by a newly initialized snake

---

### `Food`
```text
spawned -> consumed -> respawned
```

#### Transition Rules
- `spawned`: random valid empty cell chosen
- `consumed`: snake head reaches food position
- `respawned`: new position selected after consumption

---

### `RenderState`
```text
startOverlay -> gameplay -> gameOverOverlay -> gameplay
```

#### Transition Rules
- Start overlay shown before first run
- Gameplay view shown during active session
- Game-over overlay shown after collision
- Gameplay resumes after restart

---

## Key Invariants Per Entity

### GameSession
- Session clock values are monotonic: `startedAt <= lastTickAt <= endedAt` when present
- `status` determines allowed controls and UI
- A session in `running` has exactly one active loop timer or animation scheduling chain

### Board
- Grid dimensions are integers and stable during a session
- Wall collisions are lethal; no wrap-around is permitted

### Snake
- Head always moves by Manhattan distance exactly `1` per tick
- Segment order is contiguous: each segment is adjacent to its predecessor after movement resolution
- Body length equals `initialLength + foodsEaten` minus any pending-growth timing not yet materialized

### Food
- Food always occupies a free cell
- Food is always visible during active gameplay unless game-over overlay suspends rendering

### ScoreRecord
- Best score update occurs immediately when current score exceeds previous best
- Failure to persist best score does not alter in-memory game correctness

### InputState
- One direction change maximum is committed per game tick
- Inputs received between ticks update queued intent, not multiple sequential moves

### RenderState
- Must reflect, not override, core game state
- Game-over screen must show final score and restart affordance

---

## Edge Cases to Model Explicitly

1. **Food spawn exhaustion**
   - If snake occupies every board cell, the player has effectively won.
   - The session may transition to `gameOver` or `completed` if such a state is added later.
   - For current scope, treat this as terminal with a winning message or graceful stop.

2. **Very small viewport**
   - Canvas may scale down visually, but logical board dimensions must remain valid.
   - UI controls must remain accessible even when canvas is constrained.

3. **Input bursts**
   - Multiple rapid arrow presses between ticks must not allow illegal self-bypassing movement.

4. **Restart spam**
   - Repeated restart requests must not create multiple concurrent game loops.

5. **Storage unavailable**
   - If `localStorage` throws, fall back to in-memory best score for current page lifetime.

---

## OUTPUT: ARCHITECTURE.md

# Architecture — snake-game

## System Overview

`snake-game` is a **client-only browser application** delivered as **one self-contained HTML file**. The file includes:

- HTML structure for canvas, score HUD, overlay, and restart control
- Embedded CSS for layout, responsive sizing, and visual styling
- Embedded JavaScript for game logic, rendering, input handling, and local persistence

### High-Level Components

1. **Game Bootstrap**
   - Initializes canvas, DOM references, default config, and event listeners
   - Loads persisted best score from `localStorage`
   - Creates the initial game state

2. **Game State Store**
   - Holds in-memory authoritative state:
     - board dimensions
     - snake segments and direction
     - food position
     - score
     - speed/tick interval
     - current lifecycle status

3. **Input Controller**
   - Listens for keyboard input (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`)
   - Validates directional changes
   - Handles restart interactions via keyboard and button

4. **Game Loop Engine**
   - Advances simulation on a fixed-timestep schedule using `setInterval` or a timestamp-driven `requestAnimationFrame`
   - Computes movement, food consumption, growth, collision detection, scoring, and speed progression

5. **Renderer**
   - Draws board, snake, food, score, and overlays onto the canvas and surrounding DOM
   - Updates the responsive canvas size based on viewport and configuration

6. **Persistence Adapter**
   - Reads/writes best score from `localStorage`
   - Gracefully degrades if storage access fails

### Component Connection Diagram
```text
User Input
   ↓
Input Controller
   ↓
Game State Store ←→ Game Loop Engine
   ↓                     ↓
Renderer            Persistence Adapter
   ↓
Canvas + DOM HUD
```

---

## Technology Stack Recommendations

### Core Stack
- **Language:** Vanilla JavaScript (ES2020+)
- **Markup:** HTML5
- **Styling:** Embedded CSS3
- **Rendering:** HTML5 Canvas 2D API
- **Persistence:** Browser `localStorage`
- **Packaging:** None required; single static `.html` file

### Why this stack
- Meets the hard requirement of **one self-contained HTML file**
- No framework overhead
- Canvas is the natural fit for a grid-based arcade game
- `localStorage` is sufficient for best score persistence
- No database or server is needed

### Recommended Runtime Structure Inside the Single File
Use embedded `<script>` modules or clearly separated code regions:

- `CONFIG`
- `STATE`
- `UTILS`
- `INPUT`
- `GAME_LOOP`
- `RENDER`
- `PERSISTENCE`
- `BOOTSTRAP`

This preserves maintainability despite the single-file constraint.

---

## Data Flow

## 1. Startup Flow
```text
HTML loads
→ bootstrap script runs
→ DOM/canvas references captured
→ best score loaded from localStorage
→ initial GameSession, Snake, Food, Board state created
→ start overlay rendered
```

## 2. Gameplay Tick Flow
```text
Timer/frame event
→ consume queued input
→ compute next head position
→ validate wall collision
→ validate self collision
→ detect food consumption
→ update snake segments
→ update score and speed
→ respawn food if needed
→ persist best score if exceeded
→ render updated frame
```

## 3. Restart Flow
```text
Restart button/key
→ stop existing loop
→ create new session state
→ reset score/speed/snake/food
→ preserve best score
→ start loop
→ render gameplay
```

## 4. Resize Flow
```text
Window resize
→ recompute display size
→ update canvas pixel dimensions
→ redraw current state
```

---

## API Design

Because this app is fully client-side and self-contained, there is **no network API**.

### Internal API Recommendation
Use internal function boundaries as the effective API.

#### State/Session API
- `createInitialState(): GameState`
- `startGame(): void`
- `restartGame(): void`
- `endGame(reason): void`

#### Input API
- `handleKeyDown(event): void`
- `queueDirection(direction): void`
- `requestRestart(): void`

#### Simulation API
- `tick(now): void`
- `computeNextHead(snake, direction): GridPosition`
- `detectCollision(state, nextHead): CollisionResult`
- `consumeFoodIfPresent(state, nextHead): boolean`
- `spawnFood(state): GridPosition`
- `updateSpeed(state): void`

#### Rendering API
- `render(state): void`
- `renderBoard(ctx, state): void`
- `renderSnake(ctx, snake): void`
- `renderFood(ctx, food): void`
- `renderOverlay(state): void`
- `resizeCanvas(): void`

#### Persistence API
- `loadBestScore(): number`
- `saveBestScore(score): void`

### If a local test harness is desired
A debug query-string contract may be added:
- `?debug=true`
- `?grid=20x20`
- `?speed=140`

These are not network APIs; they are configuration inputs parsed in-browser.

---

## Deployment Topology

Since this is a static single-file app, topology is minimal.

### Development
- Run locally by opening `snake-game.html` in a browser
- Or serve via a simple static server for consistency:
  - `python -m http.server`
  - `npx serve`
- Browser DevTools used for debugging and performance inspection

### Staging
- Host the exact HTML file on a static preview environment:
  - GitHub Pages
  - Netlify preview
  - Vercel static deployment

### Production
- Host as static content on:
  - GitHub Pages
  - Netlify
  - Vercel
  - S3 + CloudFront
- No application server, worker, or database required

### Deployment Artifact
- Single file: `index.html` or `snake-game.html`

### Environment Differences
- Ideally none
- Optional debug flags disabled by default in production
- Storage behavior may vary by browser privacy mode and must be tolerated

---

## Security Model

This project has **no user authentication**, **no accounts**, and **no backend**.

### Authentication
- None required

### Authorization
- None required
- All code and UI are available to any browser user

### Data Protection
- No sensitive user data should be collected
- Only non-sensitive local data may be stored:
  - best score
  - optional preferences such as muted state or board size, if added later

### Encryption
- No application-level encryption required
- If hosted publicly, transport security should rely on HTTPS from the static host

### Browser Security Considerations
- Do not use `eval`, `new Function`, or dynamic script injection
- Do not load external assets or remote scripts
- Sanitize any values parsed from query parameters before using them in config
- Do not trust `localStorage` values; validate and coerce them
- Keep DOM updates text-only where possible to avoid HTML injection

### Security Boundaries
- The browser runtime is the only execution environment
- `localStorage` is considered user-controlled and non-trusted input

---

## Performance Characteristics and SLAs

## Performance Targets
- Input-to-visible-response: **< 100 ms** under normal desktop/mobile browser conditions
- Render budget: **< 16 ms per frame** on common devices for smooth 60 FPS drawing capability
- Tick processing time: **< 4 ms** for standard board sizes such as `20x20`
- Restart action to playable state: **< 200 ms**
- Initial load to first render: **< 1 s** on modern browsers

## Throughput Characteristics
- Simulation complexity per tick should be small:
  - O(n) over snake length for collision checks is acceptable
- Typical max board sizes should remain performant without optimization-heavy structures
- If larger boards are introduced, optional occupancy sets can reduce collision/spawn overhead

## Availability / SLA
For this local static app, traditional server SLAs do not apply. Instead:

- **Gameplay responsiveness:** no dropped input due to duplicate loops or blocked rendering
- **State integrity:** no inconsistent state after restart or resize
- **Persistence resilience:** failure of `localStorage` must not crash the app

## Performance Risks
- Multiple active intervals after restart
- Excessive canvas resizing on every frame
- Rebuilding expensive derived structures unnecessarily
- Using floating-point display dimensions without preserving logical grid alignment
- Food spawn loops degrading when board occupancy becomes very high

## Performance Mitigations
- Ensure exactly one active game loop
- Separate logical board size from visual canvas scaling
- Redraw only once per tick/frame
- Use integer coordinates for all grid logic
- On high occupancy, compute free cells deterministically rather than retrying random positions indefinitely

---

## OUTPUT: INVARIANTS.md

# System Invariants — snake-game

## Data Integrity Invariants

Even though this project does not use a database, the following invariants must always hold for in-memory state and any browser-local persisted values.

### Board
- `board.width` and `board.height` are integers greater than or equal to 5
- `board.cellSizePx` is a positive integer
- `board.pixelWidth = board.width * board.cellSizePx`
- `board.pixelHeight = board.height * board.cellSizePx`
- Wall wrapping is disabled at all times

### Snake
- `snake.segments.length >= 1`
- All snake segment coordinates are valid board positions
- No duplicate segment coordinates exist while the snake is alive
- `snake.segments[0]` is the head
- Adjacent snake segments differ by Manhattan distance exactly 1
- `snake.pendingGrowth >= 0`
- `snake.direction` is always one of `up/down/left/right`
- `snake.nextDirection` is always one of `up/down/left/right`

### Food
- Exactly one food item exists during active gameplay
- Food position is a valid board coordinate
- Food position never overlaps any snake segment during `running`
- Food value is a positive integer

### Score and Session
- `score >= 0`
- `foodsEaten >= 0`
- `bestScore >= 0`
- `bestScore` never decreases during a page session
- `tickMs > 0`
- `minTickMs > 0`
- `tickMs >= minTickMs`
- `status` is always one of `idle/running/paused/gameOver`

### Persistence
- Persisted best score, if present, must parse to a finite integer `>= 0`
- Invalid persisted values must be ignored and replaced with safe defaults
- Persistence failure must not corrupt in-memory score state

---

## Process Invariants

### Startup
- The game must initialize to a valid non-crashed state even if:
  - `localStorage` is unavailable
  - viewport is very small
  - query-string config is missing or invalid

### Input Handling
- At most one direction change is committed per simulation tick
- A 180-degree turn into the snake’s own neck must never be accepted
- Non-game keys must not mutate game state
- Keyboard input must not trigger browser scrolling during gameplay if preventable

### Tick Execution
- Each tick performs updates in deterministic order:
  1. consume queued input
  2. compute next head
  3. evaluate collisions
  4. resolve food consumption
  5. resolve body growth/tail movement
  6. update score/speed
  7. render
- A tick must operate against a coherent single state snapshot
- A tick must never partially apply updates and leave the state half-mutated

### Restart
- Restart always stops the previous loop before a new one starts
- Restart creates a fresh snake, food, score, and timing state
- Restart preserves persisted `bestScore`
- Repeated restart actions must be idempotent in effect: one active session, one active loop

### Game Over
- Once `status = gameOver`, snake movement must cease
- Input may request restart, but may not continue movement in the dead session
- Final score shown on the overlay must equal the last committed session score

---

## Consistency Rules

### In-Memory Consistency
- The in-memory game state is the single source of truth
- Rendered DOM and canvas output are derived from current state and must not store independent game logic

### Persistence Consistency
- Best score should be written immediately when current score exceeds persisted best
- If persistence write fails, in-memory best score may still update for the current page session
- On reload, persisted best score becomes the initial best score if valid

### Render Consistency
- HUD score text must match state score on every render
- Game-over overlay must use the same score and reason already committed to state
- Canvas drawing and HUD/overlay DOM updates must refer to the same state version per frame

### Resize Consistency
- Window resizing may change visual canvas dimensions only
- Resize must not mutate logical snake positions, score, speed, or food coordinates

### Eventual Consistency
- Not applicable in distributed-systems terms because there is no backend or multi-node state
- Local UI consistency should be immediate within the same animation/tick cycle

---

## Security Invariants

### Input and Storage Safety
- No unvalidated query-string or storage value may directly control unsafe DOM injection
- All text inserted into overlays/HUD must be text content, not raw HTML
- No remote code, scripts, or assets may be loaded at runtime

### Access Control
- There is no auth model, but all game actions must still respect lifecycle rules:
  - move only during `running`
  - restart only during `idle` or `gameOver` or by explicit reset logic
- Internal debug features, if any, must be clearly isolated and disabled by default in production

### Safe Execution
- The app must not use `eval` or equivalent dynamic code execution
- The app must tolerate hostile or malformed `localStorage` values without crash

### Privacy
- No personally identifiable information is collected, transmitted, or persisted
- Only non-sensitive gameplay metadata may be stored locally

---

## Performance Invariants

### Loop Integrity
- There must never be more than one active simulation loop per session
- Tick scheduling must remain bounded and not accelerate unintentionally due to stacked timers

### Latency
- Input to game-state application should occur by the next tick at latest
- Render after tick should happen within the same frame cycle under normal conditions

### Computational Boundaries
- Collision detection and food spawning must complete in finite time
- Food spawning must avoid infinite loops when the board is nearly full
- Resize handling must not trigger unnecessary full reinitialization of state

### Resource Use
- No unbounded event listener accumulation
- No unbounded timer accumulation
- No memory growth from stale session references after restart

### Reliability
- A single rendering or storage error should not permanently lock the app if recoverable
- The app should remain playable on modern desktop and mobile browsers without requiring network connectivity after load

---

## OUTPUT: AGENTS.md

# AI Agents Configuration — snake-game

## Purpose
This document defines how AI agents should operate in the `snake-game` project, a **single-file HTML canvas game** with embedded CSS and JavaScript and **no external dependencies**.

The codebase is small, but correctness is sensitive because gameplay bugs often come from:
- timing issues
- illegal direction changes
- duplicate loops
- collision edge cases
- canvas resize side effects
- single-file maintainability problems

---

## Agent Roles

### 1. `architect-agent`
**Primary responsibilities**
- Define overall code structure inside the single HTML file
- Enforce separation of concerns despite single-file delivery
- Protect project constraints: one file, no dependencies, canvas-based rendering

**Typical tasks**
- State model design
- Module region planning inside `<script>`
- Choosing between `setInterval` and `requestAnimationFrame` loop design
- Defining restart and resize architecture

---

### 2. `gameplay-agent`
**Primary responsibilities**
- Implement and refine snake movement, growth, food spawning, scoring, and speed progression

**Typical tasks**
- Movement rules
- Collision detection
- Growth resolution
- Game-over logic
- Difficulty scaling

---

### 3. `ui-agent`
**Primary responsibilities**
- Canvas rendering, HUD layout, overlays, restart button behavior, responsive presentation

**Typical tasks**
- Draw snake and food
- Game over screen
- Score display
- Responsive canvas sizing
- Focus/interaction affordances

---

### 4. `bug-agent`
**Primary responsibilities**
- Reproduce and fix gameplay defects, state corruption, race-like timing bugs, and browser-specific issues

**Typical tasks**
- Duplicate interval bugs
- Direction queue bugs
- Off-by-one collision errors
- Food spawning inside snake
- Resize regression analysis

---

### 5. `test-agent`
**Primary responsibilities**
- Define lightweight test strategy appropriate for a single-file app
- Propose manual test matrices and optional in-browser self-check helpers

**Typical tasks**
- Edge-case test scenarios
- Deterministic simulation checks
- Invariant validation helpers
- Browser smoke test plans

---

### 6. `docs-agent`
**Primary responsibilities**
- Maintain concise project documentation that matches actual single-file implementation decisions

**Typical tasks**
- Update architecture notes
- Explain state model and controls
- Record known edge cases
- Keep gameplay rules explicit

---

### 7. `danger-agent`
**Primary responsibilities**
- Review risky changes that can silently break core gameplay or violate constraints

**Typical tasks**
- Loop timing rewrites
- Restart/state reset rewrites
- Resize logic rewrites
- Changes that add external assets, libraries, or extra files
- Debug-only code that may leak into production

---

## Lane Assignments

### `analysis` lane
Handled by:
- `architect-agent`
- `gameplay-agent`
- `danger-agent`

Use for:
- state modeling
- timing model decisions
- collision and spawn algorithm design
- responsive layout tradeoff analysis

### `bug` lane
Handled by:
- `bug-agent`
- `gameplay-agent`

Use for:
- movement bugs
- self-collision defects
- score/speed bugs
- restart issues
- localStorage edge cases

### `feature` lane
Handled by:
- `gameplay-agent`
- `ui-agent`
- `architect-agent`

Use for:
- playable snake implementation
- score HUD
- speed increase
- game-over overlay
- restart button
- responsive canvas

### `danger` lane
Handled by:
- `danger-agent`
- `architect-agent`

Use for:
- loop scheduler changes
- state reset semantics
- adding optional pause/debug features
- any proposal that threatens one-file/no-dependency constraints

### `docs` lane
Handled by:
- `docs-agent`
- `architect-agent`

Use for:
- architecture docs
- controls explanation
- invariants documentation
- change rationale summaries

### `test` lane
Handled by:
- `test-agent`
- `bug-agent`

Use for:
- manual test plans
- invariant checks
- deterministic scenario scripts
- cross-browser verification guidance

---

## Specific Rules For This Project

1. **One-file rule is absolute**
   - All production code must remain in a single self-contained HTML file.
   - Agents must not propose npm packages, bundlers, image assets, web fonts, or external libraries.

2. **Game state must have one source of truth**
   - No agent may split authoritative logic between DOM state and JS state.
   - Canvas/DOM is output only.

3. **Exactly one game loop**
   - Any restart/refactor must preserve the invariant that only one active loop exists.

4. **Grid logic must stay integer-based**
   - Agents must avoid sub-cell movement or floating-point gameplay positions.

5. **Input handling must be tick-safe**
   - Agents must guard against illegal reverse turns and multi-turn exploits within one tick.

6. **Responsive rendering must not alter logic**
   - Resize can affect pixels, not gameplay coordinates.

7. **Food spawning must be correct under high occupancy**
   - Agents must avoid naive infinite random retry loops when the snake nearly fills the board.

8. **Persistence is optional and non-critical**
   - `localStorage` errors must never block startup, play, or restart.

9. **No hidden scope creep**
   - Agents should not add multiplayer, backend scoring, sound systems, or settings menus unless explicitly requested.

10. **Accessibility and usability matter**
   - Controls and restart affordances should remain visible and understandable on small screens.

---

## What Agents Should Watch Out For

### Timing Hazards
- Multiple `setInterval` instances after restart
- Drift or double updates from mixing `requestAnimationFrame` and timers incorrectly
- Speed changes that recreate intervals unsafely

### State Hazards
- Mutating snake segments in the wrong order
- Collision checks against stale or already-shifted body data
- Tail handling bugs when food is eaten on the same tick
- Overlay state getting out of sync with game status

### Rendering Hazards
- Canvas blur from incorrect pixel sizing
- Resize causing board distortion
- HUD values lagging behind state by one tick
- Overlay intercepting controls unintentionally

### Persistence Hazards
- `localStorage` values being strings, `NaN`, negative, or unavailable
- Best score not updating when score changes rapidly

### Maintainability Hazards
- Large unstructured script blocks in the single file
- Magic numbers scattered through logic
- Interleaving rendering code with mutation-heavy simulation code

---

## Human Gate Requirements Specific To This Project

Human review is required before merging changes in these categories:

1. **Loop architecture changes**
   - Any switch between `setInterval` and `requestAnimationFrame`
   - Any change to tick scheduling or speed-change implementation

2. **State reset/restart changes**
   - Any change affecting session creation, restart semantics, or timer cleanup

3. **Collision logic changes**
   - Wall collision, self-collision, or head/tail movement ordering changes

4. **Food spawn algorithm changes**
   - Especially when changing near-full-board handling

5. **Single-file constraint exceptions**
   - Any proposal to add files, assets, frameworks, or dependencies must be rejected unless product requirements change

6. **Persistence additions**
   - Any new persisted field beyond best score requires explicit approval

7. **Debug features**
   - Query flags, cheat modes, or dev overlays must be reviewed to ensure they do not ship accidentally in user-facing builds

---

## Suggested Working Style For Agents

### Preferred implementation sequence
1. Define state shape
2. Implement deterministic game loop
3. Add input queueing
4. Add collision and food rules
5. Add rendering
6. Add restart and persistence
7. Add resize responsiveness
8. Validate with invariant-oriented tests

### Preferred output style
- Short, focused changes
- Explicit mention of affected invariants
- Clear distinction between logic changes and render-only changes
- Manual verification notes for keyboard, resize, restart, and game-over behavior

---

## OUTPUT: FIRST_GOAL

```text
GOAL_TITLE: Build the playable single-file Snake game foundation
GOAL_DESCRIPTION: Create the first complete vertical slice of snake-game as one self-contained HTML file with a responsive canvas, core game loop, keyboard movement, food spawning, score tracking, collision-based game over, and restart flow. This establishes the architecture and gameplay baseline for all future refinements.
TASKS:
- Create single-file app skeleton | feature | Build index.html with embedded HTML, CSS, and JavaScript regions for HUD, canvas, overlay, restart button, and clearly separated logic sections.
- Implement core simulation state and loop | feature | Add board, snake, food, score, input queue, tick scheduler, collision detection, growth, and increasing speed while guaranteeing exactly one active game loop.
- Document controls and validation checklist | docs | Write concise in-file or companion documentation describing arrow key controls, restart behavior, responsive resizing rules, and key manual test scenarios for collisions, food spawning, score updates, and restart correctness.
```