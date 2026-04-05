# AI Flow Lab - Portable Automation Template

A comprehensive automation system for AI-assisted development that works with any project (new or existing).

## What is AI Flow Lab?

AI Flow Lab is a structured automation layer that enables multiple AI agents to collaborate on software development tasks. It provides:

- **Multi-agent coordination**: Claude for analysis/debugging, Codex for features/tests, with extensible lane-based assignment
- **Task management**: Structured task lifecycle with states, proposals, decisions, and followups
- **State preservation**: All decisions, goals, and task history are version-controlled
- **Human gates**: Critical operations require explicit human approval before proceeding
- **Dashboard UI**: Visual task management and status monitoring
- **API mode**: Integration with ChatGPT desktop app or standard API calls

## Quick Start

### New Project

```bash
git init my-project
cd my-project
cp -r /path/to/template . && ./template/init-ai-flow.sh
```

### Existing Project

```bash
cd /path/to/existing/project
cp -r /path/to/template . && ./template/init-ai-flow.sh --existing
```

## Project Structure After Initialization

```
project/
├── automation/              # Automation engine
│   ├── scripts/            # Task execution scripts
│   ├── state/              # Task/goal state storage
│   │   ├── tasks/         # Active task states
│   │   ├── goals/         # Goal definitions
│   │   ├── proposals/     # Pending proposals
│   │   ├── decisions/     # Captured decisions
│   │   └── locks/         # Concurrency locks
│   ├── prompts/           # Saved prompts
│   ├── prompts-queue/     # Queued prompts
│   ├── ui/                # Dashboard UI
│   ├── package.json       # Dependencies
│   ├── .env               # Configuration
│   └── .env.example       # Configuration template
│
├── ai/                     # AI artifacts
│   ├── project.config.yaml # Lane & agent configuration
│   ├── specs/             # Feature specifications
│   ├── reviews/           # Code reviews
│   ├── briefs/            # Research briefs
│   ├── results/           # Task results
│   ├── followups/         # Followup proposals
│   └── current-state/     # System state snapshots
│
├── docs/                  # Project documentation
│   ├── DOMAIN_MODEL.md   # Entity definitions
│   ├── INVARIANTS.md     # System constraints
│   ├── ARCHITECTURE.md   # System design
│   └── ADR/              # Architecture Decision Records
│
├── goals/                 # Active goals
├── decisions/            # Team decisions
│
├── AGENTS.md             # AI agent configuration
├── CLAUDE.md             # Claude-specific instructions
├── GEMINI.md             # Gemini-specific instructions
└── .mcp.json            # Model Context Protocol config
```

## Configuration

### `ai/project.config.yaml`

Defines lanes, agents, and human gates:

```yaml
project_name: my-project

# Truth sources - documents agents read first
truth_sources:
  - docs/DOMAIN_MODEL.md
  - docs/INVARIANTS.md
  - docs/ARCHITECTURE.md

# Work lanes - assign agents to task types
lanes:
  analysis-lane:
    default_executor: claude      # Who executes
    read_only: true               # Can't merge to main
    branch_prefix: analysis/      # Branch naming

  bug-lane:
    default_executor: claude
    read_only: false
    branch_prefix: bug/

  feature-lane:
    default_executor: codex
    read_only: false
    branch_prefix: feature/

  danger-lane:                     # Dangerous refactors
    default_executor: claude
    read_only: false
    branch_prefix: danger/
    requires_human_before_pr: true # Human approval required

# Human gates - where humans must approve
human_gates:
  before_merge_main: true
  before_prod_deploy: true
  before_destructive_migration: true
```

### Environment Variables (`automation/.env`)

```bash
# LLM Mode
LLM_MODE=app              # "app" (ChatGPT) or "api" (API keys)

# API Keys (only needed in "api" mode)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.0-flash

# Dashboard
PORT=3847
```

## Running the System

### Start the Dashboard

```bash
cd automation
npm run serve-dashboard
# Open http://localhost:3847
```

