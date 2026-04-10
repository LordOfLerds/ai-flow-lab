# T-0023 Implementation Brief

## Goal
Add a minimal architecture-doc clarification that:
- `index.html` is the primary browser entry point for the game, and
- `game.html` is a compatibility redirect entry point to `index.html`, not a separate runtime surface.

Resolve the main spec/review contradiction explicitly:
- Do **not** document `/game` as a supported entry point unless an existing source-of-truth doc already states that or repo evidence outside `game.html` confirms it.
- Treat `game.html` file behavior as the only safe documented compatibility surface for this task.

## Scope
In scope:
- Read the required source-of-truth docs first: `docs/DOMAIN_MODEL.md`, `docs/INVARIANTS.md`, `docs/ARCHITECTURE.md`, and relevant `docs/ADR/` entries if entry points are discussed.
- Update architecture documentation with a concise note about entry-point roles.
- If existing docs conflict with observed code behavior, record that conflict in `ai/current-state/drift-register.md` instead of silently resolving it.

Out of scope:
- Any code changes to `game.html`, `index.html`, redirects, routing, hosting, or deployment behavior.
- Broader documentation restructuring.
- Adding historical rationale, SEO intent, query-string guarantees, deep-link guarantees, or server-route guarantees not already documented elsewhere.

## Constraints
- Docs-only task.
- Prefer the smallest targeted edit in the architecture/source-of-truth docs.
- Source-of-truth docs must be checked before editing.
- If docs already describe entry points differently, call out the conflict explicitly.
- If code and docs disagree, add a drift note per policy.
- Avoid speculative wording:
  - do not call `game.html` “legacy” unless current docs already do.
  - do not claim `/game` support unless verified in docs or repo configuration.
  - do not claim redirect parameter preservation unless directly verified and relevant to current docs.
- Keep wording descriptive of current observed behavior: `game.html` forwards users to `index.html` and does not host distinct gameplay logic.

## File targets
Primary expected target:
- `docs/ARCHITECTURE.md`

Conditional targets only if needed by existing doc structure or conflict handling:
- `docs/DOMAIN_MODEL.md`
- `docs/INVARIANTS.md`
- `docs/ADR/*`
- `ai/current-state/drift-register.md`

## Tests required
- Manual verification that source-of-truth docs were reviewed before edit.
- Diff review to confirm only documentation files changed.
- Consistency check that final wording:
  - identifies `index.html` as primary entry point,
  - identifies `game.html` as compatibility redirect entry point,
  - does not present `game.html` as an independent app surface,
  - does not overclaim `/game` support.
- If links or cross-references are added, verify they resolve correctly in the docs.

## Chosen minimal policy
Use the narrowest safe documentation statement:

> `index.html` is the primary browser entry page. `game.html` exists as a compatibility redirect page that forwards to `index.html` and should not be treated as a separate application surface.

Additional policy decisions:
- Exclude `/game` from the new documentation unless already established by current docs or other repo-level routing evidence.
- Do not introduce explanations for why compatibility exists.
- Record drift only if an actual conflict is found after reading source-of-truth docs.

## Risks
- Existing architecture docs may already use conflicting terminology for entry points.
- Over-documenting `game.html` could accidentally imply a support contract broader than the implementation shows.
- Mentioning `/game` would be inaccurate if extensionless routing depends on unverified server configuration.
- If docs are substantially stale, this task may reveal broader documentation drift but should still remain tightly scoped.

## Explicit non-goals
- No redirect implementation changes.
- No validation or redesign of hosting/server routing.
- No guarantee documentation for `/game`, query-string preservation, SEO behavior, or deep-link handling.
- No attempt to classify `game.html` as deprecated, legacy, distributor-specific, or permanent unless already stated in source-of-truth docs.
- No broad cleanup of architecture docs beyond the targeted clarification.