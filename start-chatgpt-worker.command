#!/bin/bash
# ─── AI Flow Lab: ChatGPT Browser Worker ───
# Double-click this file in Finder to start the worker.
# First run: starts with --headed so you can log in to ChatGPT.
# After login, the session is saved and you can run headless.

set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node/" 2>/dev/null | tail -1)/bin:$PATH"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AUTOMATION_DIR="$SCRIPT_DIR/automation"

echo "═══════════════════════════════════════════════════"
echo "  AI Flow Lab — ChatGPT Browser Worker"
echo "═══════════════════════════════════════════════════"

cd "$AUTOMATION_DIR"

# Load .env
if [ -f .env ]; then
  set -a
  source .env
  set +a
  echo "✓  Loaded .env (CHATGPT_CHAT_URL=${CHATGPT_CHAT_URL:-not set})"
fi

# Check if profile exists (first run = headed)
PROFILE_DIR="$AUTOMATION_DIR/state/.chatgpt-profile"
if [ -d "$PROFILE_DIR" ] && [ "$(ls -A "$PROFILE_DIR" 2>/dev/null)" ]; then
  echo "✓  Browser profile found — running headless"
  echo "   (use --headed flag to see the browser)"
  EXTRA_FLAGS=""
else
  echo "⚠  No browser profile — running HEADED for first login"
  echo "   Log into ChatGPT in the browser window, then the worker continues."
  EXTRA_FLAGS="--headed"
fi

echo ""
echo "▶  Starting worker..."
echo "   Press Ctrl+C to stop"
echo ""

node scripts/chatgpt-browser-worker.mjs $EXTRA_FLAGS
