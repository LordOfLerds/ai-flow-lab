# AI Flow Lab — Deep Audit Report

**Datum:** 2026-04-09
**Scope:** Follow-up Parsing, Task-Completion-Logik, Prompt-Review, Git-Operationen, Projekt-Import, fehlende Features

---

## 1. Follow-up Regex & ChatGPT-Format-Problem

### Das Problem

ChatGPT verwendet bei Copy-Paste fast nie das exakte `### F-1` Format. Stattdessen gibt es typische Varianten:

- `**F-1:**` (bold statt heading)
- `1. **F-1**: Title` (numbered list)
- `#### F-1: Title` (4 statt 3 `#`)
- `F-1:` (kein heading, plain text)
- Markdown mit `---` Trennern die den Block-End-Regex stören

### Aktuelle Regex (propose-followups-api.mjs:231)

```regex
/###\s+(F-\d+)[^\r\n]*\r?\n([\s\S]*?)(?=\r?\n###\s+F-\d+|\r?\n##\s|$)/g
```

Diese Regex matcht NUR `### F-N` (exakt 3 `#`). Alles andere → 0 Matches → Fehler.

### Fix: Tolerantere Regex + Fallback-Parser

**Empfehlung:** Multi-Pattern-Matching mit Fallback-Kette:

```javascript
// Primary: exact ### F-N
const primary = [...md.matchAll(/###\s+(F-\d+)[^\r\n]*\r?\n([\s\S]*?)(?=\r?\n###\s+F-\d+|\r?\n##\s|$)/g)];

// Fallback 1: #### F-N (4 hashes)
const fb1 = [...md.matchAll(/####\s+(F-\d+)[^\r\n]*\r?\n([\s\S]*?)(?=\r?\n####\s+F-\d+|\r?\n##\s|$)/g)];

// Fallback 2: **F-N** or **F-N:** (bold format, ChatGPT favorite)
const fb2 = [...md.matchAll(/\*\*\s*(F-\d+)\s*\*\*:?[^\r\n]*\r?\n([\s\S]*?)(?=\r?\n\*\*\s*F-\d+|\r?\n##\s|$)/g)];

// Fallback 3: numbered list "1. F-1:" or "- F-1:"
const fb3 = [...md.matchAll(/(?:^|\n)[-\d.]+\s*(F-\d+):?\s*[^\r\n]*\r?\n([\s\S]*?)(?=\r?\n[-\d.]+\s*F-\d+|\r?\n##\s|$)/g)];

const candidateBlocks = primary.length > 0 ? primary
  : fb1.length > 0 ? fb1
  : fb2.length > 0 ? fb2
  : fb3;
```

### Prompt-Verbesserung (doppelt absichern)

Im `instructions`-Block von propose-followups-api.mjs expliziter machen:

```
FORMAT RULE (CRITICAL — parse failure if violated):
Each follow-up MUST start with a Markdown H3 heading in EXACTLY this format:
### F-1
### F-2
(three hash marks, space, F-<number>, nothing else on the heading line)

Do NOT use bold (**F-1**), do NOT use ####, do NOT use numbered lists.
The parser expects EXACTLY "### F-N" at the start of a line.
```

**Priorität:** HOCH — das ist der häufigste Fehlerfall im APP-Mode.

---

## 2. Task-Completion-Logik — Zu früh "fertig"

### Das Problem

Die Pipeline-Reihenfolge im Code (serve-dashboard.mjs cascadeRunTask) ist:

```
architect → critique → synthesize → execute → MERGE → propose-followups → pr-draft
```

**Merge passiert VOR follow-ups und pr-draft!** Das heißt:

1. Task wird auf `state=MERGED` gesetzt (Zeile ~2409)
2. Dann erst laufen propose-followups und pr-draft
3. Wenn follow-ups oder pr-draft fehlschlagen:
   - `runtime_status` wird FAILED
   - `state` bleibt MERGED
   - Dashboard zeigt "MERGED" + "FAILED" gleichzeitig — verwirrend

### Warum das schlecht ist

