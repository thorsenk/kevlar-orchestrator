#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-run}"
APP_NAME="Kevlar Codex Desktop"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

pkill -x "$APP_NAME" >/dev/null 2>&1 || true

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
    ;;
  *)
    echo "usage: $0 [run|--debug|--logs|--telemetry|--verify]" >&2
    exit 2
    ;;
esac
