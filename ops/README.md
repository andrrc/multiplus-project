# Operação na VPS

O `docker-compose.yml` é a configuração de produção: somente o Caddy publica portas no
host. Para desenvolvimento local, acrescente `docker-compose.local.yml`, que publica
Postgres em `127.0.0.1:5434` e MinIO em loopback.

Quando já existir um Caddy compartilhado, defina `PROXY_MODE=external` no `.env`. O
`docker-compose.proxy.yml` não sobe outro Caddy nem publica portas: conecta somente o
container `app` à rede externa `somma_default`, onde o proxy deve usar o alias
`multiplus-app`.

## Primeiro deploy

1. Instale Docker Compose v2, `curl`, `getent` e `rclone` (se for usar backup externo).
2. Clone o repositório em um diretório exclusivo, por exemplo `/opt/multiplus-project`.
3. Copie `.env.example` para `.env` e preencha os valores reais. Gere senhas com caracteres
   seguros para URL, por exemplo `openssl rand -hex 32`, e gere `AUTH_SECRET` com
   `openssl rand -hex 32`.
4. Aponte o registro DNS `multiplus.sommaia.com.br` para o IP da VPS e confirme que o
   proxy escolhido responde por 80/443.
5. Execute `sudo bash ops/deploy.sh`.

O script aborta sem alterar os serviços da aplicação quando o domínio não resolve, quando
o proxy externo ou a rede Docker não existem, quando há secrets de exemplo ou quando
`AUTH_SECRET` é curto. As migrations rodam com `DATABASE_URL` (role dona); em seguida
`db-role` aplica a senha de `APP_DATABASE_PASSWORD` à role `multiplus_app`. O app só é
iniciado depois dessas duas etapas. O `minio-init` usa o SDK MinIO fixado no lockfile, cria
o bucket e força a política anônima para `none`.

## Atualizações

```bash
git pull --ff-only
bash ops/deploy.sh
```

Faça backup antes de migrations destrutivas. O deploy não executa `down -v`, então volumes
persistentes não são removidos.

## CI/CD: staging e produção

O workflow em `.github/workflows/ci.yml` usa dois ambientes do GitHub:

- `staging`: push na branch `staging` publica automaticamente na VPS de teste quando a
  variável `DEPLOY_STAGING_ATIVO` vale `true`.
- `production`: push na `main` publica somente quando `DEPLOY_PRODUCTION_ATIVO` (ou a
  variável legada `DEPLOY_ATIVO`) vale `true`.

Cada ambiente deve ter seus próprios secrets `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PATH`,
`DEPLOY_SSH_KEY` e `DEPLOY_HEALTH_URL`. O `.env` continua apenas na VPS e não entra no
repositório. O workflow envia o commit exato, executa `ops/deploy.sh`, aguarda `/api/health`
e impede dois deploys simultâneos no mesmo ambiente.

## Backup

Agende, por exemplo, `ops/backup.sh` no cron diário. Ele cria um dump custom do PostgreSQL,
um tar.gz do volume MinIO, checksum SHA-256 e remove cópias locais com mais de 14 dias.
Defina `BACKUP_S3_URI` e configure o profile do `rclone` para enviar as três cópias a um
bucket externo privado (R2/S3). O backup externo é obrigatório para produção; volume local
sozinho não protege contra perda da VPS.

Antes de liberar dados reais, restaure pelo menos um dump em uma base isolada e extraia o
tar do MinIO em um volume temporário.
