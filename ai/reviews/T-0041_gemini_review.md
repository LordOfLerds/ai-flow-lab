# T-0041 Gemini Review

## Review target
- **Task:** T-0041 — Login UI and Persistence
- **Spec:** ai/specs/T-0041_spec.md
- **Lane:** feature-lane (codex executor)

## Contradictions

1. **Module scope vs inline script**: The spec says "Use the existing `auth-state.js` module (already loaded via `<script type="module">`)" but also says "All changes MUST be in `index.html` only." The `auth-state.js` exports (`validateLoginInput`, `applyLoginSuccess`, `createInitialAuthState`) are ES module exports. The game's main `<script>` tag in `index.html` is a regular (non-module) script, meaning it cannot use `import` statements. The Risks section acknowledges this but offers no single recommended approach — the executor needs a clear directive. **Recommendation:** The spec should mandate one approach (e.g., use dynamic `import()` in `index.html`'s inline script, or expose functions on `window` via a small module script block).

2. **Acceptance criterion 11 vs desired behavior**: AC #11 says "Refreshing page while logged in shows login screen (must re-login)" — but the spec also says progress is saved to localStorage. If progress is saved but login is not remembered, users must re-enter credentials every refresh. This is consistent but worth explicitly stating that **only game progress persists, not the auth session**.

## Missing edge cases

1. **localStorage quota exceeded**: The spec mentions "If `localStorage` is full or disabled, the game should gracefully degrade" in Risks, but this is not reflected in any acceptance criterion. Add an AC for graceful degradation when `localStorage.setItem()` throws a `QuotaExceededError` or when `localStorage` is unavailable (e.g., incognito mode in some browsers).

2. **Concurrent tabs**: If the user opens two tabs with the same login, both will read/write the same localStorage key. The last-write-wins behavior could cause data loss (Tab A saves level 5, Tab B overwrites with level 3). The spec should at minimum document this as a known limitation.

3. **Email hash collisions**: The key format `pixelrunner_save_{email_hash}` uses a hash. The spec doesn't specify which hash function. Using a simple hash could lead to collisions. Recommend using a base64-encoded email or a well-known hash (e.g., SHA-256 truncated) and document the choice.

4. **Save data corruption**: If the JSON in localStorage is manually edited or corrupted, `JSON.parse()` will throw. The load function needs a try/catch that falls back to default values.

5. **XSS via email display**: The spec says "show the player's email (truncated) in the top-right of the HUD area." If the email is rendered with `.innerHTML`, it could be an XSS vector. Ensure the email is rendered via `.textContent` or properly escaped.

## Scope risks

1. **Moderate scope creep risk**: The spec includes forward-compatible fields (`completedLevels`, `battlePassTier`) which is good planning, but the executor should NOT implement level select or battle pass UI as part of this task. These fields should be saved/loaded as empty defaults only.

2. **HUD modification complexity**: Adding a logged-in indicator and logout button to the HUD area may require modifying the canvas rendering or adding HTML overlay elements. The spec should clarify whether the HUD is canvas-rendered or HTML — this significantly affects implementation approach.

## Missing tests

1. No cowork test criteria for verifying localStorage save/load round-trip (save progress → refresh → login → verify progress restored).
2. No test for the "Play as Guest" flow verifying that no localStorage entry is created.
3. No test for logout → re-login flow verifying progress continuity.
4. No test for invalid JSON in localStorage (corruption resilience).

## Hidden assumptions

1. **Assumes `auth-state.js` functions are synchronous**: The spec calls `validateLoginInput()` and `applyLoginSuccess()` without mentioning async handling. If these are async, the login flow needs `await`.
2. **Assumes the overlay system can render form elements**: The existing overlay renders game menus (text + buttons). A login form needs `<input>` elements, which may require new CSS styling within the overlay context.
3. **Assumes `checkSkillUnlocks()` and `validateSkinIndex()` exist and are idempotent**: The spec references these functions but doesn't verify they handle being called with restored data that may reference skins/skills from a newer version of the game.

## Recommended corrections

1. **Add a clear directive** for how to import `auth-state.js` functions. Recommend: add a small `<script type="module">` block that imports and exposes functions on `window`, then use them from the main script.
2. **Add acceptance criterion** for localStorage unavailable/full graceful degradation.
3. **Specify the hash function** for email-to-key mapping (recommend simple `btoa(email)` or a djb2 hash for brevity).
4. **Add a save data version field** (`saveVersion: 1`) to the persisted object, as mentioned in Risks but not in the schema.
5. **Clarify HUD implementation**: state whether the email indicator should be an HTML overlay element or rendered on the canvas.
6. **Add try/catch requirement** for `JSON.parse()` of localStorage data.

Overall assessment: **Good spec with minor gaps.** The core behavior is well-defined and the constraints are clear. The main risk is the module import issue, which needs a single clear recommendation rather than three options. Recommend proceeding after addressing items 1, 3, and 6 above.
