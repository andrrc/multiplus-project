-- RF-039 / RN-009 / ADR-008 — retrofit das políticas de RLS para a desativação.
--
-- Duas camadas, deliberadamente diferentes:
--
--   1. RLS (aqui): registro desativado desaparece para TODO perfil que não seja o
--      Administrador. Não dá pra esconder do Administrador no banco — é ele quem precisa
--      enxergar o desativado pra reativá-lo (Tela A1, toggle "Mostrar desativados").
--   2. Aplicação (src/lib/*): as listagens filtram ativo = true por padrão, e só o
--      Administrador tem como desligar esse filtro pelo toggle.
--
-- Ou seja: a RLS garante que nenhum colaborador nem cliente veja registro desativado,
-- aconteça o que acontecer na camada de cima; o toggle é uma conveniência de UI que só
-- existe para quem a RLS já autoriza a enxergar tudo.
--
-- Cascata por herança (ADR-008): filho de cliente desativado fica inacessível sem que
-- ninguém marque ativo = false nos filhos — assim reativar o cliente devolve tudo ao
-- estado exato anterior, em vez de ser uma operação destrutiva de informação.
--
-- Por que uma função SECURITY DEFINER em vez de um EXISTS direto em "clientes": um
-- subselect em "clientes" dentro da política de um filho faz o Postgres expandir
-- clientes_select inteira (que já referencia projetos, tarefas e atribuicoes) ao montar o
-- plano. É exatamente o caminho que gerou a recursão corrigida em
-- 20260903191825_fix_rls_projetos_tarefas_recursion. A função abaixo responde só "o pai
-- está ativo?", sem reacionar política nenhuma.

CREATE OR REPLACE FUNCTION cliente_esta_ativo(p_cliente_id TEXT) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT "ativo" FROM "clientes" WHERE "id" = p_cliente_id), false)
$$;

-- Cliente inexistente devolve false, nunca NULL. Numa cláusula USING os dois excluem a
-- linha igual, mas o valor explícito evita que um futuro NOT cliente_esta_ativo(...)
-- — que com NULL avalia NULL, e NULL não dispara um IF NOT em plpgsql — repita o bug de
-- RN-004 corrigido em 20260910192900_fix_rn004_null_ambos_lados.

-- ============================================================================
-- clientes — filtro no próprio registro
-- ============================================================================

DROP POLICY clientes_select ON "clientes";

CREATE POLICY clientes_select ON "clientes" FOR SELECT USING (
  (app_current_perfil() = 'ADMIN' OR "ativo")
  AND (
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
  )
);

-- clientes_write continua ADMIN-only sem checar ativo: é o próprio UPDATE que reativa o
-- cliente. "Registro desativado é somente leitura" para os demais campos é garantido na
-- camada de aplicação (src/lib/desativacao.ts), coberto por teste de integração.

-- ============================================================================
-- responsaveis_legais / pontos_contato — sem ativo próprio (o RF-039 não os lista);
-- herdam a visibilidade do cliente.
-- ============================================================================

DROP POLICY responsaveis_legais_select ON "responsaveis_legais";

CREATE POLICY responsaveis_legais_select ON "responsaveis_legais" FOR SELECT USING (
  (app_current_perfil() = 'ADMIN' OR cliente_esta_ativo("clienteId"))
  AND (
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
  )
);

DROP POLICY responsaveis_legais_write ON "responsaveis_legais";

CREATE POLICY responsaveis_legais_write ON "responsaveis_legais" FOR ALL USING (
  app_current_perfil() = 'ADMIN' AND cliente_esta_ativo("clienteId")
) WITH CHECK (
  app_current_perfil() = 'ADMIN' AND cliente_esta_ativo("clienteId")
);

DROP POLICY pontos_contato_select ON "pontos_contato";

CREATE POLICY pontos_contato_select ON "pontos_contato" FOR SELECT USING (
  (app_current_perfil() = 'ADMIN' OR cliente_esta_ativo("clienteId"))
  AND (
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
  )
);

DROP POLICY pontos_contato_write ON "pontos_contato";

CREATE POLICY pontos_contato_write ON "pontos_contato" FOR ALL USING (
  app_current_perfil() = 'ADMIN' AND cliente_esta_ativo("clienteId")
) WITH CHECK (
  app_current_perfil() = 'ADMIN' AND cliente_esta_ativo("clienteId")
);

-- ============================================================================
-- pessoas_envolvidas — ativo próprio + herança do cliente
-- ============================================================================

DROP POLICY pessoas_envolvidas_select ON "pessoas_envolvidas";

CREATE POLICY pessoas_envolvidas_select ON "pessoas_envolvidas" FOR SELECT USING (
  (app_current_perfil() = 'ADMIN' OR ("ativo" AND cliente_esta_ativo("clienteId")))
  AND (
    app_current_perfil() = 'ADMIN'
    OR (
      app_current_perfil() = 'ADMIN_INTERNO'
      AND EXISTS (
        SELECT 1 FROM "projetos" p
        JOIN "atribuicoes" a ON a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = p."id"
        WHERE p."clienteId" = "pessoas_envolvidas"."clienteId" AND a."usuarioId" = app_current_usuario_id()
      )
    )
    OR (
      app_current_perfil() = 'ADMIN_EXTERNO'
      AND EXISTS (
        SELECT 1 FROM "tarefas" t
        JOIN "projetos" p ON p."id" = t."projetoId"
        JOIN "atribuicoes" a ON a."entidadeTipo" = 'TAREFA' AND a."entidadeId" = t."id"
        WHERE p."clienteId" = "pessoas_envolvidas"."clienteId" AND a."usuarioId" = app_current_usuario_id()
      )
    )
  )
);

DROP POLICY pessoas_envolvidas_write ON "pessoas_envolvidas";

CREATE POLICY pessoas_envolvidas_write ON "pessoas_envolvidas" FOR ALL USING (
  app_current_perfil() = 'ADMIN' AND cliente_esta_ativo("clienteId")
) WITH CHECK (
  app_current_perfil() = 'ADMIN' AND cliente_esta_ativo("clienteId")
);

-- ============================================================================
-- documentos — ativo próprio + herança do cliente
-- ============================================================================

DROP POLICY documentos_select ON "documentos";

CREATE POLICY documentos_select ON "documentos" FOR SELECT USING (
  (app_current_perfil() = 'ADMIN' OR ("ativo" AND cliente_esta_ativo("clienteId")))
  AND (
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
  )
);

DROP POLICY documentos_write ON "documentos";

CREATE POLICY documentos_write ON "documentos" FOR ALL USING (
  app_current_perfil() = 'ADMIN' AND cliente_esta_ativo("clienteId")
) WITH CHECK (
  app_current_perfil() = 'ADMIN' AND cliente_esta_ativo("clienteId")
);

-- ============================================================================
-- usuarios — ativo já existia; a política não muda
-- ============================================================================
-- Usuário desativado não chega a ter sessão (autenticarComCredenciais recusa antes de
-- qualquer query com contexto), então não há o que filtrar em usuarios_select além do que
-- ela já faz: Administrador vê todos, os demais veem apenas a própria linha.
