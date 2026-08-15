---
type: brief
task_id: T-PFX-02
goal_id: G-0007
created: 2026-04-14
tags: [ai-flow-lab, brief, k-liste]
---

# T-PFX-02 Implementation Brief

## Goal
Kompletter Browser-Workflow-Test gegen localhost:8766 nach Fix-Session — alle 7 Bugs einzeln verifizieren.

## Scope

### Test-Checkliste

| Bug | Erwarteter Zustand | Test-URL | Prüfpunkt |
|-----|-------------------|----------|-----------|
| NEW-01 | Batch-Filename statt UUID | /cases/<id> | HTML enthält "022026_K_Liste.xlsx" in Import batch dd-Element |
| NEW-02 | "Bereit für Bidware" mit ü | /cases/ead0bdb0-... | Status-Badge-Text == "Bereit für Bidware" |
| NEW-03 | Dropbox Flow funktioniert | DB-Check | status_log zeigt bidware_no_match→dropbox_fallback_pending→manual_rest_value_entered |
| NEW-04 | Export 303 statt 503 | POST /export | Response type == opaqueredirect ODER Redirect zu /reports?error=... |
| NEW-05 | Excluded hat Aktionen | /cases/8fd810f5-... | HTML enthält "Aktionen" + "irreversible" |
| NEW-06 | Dashboard rendert vollständig | / | DOM enthält Fallback-Card und Status-Referenz-Tabelle |
| NEW-07 | Keine Aktion nötig | — | Quelldaten-Problem bestätigt, kein Code-Fix |

### In Scope
- Jeden Test einzeln durchführen mit Chrome MCP oder fetch-API
- Pass/Fail + Beweis dokumentieren
- Regression: Dashboard (/), Cases (/cases), Reports (/reports) laden ohne 500

### Out of Scope
- Code-Änderungen
- Neue Bugs beheben (→ neue Tasks anlegen)

## Constraints
1. Read-only für k-liste Repo
2. App muss auf localhost:8766 laufen (T-PFX-01 Voraussetzung)
3. DB-Stand: Case db982091 ist bereits im Zustand "manual_rest_value_entered" (aus QA-Session)

## File targets
- `ai/results/T-PFX-02_executor_report.md` mit vollständiger Pass/Fail-Tabelle
