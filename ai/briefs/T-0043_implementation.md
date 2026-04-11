---
type: brief
task_id: T-0043
created: 2026-04-10
tags: [ai-flow-lab, brief]
---

# T-0043 Implementation Brief

## Goal
Implement a coin shop and cosmetics store with tabs for skins, boosters, and cosmetics, plus buy/equip logic and persistent state.

## Scope
- Add shop screen as modal in #overlay with 3 tabs (Skins, Boosters, Cosmetics)
- Display player's current coin balance at top
- Show purchasable items with prices, descriptions, and buy/equip buttons
- Implement buy logic: deduct coins from balance, add item to inventory
- Implement equip logic: mark item as active, update player appearance in game
- Persist shop state in localStorage under key `pixelRunner_inventory`
- Animate purchase confirmation and prevent over-purchase (insufficient coins)
- Support cosmetics being applied without purchase (free items)
- Return to main menu or previous screen on shop close

## Constraints
- Only modify index.html (no new files)
- Shop overlay must not interfere with game state during play
- Coins are earned from level completion; shop only allows spending
- Each category has max 8-12 items for performance
- Item costs range: boosters 50-500, skins 300-2000, cosmetics 100-800 coins
- Equipped item persists across page reloads via localStorage

## File targets
- MODIFY: index.html

## Tests required
- Verify tab switching loads correct item lists
- Test purchase flow: coins deduct, item appears in inventory
- Validate insufficient coins error blocks purchase
- Confirm equip button updates player cosmetics immediately
- Ensure localStorage survives page reload with correct inventory state
- Test free cosmetics can be applied without purchase

## Chosen minimal policy
```javascript
// Shop inventory schema
const shopInventory = {
  coins: 0,
  skins: [ // max 10 items
    { id: "skin_blue", name: "Blue Runner", price: 300, equipped: true },
    { id: "skin_red", name: "Red Racer", price: 500, owned: true, equipped: false }
  ],
  boosters: [ // max 8 items
    { id: "boost_shield", name: "Shield", price: 100, effect: "shield_duration_3s", owned: false },
    { id: "boost_speed", name: "Speed+", price: 150, effect: "speed_multiplier_1.5x", owned: true }
  ],
  cosmetics: [ // max 12 items: trails, particles, sounds
    { id: "trail_gold", name: "Gold Trail", price: 200, owned: true, active: true },
    { id: "trail_rainbow", name: "Rainbow Trail", price: 0, owned: true, active: false, free: true }
  ]
};

// Purchase flow
function purchaseItem(category, itemId) {
  const item = shopInventory[category].find(i => i.id === itemId);
  if (!item || item.owned) return false;
  if (shopInventory.coins < item.price) return { error: "Insufficient coins" };
  shopInventory.coins -= item.price;
  item.owned = true;
  localStorage.setItem('pixelRunner_inventory', JSON.stringify(shopInventory));
  return true;
}
```

## Risks
- Cosmetics visual bugs if appliers don't handle missing item definitions
- Coin balance could drift if earn/spend logic breaks during multiplayer (future feature)
- localStorage corruption could delete entire inventory; no recovery path

## Explicit non-goals
- Multi-currency systems (premium gems, battle pass tokens separate)
- Loot boxes or randomized cosmetic drops
- Item tiers or rarity levels with color-coding
- Trading or marketplace between players
- Seasonal shop rotation or limited-time offers


## Related Documents
- [[ai/specs/T-0043_spec.md|T-0043 spec]]
- [[ai/reviews/T-0043_gemini_review.md|T-0043 review]]
- [[ai/results/T-0043_executor_report.md|T-0043 result]]
- [[ai/followups/T-0043_followups.md|T-0043 followup]]
- [[ai/pr/T-0043_pr_draft.md|T-0043 pr-draft]]
