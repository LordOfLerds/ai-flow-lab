---
type: brief
task_id: T-SRV-04
goal_id: G-0006
created: 2026-04-14
tags: [ai-flow-lab, brief, k-liste, browser-check]
---

# T-SRV-04 Implementation Brief

## Goal
Browser-Check: Prüfen ob source rows in der collapsed Cases-Tabellenansicht sichtbar sind.

## Scope

### In Scope
- Öffne http://localhost:8766/cases im Browser
- Klappe ein `<details>`-Element (pro Case-Zeile) auf
- Prüfe: Zeigt es die tatsächlichen Excel-Zellinhalte (Kaufname, Block, SY, Steuer, Wert) als Tabelle?
- Oder zeigt es nur "Show source rows" / bloße Zeilennummern?
- Ergebnis in einem kurzen Report festhalten

### Out of Scope
- Keine Code-Änderungen in diesem Task
- Keine Backend-Analyse (→ T-SRV-03)
- Keine Implementierung (→ T-SRV-01)

## Constraints
1. Read-only: kein Schreiben in den k-liste Repo-Dateien
2. Nur Beobachten und Dokumentieren
3. App muss laufen auf localhost:8766

## Acceptance Criteria
- Report enthält Screenshot-Beschreibung oder DOM-Beweis
- Klarer Befund: source rows sichtbar (ja/nein) + was genau angezeigt wird
- Falls NICHT sichtbar: T-SRV-01 und T-SRV-03 sollten als nächste ausgeführt werden

## Expected Finding (basierend auf QA-Session vom 2026-04-14)
Die `<details>`-Elemente in der Cases-Tabelle zeigen aktuell nur "Show source rows" als Summary-Text — keine tatsächlichen Zellinhalte der Excel-Zeilen. Source rows sind NICHT sichtbar.

## Related Documents
- [[goals/G-0006.md|G-0006 Goal]]
- [[ai/briefs/T-SRV-01_implementation.md|T-SRV-01 brief (Implementierung)]]
