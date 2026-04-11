---
type: spec
task_id: T-0043
created: 2026-04-10
tags: [ai-flow-lab, spec]
---

# T-0043 Spec

## Task metadata
- **task_id:** T-0043
- **title:** Coin Shop and Cosmetics Store
- **lane_type:** feature-lane
- **executor:** codex
- **parent_goal_id:** G-0003

## Problem statement

Currently, the Pixel Runner game has no mechanism for players to spend their accumulated coins and gems on cosmetic upgrades. While the game tracks lifetime `totalCoins` and `totalGems`, and CONFIG.SKINS contains purchasable cosmetics with associated unlock levels, there is no shop UI or purchase system. Players cannot discover what cosmetics are available for purchase, compare prices, preview items before buying, or complete transactions. This limits progression engagement and prevents players from obtaining cosmetics outside of level-based unlocks.

The shop must be:
1. **Discoverable** from the main menu
2. **Browseable** across multiple product categories (Skins, Power-up Boosters, Cosmetic Trails)
3. **Informative** with clear pricing, preview, and owned/locked status
4. **Transactional** with purchase confirmation and persistent state via localStorage
5. **Integrated** with the existing game phase system and HUD

## Source of truth

Key files for this task:

- `/index.html` (single-file game, 1653 lines) — primary implementation location
  - Lines 101-125: `SKINS` configuration with id, name, colors, level, bonus, bonusDesc
  - Lines 130-134: `SKILLS` configuration (for potential future power-up shop)
  - Lines 1-68: HTML structure, canvas, HUD, overlay container
  - Lines 136-360: Game state initialization (CONFIG, game phase system)
  - Game phases: 'MENU', 'PLAYING', 'GAME_OVER', 'SKIN_SELECT', (to add: 'SHOP')
  - `gs.totalCoins`, `gs.totalGems`, `gs.selectedSkin` for state tracking
  - `localStorage` API already referenced for persistence

- `/docs/DOMAIN_MODEL.md` — Game state, Skins entity, progression system
  - Skins have: id, name, colors, level, bonus, bonusDesc
  - Player has: totalCoins, totalGems, selectedSkin, unlockedSkills
  - Phase transitions documented

- `/docs/ARCHITECTURE.md` — Single-file structure, localStorage persistence model
  - HUD system uses DOM overlay, not canvas
  - Phase-based UI rendering via `#overlay` div and `#menu-content` population

- `/docs/INVARIANTS.md` — Phase exclusivity and transition rules
  - Valid transitions: MENU ↔ SHOP (new), SHOP ↔ SKIN_SELECT, SHOP → PLAYING

## Desired behavior

### Shop Access

The shop is accessible from the main menu via a **"SHOP"** button alongside existing "PLAY" and "SKINS" buttons. Clicking enters the `SHOP` phase, rendering the shop interface inside the existing `#overlay` container. A "Back to Menu" button returns to `MENU` phase.

### Shop Categories

The shop displays three product categories in a tabbed or segmented control:
1. **Skins** — Cosmetic character appearances (draw from CONFIG.SKINS)
2. **Power-up Boosters** — Consumable temporary effects (speed boost, shield extension, magnet range)
3. **Cosmetic Trails** — Visual particle effects during player movement

Each category has its own grid of purchasable items.

### Shop Item Display

For **each item in a category**, display:
- **Preview Canvas** — Miniature rendering of the item
  - Skins: 32×32 pixel sprite preview with skin colors
  - Boosters: icon or animated particle effect
  - Trails: small particle animation
- **Name** — Item display name (e.g., "Ninja", "Speed Boost", "Flame Trail")
- **Description** — Short text (e.g., "+10% speed", "10 second duration")
- **Price** — Cost in either **Coins** (⭐) or **Gems** (💎), clearly labeled
- **Status Badge** — One of:
  - "OWNED" (green) — Player already has this item (skins only; boosters/trails tracked in inventory)
  - "LOCKED" (orange) — Level requirement not met; show "Req: Lv 5"
  - "AVAILABLE" (neutral) — Purchasable now
- **Action Button** — Context-sensitive:
  - If owned & is skin: "EQUIP" button (if not already equipped)
  - If owned & is booster/trail: "APPLIED" or inventory count
  - If available: "BUY" button with price
  - If locked: "LOCKED" button (disabled)

