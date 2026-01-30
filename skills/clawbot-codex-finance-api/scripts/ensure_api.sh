#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-/root/clawd/clawbot_codex}"
BASE_URL="${BASE_URL:-http://127.0.0.1:8787}"

if curl -fsS "$BASE_URL/health" >/dev/null 2>&1; then
  echo "OK: api already running at $BASE_URL"
  exit 0
fi

echo "API not running, starting..."
cd "$REPO_DIR"

# Start in background (best-effort). If you use tmux/systemd, replace this.
nohup npm run start:api >/tmp/clawbot_codex_api.log 2>&1 &

# Wait briefly
for i in {1..20}; do
  if curl -fsS "$BASE_URL/health" >/dev/null 2>&1; then
    echo "OK: api started at $BASE_URL"
    exit 0
  fi
  sleep 0.5
done

echo "ERROR: api failed to start. Check /tmp/clawbot_codex_api.log"
exit 1
