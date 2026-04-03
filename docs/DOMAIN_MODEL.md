# DOMAIN MODEL

## Entities

### Task
A Task has:
- id: integer
- title: string
- status: "open" | "done"

## Rules
- Task ids should be unique.
- A newly created task must start with status "open".
- Only existing tasks can be marked done.
