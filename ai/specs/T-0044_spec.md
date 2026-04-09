# T-0044 Spec

## Task metadata
- **task_id:** T-0044
- **title:** Battle Pass and Progression System
- **lane_type:** feature-lane
- **executor:** codex
- **parent_goal_id:** G-0003

## Problem statement

The Pixel Runner game currently has no battle pass or seasonal progression system. Players earn XP and unlock skills/skins based on cumulative player level, but there is no:
- **Battle pass interface** to view seasonal tier progression
- **Tier-based reward structure** with both free and premium (cosmetic upgrade) tracks
- **Seasonal reset mechanics** to give players repeatable progression goals across seasons
- **Daily/weekly challenge system** to drive engagement and XP farming strategies
- **Visual tier display** showing horizontal-scrolling tier list with progress bars and reward previews

This limits engagement loops and monetization opportunities. Players lack a clear, time-bound progression goal within each season.

## Source of truth

### Existing Code
- `index.html` — Game state object (`gs`), XP accumulation, player level calculation
- `docs/DOMAIN_MODEL.md` — Current XP formula (`N * 100` per level), skill/skin unlock mechanics
- `docs/INVARIANTS.md` — XP progression rules, skill/skin unlock timing, phase transitions

### Referenced Systems
- **Skins System (T-0035)**: Player equips skins with bonuses; battle pass must integrate skin rewards
- **Skills System (T-0036)**: Double-jump, dash, shield unlock at player levels; battle pass should reward skill-related cosmetics
- **Progression System (T-0037)**: localStorage persistence for totalScore, totalCoins, totalGems; battle pass state must persist across sessions

### Configuration
- `CONFIG.SKINS` and `CONFIG.SKILLS` arrays define available items for rewards
- `CONFIG.PHASES` define game states (MENU, PLAYING, GAME_OVER, SKIN_SELECT)

## Desired behavior

### 1. Battle Pass Screen (BATTLE_PASS phase)

A new game phase `BATTLE_PASS` renders when player opens battle pass menu from MENU:
- **Header**: Season name + end date countdown, tier progress bar (e.g., "TIER 8/20")
- **Tier List**: Horizontal scrolling carousel showing all 20 tiers with:
  - Tier number (1–20) displayed prominently
  - Current tier highlighted in color
  - Two reward slots per tier (free track + premium track)
  - Lock/unlock icons to show earned vs. locked rewards
  - Tier requirement XP bar (shows progress toward next tier within current season)
- **Reward Display**: Clicking a tier shows full reward details (skin name, XP amount, coins, gems)
- **Close Button**: Returns to MENU phase
- **Stat Panel**: Shows current season tier, total season XP earned, daily challenge progress (quick view)

### 2. Tier Progression with XP

Each season has independent XP accumulation stored as `battlePass.currentSeason.tierXp`:
- **XP Per Tier**: Tier N requires `N * 500` XP (increases per tier to scale season length ~20–40 hours of gameplay)
- **XP Sources**:
  - Forward progress (existing ScoreTracker): 1 XP per scoring unit (forward progress-based only)
  - Collectibles: coins (+5 XP), gems (+25 XP)
  - Enemy kills: +10 XP per stomp
  - Level completion: +100 XP bonus
  - **Daily challenges** (see below): variable XP rewards
  - **Weekly challenges**: variable XP rewards
- **XP Notifications**: On game over screen, display "Season XP Earned: +350" with tier progression (e.g., "Tier 3 → 4")
- **Carry-over**: When player reaches Tier 20, excess XP does NOT carry over to next season (soft cap)
- **Season Reset**: At season end (configurable date), reset `battlePass.currentSeason.tier` to 1 and `tierXp` to 0, award seasonal rewards

### 3. Free and Premium Tracks

Each tier has two reward slots:

**Free Track Rewards** (always earned):
- Tier 1: 250 coins
- Tier 5: 500 coins + 50 gems
- Tier 10: 1000 coins + 100 gems
- Tier 15: 2000 coins + 200 gems
- Tier 20: 5000 coins + 500 gems + exclusive free skin
- Other tiers: 100–200 coins per tier