### Create a New Task

```bash
cd automation
npm run new-task
# Follow interactive prompts
```

### Run a Task

```bash
cd automation
npm run run-task <task-id>
```

### Close a Task

```bash
cd automation
npm run close-task <task-id>
```

### Start a Goal

```bash
cd automation
npm run start-goal <goal-id>
```

## How AI Flow Lab Works

### Task Lifecycle

1. **Create**: Human creates task with context
2. **Propose**: Agent proposes solution approach
3. **Approve**: Human reviews and approves
4. **Execute**: Agent implements the solution
5. **Review**: Human reviews implementation
6. **Synthesize**: Agent documents results
7. **Close**: Task marked complete with artifacts

### Lane-Based Execution

Tasks are assigned to lanes based on type:

| Lane | Executor | Use Cases | Can Merge to Main |
|------|----------|-----------|-------------------|
| analysis-lane | Claude | Code review, diagnosis, design review | No |
| bug-lane | Claude | Bug fixes, debugging | Yes |
| feature-lane | Codex | New features, enhancements | Yes |
| danger-lane | Claude | Dangerous refactors, migrations | Yes* |
| docs-lane | Codex | Documentation, examples | Yes |
| test-lane | Codex | Test writing, coverage | Yes |

*danger-lane requires human approval before PR

### State Management

All state is stored as YAML files in `automation/state/`:

