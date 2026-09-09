-- RLS para as tabelas do módulo Cadastro de Clientes (Sprint 2) + mascaramento de
-- RF-020 (telefone do Responsável Legal / Ponto de Contato oculto para
-- ADMIN_INTERNO e ADMIN_EXTERNO).
--
-- Visibilidade (SELECT) das 4 tabelas novas segue a mesma cascata de "clientes"
-- (ver 20260903155236_rls_policies), MAS sem o perfil CLIENTE: este módulo é de uso
-- interno (Talita/equipe) — o Cliente final não acessa Responsável Legal, Ponto de
-- Contato, Pessoas do Operacional nem Documentos por aqui (ver PDD do módulo,
-- Seção 1 — ele usa a Área Exclusiva do Cliente, módulo futuro).
--
-- Escrita (INSERT/UPDATE/DELETE) fica ADMIN-only nas 4 tabelas, no mesmo padrão de
-- "clientes_write" — mantém o que já estava em produção desde a Sprint 1 em vez de
-- resolver por conta própria o ponto em aberto do PDD sobre ADMIN_INTERNO/EXTERNO
-- editarem o cadastro.

-- ============================================================================
-- responsaveis_legais
-- ============================================================================

ALTER TABLE "responsaveis_legais" ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON "responsaveis_legais" TO multiplus_app;

CREATE POLICY responsaveis_legais_select ON "responsaveis_legais" FOR SELECT USING (
  app_current_perfil() = 'ADMIN'
  OR (
    app_current_perfil() = 'ADMIN_INTERNO'
    AND EXISTS (
      SELECT 1 FROM "projetos" p
      JOIN "atribuicoes" a ON a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = p."id"
      WHERE p."clienteId" = "responsaveis_legais"."clienteId" AND a."usuarioId" = app_current_usuario_id()
    )
  )
  OR (
    app_current_perfil() = 'ADMIN_EXTERNO'
    AND EXISTS (
      SELECT 1 FROM "tarefas" t
      JOIN "projetos" p ON p."id" = t."projetoId"
      JOIN "atribuicoes" a ON a."entidadeTipo" = 'TAREFA' AND a."entidadeId" = t."id"
      WHERE p."clienteId" = "responsaveis_legais"."clienteId" AND a."usuarioId" = app_current_usuario_id()
    )
  )
);

CREATE POLICY responsaveis_legais_write ON "responsaveis_legais" FOR ALL USING (
  app_current_perfil() = 'ADMIN'
) WITH CHECK (
  app_current_perfil() = 'ADMIN'
);

-- ============================================================================
-- pontos_contato
-- ============================================================================

ALTER TABLE "pontos_contato" ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON "pontos_contato" TO multiplus_app;

CREATE POLICY pontos_contato_select ON "pontos_contato" FOR SELECT USING (
  app_current_perfil() = 'ADMIN'
  OR (
    app_current_perfil() = 'ADMIN_INTERNO'
    AND EXISTS (
      SELECT 1 FROM "projetos" p
      JOIN "atribuicoes" a ON a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = p."id"
      WHERE p."clienteId" = "pontos_contato"."clienteId" AND a."usuarioId" = app_current_usuario_id()
    )
  )
  OR (
    app_current_perfil() = 'ADMIN_EXTERNO'
    AND EXISTS (
      SELECT 1 FROM "tarefas" t
      JOIN "projetos" p ON p."id" = t."projetoId"
      JOIN "atribuicoes" a ON a."entidadeTipo" = 'TAREFA' AND a."entidadeId" = t."id"
      WHERE p."clienteId" = "pontos_contato"."clienteId" AND a."usuarioId" = app_current_usuario_id()
    )
  )
);

CREATE POLICY pontos_contato_write ON "pontos_contato" FOR ALL USING (
  app_current_perfil() = 'ADMIN'
) WITH CHECK (
  app_current_perfil() = 'ADMIN'
);

-- ============================================================================
-- pessoas_operacional
-- ============================================================================

ALTER TABLE "pessoas_operacional" ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON "pessoas_operacional" TO multiplus_app;

