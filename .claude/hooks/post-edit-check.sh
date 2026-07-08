#!/usr/bin/env bash
# PostToolUse (Edit|Write): corre pnpm typecheck si el archivo editado es .ts/.tsx
# bajo src/. Exit 2 + stderr → Claude ve los errores y debe corregirlos.
set -uo pipefail

INPUT="$(cat)"

FILE_PATH=""
if command -v python3 >/dev/null 2>&1; then
  FILE_PATH="$(printf '%s' "$INPUT" | python3 -c 'import json,sys
try:
    print(json.load(sys.stdin).get("tool_input", {}).get("file_path", "") or "")
except Exception:
    pass' 2>/dev/null)"
elif command -v jq >/dev/null 2>&1; then
  FILE_PATH="$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)"
fi
[ -n "$FILE_PATH" ] || exit 0

# Normalizar separadores Windows → POSIX para el matching
FILE_PATH="${FILE_PATH//\\//}"

case "$FILE_PATH" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac
case "$FILE_PATH" in
  */src/*|src/*) ;;
  *) exit 0 ;;
esac

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
command -v pnpm >/dev/null 2>&1 || exit 0

OUTPUT="$(pnpm typecheck 2>&1)" && exit 0

{
  echo "pnpm typecheck FALLÓ tras editar ${FILE_PATH}. Corrige estos errores:"
  printf '%s\n' "$OUTPUT" | tail -n 30
} >&2
exit 2
