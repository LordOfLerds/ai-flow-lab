# AI Flow Lab — Import Existing Project

You are analyzing an existing codebase to set up AI-assisted development with AI Flow Lab.

## Project Name
{{PROJECT_NAME}}

## Codebase Analysis

### Directory Structure
```
{{DIRECTORY_TREE}}
```

### Detected Technologies
{{DETECTED_TECH}}

### Package Info
```
{{PACKAGE_INFO}}
```

### Existing Documentation
{{EXISTING_DOCS}}

### Git Info
- Branches: {{GIT_BRANCHES}}
- Recent commits: {{RECENT_COMMITS}}
- Contributors: {{CONTRIBUTORS}}

### Key Source Files (samples)
{{SOURCE_SAMPLES}}

---

## Your Task

Based on this codebase analysis, generate the foundational AI Flow Lab documentation. Output each document as a clearly separated section using the exact headers below. Make everything SPECIFIC to what you see in the actual code.

---

## OUTPUT: DOMAIN_MODEL.md

Reverse-engineer the domain model from the codebase. Include:
- All entities you can identify from models/schemas/types/classes
- Their attributes with actual types from the code
- Relationships you can infer from foreign keys, references, imports
- Business rules visible in validation logic, guards, constraints
- Entity lifecycle states visible in enums, status fields, state machines

---

## OUTPUT: ARCHITECTURE.md

Document the actual architecture you see. Include:
- System components (what directories/modules exist and their purpose)
- Actual technology stack (from package.json, imports, config files)
- Data flow (how requests flow through the system)
- API structure (actual routes, controllers, handlers you found)
- Deployment setup (from Dockerfile, CI config, deploy scripts)
- Security model (auth middleware, access control patterns you see)

---

## OUTPUT: INVARIANTS.md

Infer system invariants from the code. Include:
- Data constraints visible in schemas, validations, database migrations
- Process invariants from middleware, guards, transaction patterns
- Consistency rules from cache usage, event handling, async patterns
- Security invariants from auth checks, role guards, input sanitization
- Performance patterns from rate limiting, pagination, caching

---

## OUTPUT: AGENTS.md

Configure AI agents for this specific codebase. Define:
- Lane assignments based on the project's complexity and patterns
- What agents should know about this specific codebase
- Risky areas that need danger-lane treatment
- Testing patterns already established
- Documentation style to match existing docs

---

## OUTPUT: FIRST_GOAL

Propose an initial goal based on what you see needs improvement. Format:
```
GOAL_TITLE: <title>
GOAL_DESCRIPTION: <description>
TASKS:
- <task 1 title> | <lane: feature/analysis/docs/test/bug> | <description>
- <task 2 title> | <lane> | <description>
- <task 3 title> | <lane> | <description>
```

Base this on real issues: missing tests, outdated docs, known TODOs, architectural debt, etc.

---

## Rules
- Reference ACTUAL file paths, class names, and patterns from the analysis
- Don't invent things that aren't in the code
- If you can't determine something, say "needs investigation" rather than guessing
- Prioritize accuracy over completeness
