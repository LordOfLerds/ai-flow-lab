# AGENTS.md

## Source of truth
Always consult first:
- docs/DOMAIN_MODEL.md
- docs/INVARIANTS.md
- docs/ARCHITECTURE.md
- docs/ADR/

## Drift rule
If docs and tested code disagree, do not decide silently.
Document the conflict in `ai/current-state/drift-register.md`.

## Task discipline
- One writing agent per task
- One branch per task
- One worktree per writing task
- No edits outside assigned task scope

## Verification
Before done:
- run relevant tests
- report changed files
- report risks
