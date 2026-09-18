-- A responsabilidade direta por uma tarefa tem a mesma visibilidade contextual da
-- responsabilidade por subtarefa: o colaborador alcança só o cliente e projeto que
-- contêm aquela tarefa. Os nomes das funções anteriores são preservados porque já são
-- usados pelas políticas; a semântica passa a cobrir os dois tipos de responsabilidade.

CREATE OR REPLACE FUNCTION colaborador_tem_subtarefa_na_tarefa(p_tarefa_id TEXT) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(EXISTS (
    SELECT 1
    FROM "tarefas" t
    LEFT JOIN "usuarios" u ON u."id" = app_current_usuario_id()
    WHERE t."id" = p_tarefa_id
      AND t."ativo"
      AND (
        t."responsavelUsuarioId" = app_current_usuario_id()
        OR (t."responsavelId" IS NOT NULL AND t."responsavelId" = u."pessoaEnvolvidaId")
        OR EXISTS (
          SELECT 1 FROM "subtarefas" s
          WHERE s."tarefaId" = t."id" AND s."ativo"
            AND (
              s."atribuidoAUsuarioId" = app_current_usuario_id()
              OR (s."atribuidoAId" IS NOT NULL AND s."atribuidoAId" = u."pessoaEnvolvidaId")
            )
        )
      )
  ), false)
$$;

CREATE OR REPLACE FUNCTION colaborador_tem_subtarefa_no_projeto(p_projeto_id TEXT) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(EXISTS (
    SELECT 1
    FROM "tarefas" t
    LEFT JOIN "usuarios" u ON u."id" = app_current_usuario_id()
    WHERE t."projetoId" = p_projeto_id
      AND t."ativo"
      AND (
        t."responsavelUsuarioId" = app_current_usuario_id()
        OR (t."responsavelId" IS NOT NULL AND t."responsavelId" = u."pessoaEnvolvidaId")
        OR EXISTS (
          SELECT 1 FROM "subtarefas" s
          WHERE s."tarefaId" = t."id" AND s."ativo"
            AND (
              s."atribuidoAUsuarioId" = app_current_usuario_id()
              OR (s."atribuidoAId" IS NOT NULL AND s."atribuidoAId" = u."pessoaEnvolvidaId")
            )
        )
      )
  ), false)
$$;

CREATE OR REPLACE FUNCTION colaborador_tem_subtarefa_no_cliente(p_cliente_id TEXT) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(EXISTS (
    SELECT 1
    FROM "tarefas" t
    JOIN "projetos" p ON p."id" = t."projetoId"
    LEFT JOIN "usuarios" u ON u."id" = app_current_usuario_id()
    WHERE p."clienteId" = p_cliente_id
      AND p."ativo" AND t."ativo"
      AND (
        t."responsavelUsuarioId" = app_current_usuario_id()
        OR (t."responsavelId" IS NOT NULL AND t."responsavelId" = u."pessoaEnvolvidaId")
        OR EXISTS (
          SELECT 1 FROM "subtarefas" s
          WHERE s."tarefaId" = t."id" AND s."ativo"
            AND (
              s."atribuidoAUsuarioId" = app_current_usuario_id()
              OR (s."atribuidoAId" IS NOT NULL AND s."atribuidoAId" = u."pessoaEnvolvidaId")
            )
        )
      )
  ), false)
$$;

