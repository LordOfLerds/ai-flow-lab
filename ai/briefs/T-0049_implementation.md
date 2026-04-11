---
type: brief
task_id: T-0049
created: 2026-04-10
tags: [ai-flow-lab, brief]
---

# T-0049 Implementation Brief

## Goal
Fix skin unlock progression so skins require levels/coins/gems, expand shop to 3 tabs (Skins, Boosters, Trails), and persist purchases in localStorage.

## Scope
1. Replace SKINS array with 12 tiered skins (free/level/coins/gems unlock types).
2. Update `showSkinsMenu()` to show lock icons, requirements, and Buy/Equip buttons.
3. Add BOOSTERS array (4 items) and TRAILS array (5 items).
4. Restructure `showShop()` into 3-tab layout: Skins | Boosters | Trails.
5. Implement `buyItem(type, id)` function that checks level + currency requirements.
6. Add localStorage persistence with `try/catch` fallback.
7. Rainbow skin: cycle hue via `hsl(frame % 360, 70%, 50%)`.
8. Trail particles: spawn every 3 frames at player position, max 30 particles, fade over 15 frames.
9. Active boosters display in HUD (small icons near score).

## Constraints
- All changes in `index.html` only.
- `levelReq: 0` means no level gate (only cost matters).
- Boosters do NOT stack (same type cannot be active twice).
- Max 3 active boosters at once.
- Trail particle array is separate from any existing particle system.
- `localStorage` wrapped in try/catch; on failure, use in-memory only.
- Do NOT modify existing game loop speed or physics.

## File targets
- `index.html` — SKINS, BOOSTERS, TRAILS arrays, `showShop()`, `showSkinsMenu()`, `buyItem()`, `loadPurchases()`, `savePurchases()`, trail rendering in game loop, booster HUD rendering, booster decrement on level complete.

## Tests required
- Verify locked skins show lock icon and cannot be equipped
- Verify buying a skin deducts correct currency
- Verify boosters appear in HUD during gameplay
- Verify trail particles render behind player
- Verify localStorage saves and loads correctly
- Verify rainbow skin cycles colors in-game

## Chosen minimal policy
- Add `gs.purchases = { owned_skins: ['default'], owned_trails: ['none'], active_skin: 'default', active_trail: 'none', active_boosters: [] }`.
- On game init, call `loadPurchases()` which reads localStorage and merges into gs.
- On any purchase, call `savePurchases()` which writes to localStorage.
- Shop tabs: use `gs.shopTab` variable ('skins'|'boosters'|'trails'), render corresponding grid.
- Trail: in game loop after player update, push `{x, y, color, life: 15}` to `gs.trailParticles[]`, render and decrement life each frame, remove when life <= 0.

## Risks
- localStorage might be blocked in some browser contexts (handled by try/catch).
- 12-skin grid may overflow on very small screens.
- Booster 2x multiplier needs to be applied in the correct XP/coin calculation function.

## Explicit non-goals
- No real-money purchases or IAP.
- No animated skin previews in shop.
- No achievement-based unlocks (only level + currency).
- No refund mechanic for purchased items.


## Related Documents
- [[ai/specs/T-0049_spec.md|T-0049 spec]]
- [[ai/reviews/T-0049_gemini_review.md|T-0049 review]]
- [[ai/results/T-0049_executor_report.md|T-0049 result]]
- [[ai/followups/T-0049_followups.md|T-0049 followup]]
- [[ai/pr/T-0049_pr_draft.md|T-0049 pr-draft]]
