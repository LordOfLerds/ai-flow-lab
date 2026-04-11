---
type: brief
task_id: T-0016
created: 2026-04-10
tags: [ai-flow-lab, brief]
---

# T-0016 Implementation Brief

## Goal

Add the smallest complete mock-auth session loop so a user can:
- clearly see when they are logged in
- access an explicit logout control
- return to the logged-out UI without a full page refresh if the current client code already supports in-page updates

Resolve review/spec ambiguity explicitly:
- **State policy:** use the app’s existing mock auth state mechanism if one already exists; otherwise use **memory-only client state** for this task
- **Persistence:** do **not** add new persistence on this task
- **Identity display:** show the existing mock user label/value if already available; otherwise use a generic logged-in label rather than inventing new identity rules

## Scope

In scope:
- expose a visible logged-in indicator in the existing auth/session area
- add a logout control in that same auth/session area
- wire logout to the existing mock auth state transition, or add the minimal local transition if none exists
- update auth/session messaging so logged-in vs logged-out state is visually accurate
- make minimal auth-area style fixes **only if required** for the new indicator/logout UI to render correctly

Out of scope:
- real authentication
- backend/session API work
- authorization rules
- cross-app/global auth banners outside the existing auth panel unless the current implementation already renders auth status there
- new persistence behavior
- broader CSS cleanup unrelated to the auth/session affordance

## Constraints

- Prefer minimal safe changes.
- Reuse existing auth/session UI language and classes where possible, especially `.auth-status` and `.session-chip`.
- Do not invent a new auth architecture if existing JS/state hooks already exist.
- If no auth state implementation exists, add only the minimum client-side state needed to toggle logged-in/logged-out UI.
- Treat logout as **manual only**; no timeout/session-expiry behavior.
- Do not silently resolve doc/code conflicts; if found, record them in `ai/current-state/drift-register.md`.
- CSS fixes are allowed **only where necessary to make this feature work**. Do not broaden into general stylesheet repair.

## File targets

Primary likely targets:
- `index.html`
  - add or expose logged-in indicator markup and logout control in the auth/session area
  - make minimal auth-related CSS adjustments if required for correct display
- existing client script file(s) that manage UI/auth state
  - wire indicator visibility/content to mock auth state
  - wire logout action to revert state and rerender affected UI

Conditional target:
- `ai/current-state/drift-register.md`
  - only if source-of-truth docs and observed code behavior conflict

Do not create new files unless existing structure clearly requires a dedicated script/test file for the smallest safe implementation.

## Tests required

Add or update the smallest relevant tests covering:

1. **Logged-in indicator visibility**
   - indicator/session chip is absent or hidden when logged out
   - indicator/session chip is present and visibly denotes logged-in state when logged in

2. **Logout control visibility**
   - logout control is available when logged in
   - logout control is absent or disabled when logged out, whichever matches current UI pattern

3. **State transition**
   - activating logout changes mock auth state back to logged out
   - auth/session messaging updates accordingly without requiring a page reload if the app is already client-reactive

4. **No new persistence**
   - if tests cover reload/init behavior, assert only the currently existing behavior
   - do not add a persistence expectation unless persistence already exists in code

5. **Form/data handling**
   - if a password/sensitive field exists in the mock auth form and logout flow touches form state, ensure logout does not leave the UI falsely presenting an active session
   - only require field clearing if current implementation already resets fields or the logout handler directly manipulates them

## Chosen minimal policy

To resolve spec/review contradictions, implement with this policy:

- **State source:** prefer existing mock auth state/store/hooks if present
- **Fallback state model:** memory-only boolean/session object in client code
- **Persistence:** none added
- **Indicator placement:** existing auth panel/session area only
- **Indicator content:** existing user identifier if already available; else generic “Logged in”
- **Logout behavior:** revert to logged-out UI state and remove active-session indicator
- **CSS changes:** only targeted fixes required for auth indicator/logout rendering; do not perform unrelated auth-style refactors

## Risks

- Existing auth behavior may already be partially implemented in hidden JS, so duplicating state handling is a risk; inspect before editing.
- Partial `index.html` context means new elements could affect unseen layout; keep additions local to the auth area.
- If current auth styling contains syntax issues, the feature may require narrowly scoped CSS correction; broad fixes would create scope drift.
- If mock auth state is currently persisted somewhere in code not reflected in docs, logout may need to clear that existing mechanism to avoid inconsistent UI.
- If other UI regions also reflect auth state, updating only one area may leave inconsistency; avoid expanding scope unless current code already centrally renders auth state.

## Explicit non-goals

- Implementing real auth, credential validation, or server-backed sessions
- Introducing localStorage/sessionStorage persistence if it does not already exist
- Defining a new user profile/identity model
- Refactoring the full auth UI or repairing unrelated CSS issues
- Adding global header/nav session indicators not already implied by current implementation
- Changing gameplay, save data, or other app behavior beyond the visible mock-auth session affordance

## Related Documents
- [[ai/specs/T-0016_spec.md|T-0016 spec]]
- [[ai/reviews/T-0016_gemini_review.md|T-0016 review]]
- [[ai/results/T-0016_executor_report.md|T-0016 result]]
- [[ai/followups/T-0016_followups.md|T-0016 followup]]
- [[ai/pr/T-0016_pr_draft.md|T-0016 pr-draft]]
