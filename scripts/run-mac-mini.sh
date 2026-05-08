#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${DASHBOARD_APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
ENV_FILE="${DASHBOARD_ENV_FILE:-/Users/lucas/.kyra/openclaw-dashboard.env}"
PORT="${DASHBOARD_PORT:-3101}"

cd "$APP_DIR"

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

if [[ -z "${APP_VERSION:-}" && -f .deployed-version ]]; then
  export APP_VERSION
  APP_VERSION="$(tr -d '\n' < .deployed-version)"
fi

export HOSTNAME="${DASHBOARD_HOSTNAME:-127.0.0.1}"
export PORT

if [[ -f .next/standalone/server.js ]]; then
  exec node .next/standalone/server.js
fi

exec npm start -- -H "$HOSTNAME" -p "$PORT"
