#!/usr/bin/env bash
# PreToolUse (Bash): bloquea comandos peligrosos antes de ejecutarse.
# Exit 2 = bloquear (la razón en stderr llega a Claude). Exit 0 = permitir.
set -uo pipefail

INPUT="$(cat)"

CMD=""
if command -v python3 >/dev/null 2>&1; then
  CMD="$(printf '%s' "$INPUT" | python3 -c 'import json,sys
try:
    print(json.load(sys.stdin).get("tool_input", {}).get("command", "") or "")
except Exception:
    pass' 2>/dev/null)"
elif command -v jq >/dev/null 2>&1; then
  CMD="$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)"
fi
[ -n "$CMD" ] || exit 0

block() {
  echo "BLOQUEADO por bash-guard: $1" >&2
  exit 2
}

# 1) rm recursivo+forzado sobre rutas del repo (se tolera solo /tmp).
if printf '%s' "$CMD" | grep -Eq '(^|[;&|[:space:]])rm[[:space:]]+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r|-r[[:space:]]+-f|-f[[:space:]]+-r|--recursive[[:space:]]+--force)'; then
  if ! printf '%s' "$CMD" | grep -Eq 'rm[[:space:]]+(-[^[:space:]]+[[:space:]]+)+"?(/tmp/|\$TMPDIR)'; then
    block "'rm -rf' sobre rutas del repo. Borra archivos específicos o pide confirmación explícita al usuario."
  fi
fi

# 2) SQL destructivo (aplica a psql, supabase, echos a archivos .sql, etc.).
if printf '%s' "$CMD" | grep -Eiq 'drop[[:space:]]+(table|schema)|truncate'; then
  block "SQL destructivo (DROP TABLE/SCHEMA, TRUNCATE). Requiere confirmación explícita del usuario; las migraciones deben ser aditivas."
fi

# 3) git add/commit que involucre archivos .env* (secretos).
if printf '%s' "$CMD" | grep -Eq '(^|[;&|[:space:]])git[[:space:]]+(add|commit)' \
   && printf '%s' "$CMD" | grep -Eq '\.env'; then
  block "git add/commit de archivos .env* — los secretos nunca se commitean."
fi

# 4) Cualquier escritura sobre claude-design/ (SOLO LECTURA).
if printf '%s' "$CMD" | grep -q 'claude-design'; then
  if printf '%s' "$CMD" | grep -Eq '>>?[[:space:]]*[^[:space:]]*claude-design|(^|[;&|[:space:]])(mv|cp|rm|tee|touch|mkdir|rmdir|chmod|chown|ln|truncate)([[:space:]][^;&|]*)?claude-design|sed[[:space:]]+-[a-zA-Z]*i[^;&|]*claude-design'; then
    block "escritura sobre claude-design/ — es SOLO LECTURA (fuente de verdad visual)."
  fi
fi

exit 0