**Premium Track Rewards** (cosmetics, optional purchase path):
- Tiers 1–20: Exclusive skin colorways, weapon/effect cosmetics (unlocked via premium pass purchase)
- Premium skins grant cosmetic-only bonuses (visual effects, unique colors, player tags)
- Premium items grant NO gameplay advantage (cosmetic only per design constraint)
- Premium pass purchase price: configurable (out of scope for this spec; recommend $9.99 per season)

### 4. Reward Unlocks Per Tier

Rewards auto-unlock as player reaches each tier:
- **Free Tier Rewards**: Instantly added to inventory (coins/gems sent to `gs.coins`/`gs.gems`)
- **Premium Tier Rewards**: Marked as "unlocked" in `battlePass.premiumRewards[]` array; shown in inventory with lock icon until premium pass purchased
- **Skin Rewards**: Added to `CONFIG.SKINS` with `battlePassUnlocked: true` flag; become selectable in SKIN_SELECT phase
- **No Duplicate Items**: If reward already owned, show coin bonus instead (e.g., "Duplicate Reward: +200 coins")
- **Reward Tracking**: Store `battlePass.unlockedRewards` array (tier number + track type) to prevent duplicate claims on page reload

### 5. Daily and Weekly Challenges

**Challenge System**:
- Challenge state stored in `battlePass.currentSeason.challenges` (daily[], weekly[])
- **Daily Challenges** (reset every 24 hours, timezone-aware):
  - 3 daily challenges per day, mix of difficulty/reward tiers
  - Examples:
    - "Collect 50 coins" → +100 XP
    - "Complete 3 levels" → +150 XP
    - "Get 5 enemy kills in one run" → +200 XP
    - "Survive 2 minutes without taking damage" → +180 XP
  - Each challenge shows progress bar (e.g., "Collected 35/50 coins")
  - Mark complete with checkmark when done; claim reward with button
  - Reroll: 1 free reroll per day; cost 50 gems thereafter (out of scope for button implementation)
  - Unclaimed rewards carry to next day (max 3 unclaimed daily sets)
- **Weekly Challenges** (reset every 7 days):
  - 5 weekly challenges per week, higher difficulty/rewards
  - Examples:
    - "Reach tier 10 in one season" → +500 XP
    - "Kill 50 enemies" → +300 XP
    - "Collect 500 total coins across all levels" → +250 XP
  - Progress tracked cumulatively (never resets mid-week)
  - Bonus: Complete all 5 weekly challenges → +1000 bonus XP
  - Weekly challenges show time remaining until reset
- **Challenge Tracking**: Store player progress in `battlePass.currentSeason.challengeProgress[challengeId] = { current, target, completed }`
- **On-Screen Notifications**: When challenge completes, show floating text: "Challenge Complete! +150 XP"

### 6. Seasonal Reset

At configurable season end date/time (stored as `battlePass.config.seasonEndDate`):
- **Automatic Actions**:
  1. Archive current season data to `battlePass.pastSeasons[]` (for leaderboard history)
  2. Reset `currentSeason` to new season (increment season number, new tier 1, tier XP = 0)
  3. Clear daily/weekly challenges; generate new season's challenges from pool
  4. Carry **free track rewards only** (coins, gems) to inventory; premium rewards reverted (cosmetics stay owned)
  5. Show "Season End" modal with summary: "You reached Tier 12 this season! Earned 15,000 coins."
  6. Prompt for new season start
- **Manual Reset** (debug/admin): Right-click on battle pass screen → "Reset Season Now" (dev-only, remove before production)

### 7. UX / Screen Flow

- **Menu → Battle Pass**: Add "BATTLE PASS" button to MENU phase (between "PLAY" and "SKINS")
- **BATTLE_PASS Phase**: Display tier carousel with smooth horizontal scroll (mouse wheel / arrow keys)
  - Tier 1 starts at left; player's current tier centered
  - Rewards show as small icon thumbnails (coin emoji, gem emoji, skin color swatch)
  - Hover over reward → tooltip showing full name + description
- **Game Over Screen**: Add battle pass progress widget:
  - Tier number + XP bar progress
  - "Season XP Earned: +350 (Tier 3 → Tier 4)"
  - Link to view battle pass
- **Challenge Widget** (optional, out of core scope): Small corner HUD element showing active daily challenge progress (1-line text: "Collect Coins: 35/50")

