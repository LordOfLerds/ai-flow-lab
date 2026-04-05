Claude hier. Mock-LLM Test Harness + E2E Runner fertig. Deliverable Report:

## 1. What Changed

### A. Mock LLM Mode (NEU)
- `LLM_MODE=mock` in `_llm-utils.mjs`
- `loadMockResponse()` mit Fixture-Fallback: spezifisch → step-default → global-default → generiert
- `callOpenAI()` und `callGemini()` prüfen Mock-Mode vor API-Call
- Usage-Logging funktioniert auch in Mock-Mode

### B. Step/TaskId Params für alle Pipeline Scripts
- Alle 5 API-Scripts (plan-goal, architect, critique, synthesize, propose-followups) übergeben jetzt `taskId` und `step` an die LLM-Calls
- Das war notwendig damit Mock-Mode die richtigen Fixtures laden kann

### C. Test Fixture Struktur (NEU)
```
automation/test-fixtures/
├── goals/E2E-TEST.json
└── llm/
    ├── plan-goal/default.md       (Mock Planner Output mit ### P-N und ### DB-N Blöcken)
    ├── architect/default.md       (Mock Spec)
    ├── critique/default.md        (Mock Review)
    ├── synthesize/default.md      (Mock Brief)
    ├── propose-followups/default.md (Mock Follow-ups mit ### F-N Blöcken)
    └── generic/default.md         (Global Fallback)
```

### D. Automatischer E2E Test Runner (NEU)
- `run-e2e-test.mjs` — 10 Phasen, vollautomatisch
- Flow: Goal → Plan → Decision → Spawn → Architect → Critique → Synthesize → Execute(mock) → Finalize → PR Draft
- **59 Assertions, alle grün, 0.3 Sekunden**
- Schreibt `state/e2e-test-result.json` für Dashboard
- Cleanup: entfernt allen Test-State nach Run (oder `--keep` zum Debuggen)

### E. Format Hardening
- Tolerante Regex: `\r\n`, optionale Whitespace nach Headings
- Toleranter Field Parser: `- field:`, `**field**:`, `field:` (case-insensitive)
- Warnings bei leerem Parse-Ergebnis
- Angewandt auf: plan-goal-api.mjs, propose-followups-api.mjs

### F. Dashboard
- Mock-Mode Badge (lila)
- E2E Test Result Widget im Header (pass/fail, Zeit, Timestamp)
- `serve-dashboard.mjs` gibt `mode` und `e2e_test_result` zurück

### G. Template aktualisiert
- Alle geänderten Scripts + Runner + Fixtures + Dashboard im Template

## 2. Wie der E2E Runner funktioniert

```
LLM_MODE=mock node scripts/run-e2e-test.mjs [--keep]

Setup → Phase 1-10 → Cleanup
  1. plan-goal-api.mjs G-E2E       → plan + proposals + decisions
  2. decision-gate.mjs resolve DP-* → decision records
  3. spawn-from-goal-proposal.mjs   → T-E2E-P1
  4. architect-task-api.mjs         → spec
  5. critique-task-api.mjs          → review
  6. synthesize-task-api.mjs        → brief
  7. (mock executor report)
  8. propose-followups-api.mjs      → followups + proposals
  9. generate-pr-draft.mjs          → PR draft
  10. Invariant checks (artifact paths, linkage, usage log)
```

Ergebnis: 59/59 ✓ in 0.3s

## 3. Was riskant bleibt
- Worktree/Branch Steps nicht getestet (kein echtes Git im E2E)
- close-task.mjs nicht getestet (braucht echte Worktrees)
- Decision Resolution ist auto-resolved (immer recommended_default)
- Fixture-Format könnte von echtem LLM-Output driften

## 4. Was als nächstes kommen sollte
1. Template auf Aurena-Kopien testen
2. GitHub Draft PR Script
3. Worktree Mock Support
4. Fixture Vielfalt (Fehlerfälle, Edge Cases)
5. CI Integration (GitHub Actions)

Was ist dein nächster Architektur-Auftrag?
