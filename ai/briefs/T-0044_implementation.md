---
type: brief
task_id: T-0044
created: 2026-04-10
tags: [ai-flow-lab, brief]
---

# T-0044 Implementation Brief

## Goal
Implement a battle pass system with 20 reward tiers, free/premium tracks, daily challenges, and XP progression.

## Scope
- Add battle pass screen as modal in #overlay
- Define 20 reward tiers with XP thresholds (0, 500, 1000, 1500, ..., 9500 cumulative XP)
- Implement dual-track system: free tier grants coins/cosmetics, premium tier grants exclusive skins
- Display current season, tier, progress bar, and XP counter
- Implement 3-4 daily challenges: score-based, level-based, or streak-based
- Add challenge completion tracking with progress meters and claim buttons
- Persist battle pass state in localStorage under key `pixelRunner_battlePass`
- Support XP earning from level completion (score-dependent: 100-500 XP per level)
- Auto-refresh daily challenges at midnight (game time)
- Show reward previews at each tier before claiming

## Constraints
- Only modify index.html (no new files)
- One season at a time (no season rotation yet)
- XP gains are additive; tier progression irreversible
- Daily challenges reset once per 24-hour cycle
- Premium track rewards locked behind one-time 500-coin purchase per season
- Max 20 tiers per season for UI performance
- Challenge descriptions must be under 40 characters

## File targets
- MODIFY: index.html

## Tests required
- Verify XP earned from level completion added to total
- Test tier unlocking: confirm tier 1 unlocks at 500 XP, tier 2 at 1000 XP, etc.
- Validate daily challenge reset at 24-hour mark
- Confirm free track rewards appear without purchase, premium track locked until payment
- Test reward claim button updates inventory (coins, cosmetics, skins)
- Ensure battle pass state persists across reloads with correct XP, tier, and challenge state

## Chosen minimal policy
```javascript
// Battle pass schema
const battlePass = {
  season: 1,
  seasonStartDate: "2026-04-01",
  totalXP: 0, // cumulative
  lastDailyReset: Date.now(),
  premiumUnlocked: false, // purchased
  tiers: [
    // Tier 1-20, each with freeReward and premiumReward
    { tier: 1, xpThreshold: 500, freeReward: { type: "coins", amount: 50 }, premiumReward: { type: "cosmetic", id: "trail_silver" }, claimed: false },
    { tier: 2, xpThreshold: 1000, freeReward: { type: "coins", amount: 100 }, premiumReward: { type: "skin", id: "skin_premium_1" }, claimed: false }
    // ... up to tier 20 at 9500 XP
  ],
  dailyChallenges: [
    { id: "challenge_1", text: "Score 5000 pts", target: 5000, progress: 0, reward: 200, claimed: false },
    { id: "challenge_2", text: "Complete 2 levels", target: 2, progress: 0, reward: 150, claimed: false }
  ]
};

// XP earning (on level complete)
function earnBattlePassXP(levelScore) {
  const xpEarned = Math.floor(levelScore / 10); // 100-500 XP from scores 1000-5000+
  battlePass.totalXP += xpEarned;
  checkBattlePassTierUnlock();
  return xpEarned;
}

// Current tier logic
function getCurrentBattlePassTier() {
  return battlePass.tiers.filter(t => battlePass.totalXP >= t.xpThreshold).length;
}
```

## Risks
- XP inflation if challenge completion becomes too easy; may need tuning
- Midnight reset timezone ambiguous; recommend UTC or player's local
- No rollback if player claims wrong reward tier

## Explicit non-goals
- Multiple simultaneous seasons
- Seasonal content rotation (cosmetics limited to seasons)
- Pass battle pass progress to other players
- Prestige/reset mechanics
- Legacy season archives or cosmetics


## Related Documents
- [[ai/specs/T-0044_spec.md|T-0044 spec]]
- [[ai/reviews/T-0044_gemini_review.md|T-0044 review]]
- [[ai/results/T-0044_executor_report.md|T-0044 result]]
- [[ai/followups/T-0044_followups.md|T-0044 followup]]
- [[ai/pr/T-0044_pr_draft.md|T-0044 pr-draft]]
