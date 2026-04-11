---
type: spec
task_id: T-0041
created: 2026-04-10
tags: [ai-flow-lab, spec]
---

# T-0041 Spec

## Task metadata
- **task_id:** T-0041
- **title:** Login UI and Persistence
- **lane_type:** feature-lane
- **executor:** codex
- **parent_goal_id:** G-0003

## Problem statement
The Pixel Runner game currently has no user authentication or progress persistence. When the page is refreshed, all player progress (level, XP, coins, gems, unlocked skins, unlocked skills) is lost. The game hardcodes `gs.playerLevel = 5` in `init()` and has no way to differentiate between players or save their achievements. The existing `auth-state.js` module provides validation utilities (`createInitialAuthState`, `validateLoginInput`, `applyLoginSuccess`) but is not wired into the game's UI or state.

## Source of truth
- **`index.html`** — Main game file with all rendering, game state (`gs` object), menu system (`showMainMenu`, `showSkinSelect`, `showSkillsMenu`), overlay system
- **`auth-state.js`** — Auth state machine with email validation, login/logout state transitions, and status messages (`AUTH_MESSAGES`)
- **`docs/ARCHITECTURE.md`** — Product architecture (should be updated after implementation)
- **`docs/DOMAIN_MODEL.md`** — Domain model reference

## Desired behavior

### Login Screen
1. When the game loads, instead of showing the main menu immediately, show a **login screen** in the existing `#overlay` element
2. The login screen displays the game title "PIXEL RUNNER" and a login form with:
   - Email input field (validated by `auth-state.js`)
   - Password input field
   - "Sign In" button
   - "Play as Guest" link below the form
   - Status/error messages below the inputs
3. Use `validateLoginInput()` from `auth-state.js` for form validation
4. On successful login (any valid email + non-empty password), call `applyLoginSuccess()` and transition to the main menu
5. "Play as Guest" skips login and goes directly to main menu with a temporary session (no persistence)

### Logged-in Indicator
6. When logged in, show the player's email (truncated) in the top-right of the HUD area
7. Add a small "Logout" button/link next to it
8. On logout, save current progress, clear auth state, and return to the login screen

### localStorage Persistence
9. On login, load saved progress from `localStorage` using key `pixelrunner_save_{email_hash}`
10. Saved data includes: `playerLevel`, `xp`, `totalCoins`, `totalGems`, `totalScore`, `bestScore`, `selectedSkin`, `unlockedSkills`, `completedLevels` (for future use), `battlePassTier` (for future use)
11. On game over, auto-save progress to localStorage
12. On logout, save progress before clearing auth
13. Guest mode does NOT persist — progress resets on page refresh

### Game State Integration
14. Replace the hardcoded `gs.playerLevel = 5` in `init()` with loaded value from save data (default: 1 for new players)
15. After loading save data, call `checkSkillUnlocks()` to restore unlocked skills
16. Restore `selectedSkin` from save data and validate with `validateSkinIndex()`

## Constraints
- All changes MUST be in `index.html` only (single-file game)
- Use the existing `auth-state.js` module (already loaded via `<script type="module">`)
- Use the existing `#overlay` / `#menu-content` DOM structure for the login screen
- Do NOT introduce any external dependencies or libraries
- Do NOT create a real backend — all auth is mock/client-side
- localStorage keys must be namespaced to avoid collisions
- Must work offline (no network calls)

## Acceptance criteria
1. [ ] Game loads showing login screen instead of main menu
2. [ ] Email validation displays inline error for invalid emails
3. [ ] Password field shows error if empty on submit
4. [ ] Valid email + non-empty password → transitions to main menu
5. [ ] "Play as Guest" link → transitions to main menu without persistence
6. [ ] Logged-in indicator shows email in HUD area
7. [ ] Logout button returns to login screen
8. [ ] Player progress saves to localStorage on game over and logout
9. [ ] Player progress loads from localStorage on login
10. [ ] Guest mode does not persist progress
11. [ ] Refreshing page while logged in shows login screen (must re-login)
12. [ ] `gs.playerLevel` is loaded from save data, not hardcoded

## Risks
- The `auth-state.js` is loaded as a module (`type="module"`), so its functions may not be accessible from the inline `<script>` in `index.html`. The executor may need to either: (a) convert auth-state.js exports to `window.*` globals, or (b) inline the auth functions into index.html, or (c) use dynamic import.
- The save data schema needs to be forward-compatible with future features (level select, battle pass). Using a version field in the save object is recommended.
- If `localStorage` is full or disabled, the game should gracefully degrade (play as guest).

## Open questions
1. Should the game auto-login if a previous session exists in localStorage? (Suggested: No — always show login screen for simplicity)
2. Should the password have a minimum length requirement? (Suggested: No — it's mock auth, any non-empty password works)
3. Should there be a "Remember me" checkbox? (Suggested: No — keep it simple for v1)


## Related Documents
- [[ai/reviews/T-0041_gemini_review.md|T-0041 review]]
- [[ai/briefs/T-0041_implementation.md|T-0041 document]]
- [[ai/results/T-0041_executor_report.md|T-0041 result]]
- [[ai/followups/T-0041_followups.md|T-0041 followup]]
- [[ai/pr/T-0041_pr_draft.md|T-0041 pr-draft]]
