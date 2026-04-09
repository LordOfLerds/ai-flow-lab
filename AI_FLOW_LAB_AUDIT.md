# AI Flow Lab — Vollständiger System-Audit

**Datum:** 2026-04-09  
**Geprüft von:** Claude  

---

## 1. OFFENE FEHLER (noch nicht gefixt)

Von 16 getrackten Bugs in `KNOWN_BUGS.md` sind **5 noch offen**:

| Bug | Severity | Problem | Auswirkung |
|-----|----------|---------|------------|
| BUG-005 | Medium | Kein Concurrency-Limit für parallele Cascades | Wenn 2 Cascades gleichzeitig starten, gibt es keine Queue — mögliche Resource-Exhaustion |
| BUG-007 | Medium | Kein Rollback-Mechanismus für schlechte Merges | Ein fehlerhafter Merge kann nicht rückgängig gemacht werden (kein `git revert` + Task-Reset) |
| BUG-008 | Low | Score resettet nicht bei Game-Restart | `gs.score` wird bei Neustart nicht auf 0 gesetzt — zeigt kumulativen Score |
| BUG-009 | Low | T-0028 zeigt FAILED runtime_status (kosmetisch) | Dashboard zeigt FAILED obwohl Task erfolgreich gemerged wurde |
| BUG-013 | Medium | Race Condition bei Task-ID-Generierung | Bei gleichzeitiger Task-Erstellung (z.B. Follow-ups) können doppelte IDs entstehen — kein Mutex/Atomic Counter |

**Zusätzlich aus der Code-Analyse:**
- **30+ `execSync`-Aufrufe** blockieren den Event Loop (geplante Async-Migration, noch nicht umgesetzt)
- **Kein CORS konfiguriert** im Server — für Entwicklung ok, für Produktion ein Problem
- **Concurrency-Analyse** existiert als Research-Dokument (`CONCURRENCY_ANALYSIS.md`) aber keine Fixes implementiert

---

## 2. KONFIGURATIONSPROBLEME (.env)

Die Datei `automation/.env` hat mehrere Probleme:

| Problem | Aktuell | Sollte sein |
|---------|---------|-------------|
| OpenAI-Modell falsch | `gpt-5.4` | `gpt-4-turbo` oder `gpt-4o` (gpt-5.4 existiert nicht) |
| Gemini-Modell falsch | `gemini-3-flash-preview` | `gemini-2.0-flash` (gemini-3 existiert nicht) |
| ANTHROPIC_API_KEY leer | (leer) | Nicht kritisch im APP/CLI-Modus, aber API-Modus würde brechen |
| API-Keys im Klartext | Hardcoded in .env | Sollte in .gitignore sein (ist es hoffentlich) |

**Auswirkung:** Im aktuellen `app`-Modus nicht blockierend, da OpenAI-Steps manuell über Prompt-Queue laufen. Aber wenn jemand auf `api`-Modus wechselt, schlagen alle Calls fehl wegen ungültiger Modellnamen.

---

## 3. WAS FEHLT IN DEN DOCS

### Komplett fehlende Dokumente:

| Dokument | Priorität | Beschreibung |
|----------|-----------|--------------|
| **API_REFERENCE.md** | HOCH | 30+ API-Endpoints existieren im Code, aber kein konsolidiertes Referenz-Dokument. Endpoints sind über 4 verschiedene Docs verstreut (ARCHITECTURE, PIPELINE, COWORK_TEST, KNOWN_BUGS) |
| **LLM_PROMPTS.md** | MITTEL-HOCH | Alle System-Prompts (Architect, Critique, Synthesize, Execute, etc.) sind hardcoded in den Step-Scripts. Nirgends dokumentiert — wichtig für Tuning und Customization |
| **DASHBOARD_GUIDE.md** | MITTEL | `dashboard.html` ist 3019 Zeilen Vanilla JS ohne dokumentierte Architektur. 7 Views (Flow, Kanban, Tree, ChatGPT, Tests, Decisions, Pipeline) existieren aber sind nirgends erklärt |
| **STATE_SCHEMA.md** | MITTEL | Die JSON-Schemata für Tasks, Goals, Proposals, Usage-Log etc. sind nur implizit im Code definiert, nicht dokumentiert |

### Fehlende Abschnitte in existierenden Docs:

