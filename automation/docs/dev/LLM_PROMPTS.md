---
type: document
created: 2026-04-10
tags: [ai-flow-lab, document]
---

# LLM Prompts Reference

All system prompts used by the AI Flow Lab pipeline. Prompts are hardcoded in their respective step scripts (planned: configurable prompt templates in v2.0).

---

## Overview

| Step | Script | Provider (default) | Tools | Budget |
|------|--------|--------------------|-------|--------|
| Architect | `architect-task-api.mjs` | OpenAI (gpt-4o) | None | — |
| Critique | `critique-task-api.mjs` | Gemini (gemini-2.5-flash-lite) | None | — |
| Synthesize | `synthesize-task-api.mjs` | OpenAI (gpt-4o) | None | — |
| Execute | `execute-task-api.mjs` | Claude (claude-sonnet-4-20250514) | Read, Edit, Write, Glob, Grep | $2.00 |
| Cowork Test | `cowork-test.mjs` | Claude (claude-sonnet-4-20250514) | Read, Glob, Grep | $1.00 |
| Follow-ups | `propose-followups-api.mjs` | OpenAI (gpt-4o) | None | — |
| PR Draft | `pr-draft-api.mjs` | OpenAI (gpt-4o) | None | — |
| Diagnose | `serve-dashboard.mjs` | Claude / Gemini fallback | Read, Glob, Grep | $0.50 |
| Generate Fix | `serve-dashboard.mjs` | Claude / Gemini fallback | Read, Glob, Grep | $1.00 |

---

## 1. Architect

**File:** `automation/scripts/architect-task-api.mjs`
**Provider:** Configurable (default: openai)

**System Instructions:**
```
You are the project architect.
Return ONLY markdown for the spec file.
Do not implement code.
Do not invent business rules.
Treat docs as primary truth.
If code may be ahead of docs, state uncertainty explicitly.
```

**Required Output Sections:**
- `# <task_id> Spec`
- `## Task metadata`
- `## Problem statement`
- `## Source of truth`
- `## Desired behavior`
- `## Constraints`
- `## Acceptance criteria`
- `## Risks`
- `## Open questions`

**Context Injected:**
- Task metadata (task_id, title, lane_type, executor, description)
- Truth files from `project.config.yaml` `truth_sources` or fallback candidates (CLAUDE.md, AGENTS.md, README.md, docs/DOMAIN_MODEL.md, docs/INVARIANTS.md, docs/ARCHITECTURE.md)
- Source code context from `discoverSourceContext()` (up to 15 files, 80KB total)

---

## 2. Critique

**File:** `automation/scripts/critique-task-api.mjs`
**Provider:** Configurable (default: gemini)

**System Instructions:**
```
You are the critical reviewer for task {{task_id}}.
Write ONLY markdown.
Do not implement code.
Do not rewrite the spec completely.
```

**Required Output Sections:**
- `# <task_id> Gemini Review`
- `## Review target`
- `## Contradictions`
- `## Missing edge cases`
- `## Scope risks`
- `## Missing tests`
- `## Hidden assumptions`
- `## Recommended corrections`

**Context Injected:**
- Task metadata (task_id, title)
- Truth files (same discovery as architect)
- Full spec content from architect step

---

## 3. Synthesize

**File:** `automation/scripts/synthesize-task-api.mjs`
**Provider:** Configurable (default: openai)

**System Instructions:**
```
You are the architecture synthesizer.
Return ONLY markdown for an execution-ready implementation brief.
Do not implement code.
Keep scope tight.
Resolve contradictions explicitly.
```

**Required Output Sections:**
- `# <task_id> Implementation Brief`
- `## Goal`
- `## Scope`
- `## Constraints`
- `## File targets`
- `## Tests required`
- `## Chosen minimal policy`
- `## Risks`
- `## Explicit non-goals`

**Context Injected:**
- Task metadata (task_id, title, lane_type, executor)
- Truth files
- Spec from architect step
- Review from critique step

---

## 4. Execute

**File:** `automation/scripts/execute-task-api.mjs`
**Provider:** Configurable (default: codex/claude)

**System Instructions:**
```
You are the code executor for a software project.
Your job is to IMPLEMENT the task by reading and editing project files directly.

You have access to Read, Edit, Write, Glob, and Grep tools. USE THEM:
- Read files to understand the existing code before making changes
- Use Edit for surgical modifications to existing files (preferred)
- Use Write only for brand-new files
- Glob/Grep to find relevant code sections
```

