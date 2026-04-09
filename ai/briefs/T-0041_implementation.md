# T-0041 Implementation Brief

## Goal
Add a login screen with email/password form to the Pixel Runner game, wire it to the existing `auth-state.js` module, and persist player progress to localStorage keyed by the player's email. Guest mode allows playing without persistence.

## Scope
1. **Login screen** rendered inside `#overlay` / `#menu-content` using HTML form elements (not canvas)
2. **Module bridge**: Add a `<script type="module">` block that imports `auth-state.js` functions and exposes them on `window` (`window.validateLoginInput`, `window.applyLoginSuccess`, `window.createInitialAuthState`)
3. **Save/load system**: JSON object stored in localStorage under key `pixelrunner_save_<btoa(email)>` with schema version field
4. **Logged-in indicator**: HTML overlay element (not canvas) positioned top-right showing truncated email + logout button
5. **Game state integration**: Replace hardcoded `gs.playerLevel = 5` with loaded value; restore skins, skills, and scores from save data

## Constraints
- All changes in `index.html` only (except the module bridge script which uses existing `auth-state.js`)
- No external dependencies, no network calls, no real backend
- All auth is mock/client-side — any valid email + non-empty password succeeds
- localStorage keys namespaced with `pixelrunner_save_` prefix
- Must work offline
- Use `.textContent` (not `.innerHTML`) when displaying email to prevent XSS

## File targets
| File | Action | Description |
|------|--------|-------------|
| `index.html` | MODIFY | Add login screen, save/load system, logged-in indicator, module bridge |

## Tests required
1. **Login flow**: Game loads → login screen visible → enter valid email + password → click Sign In → main menu appears
2. **Validation**: Enter invalid email → inline error message displayed. Empty password → error message displayed
3. **Guest mode**: Click "Play as Guest" → main menu appears, no localStorage entry created
4. **Persistence round-trip**: Login → play game → game over → verify localStorage has save data → refresh page → login again → verify progress restored (playerLevel, coins, gems, score, skin)
5. **Logout flow**: Click logout → progress saved → login screen shown → re-login → progress still intact
6. **Corruption resilience**: Manually corrupt localStorage JSON → login → game loads with default values (no crash)
7. **localStorage unavailable**: If `localStorage.setItem()` throws, game continues as guest mode silently

## Chosen minimal policy

### Module import strategy
Use a `<script type="module">` block at the end of `<body>` that imports from `auth-state.js` and assigns to `window.*` globals. The main game `<script>` block (non-module) accesses these via `window.validateLoginInput()` etc. This is the simplest approach with no build tooling required.

### Email-to-key mapping
Use `btoa(email.toLowerCase().trim())` as the key suffix. This avoids hash collisions entirely (it's a 1:1 encoding) and keeps keys human-readable in DevTools. Key format: `pixelrunner_save_<base64email>`.

### Save data schema
```json
{
  "saveVersion": 1,
  "playerLevel": 1,
  "xp": 0,
  "totalCoins": 0,
  "totalGems": 0,
  "totalScore": 0,
  "bestScore": 0,
  "selectedSkin": 0,
  "unlockedSkills": [],
  "completedLevels": [],
  "battlePassTier": 0
}
```

### Save triggers
- On game over (auto-save)
- On logout (explicit save before clearing auth)
- NOT on every frame or timer (too expensive)

### Login screen styling
Use the existing overlay + menu-content structure with inline CSS that matches the game's pixel art aesthetic. Form inputs styled with monospace font, dark background, neon borders to match game theme.

### HUD indicator
An absolutely positioned `<div>` outside the canvas, top-right, showing `user@...` (truncated to 15 chars) with a small "Logout" text button. Styled to match HUD colors.

### Concurrent tab behavior
Document as known limitation: last-write-wins. No cross-tab synchronization in v1.

### Error handling
- Wrap all `localStorage` access in try/catch
- Wrap `JSON.parse()` of save data in try/catch, fallback to defaults
- If `auth-state.js` functions are not available on `window` within 500ms of page load, fall back to inline validation

## Risks
1. **Timing**: The module script may execute after the main script's `init()`. Mitigate by having `init()` check if auth functions are ready and defer login screen rendering with a small `setTimeout` or use the `DOMContentLoaded` + module load ordering.
2. **Save data migration**: If the schema changes in future tasks (level select, battle pass), the `saveVersion` field enables migration. The loader should check `saveVersion` and apply defaults for any missing fields.
3. **Canvas vs HTML layering**: The logged-in indicator div must have a z-index above the canvas but below the overlay to avoid blocking menus.

## Explicit non-goals
- Real authentication backend (this is all client-side mock)
- Password hashing or security (mock auth — any non-empty password works)
- "Remember me" / auto-login functionality
- Cross-device sync
- Level select UI (future task T-0042)
- Battle pass UI (future task T-0044)
- Shop UI (future task T-0043)
- Implementing completedLevels or battlePassTier functionality (only save/load the fields as empty defaults)
