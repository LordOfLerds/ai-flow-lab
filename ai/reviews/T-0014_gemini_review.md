# T-0014 Gemini Review

## Review target
- **Task ID:** T-0014
- **Title:** Alle Docs für das Jump and Run nachziehen
- **Spec File:** `ai/specs/T-0014_spec.md`

## Contradictions
- **Executor Mismatch:** The spec metadata lists `Executor: codex`, but `CLAUDE.md` and `AGENTS.md` explicitly state that `Claude` is the **Executor**. 
- **Source of Truth Hierarchy:** The spec says `index.html` acts as the "practical behavior reference" because docs are missing, but `AGENTS.md` says to document conflicts in the `drift-register.md` if docs and code disagree. If the docs are missing, there is no "disagreement," only "inference." This needs to be handled carefully so as not to treat inferred documentation as "confirmed truth."

## Missing edge cases
- **Asset Sources:** The spec does not mention documenting where game assets (images, sounds, fonts) come from (embedded Base64, external URLs, or local paths). This is critical for `ARCHITECTURE.md`.
- **Browser/Environment Requirements:** The documentation should specify the required runtime (e.g., HTML5 Canvas support, minimum screen resolution for the HUD).
- **Persistence:** If the game uses `localStorage` for XP, skins, or progress, this must be captured in the `DOMAIN_MODEL.md` and `ARCHITECTURE.md`.
- **Input Mapping:** Documentation needs to account for both Keyboard (Desktop) and Touch (Mobile) if present in the code, as these are distinct domain behaviors.

## Scope risks
- **Retroactive ADRs:** Creating ADRs (Architectural Decision Records) for a system that is already built can lead to "invented history." The risk is that the executor might justify existing code as a "decision" when it might have been an accident or a temporary hack.
- **Monolith Analysis:** Since `index.html` is a single file, extracting a clean `ARCHITECTURE.md` that suggests modularity might be misleading if the code is actually a flat monolith.
- **Language Inconsistency:** The task title is German, but the system docs (`AGENTS.md`, etc.) are English. There is a risk of mixed-language documentation if not explicitly restricted to English.

## Missing tests
- **Cross-Reference Check:** A requirement to verify that all entities mentioned in `DOMAIN_MODEL.md` actually exist as classes/objects/variables in `index.html`.
- **Broken Link Verification:** If multiple files are created (`ARCHITECTURE.md`, `INVARIANTS.md`), they must be checked for internal cross-linking consistency.

## Hidden assumptions
- **Language:** It is assumed that the documentation should be written in English despite the German task title.
- **Completeness of `index.html`:** The spec assumes that the provided `index.html` is the "latest" version and contains all features intended for documentation.
- **Persistence of `drift-register.md`:** The spec assumes this file exists or should be created, but it is not listed in the "Primary truth" section of the spec.

## Recommended corrections
- **Update Metadata:** Change `Executor: codex` to `Executor: claude` to align with `CLAUDE.md`.
- **Define Language:** Explicitly state that all generated documentation must be in **English**.
- **Technical Scope Additions:** Ensure `Desired Behavior` explicitly includes documentation of:
    - Rendering tech (e.g., Canvas API)
    - Persistence strategy (e.g., LocalStorage)
    - Input handling (Keyboard/Mouse/Touch)
- **ADR Constraint:** Add a constraint: "Do not create ADRs for standard implementations; only create ADRs if the code reveals a specific, non-trivial architectural choice (e.g., a custom physics engine vs. a library)."
- **Identify File Creation:** Explicitly authorize the creation of `ai/current-state/drift-register.md` if it is missing and conflicts are found.