- **tasks/**: Current task state and history
- **goals/**: Goal definitions and progress
- **proposals/**: Pending task/followup proposals
- **decisions/**: Captured decisions and rationale
- **locks/**: Concurrency control

All state is version-controlled and can be reviewed in git.

### Human Gates

Critical operations require explicit human approval:

- Merging to main branch
- Deploying to production
- Running destructive migrations
- In danger-lane before opening PR

Gates are logged in `decisions/` for audit trail.

## Integration with ChatGPT App

### API Mode

AI Flow Lab can run in API mode using standard API keys:

```bash
# In automation/.env
LLM_MODE=api
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
```

Scripts will make HTTP requests to OpenAI and Gemini APIs directly.

### App Mode

For better UX, use the ChatGPT desktop app:

```bash
# In automation/.env
LLM_MODE=app
```

AI Flow Lab will:
1. Generate task prompts and save to disk
2. Open ChatGPT desktop app with system context
3. Wait for responses
4. Parse and process results

This allows real-time interaction while maintaining structured task management.

## Available Scripts

All scripts are in `automation/scripts/`:

### Task Scripts

- `new-task.mjs` - Create a new task
- `run-task.mjs` - Execute a task
- `close-task.mjs` - Mark task as complete
- `critique-task.mjs` - Review task implementation
- `finalize-task.mjs` - Finalize task and store artifacts

### Goal Scripts

- `start-goal.mjs` - Create and start a goal
- `run-goal-first-task.mjs` - Execute first goal task
- `set-goal-state.mjs` - Update goal state

### Proposal Scripts

- `spawn-from-goal-proposal.mjs` - Create task from proposal
- `propose-followups-api.mjs` - Suggest followup tasks

### Architecture & Analysis

- `architect-task.mjs` - Design task solution (interactive)
- `architect-task-api.mjs` - Design via API

### Synthesis & Documentation

- `synthesize-task.mjs` - Document task results
- `synthesize-task-api.mjs` - Document via API

### Decision Management

- `capture-decision.mjs` - Log a decision
- `set-state.mjs` - Update task state

### Utilities

- `serve-dashboard.mjs` - Start the web dashboard
- `prepare-worktree.mjs` - Set up git worktree
- `bootstrap-worktree.mjs` - Initialize worktree
- `check-artifacts.mjs` - Verify task artifacts
- `config.mjs` - Load project configuration
- `_llm-utils.mjs` - Shared LLM utilities

## Documentation Templates

### `docs/DOMAIN_MODEL.md`

Define your core entities:
- What are the main objects in your system?
- What properties do they have?
- How do they relate to each other?
- What rules govern them?

Example:
```markdown
# DOMAIN MODEL

## User
A User represents a person using the system.
- id: UUID
- email: unique string
- role: "admin" | "member"
- created_at: timestamp

## Project
A Project is a collection of work.
- id: UUID
- name: string
- owner_id: FK -> User
- created_at: timestamp

## Rules
- User emails are globally unique
- Only admins can create projects
- Projects are owned by exactly one user
```

### `docs/INVARIANTS.md`

Define system constraints:
- What must always be true?
- What consistency guarantees do we provide?
- What are the limits?

Example:
```markdown
# INVARIANTS

## Data
- No orphaned foreign keys
- User IDs are globally unique
- No duplicate emails per tenant

## Process
- All write operations are atomic
- Indexes are updated within 1 second
- Cache is invalidated within 5 minutes

## Performance
- API response time < 200ms (p99)
- Database queries < 100ms (p99)
```

### `docs/ARCHITECTURE.md`

Document the system design:
- What are the main components?
- How do they communicate?
- What is the deployment topology?
- What are the security guarantees?

## Customization

### Add a New Lane

1. Edit `ai/project.config.yaml`:
```yaml
lanes:
  my-lane:
    default_executor: claude
    read_only: false
    branch_prefix: my/
```

2. Create a custom script in `automation/scripts/my-lane-task.mjs`

3. Update the dashboard to show the new lane (optional)

### Add Custom Agent Instructions

Create agent-specific files:

- `CLAUDE.md` - Claude instructions (default provided)
- `GEMINI.md` - Gemini instructions (default provided)
- `MYAGENT.md` - Custom agent instructions

Content structure:
```markdown
# MYAGENT Instructions

Use MYAGENT for:
- List specific use cases

Default behavior:
- Code style preferences
- Naming conventions
- Architecture preferences
```

### Extend the Dashboard

The dashboard is in `automation/ui/dashboard.html`. It's a static HTML file that reads state from disk via the API server.

To extend:
1. Add HTML elements
2. Update the JavaScript fetch calls to load new state
3. Restart the server: `npm run serve-dashboard`

## Troubleshooting

### Scripts Not Found

If scripts are missing after initialization:

```bash
# Copy scripts manually
cp -r /path/to/template/scripts/* automation/scripts/
```

### Dependencies Not Installed

```bash
cd automation
npm install
```

### Dashboard Won't Start

```bash
# Check port availability
lsof -i :3847

# Check environment
cat automation/.env

# View logs
npm run serve-dashboard 2>&1 | head -50
```

### Task State Corrupted

Task state is stored in YAML. To recover:

```bash
# View the current state
cat automation/state/tasks/[task-id].yaml

# Revert to last good state
git checkout HEAD -- automation/state/tasks/[task-id].yaml

# Or start fresh
rm automation/state/tasks/[task-id].yaml
```

## Best Practices

1. **Write truth documents first**: Always document domain, invariants, and architecture before starting work
2. **Respect lane isolation**: Use the right lane for each task type
3. **Gate dangerous operations**: Use human gates for risky changes
4. **Capture decisions**: Log why decisions were made in `decisions/`
5. **Review proposals**: Always review agent proposals before approval
6. **Document followups**: Suggest concrete followup tasks rather than goldplating
7. **Keep state clean**: Archive completed tasks periodically

## Contributing

To improve the template:

1. Update the working version in your project
2. Copy improvements back to the template:
   ```bash
   cp automation/scripts/*.mjs /path/to/template/scripts/
   cp automation/ui/dashboard.html /path/to/template/ui/
   ```
3. Test initialization on a fresh project

## Support

For issues and questions:

1. Check the troubleshooting section above
2. Review `CLAUDE.md` and `GEMINI.md` for agent guidelines
3. Check `automation/state/` for task/goal/decision history
4. Review docs for domain and architecture context

## License

AI Flow Lab is provided as-is for use in any project.
