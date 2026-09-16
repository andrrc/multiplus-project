-- RF-039 / RN-009 / ADR-008 — herança da desativação até Projeto, Tarefa e Subtarefa.
--
-- Fecha o vazamento encontrado na auditoria da Sprint 3 (§ 5.1): a migration
-- 20260916110500_rls_soft_delete_cascata cobriu as quatro filhas diretas de "clientes"
-- (responsaveis_legais, pontos_contato, pessoas_envolvidas, documentos) e parou ali. Com o
-- cliente desativado, um Colaborador Interno atribuído deixava de ver o cliente e
-- continuava vendo o projeto e as tarefas dele:
--
--     clientes visiveis: 0   projetos visiveis: 1   tarefas visiveis: 1
--
-- O plano da Sprint 3 (tarefa A1) justificou o recorte dizendo que Projeto, Tarefa e
-- Subtarefa "entram na Sprint 4, quando as tabelas existirem". A premissa estava errada: as
-- três tabelas existem desde a Sprint 1, com RLS, e é só o CRUD delas que é da Sprint 4. A
-- implementação seguiu o plano corretamente; o plano é que descreveu mal o schema.
--
-- Corrigido agora, e não na Sprint 4, porque hoje não há uma única linha real nessas
-- tabelas (só fixtures de teste) — a mudança de política é trivialmente segura neste
-- momento e seria correção em produção depois.
--
-- ============================================================================
-- Por que DUAS funções, e não uma
-- ============================================================================
--
-- "projetos" tem "clienteId" e usa cliente_esta_ativo() direto. "tarefas" tem "projetoId" e
-- "subtarefas" tem apenas "tarefaId" — nenhuma das duas alcança o cliente sem um salto.
--
-- Esse salto NÃO pode ser um subselect dentro da política: um `... IN (SELECT "projetoId"
-- FROM "tarefas" ...)` escrito na política de "subtarefas" faz o Postgres expandir
-- tarefas_select inteira ao montar o plano, que é exatamente o caminho da recursão corrigida
-- em 20260903191825_fix_rls_projetos_tarefas_recursion. Por isso cada nível ganha a própria
-- função SECURITY DEFINER, que responde só "o cliente lá no topo está ativo?" sem reacionar
-- política nenhuma:
--
--   projetos   -> cliente_esta_ativo("clienteId")            (já existia)
--   tarefas    -> cliente_do_projeto_esta_ativo("projetoId")
--   subtarefas -> cliente_da_tarefa_esta_ativo("tarefaId")
--
-- As duas novas devolvem false, nunca NULL, pelo mesmo motivo registrado na original: numa
-- cláusula USING os dois excluem a linha igual, mas o valor explícito impede que um futuro
-- `NOT cliente_do_projeto_esta_ativo(...)` repita o bug de NULL da trigger da RN-004
-- (20260910192900_fix_rn004_null_ambos_lados).
--
-- ============================================================================
-- Por que as políticas de ESCRITA também entram
-- ============================================================================
--
-- O RF-039 diz que registro desativado é somente leitura, e é assim que as quatro filhas
-- diretas já se comportam: pessoas_envolvidas_write e documentos_write exigem
-- cliente_esta_ativo, então o banco recusa criar ou editar filho de cliente desativado —
-- inclusive para o Administrador. Projeto, Tarefa e Subtarefa são filhas na mesma cadeia e
-- não têm motivo para divergir: deixar a escrita aberta permitiria editar o projeto de um
-- cliente que saiu do ar, pela mesma porta que a leitura acabou de fechar.
--
-- A exceção continua sendo só "clientes": clientes_write não checa ativo porque é o próprio
-- UPDATE que reativa o cliente. Não existe exceção equivalente aqui — quando a Sprint 4
-- acrescentar "projetos.ativo", reativar um projeto vai exigir que o cliente dele esteja
-- ativo primeiro, o que é a consequência correta da cascata por herança (reativar o pai já
-- devolve os filhos ao estado exato anterior, sem nenhuma outra ação).
--
-- Nas políticas de SELECT o Administrador segue enxergando o desativado — é ele quem
-- reativa (mesmo padrão de 20260916110500). Nas de escrita, não há esse escape.