-- RN-007: a responsabilidade da própria tarefa continua sendo a única escrita
-- liberada ao colaborador. Responsabilidade apenas por subtarefa não conclui a tarefa.
CREATE OR REPLACE FUNCTION concluir_tarefa(
  p_tarefa_id TEXT,
  p_proximo_prazo TIMESTAMP(3) DEFAULT NULL
) RETURNS TABLE (tarefa_id TEXT, proxima_id TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  atual "tarefas"%ROWTYPE;
  id_proxima TEXT;
  perfil_atual TEXT;
  usuario_atual TEXT;
  autorizado BOOLEAN;
BEGIN
  perfil_atual := app_current_perfil();
  usuario_atual := app_current_usuario_id();
  IF perfil_atual IS NULL THEN RAISE EXCEPTION 'Sessão de usuário ausente'; END IF;

  SELECT * INTO atual FROM "tarefas" WHERE "id" = p_tarefa_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tarefa não encontrada'; END IF;

  autorizado := perfil_atual = 'ADMIN' OR (
    atual."ativo" AND cliente_do_projeto_esta_ativo(atual."projetoId") AND (
      (perfil_atual = 'ADMIN_INTERNO' AND EXISTS (
        SELECT 1 FROM "atribuicoes" a WHERE a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = atual."projetoId" AND a."usuarioId" = usuario_atual
      ))
      OR (perfil_atual = 'ADMIN_EXTERNO' AND EXISTS (
        SELECT 1 FROM "atribuicoes" a WHERE a."entidadeTipo" = 'TAREFA' AND a."entidadeId" = atual."id" AND a."usuarioId" = usuario_atual
      ))
      OR (perfil_atual IN ('ADMIN_INTERNO', 'ADMIN_EXTERNO') AND (
        atual."responsavelUsuarioId" = usuario_atual
        OR (atual."responsavelId" IS NOT NULL AND atual."responsavelId" = (SELECT "pessoaEnvolvidaId" FROM "usuarios" WHERE "id" = usuario_atual))
      ))
    )
  );
  IF NOT autorizado THEN RAISE EXCEPTION 'RN-007: sem permissão para concluir esta tarefa'; END IF;

  IF atual."status" = 'Concluído' THEN tarefa_id := atual."id"; proxima_id := NULL; RETURN NEXT; RETURN; END IF;

  UPDATE "tarefas" SET "status" = 'Concluído', "atualizadoEm" = CURRENT_TIMESTAMP WHERE "id" = atual."id";

  IF atual."periodicidade" IS NOT NULL AND atual."ativo" AND atual."serieEncerradaEm" IS NULL AND p_proximo_prazo IS NOT NULL THEN
    SELECT "id" INTO id_proxima FROM "tarefas" WHERE "serieId" = COALESCE(atual."serieId", atual."id") AND "prazo" = p_proximo_prazo LIMIT 1;
    IF id_proxima IS NULL THEN
      id_proxima := md5(random()::text || clock_timestamp()::text || atual."id");
      INSERT INTO "tarefas" (
        "id", "projetoId", "nome", "descricao", "prazo", "status", "periodicidade", "serieId", "prazoOriginal", "serieEncerradaEm", "diasAntecedencia", "responsavelId", "responsavelUsuarioId", "ativo", "criadoEm", "atualizadoEm"
      ) VALUES (
        id_proxima, atual."projetoId", atual."nome", atual."descricao", p_proximo_prazo, 'A iniciar', atual."periodicidade", COALESCE(atual."serieId", atual."id"), COALESCE(atual."prazoOriginal", atual."prazo"), NULL, atual."diasAntecedencia", atual."responsavelId", atual."responsavelUsuarioId", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      );
      INSERT INTO "atribuicoes" ("id", "usuarioId", "entidadeTipo", "entidadeId", "criadoEm")
      SELECT md5(random()::text || clock_timestamp()::text || id_proxima), u."id", 'TAREFA', id_proxima, CURRENT_TIMESTAMP
      FROM "pessoas_envolvidas" pe JOIN "usuarios" u ON u."pessoaEnvolvidaId" = pe."id"
      WHERE pe."id" = atual."responsavelId" AND pe."temAcesso" = true
      ON CONFLICT ("usuarioId", "entidadeTipo", "entidadeId") DO NOTHING;
    END IF;
  END IF;

  tarefa_id := atual."id"; proxima_id := id_proxima; RETURN NEXT;
END;
$$;
