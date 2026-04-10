# Implementation Plan V2

**Datum:** 2026-04-09
**Status:** GEPLANT — noch nicht umgesetzt
**Scope:** Pipeline-Fixes, Multi-Projekt-Support, Projekt-Import, bestehende Bug-Fixes

---

## Überblick

Zwei parallele Tracks mit klaren Phasen:

```
Track A: Stabilität & Bug-Fixes          Track B: Multi-Projekt & Import
──────────────────────────────────        ──────────────────────────────────
Phase 1: Pipeline-Reihenfolge fixen       Phase 1: Projekt-Registry + Selector
Phase 2: State Machine explizit machen    Phase 2: Auto-Import mit Claude CLI
Phase 3: Prompt-Optimierung               Phase 3: Dashboard Multi-Projekt-UI
Phase 4: Offene Bugs fixen                Phase 4: Projekt-Lifecycle
```

---

## Track A: Stabilität & Bug-Fixes

### Phase A1: Pipeline-Reihenfolge — Merge ans Ende

**Problem:** Task wird als MERGED markiert bevor follow-ups und pr-draft laufen. Wenn diese fehlschlagen, zeigt das Dashboard "MERGED + FAILED" — verwirrend. Goals werden zu früh als DONE markiert.

**Lösung:** Merge wird der letzte Pipeline-Schritt.

#### Neue Pipeline-Reihenfolge

```
NEU:  architect → critique → synthesize → execute → [test] → followups → pr-draft → MERGE
ALT:  architect → critique → synthesize → execute → [test] → MERGE → followups → pr-draft
```

#### Neue State Machine

```
NEW → ARCHITECTED → CRITIQUED → SYNTHESIZED → IMPLEMENTING → IMPLEMENTED
  → [COWORK_TESTING → TESTED / TEST_FAILED]
  → [BLOCKED_ON_DECISION]
  → FOLLOWUPS_PROPOSED → PR_DRAFTED → MERGED
```

#### Betroffene Dateien & Änderungen

**1. `serve-dashboard.mjs` — cascadeRunTask()**

```javascript
// ALT: stateAfterStep
const stateAfterStep = {
  'architect': 'ARCHITECTED',
  'critique': 'CRITIQUED',
  'synthesize': 'SYNTHESIZED',
  'execute': 'IMPLEMENTING',
  'merge': 'MERGED',                    // ← Merge in der Mitte
  'propose-followups': 'FOLLOWUPS_PROPOSED',
  'pr-draft': 'PR_DRAFTED'
};

// NEU: stateAfterStep
const stateAfterStep = {
  'architect': 'ARCHITECTED',
  'critique': 'CRITIQUED',
  'synthesize': 'SYNTHESIZED',
  'execute': 'IMPLEMENTING',
  'propose-followups': 'FOLLOWUPS_PROPOSED',
  'pr-draft': 'PR_DRAFTED',
  'merge': 'MERGED'                     // ← Merge am Ende
};
```

**2. `serve-dashboard.mjs` — STATE_TO_NEXT_STEP Map**

```javascript
// NEU
const STATE_TO_NEXT_STEP = {
  'NEW': 'architect',
  'ARCHITECTED': 'critique',
  'CRITIQUED': 'synthesize',
  'SYNTHESIZED': 'execute',
  'IMPLEMENTING': null,                  // execute läuft noch
  'IMPLEMENTED': 'propose-followups',    // ← direkt zu followups
  'EXECUTED': 'propose-followups',       // ← direkt zu followups
  'TESTED': 'propose-followups',         // ← nach Test → followups
  'COWORK_TESTING': null,                // test läuft
  'TEST_FAILED': 'execute',             // retry
  'BLOCKED_ON_DECISION': null,          // blocked
  'FOLLOWUPS_PROPOSED': 'pr-draft',
  'PR_DRAFTED': 'merge',               // ← NEU: nach pr-draft kommt merge
  'MERGED': null                        // terminal
};
```

**3. `serve-dashboard.mjs` — Pipeline-Step-Reihenfolge**

