---
type: brief
task_id: T-SRV-03
goal_id: G-0006
created: 2026-04-14
tags: [ai-flow-lab, brief, k-liste]
---

# T-SRV-03 Implementation Brief

## Goal
Sicherstellen, dass das Backend die row-Daten bereitstellt (API-Endpoint oder Template-Kontext prüfen).

## Scope

### In Scope
- Audit: Welche Daten liefert das Backend aktuell für Cases (Listenansicht + Detail)?
- Prüfen ob `source_rows` / row-Objekte mit Feldern (Kaufname, Block, SY, Steuer, Wert Netto, Wert Diff) im Template-Kontext verfügbar sind
- Falls nicht: Backend-Endpoint oder Query erweitern, damit diese Felder mitgeliefert werden
- Dokumentation der Datenstruktur für T-SRV-01 und T-SRV-02

### Out of Scope
- Frontend-Rendering (→ T-SRV-01, T-SRV-02)
- Neue Import-Logik oder Schema-Änderungen am Excel-Import
- Authentifizierung oder Zugriffskontrolle

## Constraints
1. Keine Breaking Changes am bestehenden API-Contract
2. Falls ORM/DB-Query: nur `SELECT`-Erweiterung, kein Schema-Migration
3. Performance: Row-Daten dürfen den Cases-Listenaufruf nicht signifikant verlangsamen (ggf. lazy-load oder separater Endpoint)

## File targets
- Backend-Route/View für `/cases` und `/cases/<id>` (Python/Flask, Django o.ä.)
- Ggf. Datenbank-Query oder Serializer

## Tests required
1. API-Response (oder Template-Kontext) für einen Case enthält `source_rows` als Array
2. Jedes Row-Objekt hat Felder: `row_number`, `kaufname`, `block`, `sy`, `steuer`, `wert_netto`, `wert_diff`
3. Bestehende Cases-Tests laufen weiterhin grün

## Dependencies
- Muss vor oder parallel zu T-SRV-01 und T-SRV-02 geklärt werden

## Related Documents
- [[goals/G-0006.md|G-0006 Goal]]
- [[ai/briefs/T-SRV-01_implementation.md|T-SRV-01 brief]]
- [[ai/briefs/T-SRV-02_implementation.md|T-SRV-02 brief]]
