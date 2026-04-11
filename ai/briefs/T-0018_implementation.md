---
type: brief
task_id: T-0018
created: 2026-04-10
tags: [ai-flow-lab, brief]
---

# T-0018 Implementation Brief

## Goal

Fehlerursache minimal und belastbar beheben, sodass die Start-UI vor Spielstart auch bei Aufruf über die tatsächlich unterstützten Pfade `game` und/oder `game.html` sichtbar ist.

Widerspruch aus Spec/Review wird wie folgt aufgelöst:
- Es wird **nicht** vorausgesetzt, dass `game` oder `game.html` automatisch gültige Einstiegspfade sind.
- Zuerst ist im Repo zu prüfen, welche dieser Pfade real existieren oder explizit unterstützt werden.
- **Nur** für nachweislich unterstützte Pfade wird ein Fix umgesetzt.
- Falls die Bugmeldung Pfade nennt, die im Repo nicht unterstützt sind, wird das explizit dokumentiert statt durch neue Routing-Logik zu “erfinden”.

## Scope

Enthalten:
- Analyse des tatsächlichen Einstiegs über `/`, `game`, `game.html` im Repo
- Identifikation der konkreten Ursache:
  - fehlender/abweichender Einstiegspunkt
  - falscher Redirect/Rewriter-Hinweis im Projekt
  - abweichende HTML-Struktur
  - Initialisierungslogik blendet Overlay aus
  - Asset-/Pfadproblem
- Minimaler Fix zur Wiederherstellung der sichtbaren Start-UI vor Spielstart
- Regression-Schutz für den bestehenden Einstieg über `index.html`

Nicht automatisch enthalten:
- Einführung neuer Navigation
- Ausbau eines Router-Systems
- Hosting-/Server-Neukonfiguration ohne klaren Repo-Bezug

## Constraints

- Vor jeder Änderung zuerst `docs/DOMAIN_MODEL.md`, `docs/INVARIANTS.md`, `docs/ARCHITECTURE.md`, `docs/ADR/` prüfen; falls fehlend oder ohne Aussage, das knapp festhalten.
- Minimal safe change only.
- Keine neue Business-Logik erfinden.
- Keine stillschweigende Entscheidung zugunsten neuer Einstiegspfade.
- Wenn getesteter Code und Doku/Spec kollidieren: Drift in `ai/current-state/drift-register.md` dokumentieren.
- Fix darf das Verhalten **nach** Spielstart nicht unbeabsichtigt ändern.
- Falls `game`/`game.html` nicht unterstützt sind, ist die korrekte Minimalmaßnahme Dokumentation bzw. klarer Alias/Redirect **nur wenn dafür bereits Projektmuster oder bestehende Referenzen im Repo existieren**.

## File targets

Primär zu prüfen:
- `index.html`
- mögliche Dateien:
  - `game`
  - `game.html`
  - weitere HTML-Einstiegspunkte
- von Einstiegspunkten geladene JS-Dateien, insbesondere:
  - `auth-state.js`
  - Inline-Script-Bezug aus `index.html`
- projektweite Referenzen auf:
  - `game`
  - `game.html`
  - `#overlay`
  - `menu-content`
  - `.hidden`

Optional nur falls erforderlich:
- Server-/Hosting-Konfigurationsdateien im Repo, z. B. Rewrite-/Redirect-Dateien
- `ai/current-state/drift-register.md` bei festgestelltem Drift

## Tests required

Mindestens diese Prüfungen durchführen und dokumentieren:

1. Einstiegspunkt-Inventur
- Existiert `index.html` als funktionierender Einstiegspunkt
- Existiert `game` als Datei, Route-Hinweis oder Linkziel im Repo
- Existiert `game.html` als Datei oder Linkziel im Repo

2. Sichtbarkeits-Checks pro unterstütztem Einstiegspunkt
- Vor Spielstart ist `#overlay` im DOM vorhanden
- Overlay ist sichtbar und nicht unbeabsichtigt verborgen
- Titel und `#menu-content` sind vorhanden
- Keine Initialisierung entfernt oder versteckt das Overlay sofort beim Laden

3. Regression
- Standardaufruf über `index.html` bzw. `/` zeigt weiterhin die Start-UI korrekt
- Spielstartfluss wird nicht regressiv blockiert, sofern dafür ein bestehender manueller oder automatisierter Check vorhanden ist

4. Falls `game` oder `game.html` nicht unterstützt sind
- Nachweis dokumentieren, dass kein stiller Support ergänzt wurde
- Falls ein bestehender Repo-Mechanismus für Alias/Weiterleitung genutzt wurde, diesen gezielt testen

## Chosen minimal policy

Bevorzugte Entscheidungsreihenfolge:

1. **Wenn `game.html` oder `game` existiert und eine abweichende/defekte Start-UI hat:**  
   Fix direkt am betroffenen Einstiegspunkt oder in der gemeinsamen Initialisierung.

2. **Wenn alternative Pfade auf denselben Einstieg zeigen sollen und das im Repo bereits angelegt ist:**  
   Bestehenden Alias/Redirect reparieren, nicht neu erfinden.

3. **Wenn nur `index.html` offiziell existiert und keine belastbare Unterstützung für `game`/`game.html` nachweisbar ist:**  
   Keine neue Route bauen; Abweichung dokumentieren und nur offensichtliche fehlerhafte interne Verlinkungen auf den echten Einstieg korrigieren.

Das ist die bewusst minimale Auflösung der Spec-Unsicherheit und der Gemini-Kritik.

## Risks

- Die eigentliche Ursache kann im nicht sofort sichtbaren Inline-JS oder in gemeinsam geladener Initialisierungslogik liegen.
- Relative Asset-Pfade können bei alternativen HTML-Dateien anders brechen als beim Root-Einstieg.
- Ein Eingriff in Overlay-Sichtbarkeit kann unbeabsichtigt die Hide-Logik nach Spielstart beschädigen.
- Lokales Repo-Verhalten und produktives Hosting-Rewrite-Verhalten können abweichen.
- Die Bugmeldung kann sich auf historische, heute nicht mehr unterstützte Pfade beziehen.

## Explicit non-goals

- Kein neuer Client-Router
- Keine generelle URL-Strategie für das Projekt entwerfen
- Keine Neugestaltung der Start-UI
- Keine Änderung des Game-Flows jenseits der Vor-Spielstart-Sichtbarkeit
- Kein stillschweigendes Anlegen neuer Dateien oder Routen nur um die Bugmeldung formal zu erfüllen
- Keine serverseitige Infrastrukturarbeit außerhalb bereits vorhandener Repo-Konfigurationen

## Related Documents
- [[ai/specs/T-0018_spec.md|T-0018 spec]]
- [[ai/reviews/T-0018_gemini_review.md|T-0018 review]]
- [[ai/results/T-0018_executor_report.md|T-0018 result]]
- [[ai/followups/T-0018_followups.md|T-0018 followup]]
- [[ai/pr/T-0018_pr_draft.md|T-0018 pr-draft]]
