/**
 * Roda antes de cada arquivo de teste ser carregado (Vitest `setupFiles`).
 * Testes de smoke importam código real de produção (src/lib/tokens.ts,
 * src/server/auth/credentials.ts) que lê DATABASE_URL na primeira
 * importação — aqui a gente aponta isso pro banco de teste ANTES desse
 * import acontecer, pra nunca sequer tocar no banco de dev.
 * (Os testes de integração não dependem disso — usam PrismaClient
 * configurado explicitamente contra TEST_DATABASE_URL/TEST_APP_DATABASE_URL,
 * ver tests/integration/setup/helpers.ts.)
 */
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
