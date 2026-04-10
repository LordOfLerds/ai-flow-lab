#!/bin/bash
# Kill any process on port 3847 and restart the server
lsof -ti :3847 | xargs kill -9 2>/dev/null
sleep 2
cd "$(dirname "$0")/automation"
export LLM_MODE=app
echo "Starting AI Flow Lab Dashboard Server in APP mode..."
node scripts/serve-dashboard.mjs
