# T-0049 Gemini Review

## Review target
Spec T-0049: Fix skin progression lock and expand shop with meaningful items.

## Contradictions
- Spec says `unlockType: 'coins'` requires `levelReq AND cost`, but some coin skins have `levelReq: 0` (e.g., Mystic). Clarify: is levelReq 0 treated as "no level requirement" or "available from level 0"? Suggest: levelReq 0 means no level gate.

## Missing edge cases
1. **Insufficient funds after purchase**: If player buys a skin and their coin balance goes negative due to a race condition, need to check balance >= cost before deducting.
2. **Equipping a refunded skin**: If a skin is somehow unowned (e.g., localStorage cleared), equipping should fall back to default skin.
3. **Booster expiry mid-level**: If booster has 1 remaining use and player finishes a level, decrement to 0 and remove from active list immediately.
4. **Rainbow skin rendering**: HSL cycle needs to handle the canvas context properly — set fillStyle each frame, not just once.
5. **Trail particles on death**: Should trail particles stop spawning when player dies? Probably yes.

## Scope risks
- 3-tab shop UI is significant UI work within a single-file game. Risk of bloating the rendering code.
- localStorage persistence adds a second source of truth alongside gs state. Risk of desync.

## Missing tests
- No test for buying a skin when exactly at cost (boundary test).
- No test for what happens when localStorage is corrupted/invalid JSON.
- No test for booster stacking behavior.

## Hidden assumptions
- Assumes `gs.gems` exists as a currency. Need to verify gem earning is implemented (gem drops in levels).
- Assumes shop UI can fit 12 skins in a grid without horizontal scroll.
- Assumes trail particle rendering doesn't conflict with existing particle systems.

## Recommended corrections
1. Add `try/catch` around `localStorage.getItem/setItem` with fallback to in-memory state.
2. Treat `levelReq: 0` as "no level requirement needed" (only cost matters).
3. Cap active boosters to max 3 to prevent stacking exploits.
4. Add explicit booster non-stacking rule: same booster type cannot be active twice.
5. Trail particles should use a separate array from any existing particle system to avoid conflicts.