| Wo fehlt es | Was fehlt |
|-------------|-----------|
| **CONFIGURATION.md** | Cowork-Test-Konfiguration (`cowork_test.enabled`, `app_url`, `timeout_ms`, `thresholds`) — steht nur in COWORK_TEST_FEATURE.md |
| **CONCEPTS.md (User)** | Follow-up Dedup-Algorithmus (3-dimensional: title + scope + written_files) — steht nur in PIPELINE.md |
| **CONCEPTS.md (User)** | Executor File-Safety Guardrail (Snapshot → Validate → Restore) — steht nur in ARCHITECTURE.md |
| **MODES.md (User)** | Tool-Enabled Claude CLI (`--allowed-tools`) — steht nur in Dev-Docs, nicht in User-Docs |

---

## 4. WAS IN DEN DOCS FALSCH/VERALTET IST

### Widersprüche:

| Dokument | Problem |
|----------|---------|
| **ADR-0002** (DECISIONS.md) | Sagt "UI and decision capture not wired" — aber COWORK_TEST_FEATURE.md Phase 1 + FIX-021 zeigen, dass Decision Gates seit 2026-04-08 implementiert SIND. ADR-0002 ist veraltet. |
| **OBSERVABILITY.md** | Sagt "No cost calculation — no pricing multipliers" — aber FIX-034 hat Cost-Tracking implementiert. OBSERVABILITY.md ist veraltet. |

### Veraltete Informationen:

| Dokument | Was veraltet ist |
|----------|-----------------|
| **KNOWN_BUGS.md** | BUG-001, BUG-002, BUG-003, BUG-006, BUG-010, BUG-011, BUG-012, BUG-014, BUG-015, BUG-016 stehen noch unter "Open" obwohl sie als FIXED markiert sind — sollten in die "Fixed" Sektion verschoben werden |
| **CONCURRENCY_ANALYSIS.md** | Listet "Codex CLI hangs" als offenes Problem, aber FIX-002 hat das bereits gelöst |

---

## 5. WAS GUT IST (Stärken)

- **KNOWN_BUGS.md** ist exzellent — 42 Fixes detailliert mit Datum, Dateien, Ursache und Lösung
- **TROUBLESHOOTING.md** deckt 14 spezifische Szenarien ab
- **PIPELINE.md** und **ARCHITECTURE.md** sind aktuell und stimmen mit dem Code überein
- Alle in CLAUDE.md referenzierten Dateien existieren tatsächlich
- User-Docs (GETTING_STARTED, CONCEPTS, MODES, CONFIGURATION) sind vollständig und gut verlinkt
- Product-Docs (game ARCHITECTURE, DOMAIN_MODEL, INVARIANTS) sind komplett

---

## 6. PRIORISIERTE HANDLUNGSEMPFEHLUNGEN

### Sofort (15 min):
1. `.env` Modellnamen fixen: `gpt-5.4` → `gpt-4-turbo`, `gemini-3-flash-preview` → `gemini-2.0-flash`
2. ADR-0002 updaten: Decision Gates als "Implemented (Phase 1, 2026-04-08)" markieren
3. KNOWN_BUGS.md aufräumen: Bereits gefixte Bugs aus "Open" in "Fixed" verschieben

### Kurzfristig (1-2h):
4. OBSERVABILITY.md updaten: Cost-Tracking als implementiert dokumentieren (FIX-034)
5. Cowork-Test-Config in CONFIGURATION.md aufnehmen
6. API_REFERENCE.md erstellen mit allen 30+ Endpoints

### Mittelfristig (3-5h):
7. Concurrency-Fixes implementieren (BUG-005: Task-Queue, BUG-013: Atomic Counter)
8. LLM_PROMPTS.md erstellen
9. Follow-up Dedup und File-Safety Guardrail in User-Docs aufnehmen

### Langfristig:
10. execSync → Async Migration abschließen (30+ Stellen)
11. Rollback-Mechanismus für Merges (BUG-007)
12. Dashboard-UI dokumentieren

---

## Gesamt-Score

| Bereich | Score | Bewertung |
|---------|-------|-----------|
| Code-Stabilität | 85% | 5 offene Bugs, aber nichts Kritisches mehr |
| Konfiguration | 60% | .env hat falsche Modellnamen — bricht bei Moduswechsel |
| Docs Vollständigkeit | 90% | Alle Haupt-Docs vorhanden, API-Referenz fehlt |
| Docs Aktualität | 84% | 2 veraltete Einträge, 1 Widerspruch |
| Docs Korrektheit | 88% | Code-Doc-Alignment ist gut, kleinere Abweichungen |
| **Gesamt** | **81%** | **Solides System, Config + Doc-Cleanup nötig** |
