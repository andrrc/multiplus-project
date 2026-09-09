-- Row Level Security em cascata — ver docs/architecture-multiplus-software.md, Seção 3.2 e ADR-004.
--
-- Modelo de execução:
--   - Role dona das tabelas (definida em DATABASE_URL, ex. "multiplus"): usada só para migrations
--     e para as poucas operações que precisam rodar SEM sessão de usuário ainda estabelecida
--     (login por credenciais, emissão/validação de token de acesso — ver src/lib/db-owner.ts).
--     Por ser dona das tabelas, o RLS não se aplica a ela.
--   - Role de aplicação "multiplus_app" (definida em APP_DATABASE_URL): usada para toda operação
--     já autenticada. Antes de cada query, a aplicação roda, na mesma transação:
--       SET LOCAL app.usuario_id = '<id>';
--       SET LOCAL app.perfil = '<ADMIN|ADMIN_INTERNO|ADMIN_EXTERNO|CLIENTE>';
--     As políticas abaixo leem essas variáveis via as funções app_current_usuario_id()/app_current_perfil().
--
-- Escopo desta sprint: leitura em cascata (RNF-001, RF-018 a RF-020) para as 4 perfis em todas as
-- tabelas de domínio, e escrita para ADMIN (tudo) e ADMIN_INTERNO (dentro do(s) projeto(s) atribuído(s)).
-- ADMIN_EXTERNO e CLIENTE ficam somente-leitura nesta sprint, com uma exceção: RF-021/RN-004, o check
-- de subtarefa, que é a única escrita liberada para quem estiver atribuído à subtarefa. Escrita mais
-- ampla para ADMIN_EXTERNO (comentar/finalizar tarefa) entra junto com o módulo de Comentários/Notificações.

-- ============================================================================
-- Role de aplicação (sem senha aqui — definir com ALTER ROLE fora do controle de versão)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'multiplus_app') THEN
    CREATE ROLE multiplus_app WITH LOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO multiplus_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  "usuarios", "clientes", "projetos", "tarefas", "subtarefas", "atribuicoes"
TO multiplus_app;

-- "tokens_acesso" fica fora do alcance da role de aplicação: só a role dona (login/reset de senha
-- pré-autenticado) acessa essa tabela.

-- ============================================================================
-- Funções auxiliares — leem o contexto setado por SET LOCAL a cada requisição
-- ============================================================================

CREATE OR REPLACE FUNCTION app_current_usuario_id() RETURNS TEXT
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.usuario_id', true), '')
$$;

CREATE OR REPLACE FUNCTION app_current_perfil() RETURNS TEXT
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.perfil', true), '')
$$;

-- ============================================================================
-- usuarios
-- ============================================================================

ALTER TABLE "usuarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usuarios" FORCE ROW LEVEL SECURITY;

CREATE POLICY usuarios_select ON "usuarios" FOR SELECT USING (
  app_current_perfil() = 'ADMIN'
  OR "id" = app_current_usuario_id()
);

CREATE POLICY usuarios_write ON "usuarios" FOR ALL USING (
  app_current_perfil() = 'ADMIN'
) WITH CHECK (
  app_current_perfil() = 'ADMIN'
);

-- ============================================================================
-- clientes
-- ============================================================================

ALTER TABLE "clientes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clientes" FORCE ROW LEVEL SECURITY;

CREATE POLICY clientes_select ON "clientes" FOR SELECT USING (
  app_current_perfil() = 'ADMIN'
  OR (
    app_current_perfil() = 'CLIENTE'
    AND "id" = (SELECT "clienteId" FROM "usuarios" WHERE "id" = app_current_usuario_id())
  )
  OR (
    app_current_perfil() = 'ADMIN_INTERNO'
    AND EXISTS (
      SELECT 1 FROM "projetos" p
      JOIN "atribuicoes" a ON a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = p."id"
      WHERE p."clienteId" = "clientes"."id" AND a."usuarioId" = app_current_usuario_id()
    )
  )
  OR (
    app_current_perfil() = 'ADMIN_EXTERNO'
    AND EXISTS (
      SELECT 1 FROM "tarefas" t
      JOIN "projetos" p ON p."id" = t."projetoId"
      JOIN "atribuicoes" a ON a."entidadeTipo" = 'TAREFA' AND a."entidadeId" = t."id"
      WHERE p."clienteId" = "clientes"."id" AND a."usuarioId" = app_current_usuario_id()
    )
  )
);