### Purchase Flow

**Purchase Confirmation:**
1. Player clicks "BUY" on an available item
2. A modal/dialog appears: "Confirm purchase: [Item Name] for [Price]?"
3. Player clicks "CONFIRM" or "CANCEL"
4. On confirm:
   - Deduct coins/gems from `gs.totalCoins` or `gs.totalGems`
   - Add item to player's owned collection
   - Update shop display (item now shows "OWNED")
   - Play success feedback (optional: SFX + particle effect)
   - Persist state immediately to localStorage
5. On cancel: close dialog, no change

**Insufficient Funds:**
- If player's coin/gem balance < price, the "BUY" button is disabled
- Hovering shows tooltip: "Insufficient coins" or "Insufficient gems"

### Owned Items Tracking

**Skins:**
- Owned skins are stored in `gs.ownedSkins` array (skin IDs)
- Already-unlocked skins (by player level) are implicitly owned
- Purchased skins are also added to `gs.ownedSkins`
- "EQUIP" button on owned skin calls `selectSkin(skinIndex)` and persists choice

**Power-up Boosters:**
- Stored in `gs.inventory.boosters` as `{ id, quantity }` objects
- Quantity increments on purchase; decrements when used in-game
- "APPLIED" or count badge shows inventory status

**Cosmetic Trails:**
- Stored in `gs.inventory.trails` as `{ id, quantity }` objects
- Similar inventory model to boosters
- Trail rendering integrated into player sprite draw logic

### localStorage Persistence

**Key:** `pixelRunner_shop_state` (JSON)
**Saved on every purchase:**
```json
{
  "ownedSkins": ["default", "ninja", "robot"],
  "selectedSkin": 1,
  "inventory": {
    "boosters": [
      { "id": "speed_boost", "quantity": 3 },
      { "id": "shield_extend", "quantity": 1 }
    ],
    "trails": [
      { "id": "flame_trail", "quantity": 2 }
    ]
  },
  "totalCoins": 150,
  "totalGems": 45
}
```
**Load on game init:** Restore all owned items and balances from localStorage; merge with in-game earnings.

### UI/UX Details

