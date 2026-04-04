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

  it("throws when marking a non-existing task done", () => {
    let tasks = [];
    tasks = createTask(tasks, "A");
    expect(() => markDone(tasks, 999)).toThrow("Task with id 999 does not exist");
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
