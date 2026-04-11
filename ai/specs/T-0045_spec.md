---
type: spec
task_id: T-0045
created: 2026-04-10
tags: [ai-flow-lab, spec]
---

# T-0045 Spec

## Task metadata
- **task_id:** T-0045
- **title:** Update game architecture and domain docs
- **lane_type:** docs-lane
- **executor:** claude
- **parent_goal_id:** G-0003

## Problem statement

The Pixel Runner game has received significant feature additions since the last documentation update (T-0014). G-0003 task group added new systems including a login/account system, level progression with level select UI, in-game shop, battle pass with tier progression, themed level environments, and enhanced game over screen with persist state. The existing documentation (`docs/ARCHITECTURE.md`, `docs/DOMAIN_MODEL.md`, `docs/INVARIANTS.md`) was last updated based on code snapshot from T-0032 and does not reflect these new systems, creating a gap between implemented features and documented architecture. This drift makes it difficult for future executors to understand system behavior, risks, and invariants.

## Source of truth

Primary documentation files to update:
- **docs/ARCHITECTURE.md** — System components, data flow, rendering pipeline, deployment model
- **docs/DOMAIN_MODEL.md** — Core entities, attributes, relationships, lifecycle states
- **docs/INVARIANTS.md** — Data integrity rules, process guarantees, consistency constraints

Secondary references (read-only):
- `index.html` — Current implementation source code (3000+ lines estimated with new features)
- `automation/docs/dev/PIPELINE.md` — Understanding of task context
- Previous task documentation: T-0014, T-0027, T-0029, T-0030, T-0031, T-0034, T-0035, T-0036, T-0037

## Desired behavior

### Updates to ARCHITECTURE.md
1. **System Overview**: Expand to describe login system entry point, account state, and session management
2. **Technology Stack**: Document new systems (localStorage/IndexedDB for persistence, UI framework if applicable for shop/battle pass)
3. **Runtime Architecture**:
   - Add login phase and account initialization flow
   - Document shop system: inventory, currency, cosmetic/progression purchases
   - Document battle pass system: tier tracking, reward claiming, progression reset
   - Document level select UI: level state persistence, unlock tracking
4. **Core Systems**: Add subsections for:
   - **Authentication System**: Login flow, account creation, session persistence, logout
   - **Shop System**: Currency handling (coins, gems, premium currency if any), inventory state, item categories
   - **Battle Pass System**: Active battle pass tracking, tier progression, reward state, prestige/reset mechanics
   - **Level Select System**: Level unlock state, difficulty unlock progression, metadata per level
   - **Themed Environments**: Visual theme application, tile palette per theme, environment-specific mechanics
   - **Game Over Enhanced Screen**: Persist state display, stats breakdown, progression summary, replay options
5. **Data Persistence**: Document save/load mechanisms, localStorage schema, account synchronization

### Updates to DOMAIN_MODEL.md
1. **Account Entity**: Add new entity describing:
   - `userId` / `sessionId` — Unique account identifier
   - `username` — Display name
   - `accountLevel` — Account progression level (separate from in-game player level)
   - `totalXP` — Lifetime experience across all playthroughs
   - `createdAt`, `lastPlayedAt` — Temporal metadata

2. **Login State**: Add authentication entity:
   - `isLoggedIn` — Boolean session state
   - `sessionToken` — Session identifier
   - `authType` — Authentication mechanism (if any: local, OAuth, etc.)

3. **Shop System Entity**:
   - `inventory` — Array of owned items with purchase timestamp
   - `currentCurrency` — Object with `coins`, `gems`, `premiumCurrency` balances
   - `purchaseHistory` — Record of transactions (items, amounts, timestamps)
   - `itemCatalog` — List of available items with prices, rarity, unlock conditions

4. **Battle Pass Entity**:
   - `activeBattlePass` — Current season/tier information
   - `currentTier` — 0-N tier progression
   - `tierProgress` — Progress toward next tier (0-100%)
   - `claimedTiers` — Set of tier numbers with claimed rewards
   - `battlePassHistory` — Past completed seasons with final tier reached
   - `prestige` — Prestige level (if applicable) tracking multiple completions

5. **Level State Entity**:
   - `unlockedLevels` — Set of level IDs available to player
   - `levelScores` — Map of levelId → { score, time, stars, dateCompleted }
   - `levelTheme` — Current or default theme applied to level rendering
   - `levelDifficulty` — Difficulty tier unlock progression

6. **Themed Environment Entity**:
   - `id` — Unique theme identifier (e.g., 'forest', 'ice_castle', 'lava_caves')
   - `name` — Display name
   - `tileColorPalette` — Color substitutions for tile rendering
   - `particleEffects` — Theme-specific particle configurations
   - `backgroundProperties` — Parallax, color, animated elements
   - `unlockedAt` — Player level or progression requirement to use theme