## Constraints

### Single-File Architecture
- All battle pass code must live within `index.html` (no external files)
- No new HTTP requests or external API calls
- Battle pass state integrated into existing `gs` (game state) object

### Data Persistence
- All battle pass state saved to localStorage as `gameState.battlePass` object
- Must serialize/deserialize properly across browser sessions
- localStorage quota: assume max 5 MB per origin

### Gameplay Balance
- XP earnings must not break existing economy (coins, gems, score)
- Tier XP formula (`N * 500`) targets ~25 hours per season at baseline gameplay (no challenge bonuses)
- Premium rewards grant NO gameplay advantage (cosmetic-only; per design constraint)
- Challenge reroll costs 50 gems to encourage gem spending (optional, not required in initial version)

### Phase Transitions
- `BATTLE_PASS` phase must follow existing phase model: `MENU ↔ BATTLE_PASS`, `BATTLE_PASS → MENU`, `BATTLE_PASS → PLAYING` (if "Play Now" button added)
- No new phases other than `BATTLE_PASS`

### Backward Compatibility
- Existing players without battle pass state must auto-initialize: `battlePass = { currentSeason: { tier: 1, tierXp: 0, ... }, premiumPassed: false, ... }`
- Old XP/player level system continues to exist independently (battle pass is separate progression)
- Existing skins/skills unlock rules unchanged

### Rendering Performance
- Battle pass tier carousel must render smoothly (60 FPS) with ≤20 DOM nodes or canvas-rendered
- Recommend canvas-based rendering to match existing pixel art aesthetic
- No expensive reflows on scroll

## Acceptance criteria

- [ ] Battle pass state object created in `gs` with schema: `{ currentSeason: { number, tier, tierXp, challenges[] }, premiumPass: bool, unlockedRewards[], pastSeasons[] }`
- [ ] Game phase `BATTLE_PASS` implemented; transitions: `MENU ↔ BATTLE_PASS`, `BATTLE_PASS → MENU`
- [ ] Battle pass screen renders with 20-tier horizontal carousel, current tier highlighted, reward icons visible
- [ ] Tier XP formula: Tier N requires `N * 500` XP; tier progression updates on game over screen
- [ ] XP earned from all sources (forward progress, collectibles, kills, level completion) tracked separately in season
- [ ] Daily challenges: 3 per day, auto-reset every 24 hours, progress tracked, rewards claimable, 1 free reroll per day
- [ ] Weekly challenges: 5 per week, auto-reset every 7 days, progress cumulative, bonus XP for completing all 5
- [ ] Free track rewards assigned to tiers (coins/gems per tier distribution); auto-unlock and add to inventory
- [ ] Premium track rewards stored separately; marked locked until premium pass purchased; display with lock icon
- [ ] Skin rewards from battle pass can be selected in SKIN_SELECT phase and display correctly with battle pass flag
- [ ] Seasonal reset: tier and tier XP reset at `seasonEndDate`, archive old season data, generate new challenges
- [ ] Battle pass state persisted to localStorage (`gameState.battlePass`) and restored on page load
- [ ] Game over screen displays battle pass progress: tier number, XP earned this run, tier-up notification if applicable
- [ ] Challenge completion shows floating notification: "Challenge Complete! +XP_AMOUNT"

## Risks

### Risk 1: Complexity Scope Creep
- **Description**: Battle pass system touches 8+ game systems (XP, inventory, phase management, localStorage, cosmetics, challenges, notifications, UI)
- **Probability**: Medium
- **Severity**: High (could delay executor by 2–3 days)
- **Mitigation**: Keep MVP scope tight:
  - Skip premium pass purchase flow (mock as always purchased for now)
  - Simplify challenge descriptions (no dynamic target values)
  - Use static reward pools (no seasonal reward rotation in V1)
  - Revert UI embellishments if time-bound (focus on mechanic correctness)

### Risk 2: localStorage Size / Corruption
- **Description**: Storing 20 tiers × 2 rewards + challenge progress + past seasons could exceed localStorage limits or corrupt on malformed JSON
- **Probability**: Low
- **Severity**: Medium (player loses progress, forced data wipe)
- **Mitigation**:
  - Cap `pastSeasons` history to last 3 seasons (prune oldest)
  - Test localStorage serialization under max reward load
  - Add JSON parse error handler: if battlePass deserialization fails, reset to default state with warning

