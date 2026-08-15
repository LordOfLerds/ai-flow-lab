---
type: brief
task_id: T-PFV-01
goal_id: G-0007
created: 2026-04-14
tags: [ai-flow-lab, brief, k-liste]
---

# T-PFV-01 Implementation Brief

## Goal
Server-Neustart verifizieren (NEW-01 + NEW-05 brauchen Neustart).

## Scope

### In Scope
- Laufenden k-liste-Server stoppen (localhost:8766)
- Server mit aktuellem Code-Stand neu starten
- Bestätigen, dass Fixes NEW-01 (Import-Bug) und NEW-05 (Datenbankschema o.ä.) wirksam sind, die einen Prozess-Neustart erfordern
- Sicherstellen, dass der Server fehlerfrei hochläuft (keine Startup-Fehler in den Logs)

### Out of Scope
- Funktionaler Workflow-Test (→ T-PFV-02)
- Dokumentation (→ T-PFV-03)

## Constraints
1. Kein Datenverlust beim Neustart
2. Neustart via bestehendem `restart-server.command` Script falls vorhanden

## File targets
- `restart-server.command` (ausführen, nicht editieren)

## Tests required
1. Server antwortet auf localhost:8766 nach Neustart
2. Server-Logs zeigen keine FATAL/ERROR-Einträge beim Start
3. Fixes NEW-01 und NEW-05 sind aktiv (z.B. durch Prüfung der Code-Version)

## Related Documents
- [[goals/G-0007.md|G-0007 Goal]]
- [[ai/briefs/T-PFV-02_implementation.md|T-PFV-02 brief]]
