# AI Flow Lab — Extract Project Context from ChatGPT Chat

You have been working on a project called **{{PROJECT_NAME}}** in a previous ChatGPT conversation. I need you to extract structured information so I can set up the AI Flow Lab automation pipeline for this project.

Please provide the following information in clearly separated sections:

---

## OUTPUT: PROJECT_SUMMARY

Give a 2-3 paragraph summary of what this project is, what it does, and what stage it's at. Include:
- Core purpose and target users
- Main features (implemented and planned)
- Current state (MVP, prototype, production, etc.)
- Key decisions already made

---

## OUTPUT: DOMAIN_MODEL.md

Based on everything we've discussed, write the domain model:
- All entities with attributes and types
- Relationships between entities
- Business rules and constraints
- Entity lifecycles

---

## OUTPUT: ARCHITECTURE.md

Based on our discussions, write the architecture:
- System components and how they connect
- Technology stack (what we decided on)
- Data flow
- API design
- Deployment approach

---

## OUTPUT: INVARIANTS.md

Based on our discussions, write the invariants:
- Data integrity rules
- Process guarantees
- Security requirements
- Performance expectations

---

## OUTPUT: OPEN_QUESTIONS

List any open questions, unresolved decisions, or areas where we haven't decided yet. Format as:
```
- QUESTION: <what needs to be decided>
  CONTEXT: <what we discussed so far>
  OPTIONS: <possible answers>
```

---

## OUTPUT: NEXT_STEPS

Based on where we left off, what are the logical next steps? Format as:
```
GOAL_TITLE: <title>
GOAL_DESCRIPTION: <description>
TASKS:
- <task title> | <lane: feature/analysis/docs/test/bug> | <description>
```

---

## Rules
- Reference our actual previous discussions
- Be specific — use the real names, technologies, and decisions we made
- If something was discussed but not decided, put it in OPEN_QUESTIONS
- Don't add new ideas — just capture what we already discussed
