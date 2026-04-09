# T-0040 Follow-ups

## Task outcome summary
T-0040 (Enhanced Game Over Screen and Visual Polish) was executed. The executor report describes implementing a rich game over overlay with score breakdown, XP bar, star rating, and action buttons. Parallax scrolling backgrounds with forest and city themes, screen shake on damage, particle effects for collectibles, and animated menu transitions were also described in the executor output.

However, similar to T-0041, the automated file extraction found 0 written files — the Claude CLI output did not use the expected ```file:path``` format. The actual code changes need to be manually applied.

## Spawnable follow-ups

### F-1: Apply Game Over Screen and Visual Polish Code
- title: Manually apply T-0040 visual polish code to index.html
- description: The executor for T-0040 generated code for the enhanced game over screen, parallax backgrounds, particles, and screen shake but the output was not in the expected file block format. Re-implement from the implementation brief focusing on: game over overlay with score breakdown, XP bar, star rating, 3-layer parallax with forest/city themes, screen shake on hit, particle effects for collectibles, menu fade transitions.
- lane_type: bug-lane
- executor: claude
- priority: high
- status: recommended-now

### F-2: Performance Testing for Visual Effects
- title: Verify 60fps with parallax, particles, and screen shake active
- description: After T-0040 code is applied, run performance benchmarks to ensure the game maintains 60fps with all visual effects active. Profile with performance.now() in the game loop. If frame time exceeds 18ms consistently, identify bottlenecks and optimize.
- lane_type: test-lane
- executor: claude
- priority: medium
- status: deferred

## Decision blockers

None — all follow-ups can proceed autonomously.

## Already covered by existing tasks
- Login UI and persistence → T-0041 (completed)
- Level select → T-0042
- Coin shop → T-0043
- Battle pass → T-0044
- Architecture docs → T-0045
