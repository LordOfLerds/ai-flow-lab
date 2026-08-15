---
type: brief
task_id: T-SRV-01
goal_id: G-0006
created: 2026-04-14
tags: [ai-flow-lab, brief, k-liste]
---

# T-SRV-01 Implementation Brief

## Goal
Source rows in `<details>`-Klappelement der Cases-Tabelle als Tabelle einbauen.

## Scope

### In Scope
- In der Cases-Listenansicht (`/cases`) das `<details>`-Element pro Case erweitern
- Statt reiner Zeilennummern-Liste eine HTML-Tabelle mit Spalten: Zeile, Kaufname, Block, SY, Steuer, Wert Netto, Wert Diff
- Template oder JavaScript-Render-Logik anpassen, die den `<details>`-Inhalt aufbaut
- Sicherstellen, dass die Daten aus dem verfügbaren Row-Objekt korrekt gemappt werden

### Out of Scope
- Case-Detail-Seite (→ T-SRV-02)
- Backend-Änderungen (→ T-SRV-03)
- Filterung oder Sortierung der Zeilen

## Constraints
1. Keine Änderung am Datenbankschema oder Backend-API ohne Abstimmung mit T-SRV-03
2. Minimal-invasive HTML/Template-Änderung — nur das `<details>`-Element betroffen
3. Rückwärtskompatibel: Falls source_rows leer/undefined, weiterhin Fallback anzeigen

## File targets
- Template-Datei für die Cases-Listenansicht (z.B. `templates/cases_list.html` o.ä.)
- Oder entsprechende JavaScript-Render-Funktion

## Tests required
1. Cases-Liste laden → `<details>` aufklappen → Tabelle mit Zellinhalten sichtbar
2. Spalten korrekt: Zeile, Kaufname, Block, SY, Steuer, Wert Netto, Wert Diff
3. Kein JS-Fehler in der Konsole
4. Fallback: Case ohne source_rows → kein Crash, sinnvolle Leermeldung

## Related Documents
- [[goals/G-0006.md|G-0006 Goal]]
- [[ai/briefs/T-SRV-02_implementation.md|T-SRV-02 brief]]
- [[ai/briefs/T-SRV-03_implementation.md|T-SRV-03 brief]]
