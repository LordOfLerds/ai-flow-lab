#!/usr/bin/env node
/**
 * project-registry.mjs — CRUD for ~/.aiflowlab/projects.json
 *
 * Manages the global project registry. Each project entry stores:
 *   - id:              slug (lowercase, hyphens)
 *   - name:            display name
 *   - path:            absolute path to project root
 *   - automation_path: absolute path to automation/ dir
 *   - added_at:        ISO timestamp
 *   - last_opened:     ISO timestamp
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const REGISTRY_DIR = path.join(os.homedir(), ".aiflowlab");
const REGISTRY_FILE = path.join(REGISTRY_DIR, "projects.json");

function ensureRegistryDir() {
  fs.mkdirSync(REGISTRY_DIR, { recursive: true });
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 64);
}

// ─── Read / Write ───

export function loadRegistry() {
  ensureRegistryDir();
  if (!fs.existsSync(REGISTRY_FILE)) {
    return { version: 1, active_project: null, projects: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_FILE, "utf8"));
  } catch (e) {
    console.error("[REGISTRY] Corrupt registry, resetting:", e.message);
    return { version: 1, active_project: null, projects: [] };
  }
}

export function saveRegistry(reg) {
  ensureRegistryDir();
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(reg, null, 2));
}

// ─── CRUD ───

export function listProjects() {
  return loadRegistry().projects;
}

export function getActiveProject() {
  const reg = loadRegistry();
  if (!reg.active_project) return reg.projects[0] || null;
  return reg.projects.find(p => p.id === reg.active_project) || reg.projects[0] || null;
}

export function addProject({ name, projectPath, automationPath }) {
  const reg = loadRegistry();
  const absPath = path.resolve(projectPath);
  const absAutoPath = automationPath
    ? path.resolve(automationPath)
    : path.join(absPath, "automation");

  // Check for duplicate path
  const existing = reg.projects.find(p => p.path === absPath);
  if (existing) {
    return { ok: false, error: `Project already registered: ${existing.name} (${existing.id})`, project: existing };
  }

  const id = slugify(name || path.basename(absPath));

  // Ensure unique ID
  let uniqueId = id;
  let counter = 2;
  while (reg.projects.some(p => p.id === uniqueId)) {
    uniqueId = `${id}-${counter++}`;
  }

  const project = {
    id: uniqueId,
    name: name || path.basename(absPath),
    path: absPath,
    automation_path: absAutoPath,
    added_at: new Date().toISOString(),
    last_opened: new Date().toISOString()
  };

  reg.projects.push(project);
  if (!reg.active_project) reg.active_project = uniqueId;
  saveRegistry(reg);

  return { ok: true, project };
}

export function switchProject(projectId) {
  const reg = loadRegistry();
  const project = reg.projects.find(p => p.id === projectId);
  if (!project) {
    return { ok: false, error: `Project not found: ${projectId}` };
  }

  reg.active_project = projectId;
  project.last_opened = new Date().toISOString();
  saveRegistry(reg);

  return { ok: true, project };
}

export function removeProject(projectId) {
  const reg = loadRegistry();
  const idx = reg.projects.findIndex(p => p.id === projectId);
  if (idx === -1) {
    return { ok: false, error: `Project not found: ${projectId}` };
  }

  const removed = reg.projects.splice(idx, 1)[0];
  if (reg.active_project === projectId) {
    reg.active_project = reg.projects[0]?.id || null;
  }
  saveRegistry(reg);

  return { ok: true, project: removed };
}

export function updateProject(projectId, updates) {
  const reg = loadRegistry();
  const project = reg.projects.find(p => p.id === projectId);
  if (!project) {
    return { ok: false, error: `Project not found: ${projectId}` };
  }

  if (updates.name) project.name = updates.name;
  if (updates.path) project.path = path.resolve(updates.path);
  if (updates.automation_path) project.automation_path = path.resolve(updates.automation_path);
  if (updates.chatgpt_chat_url !== undefined) project.chatgpt_chat_url = updates.chatgpt_chat_url;
  saveRegistry(reg);

  return { ok: true, project };
}

/**
 * Auto-register the current project if not already in the registry.
 * Called by serve-dashboard.mjs on startup.
 */
export function ensureCurrentProjectRegistered(repoRootPath, automationRootPath) {
  const reg = loadRegistry();
  const absPath = path.resolve(repoRootPath);
  const existing = reg.projects.find(p => p.path === absPath);

  if (existing) {
    // Update last_opened + set active
    existing.last_opened = new Date().toISOString();
    reg.active_project = existing.id;
    saveRegistry(reg);
    return existing;
  }

  // Auto-register
  const name = path.basename(absPath);
  const result = addProject({ name, projectPath: absPath, automationPath: automationRootPath });
  if (result.ok) {
    console.log(`[REGISTRY] Auto-registered project: ${result.project.name} (${result.project.id})`);
    return result.project;
  }
  return null;
}

// ─── CLI usage ───
if (process.argv[1] && process.argv[1].endsWith("project-registry.mjs")) {
  const [,, cmd, ...args] = process.argv;
  switch (cmd) {
    case "list":
      console.log(JSON.stringify(listProjects(), null, 2));
      break;
    case "active":
      console.log(JSON.stringify(getActiveProject(), null, 2));
      break;
    case "add":
      console.log(JSON.stringify(addProject({ name: args[0], projectPath: args[1] || "." }), null, 2));
      break;
    case "switch":
      console.log(JSON.stringify(switchProject(args[0]), null, 2));
      break;
    case "remove":
      console.log(JSON.stringify(removeProject(args[0]), null, 2));
      break;
    default:
      console.log("Usage: project-registry.mjs <list|active|add|switch|remove> [args]");
  }
}
