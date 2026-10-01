#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
[[ -f .env ]] || { echo "ERRO: .env não encontrado" >&2; exit 1; }
set -a
# shellcheck disable=SC1091
. ./.env
set +a

[[ -n "${APP_DOMAIN:-}" ]] || { echo "ERRO: APP_DOMAIN não configurado" >&2; exit 1; }
[[ -n "${CRON_SECRET:-}" && ${#CRON_SECRET} -ge 32 ]] || { echo "ERRO: CRON_SECRET ausente ou curto" >&2; exit 1; }
[[ "$CRON_SECRET" =~ ^[A-Fa-f0-9]+$ ]] || { echo "ERRO: CRON_SECRET deve ser hexadecimal" >&2; exit 1; }

# O segredo segue pela entrada padrão do curl e não aparece nos argumentos do processo.
printf 'header = "Authorization: Bearer %s"\n' "$CRON_SECRET" \
  | curl --config - --fail --silent --show-error --max-time 120 "https://${APP_DOMAIN}/api/jobs/notificacoes-prazo"
