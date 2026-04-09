# T-0026 Spec

## Task metadata
- task_id: T-0026
- title: Add pause button to game
- lane_type: feature-lane
- executor: codex

## Problem statement
The Pixel Runner game currently lacks a pause mechanism. Players cannot pause the game during play, which is a basic expected feature for any game.

## Source of truth
- `game/game.html` — main game entry point
- `game/js/game-engine.js` — game loop and state management
- `game/js/input-handler.js` — keyboard/mouse input handling
- `docs/ARCHITECTURE.md` — product architecture

## Desired behavior
1. A pause button ("⏸") appears in the top-right corner of the game canvas during gameplay
2. Clicking the button pauses the game loop (animation, physics, scoring stop)
3. A semi-transparent overlay with "PAUSED" text appears
4. Clicking again (or pressing Escape) resumes the game
5. The button text toggles between ⏸ and ▶

## Constraints
- Must not break existing game loop or score tracking
- Must work with the existing `requestAnimationFrame` pattern
- Pause state must be tracked in the game engine state object
- No external dependencies

## Acceptance criteria
- [ ] Pause button visible during active gameplay
- [ ] Clicking pauses all game logic (movement, collision, scoring)
- [ ] Visual overlay confirms paused state
- [ ] Clicking resume or pressing Escape resumes gameplay
- [ ] Score does not increment while paused
- [ ] Button is not visible on start screen or game over screen

## Risks
- The `requestAnimationFrame` loop may need refactoring if it does not support conditional execution
- Timer-based scoring may continue running independently of the game loop

## Open questions
- Should the pause button also mute audio (if any)?
- Should keyboard shortcut (P or Escape) also toggle pause?

## F-1: Add keyboard shortcut for pause toggle
Add P key and Escape key as alternative pause/resume triggers.

## F-2: Add audio mute on pause
If audio exists, mute during pause and resume on unpause.