7. **Game Over State**:
   - `sessionStats` — Object with final score, coins, gems, time, distance traveled
   - `persistentStats` — Object with lifetime totals, best score, streak info
   - `achievements` — Array of newly unlocked achievements (if any)
   - `nextMilestones` — Progress toward next account/battle pass tier

8. **Update Global Game State (`gs`)**: Add new fields:
   - `account` — Account entity reference
   - `shop` — Shop system state
   - `battlePass` — Battle pass state
   - `levelState` — Level unlock and score tracking
   - `selectedTheme` — Currently active environment theme
   - `gameOverState` — Enhanced stats for display (T-0045 specific)

### Updates to INVARIANTS.md
1. **Authentication Invariants**:
   - **Session Exclusivity**: Only one active session per browser/account
   - **Logout Cleanup**: All sensitive session data cleared on logout
   - **Auto-Save on Login**: Game state loaded into memory immediately on successful login

2. **Shop Currency Invariants**:
   - **Non-Negative Balances**: `coins`, `gems`, `premiumCurrency` ≥ 0 always
   - **Transaction Atomicity**: Currency debits and item grants succeed together or both fail
   - **Purchase Validation**: Item can only be purchased if price ≤ current balance AND unlock conditions met
   - **Inventory Uniqueness**: Duplicate items handled per item type (quantity stacking vs. single slot)

3. **Battle Pass Invariants**:
   - **Tier Monotonicity**: `currentTier` only increases, never decreases within season
   - **Progress Bounds**: `tierProgress` ∈ [0, 100] at all times
   - **Claim Idempotency**: Claiming tier N reward twice does not double-grant items
   - **Reset Consistency**: Starting new battle pass season resets tier to 0, clears progress, but preserves history
   - **Reward Availability**: Tier rewards only claimable if `currentTier >= tierNumber` AND not previously claimed

4. **Level Unlock Invariants**:
   - **Progressive Unlock**: Levels unlock based on account progression, not skipped
   - **Score Bounds**: Per-level score ≥ 0, capped at theoretical maximum (distance * divisor)
   - **Completion Tracking**: Once level marked complete, completion state persists until intentional reset
   - **Star Progression**: Star awards (1-3) based on score thresholds, non-decreasing on replay

5. **Theme Application Invariants**:
   - **Consistency**: All tiles in active level use same theme palette
   - **Fallback**: If theme asset missing, default/base theme applied automatically
   - **Visual Isolation**: Theme choice does not affect gameplay (physics, collision, scoring)
   - **Persistence**: Selected theme persists across level replays until manually changed

6. **Game Over State Invariants**:
   - **Immutability During Display**: Game over stats frozen at death moment, do not update
   - **Stats Aggregation**: Session stats reflect only current run; lifetime stats aggregated from persistent storage
   - **Achievement Lockout**: Achievements unlocked only once per account, never revoked
   - **Progression Update**: Battle pass tier advance and account XP increment applied atomically on game over

7. **Data Persistence Invariants**:
   - **ACID Compliance**: localStorage writes achieve atomicity for each entity (transaction per save)
   - **Schema Versioning**: Persistent data includes version number to handle migrations
   - **Corruption Recovery**: Missing or invalid persisted data triggers reset to defaults without error
   - **Cross-Tab Sync**: localStorage changes in one tab eventually visible in others (refresh required)

## Constraints

- **Lane Type**: docs-lane — Only documentation files in `docs/` directory are in scope
- **Code Ownership**: Do not modify game implementation (`index.html`). Only describe as observed.
- **Executor Role**: Executor (Claude) will implement based on this spec; architect should describe requirements clearly
- **Inferred vs. Implemented**: Clearly mark which features are implemented vs. planned/in-progress using status notes
- **No Invention**: Do not invent business rules not evident in code. If code/docs conflict, state uncertainty explicitly
- **Format**: Markdown only; follow existing documentation style and structure
- **Update Scope**: Confine updates to reflect T-0045 parent goal (G-0003 features). Do not refactor existing sections unless necessary for coherence

## Acceptance criteria