CREATE POLICY clientes_write ON "clientes" FOR ALL USING (
  app_current_perfil() = 'ADMIN'
) WITH CHECK (
  app_current_perfil() = 'ADMIN'
);

-- ============================================================================
-- projetos
-- ============================================================================

ALTER TABLE "projetos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projetos" FORCE ROW LEVEL SECURITY;

CREATE POLICY projetos_select ON "projetos" FOR SELECT USING (
  app_current_perfil() = 'ADMIN'
  OR (
    app_current_perfil() = 'CLIENTE'
    AND "clienteId" = (SELECT "clienteId" FROM "usuarios" WHERE "id" = app_current_usuario_id())
  )
  OR (
    app_current_perfil() = 'ADMIN_INTERNO'
    AND EXISTS (
      SELECT 1 FROM "atribuicoes" a
      WHERE a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = "projetos"."id"
        AND a."usuarioId" = app_current_usuario_id()
    )
  )
  OR (
    app_current_perfil() = 'ADMIN_EXTERNO'
    AND EXISTS (
      SELECT 1 FROM "tarefas" t
      JOIN "atribuicoes" a ON a."entidadeTipo" = 'TAREFA' AND a."entidadeId" = t."id"
      WHERE t."projetoId" = "projetos"."id" AND a."usuarioId" = app_current_usuario_id()
    )
  )
);

-- Criação de projeto é ação do ADMIN (Cadastro de Clientes/Projetos — Talita).
CREATE POLICY projetos_insert ON "projetos" FOR INSERT WITH CHECK (
  app_current_perfil() = 'ADMIN'
);

-- ADMIN_INTERNO pode atualizar projetos aos quais foi atribuído (RF-018) — ex. status.
CREATE POLICY projetos_update ON "projetos" FOR UPDATE USING (
  app_current_perfil() = 'ADMIN'
  OR (
    app_current_perfil() = 'ADMIN_INTERNO'
    AND EXISTS (
      SELECT 1 FROM "atribuicoes" a
      WHERE a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = "projetos"."id"
        AND a."usuarioId" = app_current_usuario_id()
    )
  )
) WITH CHECK (
  app_current_perfil() = 'ADMIN'
  OR (
    app_current_perfil() = 'ADMIN_INTERNO'
    AND EXISTS (
      SELECT 1 FROM "atribuicoes" a
      WHERE a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = "projetos"."id"
        AND a."usuarioId" = app_current_usuario_id()
    )
  )
);

CREATE POLICY projetos_delete ON "projetos" FOR DELETE USING (
  app_current_perfil() = 'ADMIN'
);

-- ============================================================================
-- tarefas
-- ============================================================================

ALTER TABLE "tarefas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tarefas" FORCE ROW LEVEL SECURITY;

CREATE POLICY tarefas_select ON "tarefas" FOR SELECT USING (
  app_current_perfil() = 'ADMIN'
  OR (
    app_current_perfil() = 'CLIENTE'
    AND EXISTS (
      SELECT 1 FROM "projetos" p
      WHERE p."id" = "tarefas"."projetoId"
        AND p."clienteId" = (SELECT "clienteId" FROM "usuarios" WHERE "id" = app_current_usuario_id())
    )
  )
  OR (
    app_current_perfil() = 'ADMIN_INTERNO'
    AND EXISTS (
      SELECT 1 FROM "atribuicoes" a
      WHERE a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = "tarefas"."projetoId"
        AND a."usuarioId" = app_current_usuario_id()
    )
  )
  OR (
    app_current_perfil() = 'ADMIN_EXTERNO'
    AND EXISTS (
      SELECT 1 FROM "atribuicoes" a
      WHERE a."entidadeTipo" = 'TAREFA' AND a."entidadeId" = "tarefas"."id"
        AND a."usuarioId" = app_current_usuario_id()
    )
  )
);

