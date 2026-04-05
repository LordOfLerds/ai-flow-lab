# AI Agents Configuration

This file describes the AI agents available to execute tasks in this project and how they are assigned.

## Available Agents

### Claude (Opus 4)

**Role**: Senior Architect, System Designer, Debugging Expert

**Strengths**:
- Deep system analysis and architecture
- Complex debugging and root cause analysis
- Dangerous refactors and migrations
- Security and performance reviews
- Integration work with external systems

**Capabilities**:
- 200k token context window
- Advanced reasoning and analysis
- Code review and architecture design
- API design and specification

**Best For**:
- analysis-lane tasks (read-only investigation)
- bug-lane tasks (complex debugging)
- danger-lane tasks (refactors, migrations)

**Model**: claude-opus-4

**Reference**: See `CLAUDE.md` for detailed instructions

---

### Codex (GPT-4o)

**Role**: Feature Developer, Test Engineer, Documentation Writer

**Strengths**:
- Building new features from specifications
- Test writing and test infrastructure
- API documentation and guides
- Code generation and implementation
- Content creation

**Capabilities**:
- 128k token context window
- Fast code generation
- Pattern matching and code templates
- Documentation generation

**Best For**:
- feature-lane tasks (new features)
- test-lane tasks (test writing)
- docs-lane tasks (documentation)

**Model**: gpt-4o

**Reference**: See `GEMINI.md` for detailed instructions

---

## Lane Assignments

Each task lane is assigned to one or more agents:

| Lane | Default Executor | Use Cases | Can Merge | Requires Gate | Notes |
|------|------------------|-----------|-----------|---------------|-------|
| **analysis-lane** | Claude | Code review, diagnosis, investigation | No | No | Read-only exploration and analysis |
| **bug-lane** | Claude | Bug fixes, debugging, root causes | Yes | Yes | Assign to Claude for complex issues |
| **feature-lane** | Codex | New features, enhancements | Yes | Yes | Standard feature development |
| **danger-lane** | Claude | Refactors, migrations, breaking changes | Yes | Yes | Requires human approval before PR |
| **docs-lane** | Codex | Documentation, guides, examples | Yes | No | Generally safe changes |
| **test-lane** | Codex | Unit tests, integration tests | Yes | No | Test infrastructure and coverage |

## Agent Selection Logic

When creating a task, assign it to a lane based on the work type:

1. **Is it mostly analysis/diagnosis?** → analysis-lane (Claude, read-only)
2. **Is it fixing a specific bug?** → bug-lane (Claude)
3. **Is it building new functionality?** → feature-lane (Codex)
4. **Does it involve breaking changes or major refactors?** → danger-lane (Claude)
5. **Is it documentation or examples?** → docs-lane (Codex)
6. **Is it test infrastructure or coverage?** → test-lane (Codex)

## Fallback Agents

If the primary executor is unavailable:

- **For Claude tasks**: Can use Codex for safe implementations if analysis is complete
- **For Codex tasks**: Can use Claude if deep system knowledge is required

## Task Context Provided

When a task is assigned to an agent, provide:

1. **Truth Sources**: DOMAIN_MODEL.md, INVARIANTS.md, ARCHITECTURE.md
2. **Project Config**: ai/project.config.yaml with lane definitions
3. **Related Decisions**: From decisions/ directory
4. **Previous Work**: Related completed tasks and results
5. **Code Context**: Relevant source files and examples

## Agent Communication

### Claude's Approach
- Extensive analysis and explanation
- Proposes before implementing
- Documents reasoning in decisions/
- Flags risks and assumptions
- Clear communication of blockers

### Codex's Approach
- Clear, well-commented code
- Comprehensive testing
- Complete documentation
- Self-contained implementations
- Example-driven approach

## Custom Agents

To add a custom agent:

1. Create a new file: `{AGENT_NAME}.md`
2. Define the agent's role, strengths, and instructions
3. Add a new lane in `ai/project.config.yaml` with the agent as default_executor
4. Update this file with the agent's details

Example:
```markdown
# MyAgent Instructions

**Role**: Custom role
**Strengths**: List strengths
**Best For**: List use cases
```

## Escalation Paths

If a task is too complex for the assigned agent:

1. **Claude task is too narrow**: Keep with Claude (more time)
2. **Codex task needs architecture**: Escalate to Claude
3. **Claude task is just implementation**: Hand off to Codex
4. **No agent can do it**: Create a task proposal for human discussion

## Performance Metrics

Track agent performance:

- Tasks completed per agent
- Average task duration
- Error rates and blockers
- Quality of implementations
- Documentation completeness

Review quarterly and adjust assignments if needed.

## LLM Mode Considerations

### API Mode (Using REST APIs)
- Both agents available simultaneously
- Rate limiting may apply
- Latency: 2-5 seconds per call
- Cost per task: varies by tokens

### App Mode (Using ChatGPT Desktop)
- Single agent at a time
- Better interactivity
- Faster iteration cycles
- No API cost

See `automation/.env` for LLM_MODE configuration.

## Integration with Human Review

All task results must pass:

1. **Human Gate**: If lane requires approval before merge
2. **Code Review**: Quality check before landing
3. **Testing**: Pass all tests and coverage requirements
4. **Documentation**: Complete and accurate

Agents should expect and welcome human feedback.
