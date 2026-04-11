---
type: followup
task_id: T-0018
created: 2026-04-10
tags: [ai-flow-lab, followup]
---

# T-0018 Follow-ups

## Task outcome summary

T-0018 restored Start-UI visibility for the reported access paths, but the executor achieved this with a mixed approach:

- added a root-level `game.html` redirect to `index.html`
- changed `automation/ui/game.html` so it now stays in menu state and shows a Start UI on load
- documented the finding in `ai/current-state/drift-register.md`

Important caveat from the executor report:

- `automation/ui/game.html` was intentionally simplified to a demo version
- no automated regression tests were added
- no server-side `/game` routing support was added
- the repo/docs still disagree about supported entry points and even overall domain

## Remaining risks

- `automation/ui/game.html` may now satisfy the bug, but it no longer preserves prior/full gameplay behavior there.
- There is no automated check ensuring Start UI remains visible on `index.html`, root `game.html`, and `automation/ui/game.html`.
- `/game` without extension is still unresolved at deployment/runtime level unless hosting already rewrites it externally.
- `docs/ARCHITECTURE.md` is now more stale because actual supported entry points differ from what it says.
- Broader doc/code drift remains, especially DRIFT-002; however that is already handled by T-0014.

## Candidate follow-up tasks

### F-1
- title: Add browser smoke coverage for Start UI visibility across supported entry points
- lane_type: test-lane
- executor: claude
- rationale: The executor explicitly left out automated tests. A small smoke test would protect the T-0018 fix from regressions by checking that the Start UI is visible before game start on `index.html`, root `game.html`, and `automation/ui/game.html` where applicable.
- smallest_safe_scope: Add minimal browser-based checks for overlay/menu presence and visibility on the supported entry pages, without expanding into full gameplay automation.
- depends_on: T-0018
- priority: high
- should_spawn_now: yes

### F-2
- title: Update architecture docs to reflect actual entry points and T-0018 behavior
- lane_type: docs-lane
- executor: claude
- rationale: The executor found and documented an architecture mismatch: docs describe `index.html` as the sole entry point, but the repo now also contains a root `game.html` redirect and `automation/ui/game.html` as an alternative UI page. This is a narrow documentation correction and does not overlap with the broader domain-drift work already covered by T-0014.
- smallest_safe_scope: Amend `docs/ARCHITECTURE.md` to describe the current entry-point reality, including which page is canonical, which page redirects, and the status of `automation/ui/game.html`.
- depends_on: T-0018
- priority: medium
- should_spawn_now: yes

### F-3
- title: Clarify intended product status of `automation/ui/game.html` after demo simplification
- lane_type: feature-lane
- executor: claude
- rationale: The executor explicitly simplified `automation/ui/game.html` to a demo version to fix the bug. Whether that page should remain a lightweight demo or regain full game functionality is a product/maintainer decision before further implementation there.
- smallest_safe_scope: Decide and document whether `automation/ui/game.html` is an officially supported full game entry point, a demo/testing page, or a legacy page to deprecate.
- depends_on: T-0018
- priority: medium
- should_spawn_now: no

## Recommended next task

Spawn **F-1** next.

Reason:
- highest risk reducer for the smallest safe scope
- directly addresses the executor’s primary gap
- protects both the canonical `index.html` path and the newly changed/added entry-point behavior
- can proceed without owner input

## Notes for planner

- Do **not** create a follow-up for broad doc/code domain reconciliation; that is already handled by **T-0014**.
- Do **not** spawn server routing work yet. The executor noted no server config exists in-repo, so `/game` support beyond `game.html` is not a safe autonomous next step without clearer deployment context.
- F-3 is effectively a decision-shaped item; keep it pending until owner/maintainer confirms whether `automation/ui/game.html` is meant to be a real product surface or just auxiliary/demo content.
- If F-2 is spawned, keep it tightly limited to entry-point documentation and avoid reopening the full domain mismatch already covered by T-0014.

## Related Documents
- [[ai/specs/T-0018_spec.md|T-0018 spec]]
- [[ai/reviews/T-0018_gemini_review.md|T-0018 review]]
- [[ai/briefs/T-0018_implementation.md|T-0018 document]]
- [[ai/results/T-0018_executor_report.md|T-0018 result]]
- [[ai/pr/T-0018_pr_draft.md|T-0018 pr-draft]]