```javascript
// NEU: PIPELINE_STEPS Reihenfolge in cascadeRunTask
const PIPELINE_STEPS = [
  'architect', 'critique', 'synthesize', 'execute',
  'propose-followups', 'pr-draft', 'merge'  // ← merge am Ende
];
```

**4. `serve-dashboard.mjs` — Follow-up Spawning**

Follow-up Spawning muss NACH dem propose-followups Schritt passieren (nicht nach merge):

```javascript
// Nach propose-followups Schritt:
// 1. Parse proposals
// 2. Dedup-Check
// 3. Spawn neue Tasks
// 4. Weiter zu pr-draft
// 5. Dann merge
// 6. Rekursion für gespawnte Follow-ups
```

**5. `generate-pr-draft.mjs` — Guard-States anpassen**

```javascript
// ALT
const allowedStates = ["MERGED", "FOLLOWUPS_PROPOSED", "PR_DRAFTED", "REVIEWED"];

// NEU: PR-Draft wird VOR Merge generiert
const allowedStates = ["IMPLEMENTED", "EXECUTED", "TESTED",
                       "FOLLOWUPS_PROPOSED", "PR_DRAFTED",
                       "MERGED", "REVIEWED"];
```

**6. Dashboard UI — Pipeline-Visualisierung**

Pipeline-Flow im Dashboard muss die neue Reihenfolge reflektieren:

```javascript
// dashboard.html PIPELINE_STEPS
const PIPELINE_STEPS = [
  { name: 'architect',   label: 'Architect',   ai: 'openai' },
  { name: 'critique',    label: 'Critique',    ai: 'gemini' },
  { name: 'synthesize',  label: 'Synthesize',  ai: 'openai' },
  { name: 'execute',     label: 'Execute',     ai: 'auto' },
  { name: 'followups',   label: 'Follow-ups',  ai: 'openai' },
  { name: 'pr-draft',    label: 'PR Draft',    ai: 'local' },
  { name: 'merge',       label: 'Merge',       ai: 'git' }
];
```

**7. Goal-Completion prüft PR_DRAFTED oder MERGED**

```javascript
// ALT
const allDone = allTasks.every(t => t.state === 'PR_DRAFTED' || t.state === 'MERGED');

// NEU: nur MERGED ist wirklich fertig
const allDone = allTasks.every(t => t.state === 'MERGED');
```

#### Follow-up Spawn Timing (wichtig!)

Follow-ups werden VOR dem Merge *generiert* (Proposals geschrieben), aber erst NACH erfolgreichem Merge *gespawnt* (als neue Tasks in die Queue). Grund:

- Follow-up-Info steht im PR-Draft (gut für Review)
- Aber: wenn Merge fehlschlägt (Conflict), werden keine Tasks für Code gespawnt der nie auf main kam
- Spawning-Logik bleibt am Ende von cascadeRunTask(), NACH dem Merge-Step

```
execute → [test] → followups (generate proposals) → pr-draft → MERGE → spawn follow-up tasks
                                                                          ↑ nur wenn merge OK
```

#### Edge Cases

- **Retry aus FOLLOWUPS_PROPOSED:** Muss bei followups weitermachen (nicht bei merge)
- **Docs-Lane Tasks:** Kein Merge nötig → können bei PR_DRAFTED als "fertig" gelten
- **Follow-up Fehler:** Non-blocking. propose-followups fehlschlägt → Warning loggen, State trotzdem auf FOLLOWUPS_PROPOSED → weiter zu pr-draft → weiter zu merge. Es gibt nur 0 Follow-ups statt N.
- **PR-Draft Fehler:** Pipeline stoppt. Task bleibt FOLLOWUPS_PROPOSED mit runtime_status=FAILED. Merge passiert nicht.
- **Merge-Conflict:** Follow-ups wurden generiert aber nicht gespawnt. User muss Conflict lösen, dann retry → merge → spawn.
- **Bereits MERGED Tasks:** Migration: Bestehende MERGED Tasks bleiben MERGED. Kein Downgrade.

#### Migrationsstrategie

