# Critique: T-0003 Level System Architecture

## Review Target
Architect spec for tile-based level system with procedural generation, camera follow, and platform types.

## Contradictions
1. **Level Dimensions Mismatch**: Spec defines levelHeight = 400px (25 tiles × 16px) but then has acceptance criteria about clamping camera to level boundaries with different height. If level is exactly canvas height, vertical camera clamping is unnecessary. Clarify if levels should be taller than viewport.

2. **Breakable Platform Timing**: Spec says "apply damage and trigger break animation (5 frames)" but no mention of how many hits required. Is it one hit and instant break, or damage accumulation? One-shot breakables are less interesting.

3. **Moving Platform Math**: Sine wave described but no frequency/period specified. Different frequencies feel completely different. Need to specify exact motion pattern.

## Missing Edge Cases
1. **One-Way Platforms Not Mentioned**: Task description asks for "platform types" but spec doesn't include one-way platforms (allow jumping through from below, landing from above). This is critical platformer mechanic.

2. **Platform Transition Edge Cases**: When player moves from one moving platform to another mid-jump, no specification for how velocity is handled. Seamless transitions are tricky.

3. **Tile Sprite Rotation**: Ice tiles are mentioned as needing visual differentiation, but no mention of animated tiles. Moving platforms should animate. Spec doesn't cover animation for moving platform visual (rotations/movements vs gameplay position).

4. **Level Generation Edge Cases**:
   - No guarantee player can return to start of level (one-way gaps might trap player)
   - No handling of fall-off deaths (player falls below lowest platform)
   - No minimum platforms per section (could generate impossible sections)

5. **Camera Lag Feel**: Lerp speed 0.1 specified but this is framerate-dependent. If frame rate drops, lag changes unexpectedly.

## Scope Risks
1. **Procedural Generation Complexity**: Detailed difficulty scaling but no algorithm for ensuring "no impossible gaps." This is non-trivial. Random generation can produce unplayable levels by chance. Need deterministic gap validation.

2. **Moving Platform Collision**: Moving platforms require special collision handling - player must move with platform, but current spec doesn't clarify this integration with T-0002's physics system.

3. **Pre-made vs Procedural Mix**: Spec vaguely says "mix procedural + pre-made" but doesn't define when each is used. If levels alternate, design both systems.

4. **Breakable Platform State**: Spec treats breakables as simple state change but doesn't address: can multiple platforms break in sequence? What's visual feedback during break animation? Does player remain on top or fall?

## Missing Tests
1. No test for camera not going beyond level bounds in both axes
2. No test for moving platforms correctly carrying player
3. No test for breakable platforms not breaking until player lands (not just passes through)
4. No test for generated levels being fully traversable before accepting
5. No test for smooth transitions between pre-made and procedural levels
6. No test for ice tiles actually reducing friction compared to normal tiles
7. No test for wall-platform interaction (e.g., platform moving into wall)

## Hidden Assumptions
1. Assumes tilemap is always loaded at game start (no streaming)
2. Assumes all tiles are solid rectangles (no diagonal/angled platforms)
3. Assumes player sprite doesn't need special handling when straddling tiles
4. Assumes level scrolling is always horizontal (no vertical scrolling)
5. Assumes breakable platforms reset on level reload
6. Assumes moving platforms are simple linear or sine wave (no complex paths)
7. Assumes collision detection uses tile-aligned boxes (no sub-pixel accuracy)

## Recommended Corrections

### 1. Clarify One-Way Platforms
Add platform type:
```javascript
6: {name: 'one-way', texture: 'wood'},  // Only blocks from above
```
Collision logic: check if player came from above before blocking

### 2. Fix Level Height Specification
Either:
- Levels are exactly canvas height (400px), or
- Levels are 600-800px tall to allow vertical scrolling
Make explicit in spec. Current state is ambiguous.

### 3. Specify Moving Platform Behavior
```javascript
const movingPlatforms = {
  type: 'sine-wave',
  baseX: 200,
  amplitude: 100,
  period: 120,  // frames for complete cycle
  // Position = baseX + sin(frameCount / period) * amplitude
};
```
Also: player moves with platform (add platform velocity to player each frame)

### 4. Guarantee Traversable Levels
Add validation:
```javascript
function validateLevel(levelMap) {
  // Find all continuous platforms
  // Verify max jump distance < player can jump
  // Ensure no dead-end platforms
  // Return true/false
}

// After generation:
do {
  generatedLevel = generateLevel(difficulty);
} while (!validateLevel(generatedLevel));
```

### 5. Define Breakable Behavior
```javascript
breakable: {
  health: 1,  // Hits to destroy
  breakFrames: 8,  // Frames for break animation
  onBreak: (player) => {
    player.fallThrough = true;  // Player falls
    // Visual: play crack animation, fade out
  }
}
```

### 6. Framerate Independence
Replace hardcoded lerp:
```javascript
const deltaTime = currentTime - lastTime;
const lerpSpeed = 0.1 * deltaTime / 16.67;  // Normalize to 60fps
cameraX = lerp(cameraX, targetX, lerpSpeed);
```

### 7. Add Falloff Detection
```javascript
if (player.y > levelHeight + 100) {
  // Player fell off bottom
  resetLevel();
}
```

### 8. Clarify Visual Tile Types
- **Grass**: green, natural color
- **Stone**: gray, rough texture
- **Ice**: cyan/white, shiny, animated shimmer
- **Breakable**: cracked appearance, starts solid
- **Moving**: has wheels or mechanical appearance
- **One-way**: asymmetric arrow design showing direction

## Priority
**High**: One-way platforms (core mechanic), level validation (prevents unplayable generation), moving platform collision with player (feels wrong if not integrated)

**Medium**: Breakable behavior clarity, framerate independence, falloff detection

**Low**: Visual design of tiles, animation timing specifics

## Critical Path Items
1. Level generation validation is BLOCKING - must ensure all levels are playable
2. Moving platform physics integration is BLOCKING - must sync with T-0002 physics
3. One-way platforms likely REQUIRED by actual game design (typical for platformers)