CREATE OR REPLACE FUNCTION cliente_do_projeto_esta_ativo(p_projeto_id TEXT) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT c."ativo"
    FROM "projetos" p
    JOIN "clientes" c ON c."id" = p."clienteId"
    WHERE p."id" = p_projeto_id
  ), false)
$$;

CREATE OR REPLACE FUNCTION cliente_da_tarefa_esta_ativo(p_tarefa_id TEXT) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT c."ativo"
    FROM "tarefas" t
    JOIN "projetos" p ON p."id" = t."projetoId"
    JOIN "clientes" c ON c."id" = p."clienteId"
    WHERE t."id" = p_tarefa_id
  ), false)
$$;

-- ============================================================================
-- projetos
-- ============================================================================

DROP POLICY projetos_select ON "projetos";

CREATE POLICY projetos_select ON "projetos" FOR SELECT USING (
  (app_current_perfil() = 'ADMIN' OR cliente_esta_ativo("clienteId"))
  AND (
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
      AND admin_externo_tem_tarefa_no_projeto("projetos"."id")
    )
  )
);

DROP POLICY projetos_insert ON "projetos";

CREATE POLICY projetos_insert ON "projetos" FOR INSERT WITH CHECK (
  app_current_perfil() = 'ADMIN' AND cliente_esta_ativo("clienteId")
);

DROP POLICY projetos_update ON "projetos";

CREATE POLICY projetos_update ON "projetos" FOR UPDATE USING (
  cliente_esta_ativo("clienteId")
  AND (
    app_current_perfil() = 'ADMIN'
    OR (
      app_current_perfil() = 'ADMIN_INTERNO'
      AND EXISTS (
        SELECT 1 FROM "atribuicoes" a
        WHERE a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = "projetos"."id"
          AND a."usuarioId" = app_current_usuario_id()
      )
    )
  )
) WITH CHECK (
  cliente_esta_ativo("clienteId")
  AND (
    app_current_perfil() = 'ADMIN'
    OR (
      app_current_perfil() = 'ADMIN_INTERNO'
      AND EXISTS (
        SELECT 1 FROM "atribuicoes" a
        WHERE a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = "projetos"."id"
          AND a."usuarioId" = app_current_usuario_id()
      )
    )
  )
);

DROP POLICY projetos_delete ON "projetos";

CREATE POLICY projetos_delete ON "projetos" FOR DELETE USING (
  app_current_perfil() = 'ADMIN' AND cliente_esta_ativo("clienteId")
);

-- ============================================================================
-- tarefas
-- ============================================================================

DROP POLICY tarefas_select ON "tarefas";

CREATE POLICY tarefas_select ON "tarefas" FOR SELECT USING (
  (app_current_perfil() = 'ADMIN' OR cliente_do_projeto_esta_ativo("projetoId"))
  AND (
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
  )
);

DROP POLICY tarefas_insert ON "tarefas";

CREATE POLICY tarefas_insert ON "tarefas" FOR INSERT WITH CHECK (
  cliente_do_projeto_esta_ativo("projetoId")
  AND (
    app_current_perfil() = 'ADMIN'
    OR (
      app_current_perfil() = 'ADMIN_INTERNO'
      AND EXISTS (
        SELECT 1 FROM "atribuicoes" a
        WHERE a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = "tarefas"."projetoId"
          AND a."usuarioId" = app_current_usuario_id()
      )
    )
  )
);

DROP POLICY tarefas_update ON "tarefas";

CREATE POLICY tarefas_update ON "tarefas" FOR UPDATE USING (
  cliente_do_projeto_esta_ativo("projetoId")
  AND (
    app_current_perfil() = 'ADMIN'
    OR (
      app_current_perfil() = 'ADMIN_INTERNO'
      AND EXISTS (
        SELECT 1 FROM "atribuicoes" a
        WHERE a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = "tarefas"."projetoId"
          AND a."usuarioId" = app_current_usuario_id()
      )
    )
  )
) WITH CHECK (
  cliente_do_projeto_esta_ativo("projetoId")
  AND (
    app_current_perfil() = 'ADMIN'
    OR (
      app_current_perfil() = 'ADMIN_INTERNO'
      AND EXISTS (
        SELECT 1 FROM "atribuicoes" a
        WHERE a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = "tarefas"."projetoId"
          AND a."usuarioId" = app_current_usuario_id()
      )
    )
  )
);

