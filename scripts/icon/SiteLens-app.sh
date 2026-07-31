#!/bin/bash
# ============================================================
#  SiteLens.app — executable entry point.
#  Starts the server (if not running) and opens the dashboard.
# ============================================================

PROJECT_DIR="/Users/Moataz/.zcode/workspace/default/ai-website-audit-platform"
PORT=3456
URL="http://localhost:${PORT}"
LOG="$HOME/Library/Logs/sitelens.log"

mkdir -p "$(dirname "$LOG")"

cd "$PROJECT_DIR" || {
  echo "SiteLens: project folder not found at $PROJECT_DIR" >&2
  osascript -e 'display alert "SiteLens" message "Project folder not found."' >/dev/null 2>&1
  exit 1
}

# If the server is already up, just open the browser.
if curl -s -o /dev/null --max-time 3 "http://localhost:${PORT}/api/health"; then
  open "$URL"
  exit 0
fi

# Make sure we have a production build before starting.
if [ ! -d ".next/server" ]; then
  echo "[SiteLens] Building production bundle (first run, please wait)..." >> "$LOG"
  if npm run build >> "$LOG" 2>&1; then
    echo "[SiteLens] Build OK." >> "$LOG"
  else
    echo "[SiteLens] Build failed, see $LOG" >> "$LOG"
    osascript -e 'display alert "SiteLens" message "Build failed — check ~/Library/Logs/sitelens.log"' >/dev/null 2>&1
    exit 1
  fi
fi

# Start the server in the background and open the browser.
echo "[SiteLens] Starting server on $URL (log: $LOG)" >> "$LOG"
nohup npm run start -- -p "$PORT" >> "$LOG" 2>&1 &
SERVER_PID=$!

# Wait a little for the server to come up, then open the browser.
for i in $(seq 1 20); do
  if curl -s -o /dev/null --max-time 2 "http://localhost:${PORT}/api/health"; then
    break
  fi
  sleep 1
done

open "$URL"
echo "[SiteLens] Launched (server pid $SERVER_PID)." >> "$LOG"
