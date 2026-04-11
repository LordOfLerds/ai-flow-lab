---
type: followup
task_id: T-0013
created: 2026-04-10
tags: [ai-flow-lab, followup]
---

# T-0013 Follow-ups

## Task outcome summary
T-0013 was completed as a minimal, front-end-only mock login flow in `index.html`, aligned with the implementation brief rather than inventing unsupported backend auth infrastructure.

Delivered behavior includes:
- visible email/password login UI
- client-side validation for required fields and email shape
- explicit login states: idle, submitting, success, failure
- generic failure messaging
- masked password input
- repeat-submit prevention while submitting
- local authenticated state via `gs.auth.isLoggedIn`
- gating of menu/game start behind login
- documented logged-out-on-refresh behavior
- manual verification checklist embedded in file

The executor explicitly did **not** implement real authentication, persistence, account management, or broader security infrastructure, which remains consistent with the brief and current repo truth.

## Remaining risks
- The implemented login is only a mock/local shell and may not match owner intent if real account auth was expected.
- Success/failure behavior is artificially simulated, including a deterministic `"fail"` email trigger for testing failure paths.
- No automated test harness exists, so regressions in login validation/state flow are currently only covered by manual verification.
- `AGENTS.md` references missing `docs/` source-of-truth files; this weakens confidence that current behavior matches intended architecture.
- All logic remains inline in `index.html`, so incremental UI/auth growth may become harder to maintain.

## Candidate follow-up tasks

### F-1
- title: Add browser-based smoke tests for mock login validation and state transitions
- lane_type: test-lane
- executor: claude
- rationale: The executor identified the absence of automated tests as the main practical gap after implementation. A small static/browser smoke test would reduce regression risk for the newly added login flow without requiring backend work.
- smallest_safe_scope: Add a minimal front-end test harness or lightweight browser-executable checks covering login form render, required-field validation, invalid email rejection, submitting disabled state, generic failure message, success transition, and reload behavior documentation verification.
- depends_on: T-0013
- priority: high
- should_spawn_now: yes

### F-2
- title: Add logout control and visible logged-in indicator for the mock auth state
- lane_type: feature-lane
- executor: claude
- rationale: The current implementation gates entry into the app but does not provide an explicit way to leave the mock authenticated state within the same session. This is a small, user-visible completeness improvement that stays within the local-only auth model.
- smallest_safe_scope: Add a logout button and simple logged-in indicator in the menu/HUD layer that clears `gs.auth.isLoggedIn`, resets auth status/message as needed, and returns the user to the login screen without changing broader game systems.
- depends_on: T-0013
- priority: medium
- should_spawn_now: yes

### F-3
- title: Add architecture note documenting mock-login constraints and current auth assumptions
- lane_type: docs-lane
- executor: claude
- rationale: Since T-0014 already covers backfilling the missing docs, the safe non-duplicative follow-up here is a narrow documentation update specific to the newly introduced mock login behavior so future tasks do not mistake it for real authentication.
- smallest_safe_scope: Document that the current login is front-end-only, mock/local, non-persistent, uses generic failure messaging, and is not backed by user accounts or sessions; place this in the most appropriate existing project doc location without attempting full doc restoration.
- depends_on: T-0013, T-0014
- priority: medium
- should_spawn_now: no

## Recommended next task
### F-1
Add browser-based smoke tests for mock login validation and state transitions.

Reason:
- It is the executor’s strongest recommended follow-up.
- It addresses the highest immediate risk: no automated coverage for the new login behavior.
- It is small, reviewable, and does not require owner decisions.
- It does not overlap with existing tasks, including T-0014.

## Notes for planner
- Do **not** spawn a follow-up for restoring missing `docs/DOMAIN_MODEL.md`, `docs/INVARIANTS.md`, `docs/ARCHITECTURE.md`, or ADRs; that work is already handled by **T-0014**.
- Do **not** spawn a real-auth implementation task yet; current repo truth and T-0013 brief support only mock/local auth.
- The executor suggested extracting auth logic from `index.html`, but that is a maintainability refactor rather than the smallest next safe step; defer unless further auth/UI growth makes it necessary.
- No immediate owner decision is strictly required for the next safe implementation step.

## Related Documents
- [[ai/specs/T-0013_spec.md|T-0013 spec]]
- [[ai/reviews/T-0013_gemini_review.md|T-0013 review]]
- [[ai/briefs/T-0013_implementation.md|T-0013 document]]
- [[ai/results/T-0013_executor_report.md|T-0013 result]]
- [[ai/pr/T-0013_pr_draft.md|T-0013 pr-draft]]
