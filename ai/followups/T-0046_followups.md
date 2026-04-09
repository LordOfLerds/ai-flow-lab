# Follow-up Proposals for T-0046

## Recommended

### F-1: Add sound effect hooks for level complete and death
- **lane_type:** feature-lane
- **executor:** codex
- **priority:** LOW
- **rationale:** Level complete screen and death screen now exist but have no audio feedback. Add Web Audio API hooks (beep patterns) for: level complete jingle, death sound, coin collect, gem collect.
- **smallest_safe_scope:** Add `playSound(type)` utility that plays simple oscillator-based sound effects. Call it from `showLevelCompleteScreen`, `killPlayer`, coin/gem collection handlers.
- **should_spawn_now:** false

### F-2: Add visual particle effects for level complete celebration
- **lane_type:** feature-lane
- **executor:** codex
- **priority:** LOW
- **rationale:** The level complete screen is functional but plain. Adding confetti/particle burst would improve juice.
- **smallest_safe_scope:** Add `spawnParticles(x, y, color, count)` function and render particles in gameLoop. Trigger on level complete.
- **should_spawn_now:** false

## Candidate (lower priority)

### F-3: Skin purchase confirmation dialog
- **lane_type:** feature-lane
- **executor:** codex
- **priority:** LOW
- **rationale:** Currently no "Are you sure?" when buying skins with coins/gems.
- **smallest_safe_scope:** Add confirmation prompt before deducting currency.
- **should_spawn_now:** false
