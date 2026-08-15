---
type: brief
task_id: T-SRV-05
goal_id: G-0006
created: 2026-04-14
tags: [ai-flow-lab, brief, k-liste, browser-check]
---

# T-SRV-05 Implementation Brief

## Goal
Browser-Check: Prüfen ob source rows in der Case-Detail-Seite sichtbar sind.

## Scope

### In Scope
- Öffne http://localhost:8766/cases/<id> für einen beliebigen Case im Browser
- Prüfe: Gibt es eine "Quellzeilen"-Sektion oder ähnliche Darstellung der original Excel-Zeilen?
- Falls ja: Zeigt sie Kaufname, Block, SY, Steuer, Wert Netto, Wert Diff?
- Falls nein: Dokumentiere was aktuell im Template zu den source_rows steht (z.B. nur Notes-Feld mit Zeilennummern)
- Prüfe auch das "Notes"-Feld im Aktueller-Fallstatus-Bereich (zeigt aktuell Metadaten wie `source_rows=401,402,403`)

### Out of Scope
- Keine Code-Änderungen in diesem Task
- Keine Backend-Analyse (→ T-SRV-03)
- Keine Implementierung (→ T-SRV-02)

## Constraints
1. Read-only: kein Schreiben in den k-liste Repo-Dateien
2. Nur Beobachten und Dokumentieren
3. App muss laufen auf localhost:8766

## Acceptance Criteria
- Report enthält Screenshot-Beschreibung oder DOM-Beweis
- Klarer Befund: Quellzeilen-Sektion vorhanden (ja/nein) + was genau angezeigt wird
- Falls NICHT vorhanden: T-SRV-02 und T-SRV-03 sollten als nächste ausgeführt werden

## Expected Finding (basierend auf QA-Session vom 2026-04-14)
Die Case-Detail-Seite zeigt im Notes-Feld den String `source_rows=401,402,403` (aus den K-Liste-Import-Metadaten). Eine eigene „Quellzeilen"-Sektion mit Tabelleninhalt existiert NICHT. Source rows sind als lesbarer Content NICHT sichtbar.

## Related Documents
- [[goals/G-0006.md|G-0006 Goal]]
- [[ai/briefs/T-SRV-02_implementation.md|T-SRV-02 brief (Implementierung)]]
