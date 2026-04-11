---
type: spec
task_id: T-0018
created: 2026-04-10
tags: [ai-flow-lab, spec]
---

# T-0018 Spec

## Task metadata

- task_id: T-0018
- title: Start UI nicht mehr vorhanden wenn auf game oder game.html
- lane_type: bug-lane
- executor: codex

## Problem statement

Der gemeldete Fehler beschreibt, dass die Start-UI nicht mehr sichtbar ist, wenn die Anwendung über `game` oder `game.html` aufgerufen wird.

Im bereitgestellten Code-Kontext ist aktuell nur `index.html` als eindeutig vorhandener Einstiegspunkt sichtbar. Dort existiert die Start-UI als Overlay:

- `#overlay`
- Titel `🎮 PIXEL RUNNER`
- Untertitel `Jump & Run`
- Steuerungshinweis
- `#menu-content` als Bereich für Menü-/Startinhalt

Damit ist der beobachtete Fehler wahrscheinlich ein Routing-/Entry-Point-Problem oder ein Problem bei der Initialisierung des Overlays auf alternativen Aufrufpfaden. Auf Basis der vorliegenden Informationen ist aber nicht gesichert, ob:

1. `game` und `game.html` tatsächlich existierende Einstiegspunkte sind,
2. sie auf `index.html` umleiten sollen,
3. sie eine eigene HTML-Datei mit identischer UI sein sollen,
4. oder serverseitiges Routing erwartet wird.

Sicher ist nur: Die Start-UI ist laut Bugmeldung bei Aufruf über `game` oder `game.html` nicht sichtbar, obwohl im sichtbaren Hauptdokument eine Start-UI vorgesehen ist.

## Source of truth

Primäre Dokumentation laut `AGENTS.md`:

- `docs/DOMAIN_MODEL.md`
- `docs/INVARIANTS.md`
- `docs/ARCHITECTURE.md`
- `docs/ADR/`

Für diese Aufgabe wurden solche Fach-/Architekturdokumente jedoch nicht mitgeliefert. Daher ist die aktuell belastbare Source of truth auf den bereitgestellten Code-Kontext begrenzt.

Direkt beobachtbare Code-Quellen:

- `index.html`
  - enthält die sichtbare Start-UI-Struktur über `#overlay`
  - enthält das Canvas-Game-Layout
  - lädt `./auth-state.js`
  - enthält zusätzlich ein Inline-Script, dessen vollständiger Inhalt hier nicht vorliegt

Unsicherheit explizit:

- Da der vollständige Inline-Script-Inhalt fehlt, ist unklar, ob die Start-UI per JavaScript dynamisch ein-/ausgeblendet wird.
- Da keine Dateien `game` oder `game.html` im gelieferten Kontext enthalten sind, ist unklar, ob der Code bereits weiter ist als die hier sichtbare Dokumentation bzw. der Auszug.

## Desired behavior

Wenn die Anwendung über den vorgesehenen Spieleinstieg aufgerufen wird, soll die Start-UI konsistent sichtbar sein, bevor ein Spiel aktiv gestartet wurde.

Konkret bedeutet das aus heutiger Sicht:

- Der Aufruf über den Standard-Einstiegspunkt darf die Start-UI anzeigen.
- Der Aufruf über `game` oder `game.html` darf die Start-UI nicht verlieren, sofern diese Pfade als gültige Einstiegspfade unterstützt werden.
- Die vorhandene Overlay-Struktur aus `index.html` soll vor Spielstart sichtbar bleiben, statt unmittelbar verborgen oder umgangen zu werden.
- Falls `game` oder `game.html` keine gültigen Einstiegspfade sein sollen, muss die tatsächliche Soll-Regel zunächst geklärt werden, statt stillschweigend eine neue Routing-Regel einzuführen.

## Constraints

- Es darf keine neue Business-Logik erfunden werden.
- Vor Implementierung muss geprüft werden, ob `game` und `game.html` im Repo tatsächlich existieren oder serverseitig geroutet werden.
- Falls Dokumentation und getestetes Verhalten voneinander abweichen, muss die Unsicherheit explizit benannt werden; kein stilles Entscheiden.
- Änderungen sollen minimal und sicher sein.
- Die Aufgabe ist auf die Wiederherstellung bzw. Sicherstellung der Start-UI-Sichtbarkeit für die betroffenen Aufrufpfade begrenzt.
- Ohne vollständigen Script-Kontext darf nicht angenommen werden, dass das Problem rein in HTML/CSS liegt; Initialisierungslogik kann beteiligt sein.

## Acceptance criteria

- Es ist nachvollziehbar analysiert, warum die Start-UI bei Aufruf über `game` oder `game.html` nicht sichtbar ist.
- Die tatsächliche Ursache ist einer der folgenden Kategorien eindeutig zugeordnet:
  - fehlender/abweichender Einstiegspunkt,
  - falsches Routing/Redirect-Verhalten,
  - abweichende HTML-Struktur,
  - JavaScript-Initialisierung blendet Overlay ungewollt aus,
  - Asset-/Pfadproblem beim alternativen Einstieg.
- Für alle unterstützten Spieleinstiegspfade ist das Start-Overlay vor Spielstart sichtbar.
- Die bestehende Start-UI aus `index.html` bleibt funktional erhalten:
  - `#overlay` ist vorhanden,
  - Titel und Menübereich bleiben sichtbar,
  - das Overlay ist nicht unbeabsichtigt mit `.hidden` versehen oder per Initialisierung entfernt.
- Falls `game` oder `game.html` laut Repo gar nicht unterstützt werden, wird diese Abweichung explizit dokumentiert statt durch Annahmen kaschiert.

## Risks

- Der vollständige JavaScript-Code fehlt im Kontext; die eigentliche Fehlerursache könnte in Logik liegen, die hier nicht sichtbar ist.
- `game` bzw. `game.html` könnten auf lokaler Dev-Server-Konfiguration, Static Hosting oder Rewrite-Regeln beruhen; ein reiner Dateiblick könnte die Ursache nicht vollständig erklären.
- Es besteht das Risiko, versehentlich das Verhalten des Overlays nach Spielstart zu ändern, wenn die Start-/Hide-Logik angepasst wird.
- Falls mehrere Einstiegspfade historisch existieren, kann unklar sein, welcher offiziell unterstützt ist.
- Wenn Code und nicht gelieferte Dokumentation voneinander abweichen, muss ein Drift-Fall dokumentiert werden.

## Open questions

- Existieren `game` und/oder `game.html` tatsächlich als Dateien oder nur als Routing-Ziele?
- Welcher Einstiegspfad ist offiziell unterstützt: `index.html`, `game.html`, `/game` oder mehrere?
- Wird `#overlay` im nicht mitgelieferten Inline-Script direkt beim Laden ausgeblendet?
- Gibt es Unterschiede in Asset-Pfaden oder Script-Ausführung zwischen `index.html` und `game.html`?
- Gibt es Projekt-Dokumentation in `docs/`, die das gewünschte Verhalten der Start-UI und der gültigen Einstiegspfade definiert?
- Falls `game.html` fehlt, soll es auf `index.html` verweisen, identischen Inhalt bereitstellen oder gar nicht unterstützt werden?

## Related Documents
- [[ai/reviews/T-0018_gemini_review.md|T-0018 review]]
- [[ai/briefs/T-0018_implementation.md|T-0018 document]]
- [[ai/results/T-0018_executor_report.md|T-0018 result]]
- [[ai/followups/T-0018_followups.md|T-0018 followup]]
- [[ai/pr/T-0018_pr_draft.md|T-0018 pr-draft]]