-- ADMIN_INTERNO cria/gerencia tarefas dentro do(s) projeto(s) a que foi atribuído.
CREATE POLICY tarefas_insert ON "tarefas" FOR INSERT WITH CHECK (
  app_current_perfil() = 'ADMIN'
  OR (
    app_current_perfil() = 'ADMIN_INTERNO'
    AND EXISTS (
      SELECT 1 FROM "atribuicoes" a
      WHERE a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = "tarefas"."projetoId"
        AND a."usuarioId" = app_current_usuario_id()
    )
  )
);

CREATE POLICY tarefas_update ON "tarefas" FOR UPDATE USING (
  app_current_perfil() = 'ADMIN'
  OR (
    app_current_perfil() = 'ADMIN_INTERNO'
    AND EXISTS (
      SELECT 1 FROM "atribuicoes" a
      WHERE a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = "tarefas"."projetoId"
        AND a."usuarioId" = app_current_usuario_id()
    )
  )
) WITH CHECK (
  app_current_perfil() = 'ADMIN'
  OR (
    app_current_perfil() = 'ADMIN_INTERNO'
    AND EXISTS (
      SELECT 1 FROM "atribuicoes" a
      WHERE a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = "tarefas"."projetoId"
        AND a."usuarioId" = app_current_usuario_id()
    )
  )
);

CREATE POLICY tarefas_delete ON "tarefas" FOR DELETE USING (
  app_current_perfil() = 'ADMIN'
  OR (
    app_current_perfil() = 'ADMIN_INTERNO'
    AND EXISTS (
      SELECT 1 FROM "atribuicoes" a
      WHERE a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = "tarefas"."projetoId"
        AND a."usuarioId" = app_current_usuario_id()
    )
  )
);

-- Nota: "comentar e finalizar" pela ADMIN_EXTERNO (RF-019) ganha política de UPDATE própria
-- (com trigger restringindo os campos alteráveis, no mesmo padrão do RN-004 abaixo) junto do
-- módulo de Comentários/Notificações, quando o fluxo de "finalizar tarefa" for implementado.

-- ============================================================================
-- subtarefas
-- ============================================================================

ALTER TABLE "subtarefas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subtarefas" FORCE ROW LEVEL SECURITY;

CREATE POLICY subtarefas_select ON "subtarefas" FOR SELECT USING (
  app_current_perfil() = 'ADMIN'
  OR "atribuidoAId" = app_current_usuario_id()
  OR (
    app_current_perfil() = 'CLIENTE'
    AND EXISTS (
      SELECT 1 FROM "tarefas" t
      JOIN "projetos" p ON p."id" = t."projetoId"
      WHERE t."id" = "subtarefas"."tarefaId"
        AND p."clienteId" = (SELECT "clienteId" FROM "usuarios" WHERE "id" = app_current_usuario_id())
    )
  )
  OR (
    app_current_perfil() = 'ADMIN_INTERNO'
    AND EXISTS (
      SELECT 1 FROM "tarefas" t
      JOIN "atribuicoes" a ON a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = t."projetoId"
      WHERE t."id" = "subtarefas"."tarefaId" AND a."usuarioId" = app_current_usuario_id()
    )
  )
  OR (
    app_current_perfil() = 'ADMIN_EXTERNO'
    AND EXISTS (
      SELECT 1 FROM "atribuicoes" a
      WHERE a."entidadeTipo" = 'TAREFA' AND a."entidadeId" = "subtarefas"."tarefaId"
        AND a."usuarioId" = app_current_usuario_id()
    )
  )
);

-- Gestão do checklist (criar/excluir subtarefa) é do ADMIN ou do ADMIN_INTERNO dono do projeto.
CREATE POLICY subtarefas_insert ON "subtarefas" FOR INSERT WITH CHECK (
  app_current_perfil() = 'ADMIN'
  OR (
    app_current_perfil() = 'ADMIN_INTERNO'
    AND EXISTS (
      SELECT 1 FROM "tarefas" t
      JOIN "atribuicoes" a ON a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = t."projetoId"
      WHERE t."id" = "subtarefas"."tarefaId" AND a."usuarioId" = app_current_usuario_id()
    )
  )
);

