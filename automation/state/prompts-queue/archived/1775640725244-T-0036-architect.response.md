T-0036 Spec

Task metadata
	•	task_id: T-0036
	•	title: Restore skills/abilities system (skill selection, cooldowns, effects)
	•	lane_type: bug-lane
	•	executor: claude

Problem statement

The current game still contains a SKILLS configuration and some residual skill-related state hooks, but the actual skills/abilities system described in the task has been removed from usable runtime behavior.

From the provided code context:
	•	SKILLS exists with defined abilities:
	•	double_jump
	•	dash
	•	shield
	•	gs.unlockedSkills still exists in game state
	•	startGame() still partially reads gs.unlockedSkills to set:
	•	extra jumps from double_jump
	•	starting shield from shield
	•	CSS/UI hooks still exist for skill display:
	•	#skill-display
	•	.skill-badge
	•	.skill-badge.locked
	•	.skill-badge.active

But the system is functionally incomplete because:
	•	there is no visible skill selection UI in the main menu
	•	there is no clear runtime activation flow for active abilities
	•	there is no restored cooldown tracking UI/state
	•	there are no explicit visual effects for skills such as dash, shield, magnet, or double-jump
	•	the task description says T-0027 deleted the skills/abilities system integration

This creates a mismatch between product concepts still present in config/state/CSS and what the user can actually do.

Because docs are the primary truth, the executor must first confirm what the product docs define about skills/abilities. If code is ahead of docs or docs are stale, that uncertainty must be stated explicitly. If there is a real conflict between docs and tested code, it must be recorded in ai/current-state/drift-register.md.

Source of truth

Primary product source-of-truth order per AGENTS.md and CLAUDE.md:
	1.	docs/DOMAIN_MODEL.md
	2.	docs/INVARIANTS.md
	3.	docs/ARCHITECTURE.md
	4.	docs/ADR/

Per CLAUDE.md, when working on the product being built, Claude must read:
	•	docs/ARCHITECTURE.md
	•	docs/DOMAIN_MODEL.md
	•	docs/INVARIANTS.md

Relevant code evidence from the provided context:
	•	SKILLS exists as:
	•	{ id: 'double_jump', ... }
	•	{ id: 'dash', ... }
	•	{ id: 'shield', ... }
	•	gs.unlockedSkills exists in state
	•	startGame() already applies some skill-derived setup:
	•	double_jump affects maxJumps
	•	shield affects initial shield HP
	•	lastDashPress exists in input state, but there is no demonstrated restored full dash ability flow tied to cooldown/effects in the current visible snippet
	•	#skill-display and .skill-badge* CSS remain present, suggesting removed UI scaffolding
	•	the task description explicitly requires restoration of:
	•	skill selection UI in main menu
	•	skill activation during gameplay
	•	cooldown tracking
	•	visual effects for each skill
	•	dash, shield, magnet, double-jump

There is a notable uncertainty here: the current provided SKILLS array only includes double_jump, dash, and shield, while the task description also names magnet. The executor must resolve this by consulting product docs and current code rather than inventing whether magnet is a skill, a power-up, or both.

Desired behavior

If the product docs define skills/abilities as an active feature, restore them with minimal scope.

Expected behavior:
	1.	Main menu skill selection is available again
	•	The main menu should provide a way to view and choose skills/abilities if that is part of the documented product.
	•	The UI should be built from the current documented skill model, not invented ad hoc.
	•	Locked/unlocked handling must follow docs and invariants, not newly invented rules.
	2.	Skill state integrates into gameplay again
	•	The selected/unlocked abilities should affect gameplay as documented.
	•	At minimum, the existing partial integrations should be completed into a coherent runtime system.
	3.	Keyboard-triggered skill activation works during gameplay
	•	Active abilities that are supposed to be user-triggered should respond to the documented keyboard trigger(s).
	•	Passive abilities should remain passive rather than being forced into a triggered system.
	4.	Cooldown tracking is restored
	•	Abilities that are supposed to have cooldowns should expose that state consistently in gameplay and/or HUD.
	•	Cooldown behavior must follow docs/current invariants rather than new invented timings.
	5.	Visual effects are restored for each documented ability
	•	Abilities should produce the intended visible feedback during gameplay.
	•	This includes the abilities explicitly named in the task description where they are supported by docs and config.
	6.	Ability system remains integrated into one runtime
	•	index.html remains the primary runtime surface.
	•	No parallel or duplicated skills system should be introduced.

