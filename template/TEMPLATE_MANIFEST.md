# AI Flow Lab Template Manifest

Complete inventory of the portable AI Flow Lab automation template.

## Quick Summary

This template enables rapid setup of AI Flow Lab automation on any project. It contains:

- **Initialization script**: Automated setup with directory structure, config generation, and dependency installation
- **25 automation scripts**: Complete task/goal management system
- **Dashboard UI**: Web interface for visual task management
- **Configuration system**: Lanes, agents, human gates, and customization
- **Documentation templates**: Domain model, invariants, architecture
- **Agent guidelines**: Claude and Gemini role-specific instructions

**Setup time**: < 5 minutes on any project

## File Structure

```
template/
├── init-ai-flow.sh                    # Main initialization script (executable)
├── README.md                          # Comprehensive user guide
├── TEMPLATE_MANIFEST.md              # This file
│
├── .env.example                       # Environment configuration template
├── project.config.yaml.template       # Project configuration template
│
├── scripts/                           # 25 automation scripts (copy of automation/scripts/)
│   ├── _llm-utils.mjs                # Shared LLM utilities
│   ├── architect-task.mjs            # Interactive architecture design
│   ├── architect-task-api.mjs        # API-based architecture design
│   ├── bootstrap-worktree.mjs        # Initialize git worktree
│   ├── capture-decision.mjs          # Log decisions
│   ├── check-artifacts.mjs           # Verify task artifacts
│   ├── close-task.mjs                # Complete a task
│   ├── config.mjs                    # Load project config
│   ├── critique-task.mjs             # Review task implementation
│   ├── critique-task-api.mjs         # API-based review
│   ├── finalize-task.mjs             # Finalize and archive task
│   ├── new-task.mjs                  # Create new task
│   ├── plan-goal-api.mjs             # Plan goal tasks (API)
│   ├── prepare-worktree.mjs          # Prepare git worktree
│   ├── propose-followups-api.mjs     # Suggest followup tasks (API)
│   ├── run-goal-first-task.mjs       # Execute first goal task
│   ├── run-task.mjs                  # Execute task
│   ├── serve-dashboard.mjs           # Start web dashboard
│   ├── set-goal-state.mjs            # Update goal state
│   ├── set-state.mjs                 # Update task state
│   ├── spawn-followup-task.mjs       # Create followup from result
│   ├── spawn-from-goal-proposal.mjs  # Create task from goal
│   ├── start-goal.mjs                # Start a goal
│   └── synthesize-task.mjs           # Document task results
│
├── ui/
│   └── dashboard.html                # Web UI dashboard
│
├── agent-configs/                    # Agent role definitions
│   ├── AGENTS.md                     # Agent assignments and selection logic
│   ├── CLAUDE.md                     # Claude-specific instructions
│   └── GEMINI.md                     # Gemini-specific instructions
│
└── docs/                             # Documentation templates
    ├── DOMAIN_MODEL.template.md      # Entity and business rules template
    ├── INVARIANTS.template.md        # System constraints template
    └── ARCHITECTURE.template.md      # System design template
```

## What Gets Created On a Project

When you run `./template/init-ai-flow.sh [project-name]`:

```
project/
├── automation/                       # Core automation engine
│   ├── scripts/                     # Copied from template/scripts/
│   ├── state/                       # Task/goal state storage
│   │   ├── tasks/                   # Task states
│   │   ├── goals/                   # Goal definitions
│   │   ├── proposals/               # Pending proposals
│   │   ├── decisions/               # Captured decisions
│   │   └── locks/                   # Concurrency locks
│   ├── prompts/                     # Saved prompts
│   ├── prompts-queue/               # Queued prompts
│   ├── ui/                          # Copied dashboard.html
│   ├── package.json                 # Dependencies
│   ├── .env                         # Configuration (created from .env.example)
│   ├── .env.example                 # Template
│   ├── node_modules/                # npm packages
│   └── tsconfig.json                # TypeScript config (if needed)
│
├── ai/                              # AI artifacts
│   ├── project.config.yaml          # Generated config
│   ├── specs/                       # Feature specifications
│   ├── reviews/                     # Code reviews
│   ├── briefs/                      # Research briefs
│   ├── results/                     # Task results
│   ├── followups/                   # Followup proposals
│   └── current-state/               # System snapshots
│
├── docs/                            # Project documentation
│   ├── DOMAIN_MODEL.md              # Generated from template
│   ├── INVARIANTS.md                # Generated from template
│   ├── ARCHITECTURE.md              # Generated from template
│   └── ADR/                         # Architecture decision records
│
├── goals/                           # Active goals directory
├── decisions/                       # Team decisions directory
│
├── AGENTS.md                        # Copied from template/agent-configs/
├── CLAUDE.md                        # Copied from template/agent-configs/
├── GEMINI.md                        # Copied from template/agent-configs/
└── .mcp.json                        # Generated MCP config
```