1. Neue State-Map deployen
2. Bestehende MERGED Tasks: kein Change (grandfathered)
3. Neue Tasks folgen neuer Reihenfolge
4. STATE_TO_NEXT_STEP erkennt beide Flows (alt + neu) für Übergangszeit

---

### Phase A2: Explizite State Machine

**Problem:** State Transitions sind über cascadeRunTask(), Step-Scripts und Retry-Logik verstreut. Kein zentraler Ort der alle gültigen Transitions definiert.

**Lösung:** Zentrale State Machine Definition.

#### Design

```javascript
// automation/scripts/state-machine.mjs (NEU)
export const STATE_MACHINE = {
  NEW:                 { next: ['ARCHITECTED'],          onError: 'NEW',                 step: 'architect' },
  ARCHITECTED:         { next: ['CRITIQUED'],            onError: 'ARCHITECTED',         step: 'critique' },
  CRITIQUED:           { next: ['SYNTHESIZED'],          onError: 'CRITIQUED',           step: 'synthesize' },
  SYNTHESIZED:         { next: ['IMPLEMENTING'],         onError: 'SYNTHESIZED',         step: 'execute' },
  IMPLEMENTING:        { next: ['IMPLEMENTED'],          onError: 'IMPLEMENTING',        step: null },
  IMPLEMENTED:         { next: ['FOLLOWUPS_PROPOSED', 'COWORK_TESTING', 'BLOCKED_ON_DECISION'],
                                                         onError: 'IMPLEMENTED',         step: 'propose-followups' },
  COWORK_TESTING:      { next: ['TESTED', 'TEST_FAILED'], onError: 'COWORK_TESTING',    step: null },
  TESTED:              { next: ['FOLLOWUPS_PROPOSED'],   onError: 'TESTED',              step: 'propose-followups' },
  TEST_FAILED:         { next: ['IMPLEMENTING'],         onError: 'TEST_FAILED',         step: 'execute' },
  BLOCKED_ON_DECISION: { next: ['IMPLEMENTED', 'COWORK_TESTING', 'IMPLEMENTING'],
                                                         onError: null,                  step: null },
  FOLLOWUPS_PROPOSED:  { next: ['PR_DRAFTED'],           onError: 'FOLLOWUPS_PROPOSED',  step: 'pr-draft' },
  PR_DRAFTED:          { next: ['MERGED'],               onError: 'PR_DRAFTED',          step: 'merge' },
  MERGED:              { next: [],                       onError: null,                  step: null }
};

export function isValidTransition(from, to) {
  return STATE_MACHINE[from]?.next.includes(to) ?? false;
}

export function getStepForState(state) {
  return STATE_MACHINE[state]?.step ?? null;
}

export function getErrorRecoveryState(state) {
  return STATE_MACHINE[state]?.onError ?? state;
}

export function isTerminal(state) {
  return (STATE_MACHINE[state]?.next.length ?? 0) === 0;
}
```

#### Integration

- `cascadeRunTask()` importiert State Machine und validiert jede Transition
- `saveTask()` prüft `isValidTransition(oldState, newState)` vor dem Schreiben
- Dashboard nutzt `STATE_MACHINE` für Pipeline-Visualisierung
- Retry nutzt `getErrorRecoveryState()` statt eigener Logik

---

### Phase A3: Prompt-Optimierung

Bereits teilweise umgesetzt (Synthesize + Followups Token-Sparung). Verbleibend:

1. **Architect:** Code-Context auf relevante Files begrenzen (wenn task.description File-Targets enthält)
2. **Critique:** ✅ Acceptance Criteria Review bereits hinzugefügt
3. **Follow-ups:** ✅ Tolerante Regex + Format-Rule bereits implementiert
4. **Follow-ups:** ✅ Artefakt-Truncation bereits implementiert
5. **Synthesize:** ✅ Truth-Files bereits entfernt

Verbleibt:
- Architect: `discoverSourceContext()` intelligent begrenzen basierend auf Lane-Type
  - docs-lane: kein Code-Context
  - bug-lane: nur betroffene Files
  - feature-lane: relevante Files + Nachbarn

---

