---
type: followup
task_id: T-0048
created: 2026-04-10
tags: [ai-flow-lab, followup]
---

# Follow-ups for T-0048

## Spawnable follow-ups

### F-1
- title: Add visual feedback and particle effects for new skills activation
- description: When skills like Ground Pound, Time Slow, Wall Jump, and Glide activate, add visual particle effects and screen feedback (screen shake for stomp, blue tint for time slow, trail for dash). Currently skills activate silently with no visual cue.
- lane_type: feature-lane
- estimated_complexity: medium
- should_spawn_now: false

### F-2
- title: Add skill cooldown indicators to HUD
- description: Display cooldown timers for Time Slow and other cooldown-based skills as small circular indicators near the health bar. Players need to know when skills are ready again.
- lane_type: feature-lane
- estimated_complexity: small
- should_spawn_now: false

## Decision blockers

None — the core skill system works and follow-up polish is optional.

## Already covered by existing tasks
- Skin/shop progression → T-0049
- Backend/auth → T-0050
- Polish/transitions → T-0051


## Related Documents
- [[ai/specs/T-0048_spec.md|T-0048 spec]]
- [[ai/reviews/T-0048_gemini_review.md|T-0048 review]]
- [[ai/briefs/T-0048_implementation.md|T-0048 document]]
- [[ai/results/T-0048_executor_report.md|T-0048 result]]
- [[ai/pr/T-0048_pr_draft.md|T-0048 pr-draft]]
