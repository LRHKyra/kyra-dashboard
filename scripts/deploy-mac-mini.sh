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
trap 'rm -f "$TRACKED_FILES" "${ENV_TMP:-}"' EXIT
git ls-files -z > "$TRACKED_FILES"

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
  ssh "$REMOTE_HOST" chmod 600 "$REMOTE_ENV_FILE.tmp" "&&" mv "$REMOTE_ENV_FILE.tmp" "$REMOTE_ENV_FILE"
fi

ssh "$REMOTE_HOST" bash -s -- "$REMOTE_APP_DIR" "$REMOTE_ENV_FILE" "$COMMIT" "$BASE_PATH" <<'REMOTE_BUILD'
set -euo pipefail
app_dir="$1"
env_file="$2"
commit="$3"
base_path="$4"

cd "$app_dir"
set -a
# shellcheck disable=SC1090
source "$env_file"
set +a
export DEPLOYMENT_MODE="${DEPLOYMENT_MODE:-cloud}"
export NEXT_PUBLIC_DEPLOYMENT_MODE="${NEXT_PUBLIC_DEPLOYMENT_MODE:-cloud}"
export NEXT_PUBLIC_BASE_PATH="${NEXT_PUBLIC_BASE_PATH:-$base_path}"

npm ci
npm run build
printf '%s\n' "$commit" > .deployed-version
REMOTE_BUILD

ssh "$REMOTE_HOST" bash -s -- "$REMOTE_APP_DIR" "$REMOTE_PLIST" "$LAUNCH_LABEL" <<'REMOTE_LAUNCH'
set -euo pipefail
app_dir="$1"
plist="$2"
label="$3"

cat > "$plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$label</string>
  <key>ProgramArguments</key>
  <array>
    <string>$app_dir/scripts/run-mac-mini.sh</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$app_dir</string>
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

launchctl bootout "gui/$(id -u)/$label" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$plist"
launchctl kickstart -k "gui/$(id -u)/$label" >/dev/null 2>&1 || true
REMOTE_LAUNCH

echo "Deployed $COMMIT"