### Risk 3: XP Economy Double-Counting
- **Description**: If both player level XP and battle pass season XP are awarded from same events, players could perceive unfair double-progression
- **Probability**: Low
- **Severity**: Low (cosmetic only; no gameplay impact)
- **Mitigation**:
  - Document that player level and season tier are independent progression systems
  - Ensure display clearly separates "Player Level X" from "Battle Pass Tier Y"
  - In HUD, show both but visually distinct

### Risk 4: Challenge Resets Tied to Server Time
- **Description**: Browser-only game has no authoritative time source; relying on client `Date.now()` allows cheating (system clock manipulation)
- **Probability**: Medium
- **Severity**: Low (casual game, low-stakes cheating impact)
- **Mitigation**:
  - Store `lastDailyResetDate` and `lastWeeklyResetDate` as ISO strings; compare with current date (tolerates clock skew of ±1 day)
  - Add server-side validation note for future backend: "TODO: Fetch authoritative time from server if backend added"
  - For MVP: Accept client-side reset logic; flag as known limitation in code comment

### Risk 5: Executor Unfamiliar with Pixel Art Rendering
- **Description**: Battle pass UI requires canvas-based sprite/icon rendering; executor may be unfamiliar with existing drawing system
- **Probability**: Low
- **Severity**: Medium (visual artifacts, performance issues)
- **Mitigation**:
  - Provide detailed drawing examples in executor brief (copy existing sprite drawing code)
  - Keep carousel rendering simple: rectangles + text + icon placeholders (not animated in V1)
  - Test rendering performance early (first day of execution)

### Risk 6: Season End Date Calculation
- **Description**: Timezone-aware season end dates could cause confusion (when exactly does a season end for player in UTC-8?)
- **Probability**: Medium
- **Severity**: Low (affects late-season player experience only)
- **Mitigation**:
  - Store `seasonEndDate` as ISO 8601 string + timezone identifier (e.g., "2026-05-08T23:59:59Z")
  - Display season end time in player's local timezone in UI
  - Default to UTC for MVP; add timezone picker in settings (out of scope)

## Open questions

1. **Premium Pass Purchase UX**: Should executor implement a fake "purchase" button that mocks buying premium pass, or is premium pass assumed purchased for testing?
   - **Recommendation**: Mock premium as always purchased for MVP; add UI button as placeholder ("Unlock Premium") without transaction logic

2. **Challenge Reroll Limits**: Should players be able to reroll unlimited times at 50 gems each, or cap at 1 free reroll per day?
   - **Recommendation**: 1 free reroll per day; 50 gems per additional reroll. Implement full logic.

3. **Cosmetic Item Definitions**: Should executor create new cosmetic items (skins, weapon trails, effects) or use existing skin palette?
   - **Recommendation**: Reuse existing `CONFIG.SKINS` as cosmetics; mark battle pass skins with `isCosmetic: true` flag to distinguish from core unlocks

4. **Challenge Difficulty Scaling**: Should daily/weekly challenges scale in difficulty based on player level, or fixed for all players?
   - **Recommendation**: Fixed challenges for MVP; challenges don't check player level. Future seasons can add difficulty scaling.

5. **Debug/Admin Controls**: Should executor add dev-only console commands (e.g., `window.advanceBattlePassTier()`, `window.resetSeason()`) or rely on manual localStorage editing?
   - **Recommendation**: Add 3 debug functions (advanceTier, resetSeason, completeChallenge) guarded by `isDev` flag; remove before production

6. **Leaderboard Integration**: Is seasonal leaderboard out of scope, or should executor store tier rankings locally for future backend integration?
   - **Recommendation**: Store `battlePass.pastSeasons[].playerTierAtEnd` for each season; format ready for future leaderboard API; don't implement UI in this task

7. **Challenge Pool Size**: How many unique daily/weekly challenge templates should be created?
   - **Recommendation**: Start with 5–8 daily + 7–10 weekly templates; implement enough variety to avoid repetition within a season; can expand later
