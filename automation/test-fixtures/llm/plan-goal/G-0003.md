# G-0003 Plan

## Goal summary

Implement comprehensive error handling and resilience across the automation pipeline. This includes retry logic for transient API failures, graceful degradation, user-friendly error messages, recovery for interrupted pipelines, and automated health checks covering both server-side and client-side error scenarios.

## Constraints

- Must not break existing pipeline flow or dashboard functionality
- Error handling must be backwards-compatible with existing task states
- Retry logic must respect API rate limits
- All error messages must be user-friendly (no raw stack traces in UI)
- Health checks must not introduce significant performance overhead

## Candidate initial tasks

### P-1
- title: Add retry wrapper for OpenAI and Gemini API calls
- lane_type: feature-lane
- executor: codex
- rationale: The _llm-utils.mjs already has basic retry logic but it doesn't handle rate limits (429) or network timeouts gracefully. This task adds exponential backoff with jitter and proper error classification.
- smallest_safe_scope: Wrap callOpenAI and callGemini with configurable retry logic supporting exponential backoff, rate-limit detection, and timeout handling.
- depends_on: none
- priority: high
- should_spawn_now: true

### P-2
- title: Add pipeline state recovery for interrupted tasks
- lane_type: feature-lane
- executor: codex
- rationale: If a task pipeline is interrupted mid-step (server crash, API timeout), there's no way to resume from the last completed step. Tasks get stuck in an intermediate state.
- smallest_safe_scope: Add a recovery function that detects tasks stuck in RUNNING state and allows resuming from the last completed step.
- depends_on: none
- priority: high
- should_spawn_now: true

### P-3
- title: Fix dashboard crash when rendering branches with missing type data
- lane_type: bug-lane
- executor: codex
- rationale: The renderBranches function throws "Cannot access typeColors before initialization" when branch data has missing or undefined type fields. This crashes the entire branches view.
- smallest_safe_scope: Fix the typeColors initialization order in dashboard.html and add null checks for branch type fields.
- depends_on: none
- priority: high
- should_spawn_now: true

### P-4
- title: Add user-friendly error toast messages for API failures
- lane_type: feature-lane
- executor: codex
- rationale: When API calls fail, the dashboard shows raw error objects or silent failures. Users need clear, actionable error messages.
- smallest_safe_scope: Add error interceptor in dashboard fetch calls that converts API errors to user-friendly toast notifications with retry options.
- depends_on: P-1
- priority: normal
- should_spawn_now: true

### P-5
- title: Add health check endpoint and dashboard status indicator
- lane_type: feature-lane
- executor: codex
- rationale: There's no way to verify that the server, API keys, and git are all functioning correctly. A health check endpoint would enable proactive monitoring.
- smallest_safe_scope: Add GET /api/health endpoint that checks API key validity, git status, and filesystem access. Display health status in dashboard sidebar.
- depends_on: none
- priority: normal
- should_spawn_now: true

### P-6
- title: Fix cascade engine silently failing when goal has no markdown file
- lane_type: bug-lane
- executor: codex
- rationale: The cascade run-goal endpoint returns success but plan-goal-api.mjs exits with error if the goal markdown file doesn't exist. The error is swallowed by the async execution.
- smallest_safe_scope: Add pre-flight validation in cascade run-goal that checks for required files before starting, and surface errors to the client.
- depends_on: none
- priority: high
- should_spawn_now: true

### P-7
- title: Add git operation error handling and lock file cleanup
- lane_type: feature-lane
- executor: codex
- rationale: Git operations fail silently when index.lock files exist or when the filesystem doesn't support certain operations. Need proper error handling and automatic cleanup.
- smallest_safe_scope: Add try-catch around all git operations, detect and handle lock files, add fallback strategies for FUSE filesystem limitations.
- depends_on: none
- priority: normal
- should_spawn_now: false

## Recommended first task

P-1 is the foundation — all other error handling improvements build on reliable API retry logic. P-3 and P-6 are critical bug fixes that should run in parallel.

## Decision blockers

### DB-1
- topic: Retry strategy configuration
- rationale: Need to decide on maximum retry count, backoff multiplier, and whether to make these configurable per-task or global. Also need to decide on circuit breaker behavior after repeated failures.
- blocking_scope: task
- options: Fixed 3 retries with exponential backoff, Configurable per-task retry with circuit breaker, Global retry config in .env with per-step overrides
- recommended_default: Global retry config in .env with per-step overrides
- urgency: low

### DB-2
- topic: Error reporting granularity
- rationale: Should errors be tracked per-task, per-step, or aggregated at the goal level? This affects the dashboard UI for error visibility and the data model for error state.
- blocking_scope: goal
- options: Per-step error tracking with task rollup, Per-task error summary only, Full error chain from step to task to goal
- recommended_default: Per-step error tracking with task rollup
- urgency: medium

## Notes for planner

This goal has a mix of feature work and bug fixes. P-3 and P-6 are bug-lane tasks that fix existing issues discovered during testing. The feature tasks (P-1, P-2, P-4, P-5, P-7) progressively build up the error handling layer. P-7 is marked should_spawn_now: false because it depends on understanding the full scope of git operations that can fail, which will become clearer after P-1 and P-2 are complete.
