# AI Flow Lab - Quick Start Guide

Get AI Flow Lab automation running on any project in 5 minutes.

## For New Projects

```bash
# 1. Create and initialize git repository
mkdir my-awesome-project
cd my-awesome-project
git init
git config user.email "you@example.com"
git config user.name "Your Name"

# 2. Copy template
cp -r /path/to/template .

# 3. Run initialization
./template/init-ai-flow.sh

# 4. Configure your project
nano ai/project.config.yaml      # Customize lanes and agents
nano docs/DOMAIN_MODEL.md        # Document your domain
nano docs/INVARIANTS.md          # Define system constraints
nano docs/ARCHITECTURE.md        # Sketch your architecture

# 5. Start working
cd automation
npm run serve-dashboard

# Open http://localhost:3847 in your browser
```

## For Existing Projects

```bash
# 1. Navigate to your project
cd /path/to/existing/project

# 2. Ensure it's a git repo
git log --oneline | head -1  # Should show a commit

# 3. Copy template
cp -r /path/to/template .

# 4. Run initialization with --existing flag
./template/init-ai-flow.sh --existing

# 5. Review generated files
git status                   # See what was added
git diff docs/DOMAIN_MODEL.md  # Preview docs

# 6. Customize and commit
nano ai/project.config.yaml
git add .
git commit -m "Initialize AI Flow Lab automation"

# 7. Start the dashboard
cd automation
npm run serve-dashboard
```

## Next Steps

### 1. Set up LLM Access (Choose One)

**Option A: ChatGPT Desktop App (Recommended)**
```bash
# Edit automation/.env
nano automation/.env

# Set:
LLM_MODE=app
PORT=3847

# Leave API keys blank
# Requires ChatGPT desktop app installed and running
```

**Option B: API Keys**
```bash
# Edit automation/.env
nano automation/.env

# Set:
LLM_MODE=api
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash-lite
PORT=3847
```

### 2. Verify Installation

```bash
# Check structure
ls -la automation/
ls automation/scripts/*.mjs | wc -l    # Should show 25

# Check dependencies
cd automation && npm list express     # Should show express version

# Test dashboard startup
npm run serve-dashboard
# Should output: "Dashboard listening on port 3847"
```

### 3. Create Your First Task

```bash
# In new terminal (dashboard still running):
cd automation
npm run new-task

# Follow the interactive prompts:
# 1. Task name
# 2. Description
# 3. Select lane (analysis/bug/feature/danger/docs/test)
# 4. Set as ready for execution (y/n)
```

### 4. View in Dashboard

Navigate to http://localhost:3847 and you should see:
- Your new task in the task list
- Task state and metadata
- Available actions (run, close, critique)

## Key Files to Customize

### `ai/project.config.yaml`
Defines how AI Flow Lab works on YOUR project:
- Which AI agents handle which task types
- Which operations require human approval
- Branching and merging strategy

### `docs/DOMAIN_MODEL.md`
Define your core business concepts:
- What entities exist (Users, Projects, Tasks, etc)
- What properties they have
- How they relate
- What rules govern them

### `docs/INVARIANTS.md`
Define system guarantees:
- What must always be true
- Performance SLAs
- Security guarantees
- Data consistency rules

### `docs/ARCHITECTURE.md`
Sketch your system design:
- Main components
- Data flow
- Deployment topology
- Technology choices

## Common Commands

```bash
# Create and run a task
npm run new-task
npm run run-task <task-id>

# Review a task implementation
npm run critique-task <task-id>

# Close a task and store artifacts
npm run close-task <task-id>

# Start a goal with multiple tasks
npm run start-goal <goal-name>

# View the dashboard
npm run serve-dashboard

# Capture a decision
npm run capture-decision

# Set up git worktree for a task
npm run prepare-worktree <task-id>
npm run bootstrap-worktree <task-id>
```

## Understanding Task Lanes

Tasks are organized by lane. Choose the right lane when creating a task:

| Lane | Use For | Executor | Can Merge |
|------|---------|----------|-----------|
| **analysis-lane** | Code review, investigation, diagnosis | Claude | No |
| **bug-lane** | Bug fixes, debugging | Claude | Yes |
| **feature-lane** | New features, enhancements | Codex | Yes |
| **danger-lane** | Refactors, migrations (needs approval) | Claude | Yes* |
| **docs-lane** | Documentation, guides | Codex | Yes |
| **test-lane** | Tests, test infrastructure | Codex | Yes |

*danger-lane requires human approval before opening PR

## Example Workflow

```bash
# 1. Create an analysis task
npm run new-task
# → Name: "Analyze payment system architecture"
# → Lane: analysis-lane
# → Description: "Understand current payment flow, identify issues"

# 2. Run the task
npm run run-task task-001

# 3. Review Claude's analysis in automation/state/tasks/task-001.yaml

# 4. Based on analysis, create a bug-fix task
npm run new-task
# → Name: "Fix payment race condition"
# → Lane: bug-lane
# → Description: "Fix identified race condition in concurrent payments"
# → Related task: task-001

# 5. Run the bug-fix task
npm run run-task task-002

# 6. Review implementation
npm run critique-task task-002

# 7. Close when satisfied
npm run close-task task-002
```

## Troubleshooting

### Dashboard won't start
```bash
# Check if port 3847 is in use
lsof -i :3847

# Change port in automation/.env
PORT=3848

# Try starting again
npm run serve-dashboard
```

### Scripts not found
```bash
# Verify they were copied
ls automation/scripts/*.mjs | wc -l
# Should show 25

# If not, copy manually
cp template/scripts/*.mjs automation/scripts/
```

### Dependencies error
```bash
# Reinstall npm packages
cd automation
rm -rf node_modules package-lock.json
npm install
```

### Task creation fails
```bash
# Check git is initialized
git log --oneline | head -1
# Should show at least one commit

# Verify automation/state directory structure
ls -la automation/state/
# Should show: tasks  goals  proposals  decisions  locks
```

## Getting Help

1. **For script usage**: 
   ```bash
   node scripts/new-task.mjs --help
   ```

2. **For configuration**: 
   Check `ai/project.config.yaml` comments

3. **For task state**: 
   ```bash
   cat automation/state/tasks/task-001.yaml
   ```

4. **For decisions**: 
   ```bash
   ls decisions/
   cat decisions/decision-001.md
   ```

## Next: Deep Dives

After getting started:

- Read **README.md** for comprehensive guide
- Read **TEMPLATE_MANIFEST.md** for complete inventory
- Review **AGENTS.md** for AI agent configuration
- Review **CLAUDE.md** and **GEMINI.md** for agent instructions
- Explore **ai/project.config.yaml** for advanced configuration

## Key Insights

- **Automation layer**: All task state is version-controlled YAML
- **Human gates**: AI can't merge to main without human approval
- **Lane-based**: Different task types go to different AI agents
- **Stateful**: Tasks persist and can be reviewed/edited later
- **Auditable**: All decisions are logged in `decisions/` directory

Happy automating!
