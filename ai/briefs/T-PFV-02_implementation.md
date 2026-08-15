---
type: brief
task_id: T-PFV-02
goal_id: G-0007
created: 2026-04-14
tags: [ai-flow-lab, brief, k-liste]
---

# T-PFV-02 Implementation Brief

## Goal
Vollständigen Browser-Workflow-Test gegen localhost:8766 durchführen.

## Scope

### In Scope
- Kompletten k-liste-Workflow manuell oder automatisiert durchlaufen:
  1. Login / Startseite
  2. Excel-Import (Testdatei hochladen)
  3. Cases-Übersicht (/cases) aufrufen
  4. `<details>`-Elemente expandieren → Zellinhalte prüfen
  5. Case-Detail-Seite aufrufen → Quellzeilen-Sektion prüfen
  6. Weitere Kernfunktionen (Statusänderungen, Filter, Export o.ä.)
- Fehler und Regressions dokumentieren
- Screenshots / Browser-Konsolenausgabe für kritische Stellen

### Out of Scope
- Fixes selbst durchführen (neue Bugs → separates Ticket)
- Performance-Benchmarks

## Constraints
1. Setzt erfolgreichen Server-Neustart (T-PFV-01) voraus
2. Mindestens ein vollständiger Import-zu-Cases-Workflow
3. Browser: lokaler Chrome/Firefox gegen localhost:8766

## Tests required
1. Alle Bug-Fix-Punkte NEW-01 bis NEW-07 manuell verifiziert
2. Source Row Visibility (G-0006) funktioniert nach Fixes
3. Keine JavaScript-Fehler in der Browser-Konsole bei Kernflows

## Dependencies
- T-PFV-01 muss abgeschlossen sein

## Related Documents
- [[goals/G-0007.md|G-0007 Goal]]
- [[ai/briefs/T-PFV-01_implementation.md|T-PFV-01 brief]]
- [[ai/briefs/T-PFV-03_implementation.md|T-PFV-03 brief]]