- User denkt "fertig" wenn er MERGED sieht
- Follow-ups werden nie spawned wenn propose-followups fehlschlägt
- PR-Draft existiert nicht, aber Task gilt als "complete"
- Goal-Completion prüft `state === 'MERGED'` → Goal wird zu früh "DONE"

### Fix-Vorschlag: Merge an das Ende verschieben

Die richtige Reihenfolge wäre:

```
architect → critique → synthesize → execute → [test] → propose-followups → pr-draft → MERGE
```

**Aber:** Das ist ein großer Refactor (State Machine, PIPELINE.md, STATE_TO_NEXT_STEP Map). Minimalerer Fix:

**Option A (minimal):** Neuer State `PIPELINE_COMPLETE` nach pr-draft. MERGED wird erst nach pr-draft gesetzt:

```javascript
const stateAfterStep = {
  'architect': 'ARCHITECTED',
  'critique': 'CRITIQUED',
  'synthesize': 'SYNTHESIZED',
  'execute': 'IMPLEMENTING',
  'merge': 'CODE_MERGED',        // ← Neuer Zwischenstatus
  'propose-followups': 'FOLLOWUPS_PROPOSED',
  'pr-draft': 'PR_DRAFTED'       // ← Das ist der echte "fertig"-Status
};
```

**Option B (empfohlen):** Pipeline-Reihenfolge umstellen:
- execute → propose-followups → pr-draft → merge (merge wird letzter Schritt)
- Task ist erst `MERGED` wenn ALLES durch ist
- Erfordert Anpassungen in STATE_TO_NEXT_STEP und cascadeRunTask

**Priorität:** MITTEL — verursacht keine Datenverluste, aber führt zu verwirrenden Dashboard-Anzeigen.

---

## 3. Prompt-Ketten Review

### 3.1 Architect-Prompt

**Gut:**
- Klare Anweisung "Return ONLY markdown"
- Explizite Sektionsvorgaben
- Truth-Files und Code-Context injiziert

**Probleme:**
- `discoverSourceContext(10, 60)` kann 80KB Context injizieren → Token-intensiv
- Keine Begrenzung der Code-Context-Größe relativ zur Task-Komplexität
- Truth-Files werden vollständig injiziert, auch wenn 90% irrelevant

**Token-Sparvorschlag:**
- Truth-Files auf max 2000 Zeichen pro File begrenzen
- Code-Context nur für Files die in der Task-Description oder einem `file_targets`-Feld referenziert werden
- Für simple Docs-Lane Tasks: Code-Context komplett weglassen

### 3.2 Critique-Prompt

**Gut:**
- Klar separiert von Architect
- Strukturierte Review-Sektionen

**Probleme:**
- Verwendet `prompt` statt `instructions+input` (andere API-Struktur als architect/synthesize)
- Keine Sektion "## Quality of acceptance criteria" — das wäre der wichtigste Review-Punkt
- Truth-Files erneut vollständig injiziert (Duplikat zu Architect)

**Fix:**
- "## Acceptance criteria review" als Pflichtsektion hinzufügen
- Konsistentes API-Format (instructions + input) wie bei den anderen Steps

### 3.3 Synthesize-Prompt

**Gut:**
- Nimmt Spec + Review als Input
- Löst Widersprüche explizit auf

**Probleme:**
- Truth-Files zum DRITTEN Mal vollständig injiziert
- Kein `## Testing strategy`-Sektion im Output (obwohl "## Tests required" da ist)
- Brief hat kein `## File targets with line ranges` — Executor weiß nicht welche Dateien existieren

**Token-Sparvorschlag:**
- Truth-Files NICHT in Synthesize injizieren — Spec + Review enthalten bereits alle relevanten Infos
- Stattdessen: "Refer to the spec and review above for project context"
- Spart 5.000-15.000 Tokens pro Synthesize-Call

### 3.4 Execute-Prompt

**Gut:**
- Tool-enabled (Read/Edit/Write/Glob/Grep)
- Snapshot-basierte Validierung
- Guardrail-Thresholds

**Probleme:**
- Kein expliziter Hinweis "Do NOT output the entire file — use Edit for targeted changes"
- Bei großen Dateien (>500 Zeilen) sollte der Prompt explizit warnen
- Conflict-Warning könnte konkreter sein (welche Funktionen betroffen)

