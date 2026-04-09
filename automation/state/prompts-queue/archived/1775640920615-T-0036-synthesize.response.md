T-0036 Implementation Brief

Goal

Restore the documented skills/abilities system with the smallest safe patch.

This is a bug-lane restoration task because the provided spec frames the skills system as regression/removal, and the current code still contains residual skill structures (SKILLS, gs.unlockedSkills, partial startGame() integration, skill CSS hooks) that indicate incomplete deletion rather than a clean intentional redesign.

Resolve the main contradictions explicitly:
	•	Do not treat magnet as a skill by default. In the provided code, magnet exists as POWERUP_MAGNET, not in SKILLS. Unless product docs explicitly classify magnet as a skill too, keep it out of the restored skill-selection system and preserve it as a power-up.
	•	Do not assume every skill is active/manual. The current code strongly suggests:
	•	double_jump is passive
	•	shield may be passive or semi-passive
	•	dash is the most likely active triggered skill
Restore behavior according to docs and existing code evidence, not a forced one-model-for-all system.
	•	Do not turn this into a net-new feature build. Restore the missing gameplay integration around the existing documented/current skill model rather than designing a brand-new ability framework.

Scope

In scope:
	•	Read the product docs first:
	•	docs/ARCHITECTURE.md
	•	docs/DOMAIN_MODEL.md
	•	docs/INVARIANTS.md
	•	relevant docs/ADR/ entries if they mention skills, progression, input, or HUD behavior
	•	Confirm the documented role of the existing SKILLS entries:
	•	double_jump
	•	dash
	•	shield
	•	Restore a main-menu skills UI only if product docs support it and it is part of the current intended feature set
	•	Restore missing gameplay integration for documented skills, including:
	•	passive effects where applicable
	•	triggered activation where applicable
	•	cooldown tracking where applicable
	•	visible feedback/effects where applicable
	•	Reuse the current structures where possible:
	•	SKILLS
	•	gs.unlockedSkills
	•	existing player fields/state
	•	existing input hooks like lastDashPress
	•	existing HUD/CSS skill hooks
	•	Preserve the existing power-up system and do not merge it into skills unless docs explicitly require that
	•	Add small defensive state validation where needed:
	•	invalid or unknown skill IDs do not crash runtime
	•	missing skill state falls back safely
	•	If docs and code materially disagree, record the conflict in ai/current-state/drift-register.md

Out of scope:
	•	Reclassifying the task lane or redesigning project workflow
	•	Rebuilding the entire progression or save/load system
	•	Inventing magnet as a skill if docs do not support it
	•	Rewriting the full HUD, menu, or input architecture
	•	Adding new skills beyond the current documented/configured set
	•	Broad gameplay rebalance

Constraints
	•	Read first, edit second.
	•	Keep the patch tightly scoped to restoring the existing documented skill system.
	•	Treat docs as primary truth.
	•	Resolve the magnet contradiction conservatively:
	•	if docs say magnet is a power-up only, keep it out of the skills restoration scope
	•	if docs say it is both, restore only the documented overlap
	•	Do not invent:
	•	skill unlock rules
	•	cooldown numbers
	•	skill slot limits
	•	persistence rules
	•	new keybinds unless docs/current code clearly support them
	•	Reuse the current game-state and runtime structure where possible.
	•	Passive and active skills must be restored according to their actual documented/current role, not normalized into one behavior type.
	•	Avoid creating duplicate competing systems for:
	•	skills vs power-ups
	•	passive bonuses vs activated abilities
	•	HUD indicators vs gameplay timers
	•	Preserve existing working systems outside this scope:
	•	skins
	•	power-ups
	•	enemies
	•	tiles
	•	auth integration
	•	entry-point behavior

File targets

Primary expected target:
	•	index.html

Conditional target only if a real doc/code conflict is found:
	•	ai/current-state/drift-register.md

Do not edit unless a discovered contradiction truly requires it:
	•	docs/ARCHITECTURE.md
	•	docs/DOMAIN_MODEL.md
	•	docs/INVARIANTS.md
	•	docs/ADR/*

Tests required
	•	Verify product docs were reviewed before editing.
	•	Confirm the actual documented skill set and classify each restored ability correctly:
	•	passive vs active
	•	skill vs power-up
	•	Reproduce the current regression:
	•	missing or incomplete skill selection UI
	•	incomplete ability gameplay integration
	•	missing cooldown/effect behavior where docs require it
	•	Verify after the fix:
	•	skill UI exists if docs require it
	•	skill UI is driven from the existing documented/current skill model
	•	double_jump works as documented without regressing normal jumping
	•	dash activates on the intended trigger if it is documented as active
	•	shield behaves as documented and does not conflict with existing shield power-up handling
	•	cooldown tracking exists only for abilities that are supposed to use cooldowns
	•	visual feedback/effects exist for the documented skills in scope
	•	Verify invalid or missing skill state does not crash gameplay.
	•	Verify power-ups still work independently after the skills restoration.
	•	Verify normal start flow and gameplay still function after the patch.

Chosen minimal policy

Use the narrowest safe restoration policy:
	•	Treat double_jump, dash, and shield as the primary in-scope skills because they are the current configured skills.
	•	Treat magnet as out of skills scope by default because current code classifies it as a power-up, not a skill.
	•	Restore only the missing integration around the existing configured/documented skills.
	•	Implement skill selection UI only if the docs support user-facing skill selection; otherwise restore the documented non-UI skill behavior only.
	•	Restore active triggering and cooldowns only for abilities that are actually documented/currently intended to be active.
	•	Keep passive skills passive.
	•	Reuse current input/state/HUD hooks instead of introducing a new subsystem.

Risks
	•	The docs may define skills more broadly than the visible code, which could expose partial deletion beyond the current snippet.
	•	shield may overlap conceptually with POWERUP_SHIELD, so careless restoration could double-apply effects or create inconsistent shield state.
	•	dash integration may touch movement, collision, invincibility, or animation timing and could introduce regressions if over-expanded.
	•	If a prior menu-based skill selection flow was removed, restoring it too literally may conflict with newer menu changes.
	•	If docs are ambiguous about whether skill selection is manual or automatic, the executor may need to stop at the most conservative documented behavior and record drift.

Explicit non-goals
	•	Do not invent magnet as a selectable skill unless docs explicitly require it.
	•	Do not redesign the game’s progression model.
	•	Do not rebuild save/load or persistence unless already clearly defined and partially present.
	•	Do not replace the power-up system with the skills system.
	•	Do not introduce a brand-new ability framework, hotbar, or complex cooldown architecture.
	•	Do not perform broad cleanup of menu, HUD, or input systems outside the minimal skill restoration path.