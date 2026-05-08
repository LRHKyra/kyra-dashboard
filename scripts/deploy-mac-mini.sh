#!/usr/bin/env bash
set -euo pipefail

ALLOW_DIRTY=false
for arg in "$@"; do
  case "$arg" in
    --allow-dirty)
      ALLOW_DIRTY=true
      ;;
    -h|--help)
      cat <<'USAGE'
Usage: scripts/deploy-mac-mini.sh [--allow-dirty]

Deploys the git-tracked dashboard source to the mac-mini, builds it there,
records the deployed commit, and restarts com.kyra.dashboard.
USAGE
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 2
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

REMOTE_HOST="${DASHBOARD_REMOTE_HOST:-Lucas@mac-mini.tarpan-algol.ts.net}"
REMOTE_APP_DIR="${DASHBOARD_REMOTE_DIR:-/Users/lucas/openclaw-dashboard}"
REMOTE_ENV_FILE="${DASHBOARD_REMOTE_ENV_FILE:-/Users/lucas/.kyra/openclaw-dashboard.env}"
REMOTE_PLIST="${DASHBOARD_REMOTE_PLIST:-/Users/lucas/Library/LaunchAgents/com.kyra.dashboard.plist}"
LAUNCH_LABEL="${DASHBOARD_LAUNCH_LABEL:-com.kyra.dashboard}"
BASE_PATH="${NEXT_PUBLIC_BASE_PATH:-/app/dashboard}"
PORT="${DASHBOARD_PORT:-3101}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "This deploy must run from a git-backed dashboard checkout." >&2
  exit 1
fi

if [[ "$ALLOW_DIRTY" != true && -n "$(git status --porcelain)" ]]; then
  echo "Refusing to deploy with uncommitted changes. Commit first, or pass --allow-dirty." >&2
  exit 1
fi

COMMIT="$(git rev-parse HEAD)"
TRACKED_FILES="$(mktemp)"
trap 'rm -f "$TRACKED_FILES" "${ENV_TMP:-}" "${PLIST_TMP:-}"' EXIT
git ls-files -z > "$TRACKED_FILES"

quote() {
  printf '%q' "$1"
}

echo "Deploying $COMMIT to $REMOTE_HOST:$REMOTE_APP_DIR"
ssh "$REMOTE_HOST" mkdir -p "$REMOTE_APP_DIR" "$(dirname "$REMOTE_ENV_FILE")" "$(dirname "$REMOTE_PLIST")"

rsync -az \
  --delete \
  --exclude='.next/' \
  --exclude='node_modules/' \
  --exclude='.deployed-version' \
  --files-from="$TRACKED_FILES" \
  --from0 \
  --relative \
  ./ "$REMOTE_HOST:$REMOTE_APP_DIR/"

ssh "$REMOTE_HOST" chmod +x "$REMOTE_APP_DIR/scripts/run-mac-mini.sh"

if ! ssh "$REMOTE_HOST" test -f "$REMOTE_ENV_FILE"; then
  HUBSPOT_ACCESS_TOKEN_VALUE="$(
    awk -F= '/^HUBSPOT_ACCESS_TOKEN=/{print substr($0, index($0, "=") + 1)}' .env.local 2>/dev/null || true
  )"

  if [[ -z "$HUBSPOT_ACCESS_TOKEN_VALUE" ]]; then
    echo "Missing $REMOTE_ENV_FILE and no HUBSPOT_ACCESS_TOKEN found in local .env.local." >&2
    exit 1
  fi

  ENV_TMP="$(mktemp)"
  chmod 600 "$ENV_TMP"
  {
    printf 'DEPLOYMENT_MODE=cloud\n'
    printf 'NEXT_PUBLIC_DEPLOYMENT_MODE=cloud\n'
    printf 'NEXT_PUBLIC_BASE_PATH=%s\n' "$BASE_PATH"
    printf 'DASHBOARD_PORT=%s\n' "$PORT"
    printf 'HUBSPOT_ACCESS_TOKEN=%s\n' "$HUBSPOT_ACCESS_TOKEN_VALUE"
  } > "$ENV_TMP"
  scp -q "$ENV_TMP" "$REMOTE_HOST:$REMOTE_ENV_FILE.tmp"
  ssh "$REMOTE_HOST" /bin/bash -lc \
    "chmod 600 $(quote "$REMOTE_ENV_FILE.tmp") && mv $(quote "$REMOTE_ENV_FILE.tmp") $(quote "$REMOTE_ENV_FILE")"
fi

ssh "$REMOTE_HOST" /bin/bash -lc "
  set -euo pipefail
  cd $(quote "$REMOTE_APP_DIR")
  set -a
  source $(quote "$REMOTE_ENV_FILE")
  set +a
  export DEPLOYMENT_MODE=\"\${DEPLOYMENT_MODE:-cloud}\"
  export NEXT_PUBLIC_DEPLOYMENT_MODE=\"\${NEXT_PUBLIC_DEPLOYMENT_MODE:-cloud}\"
  export NEXT_PUBLIC_BASE_PATH=\"\${NEXT_PUBLIC_BASE_PATH:-$BASE_PATH}\"
  npm ci
  npm run build
  printf '%s\n' $(quote "$COMMIT") > .deployed-version
"

PLIST_TMP="$(mktemp)"
cat > "$PLIST_TMP" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$label</string>
  <key>ProgramArguments</key>
  <array>
    <string>$REMOTE_APP_DIR/scripts/run-mac-mini.sh</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$REMOTE_APP_DIR</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/tmp/kyra-dashboard.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/kyra-dashboard.log</string>
</dict>
</plist>
PLIST

scp -q "$PLIST_TMP" "$REMOTE_HOST:$REMOTE_PLIST"

ssh "$REMOTE_HOST" /bin/bash -lc "
  set -euo pipefail
  plutil -lint $(quote "$REMOTE_PLIST") >/dev/null
  launchctl bootout \"gui/\$(id -u)/$LAUNCH_LABEL\" >/dev/null 2>&1 || true
  launchctl bootstrap \"gui/\$(id -u)\" $(quote "$REMOTE_PLIST")
  launchctl kickstart -k \"gui/\$(id -u)/$LAUNCH_LABEL\" >/dev/null 2>&1 || true
"

echo "Deployed $COMMIT"