### 3.5 Propose-Followups-Prompt

**Probleme (kritisch):**
- Format-Anforderung `### F-N` zu schwach formuliert → ChatGPT ignoriert es (siehe #1)
- Existing-Tasks-Summary kann sehr lang werden (50+ Tasks × 1 Zeile = viele Tokens)
- Spec + Review + Brief + Result + Truth-Files + Changed-Files + Existing-Tasks = massive Prompt
- Keine Token-Begrenzung auf Eingabe-Artefakte

**Token-Sparvorschlag:**
- Result-Report auf max 3000 Zeichen begrenzen
- Spec/Review/Brief auf max 2000 Zeichen je
- Existing-Tasks: nur Title + Status, keine Lane/Executor-Details
- Truth-Files: komplett weglassen (Follow-ups brauchen keine Projekt-Docs)

### 3.6 PR-Draft

**Gut:**
- Template-basiert, keine LLM-Abhängigkeit
- Sammelt alle Artefakte zusammen

**Probleme:**
- Kein LLM-Call → kein intelligentes Summary. Nur `summarize()` mit truncation
- Validation-Checklist ist statisch — könnte aus Spec-Acceptance-Criteria generiert werden

### 3.7 Gesamtbewertung Token-Effizienz

| Step | Geschätzte Token (Input) | Vermeidbar |
|------|--------------------------|------------|
| Architect | 15.000-30.000 | 5.000 (Code-Context begrenzen) |
| Critique | 10.000-20.000 | 3.000 (Truth-Files kürzen) |
| Synthesize | 15.000-25.000 | 10.000 (Truth-Files weglassen) |
| Execute | 5.000-15.000 | Minimal (Tools lesen selbst) |
| Followups | 20.000-40.000 | 15.000 (alles kürzen) |
| **Gesamt** | **65.000-130.000** | **~33.000 einsparbar** |

---

## 4. Git-Operationen

### Wie läuft Git aktuell?

1. **Branch-Erstellung:** `git branch "feature/T-XXXX"` — erstellt Branch, checkt NICHT aus
2. **Auto-Commits:** Nach jedem Step: `git add -A && git commit -m "[T-XXXX] step: title"`
3. **Merge:** `git merge --no-ff "feature/T-XXXX" -m "..."` — immer nach main
4. **Branch-Löschung:** `git branch -d "feature/T-XXXX"` nach erfolgreichem Merge

### Wird ein Repo automatisch erstellt?

**Nein.** `init-project.mjs` erstellt Verzeichnisse, aber kein `git init`. Es wird vorausgesetzt, dass das Projekt bereits ein Git-Repo ist. Das ist ein Problem für den `new`-Modus.

**Fix:** In `initNew()` nach Verzeichniserstellung: `git init && git add -A && git commit -m "Initial commit"` wenn kein `.git/` existiert.

### Worktree-Problem

Die Branch wird erstellt aber nie als Worktree ausgecheckt. Der Code arbeitet direkt auf dem Main-Branch. `prepare-worktree.mjs` existiert in der Pipeline-Tabelle (Step 4: Bootstrap), wird aber im Cascade nicht separat aufgerufen — es ist implizit im execute-Step.

---

## 5. Projekt-Import & Bootstrap-Workflow

### Aktuelle Import-Modi

| Modus | Was passiert |
|-------|-------------|
| `new` | Directories erstellen → Bootstrap-Prompt generieren → LLM-Call/Queue → Response parsen → DOMAIN_MODEL.md, ARCHITECTURE.md, INVARIANTS.md, AGENTS.md schreiben → First Goal + Tasks erstellen |
| `import` | Codebase analysieren (analyze-codebase.mjs) → Import-Prompt mit Analyse-Daten generieren → LLM-Call/Queue → Response parsen → Docs schreiben |
| `chat` | Extract-Prompt für bestehende ChatGPT-Konversation generieren → User paste in existierenden Chat → Response parsen → Docs schreiben |

### Was gut funktioniert

- Analyse-Script erkennt Technologien, liest Package.json, samplet Source-Files
- Response-Parser extrahiert strukturierte Sektionen (`## OUTPUT: KEY`)
- Goal + Tasks werden automatisch als JSON erstellt

### Was fehlt

1. **Kein `git init`** bei `new`-Modus
2. **Kein `project.config.yaml`** wird automatisch erstellt — ohne Config funktioniert die Pipeline nicht
3. **Keine Validierung** ob Response alle erforderlichen Sektionen enthält
4. **Template-Dateien** (`template/prompts/project-bootstrap.prompt.md`) müssen existieren aber werden nicht mitgeliefert
5. **Import kopiert keine Automation-Scripts** in das importierte Projekt

### Optimaler Workflow für komplexe Projekte

1. `node init-project.mjs import /path/to/project`
2. ChatGPT-Response in Dashboard einfügen
3. Generierte Docs reviewen und manuell anpassen (DOMAIN_MODEL, ARCHITECTURE, INVARIANTS)
4. `project.config.yaml` manuell erstellen mit truth_sources und executor_routing
5. Erste Goal erstellen und decompose lassen
6. Tasks einzeln laufen lassen (nicht alles auf einmal cascaden)

---

## 6. Fehlende Features (dokumentiert aber nicht implementiert)

### Aus DECISIONS.md

| Feature | Status | Priorität |
|---------|--------|-----------|
| execSync → Async Migration | "Documented, not yet implemented" | Hoch (Performance) |
| Configurable Pipeline (pipeline.yaml) | Planned | Mittel |
| JSON → SQLite/DB Migration | Planned v2.0 | Niedrig |
| Parallelism Strategy (Worker Pool) | Planned | Mittel |
| Prompt Templates (prompts.yaml) | Planned v2.0 | Niedrig |
| Explicit State Machine in Code | Planned | Hoch |
| Configurable per-step routing (not per-provider) | Planned | Mittel |

### Aus OBSERVABILITY.md

| Feature | Status |
|---------|--------|
| Token Aggregation (rollups by task/provider/day) | Not implemented |
| Dashboard Visualization für Usage | Not implemented |
| Structured Metrics (min/max/avg per step) | Not implemented |
| Budget Enforcement (stop cascade at limit) | Not implemented |
| Rate Limiting (per-provider throttling) | Not implemented |

### Aus PIPELINE.md

| Feature | Status |
|---------|--------|
| Phase 3: Dashboard Tests Tab | Not implemented |
| Phase 5: Visual UI Testing (browser) | Planned |
| Cowork Test Config in project.config.yaml | Documented, not wired |

### Aus MULTI_PROJECT.md

- Gesamtes Multi-Project-Design nicht implementiert
- Project-ID Namespacing fehlt
- Project-Selector UI fehlt

### Aus ARCHITECTURE.md

| Feature | Status |
|---------|--------|
| SQLite Migration | Planned |
| Concurrency Controls | Planned |

### Aus CONFIGURATION.md

| Feature | Status |
|---------|--------|
| Custom lane definitions | Planned |
| Lane-specific templates/approval | Planned |
| pipeline_steps.enabled | Planned |
| pipeline_conditions (conditional steps) | Planned |
| concurrency_config | Planned |

---

## 7. Zusammenfassung der Prioritäten

### Sofort fixen (HOCH)

1. **Follow-up Regex toleranter machen** — häufigster Fehler im APP-Mode
2. **Follow-up Prompt `### F-N`-Format stärker erzwingen** im Prompt-Text
3. **project.config.yaml automatisch erstellen** bei `init new` / `init import`
4. **git init bei new-Modus** wenn kein .git/ existiert

### Bald fixen (MITTEL)

5. **Task-Completion-Logik** — MERGED erst nach pr-draft setzen (oder neuer Zwischenstatus)
6. **Token-Sparen** — Truth-Files nicht in Synthesize/Followups duplizieren
7. **Critique-Prompt** — Acceptance Criteria Review Sektion
8. **Explicit State Machine** — alle Transitions an einer Stelle

### Langfristig (NIEDRIG)

9. Parallelism, DB Migration, Multi-Project, Configurable Pipeline
10. Dashboard Usage Visualization
11. Budget Enforcement
