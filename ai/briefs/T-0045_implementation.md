# T-0045 Implementation Brief

## Goal
Update Pixel Runner product architecture and domain documentation to reflect login, multi-level, shop, and battle pass features.

## Scope
- Update docs/ARCHITECTURE.md: add UI layers (Auth, LevelSelect, Shop, BattlePass screens); clarify state management (gameState, playerState, inventory, battlePass)
- Update docs/DOMAIN_MODEL.md: add Player, Level, Cosmetic, BattlePassTier, DailyChallenge entities; define relationships (Player owns Levels, Inventory, BattlePassProgress)
- Update docs/INVARIANTS.md: add level progression rules, coin economy rules, battle pass tier locking, equip/owned item constraints
- Remove or deprecate single-level assumptions from existing docs
- Add data flow diagrams for authentication, coin earnings, and tier unlock flows
- Document localStorage schema for persistence (keys, versions)

## Constraints
- Preserve existing game loop and physics documentation
- No code changes; documentation only
- Use existing diagrams/format (markdown + ASCII or Mermaid)
- Keep each doc under 300 lines for readability
- Maintain consistency with automation/docs structure
- Reference implementation from T-0042, T-0043, T-0044

## File targets
- MODIFY: docs/ARCHITECTURE.md
- MODIFY: docs/DOMAIN_MODEL.md
- MODIFY: docs/INVARIANTS.md

## Tests required
- Verify all new entities mentioned in DOMAIN_MODEL have corresponding sections in INVARIANTS
- Check ARCHITECTURE diagrams match actual state management implementation
- Confirm localStorage keys documented match code in T-0042, T-0043, T-0044
- Validate no contradictions between INVARIANTS and feature specs
- Cross-reference player progression (levels → coins → shop → battle pass)

## Chosen minimal policy
ARCHITECTURE.md additions:
```
## State Layers
- **Global State**: player (name, coins, level, stats), auth (logged in, session)
- **Game State**: currentLevel, gameRunning, score, obstacles, enemies
- **Inventory State**: skins (owned, equipped), boosters, cosmetics
- **Battle Pass State**: currentTier, totalXP, dailyChallenges, rewards (claimed/unclaimed)

## Persistence
- localStorage keys: pixelRunner_player, pixelRunner_levelProgress, pixelRunner_inventory, pixelRunner_battlePass
- No server sync yet (single-device mode)
```

DOMAIN_MODEL.md additions:
```
## Core Entities
- **Player**: { id, name, coins, level, stats { totalScore, sessionsPlayed } }
- **Level**: { id, theme, name, baseScore, difficulty, unlocked, completed, bestScore, stars }
- **Cosmetic**: { id, type (skin|trail|particle), name, price, owned, equipped }
- **BattlePassTier**: { tier (1-20), xpThreshold, freeReward, premiumReward, claimed }
- **DailyChallenge**: { id, text, target, progress, reward, claimed, resetTime }

## Relationships
- Player has many Levels (1:N, unlocks sequentially)
- Player has one Inventory (1:1, owns cosmetics)
- Player has one BattlePassProgress (1:1, current season only)
- Cosmetic belongs to Player (owned/equipped flags)
```

INVARIANTS.md additions:
```
### Level Progression
- Level 1 always unlocked
- Level N unlocks only if Level N-1 completed (bestScore > 0)
- Completion irreversible; can replay for better stars
- Stars: 1★ at 60% baseScore, 2★ at 80%, 3★ at 95%

### Coin Economy
- Coins earned: 100 + (score / 10) per level completion
- Shop items price-locked; no inflation
- Coin balance can go negative if cheated (accept, no enforcement)
- Coins required for: cosmetics purchase, premium battle pass

### Battle Pass
- Tiers 1-20, one season at a time
- XP earned per level: floor(score / 10)
- Tier unlock: cumulative XP >= tier threshold, irreversible
- Daily challenges reset every 24 hours, max 3-4 per day
- Premium track gated behind single 500-coin purchase per season

### Inventory
- Each cosmetic has owned/equipped flag
- Only one skin equipped at a time
- Free cosmetics always owned from start
- Equip state persists across sessions
```

## Risks
- Documentation may drift if implementation changes without doc updates; need sync protocol
- Domain model might need extension for multiplayer (friendlists, trades); scope-creep risk
- localStorage schema versions not documented; future migrations unclear

## Explicit non-goals
- Database schema (all data in localStorage for now)
- API documentation (no server yet)
- UI mockups or wireframes (separate design docs)
- Performance analysis or optimization strategies
- Multiplayer architecture or server state management
