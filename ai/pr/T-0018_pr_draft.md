# [T-0018] Start UI nicht mehr vorhanden wenn auf game oder game.html

## Summary
Start UI nicht mehr vorhanden wenn auf game oder game.html

**Task ID**: T-0018
**Parent Goal**: none
**Parent Task**: none
**Lane**: bug-lane
**Executor**: codex

## What Changed
Start UI nicht mehr vorhanden wenn auf game oder game.html


codex


- `game.html`
- `automation/ui/game.html`
- `ai/current-state/drift-register.md`




- **Created `game.html` at root level** - A redirect page that immediately forwards users to `index.html` using both meta refresh and JavaScript r…

## Spec Summary
- task_id: T-0018
- title: Start UI nicht mehr vorhanden wenn auf game oder game.html
- lane_type: bug-lane
- executor: codex



Der gemeldete Fehler beschreibt, dass die Start-UI nicht mehr sichtbar ist, wenn die Anwendung über `game` oder `game.html` aufgerufen wird.

Im bereitgestellten Code-Kont…

## Review Highlights
Spec for bug fix regarding missing start UI when accessing application via `game` or `game.html` paths.



The spec contains a fundamental contradiction: it aims to fix a bug involving `game` and `game.html` entry points while simultaneously acknowledging these files may not exist in the codebase. T…

## Implementation Brief
Fehlerursache minimal und belastbar beheben, sodass die Start-UI vor Spielstart auch bei Aufruf über die tatsächlich unterstützten Pfade `game` und/oder `game.html` sichtbar ist.

Widerspruch aus Spec/Review wird wie folgt aufgelöst:
- Es wird **nicht** vorausgesetzt, dass `game` oder `game.html` au…

## Linked Decisions
(none)

## Validation
- [ ] Spec written and reviewed
- [ ] Implementation brief synthesized
- [ ] Executor report completed
- [ ] Follow-ups proposed

- [ ] Tests pass (if applicable)
- [ ] No regressions in existing functionality

## Risks
issue

## Non-Goals
(see spec)

## Follow-Up Notes
T-0018 restored Start-UI visibility for the reported access paths, but the executor achieved this with a mixed approach:

- added a root-level `game.html` redirect to `index.html`
- changed `automation/ui/game.html` so it now stays in menu state and shows a Start UI on load
- documented the finding …

---
**Branch**: `bug/T-0018-start-ui-nicht-mehr-vorhanden-wenn-auf-game-oder-game-html` → `main`
**Generated**: 2026-04-07T20:18:10.182Z
**Generator**: generate-pr-draft.mjs
