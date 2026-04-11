---
type: spec
task_id: T-0015
created: 2026-04-10
tags: [ai-flow-lab, spec]
---

# T-0015 Spec

## Task metadata
- **Task ID**: T-0015
- **Title**: Add browser-based smoke tests for mock login validation and state transitions
- **Lane type**: test-lane
- **Executor**: claude
- **Dependencies**: None (tests existing login functionality)
- **Estimated complexity**: Medium

## Problem statement

The Pixel Runner game includes a mock authentication system with email/password validation and multiple game state transitions (LOGIN → MENU → PLAYING → GAME_OVER). Currently, there are no automated tests to verify that:

1. The login form validation works correctly
2. State transitions occur as expected
3. Mock authentication logic behaves consistently
4. Error handling displays appropriate messages
5. UI elements render and function properly across different states

Without automated tests, regressions in the authentication flow or state management could go unnoticed, potentially breaking the user experience.

## Source of truth

- **Primary**: `index.html` - Contains the complete game implementation including authentication system
- **Secondary**: `CLAUDE.md` - Defines Claude's role as executor and reviewer
- **Reference**: `AGENTS.md` - Confirms task isolation and testing requirements

The authentication system in `index.html` shows:
- Mock authentication with local-only validation
- Email format validation and required field checks
- Password masking and required validation
- Success path for valid credentials (non-"fail" emails)
- Failure path for emails containing "fail"
- State management: `gs.phase` transitions between LOGIN, MENU, PLAYING, GAME_OVER

## Desired behavior

Create browser-based smoke tests that validate:

1. **Form Validation**:
   - Email field is required and validates format
   - Password field is required and masked
   - Submit button disabled state during validation/submission
   - Error messages display correctly for invalid inputs

2. **Authentication Logic**:
   - Valid email + password → success state → main menu
   - Email containing "fail" → failure state with generic error
   - Submission status updates (idle → submitting → success/failure)

3. **State Transitions**:
   - LOGIN phase shows authentication form
   - Successful login transitions to MENU phase
   - Failed login remains in LOGIN phase with error
   - Page reload resets to LOGIN phase (no persistence)

4. **UI Elements**:
   - Form fields render with correct attributes
   - Buttons enable/disable appropriately
   - Status messages display with correct styling
   - Game overlay shows/hides based on phase

## Constraints

- **No backend dependencies**: Tests must work with the mock/local-only authentication
- **Browser-based**: Tests should run in a standard web browser environment
- **No modification to game code**: Tests should be external validation only
- **Minimal test framework**: Use lightweight testing approach (e.g., vanilla JS or simple test library)
- **No persistence**: Tests must account for the intentionally stateless nature of the mock auth

## Acceptance criteria

1. **Test Setup**:
   - [ ] Tests can be run independently of the main game
   - [ ] Test runner loads the game in a test environment
   - [ ] Clear pass/fail reporting for each test case

2. **Login Form Tests**:
   - [ ] Email field validation (required, format)
   - [ ] Password field validation (required, masked)
   - [ ] Submit button state changes during submission
   - [ ] Form prevents submission with invalid data

3. **Authentication Flow Tests**:
   - [ ] Success path: valid email → menu transition
   - [ ] Failure path: "fail" email → error message
   - [ ] Status message updates correctly
   - [ ] Reload resets to login state

4. **State Transition Tests**:
   - [ ] `gs.phase` changes correctly between states
   - [ ] UI overlay visibility matches game phase
   - [ ] Game initialization works after successful login

5. **Error Handling Tests**:
   - [ ] Invalid email format shows appropriate error
   - [ ] Empty fields show required field errors
   - [ ] Generic failure message for authentication errors

## Risks

1. **Timing Issues**: Asynchronous authentication flow (setTimeout) may require careful timing in tests
2. **DOM Manipulation**: Game modifies DOM dynamically; tests need to account for rendering delays
3. **State Pollution**: Game state (`gs` object) may need reset between tests
4. **Browser Compatibility**: Different browsers may handle form validation differently
5. **Test Maintenance**: Changes to game authentication logic will require test updates

## Open questions

1. Should tests include visual regression testing for UI elements?
2. What level of browser compatibility should be targeted for tests?
3. Should tests validate the manual verification checklist items from the game code comments?
4. Is there a preference for a specific testing framework or approach?
5. Should tests be integrated into a CI/CD pipeline or remain manual?
6. How should test failures be reported and tracked?

## Related Documents
- [[ai/reviews/T-0015_gemini_review.md|T-0015 review]]
- [[ai/briefs/T-0015_implementation.md|T-0015 document]]
- [[ai/results/T-0015_executor_report.md|T-0015 result]]
