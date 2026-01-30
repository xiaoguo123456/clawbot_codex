#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:8787}"

path="$1"
shift || true

curl -fsS "$BASE_URL$path" "$@" | sed -e 's/\\u0000//g'