CREATE POLICY pessoas_operacional_select ON "pessoas_operacional" FOR SELECT USING (
  app_current_perfil() = 'ADMIN'
  OR (
    app_current_perfil() = 'ADMIN_INTERNO'
    AND EXISTS (
      SELECT 1 FROM "projetos" p
      JOIN "atribuicoes" a ON a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = p."id"
      WHERE p."clienteId" = "pessoas_operacional"."clienteId" AND a."usuarioId" = app_current_usuario_id()
    )
  )
  OR (
    app_current_perfil() = 'ADMIN_EXTERNO'
    AND EXISTS (
      SELECT 1 FROM "tarefas" t
      JOIN "projetos" p ON p."id" = t."projetoId"
      JOIN "atribuicoes" a ON a."entidadeTipo" = 'TAREFA' AND a."entidadeId" = t."id"
      WHERE p."clienteId" = "pessoas_operacional"."clienteId" AND a."usuarioId" = app_current_usuario_id()
    )
  )
);

CREATE POLICY pessoas_operacional_write ON "pessoas_operacional" FOR ALL USING (
  app_current_perfil() = 'ADMIN'
) WITH CHECK (
  app_current_perfil() = 'ADMIN'
);

-- ============================================================================
-- documentos
-- ============================================================================

ALTER TABLE "documentos" ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON "documentos" TO multiplus_app;

CREATE POLICY documentos_select ON "documentos" FOR SELECT USING (
  app_current_perfil() = 'ADMIN'
  OR (
    app_current_perfil() = 'ADMIN_INTERNO'
    AND EXISTS (
      SELECT 1 FROM "projetos" p
      JOIN "atribuicoes" a ON a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = p."id"
      WHERE p."clienteId" = "documentos"."clienteId" AND a."usuarioId" = app_current_usuario_id()
    )
  )
  OR (
    app_current_perfil() = 'ADMIN_EXTERNO'
    AND EXISTS (
      SELECT 1 FROM "tarefas" t
      JOIN "projetos" p ON p."id" = t."projetoId"
      JOIN "atribuicoes" a ON a."entidadeTipo" = 'TAREFA' AND a."entidadeId" = t."id"
      WHERE p."clienteId" = "documentos"."clienteId" AND a."usuarioId" = app_current_usuario_id()
    )
  )
);

CREATE POLICY documentos_write ON "documentos" FOR ALL USING (
  app_current_perfil() = 'ADMIN'
) WITH CHECK (
  app_current_perfil() = 'ADMIN'
);

-- ============================================================================
-- RF-020 — views de leitura segura (mascaramento de telefone)
--
-- Views comuns (não security_definer) rodam as políticas de RLS da tabela base com o
-- papel de quem está consultando — então a cascata de SELECT acima já se aplica
-- normalmente através delas. O que a view acrescenta é a coluna "telefone"
-- computada: só vem preenchida quando app_current_perfil() = 'ADMIN'. Todo código
-- de leitura/exibição do app deve usar estas views, nunca a tabela base.
-- ============================================================================

CREATE VIEW "responsaveis_legais_seguro" AS
SELECT
  "id",
  "clienteId",
  "nome",
  "endereco",
  "rg",
  "cpf",
  CASE WHEN app_current_perfil() = 'ADMIN' THEN "telefone" ELSE NULL END AS "telefone",
  "email",
  "criadoEm",
  "atualizadoEm"
FROM "responsaveis_legais";

GRANT SELECT ON "responsaveis_legais_seguro" TO multiplus_app;

CREATE VIEW "pontos_contato_seguro" AS
SELECT
  "id",
  "clienteId",
  "nome",
  "endereco",
  "rg",
  "cpf",
  CASE WHEN app_current_perfil() = 'ADMIN' THEN "telefone" ELSE NULL END AS "telefone",
  "email",
  "cargo",
  "criadoEm",
  "atualizadoEm"
FROM "pontos_contato";

GRANT SELECT ON "pontos_contato_seguro" TO multiplus_app;
