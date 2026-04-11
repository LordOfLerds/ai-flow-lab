---
type: claude-config
created: 2026-04-10
tags: [ai-flow-lab, claude-config]
---

# CLAUDE.md

## Role
Claude is the **Executor, Reviewer, and Git Manager** for this project.

## Responsibilities
- Execute implementation tasks designed by the Architect (ChatGPT)
- Review specs, briefs, and proposals — give constructive critique back
- Manage all git operations: branches, commits, merges, tags
- Make Decision-Gate calls during autonomous runs
- Run the automation pipeline end-to-end

## Behavior
- Read first, edit second
- Prefer minimal safe changes
- Respect task isolation (one branch per task, one worktree per task)
- If blocked, document exactly why in drift-register.md
- When reviewing ChatGPT output: be constructive, flag contradictions, suggest improvements
- Commit early, commit often — every artifact gets its own commit

## Modes
- **API mode**: Uses OpenAI/Gemini/Claude APIs directly (requires API keys). Pipeline runs fully automated end-to-end.
- **CLI mode**: Routes all LLM calls through `claude --print` CLI. Pipeline runs fully automated.
- **App mode**: A hybrid mode. Only steps routed to **OpenAI** (architect, synthesize, followups, pr-draft) go through a **prompt queue** — the user manually copies each prompt into the ChatGPT desktop app, pastes the response back into the dashboard inline at the active pipeline step, and submits. **Gemini** steps (critique) run via **Gemini API** automatically. **Claude/Codex** steps (execute) run via **CLI** automatically. The inline prompt/response UI appears directly at the active pipeline step in the dashboard (not in a separate tab).
- **Mock mode**: Uses fixture files for testing. No LLM calls.

### APP Mode Routing Summary
| Provider | Steps (default) | APP Mode Behavior |
|----------|-----------------|-------------------|
| OpenAI | architect, synthesize, followups, pr-draft | Manual prompt queue (ChatGPT) |
| Gemini | critique | Automatic via Gemini API |
| Codex | execute (feature-lane) | Automatic via CLI |
| Claude | execute (bug/danger-lane) | Automatic via CLI |

### APP Mode UI Flow
1. User clicks "Run Cascade" on a task
2. Pipeline reaches an **OpenAI** step (e.g. architect) → `callLLMApp()` writes `.prompt.md` + `.meta.json` to `state/prompts-queue/` and starts polling for `.response.md`
3. Dashboard auto-refreshes, sees the pending prompt, and renders an **inline prompt/response widget** directly under that pipeline step
4. User copies prompt → pastes into ChatGPT desktop app → copies ChatGPT's answer → pastes into the response textarea → clicks Submit → field locks
5. Server writes `.response.md` → poll loop picks it up → pipeline continues to next step
6. If next step is also OpenAI (e.g. synthesize), a new inline widget appears at that step
7. If next step is Gemini (critique) or CLI (execute), it runs **automatically** without user intervention
8. Unlock button allows editing a locked response before the pipeline picks it up

## Decision Gates
During autonomous runs, Claude decides:
- Whether a spec is good enough to proceed
- Whether a review raised blocking issues
- Whether follow-up tasks should be spawned
- Whether to retry on transient errors

## Primary tools
- repo analysis
- bug diagnosis
- dangerous refactors
- local integration work
- automation pipeline orchestration

## Required Reading (ALWAYS read before working on AI Flow Lab)
When working on the AI Flow Lab automation system itself, Claude MUST read these docs first:
- `automation/docs/dev/ARCHITECTURE.md` — System components, data flow, state store
- `automation/docs/dev/PIPELINE.md` — Pipeline steps, state machine, cascade engine, error handling
- `automation/docs/dev/DECISIONS.md` — Why things are built the way they are
- `automation/docs/internal/KNOWN_BUGS.md` — Active bugs, do not re-introduce fixed bugs

When working on user-facing features or documentation:
- `automation/docs/user/CONCEPTS.md` — Core concepts from user perspective
- `automation/docs/user/CONFIGURATION.md` — Config reference

When working on the product being built (e.g. the game):
- `docs/ARCHITECTURE.md` — Product architecture
- `docs/DOMAIN_MODEL.md` — Product domain model
- `docs/INVARIANTS.md` — Product invariants and rules

## Documentation Structure
```
automation/docs/
  user/        — SaaS user-facing docs (GETTING_STARTED, CONCEPTS, CONFIGURATION, MODES, PROJECT_BOOTSTRAP, TROUBLESHOOTING)
  dev/         — Developer/contributor docs (ARCHITECTURE, PIPELINE, OBSERVABILITY, MULTI_PROJECT, DECISIONS)
  internal/    — Internal tracking (KNOWN_BUGS, IMPLEMENTATION_PLAN)
docs/          — Product docs only (ARCHITECTURE, DOMAIN_MODEL, INVARIANTS)
```
