---
type: spec
task_id: T-0048
created: 2026-04-10
tags: [ai-flow-lab, spec]
---

# Spec: T-0048 — Expand skill system to 8+ skills

## Overview
Expand from 3 skills to 8 skills with meaningful progression and gameplay effects.

## SKILLS Array Update
Replace current 3-skill SKILLS array:
```js
const SKILLS = [
  { id: 'double_jump', name: 'Double Jump', icon: '⬆️', desc: 'Jump again mid-air', levelReq: 2, unlocked: false },
  { id: 'dash', name: 'Dash', icon: '💨', desc: 'Shift to dash forward', levelReq: 3, unlocked: false },
  { id: 'shield', name: 'Shield', icon: '🛡️', desc: 'Auto-block one hit per level', levelReq: 5, unlocked: false },
  { id: 'magnet', name: 'Coin Magnet', icon: '🧲', desc: 'Auto-collect nearby coins', levelReq: 7, unlocked: false },
  { id: 'wall_jump', name: 'Wall Jump', icon: '🧗', desc: 'Jump off walls', levelReq: 10, unlocked: false },
  { id: 'glide', name: 'Glide', icon: '🪂', desc: 'Hold jump to glide', levelReq: 15, unlocked: false },
  { id: 'stomp', name: 'Ground Pound', icon: '⬇️', desc: 'Press down mid-air to stomp', levelReq: 20, unlocked: false },
  { id: 'time_slow', name: 'Time Slow', icon: '⏱️', desc: 'Press T for 3s slow motion', levelReq: 30, unlocked: false }
];
```

## Gameplay Implementation per Skill

### Magnet (new)
In updatePlayer(), when magnet unlocked: scan collectibles within 80px radius and move them toward player at 3px/frame.

### Wall Jump (new)
In collision detection: if player is falling and touching a wall tile left/right, allow a single jump upward (-8 vy).

### Glide (new)
In updatePlayer(): if jump key held AND player.vy > 0 AND glide unlocked: cap fall speed to 1.5 (instead of MAX_FALL_SPEED).

### Stomp (new)
If down key pressed mid-air AND stomp unlocked: set vy = 15 (fast downward), on landing: kill nearby enemies within 2 tiles, screen shake.

### Time Slow (new)
Add gs.timeScale = 1.0. When T pressed AND time_slow unlocked AND cooldown ready: set gs.timeScale = 0.3 for 180 frames. Apply timeScale to enemy movement, obstacle speed, gravity (but not player input).

## checkSkillUnlocks Update
```js
function checkSkillUnlocks() {
  for (const skill of SKILLS) {
    if (!skill.unlocked && gs.playerLevel >= skill.levelReq) {
      skill.unlocked = true;
    }
  }
}
```

## showSkillsMenu Update
Show all 8 skills in a grid. Unlocked = green border, locked = gray with "Requires Level X". Show skill icon, name, description.

## Acceptance Criteria
- [ ] 8 skills defined with proper levelReq values
- [ ] All 5 new skills have gameplay effects
- [ ] Skills unlock automatically at correct player level
- [ ] Skills menu shows all 8 with unlock status
- [ ] Time Slow has visible slow-motion effect
- [ ] Wall Jump works on vertical surfaces


## Related Documents
- [[ai/reviews/T-0048_gemini_review.md|T-0048 review]]
- [[ai/briefs/T-0048_implementation.md|T-0048 document]]
- [[ai/results/T-0048_executor_report.md|T-0048 result]]
- [[ai/followups/T-0048_followups.md|T-0048 followup]]
- [[ai/pr/T-0048_pr_draft.md|T-0048 pr-draft]]
