#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
[[ -f .env ]] || { echo "ERRO: .env não encontrado" >&2; exit 1; }

set -a
# shellcheck disable=SC1091
. ./.env
set +a

BACKUP_DIR="${BACKUP_DIR:-/var/backups/multiplus}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
export COMPOSE_PROJECT_NAME=multiplus

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
umask 077

echo "Exportando PostgreSQL..."
docker compose exec -T postgres pg_dump \
  --format=custom --no-owner --no-acl \
  -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  > "$BACKUP_DIR/postgres-${STAMP}.dump"

echo "Exportando volume MinIO..."
docker run --rm \
  -v multiplus_minio_data:/data:ro \
  -v "$BACKUP_DIR":/backup \
  alpine:3.22 \
  tar -czf "/backup/minio-${STAMP}.tar.gz" -C /data .

sha256sum "$BACKUP_DIR/postgres-${STAMP}.dump" "$BACKUP_DIR/minio-${STAMP}.tar.gz" \
  > "$BACKUP_DIR/SHA256SUMS-${STAMP}.txt"

find "$BACKUP_DIR" -type f -mtime +14 -delete

if [[ -n "${BACKUP_S3_URI:-}" ]]; then
  command -v rclone >/dev/null || { echo "ERRO: BACKUP_S3_URI definido, mas rclone não está instalado" >&2; exit 1; }
  rclone copy "$BACKUP_DIR/postgres-${STAMP}.dump" "$BACKUP_S3_URI/postgres/"
  rclone copy "$BACKUP_DIR/minio-${STAMP}.tar.gz" "$BACKUP_S3_URI/minio/"
  rclone copy "$BACKUP_DIR/SHA256SUMS-${STAMP}.txt" "$BACKUP_S3_URI/checksums/"
fi

echo "Backup concluído em $BACKUP_DIR (timestamp UTC $STAMP)"
