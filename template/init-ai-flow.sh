#!/bin/bash
# AI Flow Lab - Project Initialization
# Usage: ./init-ai-flow.sh [project-name] [--existing]
#
# Creates the automation layer for AI-assisted development.
# Safe to run on existing projects (--existing flag).
#
# This script initializes the directory structure, configuration files,
# and dependencies needed to run AI Flow Lab automation in any project.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
PROJECT_NAME="${1:-.}"
EXISTING_FLAG="${2:-}"

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# If project name is ".", use the current directory name
if [ "$PROJECT_NAME" = "." ]; then
    PROJECT_NAME=$(basename "$(pwd)")
fi

# Handle --existing flag
EXISTING_PROJECT=false
if [ "$EXISTING_FLAG" = "--existing" ] || [ "$PROJECT_NAME" = "--existing" ]; then
    EXISTING_PROJECT=true
    if [ "$PROJECT_NAME" = "--existing" ]; then
        PROJECT_NAME=$(basename "$(pwd)")
    fi
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}AI Flow Lab - Project Initialization${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Project: ${GREEN}${PROJECT_NAME}${NC}"
echo -e "Existing project: ${GREEN}${EXISTING_PROJECT}${NC}"
echo ""

# Verify git repo
if [ ! -d ".git" ]; then
    echo -e "${RED}Error: Not a git repository. Run 'git init' first.${NC}"
    exit 1
fi

# Create directory structure
echo -e "${YELLOW}Creating directory structure...${NC}"

mkdir -p automation/scripts
mkdir -p automation/state/{tasks,goals,proposals,decisions,decision_proposals,pr_drafts,locks/tasks,locks/branches,prompts-queue,usage-log}
mkdir -p automation/prompts
mkdir -p automation/ui
mkdir -p ai/{specs,reviews,briefs,results,followups,pr,current-state}
mkdir -p docs
mkdir -p goals
mkdir -p decisions

echo -e "${GREEN}✓ Directories created${NC}"

# Copy scripts from template
echo -e "${YELLOW}Copying automation scripts...${NC}"
if [ -d "${SCRIPT_DIR}/scripts" ]; then
    cp "${SCRIPT_DIR}"/scripts/*.mjs automation/scripts/ 2>/dev/null || true
    echo -e "${GREEN}✓ Scripts copied${NC}"
else
    echo -e "${YELLOW}⚠ No scripts directory found in template${NC}"
fi

# Copy dashboard
echo -e "${YELLOW}Copying UI dashboard...${NC}"
if [ -f "${SCRIPT_DIR}/ui/dashboard.html" ]; then
    cp "${SCRIPT_DIR}/ui/dashboard.html" automation/ui/
    echo -e "${GREEN}✓ Dashboard copied${NC}"
else
    echo -e "${YELLOW}⚠ Dashboard not found in template${NC}"
fi

# Generate project.config.yaml
echo -e "${YELLOW}Generating project.config.yaml...${NC}"
cat > ai/project.config.yaml <<EOF
project_name: ${PROJECT_NAME}
truth_sources:
  - docs/DOMAIN_MODEL.md
  - docs/INVARIANTS.md
  - docs/ARCHITECTURE.md
  - docs/ADR/
lanes:
  analysis-lane:
    default_executor: claude
    read_only: true
    branch_prefix: analysis/
  bug-lane:
    default_executor: claude
    read_only: false
    branch_prefix: bug/
  feature-lane:
    default_executor: codex
    read_only: false
    branch_prefix: feature/
  danger-lane:
    default_executor: claude
    read_only: false
    branch_prefix: danger/
    requires_human_before_pr: true
  docs-lane:
    default_executor: codex
    read_only: false
    branch_prefix: docs/
  test-lane:
    default_executor: codex
    read_only: false
    branch_prefix: test/
human_gates:
  before_merge_main: true
  before_prod_deploy: true
  before_destructive_migration: true
EOF
echo -e "${GREEN}✓ project.config.yaml created${NC}"

# Generate agent config files if they don't exist
if [ ! -f "AGENTS.md" ]; then
    echo -e "${YELLOW}Generating AGENTS.md...${NC}"
    cat > AGENTS.md <<'EOF'
# AI Agents Configuration

## Default Agents

### Claude (analysis-lane, bug-lane, danger-lane)
- Model: claude-opus-4
- Role: Senior architect, debugging, refactoring
- Expertise: System design, dangerous refactors, bug diagnosis
- Scope: Read-first analysis, minimal safe changes

### Codex (feature-lane, docs-lane, test-lane)
- Model: gpt-4o
- Role: Feature implementation, documentation, testing
- Expertise: Feature development, code generation, test writing
- Scope: Feature work, safe refactors, documentation

## Lane Assignments

See `ai/project.config.yaml` for lane-to-agent mappings.

## Custom Agent Rules

- Always respect task isolation
- Read the codebase first, understand before changing
- Request explicit human approval for dangerous operations
- Document decisions in `decisions/` directory
- Propose followup tasks rather than goldplating
EOF
    echo -e "${GREEN}✓ AGENTS.md created${NC}"
fi

if [ ! -f "CLAUDE.md" ]; then
    echo -e "${YELLOW}Generating CLAUDE.md...${NC}"
    cat > CLAUDE.md <<'EOF'
# Claude Agent Instructions

Use Claude primarily for:
- repo analysis
- bug diagnosis
- dangerous refactors
- local integration work

Default behavior:
- read first, edit second
- prefer minimal safe changes
- respect task isolation
- if blocked, say exactly why
EOF
    echo -e "${GREEN}✓ CLAUDE.md created${NC}"
fi

if [ ! -f "GEMINI.md" ]; then
    echo -e "${YELLOW}Generating GEMINI.md...${NC}"
    cat > GEMINI.md <<'EOF'
# Gemini Agent Instructions

Use Gemini primarily for:
- feature development
- test writing
- documentation
- safe refactors

Default behavior:
- clear, verbose comments
- comprehensive error handling
- well-documented code
- prefer established patterns
EOF
    echo -e "${GREEN}✓ GEMINI.md created${NC}"
fi

# Generate .mcp.json if it doesn't exist
if [ ! -f ".mcp.json" ]; then
    echo -e "${YELLOW}Generating .mcp.json...${NC}"
    cat > .mcp.json <<'EOF'
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem", "."]
    }
  }
}
EOF
    echo -e "${GREEN}✓ .mcp.json created${NC}"
fi

# Create automation/.env.example
echo -e "${YELLOW}Creating automation/.env.example...${NC}"
cat > automation/.env.example <<'EOF'
# LLM Mode: "api" (uses API keys) or "app" (uses ChatGPT desktop app)
LLM_MODE=app

# Only needed in API mode:
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash

# Dashboard
PORT=3847
EOF
echo -e "${GREEN}✓ automation/.env.example created${NC}"

# Create automation/.env if it doesn't exist
if [ ! -f "automation/.env" ]; then
    echo -e "${YELLOW}Creating automation/.env...${NC}"
    cp automation/.env.example automation/.env
    echo -e "${GREEN}✓ automation/.env created${NC}"
fi

# Create automation/package.json if it doesn't exist
if [ ! -f "automation/package.json" ]; then
    echo -e "${YELLOW}Creating automation/package.json...${NC}"
    cat > automation/package.json <<'EOF'
{
  "name": "ai-flow-lab-automation",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "serve-dashboard": "node scripts/serve-dashboard.mjs",
    "new-task": "node scripts/new-task.mjs",
    "run-task": "node scripts/run-task.mjs",
    "close-task": "node scripts/close-task.mjs",
    "start-goal": "node scripts/start-goal.mjs"
  },
  "dependencies": {
    "express": "^4.18.2",
    "express-rate-limit": "^7.0.0",
    "yaml": "^2.3.4",
    "openai": "^4.28.0",
    "google-generative-ai": "^0.3.1"
  }
}
EOF
    echo -e "${GREEN}✓ automation/package.json created${NC}"
fi

# Install dependencies
if [ ! -d "automation/node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    cd automation
    npm install
    cd ..
    echo -e "${GREEN}✓ Dependencies installed${NC}"
fi

# Create doc templates if they don't exist
if [ ! -f "docs/DOMAIN_MODEL.md" ]; then
    echo -e "${YELLOW}Creating docs/DOMAIN_MODEL.md template...${NC}"
    cat > docs/DOMAIN_MODEL.md <<'EOF'
# DOMAIN MODEL

## Overview
This document defines the core entities, relationships, and rules that govern the ${PROJECT_NAME} domain.

## Entities

<!-- Define your core entities here -->

### Example Entity
An entity has:
- id: string (UUID)
- name: string
- created_at: timestamp
- updated_at: timestamp

## Rules

<!-- Define business rules here -->

### Example Rule
- Entity IDs must be globally unique.
- All entities must have a name.
- Timestamps are automatically managed.

## Relationships

<!-- Define how entities relate to each other -->

## Invariants

<!-- Define what must always be true -->
EOF
    echo -e "${GREEN}✓ docs/DOMAIN_MODEL.md created${NC}"
fi

if [ ! -f "docs/INVARIANTS.md" ]; then
    echo -e "${YELLOW}Creating docs/INVARIANTS.md template...${NC}"
    cat > docs/INVARIANTS.md <<'EOF'
# INVARIANTS

System invariants that must always hold true.

## Data Invariants

<!-- Define data constraints that must never be violated -->

### Example
- No entity can exist without a unique ID
- Foreign keys must always reference existing entities
- Timestamps must be monotonically increasing per entity

## Process Invariants

<!-- Define process guarantees -->

### Example
- Every task must start with explicit user approval
- Dangerous operations require human gates
- All decisions must be logged

## Consistency Rules

<!-- Define consistency guarantees -->

### Example
- Eventual consistency within 1 minute
- No orphaned references
- Cache invalidation within 5 minutes
EOF
    echo -e "${GREEN}✓ docs/INVARIANTS.md created${NC}"
fi

if [ ! -f "docs/ARCHITECTURE.md" ]; then
    echo -e "${YELLOW}Creating docs/ARCHITECTURE.md template...${NC}"
    cat > docs/ARCHITECTURE.md <<'EOF'
# ARCHITECTURE

High-level architecture of the ${PROJECT_NAME} system.

## System Diagram

```
[Describe your system architecture here]
```

## Components

### Component 1
- Purpose:
- Responsibilities:
- Dependencies:
- Interface:

## Data Flow

<!-- Describe how data flows through the system -->

## Deployment

<!-- Describe deployment topology -->

### Production
- Primary region:
- Failover region:
- Database:
- Cache:

## Performance Characteristics

- Latency SLA:
- Throughput:
- Scalability limits:

## Security Model

- Authentication:
- Authorization:
- Data encryption:
- Audit logging:
EOF
    echo -e "${GREEN}✓ docs/ARCHITECTURE.md created${NC}"
fi

# Summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ AI Flow Lab initialization complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Edit ${GREEN}ai/project.config.yaml${NC} to customize lanes and executors"
echo "2. Edit ${GREEN}docs/DOMAIN_MODEL.md${NC} to describe your domain"
echo "3. Edit ${GREEN}docs/INVARIANTS.md${NC} to define system constraints"
echo "4. Edit ${GREEN}docs/ARCHITECTURE.md${NC} to document your system"
echo ""
echo -e "${YELLOW}To start the dashboard:${NC}"
echo "  cd automation && npm run serve-dashboard"
echo ""
echo -e "${YELLOW}To create a new task:${NC}"
echo "  cd automation && npm run new-task"
echo ""
