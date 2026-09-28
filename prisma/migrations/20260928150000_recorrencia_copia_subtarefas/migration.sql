-- Cada ocorrência recorrente recebe cópias novas das subtarefas ativas não canceladas.
-- A cópia acontece na mesma transação da tarefa e só quando a próxima ocorrência é criada.
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
  IF autorizado IS NOT TRUE THEN RAISE EXCEPTION 'RN-007: sem permissão para concluir esta tarefa'; END IF;

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

      INSERT INTO "subtarefas" (
        "id", "tarefaId", "titulo", "descricao", "prazo", "etiquetas", "status", "ativo", "criadoEm", "atualizadoEm"
      )
      SELECT
        md5(random()::text || clock_timestamp()::text || s."id" || id_proxima),
        id_proxima,
        s."titulo",
        s."descricao",
        CASE
          WHEN s."prazo" IS NULL OR atual."prazo" IS NULL THEN s."prazo"
          ELSE p_proximo_prazo + (s."prazo" - atual."prazo")
        END,
        s."etiquetas",
        'EM_ANDAMENTO',
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      FROM "subtarefas" s
      WHERE s."tarefaId" = atual."id"
        AND s."ativo"
        AND s."status" <> 'CANCELADO';
    END IF;
  END IF;

  tarefa_id := atual."id"; proxima_id := id_proxima; RETURN NEXT;
END;
$$;
