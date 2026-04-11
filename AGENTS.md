---
type: agents
created: 2026-04-10
tags: [ai-flow-lab, agents]
---

# AGENTS.md

## Agent Roles

### ChatGPT (Architect / Planner)
- Designs system architecture and task decomposition
- Writes specs, plans, and proposals
- Provides strategic direction
- Available via API (api mode) or desktop app (app mode)

### Claude (Executor / Reviewer / Git Manager)
- Implements what ChatGPT designs
- Reviews ChatGPT output with constructive critique
- Manages all git operations
- Makes Decision-Gate calls during autonomous runs
- Runs the full automation pipeline

### Gemini (Critical Reviewer)
- Reviews specs for contradictions, edge cases, hidden assumptions
- Provides independent perspective from a different model
- Available via API (api mode) or manual paste (app mode)

### Human Owner
- Sets goals and priorities
- Can override any Decision-Gate
- Monitors progress via UI dashboard

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
