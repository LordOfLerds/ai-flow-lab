---
type: brief
task_id: T-0013
created: 2026-04-10
tags: [ai-flow-lab, brief]
---

# T-0013 Implementation Brief

## Goal
Add the smallest safe, execution-ready version of "User Login" that fits the current repo truth.

Because the provided truth indicates a standalone `index.html` game with no existing backend, account model, or auth infrastructure, this task is resolved as a **front-end login shell with explicit mock behavior**, not real authentication. This avoids inventing unsupported backend/domain rules while still delivering a concrete feature lane outcome.

## Scope
Implement a minimal email-login UI flow in the existing app that:

- adds a visible login form with:
  - email field
  - password field
  - submit button
- validates basic client-side input:
  - required fields
  - email-shaped input
- handles states:
  - idle
  - submitting
  - success
  - failure
- uses **generic failure messaging**
- prevents obvious insecure UI behavior:
  - no password echo outside password field
  - no differentiated "email exists / does not exist" errors
  - disable repeat submit while submitting
- gates a clearly defined local UI state as "logged in"

Implementation should be explicitly labeled or structured as **mock/local-only authentication** unless repository docs discovered during execution define a real auth path.

If the source-of-truth docs exist in repo and define real authentication requirements, those docs override this brief. Any conflict must be recorded in `ai/current-state/drift-register.md`.

## Constraints
- Do not build a real backend, database, session service, registration flow, password reset flow, MFA flow, or email delivery system.
- Do not invent undocumented business rules for:
  - password policy
  - lockout thresholds
  - verification requirements
  - remember-me semantics
  - account creation
- Keep changes tightly scoped to login entry and local authenticated UI state.
- Resolve contradiction explicitly:
  - task metadata says `executor: codex`
  - repo truth says Claude is executor/gatekeeper
  - **policy:** preserve task metadata as task routing metadata; do not rewrite it in implementation. Claude/execution-process rules remain operationally authoritative.
- Because "all security steps" is underspecified and unsupported by current repo truth, interpret it as **baseline front-end-safe measures only**, not full production auth security.

## File targets
Primary expected targets:

- `index.html`
  - add login UI
  - add logged-in/logged-out state handling
  - integrate minimal client-side validation and submit behavior

Possible secondary targets only if needed:

- `styles.css` or existing inline style area in `index.html`
  - minimal styling for login form and state feedback
- existing front-end script area/file
  - extract login state logic if current page already separates JS
- `ai/current-state/drift-register.md`
  - only if repo docs or code contradict the assumptions above

Do not create backend/service files unless existing repo structure already contains an auth client abstraction that can be safely reused.

## Tests required
At minimum, add or perform verification for:

- login form renders
- email field is required
- password field is required
- invalid email format is rejected client-side
- submit is blocked when inputs are invalid
- password input uses password masking
- submitting enters temporary disabled/submitting state
- success path sets local logged-in UI state
- failure path shows a generic error message
- failure path does not reveal whether an email is registered
- logged-in state does not break existing game UI initialization
- page behavior on reload is defined and tested/documented:
  - if no persistence is added, user returns to logged-out state
  - if persistence is added, it must be explicitly local-only and documented as mock behavior

If there is no automated test harness in repo, require at least a concise manual verification checklist covering the above.

## Chosen minimal policy
Use this minimal implementation policy unless overridden by discovered repo docs:

- auth mode: **mock/local UI authentication only**
- accepted credential model for mock flow:
  - email + password form
  - validation only; no real credential verification against a server
- success behavior:
  - transition app to local "logged in" state
- failure behavior:
  - generic single-message error only
- persistence:
  - default to **no persistent login across reloads**
  - reason: smallest safe scope, avoids inventing session rules
- security baseline included:
  - required-field validation
  - basic email-shape validation
  - password masking
  - generic errors
  - disabled repeated submission during in-flight state
- security features explicitly excluded unless docs require them:
  - MFA
  - rate limiting
  - lockouts
  - password hashing/storage
  - secure cookies
  - server sessions
  - CSRF handling
  - audit logging

## Risks
- The feature may not match owner intent if real account authentication was expected.
- A mock login can be mistaken for real security unless UI wording is clear.
- Existing game layout in `index.html` may make login insertion awkward or brittle.
- If hidden repo docs define auth architecture, this brief may become partially obsolete and require drift logging.
- Even minimal login state can create follow-on expectations for registration, logout, and persistence.

## Explicit non-goals
- Real user authentication
- Backend/API implementation
- User/account database
- Registration/sign-up
- Password reset
- Email verification
- Magic link / OTP flows
- MFA
- Rate limiting or lockout infrastructure
- Cross-tab/session persistence beyond explicitly documented local mock behavior
- Broad app architecture refactor
- Rewriting task metadata or repo role docs

## Related Documents
- [[ai/specs/T-0013_spec.md|T-0013 spec]]
- [[ai/reviews/T-0013_gemini_review.md|T-0013 review]]
- [[ai/results/T-0013_executor_report.md|T-0013 result]]
- [[ai/followups/T-0013_followups.md|T-0013 followup]]
- [[ai/pr/T-0013_pr_draft.md|T-0013 pr-draft]]
