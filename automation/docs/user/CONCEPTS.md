# Core Concepts

## Goal → Task → Follow-up Hierarchy

**Goals** are high-level objectives ("Add user authentication"). When you create a goal, AI Flow Lab decomposes it into concrete **Tasks** (each gets 1 branch, 1 worktree, isolated execution). As tasks complete, the system proposes **Follow-ups**—downstream work discovered during execution (e.g., "Write integration tests" after implementing a feature).

This hierarchy enables incremental, traceable development where each piece of work is independent yet connected to the original objective.

## The Pipeline (7 Steps + Test)

Each task flows through this standard pipeline:

| Step | What It Does | Input | Output | AI Provider |
|------|-------------|-------|--------|-------------|
| **Architect** | Analyze requirements, design solution, write spec | Goal/task description | Feature spec, API design, data schema | OpenAI |
| **Critique** | Review spec for gaps, feasibility, best practices | Spec from architect | Structured feedback with risk flags | Google Gemini |
| **Synthesize** | Integrate feedback, refine spec, finalize approach | Spec + critique | Final implementation spec, checklist | OpenAI |
| **Execute** | Write code, create commits, push to branch | Implementation spec | Code changes, test results | Claude/Codex |
| **Test** | Run test suite, validate code quality (optional, configurable) | Code from execute | Test report, coverage metrics | (CI or local) |
| **Merge** | Open PR, request review, merge to main | Code + test results | Merged PR with metadata | (Git/GitHub) |
| **Follow-ups** | Parse spec for downstream tasks, propose new goals | Completed task metadata | List of follow-up tasks | Claude (parsing) |
| **PR-Draft** | Generate user-facing PR description | All above artifacts | Polished PR body, summary, links | OpenAI |

**Test is configurable**: Can be enabled/disabled per lane via `project.config.yaml`.

## Lanes

Choose a lane based on task type:

| Lane | Best For | Typical Approval Level | Testing Emphasis |
|------|----------|------------------------|------------------|
| **feature** | New functionality, user-facing changes | Medium | Standard test suite |
| **bug** | Fixing broken behavior | High rigor (dangerous-lane rules apply) | Regression tests required |
| **danger** | Refactors, breaking changes, migrations | Highest review | Full suite + manual testing |
| **docs** | Documentation, guides, examples | Low (no code execution) | Links/format validation only |
| **test** | Test infrastructure, CI/CD improvements | Medium | Self-validating (tests test tests) |
| **analysis** | Audits, diagnostics, no code changes | Low | Read-only |

## Agents

Each AI provider plays a specific role:

- **OpenAI (GPT-4)**: Architect and Synthesize steps. Excels at high-level design, spec writing, trade-off analysis.
- **Google Gemini**: Critique step only. Specialized for structured feedback, risk detection, code review perspective.
- **Claude / Anthropic Codex**: Execute step. Generates code, handles edge cases, manages git operations.

## Modes Overview

See [MODES.md](./MODES.md) for detailed workflows.

| Mode | Automation | When to Use |
|------|-----------|------------|
| **API** | Fully automated end-to-end | Production; fastest results; requires all 3 API keys active |
| **CLI** | Uses `claude --print`; all steps automated | Local dev; no OpenAI key needed if using Claude for architecture |
| **APP** | Hybrid: OpenAI manual (ChatGPT desktop), Gemini/Claude API | Learning mode; inspect architect output before synthesis |
| **Mock** | Fixture files; no API calls | Testing pipeline; development; CI environments |

## Task Isolation

Each task runs in its own **git branch** and **git worktree**. This prevents conflicts:
- Parallel tasks don't block each other
- Easy to rebase or reset one task without affecting others
- Conflict detection is planned (smart merge pre-check)

Tasks share only the main branch state and generated metadata.

## State Machine

**Task States** (lifecycle):
```
NEW → ARCHITECTED → CRITIQUED → SYNTHESIZED → IMPLEMENTING → MERGED → FOLLOWUPS_PROPOSED → PR_DRAFTED
```

**Runtime States** (execution):
```
QUEUED → running (per step) → IDLE (success) or FAILED (with error)
```

A task can be in any task state but only one runtime state at a time. Retry resumes from the last completed step.

## Cascade Engine

When you click "Run → Cascade":

1. Task enters `QUEUED` → starts pipeline
2. After merge, **Follow-up Proposer** parses spec for downstream work
3. New tasks are auto-spawned if:
   - Depth limit not exceeded (`cascade_limits.max_depth`)
   - Total task budget not exceeded (`max_total_tasks`)
   - Proposal is not a duplicate (Jaccard similarity check)
4. Each follow-up spawns as NEW task; cascade recurses (bounded)
5. Dashboard shows cascading tree of all spawned tasks

Example: "Add OAuth" spawns follow-ups like "Write OAuth docs", "Add rate limiting", "Set up PKCE validation"—each as a new task with depth tracking.

## Follow-up Deduplication

When the Follow-up Proposer suggests new tasks, a 3-dimensional deduplication algorithm prevents spawning duplicate work:

1. **Title similarity** (Jaccard > 0.75): Compares word overlap between proposed title and all existing task titles.
2. **Scope/description similarity** (Jaccard > 0.6): Compares the proposed rationale/scope against existing task descriptions.
3. **Written files overlap** (> 50% shared files by basename): If the proposed task would modify the same files as an existing task, it's flagged as a duplicate.

A match on **any** dimension blocks the proposal from spawning. The `isDuplicate()` function in `serve-dashboard.mjs` handles this check. The legacy `isDuplicateTitle()` wrapper is preserved for backwards compatibility.

## Executor File-Safety Guardrail

The execute step implements a **Snapshot → Validate → Restore** safety pattern to prevent accidental file damage:

1. **Snapshot**: Before execution, the worktree directory is snapshotted (file list, function/class counts per file, line counts).
2. **Execute**: The LLM makes code changes via Read/Edit/Write tools.
3. **Validate**: After execution, the guardrail compares before/after snapshots:
   - Counts functions and classes in each file (regex-based AST scan)
   - Checks line count ratios (shrinkage detection)
   - Detects placeholder patterns (e.g., `// ... existing code`, `[content continues]`)
4. **Route**: Based on severity, routes to GREEN (auto-merge), YELLOW (Cowork Test), or RED (Decision Proposal with Accept/Restore/Test options).
5. **Restore** (on RED + user choice): All files are restored to pre-execution state and the task is set to FAILED with diagnostic info.

This ensures the executor can't silently truncate files, remove functions, or introduce placeholder stubs.