### Phase A4: Offene Bugs fixen

| Bug | Fix | Aufwand |
|-----|-----|---------|
| BUG-005: Keine Concurrency-Limits | Task-Queue mit `max_parallel_tasks` Config | Mittel |
| BUG-007: Kein Rollback für Bad Merges | `git revert` + Task-Reset + Audit Trail | Mittel |
| BUG-008: Score reset bei Game Restart | `gs.score = 0` vor ScoreTracker.reset() | Klein |
| BUG-009: Cosmetic FAILED runtime_status | runtime_status=IDLE nach MERGED setzen | Klein |
| BUG-013: Duplicate Task IDs | Atomic Counter File + Mutex | Klein |

---

## Track B: Multi-Projekt & Import

### Phase B1: Projekt-Registry + Selector

#### Design: `~/.aiflowlab/projects.json`

```json
{
  "version": 1,
  "active_project": "pixel-runner",
  "projects": [
    {
      "id": "pixel-runner",
      "name": "Pixel Runner",
      "path": "/Users/luca/Dev/pixel-runner",
      "automation_path": "/Users/luca/Dev/pixel-runner/automation",
      "added_at": "2026-04-09T10:00:00Z",
      "last_opened": "2026-04-09T14:00:00Z"
    },
    {
      "id": "my-saas",
      "name": "My SaaS App",
      "path": "/Users/luca/Dev/my-saas",
      "automation_path": "/Users/luca/Dev/my-saas/automation",
      "added_at": "2026-04-10T09:00:00Z",
      "last_opened": "2026-04-10T09:00:00Z"
    }
  ]
}
```

#### Server-Änderungen (`serve-dashboard.mjs`)

```javascript
// Neue Endpoints
GET  /api/projects           → Liste aller Projekte aus Registry
POST /api/projects/add       → Neues Projekt hinzufügen (path, name)
POST /api/projects/switch    → Aktives Projekt wechseln (projectId)
POST /api/projects/remove    → Projekt aus Registry entfernen (nicht vom Disk)
GET  /api/projects/active    → Aktuelles aktives Projekt

// Server-Verhalten bei Switch:
// 1. Speichere aktives Projekt in Registry
// 2. Aktualisiere repoRoot() und automationRoot() im Speicher
// 3. Lade State (tasks, goals, proposals) neu vom neuen Projekt-Pfad
// 4. Sende WebSocket-Event "project-switched" ans Dashboard
// 5. KEIN Server-Neustart nötig
```

#### Dashboard-UI

```
┌──────────────────────────────────────────────────────────┐
│  [🔽 Pixel Runner ▾]  Flow │ Goals │ Docs │ Decisions   │
│                                                          │
│  ┌─────────────────────┐                                 │
│  │ Pixel Runner    ✓   │  ← Dropdown mit allen Projekten │
│  │ My SaaS App         │                                 │
│  │ ─────────────────── │                                 │
│  │ + Add Project       │  ← Öffnet Modal                │
│  │ ⬇ Import Project    │  ← Startet Import-Wizard       │
│  └─────────────────────┘                                 │
└──────────────────────────────────────────────────────────┘
```

#### "Add Project" Modal

```
┌─── Add Project ───────────────────────────────┐
│                                               │
│  Name:  [________________________]            │
│  Path:  [/Users/luca/Dev/my-app ]  [Browse]   │
│                                               │
│  ○ Existing repo (already has automation/)    │
│  ○ New project (create automation/ scaffold)  │
│  ○ Import & analyze (run full import wizard)  │
│                                               │
│              [Cancel]  [Add Project]          │
└───────────────────────────────────────────────┘
```

#### Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `serve-dashboard.mjs` | 5 neue Endpoints, `repoRoot()` dynamisch, State-Reload-Funktion |
| `dashboard.html` | Projekt-Selector Dropdown, Add/Import Modals |
| `_llm-utils.mjs` | `repoRoot()` und `automationRoot()` als veränderbare Variable statt `process.cwd()` |
| NEU: `project-registry.mjs` | CRUD für `~/.aiflowlab/projects.json` |

