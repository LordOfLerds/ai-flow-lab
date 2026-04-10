#!/usr/bin/env node
// Self-restart: kill the parent server and restart it
import { exec, execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverScript = path.join(__dirname, "serve-dashboard.mjs");

// Spawn a detached process that waits 1s then starts the server again
const restartCmd = `sleep 1 && cd "${path.join(__dirname, "..")}" && node scripts/serve-dashboard.mjs &`;

console.log("Scheduling server restart...");
const child = exec(restartCmd, { detached: true, stdio: 'ignore' });
child.unref();

// Now kill the current server
setTimeout(() => {
  try {
    const pid = execSync("lsof -ti :3847", { encoding: "utf8" }).trim();
    if (pid) {
      console.log(`Killing server PID: ${pid}`);
      process.kill(parseInt(pid.split('\n')[0]), "SIGTERM");
    }
  } catch (e) {
    console.log("Server may have already exited");
  }
}, 500);
