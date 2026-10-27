#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
# Carrega credenciais e nomes dos serviços; o arquivo .env não deve ser versionado.
[[ -f .env ]] || { echo "ERRO: .env não encontrado" >&2; exit 1; }

set -a
# shellcheck disable=SC1091
. ./.env
set +a

BACKUP_DIR="${BACKUP_DIR:-/var/backups/multiplus}"
# Um timestamp UTC permite ordenar e comparar backups sem ambiguidade de fuso.
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
export COMPOSE_PROJECT_NAME=multiplus

mkdir -p "$BACKUP_DIR"
# Restringe diretório e novos arquivos a quem executa o processo de backup.
chmod 700 "$BACKUP_DIR"
umask 077

echo "Exportando PostgreSQL..."
# Formato custom preserva estrutura para pg_restore sem incluir owner ou ACLs do host.
docker compose exec -T postgres pg_dump \
  --format=custom --no-owner --no-acl \
  -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  > "$BACKUP_DIR/postgres-${STAMP}.dump"

echo "Exportando volume MinIO..."
# Monta o volume só para leitura e empacota os objetos preservando o conteúdo do bucket.
docker run --rm \
  -v multiplus_minio_data:/data:ro \
  -v "$BACKUP_DIR":/backup \
  alpine:3.22 \
  tar -czf "/backup/minio-${STAMP}.tar.gz" -C /data .

# Grava checksums para detectar corrupção antes de uma restauração.
sha256sum "$BACKUP_DIR/postgres-${STAMP}.dump" "$BACKUP_DIR/minio-${STAMP}.tar.gz" \
  > "$BACKUP_DIR/SHA256SUMS-${STAMP}.txt"

# Remove arquivos locais com mais de 14 dias para limitar o espaço usado no VPS.
find "$BACKUP_DIR" -type f -mtime +14 -delete

if [[ -n "${BACKUP_S3_URI:-}" ]]; then
  # A cópia externa é opcional e só ocorre quando um destino de rclone foi configurado.
  command -v rclone >/dev/null || { echo "ERRO: BACKUP_S3_URI definido, mas rclone não está instalado" >&2; exit 1; }
  rclone copy "$BACKUP_DIR/postgres-${STAMP}.dump" "$BACKUP_S3_URI/postgres/"
  rclone copy "$BACKUP_DIR/minio-${STAMP}.tar.gz" "$BACKUP_S3_URI/minio/"
  rclone copy "$BACKUP_DIR/SHA256SUMS-${STAMP}.txt" "$BACKUP_S3_URI/checksums/"
fi

echo "Backup concluído em $BACKUP_DIR (timestamp UTC $STAMP)"
