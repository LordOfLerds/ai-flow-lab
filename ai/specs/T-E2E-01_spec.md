# T-E2E-01 Spec

## Task metadata
- **Task ID**: T-E2E-01
- **Title**: E2E Test: Add version info to README
- **Lane**: docs-lane
- **Executor**: claude
- **Task Type**: Documentation enhancement

## Problem statement
The AI Flow Lab project currently lacks a clear README.md file in the root directory with version information. This makes it difficult for users and contributors to understand what version of the system they are working with, what features are available in the current version, and how versioning is managed across the project.

## Source of truth
- Current repository structure shows no README.md in root directory
- Project has complex automation pipeline with multiple components
- Git history shows recent significant changes to project structure and capabilities
- Documentation exists in docs/ directory but lacks centralized entry point
- **Uncertainty**: Code appears to be ahead of documentation based on recent commit history

## Desired behavior
Create a comprehensive README.md file in the project root that includes:
- Project version information (semantic versioning)
- Brief project description and purpose
- Component version matrix (automation scripts, AI agents, dashboard)
- Installation and setup instructions
- Quick start guide
- Links to detailed documentation in docs/
- Changelog or release notes reference

## Constraints
- Must follow standard README.md conventions
- Version info should align with git tags/releases if they exist
- Should not duplicate information already well-documented elsewhere
- Must be maintainable (version info shouldn't require manual updates for every change)
- Should integrate with existing project structure and docs/

## Acceptance criteria
1. README.md file exists in project root
2. Contains clear version information in standard format (e.g., v1.0.0)
3. Includes component version matrix showing:
   - Automation pipeline version
   - AI agent system version  
   - Dashboard version
   - Any other major subsystem versions
4. Provides clear project description and purpose
5. Links to existing documentation in docs/ directory
6. Follows markdown best practices
7. Is consistent with project's technical documentation style
8. Includes installation/setup instructions
9. Version information is accurate and verifiable

## Risks
- **Version drift**: Manual version management could become stale
- **Duplication**: May duplicate information from other docs files
- **Maintenance burden**: README could become outdated as project evolves
- **Version confusion**: Without proper git tagging strategy, version numbers may be arbitrary
- **Scope creep**: README could become too comprehensive and unwieldy

## Open questions
1. Does the project follow semantic versioning or another versioning scheme?
2. Are there existing git tags that define versions?
3. Should version info be automated (e.g., from package.json, git tags) or manual?
4. What level of detail is appropriate for the component version matrix?
5. Should the README reference the automation pipeline's own versioning system?
6. How should version updates be coordinated with the AI agent workflow?
7. Should version info include build numbers or commit hashes for development builds?