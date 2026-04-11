---
type: followup
task_id: T-0025
created: 2026-04-10
tags: [ai-flow-lab, followup]
---

T-0025 Follow-ups

Task outcome summary

T-0025 reported a concrete fix in index.html: restored missing inline JavaScript, reintroduced menu initialization, and set the game to start in a visible menu phase. The executor concluded the redirect in game.html was correct and the real defect was the broken target page.

However, there is now a material mismatch between the executor report and observed reality: the issue is reportedly still reproducible. That means T-0025 should be treated as an incomplete or non-reproduced fix, not a clean closure.

The new strongest hypothesis is that a mock state or mock UI state introduced by T-0017 may still be overriding the real Start UI path after entry via game / game.html.

Remaining risks
	•	The reported fix may have restored one broken path while a second state override still suppresses the real Start UI.
	•	Existing drift documentation is inaccurate because it describes a resolved issue while the bug is reportedly still visible.
	•	Existing Start UI tests may be too coarse and may only check overlay/title presence rather than actual usable menu/button state.
	•	A persistent mock state from T-0017 could keep masking real runtime behavior until explicitly isolated.
	•	The executor report did not parse changed files cleanly, so repo state and artifact completeness should be treated with some caution.

Candidate follow-up tasks

F-1
	•	title: Isolate whether T-0017 mock state still overrides Start UI on game entry paths
	•	lane_type: bug-lane
	•	executor: codex
	•	rationale: This directly addresses the newest and most plausible live root-cause hypothesis without broadening into a refactor. It does not duplicate existing tasks and is the smallest meaningful next step given that the issue reportedly still exists.
	•	smallest_safe_scope: Reproduce the bug on supported game / game.html entry paths, trace startup state selection and menu rendering, inspect whether any mock state or mock UI logic introduced by T-0017 overrides the normal Start UI path, and remove or gate only the interfering behavior if confirmed.
	•	depends_on: T-0025
	•	priority: high
	•	should_spawn_now: yes

F-2
	•	title: Correct DRIFT-003 to reflect the actual unresolved state and root-cause history
	•	lane_type: docs-lane
	•	executor: claude
	•	rationale: The executor explicitly reported drift-register inaccuracy, and reality now suggests the issue is not actually resolved. This is a small source-of-truth repair and does not overlap with existing tasks.
	•	smallest_safe_scope: Update only the relevant drift-register entry so it no longer claims full resolution, and reflect that the redirect architecture was correct while Start UI behavior remained or may remain broken due to target-page/runtime-state issues.
	•	depends_on: T-0025
	•	priority: high
	•	should_spawn_now: yes

F-3
	•	title: Tighten Start UI smoke coverage to assert visible interactive menu controls, not just overlay presence
	•	lane_type: test-lane
	•	executor: codex
	•	rationale: T-0019 and T-0020 already cover Start UI visibility broadly, so this should not duplicate them. The useful gap is narrower: assert that the actual start/menu controls exist and are usable after runtime initialization.
	•	smallest_safe_scope: Extend existing Start UI smoke/headless checks for supported entry paths so they verify non-empty menu content and presence of interactive start controls after scripts run.
	•	depends_on: T-0019, T-0020, T-0025
	•	priority: medium
	•	should_spawn_now: no

F-4
	•	title: Audit primary HTML runtime surfaces for leftover placeholder or mock startup logic
	•	lane_type: bug-lane
	•	executor: claude
	•	rationale: The executor found one placeholder/truncation issue already. A narrow audit of the primary runtime HTML surfaces is a reasonable preventative step, but lower priority than directly testing the T-0017 mock-state hypothesis.
	•	smallest_safe_scope: Inspect the repo’s main HTML runtime entry surfaces for placeholder comments, mock startup flags, or alternate initialization branches that can suppress real menu rendering; report and fix only clear defects found.
	•	depends_on: T-0025
	•	priority: low
	•	should_spawn_now: no

Recommended next task

F-1: Isolate whether T-0017 mock state still overrides Start UI on game entry paths.

This is the best next task because it matches the latest real-world evidence, is tightly scoped, and directly tests the most plausible remaining root cause without duplicating existing Start UI test or docs tasks.

Notes for planner
	•	Do not treat T-0025 as conclusively resolved; the live report that the issue still exists should override the optimistic executor conclusion.
	•	Spawn F-1 before broader testing or prevention work.
	•	F-2 is also worth spawning soon because the drift register should not continue to state that this issue is resolved if the bug is still reproducible.
	•	Do not spawn a broad build-process investigation yet; first determine whether the remaining bug is actually a mock-state override from T-0017.
	•	T-0019 and T-0020 already cover related Start UI testing, so any new test work should remain a narrow enhancement, not a replacement.

## Related Documents
- [[ai/specs/T-0025_spec.md|T-0025 spec]]
- [[ai/reviews/T-0025_gemini_review.md|T-0025 review]]
- [[ai/briefs/T-0025_implementation.md|T-0025 document]]
- [[ai/results/T-0025_executor_report.md|T-0025 result]]
