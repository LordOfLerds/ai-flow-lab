import { createTask, listTasks, markDone } from "./tasks.js";

let tasks = [];
tasks = createTask(tasks, "Learn workflow");
tasks = createTask(tasks, "Test feature lane");
tasks = markDone(tasks, 1);

console.log("ALL", listTasks(tasks));
console.log("DONE", listTasks(tasks, "done"));
