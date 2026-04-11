---
type: spec
task_id: T-0040
created: 2026-04-10
tags: [ai-flow-lab, spec]
---

# T-0040 Spec

## Task metadata
- **task_id:** T-0040
- **title:** Enhanced Game Over Screen and Visual Polish
- **lane_type:** feature-lane
- **executor:** codex
- **parent_goal_id:** G-0003

## Problem statement
The Pixel Runner game currently has a basic game over screen that shows only the score and a restart option. There is no score breakdown, no XP display, no visual feedback for achievements, and no navigation options beyond restarting. The game also lacks visual polish — backgrounds are static single-color, there are no particle effects for collectibles, no screen shake on damage, and menu transitions are instantaneous with no animation. These gaps make the game feel unfinished and reduce player engagement.

## Source of truth
- **`index.html`** — Main game file containing all rendering logic, the `drawGameOver()` function, the canvas rendering pipeline, the `gs` game state object, and the menu system
- **`docs/ARCHITECTURE.md`** — Product architecture reference
- **`docs/DOMAIN_MODEL.md`** — Domain model with player state, scoring, and XP definitions

## Desired behavior

### Enhanced Game Over Screen
1. When the player dies, show a **rich game over overlay** in the `#overlay` element (not just canvas text) with:
   - Game title "GAME OVER" in large pixel-art styled text
   - **Score breakdown section**: distance score, coin bonus, gem bonus, total score
   - **XP earned**: show XP gained this run with an animated progress bar filling toward next level
   - **Star rating**: 1-3 stars based on score thresholds (★ = 500+, ★★ = 2000+, ★★★ = 5000+)
   - **New unlocks** (if any): show skin or skill unlock notifications with highlight animation
   - Three action buttons: "Retry" (restart same level), "Level Select" (placeholder — shows main menu for now), "Main Menu"
2. The game over screen should animate in with a fade + slide-up transition (300ms ease-out)
3. Show the player's best score with a "NEW BEST!" badge if the current run beats it

### Parallax Scrolling Backgrounds
4. Replace the static background with a **3-layer parallax system**:
   - **Layer 0 (sky)**: Gradient background that shifts color based on the current theme/environment
   - **Layer 1 (far)**: Distant mountains/buildings/clouds moving at 0.2x game speed
   - **Layer 2 (mid)**: Trees/structures/terrain moving at 0.5x game speed
   - The ground/platform layer continues to move at 1x speed (existing behavior)
5. Implement at least 2 themes:
   - **Forest**: Green gradient sky, distant mountains (purple), pine trees (dark green)
   - **City**: Orange/sunset gradient sky, distant skyscrapers (dark silhouettes), medium buildings
6. Themes are selected based on distance milestones (forest for 0-2000m, city for 2000-4000m, cycle after)

### Screen Shake
7. On player hit (damage/death), apply a screen shake effect:
   - Translate the canvas by random offsets (±3-5px) for 200ms
   - Decay the intensity over the shake duration
   - Do NOT shake during menus or game over

### Particle Effects
8. When collecting coins: burst of 5-8 small yellow particles radiating outward, fading over 400ms
9. When collecting gems: burst of 8-12 small colored particles (match gem color) with slight upward drift, fading over 600ms
10. Particles are simple circles (2-4px radius) with velocity and fade-out alpha

### Animated Menu Transitions
11. When transitioning between menus (main menu → skin select, main menu → skills, etc.), apply a **fade-out/fade-in** transition (150ms each direction) using the overlay opacity
12. The "Play" button press should trigger a quick zoom-in effect on the canvas (scale 1.0 → 1.05 over 200ms) before gameplay starts

## Constraints
- All changes MUST be in `index.html` only (single-file game)
- Do NOT introduce any external dependencies or libraries
- Parallax layers must be drawn on the existing canvas (no additional canvas elements)
- Particle system must be lightweight — max 50 active particles at any time to maintain 60fps
- Screen shake must use CSS transform on the canvas element (not redrawing offset positions)
- Must work offline, no network calls
- Must not break existing gameplay physics or collision detection
- Preserve all existing functions and game state properties

## Acceptance criteria
1. [ ] Game over screen shows score breakdown (distance, coins, gems, total)
2. [ ] XP progress bar animates on game over screen
3. [ ] Star rating (1-3 stars) displayed based on score thresholds
4. [ ] "Retry", "Level Select", "Main Menu" buttons work correctly
5. [ ] "NEW BEST!" badge appears when beating previous best score
6. [ ] Parallax background with 3 layers visible during gameplay
7. [ ] At least 2 distinct background themes (forest, city)
8. [ ] Background theme changes at distance milestones
9. [ ] Screen shakes on player hit/death (visible displacement for ~200ms)
10. [ ] Coin collection produces yellow particle burst
11. [ ] Gem collection produces colored particle burst
12. [ ] Menu transitions have fade animation (not instant)
13. [ ] Performance: game maintains 60fps with all effects active
14. [ ] No regression in existing gameplay mechanics

## Risks
- **Performance**: Adding 3 parallax layers + particle system + screen shake could drop frame rate on lower-end devices. The particle cap (50) and simple circle rendering should mitigate this, but the executor should profile with `performance.now()` to verify.
- **Canvas layering**: Drawing parallax behind the game sprites requires careful draw order. The existing rendering pipeline needs to be modified to: clear canvas → draw parallax layers → draw game objects → draw HUD. If the current code draws objects inline with the game loop, refactoring the render pipeline is needed.
- **Theme transition jarring**: Switching from forest to city at exactly 2000m could be visually jarring. Consider a 500ms crossfade between themes, though this adds complexity.
- **Game over overlay vs canvas**: If the game over was previously rendered on the canvas, switching to an HTML overlay (#overlay) may require changes to how the game loop handles the game over state (stopping canvas rendering vs continuing to show the last frame).

## Open questions
1. Should the parallax layers use pre-drawn pixel art shapes or procedurally generated silhouettes? (Suggested: Procedural — simpler to implement as rectangles/triangles, consistent with existing pixel art style)
2. Should the XP bar on game over show the actual level-up animation if the player levels up? (Suggested: Yes — it's satisfying and the XP system already exists)
3. Should screen shake intensity scale with damage amount? (Suggested: No for v1 — use a fixed shake, customize later)


## Related Documents
- [[ai/reviews/T-0040_gemini_review.md|T-0040 review]]
- [[ai/briefs/T-0040_implementation.md|T-0040 document]]
- [[ai/results/T-0040_executor_report.md|T-0040 result]]
- [[ai/followups/T-0040_followups.md|T-0040 followup]]
- [[ai/pr/T-0040_pr_draft.md|T-0040 pr-draft]]
