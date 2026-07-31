#!/bin/bash
# ============================================================
#  SiteLens launcher — starts the server & opens the dashboard
# ============================================================
#  Port: 3456 (avoids the hotels-vendors dev server on 3000
#  and any other localhost dev server). Production mode
#  (`next start`) is used because it is stable and fast.
# ============================================================

PROJECT_DIR="/Users/Moataz/.zcode/workspace/default/ai-website-audit-platform"
PORT=3456
URL="http://localhost:${PORT}"

cd "$PROJECT_DIR" || { echo "SiteLens: project folder not found at $PROJECT_DIR"; read -r -p "Press Enter to close..."; exit 1; }

# --- If the server is already up, just open the browser ---
if curl -s -o /dev/null --max-time 3 "http://localhost:${PORT}/api/health"; then
  echo "SiteLens is already running — opening ${URL}"
  open "$URL"
  exit 0
fi

# --- Build if there is no production build yet ---
if [ ! -d ".next" ] || [ ! -d ".next/server" ]; then
  echo "Building SiteLens (first launch can take a minute)..."
  npm run build
fi

echo "Starting SiteLens on http://localhost:${PORT}"
echo "Close this window to stop the server."
npm run start -- -p "$PORT"
