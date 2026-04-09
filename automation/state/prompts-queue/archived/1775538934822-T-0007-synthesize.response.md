# T-0007 Implementation Brief

## Goal
Implement complete UI and polish: HUD (score, coins, XP, level, power-ups, skills), game-over screen with stats, start menu and character select, visual effects (screen shake, particle effects, transitions), and dynamic speed progression.

## Scope
1. **HUD** - Real-time display: score, coins, XP bar, level, active power-ups with timers, active skills; top-left corner, semi-transparent
2. **Game-over screen** - Final stats (score, XP, level, coins), buttons (Restart Level, Back to Menu, Next Level if goal met)
3. **Start screen** - Title, Play button, Credits button; decorative background
4. **Character select** - Skin selection, level/XP display, skill status, Start Level button, Back button
5. **Visual polish** - Screen shake (2-frame ±3px on enemy death), particle effects (coins 5-8 particles 0.3s, gems 8-12 particles 0.5s, enemy puff 3-5 white particles), fade transitions (0.3s black)
6. **Speed progression** - Camera scrolling starts at 1x, ramps to 2x over 120 seconds; all entities move with camera
7. **State machine** - START_SCREEN → CHARACTER_SELECT → GAME_RUNNING → LEVEL_COMPLETE → CHARACTER_SELECT (or restart)
8. **Win condition** - Reach exit tile (type=20) or collect all coins; triggers level-complete, enables Next Level button

## Constraints
- Single-file HTML (index.html)
- HUD renders on canvas (no DOM); top-left 160x120 reserve zone
- Game-over waits 3s before accepting input
- All text uses canvas drawText with white outline on black
- Particles: simple point-based (no collision); max 50 concurrent; use particle pool
- Screen shake: frame-based jitter ±3px for 2 frames on enemy death
- Transitions: frame-based fade over 18 frames @ 60 FPS (0.3s)
- Speed progression: scrollSpeed = 1.0 + min(elapsedSeconds / 120, 1.0); applies to all entity x-positions
- Tilemap IDs extended: exit=20 (level complete trigger)

## File targets
- **index.html** - Add HUD rendering; game-over screen with stats; start menu; character select menu; particle system; screen shake; transition effects; speed progression (camera scrolling); state machine expansion; win condition logic

## Tests required
1. HUD displays score, coins, XP, level, active power-ups with timers (update every frame)
2. HUD updates accurately on coin pickup, XP gain, level-up, power-up activation/expiry
3. Game-over screen shows correct final stats (score, XP, level, coins collected)
4. Game-over input disabled for 3 seconds; prevents accidental restart
5. Restart Level button resets player position, tilemap, collectibles, power-ups
6. Back to Menu button returns to character select, preserves progression
7. Next Level button appears when goal is met (all coins or exit tile reached)
8. Start screen displays title, Play button, Credits button
9. Character select shows unlocked skins, allows selection, displays level/XP
10. Screen shake triggers on enemy death (2-frame jitter ±3px in x and y)
11. Coin pickup spawns 5-8 particles, fade over 0.3s, removed after expiry
12. Gem pickup spawns 8-12 particles (sparkle), fade over 0.5s
13. Enemy death spawns dust puff (3-5 particles, white/gray), fade over 0.3s
14. Transitions fade to black and back (0.3s) between menu states
15. Speed progression: speed 1x at 0s, 1.5x at 60s, 2x at 120s+; camera scrolls all entities
16. Camera scroll doesn't leave player on-screen; player moves relative to scrolled world
17. Exit tile (type=20) triggers level-complete state
18. Collectibles not spawned in HUD reserve zone (top-left 160x120)

## Chosen minimal policy
- **HUD layout** - Single-column, top-left: Score (coins), Coins X/Y, XP bar with threshold, Level, Active power-ups (timer below name), Active skills (YES/NO list)
- **Game-over timeline** - Show screen immediately. Disable input 3s. Display stats during this period. After 3s, enable buttons.
- **Particle pool** - Pre-allocate 50 particles; reuse on spawn/expire. On spawn limit, remove oldest (FIFO).
- **Screen shake** - Trigger on enemy death (jump-on-head collision success); apply frame offset ±3 pixels for exactly 2 frames (33ms @ 60 FPS)
- **Camera scroll** - World-wide multiplier applied to all entity x-positions: x_screen = x_world - (scrollSpeed - 1.0) * 0.5 * elapsedFrames. Camera centered on player; player visual position unchanged.
- **Speed formula** - scrollSpeed = 1.0 + min(elapsedSeconds / 120, 1.0); capped at 2x after 120 seconds
- **Win condition** - Player reaches exit tile (spawn at level end) OR collects all coins (if no exit tile exists). Triggers gameState.levelComplete = true.
- **Input delay** - Game-over screen: set inputDisabledUntil = gameState.frameCount + 180 (3 seconds @ 60 FPS); only process button clicks if frameCount > inputDisabledUntil
- **Fade transition** - 0-9 frames: fade to black (alpha increases 0-1); 9-18 frames: fade from black (alpha decreases 1-0); state change happens at frame 9
- **Exit tile** - Tilemap ID 20; invisible (no sprite); acts as trigger collider; on player overlap, set gameState.levelComplete = true
- **HUD reserve zone** - 0-160px width, 0-120px height; level design phase must avoid spawning collectibles here; if spawn falls in zone, nudge 165px right

## Risks
1. **HUD performance** - Multiple text renders and particle updates may drop FPS. Mitigation: profile rendering; cache text layouts; limit font size to 12-14pt.
2. **Particle system memory** - Pre-allocating 50 particles uses ~5KB per particle type; may use significant memory. Mitigation: reuse single particle pool for all types.
3. **Camera scroll lag** - Applying scroll to all entities every frame may cause visual stutter. Mitigation: apply scroll as floating-point offset; interpolate camera position smoothly.
4. **Game-over false clicks** - 3s delay may still allow fast-clicking; double-check disabled state. Mitigation: set global input lock flag; skip all input processing until timer expires.
5. **Level design softlocks with scrolling** - Levels designed for no scrolling may become unplayable at 2x. Mitigation: review all levels with speed curve; document scroll-aware level design guidelines.

## Explicit non-goals
- No pause menu (can only pause between levels)
- No audio or sound effects (reserved for future polish)
- No parallax scrolling (background static)
- No complex particle effects (use simple shapes only)
- No achievements or badges (reserved for future)
- No difficulty settings (speed curve fixed)
- No rebindable controls (fixed keyboard layout)
- No game options (e.g., graphics quality)
- No analytics or telemetry