- **Grid Layout** — Responsive grid (3-4 items per row on 800px canvas)
- **Color Scheme** — Match existing HUD (#6cf text, #333 borders, darker backgrounds)
- **Typography** — Monospace (matching HUD); size hierarchy: name (12px), desc (10px), price (11px bold)
- **Animations** — Smooth fade-in on category tab switch; button hover glow
- **Accessibility** — Clear "OWNED", "LOCKED", "AVAILABLE" badges; price clearly labeled with currency icons

## Constraints

1. **Single-file architecture** — All shop code (HTML structure, CSS, JavaScript) must live in `/index.html`
2. **No external dependencies** — Use only vanilla JavaScript and HTML5 Canvas
3. **Canvas size fixed** — 800×400px; shop UI must fit and be readable at this resolution
4. **Phase-based rendering** — Shop must integrate with existing game phase system ('MENU', 'PLAYING', 'GAME_OVER', 'SKIN_SELECT'); add 'SHOP' as a new phase
5. **localStorage only** — No server-side persistence; browser storage only
6. **No animations beyond CSS transitions** — Shop UI uses CSS only; canvas previews use canvas 2D context
7. **Coin/Gem system immutable** — Coins collected in-game (COIN tiles, collectibles) and gems (GEM tiles) remain the game's primary currency; shop coins/gems are the same pool as in-game totals

## Acceptance criteria

- [ ] New `SHOP` game phase added to phase constants
- [ ] Phase transitions defined: `MENU → SHOP`, `SHOP → MENU`, `SHOP → SKIN_SELECT` (or ↔ MENU)
- [ ] Shop button ("SHOP") added to main menu UI; clicking navigates to SHOP phase
- [ ] Shop overlay (#overlay) renders with three category tabs (Skins, Boosters, Trails)
- [ ] Skins tab displays all items from CONFIG.SKINS in a grid with previews, names, descriptions, prices, and status badges
- [ ] Boosters tab displays at least 3 purchasable booster types (speed, shield, magnet) with descriptions and prices
- [ ] Trails tab displays at least 2 cosmetic trail types with previews and prices
- [ ] Each item displays: preview, name, description, price (with currency icon), status badge, action button
- [ ] Purchase confirmation dialog appears on "BUY" button click; shows item name and price
- [ ] "CONFIRM" button deducts currency, updates item status to "OWNED", and persists to localStorage
- [ ] "CANCEL" button closes dialog without changes
- [ ] BUY buttons disabled when player balance < price; tooltip explains why
- [ ] "EQUIP" button available on owned skins; clicking selects the skin and persists `selectedSkin` to localStorage
- [ ] Owned/locked status correctly reflects both level-based unlocks and purchase history
- [ ] localStorage key `pixelRunner_shop_state` persists all shop data (ownedSkins, inventory, balances) on every state change
- [ ] Game state loads saved shop data from localStorage on game init; merges with earned coins/gems
- [ ] Shop UI fits 800×400px canvas; is readable and navigable
- [ ] "Back to Menu" button returns to MENU phase from SHOP
- [ ] Shop category tabs switch content without reload; animations smooth
- [ ] Price clearly labeled with currency icon (⭐ for coins, 💎 for gems)

## Risks

1. **localStorage quota** — Browser localStorage limit (~5-10MB); current implementation unlikely to exceed limits, but large inventory arrays could balloon. Mitigation: cap inventory quantities at 99; use compact JSON serialization.

2. **Data sync drift** — If player modifies localStorage directly in browser dev tools, in-game state may diverge. Mitigation: validate loaded data on init (check for negative coins, invalid skin IDs); sanitize before use.

3. **Level-based unlock conflicts** — Confusion between level-based unlock (e.g., Ninja skin requires level 2) and purchase-based unlock (e.g., bought via shop). Clarify in UI: "Unlocked by level 2" vs "Purchased" badges separate.

4. **Tab switching complexity** — Managing multiple category grids means careful state management for selected items and scroll position. Mitigation: cache rendered grids; only re-render on data change (purchase).

5. **Preview canvas performance** — Drawing 12+ item previews (skins, boosters, trails) each frame could impact FPS. Mitigation: pre-render previews once on shop open; cache as image data; redraw only if owned status changes.

6. **Phase transition gotchas** — Existing SKIN_SELECT phase may not account for SHOP. Validate that SHOP → SKIN_SELECT and SKIN_SELECT → SHOP transitions don't conflict. Mitigation: update phase transition table in INVARIANTS.md.

7. **Currency inflation** — No spending cap; players could accumulate 1M coins and break balance. Mitigation: design future boosters and trails with appropriate price curves to create spending sinks; monitor metrics post-launch.

## Open questions

1. **Booster semantics** — Are boosters single-use consumables (e.g., "use 1 speed boost for next level") or persistent multipliers (e.g., "equip 1 speed boost permanently")? Recommend single-use with inventory counts shown.

2. **Trail mechanics** — How do trails render? Should they spawn particles behind the player during movement? Recommend particle trail following player sprite with configurable color and lifetime.

3. **Booster prices** — No pricing guidance provided. Recommend:
   - Speed Boost: 50 coins
   - Shield Extension: 75 coins
   - Magnet Booster: 60 coins

4. **Trail prices** — No guidance. Recommend:
   - Flame Trail: 25 coins
   - Ice Trail: 30 coins
   - Neon Trail: 40 gems

5. **Equip vs. Purchase confusion** — Should players be able to equip boosters from inventory on the shop screen, or only in a separate "Equipment" menu? Recommend equipping from shop for streamlined UX.

6. **Gift/reward currency** — Should gems be purchasable (real-money IAP), or earned only in-game? Out of scope for this task, but affects shop design (gem prices should be higher if earned-only).

7. **Shop UI overlay strategy** — Should shop render as a modal overlay (current approach via #overlay), or as a separate canvas + DOM hybrid? Recommend overlay for consistency with existing MENU/SKIN_SELECT phases.

8. **Search/filter** — Should the shop support search/filter by price, status, name? Recommend for future enhancement; start with tabs only.


## Related Documents
- [[ai/reviews/T-0043_gemini_review.md|T-0043 review]]
- [[ai/briefs/T-0043_implementation.md|T-0043 document]]
- [[ai/results/T-0043_executor_report.md|T-0043 result]]
- [[ai/followups/T-0043_followups.md|T-0043 followup]]
- [[ai/pr/T-0043_pr_draft.md|T-0043 pr-draft]]