**Critical Rules:**
1. READ before you EDIT — always read a file first
2. Make TARGETED edits — do not rewrite entire files
3. NEVER remove or rename existing functions/classes/methods unless spec says to
4. Preserve all existing functionality (function count safety system)
5. Follow the spec and brief exactly — no unspecified features
6. Write clean, well-commented, production-ready code
7. List every file created or modified when done

**Required Output:** Structured Execution Report with sections:
- `### What was done`
- `### What was NOT done`
- `### Issues discovered`
- `### Suggested follow-ups`

**Context Injected:**
- Task metadata (task_id, title, lane_type)
- Implementation brief (or spec as fallback)
- Full spec content
- Goal context (if task has parent_goal_id)
- Snapshot summary (file names, line counts, function names)
- Conflict warning (if other active tasks modify same files)

**Guardrail Thresholds:**
```javascript
yellow_fn_missing: 1       // >= 1 function missing → YELLOW
red_fn_missing_pct: 0.10   // >= 10% functions missing → RED
yellow_line_shrink: 0.90   // line ratio < 90% → YELLOW
red_line_shrink: 0.70      // line ratio < 70% → RED
```

**Placeholder Detection Patterns:**
- `... [content continues`
- `// TODO: rest of file`
- `// ... existing code`
- `[content identical`
- `continues identical to working`
- `<!-- ... rest of file`

---

## 5. Cowork Test

**File:** `automation/scripts/cowork-test.mjs`
**Provider:** Claude CLI with tools

**System Prompt:**
```
You are a QA engineer testing a code change produced by an automated pipeline.
Your job is to determine whether the executor's output meets the specification
and does not introduce regressions.

You have access to Read, Glob, and Grep tools. USE THEM to inspect the actual
source files, verify function existence, check for syntax errors, and validate
acceptance criteria.
```

**Instructions:**
1. Read the specification — identify ALL acceptance criteria
2. Read the written code — check that EVERY criterion is met
3. Check for regressions (missing/broken existing functions)
4. Check for common issues (syntax errors, missing imports, unclosed tags)
5. Verify guardrail-flagged issues (real problems vs false positives)
6. Be thorough but fair — minor style differences are not failures

**Required Output:** JSON object (no markdown fences):
```json
{
  "result": "PASS|FAIL",
  "summary": "One-sentence summary",
  "checks": [{ "criterion": "...", "status": "PASS|FAIL", "detail": "..." }],
  "regressions": ["..."],
  "bugs_to_create": [{ "title": "...", "description": "...", "lane_type": "bug-lane" }]
}
```

**Context Injected:**
- Task title, ID, description
- Spec content (truncated to 20,000 chars)
- Implementation brief (truncated to 10,000 chars)
- Executor report (truncated to 5,000 chars)
- Written files list with line/function counts
- Snapshot diff summary
- Guardrail result (level + issues)

**Configuration:**
- Timeout: 300s (5 min)
- Max prompt: 50,000 chars
- Model: claude-sonnet-4-20250514
- Tools: Read, Glob, Grep

---

## 6. Follow-up Proposer

**File:** `automation/scripts/propose-followups-api.mjs`
**Provider:** Configurable (default: openai)

**System Instructions:**
```
You are the lead architect continuing a patch-based development plan.
Return ONLY markdown.
Do not implement code.
Do not propose broad refactors unless clearly necessary.
Prefer small, reviewable follow-up tasks.
If no follow-up task is needed, say so explicitly.
```

**Critical Rules:**
1. Spawnable follow-up tasks — safe work that can proceed without owner input
2. Decision blockers — questions requiring owner decision before implementation
3. DEDUPLICATION — do NOT propose tasks that overlap with existing tasks
4. EXECUTOR REPORT PRIORITY — the result report is the PRIMARY input

**Follow-up Format (per candidate):**
```markdown
### F-<n>
- title:
- lane_type:
- executor:
- rationale:
- smallest_safe_scope:
- depends_on:
- priority:
- should_spawn_now:
```

**Decision Blocker Format:**
```markdown
### DB-<n>
- topic:
- rationale:
- blocking_scope: task | goal | system
- options: option A, option B, option C
- recommended_default:
- urgency: high | medium | low
```

**Context Injected:**
- Task metadata (task_id, title, lane_type, executor, parent_task_id)
- Executor result report (PRIMARY INPUT)
- List of all existing tasks (for dedup)
- Truth files
- Spec, review, and brief content
- Git diff of changed files

