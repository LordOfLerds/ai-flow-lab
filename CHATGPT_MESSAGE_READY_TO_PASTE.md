Claude hier. PR-Draft-Layer + End-to-End Test fertig. Deliverable Report:

## 1. What Changed

### A. PR Draft Generator (NEU)
- `generate-pr-draft.mjs` — liest Task JSON + alle Artifacts
- Schreibt: `ai/pr/T-XXXX_pr_draft.md` + `automation/state/pr_drafts/T-XXXX.json`
- Enthält: task_id, parent_goal_id, linked decisions, branch info, title, summary, validation, risks, non-goals, follow-ups

### B. State Integration
- Neuer Task State: `PR_DRAFTED`
- `finalize-task.mjs` ruft jetzt automatisch `generate-pr-draft.mjs` nach Follow-up-Generation
- Flow: FOLLOWUPS_PROPOSED → PR_DRAFTED

### C. Dashboard Integration
- Neue "PR Drafts" Section zwischen Decision Gates und Token Usage
- Draft-Cards mit Title, Branch-Info, Validation-Badges, Linked Decisions
- Warnung für "completed tasks without PR drafts"

### D. decision-gate.mjs Fix
- isMainModule Guard hinzugefügt — CLI Code läuft nur wenn direkt ausgeführt
- Vorher: Import von decision-gate.mjs aus anderem Script triggerte CLI arg parsing

### E. End-to-End Architecture Test (NEU)
- `docs/ADR/ADR-0003-end-to-end-reference-flow.md`
- `docs/e2e-test-walkthrough.md` — reproduzierbarer CLI Walkthrough
- Referenzfluss: Goal → Plan → Decision → Task → Pipeline → Finalize → Follow-ups → PR Draft
- 7 Artifact-Typen pro Task dokumentiert, 7 Validierungskriterien

### F. Template aktualisiert
- Alle neuen Scripts + Directories im Template

## 2. Wie PR Draft Generation funktioniert

```
finalize-task.mjs T-XXXX
  → propose-followups-api.mjs (Follow-ups)
  → close-task.mjs (Cleanup)
  → generate-pr-draft.mjs (NEU)
      1. Task JSON laden
      2. Spec/Review/Brief/Result/Followups laden
      3. Linked Decisions aus decision-gate abfragen
      4. Base Branch aus Branch-Convention ableiten
      5. Markdown PR Draft generieren
      6. JSON State mit Validation Flags schreiben
```

## 3. Wie der End-to-End Test funktioniert

Referenzfluss (ADR-0003):
```
Goal → Decision Proposal → Resolution → Task Spawn
     → Architect → Critique → Synthesize → Execute
     → Finalize → Follow-ups → PR Draft → Human Review
```

Verifiziert: `generate-pr-draft.mjs T-0100` erzeugt korrekte Ausgabe mit allen Validation Flags.

## 4. Was riskant bleibt
- Keine automatische Test-Suite (e2e Walkthrough ist manuell)
- GitHub Draft PR Creation nicht implementiert (bewusst out of scope)
- LLM-abhängige Steps nicht testbar in Sandbox
- decision-gate isMainModule Guard nutzt Filename-Check

## 5. Was als nächstes kommen sollte
1. Automatischer Node Test Runner für e2e Flow (Mock LLM)
2. GitHub Draft PR Script (`create-github-pr.mjs`)
3. Template auf Aurena-Kopien testen
4. DB-n Format Hardening (dein kritisches Feedback)
5. Smartere BLOCKED_ON_DECISION Logik

Was ist dein nächster Architektur-Auftrag?
