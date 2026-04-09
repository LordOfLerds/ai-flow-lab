# [T-0032] Add executor file-safety guardrail to pipeline

## Summary
Add executor file-safety guardrail to pipeline

**Task ID**: T-0032
**Parent Goal**: none
**Parent Task**: T-0030
**Lane**: bug-lane
**Executor**: claude

## What Changed
Add executor file-safety guardrail to pipeline


claude


- `automation/scripts/execute-task-api.mjs`




- List every file created or modified and what change was made
- Note which spec requirements were fulfilled


- List any spec requirements that were intentionally skipped or deferred
- Explain …

## Spec Summary
- **task_id:** T-0032
- **title:** Add executor file-safety guardrail to pipeline
- **lane_type:** bug-lane
- **executor:** claude


The Codex executor has destroyed `index.html` three times during pipeline execution (T-0027, T-0029, T-0030). Each time, the LLM returns a truncated file (32-476 lines…

## Review Highlights
The implementation specification for T-0032: "Add executor file-safety guardrail to pipeline" — a system to snapshot source files before LLM execution and validate/restore them afterward to prevent file destruction incidents.



1. **Backup strategy inconsistency**: Line 29 mentions "Optionally writ…

## Implementation Brief
Add pre-execution file snapshots and post-execution validation to `execute-task-api.mjs` to detect and auto-restore files destroyed by the LLM executor. This prevents the recurring issue where the Codex executor rewrites files with truncated content.


Modify only `automation/scripts/execute-task-ap…

## Linked Decisions
(none)

## Validation
- [ ] Spec written and reviewed
- [ ] Implementation brief synthesized
- [ ] Executor report completed
- [ ] Follow-ups proposed

- [ ] Tests pass (if applicable)
- [ ] No regressions in existing functionality

## Risks
(none identified in review)

## Non-Goals
(see spec)

## Follow-Up Notes
T-0032 added a file safety guardrail to the executor pipeline in `execute-task-api.mjs`. Before the LLM call, all source files in the repo root are snapshotted (line count + content stored in memory). After file writing, each written file is validated against its snapshot: files that shrink by > 30%…

---
**Branch**: `bug/T-0032-add-executor-file-safety-guardrail-to-pipeline` → `main`
**Generated**: 2026-04-08T00:15:43.464Z
**Generator**: generate-pr-draft.mjs
