#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

die() {
  echo "ERRO: $*" >&2
  exit 1
}

[[ -f .env ]] || die "crie .env de produção a partir de .env.example"
command -v docker >/dev/null || die "Docker não encontrado"
docker compose version >/dev/null || die "Docker Compose não encontrado"

set -a
# shellcheck disable=SC1091
. ./.env
set +a

compose_files=(-f docker-compose.yml)
if [[ "${PROXY_MODE:-standalone}" == "external" ]]; then
  compose_files+=(-f docker-compose.proxy.yml)
fi

compose() {
  docker compose "${compose_files[@]}" "$@"
}

for nome in POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB APP_DATABASE_PASSWORD AUTH_SECRET APP_DOMAIN MINIO_ROOT_USER MINIO_ROOT_PASSWORD MINIO_BUCKET; do
  [[ -n "${!nome:-}" ]] || die "$nome precisa estar definido em .env"
done

[[ ${#AUTH_SECRET} -ge 32 ]] || die "AUTH_SECRET precisa ter pelo menos 32 caracteres"
[[ "$APP_DOMAIN" != http://* && "$APP_DOMAIN" != https://* ]] || die "APP_DOMAIN deve ser somente hostname, sem esquema"
[[ "$APP_DOMAIN" != localhost* ]] || die "APP_DOMAIN não pode ser localhost em produção"
[[ "$POSTGRES_PASSWORD" != *troque-esta* && "$APP_DATABASE_PASSWORD" != *troque-esta* && "$MINIO_ROOT_PASSWORD" != *troque-esta* ]] || die "troque as senhas de exemplo antes do deploy"
[[ "$POSTGRES_PASSWORD" =~ ^[A-Za-z0-9_-]+$ ]] || die "POSTGRES_PASSWORD deve usar somente caracteres URL-safe (gere com openssl rand -hex 32)"
[[ "$APP_DATABASE_PASSWORD" =~ ^[A-Za-z0-9_-]+$ ]] || die "APP_DATABASE_PASSWORD deve usar somente caracteres URL-safe (gere com openssl rand -hex 32)"

compose config --quiet || die "docker-compose.yml inválido ou variáveis ausentes"

if [[ "${PROXY_MODE:-standalone}" == "external" ]]; then
  docker network inspect somma_default >/dev/null 2>&1 || die "rede Docker externa somma_default não existe"
else
  conflitos="$(docker ps --format '{{.Names}} {{.Ports}}' | grep -E '0\.0\.0\.0:(80|443)->|\[::\]:(80|443)->' | grep -v '^multiplus-' || true)"
  [[ -z "$conflitos" ]] || die "80/443 já estão publicados por outro container:\n$conflitos"
fi

getent ahosts "$APP_DOMAIN" >/dev/null || die "APP_DOMAIN não resolve no VPS: $APP_DOMAIN"

echo "Subindo dependências internas..."
compose up -d postgres minio

echo "Aplicando migrations com a role dona..."
compose --profile ops run --rm migrate

echo "Garantindo senha da role multiplus_app..."
compose --profile ops run --rm db-role

echo "Criando ADMIN inicial se necessário..."
compose --profile ops run --rm seed

echo "Garantindo bucket MinIO privado..."
compose --profile ops run --rm minio-init

IMAGEM_APP="multiplus-app"
GIT_SHA="${GIT_SHA:-manual-$(date +%Y%m%d%H%M%S)}"

# Guarda a imagem que está rodando agora como ponto de retorno, antes de
# sobrescrever `latest` com o build novo — é o que permite reverter sozinho
# se o healthcheck abaixo falhar.
tinha_versao_anterior=0
if docker image inspect "${IMAGEM_APP}:latest" >/dev/null 2>&1; then
  docker tag "${IMAGEM_APP}:latest" "${IMAGEM_APP}:rollback"
  tinha_versao_anterior=1
fi

echo "Construindo e subindo app (commit ${GIT_SHA})..."
if [[ "${PROXY_MODE:-standalone}" == "external" ]]; then
  compose up -d --build app
else
  compose up -d --build app caddy
fi

echo "Aguardando healthcheck da aplicação..."
sucesso=0
for tentativa in $(seq 1 30); do
  if compose ps --status running app >/dev/null 2>&1 \
    && curl --fail --silent --show-error --max-time 10 "https://${APP_DOMAIN}/api/health" >/dev/null; then
    sucesso=1
    break
  fi
  sleep 5
done

if [[ "$sucesso" == "1" ]]; then
  # Marca a imagem com o commit exato, pra dar pra responder "o que está no
  # ar" sem precisar vasculhar o log do deploy. Mantém só as 5 mais recentes.
  docker tag "${IMAGEM_APP}:latest" "${IMAGEM_APP}:git-${GIT_SHA}"
  echo "${GIT_SHA} $(date -u +%Y-%m-%dT%H:%M:%SZ)" > .deployed-version
  docker images "${IMAGEM_APP}" --format '{{.Tag}}' | grep '^git-' | tail -n +6 \
    | while read -r tag; do docker rmi "${IMAGEM_APP}:${tag}" >/dev/null 2>&1 || true; done
  echo "Deploy concluído: https://${APP_DOMAIN} (commit ${GIT_SHA})"
  compose ps
  exit 0
fi

compose ps
compose logs --tail=100 app caddy >&2 || true

if [[ "$tinha_versao_anterior" == "1" ]]; then
  echo "Healthcheck falhou — revertendo automaticamente para a versão anterior..." >&2
  docker tag "${IMAGEM_APP}:rollback" "${IMAGEM_APP}:latest"
  if [[ "${PROXY_MODE:-standalone}" == "external" ]]; then
    compose up -d --no-build app
  else
    compose up -d --no-build app caddy
  fi
  for tentativa in $(seq 1 15); do
    if curl --fail --silent --show-error --max-time 10 "https://${APP_DOMAIN}/api/health" >/dev/null; then
      die "deploy do commit ${GIT_SHA} falhou no healthcheck — revertido automaticamente para a versão anterior, aplicação está no ar com o código antigo"
    fi
    sleep 5
  done
  die "deploy falhou E o rollback automático também não respondeu no healthcheck — intervenção manual necessária agora"
fi

die "healthcheck HTTPS não respondeu 200 após 150 segundos (sem versão anterior no host para reverter)"
