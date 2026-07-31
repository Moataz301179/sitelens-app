#!/usr/bin/env bash
# 24/7 autonomous operations hook.
# Wire this into cron (or a scheduler) to drive the executive engine:
#   */30 * * * * /path/to/scripts/cron-executive.sh >> /var/log/executive.log 2>&1
# It triggers one autonomous tick (run crew → execute approved decisions → measure)
# and emits the daily report (also written to /generated).
set -euo pipefail
BASE_URL="${EXECUTIVE_BASE_URL:-http://localhost:3939}"
echo "[$(date -u)] tick"
curl -fsS -X POST -H "Content-Type: application/json" -d '{"action":"tick"}' "$BASE_URL/api/executive/status" || echo "tick failed"
echo "[$(date -u)] report"
curl -fsS "$BASE_URL/api/executive/report" -o /dev/null || echo "report failed"
echo "[$(date -u)] done"
