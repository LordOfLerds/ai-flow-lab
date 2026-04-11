---
type: review
task_id: T-0045
created: 2026-04-10
tags: [ai-flow-lab, review]
---

# T-0045 Gemini Review: Update game architecture and domain docs

## Review target
Task to audit and update three documentation files: `docs/ARCHITECTURE.md`, `docs/DOMAIN_MODEL.md`, and `docs/INVARIANTS.md` to reflect newly implemented features (level select, shop, battle pass) and ensure consistency and completeness.

## Contradictions
- ARCHITECTURE.md likely describes a single-level game loop, but new level select system introduces a menu/navigation layer. Docs may claim "Level → GameOver → Replay" but actual flow is now "MainMenu → LevelSelect → Level → GameOver → LevelSelect". Verify flow diagram is updated.
- DOMAIN_MODEL.md may define Player as owning only `score` and `health`, but shop system adds `coins`, `ownedCosmetics` list, and cosmetics apply state. Docs must be updated to include all Player properties.
- INVARIANTS.md may state "all level data is immutable at runtime," but battle pass system allows challenges to mutate (mark complete, claim rewards). Clarify which invariants still hold and which are relaxed.

## Missing edge cases
- Cross-document consistency: if DOMAIN_MODEL.md says "coins always ≥ 0," then INVARIANTS.md must reflect this. No doc should contradict another. Recommend consistency check: search all three docs for Player, coins, levels, tiers, etc. and verify definitions align.
- Forward-compatibility: docs describe current features but don't indicate which are extensible or might change. For example, ARCHITECTURE.md doesn't mention that level count is scalable or that shop rotation is possible. Clarify which design choices are fixed vs. flexible.
- Unimplemented features: if ARCHITECTURE.md mentions features not yet coded (e.g., "Daily challenges," "Guilds"), clearly mark them as "Future" or "Not yet implemented." Risk: developer reads doc and assumes feature exists.

## Scope risks
- Documentation drift: three separate files increase risk that updates are incomplete. A feature implemented in code but only updated in ARCHITECTURE.md, not DOMAIN_MODEL.md or INVARIANTS.md, creates silent inconsistency.
- Abstraction level mismatch: ARCHITECTURE.md might be high-level (systems, managers), DOMAIN_MODEL.md might be class-level (entities, properties), and INVARIANTS.md might be rule-level (constraints, guarantees). Ensure each file has appropriate abstraction. Don't mix UML diagrams with pseudocode, for example.
- Ownership unclear: spec doesn't assign responsibility for keeping docs in sync during future feature work. If every engineer is responsible for updating all three, some will slip. Recommend designating one owner per doc or establishing a review checklist.

## Missing tests / validation
- Consistency audit: after updating docs, manually verify all three docs reference same entities, properties, and concepts consistently. For example, if DOMAIN_MODEL.md defines `Player.coins`, INVARIANTS.md should have rules about coin bounds, and ARCHITECTURE.md should explain which system manages coin persistence.
- Completeness check: cross-reference code (Player.cs, Shop.cs, BattlePass.cs, PersistenceManager.cs) against docs. Every public class/property mentioned in code should be explained in DOMAIN_MODEL.md or ARCHITECTURE.md.
- Diagram validation: if ARCHITECTURE.md includes flow or class diagrams, verify they match current code. Outdated diagrams are worse than no diagrams.
- Invariant verification: for each invariant stated (e.g., "coins ≥ 0"), identify which code enforces it. Document where enforcement happens (e.g., "PersistenceManager.LoadPlayer() validates coins ≥ 0 after deserialization").

## Hidden assumptions
- Assumes documentation is the source of truth for design. If code has diverged from docs, unclear which to trust. Recommend establishing code-as-truth policy: docs explain intent, code is fact.
- Assumes future developers can read and update docs. No guidance on doc format, style, or tooling. If docs are hand-maintained Markdown, risk of inconsistent formatting and vague language. Consider template or schema.
- Assumes readers have domain knowledge. DOMAIN_MODEL.md may use game terms without defining them (e.g., "cosmetics," "battle pass tier"). Define all non-obvious terms.
- Assumes single version of truth. If docs and code both exist, and they diverge, which is authoritative? Recommend a decision: code-driven (docs generated from annotations), or design-driven (code follows docs).

## Recommended corrections
1. Add forward-compatibility section: in ARCHITECTURE.md, list known future systems (if any) that current design accounts for (e.g., "Level count is unbounded; future seasons may add 100+ levels"). Clarify which design choices are extensible.
2. Create cross-reference index: after updating all three docs, build a table listing each system/entity (Player, Shop, BattlePass, etc.) and which docs define it. Ensure no orphaned or duplicate definitions.
3. Mark unimplemented features clearly: if docs mention features not yet in code, prefix with "[FUTURE]" or "[NOT IMPLEMENTED]" to avoid confusion during development.
4. Add invariant enforcement locations: in INVARIANTS.md, for each invariant (e.g., "coins ≥ 0"), document which C# code enforces it and where. Example: "Enforced in PersistenceManager.LoadPlayer() with assertion."
5. Establish documentation review checklist: before merging major features, checklist ensures ARCHITECTURE.md, DOMAIN_MODEL.md, and INVARIANTS.md are all updated consistently. Recommend including in PR template.

## Overall assessment
**Critical task with significant consistency risk.** Three docs describing overlapping domains (systems, entities, rules) must be synchronized carefully. Recommend proceeding with checklist-driven approach: audit current code, identify inconsistencies, update docs methodically, then validate consistency across all three files before declaring complete.


## Related Documents
- [[ai/specs/T-0045_spec.md|T-0045 spec]]
- [[ai/briefs/T-0045_implementation.md|T-0045 document]]
- [[ai/results/T-0045_executor_report.md|T-0045 result]]
- [[ai/followups/T-0045_followups.md|T-0045 followup]]
- [[ai/pr/T-0045_pr_draft.md|T-0045 pr-draft]]
