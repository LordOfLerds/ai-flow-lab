# INVARIANTS

- Task ids must be unique.
- `createTask` must not mutate prior task objects.
- `markDone` must only change the matching task.
- `listTasks(tasks, status)` must only return tasks with that exact status.
