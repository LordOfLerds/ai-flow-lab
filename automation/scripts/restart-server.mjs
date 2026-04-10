// Helper script: gracefully restart the server by exiting (assuming a process manager restarts it)
import { execSync } from "child_process";
try {
  // Find the serve-dashboard.mjs process and send it SIGUSR2 to trigger restart
  const pid = execSync("lsof -ti :3847", { encoding: "utf8" }).trim();
  if (pid) {
    console.log(`Server PID: ${pid}`);
    // Kill it gracefully - it should be restarted by whatever process manager is running
    process.kill(parseInt(pid), "SIGTERM");
    console.log("Server terminated. Please restart manually if no process manager.");
  }
} catch (e) {
  console.error("Could not find server process:", e.message);
}
