# Múltiplus Software

Sistema de controle de clientes, projetos e prazos ambientais da Múltiplus Ambiental.
Ver `docs/SRS_Multiplus_Software_v1.0.md` (requisitos) e
`docs/architecture-multiplus-software.md` (arquitetura, ADRs).

Stack: Next.js (App Router) + PostgreSQL self-hosted (RLS) + Auth.js + Docker Compose,
hospedado numa VPS Contabo — ver o ADD para o racional de cada escolha.

## Setup local

Pré-requisitos: Node 20+, Docker Desktop.

```bash
cp .env.example .env
# gere um AUTH_SECRET: npx auth secret
# ajuste as senhas de POSTGRES_PASSWORD / MINIO_ROOT_PASSWORD se quiser

docker compose up -d postgres minio
npm install
npm run db:migrate   # aplica as migrations (schema + políticas de RLS)
```

Depois de `db:migrate`, defina a senha da role `multiplus_app` (usada pela aplicação
para todo acesso já autenticado — as tabelas de domínio têm RLS habilitado e essa role
não é dona delas, então as políticas se aplicam):

```bash
docker exec multiplus-postgres-1 psql -U multiplus -d multiplus \
  -c "ALTER ROLE multiplus_app WITH PASSWORD 'sua-senha-aqui';"
```

Use a mesma senha em `APP_DATABASE_URL` no `.env`. Essa role não fica em nenhuma
migration versionada de propósito (senha não vai pro git).

Crie o usuário ADMIN inicial (Talita) e rode o app:

```bash
npm run db:seed   # imprime no console o link de "definir senha" do primeiro ADMIN
npm run dev
```

Acesse `http://localhost:3000`, abra o link impresso pelo seed pra definir a senha do
ADMIN, e faça login.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm run start` | Build e start de produção |
| `npm run db:migrate` | Aplica migrations do Prisma (`prisma migrate dev`) |
| `npm run db:seed` | Cria o usuário ADMIN inicial, se ainda não existir |
| `npm run db:studio` | Prisma Studio (inspecionar o banco) |
| `npm run test` | Suíte completa de testes (integration + smoke) |
| `npm run test:integration` | Só os testes de integração (RLS/permissões) |
| `npm run test:smoke` | Só os smoke tests (fluxo crítico ponta a ponta) |

## Autenticação (Sprint 1)

- **Login** (RF-014): Auth.js, provider de credenciais, sessão JWT — sem adapter de
  banco (Credentials não é compatível com sessão de banco no Auth.js).
- **Definir/recuperar senha** (RF-030 a RF-032): fluxo próprio via token de uso único
  (`TokenAcesso`), não pelo mecanismo de verification token do Auth.js — ver
  `src/lib/tokens.ts`. Sem `RESEND_API_KEY` configurada, o link sai só no console
  (`src/lib/email.ts`), pra não depender de domínio verificado em dev.
- **Duas roles de Postgres**: a dona das tabelas (`DATABASE_URL`, sem RLS — login,
  emissão/validação de token) e `multiplus_app` (`APP_DATABASE_URL`, restrita por RLS —
  toda operação já autenticada). Ver comentário no topo de
  `prisma/migrations/*_rls_policies/migration.sql` e `src/lib/prisma-app.ts`.

## Permissões / RLS (ADR-004)

As políticas de RLS cobrem os 4 perfis (Seção 3.2 do ADD) para leitura em cascata em
todas as tabelas de domínio, e escrita para ADMIN (tudo) e ADMIN_INTERNO (dentro do(s)
projeto(s) atribuído(s)). O check de subtarefa (RF-021/RN-004) tem uma trigger dedicada
(`subtarefas_enforce_rn004`) além da política de RLS, porque RLS sozinho não consegue
comparar valor antigo x novo de uma coluna específica em um UPDATE.

Deliberadamente fora do escopo desta sprint: UPDATE de tarefas por ADMIN_EXTERNO
("finalizar"/comentar — RF-019), que entra junto com o módulo de Comentários/Notificações.

## Testes

Segue `docs/padrao-testes-por-sprint-multiplus.md`. Da Sprint 1:

- `tests/integration/` — cascata de permissões dos 4 perfis (RNF-001, RF-018, RF-019) e
  a trigger do RN-004 (check de subtarefa), rodando contra Postgres de verdade
  autenticado como a role `multiplus_app` — não a role dona das tabelas, pra testar
  exatamente o caminho que a aplicação usa em produção.
- `tests/smoke/` — fluxo crítico ponta a ponta de onboarding/login/recuperação de senha
  (RF-014, RF-030 a RF-032), chamando o código real de produção (não é teste de UI).

```bash
npm run test              # tudo
npm run test:integration
npm run test:smoke
```

Os dois sobem/migram sozinhos um banco `multiplus_test` separado (nunca tocam no banco
de dev — ver `tests/integration/setup/global-setup.ts`), usando a mesma senha de
`multiplus_app` já configurada em `APP_DATABASE_URL`. Requer `postgres` rodando
(`docker compose up -d postgres`) e `TEST_DATABASE_URL`/`TEST_APP_DATABASE_URL` no
`.env` (já no `.env.example`).

Convenção de arquivo: `[modulo].[categoria].test.ts` (`.integration.test.ts` ou
`.smoke.test.ts`), com o RF/RN coberto no comentário do topo — igual ao Padrão de
Testes por Sprint pede. Ainda pendentes do Definition of Done da Sprint 1 (Seção 3 do
documento): gate de CI (GitHub Actions bloqueando deploy com teste quebrado) e
healthcheck pós-deploy — ficam pra quando a sprint tocar deploy real na Contabo.

## Infraestrutura

`docker-compose.yml` sobe Postgres, MinIO, o app (via `Dockerfile`, build standalone) e
Caddy (reverse proxy + SSL automático) — é o mesmo compose usado na VPS Contabo em
produção. Em dev local, normalmente só `postgres` e `minio` rodam em Docker; o Next.js
roda direto com `npm run dev`.

Portas: o Postgres deste projeto publica em `5434` no host (não `5432`) para não colidir
com outros bancos locais.