- [ ] ARCHITECTURE.md updated with login system entry flow and authentication model
- [ ] ARCHITECTURE.md updated with shop system component and currency management
- [ ] ARCHITECTURE.md updated with battle pass system mechanics and progression model
- [ ] ARCHITECTURE.md updated with level select UI and level state management
- [ ] ARCHITECTURE.md updated with themed environment rendering and fallback handling
- [ ] ARCHITECTURE.md updated with enhanced game over screen components and data display
- [ ] DOMAIN_MODEL.md includes new Account entity with all authentication fields
- [ ] DOMAIN_MODEL.md includes new Shop entity with inventory, currency, catalog
- [ ] DOMAIN_MODEL.md includes new BattlePass entity with tier, progress, reward state
- [ ] DOMAIN_MODEL.md includes new LevelState entity with unlock tracking and scoring
- [ ] DOMAIN_MODEL.md includes new Theme entity with palette and unlock conditions
- [ ] DOMAIN_MODEL.md includes new GameOverState entity with session and persistent stats
- [ ] DOMAIN_MODEL.md updates global game state (`gs`) to include new system references
- [ ] DOMAIN_MODEL.md documents relationships between Account, Shop, BattlePass, and Level entities
- [ ] INVARIANTS.md includes authentication state invariants (session, logout, auto-save)
- [ ] INVARIANTS.md includes shop currency invariants (non-negative, transaction atomicity, purchase validation)
- [ ] INVARIANTS.md includes battle pass invariants (tier monotonicity, progress bounds, reward claiming)
- [ ] INVARIANTS.md includes level unlock invariants (progressive unlock, completion persistence)
- [ ] INVARIANTS.md includes theme application invariants (consistency, fallback, isolation)
- [ ] INVARIANTS.md includes game over state invariants (immutability, stats aggregation, progression updates)
- [ ] INVARIANTS.md includes data persistence invariants (ACID, versioning, corruption recovery, cross-tab sync)
- [ ] All three documents use consistent terminology across sections
- [ ] Documentation includes "as of T-0045" note at top, noting which code snapshot the docs reflect
- [ ] Cross-references between ARCHITECTURE.md, DOMAIN_MODEL.md, INVARIANTS.md are consistent
- [ ] No implementation code or configuration details leaked into specs (remain abstract enough for multiple implementations)

## Risks

### High Risk
- **Incomplete Implementation Discovery**: If G-0003 features are partially implemented, docs risk describing an inconsistent state. Executor should verify code implementation before finalizing.
- **Save/Load Logic Drift**: localStorage persistence and cross-session state management are complex; docs must accurately capture actual recovery/sync mechanisms or create confusion.
- **Battle Pass Semantics Ambiguous**: If battle pass system allows prestige or multiple simultaneous passes, current spec may be incomplete. Executor should clarify with code review.

### Medium Risk
- **Theme System Scope Unclear**: Whether themes affect only visuals (safe) or gameplay (physics, enemy behavior, scoring) will significantly change invariant complexity. Executor should confirm.
- **Account-Level Progression**: Relationship between account level, player level, and unlock progression needs clear definition to avoid circular dependencies in schema.
- **Multiplayer Considerations**: If save/load or shop involves server/cloud sync, persistence invariants become much stricter. Current spec assumes local-only.

### Low Risk
- **Documentation Typos**: Markdown syntax or consistency issues in final output.
- **Terminology Drift**: Terms used in code (e.g., "tier" vs. "level" vs. "rank") may differ from docs; executor should normalize.

## Open questions

1. **Login System Scope**: Is login required for all play sessions, or optional with local play fallback? Does the system support multiple accounts on same device, or single account per browser?

2. **Battle Pass Mechanics**: Does battle pass season reset on fixed calendar (monthly, quarterly) or on account progression trigger? Can players buy past tiers, or only current and future? Does prestige mode exist?

3. **Shop Currency System**: Are there multiple currency types (coins earned, gems earned, premium currency purchased)? Can currency be traded between types, or are conversions one-way? Is there a daily/weekly shop rotation?

4. **Level Select UX**: Are all levels visible with locked/unlocked state, or are locked levels hidden? Do unlocked levels unlock progressively (1 → 2 → 3) or by account level threshold?

5. **Theme System**: How many themes exist? Are themes unlocked by account level, battle pass tier, or cosmetic shop purchase? Do themes persist per-device or per-account?

6. **Enhanced Game Over Screen**: What stats are displayed? Does it show achievements, recommend next challenges, or offer ad-for-reward systems? Does the UI allow immediate replay or require menu navigation?

7. **Cross-Platform Persistence**: Does the system expect cloud sync or single-device-only persistence? Are accounts device-bound or device-independent?

8. **Migration Path**: If T-0014 documentation described this system, what changed since then? If it's entirely new, do existing game instances need data migration?

9. **Cosmetic System Integration**: Does the shop sell cosmetics (skins, themes, emotes) or gameplay progression items (XP boosters, level skips)? How does this interact with skill unlocks and level progression?

10. **Error Handling Strategy**: If localStorage fails (quota exceeded, corruption), does the game degrade gracefully (local-only, no persistence) or fail completely? What is the recovery strategy?


## Related Documents
- [[ai/reviews/T-0045_gemini_review.md|T-0045 review]]
- [[ai/briefs/T-0045_implementation.md|T-0045 document]]
- [[ai/results/T-0045_executor_report.md|T-0045 result]]
- [[ai/followups/T-0045_followups.md|T-0045 followup]]
- [[ai/pr/T-0045_pr_draft.md|T-0045 pr-draft]]
