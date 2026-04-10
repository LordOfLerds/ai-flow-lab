# T-0017 Implementation Brief

## Goal

Stop passive score gain so the score increases only from measurable in-game progress, not from elapsed time alone.

Resolve ambiguity minimally: for this task, treat “progress” as **actual player world-position advancement used by the current movement/scoring model**, and **do not award score from input state, animation state, or frame/time progression**. If repository docs define progress differently, document that conflict in `ai/current-state/drift-register.md` before proceeding.

## Scope

- Inspect the declared source-of-truth docs first:
  - `docs/DOMAIN_MODEL.md`
  - `docs/INVARIANTS.md`
  - `docs/ARCHITECTURE.md`
  - `docs/ADR/`
- Inspect the current scoring path in gameplay code.
- Replace or gate any time-based/passive score increment so score changes only when the player’s actual in-game progress advances.
- Keep HUD score rendering unchanged except to ensure it reflects the corrected underlying score.
- Add/update focused tests for the scoring behavior.

## Constraints

- Prefer the smallest safe fix in existing scoring logic.
- Do not redesign scoring beyond what is required for this bug.
- Resolve the spec ambiguity explicitly:
  - Use **observed displacement/progress in game state** as the minimal policy.
  - **Do not** use player input alone.
  - **Do not** let score decrease if the player moves backward; score should track forward progress/high-water progress only unless docs explicitly say otherwise.
- If “progress” is documented differently in repo docs, do not silently choose code behavior; record the drift and implement according to docs or stop if blocked.
- Preserve task isolation and avoid unrelated gameplay changes.

## File targets

- `docs/DOMAIN_MODEL.md`
- `docs/INVARIANTS.md`
- `docs/ARCHITECTURE.md`
- `docs/ADR/`
- Gameplay scoring source file(s): locate the game loop / score update path and the player/world progress state.
- HUD/UI file(s) that display score, if needed only for verification:
  - `index.html`
- Test files covering gameplay/scoring behavior.
- `ai/current-state/drift-register.md` only if docs and code conflict or docs are missing/insufficient for a safe interpretation.

## Tests required

- Stationary test: score does not change over multiple update ticks when player world position does not advance.
- Time-only test: score does not increase from elapsed frames/time alone.
- Forward-progress test: score increases when the player advances in the tracked progress direction.
- Blocked-movement test: score does not increase when movement input is active but position does not change.
- Backtracking/high-water test: score does not decrease if the player moves backward after previously advancing.
- HUD consistency test if test infrastructure supports it: rendered score matches underlying score state after progress and no-progress updates.

## Chosen minimal policy

Use **forward progress based on actual game-state displacement/high-water position**, not elapsed time.

Explicit contradiction resolution:
- The spec says not to invent new business rules, but some definition of progress is required. The narrowest non-inventive choice is: **score from actual advancement already represented by player/world coordinates in the existing game loop**.
- “Not moving” means **no scoreable displacement**, not merely “no input” and not merely “non-zero velocity.”
- If the player presses movement into a wall, score should not increase.
- If the player moves backward, score should not go down; only newly reached forward progress should add score.
- Do not count passive frame progression as score.

## Risks

- Repo docs may define progress differently than horizontal/world displacement.
- The game may use camera motion, auto-scroll, moving platforms, or other environmental motion that complicates what counts as player progress.
- Current score updates may be entangled with a shared loop/timer used elsewhere.
- If no tests exist around scoring, adding narrowly targeted coverage may require light harness setup.

## Explicit non-goals

- Do not redesign the entire scoring system.
- Do not change unrelated HUD elements or visual styling.
- Do not introduce new progression mechanics, multipliers, bonuses, or penalties.
- Do not redefine difficulty pacing, spawning, or timer-based systems unless they are directly part of the score increment path.
- Do not implement objective-based scoring, combo systems, or vertical-progress rules unless existing docs explicitly require them.