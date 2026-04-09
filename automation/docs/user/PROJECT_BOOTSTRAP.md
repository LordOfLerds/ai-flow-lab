# Project Bootstrap

When you connect a repository to AI Flow Lab, the **bootstrap process** analyzes your codebase and generates configuration, documentation, and workspace structure.

## Creating a New Project (Template Mode)

**Process:**

1. In dashboard: click **"New Project"** → select **"From Template"**
2. Choose a template:
   - Next.js + TypeScript + Jest
   - Python FastAPI + pytest
   - Node.js Express + Mocha
   - Go + testing package
   - (more templates being added)
3. Click **"Generate"**
4. System creates:
   - `project.config.yaml` with sensible defaults (feature lane: OpenAI architect, Gemini critic, Claude executor)
   - Directory structure: `src/`, `tests/`, `docs/`, `automation/`
   - Sample ARCHITECTURE.md, DOMAIN_MODEL.md, INVARIANTS.md
   - `.env.example` with required API key placeholders
   - First goal template ("Implement core feature")

**What gets created:**
- `/automation/docs/` — generated documentation
- `/.ai-flow-lab/` — hidden config and cache
- `/tests/` — test structure (if template includes)
- Root files: `project.config.yaml`, `.env.example`, `ARCHITECTURE.md`

## Connecting an Existing Repository

**Process:**

1. In dashboard: click **"New Project"** → select **"Connect Repo"**
2. Authorize GitHub OAuth (one-time)
3. Select repo from list
4. Click **"Auto-Analyze"**

**What the system does:**

### 1. Language & Structure Detection
Scans file types, counts lines of code per language, identifies:
- Language(s) in use (JavaScript, Python, Go, etc.)
- Framework(s) (React, FastAPI, Spring, etc.)
- Build tool (npm, pip, cargo, etc.)
- Test framework (Jest, pytest, unittest, etc.)

### 2. Dependency Analysis
Parses `package.json`, `requirements.txt`, `go.mod`, `Cargo.toml`, etc.
Reports: direct dependencies, dev dependencies, known vulnerabilities (via advisory APIs).

### 3. Documentation Generation
Creates (in `/automation/docs/`):
- **ARCHITECTURE.md**: High-level codebase structure, key modules, data flow
- **DOMAIN_MODEL.md**: Core entities, relationships, business logic
- **INVARIANTS.md**: Non-negotiable constraints (auth rules, rate limits, data consistency)

These are AI-generated and should be reviewed and edited by your team.

### 4. Configuration Setup
Generates `project.config.yaml` with:
- Detected language-specific executor routing
- Cascade limits (conservative: max_depth=2, max_followups_per_task=3)
- Lane overrides for your detected language/framework
- Example: Python projects default to `test: local` (pytest); Node defaults to `test: ci` (npm test)

Creates `.env.example` with placeholder keys.

## What Gets Changed vs. What's Preserved

**Added (never modifies existing):**
- `project.config.yaml` — new file
- `.env.example` — new file (not .env; that's git-ignored)
- `/automation/docs/` — new directory
- `/.ai-flow-lab/` — new hidden directory
- ARCHITECTURE.md, DOMAIN_MODEL.md, INVARIANTS.md in root (unless already exist)

**Not touched:**
- Existing source code
- Existing tests
- Existing git history
- Existing CI/CD pipelines (though integration hooks are planned)
- .gitignore (though we may suggest additions)

## First Steps After Bootstrap

1. **Review generated docs**
   - Edit ARCHITECTURE.md, DOMAIN_MODEL.md, INVARIANTS.md to match your mental model
   - Commit these as a baseline

2. **Customize project.config.yaml**
   - Adjust executor_routing if you have preferences
   - Set cascade_limits based on your risk tolerance
   - Add lane-specific rules

3. **Configure .env**
   - Copy .env.example → .env
   - Add your API keys
   - Add to .gitignore (already done by bootstrap)

4. **Create your first goal**
   - Go to dashboard → "New Goal"
   - Write a feature you want to build
   - Click "Run → Cascade"

## Planned Features

**Aktueller Stand (Current):**
- GitHub repo connection
- Auto-analysis and doc generation
- project.config.yaml generation

**Geplant (Planned):**
- **Issue/PR import**: Migrate existing GitHub issues/PRs into AI Flow Lab goals
- **GitLab/Gitea support**: Beyond GitHub
- **CI/CD integration hooks**: Auto-run AI Flow Lab pipeline on issue events
- **Team workspace setup**: Multi-user collaboration config, approval workflows
- **Custom analysis plugins**: Extend language detection and documentation generation
