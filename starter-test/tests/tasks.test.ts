import { describe, expect, it } from "vitest";
import { createTask, listTasks, markDone } from "../src/tasks.js";

describe("tasks", () => {
  it("creates tasks", () => {
    let tasks = [];
    tasks = createTask(tasks, "A");
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe("A");
    expect(tasks[0].status).toBe("open");
  });

  it("marks a task done", () => {
    let tasks = [];
    tasks = createTask(tasks, "A");
    tasks = markDone(tasks, 1);
    expect(tasks[0].status).toBe("done");
  });

  it("filters done tasks", () => {
    let tasks = [];
    tasks = createTask(tasks, "A");
    tasks = createTask(tasks, "B");
    tasks = markDone(tasks, 1);

    const done = listTasks(tasks, "done");
    expect(done).toHaveLength(1);
    expect(done[0].id).toBe(1);
  });
});
