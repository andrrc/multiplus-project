-- Sprint 4B / B5 — preferências, antecedência global e notificações in-app.
CREATE TYPE "EventoNotificacao" AS ENUM (
  'PRAZO_PROXIMO', 'TAREFA_CONCLUIDA', 'PROJETO_CONCLUIDO', 'NOVO_COMENTARIO', 'ATRIBUICAO_RECEBIDA'
);

CREATE TABLE "preferencias_notificacao" (
  "id" TEXT NOT NULL,
  "perfil" "Perfil" NOT NULL,
  "evento" "EventoNotificacao" NOT NULL,
  "email" BOOLEAN NOT NULL DEFAULT true,
  "inApp" BOOLEAN NOT NULL DEFAULT true,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "preferencias_notificacao_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "preferencias_notificacao_perfil_evento_key" UNIQUE ("perfil", "evento")
);

CREATE TABLE "configuracoes_notificacao" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "diasAntecedenciaPadrao" INTEGER NOT NULL DEFAULT 7,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "configuracoes_notificacao_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "configuracoes_notificacao_dias_check" CHECK ("diasAntecedenciaPadrao" > 0)
);

CREATE TABLE "notificacoes" (
  "id" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "evento" "EventoNotificacao" NOT NULL,
  "titulo" TEXT NOT NULL,
  "mensagem" TEXT NOT NULL,
  "url" TEXT,
  "entidadeId" TEXT,
  "lida" BOOLEAN NOT NULL DEFAULT false,
  "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notificacoes_usuario_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "notificacoes_usuarioId_lida_criadaEm_idx" ON "notificacoes"("usuarioId", "lida", "criadaEm");

INSERT INTO "configuracoes_notificacao" ("id", "diasAntecedenciaPadrao", "atualizadoEm")
VALUES (1, 7, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- Padrão aprovado: ADMIN recebe os cinco eventos nos dois canais;
-- Interno/Externo recebem prazo, comentário e atribuição; CLIENTE começa sem eventos.
INSERT INTO "preferencias_notificacao" ("id", "perfil", "evento", "email", "inApp", "atualizadoEm")
SELECT md5(random()::text || clock_timestamp()::text), p."perfil", e."evento",
  CASE WHEN p."perfil" = 'ADMIN' THEN true WHEN p."perfil" IN ('ADMIN_INTERNO', 'ADMIN_EXTERNO') AND e."evento" IN ('PRAZO_PROXIMO', 'NOVO_COMENTARIO', 'ATRIBUICAO_RECEBIDA') THEN true ELSE false END,
  CASE WHEN p."perfil" = 'ADMIN' THEN true WHEN p."perfil" IN ('ADMIN_INTERNO', 'ADMIN_EXTERNO') AND e."evento" IN ('PRAZO_PROXIMO', 'NOVO_COMENTARIO', 'ATRIBUICAO_RECEBIDA') THEN true ELSE false END,
  CURRENT_TIMESTAMP
FROM unnest(enum_range(NULL::"Perfil")) AS p("perfil")
CROSS JOIN unnest(enum_range(NULL::"EventoNotificacao")) AS e("evento")
ON CONFLICT ("perfil", "evento") DO NOTHING;

ALTER TABLE "preferencias_notificacao" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "configuracoes_notificacao" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notificacoes" ENABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE ON "preferencias_notificacao" TO multiplus_app;
GRANT SELECT, UPDATE ON "configuracoes_notificacao" TO multiplus_app;
GRANT SELECT, INSERT, UPDATE ON "notificacoes" TO multiplus_app;

CREATE POLICY preferencias_notificacao_admin ON "preferencias_notificacao" FOR ALL USING (app_current_perfil() = 'ADMIN') WITH CHECK (app_current_perfil() = 'ADMIN');
CREATE POLICY configuracoes_notificacao_admin ON "configuracoes_notificacao" FOR ALL USING (app_current_perfil() = 'ADMIN') WITH CHECK (app_current_perfil() = 'ADMIN');
CREATE POLICY notificacoes_select_proprias ON "notificacoes" FOR SELECT USING ("usuarioId" = app_current_usuario_id());
CREATE POLICY notificacoes_insert_autorizado ON "notificacoes" FOR INSERT WITH CHECK (app_current_perfil() = 'ADMIN' OR "usuarioId" = app_current_usuario_id());
CREATE POLICY notificacoes_update_lida ON "notificacoes" FOR UPDATE USING ("usuarioId" = app_current_usuario_id()) WITH CHECK ("usuarioId" = app_current_usuario_id());