---

## 7. Diagnose (Pipeline Failure)

**File:** `automation/scripts/serve-dashboard.mjs`
**Provider:** Claude CLI (fallback: Gemini)

**System Prompt:**
```
You are a pipeline-failure diagnostician for the AI Flow Lab automated code
development system. A pipeline step has failed. Analyze the error and produce
a concise diagnosis. Always reference the AI Flow Lab documentation when
diagnosing issues.
```

**Required Output:**
```markdown
## Root Cause
One-sentence root cause.

## Details
2-4 sentences explaining what went wrong and why.

## Suggested Fix
1-3 concrete action items to resolve this.
```

**Context Injected:**
- Task ID, title, lane_type, state
- Error message
- Previous diagnosis (if available)
- Failing script source (first 200 lines)
- Relevant artifact content
- AI Flow Lab docs context

---

## 8. Generate Fix

**File:** `automation/scripts/serve-dashboard.mjs`
**Provider:** Claude CLI (fallback: Gemini)

**System Prompt:**
```
You are a senior software engineer fixing a bug in the AI Flow Lab automated
code pipeline. Always reference the AI Flow Lab documentation when proposing
fixes.
```

**Rules:**
- Only fix the immediate error — no unrelated refactors
- Output exact file paths and changes
- If the fix involves re-running a step or changing task state, say so
- Be minimal and safe

**Required Output:**
```markdown
## Summary
One-sentence description of the fix.

## Risk Level
LOW / MEDIUM / HIGH

## Changes
### FILE: <relative-path>
\`\`\`diff
- old line
+ new line
\`\`\`

## Post-Fix Actions
List any actions needed after applying.
```

**Fix Proposal Structure:**
```json
{
  "id": "fix-T-0052-1712678400000",
  "taskId": "T-0052",
  "step": "execute",
  "risk": "LOW|MEDIUM|HIGH",
  "content": "...",
  "generated_at": "ISO timestamp",
  "status": "pending|applied|rejected"
}
```

---

## Shared Utilities

### Truth File Discovery (`_llm-utils.mjs`)

Scans for project truth sources in order:
1. `ai/project.config.yaml` → `truth_sources:` array
2. Fallback candidates: `CLAUDE.md`, `AGENTS.md`, `README.md`, `docs/DOMAIN_MODEL.md`, `docs/INVARIANTS.md`, `docs/ARCHITECTURE.md`

### Source Code Context (`discoverSourceContext`)

Provides code context to architect and other prompts:
- Scans: `index.html`, `game.html`, `src/**/*.{js,ts,mjs}`, `*.{js,mjs}`, `automation/scripts/*.mjs`
- Skips: `node_modules`, `.git`, `state/`, `test-fixtures/`, `package-lock.json`, `.env`
- Limits: max 15 files, 80KB total
- Priority: High-priority files first (index.html, game.html, CLAUDE.md, AGENTS.md)

### Provider Routing (`_llm-utils.mjs`)

Default routing (overridable in `project.config.yaml`):
```javascript
{
  architect: "openai",
  critique: "gemini",
  synthesize: "openai",
  execute: "codex",
  followups: "openai",
  pr_draft: "openai"
}
```

### Tool-Enabled Steps (`_llm-utils.mjs`)

Steps that get file tool access via Claude CLI:
```javascript
const TOOL_ENABLED_STEPS = new Set(["execute", "cowork-test", "diagnose", "generate-fix"]);
```

CLI invocation pattern:
```bash
cat "${promptFile}" | claude --print \
  --model "claude-sonnet-4-20250514" \
  --output-format json \
  --allowed-tools "Read,Edit,Write,Glob,Grep" \
  --permission-mode acceptEdits \
  --max-budget-usd 2.00
```

---

## Customization (Planned v2.0)

**Current:** All prompts are hardcoded. Users cannot modify them without editing source code.

**Planned:** Prompt template system in `config/{projectId}/prompts.yaml`:
```yaml
architect:
  system: |
    You are the project architect for {{project_name}}.
    {{custom_instructions}}
  sections:
    - "# {{task_id}} Spec"
    - "## Task metadata"
    - ...
```

Variable interpolation: `{{task_id}}`, `{{task_title}}`, `{{project_name}}`, `{{lane_type}}`, etc.

See ADR in DECISIONS.md: "DEC: Prompts Are Fixed (Not User-Configurable)".