-- Elegibilidade para UPDATE: ADMIN, ADMIN_INTERNO dono do projeto, OU a própria pessoa atribuída
-- (para poder concluir — RF-021/RN-004). A trigger abaixo restringe QUAIS campos cada um pode mudar.
CREATE POLICY subtarefas_update ON "subtarefas" FOR UPDATE USING (
  app_current_perfil() = 'ADMIN'
  OR "atribuidoAId" = app_current_usuario_id()
  OR (
    app_current_perfil() = 'ADMIN_INTERNO'
    AND EXISTS (
      SELECT 1 FROM "tarefas" t
      JOIN "atribuicoes" a ON a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = t."projetoId"
      WHERE t."id" = "subtarefas"."tarefaId" AND a."usuarioId" = app_current_usuario_id()
    )
  )
) WITH CHECK (
  app_current_perfil() = 'ADMIN'
  OR "atribuidoAId" = app_current_usuario_id()
  OR (
    app_current_perfil() = 'ADMIN_INTERNO'
    AND EXISTS (
      SELECT 1 FROM "tarefas" t
      JOIN "atribuicoes" a ON a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = t."projetoId"
      WHERE t."id" = "subtarefas"."tarefaId" AND a."usuarioId" = app_current_usuario_id()
    )
  )
);

CREATE POLICY subtarefas_delete ON "subtarefas" FOR DELETE USING (
  app_current_perfil() = 'ADMIN'
  OR (
    app_current_perfil() = 'ADMIN_INTERNO'
    AND EXISTS (
      SELECT 1 FROM "tarefas" t
      JOIN "atribuicoes" a ON a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = t."projetoId"
      WHERE t."id" = "subtarefas"."tarefaId" AND a."usuarioId" = app_current_usuario_id()
    )
  )
);

-- RN-004 em profundidade: mesmo que a política de RLS acima aceite a linha, quem não é ADMIN
-- nem ADMIN_INTERNO dono do projeto só pode alterar o campo "concluida" — e só se for a pessoa
-- atribuída. Sem isso, a política de UPDATE sozinha permitiria à pessoa atribuída editar
-- etiqueta/tarefaId/atribuidoAId também, o que RN-004 não previu.
CREATE OR REPLACE FUNCTION subtarefas_enforce_rn004() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF app_current_perfil() = 'ADMIN' THEN
    RETURN NEW;
  END IF;

  IF app_current_perfil() = 'ADMIN_INTERNO' AND EXISTS (
    SELECT 1 FROM "tarefas" t
    JOIN "atribuicoes" a ON a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = t."projetoId"
    WHERE t."id" = NEW."tarefaId" AND a."usuarioId" = app_current_usuario_id()
  ) THEN
    RETURN NEW;
  END IF;

  IF NEW."etiqueta" IS DISTINCT FROM OLD."etiqueta"
     OR NEW."tarefaId" IS DISTINCT FROM OLD."tarefaId"
     OR NEW."atribuidoAId" IS DISTINCT FROM OLD."atribuidoAId" THEN
    RAISE EXCEPTION 'RN-004: sem permissão para alterar esta subtarefa além do campo concluida';
  END IF;

  IF OLD."atribuidoAId" IS DISTINCT FROM app_current_usuario_id() THEN
    RAISE EXCEPTION 'RN-004: apenas o responsável pela subtarefa (ou o Administrador) pode concluí-la';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_subtarefas_rn004
BEFORE UPDATE ON "subtarefas"
FOR EACH ROW EXECUTE FUNCTION subtarefas_enforce_rn004();

-- ============================================================================
-- atribuicoes
-- ============================================================================

ALTER TABLE "atribuicoes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "atribuicoes" FORCE ROW LEVEL SECURITY;

CREATE POLICY atribuicoes_select ON "atribuicoes" FOR SELECT USING (
  app_current_perfil() = 'ADMIN'
  OR "usuarioId" = app_current_usuario_id()
);

-- Só o ADMIN decide quem é atribuído a que (projeto/tarefa) — RF-018/RF-019.
CREATE POLICY atribuicoes_write ON "atribuicoes" FOR ALL USING (
  app_current_perfil() = 'ADMIN'
) WITH CHECK (
  app_current_perfil() = 'ADMIN'
);
