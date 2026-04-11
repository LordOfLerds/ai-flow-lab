---
type: review
task_id: T-0043
created: 2026-04-10
tags: [ai-flow-lab, review]
---

# T-0043 Gemini Review: Coin Shop and Cosmetics Store

## Review target
Spec for implementing a cosmetics shop (skins, trails, effects) purchasable with in-game coins. Includes shop UI with scrollable item grid, purchase confirmation modal, owned item filtering, and currency balance display.

## Contradictions
- Purchase confirmation spec says "deduct coins immediately on confirm click," but also mentions "refund coins if item fails to apply." Clarify: is deduction immediate (risky) or deferred until item is verified applied?
- Owned items display says "hide owned items by default," but shop preview feature requires showing owned items' visual appearance. How does user toggle between "show all" and "hide owned" modes without cluttering UI?
- Currency balance says "updated in real-time," but doesn't specify if balance updates during purchase confirmation animation or only after modal dismisses. Race condition risk.

## Missing edge cases
- Insufficient funds: user clicks purchase with 50 coins, item costs 100. Does UI disable button, show error inline, or show error in modal after click?
- Network lag during purchase: if SaveManager latency causes coins to deduct but item fails to unlock, how is refund triggered? Spec assumes synchronous purchase but doesn't handle async failure.
- Item name/description overflow: shop grid assumes fixed card dimensions. Long item names (e.g., "Ancient Fire Trail with Particle Burst Deluxe") will break layout. Need text truncation strategy.
- Item visual preview: spec shows item preview in confirmation modal, but doesn't specify resolution, zoom level, or whether preview uses actual player model or placeholder.

## Scope risks
- Grid performance: spec does not mention lazy-loading or pooling for large cosmetics catalogs (50+ items). Scrolling performance untested. Recommend implementing virtual scroll or paging.
- Owned item persistence: spec assumes owned items are stored in Player.cs, but doesn't confirm PersistenceManager hooks are integrated. If save fails silently, player loses purchase and coin refund is skipped.
- Image asset management: spec doesn't define where cosmetics preview images live or naming convention. Risk of missing assets causing broken image placeholders at launch.
- Currency balance sync: if player buys item while shop is open, balance display must refresh. Spec doesn't specify who publishes balance-change events (Player.cs? PersistenceManager?).

## Missing tests
- Purchase flow test: user with 150 coins buys 100-coin item → balance shows 50, item is owned, confirmation modal closes cleanly.
- Insufficient funds test: user with 50 coins clicks purchase on 100-coin item → error shown, coins deducted 0, item not owned.
- Owned item filtering test: with "hide owned" toggled, purchased items vanish from grid; toggling "show all" brings them back.
- Rapid-click test: user double-clicks purchase button → purchase only once, not charged twice. (Anti-cheat).
- Persistence test: player closes game mid-confirmation modal. On reload, check if purchase was committed or rolled back consistently.

## Hidden assumptions
- Assumes all cosmetics have fixed prices (no dynamic pricing, bundles, or sales). If future content adds sales/bundles, pricing architecture must be extensible.
- Assumes owned items are permanently owned (no expiration or rental system). If seasonal cosmetics are planned, need ownership-expiry logic.
- Assumes shop inventory is static (all items available always). No mention of limited-time items, seasonal rotation, or new-item rollout.
- Assumes player can own any combination of cosmetics. No exclusive-item logic (e.g., "only one skin at a time").

## Recommended corrections
1. Clarify purchase timing: specify whether coins deduct immediately on confirm-click or only after item application is verified. If deferred, document refund mechanism for apply-failure.
2. Add insufficient-funds handler: define UX for when user has fewer coins than item price (disable button, show price-gap tooltip, or inline error?).
3. Specify owned-item toggle: clarify UI for switching between "show all items" vs. "show only unowned items." Is it a checkbox, toggle button, or filter dropdown?
4. Add preview specs: define image size/aspect ratio for cosmetics preview in confirmation modal and grid thumbnails. Include placeholder image for missing assets.
5. Confirm persistence integration: verify PersistenceManager hook is in place to auto-save owned items list and coin balance after purchase.

## Overall assessment
**Good spec with purchase-flow ambiguities.** Recommend proceeding after clarifying deduction timing, insufficient-funds UX, owned-item filtering, and confirming persistence hooks are ready.


## Related Documents
- [[ai/specs/T-0043_spec.md|T-0043 spec]]
- [[ai/briefs/T-0043_implementation.md|T-0043 document]]
- [[ai/results/T-0043_executor_report.md|T-0043 result]]
- [[ai/followups/T-0043_followups.md|T-0043 followup]]
- [[ai/pr/T-0043_pr_draft.md|T-0043 pr-draft]]