DROP POLICY tarefas_delete ON "tarefas";

CREATE POLICY tarefas_delete ON "tarefas" FOR DELETE USING (
  cliente_do_projeto_esta_ativo("projetoId")
  AND (
    app_current_perfil() = 'ADMIN'
    OR (
      app_current_perfil() = 'ADMIN_INTERNO'
      AND EXISTS (
        SELECT 1 FROM "atribuicoes" a
        WHERE a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = "tarefas"."projetoId"
          AND a."usuarioId" = app_current_usuario_id()
      )
    )
  )
);

-- ============================================================================
-- subtarefas
-- ============================================================================
-- O ramo `"atribuidoAId" = (SELECT "pessoaEnvolvidaId" ...)` fica fora dos ramos de perfil
-- de propósito (RN-004/ADR-007): é a pessoa atribuída, qualquer que seja o perfil dela. A
-- herança entra por fora, então ela também deixa de alcançar a subtarefa quando o cliente é
-- desativado.

DROP POLICY subtarefas_select ON "subtarefas";

CREATE POLICY subtarefas_select ON "subtarefas" FOR SELECT USING (
  (app_current_perfil() = 'ADMIN' OR cliente_da_tarefa_esta_ativo("tarefaId"))
  AND (
    app_current_perfil() = 'ADMIN'
    OR "atribuidoAId" = (SELECT "pessoaEnvolvidaId" FROM "usuarios" WHERE "id" = app_current_usuario_id())
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
  )
);

DROP POLICY subtarefas_insert ON "subtarefas";

CREATE POLICY subtarefas_insert ON "subtarefas" FOR INSERT WITH CHECK (
  cliente_da_tarefa_esta_ativo("tarefaId")
  AND (
    app_current_perfil() = 'ADMIN'
    OR (
      app_current_perfil() = 'ADMIN_INTERNO'
      AND EXISTS (
        SELECT 1 FROM "tarefas" t
        JOIN "atribuicoes" a ON a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = t."projetoId"
        WHERE t."id" = "subtarefas"."tarefaId" AND a."usuarioId" = app_current_usuario_id()
      )
    )
  )
);

DROP POLICY subtarefas_update ON "subtarefas";

CREATE POLICY subtarefas_update ON "subtarefas" FOR UPDATE USING (
  cliente_da_tarefa_esta_ativo("tarefaId")
  AND (
    app_current_perfil() = 'ADMIN'
    OR "atribuidoAId" = (SELECT "pessoaEnvolvidaId" FROM "usuarios" WHERE "id" = app_current_usuario_id())
    OR (
      app_current_perfil() = 'ADMIN_INTERNO'
      AND EXISTS (
        SELECT 1 FROM "tarefas" t
        JOIN "atribuicoes" a ON a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = t."projetoId"
        WHERE t."id" = "subtarefas"."tarefaId" AND a."usuarioId" = app_current_usuario_id()
      )
    )
  )
) WITH CHECK (
  cliente_da_tarefa_esta_ativo("tarefaId")
  AND (
    app_current_perfil() = 'ADMIN'
    OR "atribuidoAId" = (SELECT "pessoaEnvolvidaId" FROM "usuarios" WHERE "id" = app_current_usuario_id())
    OR (
      app_current_perfil() = 'ADMIN_INTERNO'
      AND EXISTS (
        SELECT 1 FROM "tarefas" t
        JOIN "atribuicoes" a ON a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = t."projetoId"
        WHERE t."id" = "subtarefas"."tarefaId" AND a."usuarioId" = app_current_usuario_id()
      )
    )
  )
);

DROP POLICY subtarefas_delete ON "subtarefas";

CREATE POLICY subtarefas_delete ON "subtarefas" FOR DELETE USING (
  cliente_da_tarefa_esta_ativo("tarefaId")
  AND (
    app_current_perfil() = 'ADMIN'
    OR (
      app_current_perfil() = 'ADMIN_INTERNO'
      AND EXISTS (
        SELECT 1 FROM "tarefas" t
        JOIN "atribuicoes" a ON a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = t."projetoId"
        WHERE t."id" = "subtarefas"."tarefaId" AND a."usuarioId" = app_current_usuario_id()
      )
    )
  )
);
