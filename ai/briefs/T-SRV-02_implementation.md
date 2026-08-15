---
type: brief
task_id: T-SRV-02
goal_id: G-0006
created: 2026-04-14
tags: [ai-flow-lab, brief, k-liste]
---

# T-SRV-02 Implementation Brief

## Goal
"Quellzeilen"-Sektion in Case-Detail-Template hinzufügen mit vollständiger Tabelle aller source rows.

## Scope

### In Scope
- Case-Detail-Seite (URL-Muster `/cases/<id>` o.ä.) um eine Sektion "Quellzeilen" erweitern
- Vollständige Tabelle aller source_rows mit Spalten: Zeile, Kaufname, Block, SY, Steuer, Wert Netto, Wert Diff
- Sektion unterhalb der bestehenden Case-Metadaten platzieren
- Styling konsistent mit dem bestehenden Template

### Out of Scope
- Cases-Listenansicht (→ T-SRV-01)
- Backend-Änderungen (→ T-SRV-03)
- Export-Funktionalität der Quellzeilen

## Constraints
1. Template-seitige Änderung only — kein neuer API-Endpunkt (setzt voraus, dass T-SRV-03 die Daten bereits liefert)
2. Sinnvoller Fallback wenn `source_rows` leer ist ("Keine Quellzeilen vorhanden")
3. Keine Auswirkung auf bestehende Case-Detail-Felder

## File targets
- Template-Datei für die Case-Detail-Seite (z.B. `templates/case_detail.html` o.ä.)

## Tests required
1. Case-Detail-Seite öffnen → Sektion "Quellzeilen" ist sichtbar
2. Alle source_rows werden vollständig angezeigt (nicht nur Zeilennummern)
3. Spalten: Zeile, Kaufname, Block, SY, Steuer, Wert Netto, Wert Diff vorhanden
4. Edge-case: Case ohne Quellzeilen → Fallback-Text ohne Crash

## Dependencies
- T-SRV-03 (Backend muss row-Daten liefern) — oder Sicherstellen dass Daten bereits im Template-Kontext vorhanden

## Related Documents
- [[goals/G-0006.md|G-0006 Goal]]
- [[ai/briefs/T-SRV-01_implementation.md|T-SRV-01 brief]]
- [[ai/briefs/T-SRV-03_implementation.md|T-SRV-03 brief]]
