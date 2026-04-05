# ADR-0002: Decision-Gate Model

## Status
ACCEPTED

## Context
The AI Flow Lab automation system supports goals → task proposals → task execution →
follow-up proposals. However, it lacked a mechanism to distinguish between:

1. **Spawnable tasks** — safe preparatory work that can proceed autonomously
2. **Decision-blocked items** — questions requiring owner/maintainer input before implementation

Without this distinction, the planner would either:
- Invent decisions silently (violating truth-first principles)
- Block all progress until an owner reviews everything (inefficient)

T-0100 exposed this gap: the archive behavior goal required 5 unresolved owner decisions
before any implementation could safely proceed.

## Decision
Introduce a first-class **Decision Gate** layer with two new object types:

### Decision Proposal (`state/decision_proposals/DP-NNNN.json`)
Emitted by the planner when owner input is required. Fields:
- `decision_proposal_id`: unique ID (DP-0001, DP-0002, ...)
- `source_task_id` / `source_goal_id`: origin context
- `topic`: what needs to be decided
- `rationale`: why this decision is needed now
- `blocking_scope`: task | goal | system
- `options`: array of possible choices
- `recommended_default`: architect's suggestion (if any)
- `urgency`: high | medium | low
- `status`: open | resolved
- `created_at` / `resolved_at`

### Decision Record (`state/decisions/DEC-NNNN.json`)
Created when an owner resolves a proposal. Fields:
- `decision_id`: unique ID (DEC-0001, DEC-0002, ...)
- `decision_proposal_id`: link to the resolved proposal
- `topic`, `status`, `selected_option`, `rationale`
- `scope`, `implications`, `linked_tasks`, `linked_goals`
- `created_at` / `updated_at`

Each resolved decision also produces a markdown artifact in `docs/decisions/DEC-NNNN.md`.

### New Task/Goal States
- `BLOCKED_ON_DECISION`: task or goal cannot proceed until a linked decision proposal is resolved
- `WAITING_FOR_DECISION`: alias for blocked (used in dashboard display)
- `READY_AFTER_DECISION`: task was previously blocked, now unblocked after decision resolution

### Invariant
No implementation task may be automatically spawned when its semantics depend on
an unresolved policy decision. It may only exist as a `BLOCKED_ON_DECISION` proposal
or as safe preparatory docs/test/audit work.

## Planner Integration
- `plan-goal-api.mjs`: LLM prompt now instructs the architect to emit `DB-<n>` blocks
  for decision blockers. These are parsed and stored as decision proposals.
- `propose-followups-api.mjs`: Same pattern for follow-up planning.
- Dashboard: shows open decision proposals with clickable option buttons for resolution.

## Dashboard Integration
The dashboard now shows:
- Open decision proposals (with resolve buttons)
- Accepted decisions (history)
- Tasks blocked on decisions (visual indicator)
- Which goals are blocked vs still progressing

## Consequences
- Decisions are tracked as first-class artifacts, not buried in chat or task comments
- Owner can batch-resolve decisions when available
- Safe preparatory work continues while decisions are pending
- The system never silently invents policy decisions

## Non-goals
- This does not add PR draft automation
- This does not refactor the entire runtime
- This does not bypass existing truth-policy discipline