## Key Features of the Template

### 1. Initialization Script (`init-ai-flow.sh`)

**Features**:
- Accepts project name as argument or uses current directory
- Supports `--existing` flag for existing projects
- Creates complete directory structure
- Generates configuration files with placeholder substitution
- Creates documentation templates
- Installs npm dependencies automatically
- Validates git repository exists
- Provides colored output and progress indicators
- Prints setup summary and next steps

**Usage**:
```bash
# New project
./template/init-ai-flow.sh my-project

# Existing project
./template/init-ai-flow.sh --existing

# Using current directory name
./template/init-ai-flow.sh
```

### 2. Configuration System

**`project.config.yaml.template`**:
- Lane definitions with executor assignments
- Human gate configuration
- Executor capabilities and best uses
- Branching strategy settings
- Task/goal lifecycle configuration
- Artifact storage preferences

**`.env.example`**:
- LLM mode: api or app
- API keys for OpenAI and Gemini
- Dashboard port configuration
- Logging and rate limiting settings
- Git configuration
- Development and safety flags

### 3. Automation Scripts (25 total)

**Task Management**:
- `new-task.mjs` - Create new task
- `run-task.mjs` - Execute task
- `close-task.mjs` - Complete task
- `finalize-task.mjs` - Archive with artifacts

**Analysis & Design**:
- `architect-task.mjs` - Interactive architecture design
- `critique-task.mjs` - Code/design review
- `synthesize-task.mjs` - Summarize results
- `capture-decision.mjs` - Log decision

**Goal Management**:
- `start-goal.mjs` - Create goal
- `run-goal-first-task.mjs` - Execute first task
- `set-goal-state.mjs` - Update goal state

**Proposals & Followups**:
- `spawn-from-goal-proposal.mjs` - Task from proposal
- `spawn-followup-task.mjs` - Task from result
- `propose-followups-api.mjs` - Suggest tasks

**API Versions** (for automation):
- `architect-task-api.mjs`
- `critique-task-api.mjs`
- `plan-goal-api.mjs`
- `synthesize-task-api.mjs`
- `propose-followups-api.mjs`

**Infrastructure**:
- `serve-dashboard.mjs` - Start web UI
- `bootstrap-worktree.mjs` - Initialize worktree
- `prepare-worktree.mjs` - Set up worktree
- `set-state.mjs` - Update task state
- `check-artifacts.mjs` - Verify artifacts
- `config.mjs` - Load configuration
- `_llm-utils.mjs` - Shared utilities

### 4. Documentation Templates

**`DOMAIN_MODEL.template.md`**:
- Entity definition structure
- Attributes and constraints
- Relationships (1-to-many, many-to-many)
- Business rules
- Invariants
- Examples and workflows
- Anti-patterns
- Future considerations

**`INVARIANTS.template.md`**:
- Data integrity invariants
- Process invariants
- Consistency rules
- Performance invariants
- Availability guarantees
- Security constraints
- Validation rules
- Concurrency guarantees
- Monitoring and alerting guidelines

**`ARCHITECTURE.template.md`**:
- System overview with diagrams
- Component definitions
- Data flow examples
- Deployment topology (dev/staging/prod)
- Performance characteristics
- Security model (auth, authz, encryption)
- Failure modes and recovery
- Monitoring and alerting
- Technology stack
- Future improvements

### 5. Agent Configuration

**`AGENTS.md`**:
- Agent availability and strengths
- Lane-to-agent mappings
- Agent selection logic
- Fallback procedures
- Context provided to agents
- Escalation paths
- Performance tracking

**`CLAUDE.md`**:
- Primary use cases (analysis, debugging, dangerous refactors)
- Key principles (read first, minimal changes, human gates)
- Default behavior settings
- Task lifecycle steps
- Code quality standards
- When blocked guidelines

**`GEMINI.md`**:
- Primary use cases (features, tests, documentation)
- Clear code principles
- Test-driven approach
- Documentation standards
- Testing requirements
- Edge case handling
- Performance considerations

