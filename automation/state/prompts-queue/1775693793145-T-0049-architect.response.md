# T-0049 Spec

## Task metadata
- task_id: T-0049
- title: Fix skin progression lock and expand shop with meaningful items
- lane_type: feature-lane
- executor: codex

## Problem statement
Currently all skins are unlocked by default or easily accessible without meaningful progression. The shop lacks variety — no boosters, no cosmetic trails, no tiered unlock system. Players have no incentive to earn coins/gems because everything is already available.

## Source of truth
- `index.html` — current SKINS array, `showShop()`, `showSkinsMenu()`, `buyItem()` functions
- `docs/DOMAIN_MODEL.md` — player progression model

## Desired behavior

### Skin Progression (12 skins total)
Replace current SKINS array with tiered unlock system:

```js
const SKINS = [
  { id: 'default', name: 'Runner', color: '#4CAF50', unlockType: 'free', cost: 0, levelReq: 0 },
  { id: 'blue', name: 'Ocean', color: '#2196F3', unlockType: 'level', cost: 0, levelReq: 3 },
  { id: 'red', name: 'Blaze', color: '#f44336', unlockType: 'level', cost: 0, levelReq: 5 },
  { id: 'purple', name: 'Mystic', color: '#9C27B0', unlockType: 'coins', cost: 300, levelReq: 0 },
  { id: 'orange', name: 'Sunset', color: '#FF9800', unlockType: 'coins', cost: 500, levelReq: 10 },
  { id: 'cyan', name: 'Frost', color: '#00BCD4', unlockType: 'coins', cost: 800, levelReq: 15 },
  { id: 'gold', name: 'Champion', color: '#FFD700', unlockType: 'coins', cost: 1500, levelReq: 25 },
  { id: 'pink', name: 'Bubblegum', color: '#E91E63', unlockType: 'coins', cost: 1000, levelReq: 20 },
  { id: 'dark', name: 'Shadow', color: '#212121', unlockType: 'coins', cost: 2000, levelReq: 30 },
  { id: 'rainbow', name: 'Prismatic', color: 'rainbow', unlockType: 'gems', cost: 50, levelReq: 40 },
  { id: 'diamond', name: 'Diamond', color: '#B9F2FF', unlockType: 'gems', cost: 100, levelReq: 50 },
  { id: 'neon', name: 'Neon', color: '#39FF14', unlockType: 'coins', cost: 3000, levelReq: 60 }
];
```

### Unlock logic
- `unlockType: 'free'` — always available
- `unlockType: 'level'` — unlocked automatically when `gs.playerLevel >= levelReq`
- `unlockType: 'coins'` — requires `gs.playerLevel >= levelReq` AND player pays `cost` coins
- `unlockType: 'gems'` — requires `gs.playerLevel >= levelReq` AND player pays `cost` gems

### Skins Menu update
- Show lock icon on locked skins
- Show unlock requirement ("Level 15 + 800 coins")
- "Buy" button only appears when player meets level req and has enough currency
- Currently equipped skin has green checkmark

### Shop Boosters Tab
Add boosters section to shop:
```js
const BOOSTERS = [
  { id: 'xp_2x', name: '2x XP', icon: '⭐', desc: 'Double XP for 3 levels', cost: 100, currency: 'coins', duration: 3 },
  { id: 'coin_2x', name: '2x Coins', icon: '💰', desc: 'Double coins for 3 levels', cost: 150, currency: 'coins', duration: 3 },
  { id: 'extra_life', name: 'Extra Life', icon: '❤️', desc: '+1 life for next level', cost: 200, currency: 'coins', uses: 1 },
  { id: 'magnet_boost', name: 'Super Magnet', icon: '🧲', desc: 'Extended magnet range for 5 levels', cost: 250, currency: 'coins', duration: 5 }
];
```

### Shop Cosmetics Tab (Trails)
```js
const TRAILS = [
  { id: 'none', name: 'No Trail', cost: 0, unlockType: 'free' },
  { id: 'fire', name: 'Fire Trail', color: '#ff4400', cost: 500, currency: 'coins', unlockType: 'coins' },
  { id: 'ice', name: 'Ice Trail', color: '#00ccff', cost: 500, currency: 'coins', unlockType: 'coins' },
  { id: 'star', name: 'Star Trail', color: '#ffdd00', cost: 800, currency: 'coins', unlockType: 'coins' },
  { id: 'shadow', name: 'Shadow Trail', color: '#333333', cost: 50, currency: 'gems', unlockType: 'gems' }
];
```

Trail rendering: in game loop, spawn small particles at player's previous position every 3 frames, fade out over 15 frames.

### Shop UI Structure
Three tabs in shop: **Skins | Boosters | Trails**
- Tab navigation at top
- Grid display for items
- Each item shows: icon, name, price, lock status
- Buy/Equip button per item

### Persistence
All purchases stored in `localStorage` under key `pixelrunner_purchases`:
```json
{
  "owned_skins": ["default", "blue"],
  "owned_trails": ["none"],
  "active_skin": "default",
  "active_trail": "none",
  "active_boosters": [{ "id": "xp_2x", "remaining": 2 }]
}
```
On game load, merge localStorage data with gs state.

## Constraints
- All changes in `index.html` only
- Do NOT break existing skin rendering or player color
- `rainbow` skin: cycle hue each frame using HSL
- Boosters decrement `remaining` after each level complete
- Trail particles must not impact performance (max 30 active particles)

## Acceptance criteria
- [ ] 12 skins with tiered unlock (free/level/coins/gems)
- [ ] Locked skins show lock icon and requirement text
- [ ] Buy button only appears when player qualifies
- [ ] 4 boosters purchasable with coins
- [ ] 5 trails including free default
- [ ] Shop has 3 tabs: Skins, Boosters, Trails
- [ ] Purchases persist in localStorage
- [ ] Rainbow skin cycles colors
- [ ] Active boosters show in HUD during gameplay

## Risks
- localStorage may not be available in all sandbox contexts (fallback to in-memory)
- Large shop UI may need scrolling on small screens
- Trail particles could cause frame drops if not capped

## Open questions
- Should gem earning rate be adjusted to make gem-locked items achievable?
- Should boosters stack (e.g., 2x XP + 2x XP = 4x)?
