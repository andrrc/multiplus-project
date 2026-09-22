# syntax=docker/dockerfile:1

FROM node:20-alpine AS base

# --- deps: instala dependências com cache de layer isolado ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# --- builder: gera o build de produção (standalone) ---
FROM base AS builder
WORKDIR /app
ARG APP_DATABASE_URL=postgresql://multiplus_app:build-only@localhost:5432/multiplus
ENV APP_DATABASE_URL=${APP_DATABASE_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Imagem usada somente por `docker compose run --rm migrate`.
FROM deps AS migrator
WORKDIR /app
CMD ["npx", "prisma", "migrate", "deploy"]

# Operação idempotente de criação do bucket privado, usando o SDK já fixado no
# package-lock em vez de depender de uma imagem `mc` externa.
FROM deps AS storage-init
WORKDIR /app
COPY ops/minio-init.mjs ./ops/minio-init.mjs
CMD ["node", "/app/ops/minio-init.mjs"]

# Seed idempotente do ADMIN inicial. Usa a role dona porque roda antes de
# qualquer sessão autenticada e só cria Talita quando o e-mail ainda não existe.
FROM deps AS seeder
WORKDIR /app
RUN npx prisma generate
COPY prisma/seed.ts ./prisma/seed.ts
CMD ["npx", "tsx", "prisma/seed.ts"]

# --- runner: imagem final, mínima ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