### 6. Dashboard UI

**`dashboard.html`**:
- Single-page application
- Task management interface
- Real-time status updates
- Goal progress tracking
- Decision log viewer
- Responsive design
- No backend required (serves via Express)

## Portability Features

The template is designed to be completely portable:

1. **Self-contained**: All scripts are copied to the target project
2. **Relative paths**: Scripts find resources relative to their location
3. **Template substitution**: Configuration uses `{{PROJECT_NAME}}` placeholders
4. **No external dependencies**: Initialization uses only bash and npm
5. **Git-agnostic**: Works with existing or new repositories
6. **Customizable**: All generated files can be modified

## Setup Workflow

1. **Copy template to project**:
   ```bash
   cp -r /path/to/template /path/to/project/
   cd /path/to/project
   ```

2. **Run initialization**:
   ```bash
   ./template/init-ai-flow.sh
   ```

3. **Customize configuration**:
   ```bash
   # Edit lanes, agents, gates
   vim ai/project.config.yaml
   ```

4. **Document your system**:
   ```bash
   # Fill in truth documents
   vim docs/DOMAIN_MODEL.md
   vim docs/INVARIANTS.md
   vim docs/ARCHITECTURE.md
   ```

5. **Start using**:
   ```bash
   cd automation
   npm run serve-dashboard
   ```

## Integration Points

### With Existing Projects

The init script automatically:
- Detects if project already exists
- Preserves existing files
- Adds AI Flow Lab alongside existing code
- Initializes git if needed
- Adds to .gitignore if needed

### With ChatGPT

AI Flow Lab supports two modes:

**API Mode**:
- Uses OpenAI/Gemini APIs directly
- Requires API keys
- Can run in CI/CD

**App Mode**:
- Uses ChatGPT desktop application
- Better interactivity
- No API costs
- Requires human at keyboard

### With Version Control

All AI Flow Lab state is git-friendly:
- YAML format for easy diffs
- Separate files for each task
- Decision logs are documented
- Easy to revert or audit

## Verification Checklist

After running `./template/init-ai-flow.sh`:

- [ ] `automation/` directory created
- [ ] `ai/project.config.yaml` generated
- [ ] `docs/DOMAIN_MODEL.md` created
- [ ] `docs/INVARIANTS.md` created
- [ ] `docs/ARCHITECTURE.md` created
- [ ] `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` created
- [ ] `automation/.env` created from `.env.example`
- [ ] `automation/scripts/` contains all .mjs files
- [ ] `automation/ui/dashboard.html` exists
- [ ] `npm install` completed successfully
- [ ] `.mcp.json` created

## Troubleshooting

### Scripts not found
```bash
# Scripts should be copied automatically
ls automation/scripts/
# Should show ~25 .mjs files
```

### Dashboard won't start
```bash
cd automation
npm install  # Reinstall if needed
npm run serve-dashboard
# Should start on http://localhost:3847
```

### Config not generated
```bash
# Check git repo exists
git log --oneline | head -1
# Should show at least one commit
```

## Customization Examples

### Add a custom lane
```yaml
# In ai/project.config.yaml
lanes:
  custom-lane:
    default_executor: claude
    read_only: false
    branch_prefix: custom/
    description: "Custom work"
```

### Add a custom agent
```bash
# Create MYAGENT.md with instructions
# Update ai/project.config.yaml with agent definition
# Update agent-configs/ if making a template change
```

### Extend documentation
```bash
# Templates are just starting points
# Add sections to docs/ as needed
# Create ADR/ directory for decisions
mkdir -p docs/ADR
```

## Support and Contribution

This template is designed to be:

1. **Easy to copy**: Just copy the whole `template/` directory
2. **Easy to customize**: Every file can be modified
3. **Easy to extend**: Add more scripts, lanes, agents as needed
4. **Easy to share**: Improvements can be copied back to template

When improving the template:
1. Make improvements in your project
2. Copy updated files back to template/
3. Test on a fresh project
4. Share improvements with team

## Related Documentation

- **README.md**: Detailed user guide with examples
- **automation/scripts/*.mjs**: Individual script documentation
- **ai/project.config.yaml**: Configuration reference
- **DOMAIN_MODEL.template.md**: Entity modeling guide
- **INVARIANTS.template.md**: Constraint definition guide
- **ARCHITECTURE.template.md**: System design guide
