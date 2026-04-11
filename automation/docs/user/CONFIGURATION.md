# Configuration Reference

## project.config.yaml

Every project is configured via `project.config.yaml` in the project root. This file controls routing, limits, and behavior.

### executor_routing

Maps which AI provider executes each step, optionally per lane:

```yaml
executor_routing:
  default:
    architect: openai
    critique: gemini
    synthesize: openai
    execute: claude
    test: local
    merge: git
    propose_followups: claude
    pr_draft: openai

  # Lane-specific overrides (optional)
  bug:
    execute: claude  # always use Claude for dangerous bug fixes
    test: ci         # require CI tests

  danger:
    critique: gemini
    execute: claude
    test: ci
    # inherits all others from default
```

**Available providers:**
- `openai` — GPT-4 via OpenAI API
- `gemini` — Google Gemini via Gemini API
- `claude` — Claude via Anthropic API
- `codex` — Codex via OpenAI API (legacy)
- `local` — Local test runner (Node)
- `ci` — External CI/CD provider (GitHub Actions, etc.)
- `git` — Built-in git operations (no API call)

### cascade_limits

Controls follow-up spawning behavior:

```yaml
cascade_limits:
  max_depth: 3              # Max cascade depth (root = depth 0)
  max_followups_per_task: 5 # Max follow-ups spawned from one task
  max_total_tasks: 20       # Hard limit on total tasks in cascade
  dedup_threshold: 0.75     # Jaccard similarity; >= threshold = duplicate
```

## .env Variables

Create `.env` at project root (never commit; add to `.gitignore`):

```bash
# Required for API mode
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
CLAUDE_API_KEY=sk-ant-...

# Execution mode: api | cli | app | mock
LLM_MODE=api

# Optional: override default models
OPENAI_MODEL=gpt-4o
GEMINI_MODEL=gemini-2.5-flash-lite
CLAUDE_MODEL=claude-sonnet-4-20250514

# Optional: logging and debugging
DEBUG=ai-flow-lab:*
LOG_LEVEL=info
LOG_FILE=./logs/flow.log

# Optional: cascade behavior
CASCADE_DRY_RUN=false  # true = show what would spawn, don't execute

# SaaS only: auth token
AIFLOWLAB_TOKEN=...
```

## Gemini Model Selection

The `GEMINI_MODEL` variable controls which Google model handles the critique step. Choose carefully — deprecated models fail silently.

**Stable models (recommended):**

| Model | Use case | Notes |
|-------|----------|-------|
| `gemini-2.5-flash` | Default critique | Fast, good quality. Shared quota pool. |
| `gemini-2.5-flash-lite` | Fallback / budget | Fastest, cheapest. **Separate quota** from flash — use when flash quota is exhausted (429 errors). |
| `gemini-2.5-pro` | Complex analysis | Highest quality, slowest. Overkill for critique. |

**Deprecated models (DO NOT USE):**
- `gemini-2.0-flash` — retired, API calls hang or fail silently
- `gemini-2.0-flash-lite` — retired
- `gemini-1.5-*` — legacy

**Quota strategy:** Free-tier Gemini has strict rate limits. If you hit 429 errors on `gemini-2.5-flash`, switch to `gemini-2.5-flash-lite` which uses a separate quota pool. The flash quota typically recovers within 1-24 hours.

**Multi-project note:** Each project has its own `.env` file. The server loads the base `.env` from `ai-flow-lab/automation/` at startup, then overrides with the active project's `.env` on project switch. Make sure `GEMINI_MODEL` is set correctly in both files.

## Lane Configuration

Each lane can override global defaults:

```yaml
lanes:
  feature:
    executor_routing:
      test: local
    cascade_limits:
      max_depth: 2

  danger:
    executor_routing:
      execute: claude
      test: ci
    require_approval_before_merge: true

  docs:
    executor_routing:
      test: null  # skip test step
    max_concurrent_tasks: 5
```

**Planned features:**
- Custom lane definitions (not just predefined ones)
- Lane-specific templates and approval workflows

## Cowork Test Configuration

The Cowork Test step validates executor output via Claude CLI. Configure in `project.config.yaml`:

```yaml
cowork_test:
  enabled: true                # Enable/disable Cowork Test step
  timeout_ms: 300000           # CLI timeout (default: 5 min for tool-enabled mode)
  model: "claude-sonnet-4-20250514"  # Model for test analysis
  max_prompt_chars: 50000      # Truncation limit for test prompt
  max_budget_usd: 1.00         # Cost cap per test run

  # Guardrail thresholds (trigger test or decision gate)
  thresholds:
    yellow_fn_missing: 1       # >= 1 function missing → YELLOW → run Cowork Test
    red_fn_missing_pct: 0.10   # >= 10% functions missing → RED → Decision Proposal
    yellow_line_shrink: 0.90   # Line ratio < 90% → YELLOW
    red_line_shrink: 0.70      # Line ratio < 70% → RED
```

**Guardrail levels:**
- **GREEN**: No issues detected. Auto-continues to merge.
- **YELLOW**: Minor concerns (1-2 functions changed, line count slightly reduced). Routes to Cowork Test for validation.
- **RED**: Major concerns (>10% functions missing, large line count reduction). Pipeline pauses with a Decision Proposal — user chooses Accept, Restore, or Test.

**Cowork Test output:** Structured JSON report with PASS/FAIL result, per-criterion checks, regression list, and auto-created bug tasks on failure.

## Pipeline Configuration

**Aktueller Stand (Current):**
- All 7 steps always run (Test is optional via `executor_routing.test: null`)
- Step order is fixed

**Geplant (Planned):**
- `pipeline_steps.enabled`: array of steps to run (e.g., `["architect", "critique", "synthesize", "execute", "merge"]`)
- `pipeline_conditions`: conditional step execution
  - Example: `test: { only_lanes: ["bug", "danger"] }` — test only for bug/danger lanes
  - Example: `merge: { if: "test_passed and review_approved" }` — conditional merge
- `concurrency_config`:
  - `max_parallel_tasks: 3` — run at most 3 tasks in parallel
  - `conflict_detection: true` — pre-check for git conflicts before executing
  - `auto_rebase: true` — auto-rebase branch if main moved forward
