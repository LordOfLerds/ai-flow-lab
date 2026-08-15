---
type: document
created: 2026-04-10
tags: [ai-flow-lab, document]
---

# Multi-Project Design (Not Yet Implemented)

This document describes the planned architecture for supporting multiple projects in a single AI Flow Lab instance.

## Current State

Single project per instance:
- One state/ directory for all tasks, goals, proposals
- One automation/ directory with all scripts
- One git repo (repoRoot)
- One dashboard serving one project

## Planned State: Multi-Project

One server, multiple projects, isolated state:
- **state/**: Namespace by projectId
- **config/**: Per-project configuration
- **scripts/**: Shared or per-project (TBD)
- **dashboard**: Project switcher, cross-project views

## Namespace Concept

**projectId**: unique identifier (string, slug-safe). Examples: "game", "cli-tool", "api-service"

**State Isolation**:
```
state/
  {projectId}/
    tasks/
      T-0001.json
    goals/
      G-0001.json
    proposals/
      P-0001.json
    prompts-queue/
      T-0001.architect.prompt.md
    locks/
      task:T-0001
    usage-log/
      usage-log.jsonl
    errors/
      T-0001.errors.json
```

**Config Isolation**:
```
config/
  {projectId}/
    project.config.yaml
    pipeline.yaml (step order, custom steps)
    pricing.json (optional cost overrides)
    team.yaml (optional role-based access)
```

## Backward Compatibility

Planned migration path:
1. **v1.0 (current)**: single project, state/ at root
2. **v1.1**: soft migration to state/default/ (symlink old state/ → state/default/)
3. **v2.0**: require explicit projectId in all APIs, remove default/ symlink

**API Changes**:
```javascript
// Old API
GET /api/state  →  returns all tasks in default project

// New API
GET /api/projects  →  returns list of all projects
GET /api/projects/{projectId}/state  →  returns tasks in that project
POST /api/projects/{projectId}/tasks/{id}/retry  →  retry in that project
```

## Shared Resources

**Not namespaced** (shared across all projects):
- API keys (OPENAI_API_KEY, GEMINI_API_KEY, etc.)
- User settings (theme, notification preferences)
- Global cascade config (concurrency limit, max cascade cost, retry policy)
- Log aggregation (optional: track cross-project metrics)

**Environment Variables**:
```
# Per-project (optional)
PROJECT_ID=game
REPO_ROOT=/path/to/game-repo

# Global (shared)
OPENAI_API_KEY=...
GEMINI_API_KEY=...
PORT=3847
LOG_LEVEL=info
```

## Git Isolation

**Option A**: One repo per project
- Clean separation, no cross-project branch pollution
- More disk space
- Easier to delete/reset a project

**Option B**: Monorepo with path prefix
- Shared dependencies
- Single git log
- Shared commit history
- Branch naming: feature/game/T-0001 vs feature/api/T-0002

**Decision**: TBD based on team preference. Current implementation assumes one repo per project (Option A).

## Dashboard Changes

### Project Switcher
- Top-left dropdown: "Switch project" → list of all projects
- Or: global dashboard showing all projects (status, recent tasks, cost breakdown)
- Current project highlighted

### Cross-Project Views
- **Global Timeline**: cascade runs across all projects
- **Cost Dashboard**: total spend, per-project breakdown, alerts
- **Task Search**: search across all projects with projectId filter
- **Goal Progress**: view goals from multiple projects together

### Single-Project Views
- **Kanban**: tasks in current project only
- **Tree**: goal→task hierarchy for current project
- **Flow**: cascade timeline for current project

## Migration Plan

### Phase 1: Code Refactor (no UI changes)
1. Update getStateDir() to return state/{projectId}/
2. Update serve-dashboard.mjs to read PROJECT_ID env var (default "default")
3. Add projectId to all API endpoints (optional, defaults to current project)
4. Update all step scripts to use namespaced state/ paths
5. No breaking changes to API (optional projectId param)

### Phase 2: UI & Config
1. Add project switcher to dashboard
2. Implement project.config.yaml (YAML format)
3. Add UI for creating/deleting projects
4. Add project settings page (pipeline config, team, etc.)
5. Full backward compatibility (projectId=default)

### Phase 3: Advanced Features
1. Cross-project views and global metrics
2. Project templates (copy project config from template)
3. Multi-repo coordination (if Option B chosen)
4. Team/permission management per project

## Open Questions

1. **Cross-Project Dependencies**: Can task T-game-0001 depend on task T-api-0002? How do we handle this?
   - Option A: No cross-project deps (clean separation)
   - Option B: Allow deps, resolve during cascade (complex)
   - Option C: Manual dependency tracking (link in description)

2. **Shared Worktree Pool**: Can multiple projects share a worktree pool, or one per project?
   - Per-project is safer (no cross-project merge conflicts)
   - Shared could save disk space
   - Decision: per-project initially, shared pool as optimization later

3. **API Key Management**: Per-project API key overrides, or always global?
   - Global + optional per-project override (most flexible)
   - Per-project only (more complex, but cleaner for multi-tenant)
   - Decision: global primary, per-project override optional

4. **Database for Multi-Project**: Supabase with projectId as foreign key, or file-based + SQL migration?
   - SQLite: fast, local, no auth
   - Supabase: cloud, auth, real-time, scaling
   - Hybrid: local SQLite for dev, Supabase for production
   - Decision: TBD, depends on deployment model

## Schema: projects.json (Config)

```yaml
# config/game/project.config.yaml
project_id: game
project_name: "Pixel Game"
repo_root: /path/to/pixel-game-repo
description: "2D platformer with canvas"

# Cascade behavior
cascade:
  max_depth: 3
  max_budget: 1000
  timeout_per_step_ms: 900000

# Team
team:
  owner: alice@example.com
  members:
    - bob@example.com (viewer)
    - carol@example.com (editor)

# Optional: Custom steps
steps:
  - name: architect
    enabled: true
  - name: critique
    enabled: true
  - name: synthesize
    enabled: true
  - name: bootstrap
    enabled: true
  - name: execute
    enabled: true
  - name: test
    enabled: true
  - name: propose
    enabled: true
  - name: pr-draft
    enabled: true
```
