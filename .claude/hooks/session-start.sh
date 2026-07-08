#!/usr/bin/env bash
# SessionStart: contexto rápido del repo (el stdout se inyecta al contexto de Claude).
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0

echo "── EunaTrack · estado del repo ──"
if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Rama: $(git branch --show-current 2>/dev/null || echo '(detached)')"
  CHANGES="$(git status --short 2>/dev/null | head -n 15)"
  if [ -n "$CHANGES" ]; then
    echo "Cambios sin commitear:"
    printf '%s\n' "$CHANGES"
  else
    echo "Working tree limpio."
  fi
else
  echo "Git: repo no inicializado o git no disponible."
fi
echo "Migraciones (supabase/migrations/):"
ls -1 supabase/migrations 2>/dev/null || echo "  (ninguna)"
echo "RECORDATORIO: claude-design/ es SOLO LECTURA · fórmula de progreso = 5×20% (SQL y TS siempre consistentes)."
exit 0
