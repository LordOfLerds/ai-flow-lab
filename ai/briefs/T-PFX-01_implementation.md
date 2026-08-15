---
type: brief
task_id: T-PFX-01
goal_id: G-0007
created: 2026-04-14
tags: [ai-flow-lab, brief, k-liste]
---

# T-PFX-01 Implementation Brief

## Goal
Server-Neustart verifizieren: Die app.py-Änderungen aus der Fix-Session (NEW-01 und NEW-05) in den live-Server laden.

## Hintergrund
Die `uvicorn --reload`-Instanz auf Port 8766 hat die `app.py`-Änderungen NICHT automatisch geladen (das `app.cpython-310.pyc` war noch von Apr 13 22:41, obwohl die Quelldatei am Apr 14 10:43 geändert wurde). Ursache: Der File-Watcher von uvicorn erkennt Änderungen durch den Sandbox-Mount nicht zuverlässig.

## Scope

### In Scope
- Prüfen ob der Server bereits mit den neuen Dateien läuft (app.cpython-310.pyc mtime > app.py mtime)
- Falls NICHT: Server auf Port 8766 neustarten
- Nach Neustart prüfen: `GET /cases/<id>` zeigt Batch-Filename statt UUID (Quick-Smoke-Test für NEW-01)
- Nach Neustart prüfen: Excluded Case-Detail hat Aktionen-Sektion (Quick-Smoke-Test für NEW-05)

### Out of Scope
- Vollständiger Test (→ T-PFX-02)
- Codeänderungen

## Constraints
1. Nur wenn nötig neu starten — Priorität: Neustart-Schaden minimieren (kein DB-Reset)
2. Server-Neustart-Kommando: `python3 -m uvicorn klist.web_app.app:app --reload --host 127.0.0.1 --port 8766`
3. Working directory: `/Users/l.erdkoenig/Dev/aurena-k-list/`

## File targets
- Kein Schreiben in Code-Dateien
- Ggf. Report in `ai/results/T-PFX-01_executor_report.md`

## Tests required
1. `stat src/klist/web_app/__pycache__/app.cpython-310.pyc` → mtime nach `stat src/klist/web_app/app.py` mtime
2. `GET /cases/<id>` → HTML enthält "022026_K_Liste.xlsx" (nicht UUID)
3. `GET /cases/8fd810f5-...` (excluded) → HTML enthält "Aktionen" und "irreversible"
