---
type: brief
task_id: T-PFX-03
goal_id: G-0007
created: 2026-04-14
tags: [ai-flow-lab, brief, k-liste]
---

# T-PFX-03 Implementation Brief

## Goal
WORKFLOW_AUDIT.md Phase 4 schreiben: Ergebnisse des Post-Fix-Volltests dokumentieren.

## Scope

### In Scope
- Öffne `/Users/l.erdkoenig/Dev/aurena-k-list/docs/WORKFLOW_AUDIT.md`
- Füge neuen Abschnitt `## Phase 4 — Post-Fix Volltest (2026-04-14)` hinzu
- Inhalt des Abschnitts:
  - Summary: 7 Bugs aus QA-Session, alle behoben
  - Tabelle: Bug-ID, Schwere, Beschreibung, Fix-Datei, Status (LIVE/NEUSTART NÖTIG/QUELLDATEN/ARTEFAKT)
  - Testablauf-Zusammenfassung aus T-PFX-02 Ergebnissen
  - Offene Punkte (falls T-PFX-02 FAIL ergab)
  - Nächste empfohlene Goals: G-0006 (Source Row Visibility) als P0

### Out of Scope
- Änderungen an anderen docs/-Dateien
- Code-Änderungen

## Constraints
1. Format analog zu bestehenden Phase 1/2/3 Abschnitten in WORKFLOW_AUDIT.md
2. Nur append — keine bestehenden Inhalte verändern
3. Deutsche Sprache (konsistent mit bestehenden Phasen)

## Expected Section Content

```markdown
## Phase 4 — Post-Fix Volltest (2026-04-14)

### Kontext
QA-Session (Claude Cowork) identifizierte 7 Bugs nach Import von 108 Feb-K-Liste Cases.
Fix-Session (selber Tag) behoben alle behebaren Bugs in 4 Dateien.

### Bug-Fix-Status

| Bug-ID | Schwere | Beschreibung | Datei | Status |
|--------|---------|--------------|-------|--------|
| NEW-01 | HOCH | Batch-UUID statt Dateiname in Case-Detail | app.py + case_detail.html | BEHOBEN — Neustart nötig |
| NEW-02 | MITTEL | "Bereit fuer Bidware" → "Bereit für Bidware" | case_detail.html | BEHOBEN — LIVE |
| NEW-03 | KRITISCH | Dropbox bidware_no_match→FALLBACK_PENDING | fallback.py | BEHOBEN — LIVE |
| NEW-04 | HOCH | POST /export 503 ohne UI-Feedback | database.py | BEHOBEN — LIVE |
| NEW-05 | MITTEL | Excluded Cases ohne Aktionen-Sektion | app.py | BEHOBEN — Neustart nötig |
| NEW-06 | NIEDRIG | Dashboard CSS blank bei Scroll | — | SCREENSHOT-ARTEFAKT |
| NEW-07 | NIEDRIG | Leerzeichen in Case-Titel | — | QUELLDATEN-PROBLEM |

### Live-Status nach Fix-Session
- NEW-02, NEW-03, NEW-04: Bestätigt live (Template/pyc neu geladen)
- NEW-01, NEW-05: Bestätigt korrekt im Code, Neustart für Aktivierung nötig
...
```

## File targets
- `/Users/l.erdkoenig/Dev/aurena-k-list/docs/WORKFLOW_AUDIT.md` (append)
