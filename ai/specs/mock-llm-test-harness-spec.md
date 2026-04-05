# Mock-LLM Test Harness + E2E Runner — Architecture Spec from ChatGPT

Architectural task: build deterministic testability for the orchestration system.

## Context
- Goal intake, decision gates, task orchestration, follow-up generation, dashboard, and PR-draft generation now exist.
- The main remaining architectural risk is low deterministic test coverage and high dependence on live LLM/API behavior.
- The system now needs a mockable and reproducible end-to-end test harness.

## Mission
1. Build a mock-LLM execution mode for the orchestration layer.
2. Add an automated Node-based end-to-end regression runner.
3. Validate the most important state and artifact invariants.
4. Reduce planner/output-format fragility where practical.

## Required outcomes

### A. Mock LLM mode
Implement a deterministic mode: `LLM_MODE=mock`

Behavior:
- architect-task-api, critique-task-api, synthesize-task-api, propose-followups-api, and plan-goal-api must be able to run without external API calls
- outputs should come from either: fixture files, deterministic canned responses, or a fixture map keyed by task/goal type

### B. Fixture structure
Add: `automation/test-fixtures/` with goals/, tasks/, decisions/, llm/ subdirs
Provide a clean convention for mapping a call type to a fixture.

### C. Automated end-to-end test runner
Add: `run-e2e-test.mjs`
Full deterministic flow: Goal -> Plan -> Decision Proposal -> Decision Resolution -> Task Spawn -> Architect -> Critique -> Synthesize -> Worktree Prep (optional mock/skip) -> Finalize -> Follow-ups -> PR Draft

### D. Assertions / invariants
Validate: artifacts exist, state transitions valid, blocked-on-decision works, follow-ups produced, PR draft only after valid completion, linked references consistent

### E. Format hardening
Tolerant parsers, validation helpers, explicit error messages, fixture-backed regression checks

### F. Dashboard / visibility
Mock mode indicator, last e2e test result — small and non-invasive

### G. Non-goals
No GitHub PR creation, no full dashboard refactor, no markdown→JSON replacement, no over-engineered testing framework
