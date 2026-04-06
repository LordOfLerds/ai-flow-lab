# AI Flow Lab — New Project Bootstrap

You are setting up a new AI-assisted development project called **{{PROJECT_NAME}}**.

## Project Description
{{PROJECT_DESCRIPTION}}

## Your Task

Generate the foundational documentation for this project. Output each document as a clearly separated section using the exact headers below. Be specific to THIS project — do not use generic placeholder text.

---

## OUTPUT: DOMAIN_MODEL.md

Write a domain model for {{PROJECT_NAME}}. Include:
- All core entities with their attributes, types, and constraints
- Relationships between entities (1:1, 1:N, M:N)
- Business rules that govern entity behavior
- Entity lifecycle states and transitions
- Key invariants per entity

Think deeply about what entities this project needs. Be concrete — use real attribute names, real types, real constraints.

---

## OUTPUT: ARCHITECTURE.md

Write an architecture document for {{PROJECT_NAME}}. Include:
- System overview (what components exist, how they connect)
- Technology stack recommendations (language, framework, database, etc.)
- Data flow (how data moves through the system)
- API design (REST/GraphQL, key endpoints)
- Deployment topology (dev, staging, prod)
- Security model (auth, authorization, data encryption)
- Performance characteristics and SLAs

---

## OUTPUT: INVARIANTS.md

Write system invariants for {{PROJECT_NAME}}. Include:
- Data integrity invariants (what must always be true in the database)
- Process invariants (what must always hold during operations)
- Consistency rules (eventual consistency, cache invalidation)
- Security invariants (auth requirements, access control)
- Performance invariants (latency, throughput guarantees)

---

## OUTPUT: AGENTS.md

Write an AI agents configuration for {{PROJECT_NAME}}. Define:
- Which AI agents handle which types of tasks
- Lane assignments (analysis, bug, feature, danger, docs, test)
- Specific rules for this project's domain
- What agents should watch out for in this codebase
- Human gate requirements specific to this project

---

## OUTPUT: FIRST_GOAL

Propose an initial goal for the project. Format as:
```
GOAL_TITLE: <title>
GOAL_DESCRIPTION: <description>
TASKS:
- <task 1 title> | <lane: feature/analysis/docs/test> | <description>
- <task 2 title> | <lane> | <description>
- <task 3 title> | <lane> | <description>
```

The goal should be the logical first step for this project (e.g., "Set up project foundation" or "Build core data model").

---

## Rules
- Be specific to {{PROJECT_NAME}}, not generic
- Use real entity names, real attribute names, real technology choices
- Think about edge cases and failure modes
- Keep each document focused and actionable
- Use markdown formatting consistently
