# T-0016 Spec

## Task metadata

- **Task ID:** T-0016
- **Title:** Add logout control and visible logged-in indicator for the mock auth state
- **Lane type:** feature-lane
- **Executor:** claude

## Problem statement

The current UI includes mock authentication styling and session-oriented elements such as `.auth-status` and `.session-chip`, which suggests an existing or intended mock auth flow. However, based on the provided repository truth, there is no documented or visible requirement describing how a user can clearly tell they are logged in or how they can log out once mock authentication is active.

This creates a usability gap for the mock auth state:

- a user may be able to enter a mock logged-in state but not have a clear persistent indication of that state
- a user may not have an explicit control to return to a logged-out state
- the UI may expose auth-related styling without a complete interaction loop

Because the source-of-truth docs referenced in `AGENTS.md` were not included in the provided materials, the exact intended auth model is uncertain. The spec therefore stays narrowly scoped to the task title and current visible code clues.

## Source of truth

Primary sources consulted from provided repo truth:

- `AGENTS.md`
  - states that primary truth should come from:
    - `docs/DOMAIN_MODEL.md`
    - `docs/INVARIANTS.md`
    - `docs/ARCHITECTURE.md`
    - `docs/ADR/`
- `index.html`
  - contains auth-related styles:
    - `.auth-panel`
    - `.auth-title`
    - `.auth-note`
    - `.auth-form`
    - `.auth-field`
    - `.auth-error`
    - `.auth-actions`
    - `.auth-status`
    - `.auth-status.success`
    - `.auth-status.error`
    - `.session-chip`

Uncertainty:

- The actual `docs/DOMAIN_MODEL.md`, `docs/INVARIANTS.md`, `docs/ARCHITECTURE.md`, and `docs/ADR/` contents were not provided in the task input.
- The provided `index.html` is partial and explicitly says the entire HTML content is not shown.
- No current JavaScript auth logic was provided.
- Therefore, if existing code already implements part of the mock auth behavior, it may be ahead of the provided docs/context. That cannot be confirmed from the supplied material.

## Desired behavior

Add a complete visible mock-auth session affordance to the existing UI so that:

1. when the mock auth state is logged out:
   - the interface presents the existing mock auth entry flow as currently designed
   - no logged-in indicator is shown as if a session were active

2. when the mock auth state is logged in:
   - the interface displays a clear visible logged-in indicator
   - the indicator is persistent while the mock session remains active
   - the interface presents an explicit logout control

3. when the user activates logout:
   - the mock auth state returns to logged out
   - the visible logged-in indicator is removed or updated to reflect logged-out status
   - any session-specific messaging in the auth area updates accordingly

4. the logged-in indicator should be visually understandable within the existing auth UI language already implied by the styles, likely reusing or extending the existing `.session-chip` pattern rather than introducing a separate unrelated presentation

5. the logout control should be discoverable and available in the same general auth/session area, unless the existing hidden markup or script structure requires a different placement

Because the exact mock-auth fields and state model are not included in the provided materials, this spec does not define:
- what user identifier is displayed in the logged-in indicator
- whether logout clears only in-memory state or persisted browser state
- whether login/logout affects game progression, save data, or HUD state

Those behaviors should remain aligned with existing implementation if present.

## Constraints

- Prefer minimal safe changes, consistent with `CLAUDE.md`.
- Do not invent a real authentication system; this task is explicitly about the **mock auth state**.
- Do not expand scope into authorization, backend integration, or persistence rules unless those already exist in code.
- Reuse existing UI patterns and classes where possible, especially the apparent auth/session styling already present in `index.html`.
- Preserve task isolation: only changes necessary for logout control and visible logged-in indication should be introduced.
- If implementation reveals a conflict between docs and tested code, that conflict must be documented in `ai/current-state/drift-register.md` per `AGENTS.md`.
- Because the provided source is incomplete, any implementation decisions that depend on hidden markup or existing JS state management should be treated as uncertain and resolved conservatively.

## Acceptance criteria

- A user in the mock logged-in state can see a clear visible indicator that they are currently logged in.
- A user in the mock logged-in state has an explicit logout control available in the UI.
- Activating the logout control transitions the mock auth UI back to a logged-out state.
- After logout, the logged-in indicator no longer presents the user as logged in.
- The auth/session UI updates without requiring a full page refresh, unless the current implementation architecture only supports refresh-based updates. This is uncertain because no JS implementation was provided.
- The new UI remains visually consistent with the existing auth-related styling in `index.html`.
- No real auth backend, credential validation system, or non-mock session management is introduced as part of this task.
- If existing code behavior differs from absent documentation, the uncertainty or drift is explicitly recorded rather than silently normalized.

## Risks

- The provided `index.html` is partial, so existing markup or script hooks for auth may already exist and constrain the correct placement of the indicator and logout control.
- The current CSS contains likely issues unrelated to this task, such as:
  - `.auth-form { display: flex, flex-direction: column; gap: 10px; }`
  - `auth-field { ... }` instead of `.auth-field { ... }`
  These may affect auth UI behavior, but fixing them broadly could expand scope. Whether they must be touched depends on the actual implementation context.
- Without the source-of-truth docs, there is a risk of implementing UI behavior that diverges from undocumented project expectations.
- If mock auth state is persisted somewhere not shown in the provided materials, logout behavior could be incomplete unless that persistence layer is also updated.
- If other gameplay or overlay views depend on auth state, adding a visible indicator in only one place may leave inconsistent session signaling elsewhere.

## Open questions

- What existing mock auth behavior already exists in JavaScript, if any?
- Where is the mock auth state currently stored: in memory, local storage, URL state, or not at all?
- What user-facing value should appear in the logged-in indicator:
  - a static “Logged in”
  - a username/email from the mock form
  - another session label
- Should the indicator appear only inside the auth panel, or also elsewhere such as the HUD or overlay header?
- Should logout clear any mock user input fields, saved mock session data, or status messages?
- Are there docs in `docs/DOMAIN_MODEL.md`, `docs/INVARIANTS.md`, `docs/ARCHITECTURE.md`, or `docs/ADR/` that define mock auth behavior but were not included in the task input?
- If the hidden code already implements login state transitions, should this task only expose missing UI controls, or also normalize state-handling behavior if inconsistencies are found?