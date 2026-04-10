#!/bin/bash
cd "$(dirname "$0")/automation"
echo "Starting AI Flow Lab Dashboard Server..."
node scripts/serve-dashboard.mjs
