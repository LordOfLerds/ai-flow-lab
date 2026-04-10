# Observability

## Token Tracking

**logUsage() in _llm-utils.mjs** (lines 132-149):
```javascript
logUsage({ taskId, step, provider, model, inputTokens, outputTokens, durationMs })
```

- **Destination**: state/usage-log/usage-log.jsonl (append-only)
- **Format**: one JSON object per line (JSONL)
- **Fields**:
  - timestamp (ISO 8601)
  - taskId (T-XXXX)
  - step (architect, critique, synthesize, execute, propose, pr-draft)
  - provider (openai, gemini, claude, codex)
  - model (gpt-4, gemini-pro, claude-3-sonnet, code-davinci-002)
  - inputTokens (estimated via estimateTokens())
  - outputTokens
  - durationMs (wall-clock time)

**Called by**: each step script after LLM call completes
**Token Estimation**: rough heuristic (1 token ≈ 4 chars) in estimateTokens()

### API Endpoint

**GET /api/usage** (serve-dashboard.mjs):
- Reads state/usage-log/usage-log.jsonl
- Parses each line
- Returns array of usage entries (JSON)
- No aggregation yet

Example response:
```json
[
  {
    "timestamp": "2026-04-07T10:23:45.123Z",
    "taskId": "T-0001",
    "step": "architect",
    "provider": "openai",
    "model": "gpt-4",
    "inputTokens": 1500,
    "outputTokens": 3200,
    "durationMs": 8500
  }
]
```

## Error Logging

### .errors.json per Task

**Location**: state/errors/T-XXXX.errors.json

**Schema**: array of objects
```json
[
  {
    "step": "architect|critique|synthesize|...",
    "message": "error message string",
    "timestamp": "ISO8601",
    "depth": 0
  }
]
```

**Depth Field**: tracks cascade recursion level (0 = root task, 1 = followup, 2 = followup of followup)

### Task Last Error

**Location**: task.last_error field in state/tasks/T-XXXX.json

- Updated on any step failure
- Short string (first 200 chars of error message)
- Cleared on retry success
- Displayed in dashboard

## Health Check Endpoint

**GET /api/cascade/status** (serve-dashboard.mjs):

Returns:
```json
{
  "timestamp": "ISO8601",
  "running_tasks": ["T-0001", "T-0005"],
  "idle_tasks": ["T-0002", "T-0003"],
  "error_tasks": ["T-0004"],
  "total_tasks": 5,
  "uptime_seconds": 86400
}
```

## Cost Tracking (Implemented — FIX-034)

Since FIX-034, `logUsage()` accepts and persists three additional fields from tool-enabled Claude CLI calls:
- **costUsd**: Dollar cost reported by Claude CLI JSON output
- **numTurns**: Number of conversation turns in tool-enabled sessions
- **cacheReadTokens**: Tokens served from cache (reduces effective cost)

The dashboard now shows dollar costs alongside token counts for tool-enabled steps (execute, cowork-test, diagnose, generate-fix).

**Note:** Cost data is only available for Claude CLI tool-mode calls that return structured JSON output (`--output-format json`). OpenAI and Gemini costs are still estimated from token counts.

## Current Gaps

1. **No Token Aggregation**: raw usage-log.jsonl only. No rollups by task/provider/day.
2. **No Dashboard Visualization**: /api/usage returns raw data. Dashboard doesn't consume it yet.
3. **No Structured Metrics**: no min/max/avg per step, no failure rate tracking.
4. **No Budget Enforcement**: cascade budgets (token limit, cost limit) are advisory only.
5. **No Rate Limiting**: no per-provider throttling or quota management.

## Planned: Observability v2

### Cost Calculation

**pricing.json** (new):
```json
{
  "openai": {
    "gpt-4": { "input": 0.00003, "output": 0.00006 },
    "gpt-3.5-turbo": { "input": 0.0005, "output": 0.0015 }
  },
  "gemini": {
    "gemini-pro": { "input": 0.0001, "output": 0.0003 }
  },
  "claude": {
    "claude-3-sonnet": { "input": 0.003, "output": 0.015 }
  }
}
```

New field in usage entry: costUsd = (inputTokens * pricing[provider][model].input) + (outputTokens * pricing[provider][model].output)

### Metrics Dashboard

**GET /api/metrics/summary** (new):
```json
{
  "total_tasks": 10,
  "completed_tasks": 6,
  "avg_cascade_duration_ms": 45000,
  "avg_cost_per_task": 1.25,
  "failure_rate_by_step": {
    "architect": 0.05,
    "critique": 0.02,
    "execute": 0.15
  },
  "followup_spawn_rate": 0.3,
  "token_usage_by_provider": {
    "openai": { "input": 50000, "output": 120000 },
    "gemini": { "input": 30000, "output": 80000 }
  }
}
```

**Dashboard Widget**: visual timeline of cascade runs, cost trends, step success rates

### Persistent Structured Logging

**Planned**: move from JSONL to SQLite or Supabase
- Columns: id, timestamp, taskId, step, provider, model, inputTokens, outputTokens, costUsd, durationMs, depth, success
- Indexes: (taskId, step), (provider), (timestamp)
- Audit trail: who ran what, when, cost, result
- Retention policy: keep all or auto-archive after 90 days

### Budget Warnings

**Usage Tracking**:
- Track cumulative cost per task, per goal
- Warn if approaching budget limits
- Cascade stops if budget exhausted
- UI shows budget percentage bar

**Configuration** (cascade-config.json):
```json
{
  "max_cascade_cost_usd": 10.0,
  "max_task_cost_usd": 2.0,
  "max_goal_cost_usd": 25.0,
  "token_budget": 1000000
}
```

## Debugging Commands

```bash
# View raw usage log
tail -f state/usage-log/usage-log.jsonl

# Parse and sum by provider
jq -s 'group_by(.provider) | map({provider: .[0].provider, count: length})' state/usage-log/usage-log.jsonl

# View latest errors
tail -n 10 state/errors/*.errors.json

# Check task status
cat state/tasks/T-0001.json | jq '.state, .runtime_status, .last_error'

# Monitor cascade in progress
watch 'curl -s http://localhost:3847/api/cascade/status | jq'
```
