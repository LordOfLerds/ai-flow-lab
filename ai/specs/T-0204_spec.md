# T-0204 Spec

## Task metadata

- task_id: T-0204
- title: Build task comparison view
- lane_type: feature-lane
- executor: codex

## Problem statement

The project README should greet users with a friendly welcome message immediately after the main title. This improves user experience by setting a welcoming tone at first glance.

## Source of truth

The README file is the primary documentation entry point for all users. Any changes must respect its existing structure, links, and information hierarchy. The change should be non-intrusive and not duplicate or conflict with existing sections.

## Desired behavior

- Users opening the README see a friendly greeting after the main h1 title
- The greeting is concise (3-4 sentences) and sets a welcoming tone
- The greeting does not break any markdown formatting or links in the document
- The greeting is positioned consistently with standard README conventions (right after the title, before the main body)

## Constraints

- No changes to existing sections or links
- No modifications to metadata, badges, or header areas (if present)
- The greeting must be a markdown section (## Welcome or similar)
- Must maintain the document's semantic structure

## Acceptance criteria

1. A new "## Welcome" or similar greeting section is added immediately after the main h1 title
2. The greeting contains 3-4 sentences with a friendly, inviting tone
3. The markdown renders correctly in GitHub (no syntax errors)
4. All existing links, sections, and structure remain unchanged
5. The file passes basic markdown validation

## Risks

- Risk: If the README has custom formatting or embedded HTML, markdown injection could break rendering
  - Mitigation: Validate the greeting only uses standard markdown syntax
- Risk: Greeting could feel out of place if repo has a formal tone established elsewhere
  - Mitigation: Coordinate greeting tone with project AGENTS.md or CONTRIBUTING guidelines if they exist
- Risk: ToC may need updating if it exists (handled in follow-up task P-2)
  - Mitigation: Defer ToC updates to a separate task

## Open questions

- Does the README have a table of contents that would need updating?
- Are there any branding or style guidelines documented in AGENTS.md or elsewhere?
- Should the greeting mention specific project benefits or just be generic?