---

### Phase B2: Auto-Import mit Claude CLI

**Problem:** Aktueller Import generiert nur einen Prompt den der User manuell in ChatGPT pasten muss. Umständlich, fehleranfällig, dauert lang.

**Lösung:** Claude CLI mit Tools (Read/Glob/Grep) analysiert das Repo direkt und generiert die Docs.

#### Workflow

```
User klickt "Import Project" → Pfad eingeben
  ↓
1. analyze-codebase.mjs läuft (bereits vorhanden)
   → Erkennt Technologien, Package.json, Dir-Tree, Git-Info
  ↓
2. Claude CLI Call mit Tools
   → Prompt: "Du bist Software-Architekt. Analysiere dieses Repo."
   → Tools: Read, Glob, Grep (Claude liest die Files selbst)
   → Budget: $3.00 max
   → Output: Strukturierter Markdown mit ## OUTPUT: Sektionen
  ↓
3. Response parsen (parseBootstrapResponse — bereits vorhanden)
   → DOMAIN_MODEL.md, ARCHITECTURE.md, INVARIANTS.md, AGENTS.md
  ↓
4. project.config.yaml generieren
   → truth_sources basierend auf gefundenen Docs
   → executor_routing Defaults
  ↓
5. Projekt in Registry eintragen
   → ~/.aiflowlab/projects.json aktualisieren
  ↓
6. Optional: First Goal + Tasks vorschlagen
   → Claude schlägt basierend auf Analyse initiale Tasks vor
```

#### Claude CLI Invocation

```javascript
// import-with-claude.mjs (NEU)
async function importWithClaude(projectPath) {
  const prompt = `You are a senior software architect. Analyze this project.
  
Use your Read, Glob, and Grep tools to explore the codebase at: ${projectPath}

Steps:
1. Glob for source files to understand project structure
2. Read key files (README, package.json, main entry points)
3. Grep for patterns (API routes, database models, test files)
4. Generate structured documentation

Output EXACTLY these sections:

## OUTPUT: DOMAIN_MODEL
(Entities, relationships, business rules found in code)

## OUTPUT: ARCHITECTURE  
(Layers, components, data flow, tech stack)

## OUTPUT: INVARIANTS
(Rules that must never be broken, constraints, validations found)

## OUTPUT: AGENTS
(Which AI agent should handle which part: Claude for X, OpenAI for Y)

## OUTPUT: FIRST_GOAL
GOAL_TITLE: <suggested first goal>
GOAL_DESCRIPTION: <what to achieve>
- <task title> | <lane> | <description>
- <task title> | <lane> | <description>

## OUTPUT: PROJECT_SUMMARY
(1-paragraph summary of the project)`;

  const result = execFileAsync('claude', [
    '--print',
    '--model', 'claude-sonnet-4-20250514',
    '--output-format', 'json',
    '--allowed-tools', 'Read,Glob,Grep',
    '--permission-mode', 'acceptEdits',
    '--max-budget-usd', '3.00'
  ], { input: prompt, cwd: projectPath, timeout: 300000 });
  
  return result;
}
```

#### Fallback

Wenn Claude CLI nicht verfügbar (kein OAuth, alte Version): Automatisch auf alten Prompt-Queue-Workflow zurückfallen (ChatGPT manuell).

---

### Phase B3: Dashboard Multi-Projekt-UI

#### Änderungen am Dashboard

1. **Header:** Projekt-Name + Dropdown-Selector (immer sichtbar)
2. **State-Isolation:** Jedes Projekt hat eigenen State (tasks, goals, proposals)
3. **Switch-Animation:** Kurzer Loading-State beim Wechsel (State wird neu geladen)
4. **URL-Routing:** `?project=pixel-runner` in URL für Deep-Linking
5. **Keyboard-Shortcut:** `Cmd+K` → Projekt-Suche (wie Spotlight)

#### WebSocket für Live-Updates

```javascript
// Server sendet bei Switch:
ws.send(JSON.stringify({ 
  type: 'project-switched', 
  project: { id, name, path } 
}));

// Dashboard reagiert:
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'project-switched') {
    clearDashboard();
    loadProjectState(msg.project.id);
  }
};
```

