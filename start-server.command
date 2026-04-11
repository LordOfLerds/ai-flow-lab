#!/bin/bash
# ─── AI Flow Lab: Start Server ───
# Double-click this file in Finder or run from Terminal.
# Do NOT run from inside Cowork/Claude sandbox — it won't work there.

set -euo pipefail

# Ensure node is on PATH (Homebrew / nvm / fnm)
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node/" 2>/dev/null | tail -1)/bin:$PATH"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AUTOMATION_DIR="$SCRIPT_DIR/automation"

echo "═══════════════════════════════════════════════════"
echo "  AI Flow Lab — Start Server (APP mode)"
echo "  Project root: $SCRIPT_DIR"
echo "═══════════════════════════════════════════════════"

cd "$AUTOMATION_DIR"

# Load .env explicitly
if [ -f .env ]; then
  set -a
  source .env
  set +a
  echo "✓  Loaded .env (LLM_MODE=$LLM_MODE, GEMINI_MODEL=${GEMINI_MODEL:-default})"
else
  echo "⚠  No .env found at $AUTOMATION_DIR/.env"
fi

# Force APP mode
export LLM_MODE=app

echo ""
echo "▶  Starting server..."
echo "   Dashboard: http://localhost:${PORT:-3847}"
echo "   Press Ctrl+C to stop"
echo ""

node scripts/serve-dashboard.mjs
