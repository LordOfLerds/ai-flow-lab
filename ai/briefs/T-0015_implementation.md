# T-0015 Implementation Brief

## Goal

Create lightweight browser-based smoke tests that validate the mock authentication system in Pixel Runner, focusing on form validation, authentication logic, and core state transitions without modifying the game code.

## Scope

**In scope:**
- Form validation for email/password fields and submission states
- Mock authentication flow testing (success/fail paths)
- Core state transitions: LOGIN → MENU → PLAYING 
- Basic UI element visibility and interaction
- State reset mechanism for test isolation
- Simple pass/fail test reporting

**Resolved contradictions:**
- Tests may read global `gs` object for state inspection (not considered "modification")
- Tests may call exposed game functions like initialization for cleanup between tests
- Document LOGIN phase drift in `ai/current-state/drift-register.md`

## Constraints

- **No game code changes**: Tests are external, read-only validation
- **Vanilla JavaScript**: No external test frameworks or dependencies
- **Single browser focus**: Target modern Chrome/Firefox, no cross-browser matrix
- **Mock authentication only**: No backend/network simulation
- **Synchronous DOM operations**: Avoid complex async timing issues

## File targets

- `tests/auth-smoke-tests.html` - Test runner page
- `tests/auth-smoke-tests.js` - Test implementation
- `ai/current-state/drift-register.md` - Document LOGIN phase drift

## Tests required

1. **Form validation tests:**
   - Email required and format validation
   - Password required validation  
   - Submit button disabled during submission

2. **Authentication flow tests:**
   - Valid email → success → MENU transition
   - Email containing "fail" → error message + remain in LOGIN
   - Status updates: idle → submitting → success/failure

3. **State transition tests:**
   - `gs.phase` transitions correctly (LOGIN → MENU → PLAYING)
   - UI overlay visibility matches phase
   - Page reload resets to LOGIN phase

4. **Error handling tests:**
   - Required field validation messages
   - Invalid email format messages
   - Generic authentication failure message

## Chosen minimal policy

- **Test framework**: Vanilla JS with simple assertion functions
- **State management**: Call game initialization before each test
- **DOM interaction**: Direct querySelector access, no complex waiting
- **Error reporting**: Console output with pass/fail counts
- **Browser support**: Modern browsers only (ES6+ features)

## Risks

1. **Timing dependencies**: Game uses setTimeout(1000) for auth - tests must account for this delay
2. **State pollution**: Global `gs` object needs reset between tests - use game's init functions
3. **DOM manipulation race conditions**: Game updates DOM asynchronously - add minimal wait strategies
4. **Test maintenance**: Changes to authentication logic will require test updates

## Explicit non-goals

- Cross-browser compatibility testing
- Visual regression or screenshot testing  
- Accessibility testing (keyboard nav, screen readers)
- Performance or timing precision tests
- Integration with CI/CD pipelines
- Testing browser autofill or password manager integration
- Internationalization or Unicode edge cases
- Mobile/touch interaction testing
- Security testing (XSS protection, etc.)