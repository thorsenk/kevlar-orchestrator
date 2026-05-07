#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-run}"
APP_NAME="Kevlar Codex Desktop"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIN_FREE_MB=1024

cd "$ROOT_DIR"

free_mb() {
  df -Pm "$ROOT_DIR" | awk 'NR == 2 {print $4}'
}

require_free_space() {
  local available
  available="$(free_mb)"
  if [[ "$available" -lt "$MIN_FREE_MB" ]]; then
    echo "Only ${available}MB free. Electron packaging and preview rendering need at least ${MIN_FREE_MB}MB." >&2
    echo "Clear generated artifacts or caches, then rerun. Safe local cleanup: rm -rf out .vite" >&2
    exit 1
  fi
}

pkill -x "$APP_NAME" >/dev/null 2>&1 || true

require_free_space
npm run package
APP_BUNDLE="$(find "$ROOT_DIR/out" -maxdepth 3 -name "$APP_NAME.app" -type d | head -n 1)"
if [[ -z "$APP_BUNDLE" ]]; then
  echo "Could not find packaged app bundle in $ROOT_DIR/out" >&2
  exit 1
fi

open_app() {
  /usr/bin/open -n "$APP_BUNDLE"
}

case "$MODE" in
  run)
    open_app
    ;;
  --debug|debug)
    ELECTRON_ENABLE_LOGGING=1 npm start
    ;;
  --logs|logs)
    open_app
    /usr/bin/log stream --info --style compact --predicate "process == \"$APP_NAME\""
    ;;
  --telemetry|telemetry)
    open_app
    /usr/bin/log stream --info --style compact --predicate "process == \"$APP_NAME\""
    ;;
  --verify|verify)
    open_app
    sleep 2
    pgrep -x "$APP_NAME" >/dev/null
    node "$ROOT_DIR/script/verify_packaged_preview.mjs" "$APP_NAME"
    if command -v sqlite3 >/dev/null 2>&1; then
      DB_PATH="$HOME/Library/Application Support/$APP_NAME/kevlar-codex.db"
      if [[ -f "$DB_PATH" ]]; then
        sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' AND name='codex_runs';" | grep -q codex_runs
      fi
    fi
    ;;
  *)
    echo "usage: $0 [run|--debug|--logs|--telemetry|--verify]" >&2
    exit 2
    ;;
esac
