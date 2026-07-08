#!/usr/bin/env bash
# Stop: trazabilidad simple — timestamp por cada fin de respuesta del agente.
set -uo pipefail
DIR="${CLAUDE_PROJECT_DIR:-.}/.claude"
mkdir -p "$DIR"
printf 'stop %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" >> "$DIR/last-session.log"
exit 0
