export type TaskStatus = "open" | "done";

export type Task = {
  id: number;
  title: string;
  status: TaskStatus;
};

export function createTask(tasks: Task[], title: string): Task[] {
  const nextId =
    tasks.length === 0 ? 1 : Math.max(...tasks.map((t) => t.id)) + 1;

  const task: Task = {
    id: nextId,
    title,
    status: "open",
  };

  return [...tasks, task];
}

export function listTasks(tasks: Task[], status?: TaskStatus): Task[] {
  if (!status) return tasks;
  return tasks.filter((t) => t.status === status);
}

export function markDone(tasks: Task[], id: number): Task[] {
  if (!tasks.some((t) => t.id === id)) {
    throw new Error(`Task with id ${id} does not exist`);
  }
  return tasks.map((t) => (t.id === id ? { ...t, status: "done" } : t));
}