---

### Phase B4: Projekt-Lifecycle

1. **Archive Project:** Projekt aus aktiver Liste entfernen (bleibt auf Disk)
2. **Delete Project State:** automation/state/ löschen (Repo bleibt)
3. **Export Project:** State als ZIP exportieren (für Backup/Transfer)
4. **Clone Project Config:** Config von einem Projekt auf ein anderes kopieren

---

## Implementierungsreihenfolge (beide Tracks)

```
Woche 1:
  A1: Pipeline-Reihenfolge umbauen (Merge ans Ende)
  B1: project-registry.mjs + ~/.aiflowlab/projects.json

Woche 2:
  A2: state-machine.mjs erstellen + integrieren
  B1: Server-Endpoints für Projekt-CRUD
  B1: Dashboard Projekt-Selector UI

Woche 3:
  B2: import-with-claude.mjs + Claude CLI Integration
  B2: Dashboard Import-Wizard UI
  A4: Kleine Bugs fixen (BUG-008, BUG-009, BUG-013)

Woche 4:
  A3: Prompt-Optimierung (Architect Code-Context)
  B3: Multi-Projekt Dashboard polish
  A4: Größere Bugs (BUG-005 Concurrency, BUG-007 Rollback)

Woche 5:
  B4: Projekt-Lifecycle (Archive, Export)
  Integration Testing über alle Änderungen
```

---

## Risiken & Mitigationen

| Risiko | Impact | Mitigation |
|--------|--------|------------|
| Pipeline-Umbau bricht bestehende Tasks | Hoch | Migration: alte MERGED Tasks grandfathered. STATE_TO_NEXT_STEP erkennt beide Flows |
| Multi-Projekt State-Isolation | Mittel | Jedes Projekt hat eigenen state/ Ordner. Server lädt nur aktives Projekt |
| Claude CLI Import-Qualität | Niedrig | Fallback auf manuellen Prompt-Queue. User kann Docs immer manuell editieren |
| `repoRoot()` dynamisch | Mittel | Alle `repoRoot()`-Aufrufe auditieren. Race Conditions bei Switch verhindern |

---

## Dateien die erstellt/geändert werden müssen

### Neue Dateien

| Datei | Beschreibung |
|-------|-------------|
| `automation/scripts/state-machine.mjs` | Zentrale State Machine Definition |
| `automation/scripts/project-registry.mjs` | CRUD für ~/.aiflowlab/projects.json |
| `automation/scripts/import-with-claude.mjs` | Auto-Import via Claude CLI |

### Geänderte Dateien

| Datei | Änderungen |
|-------|-----------|
| `serve-dashboard.mjs` | Pipeline-Reihenfolge, State Machine Import, 5 Projekt-Endpoints, repoRoot dynamisch |
| `dashboard.html` | Projekt-Selector, Pipeline-Steps-Reihenfolge, Add/Import Modals |
| `_llm-utils.mjs` | repoRoot/automationRoot als Setter-Funktionen |
| `generate-pr-draft.mjs` | Guard-States erweitern (IMPLEMENTED, TESTED, etc.) |
| `init-project.mjs` | ✅ Bereits gefixt (git init + project.config.yaml) |
| `propose-followups-api.mjs` | ✅ Bereits gefixt (tolerante Regex + Token-Sparung) |
| `synthesize-task-api.mjs` | ✅ Bereits gefixt (Truth-Files entfernt) |
| `critique-task-api.mjs` | ✅ Bereits gefixt (Acceptance Criteria Review) |

---

## Was NICHT in diesem Plan ist

- SQLite/DB Migration (v2.0)
- Parallelism/Worker Pool (v2.0)
- Configurable Pipeline (pipeline.yaml) (v2.0)
- Prompt Templates (prompts.yaml) (v2.0)
- Visual UI Testing (Phase 5) (v2.0)
- Dashboard Usage Visualization (v2.0)
- Budget Enforcement (v2.0)
- Rate Limiting (v2.0)
