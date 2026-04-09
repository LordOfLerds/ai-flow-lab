# Critique: T-0002 Player Character Architecture

## Review Target
Architect spec for player character implementation with physics, collision detection, and input handling.

## Contradictions
1. **Coyote Time Logic**: Spec states "increment coyoteCounter when grounded, reset to 0 when airborne" but this is backwards. Should increment when *airborne* and reset when grounded. Coyote time allows jumping shortly *after* leaving ground, not while on it.

2. **Jump Input Charge**: Spec mentions "charge system" where jumpForce increases while button held, but standard game design for variable jump height uses *velocity retention* - holding the button keeps upward velocity, releasing stops applying upward force. The proposed charge system is non-standard and harder to feel good.

## Missing Edge Cases
1. **Wall Sliding**: No mention of handling vertical wall collisions while jumping - player can get stuck when jumping into corners.

2. **Platform One-Way Mechanics**: Spec mentions one-way platforms but provides no implementation detail for bottom-collision-only logic or handling player dropping through from above.

3. **Input Buffering**: No buffer for jump input - if player presses jump 1-2 frames before landing, they won't jump. Should buffer input for 1-2 frames.

4. **Sprite Direction Persistence**: No mention of which direction player faces when idle - should face last movement direction.

5. **Falling State Animation**: Jump animation plays on any airborne, but should differentiate rising vs falling for proper feel.

## Scope Risks
1. **Animation Timing Complexity**: Spec mentions 6-8 ticks per frame but doesn't specify how this varies per animation - run cycles need different timing than idle.

2. **Collision Grid Assumption**: Relies on TILE_SIZE grid but doesn't clarify if collision checks are tile-aligned or free-form collision boxes.

3. **Velocity Clamping Order**: Gravity applied before velocity clamping means max fall speed check might miss initial jump frames.

## Missing Tests
1. No acceptance criteria for input buffering behavior
2. No test for falling through one-way platforms when jumping from below
3. No test for corner trapping with wall+ceiling collisions
4. No test for animation consistency with rapid direction changes
5. No test for consistency between WASD and arrow key input

## Hidden Assumptions
1. Assumes integer pixel positions (no sub-pixel physics) - acceptable but should be explicit
2. Assumes Canvas 2D API will be used for rendering
3. Assumes 60fps game loop (ticks for animation timing aren't framerate-independent)
4. Assumes keyboard input has no debouncing needs
5. Assumes all platforms are axis-aligned rectangles

## Recommended Corrections

### 1. Fix Coyote Time Direction
Change collision section:
```
When airborne: increment coyoteCounter (max COYOTE_TIME)
When grounded: reset coyoteCounter to 0
When jumping: check coyoteCounter OR isGrounded to allow jump
```

### 2. Improve Jump Feel
Replace charge system with standard variable jump height:
```
On jump input press: set jumpPressed = true, jumpHeld = true
In physics: if jumpHeld, apply upward force each frame
On jump release: set jumpHeld = false (stop upward force)
Allows player to control jump height by release timing
```

### 3. Add Input Buffering
```
jumpBuffer = 0 (frames)
On jump input: jumpBuffer = 2
Each frame: if jumpBuffer > 0 and (isGrounded or coyoteCounter > 0) then jump
Decrements jumpBuffer each frame
```

### 4. Clarify Collision System
- Specify that collision checks use axis-aligned bounding boxes
- Define grid-aligned collision as checking 16px tiles
- Add separate method for checking free-form box collisions vs tile collisions

### 5. Separate Fall Animation
```
animationState can be:
- idle
- run-left / run-right
- jump-rising (while velocityY < 0)
- jump-falling (while velocityY >= 0 and airborne)
```

### 6. Framerate Independence
Use deltaTime or normalize animation ticks to framerate:
```
animationTimer += deltaTime
If timer > FRAME_DURATION: switch frame, reset timer
```

## Priority
**High**: Coyote time logic fix and jump input clarification - these affect core gameplay feel.
**Medium**: Input buffering and animation state expansion - improves feel but not blocking.
**Low**: Framerate independence and collision clarification - good-to-have for robustness.