If docs do not support part of the requested behavior, the executor should not invent it. Instead, the executor should clearly report the mismatch and document drift if appropriate.

Constraints
	•	Read the product truth docs first before changing code.
	•	Keep the patch tightly scoped to restoring the removed skills/abilities system behavior.
	•	Do not perform a broad rewrite of the whole gameplay loop, menu system, or HUD unless strictly necessary to restore this feature.
	•	Do not invent new business rules for:
	•	unlock thresholds
	•	skill inventory limits
	•	cooldown durations
	•	persistence semantics
	•	trigger mappings
	•	magnet behavior as a skill vs power-up
	•	Reuse the existing SKILLS config, state fields, CSS hooks, and current gameplay integration where possible.
	•	Avoid creating duplicate parallel systems for:
	•	skills vs power-ups
	•	menu selection vs gameplay activation
	•	cooldown state
	•	Preserve unrelated systems outside this bug scope:
	•	skins
	•	HUD values unrelated to skills
	•	enemy system
	•	level generation
	•	auth integration
	•	If docs and tested code disagree, do not silently pick one; record the conflict in ai/current-state/drift-register.md.

Acceptance criteria
	•	The executor reviewed the relevant product docs before implementation:
	•	docs/DOMAIN_MODEL.md
	•	docs/INVARIANTS.md
	•	docs/ARCHITECTURE.md
	•	relevant docs/ADR/ entries if present
	•	The execution report describes the regression specifically as removal/incompletion of the skills/abilities system rather than a generic gameplay bug.
	•	A main-menu skill selection UI exists again, if that behavior is defined by product docs.
	•	Skill selection UI is driven from the documented/current skill model rather than duplicated hard-coded definitions.
	•	Restored gameplay integration works for documented abilities, including keyboard-triggered activation where applicable.
	•	Cooldown state is restored for abilities that are supposed to have cooldowns.
	•	Visual effects are restored for each documented/implemented skill in scope.
	•	Existing partial integrations already present in the code (such as double-jump and shield setup in startGame()) continue to work and are not regressed.
	•	No second competing skill system is introduced.
	•	If the executor finds that part of the task description conflicts with docs or current config (for example magnet not existing in SKILLS), that mismatch is explicitly reported and drift is documented if needed.

Risks
	•	The product docs may define skills more precisely than the current code suggests, so the current SKILLS array may be incomplete relative to documented behavior.
	•	The task description explicitly includes magnet, but the provided SKILLS array does not; careless implementation could invent unsupported behavior.
	•	Some skill logic may currently survive only as partial fragments in input state, player state, or HUD hooks, so restoration may require careful reconstruction of intended integration points.
	•	Restoring skill selection too literally could accidentally roll back newer menu or phase-management changes.
	•	Ability effects and cooldowns may depend on state or rendering helpers not shown in the current snippet; executor must avoid broad rewrites unless truly required.
	•	Passive abilities and active abilities may currently be conflated, which could lead to incorrect trigger semantics if not checked against docs.

Open questions
	•	Do the product docs explicitly define skills/abilities as a user-facing feature with menu selection, cooldowns, and gameplay activation?
	•	Is magnet supposed to be part of the skill system, the power-up system, or both, according to docs?
	•	Which abilities are documented as active keyboard-triggered abilities versus passive abilities?
	•	What are the documented rules for unlocking/selecting skills, and are they still meant to be enforced in the menu UI?
	•	What is the intended current runtime path for skill activation and cooldown display in the existing codebase?