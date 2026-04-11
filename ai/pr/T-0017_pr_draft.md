---
type: pr-draft
task_id: T-0017
created: 2026-04-10
tags: [ai-flow-lab, pr-draft]
---

# [T-0017] Score goes higher while player not moving

## Summary
Score goes higher while player not moving

**Task ID**: T-0017
**Parent Goal**: G-0001
**Parent Task**: none
**Lane**: feature-lane
**Executor**: codex

## What Changed
Score goes higher while player not moving


codex


- `automation/ui/game.html`
- `automation/ui/score-tracker.js`
- `docs/DOMAIN_MODEL.md`
- `docs/INVARIANTS.md`
- `starter-test/tests/score-tracker.test.js`




- Added a dedicated `ScoreTracker` module plus DOM sync helper and wired `game.html` to …

## Spec Summary
- **Task ID:** T-0017
- **Title:** Score goes higher while player not moving
- **Lane type:** feature-lane
- **Executor:** codex



The reported issue is that score increases even while the player is not moving. The requested outcome is: “Score should only advance for progress ingame.”

Based on the…

## Review Highlights
`ai/specs/T-0017_spec.md`


- **Constraint vs. Implementation:** The spec instructs the executor to "Do not invent new business rules," yet the core requirement ("Score should only advance for progress ingame") requires defining exactly what "progress" is because the source docs are missing. The exe…

## Implementation Brief
Stop passive score gain so the score increases only from measurable in-game progress, not from elapsed time alone.

Resolve ambiguity minimally: for this task, treat “progress” as **actual player world-position advancement used by the current movement/scoring model**, and **do not award score from i…

## Linked Decisions
(none)

## Validation
- [ ] Spec written and reviewed
- [ ] Implementation brief synthesized
- [ ] Executor report completed
- [ ] Follow-ups proposed

- [ ] Tests pass (if applicable)
- [ ] No regressions in existing functionality

## Risks
(none identified in review)

## Non-Goals
(see spec)

## Follow-Up Notes
T-0017 appears successfully completed and well-contained.

Implemented outcomes from the executor report:
- Passive time-based score gain was removed.
- Scoring now advances from forward progress only, using a dedicated `ScoreTracker`.
- Backtracking no longer reduces score and does not generate add…

---
**Branch**: `feature/T-0017-score-goes-higher-while-player-not-moving` → `main`
**Generated**: 2026-04-07T20:03:42.127Z
**Generator**: generate-pr-draft.mjs


## Related Documents
- [[ai/specs/T-0017_spec.md|T-0017 spec]]
- [[ai/reviews/T-0017_gemini_review.md|T-0017 review]]
- [[ai/briefs/T-0017_implementation.md|T-0017 document]]
- [[ai/results/T-0017_executor_report.md|T-0017 result]]
- [[ai/followups/T-0017_followups.md|T-0017 followup]]
