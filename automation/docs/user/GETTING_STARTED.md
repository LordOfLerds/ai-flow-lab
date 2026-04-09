# Getting Started with AI Flow Lab

## What is AI Flow Lab?

AI Flow Lab is a hosted SaaS platform for automated code development. It uses a 7-step intelligent pipeline to architect features, critique designs, synthesize implementations, and execute code changes—reducing manual development cycles from weeks to hours. Connect your repository, define a goal, and watch AI agents collaborate end-to-end.

## Prerequisites

### For SaaS
- Modern web browser (Chrome, Firefox, Safari, Edge)
- GitHub account with repository access
- No software installation required

### For Local Development
- Node.js 20 or later
- Git 2.30+
- One or more API keys:
  - OpenAI (for architect step)
  - Google Gemini (for critic step)
  - Anthropic Claude (for executor step)

## SaaS Quick Start

1. **Sign in** at `app.aiflowlab.com` with your GitHub account
2. **Connect a repository**: Select existing repo or authorize GitHub OAuth
3. **Auto-analysis**: Platform analyzes your codebase (language, dependencies, structure)
4. **Doc generation**: ARCHITECTURE.md, DOMAIN_MODEL.md, and INVARIANTS.md are auto-generated
5. **Create a goal**: Write a high-level objective ("Add multi-factor authentication")
6. **Run first cascade**: Click "Run → Cascade". Watch the 7-step pipeline execute
7. **Review results**: View generated spec, code changes, and PR draft in real time

## Local Dev Setup

```bash
# Clone the repository
git clone https://github.com/yourgithub/ai-flow-lab.git
cd ai-flow-lab

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Configure API keys (in .env)
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
CLAUDE_API_KEY=sk-ant-...
LLM_MODE=api  # or 'cli', 'app', 'mock'

# Start server
npm start

# Open dashboard
open http://localhost:3000
```

**LLM_MODE options:**
- `api`: All steps automated end-to-end (fast, requires all API keys)
- `cli`: Uses Claude CLI for execution steps (requires `claude --print`)
- `app`: Hybrid—OpenAI steps manual (ChatGPT desktop), Gemini/Claude automatic
- `mock`: Testing mode; uses fixture files instead of real API calls

## Next Steps

- **Understand core concepts**: Read [CONCEPTS.md](./CONCEPTS.md)
- **Configure your workspace**: See [CONFIGURATION.md](./CONFIGURATION.md)
- **Choose execution mode**: Learn [MODES.md](./MODES.md)
- **Troubleshoot issues**: Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
