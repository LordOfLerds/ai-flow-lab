---
type: brief
task_id: T-0042
created: 2026-04-10
tags: [ai-flow-lab, brief]
---

# T-0042 Implementation Brief

## Goal
Implement a level select screen with multi-level progression system, including level unlock logic, star ratings, and theme-based organization.

## Scope
- Add level select UI as modal in #overlay
- Define 12 playable levels across 5 themes (2-3 levels per theme)
- Implement unlock progression (level N unlocks level N+1)
- Track level completion with 0-3 star ratings
- Persist level state in localStorage under key `pixelRunner_levelProgress`
- Display theme headers and locked/unlocked level cards
- Support transitioning from level select into game with selected level

## Constraints
- Only modify index.html (no new files)
- Level select must overlay existing game without breaking pause/resume
- Star ratings based on: score thresholds (1★ = 60%, 2★ = 80%, 3★ = 95%+)
- First level starts unlocked; others locked until predecessor completed
- Max 1 level playable at a time; selection returns to select screen on completion

## File targets
- MODIFY: index.html

## Tests required
- Verify 12 levels render in theme groups
- Test unlock cascade (complete level 1 → level 2 unlocked)
- Validate star calculation against score thresholds
- Confirm localStorage persistence across page reloads
- Ensure select screen closes/opens without game state loss

## Chosen minimal policy
```javascript
// LEVELS config (in gameState initialization)
const LEVELS = [
  { id: 1, theme: "Forest", name: "Meadow Run", baseScore: 1500, difficulty: 1 },
  { id: 2, theme: "Forest", name: "Dark Woods", baseScore: 2000, difficulty: 2 },
  { id: 3, theme: "Forest", name: "Canopy Rush", baseScore: 2500, difficulty: 3 },
  { id: 4, theme: "Desert", name: "Sand Dash", baseScore: 1800, difficulty: 2 },
  { id: 5, theme: "Desert", name: "Dune Storm", baseScore: 2200, difficulty: 3 },
  { id: 6, theme: "Desert", name: "Oasis Sprint", baseScore: 2800, difficulty: 4 },
  { id: 7, theme: "Ice", name: "Frozen Fields", baseScore: 2100, difficulty: 3 },
  { id: 8, theme: "Ice", name: "Blizzard Valley", baseScore: 2600, difficulty: 4 },
  { id: 9, theme: "Lava", name: "Volcano Run", baseScore: 2400, difficulty: 4 },
  { id: 10, theme: "Lava", name: "Magma Caves", baseScore: 3000, difficulty: 5 },
  { id: 11, theme: "Sky", name: "Cloud Platform", baseScore: 2700, difficulty: 4 },
  { id: 12, theme: "Sky", name: "Storm Peak", baseScore: 3200, difficulty: 5 }
];

// LevelProgress schema
const levelProgress = {
  levelId: { unlocked: true, completed: false, bestScore: 0, stars: 0 }
};
```

## Risks
- Star rating thresholds may feel arbitrary; requires tuning post-launch
- Unlock cascade could lock players if completion tracking breaks
- localStorage quota could be exceeded if user base grows to thousands of completed runs

## Explicit non-goals
- Leaderboards (per-level or global)
- Procedural level generation
- Difficulty scaling based on player performance
- Level retry limits or attempts counter


## Related Documents
- [[ai/specs/T-0042_spec.md|T-0042 spec]]
- [[ai/reviews/T-0042_gemini_review.md|T-0042 review]]
- [[ai/results/T-0042_executor_report.md|T-0042 result]]
- [[ai/followups/T-0042_followups.md|T-0042 followup]]
- [[ai/pr/T-0042_pr_draft.md|T-0042 pr-draft]]
