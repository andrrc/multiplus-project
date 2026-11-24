-- As subtarefas copiadas para a próxima ocorrência passam a medir a distância até a DATA DA SÉRIE da ocorrência
-- atual (p_prazo_serie, calculada pelo TypeScript), e não até o prazo vigente da tarefa. Com o prazo prorrogado
-- (pedido de prazo aprovado ou edição da administração), a conta antiga deslocava a data das subtarefas.
-- Sem p_prazo_serie, o comportamento é o de antes (prazo atual). Parte do corpo de
-- 20261117120000_comprovantes_etapa1, a mais recente que define a função. Como a assinatura ganha um argumento,
-- a função antiga sai (senão as duas conviveriam) e as permissões são refeitas para a nova.
DROP FUNCTION concluir_tarefa(TEXT, TIMESTAMP);

CREATE FUNCTION concluir_tarefa(
  p_tarefa_id TEXT,
  p_proximo_prazo TIMESTAMP(3) DEFAULT NULL,
  p_prazo_serie TIMESTAMP(3) DEFAULT NULL
) RETURNS TABLE (tarefa_id TEXT, proxima_id TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  atual "tarefas"%ROWTYPE;
  id_proxima TEXT;
BEGIN
  IF app_current_perfil() IS NULL THEN RAISE EXCEPTION 'Sessão de usuário ausente'; END IF;
  IF app_current_perfil() <> 'ADMIN' AND NOT decisao_delegada_tarefa(p_tarefa_id) THEN RAISE EXCEPTION 'RN-007: conclusão de colaborador requer confirmação do Administrador'; END IF;

  SELECT * INTO atual FROM "tarefas" WHERE "id" = p_tarefa_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tarefa não encontrada'; END IF;
  IF NOT atual."ativo" OR NOT cliente_do_projeto_esta_ativo(atual."projetoId") OR atual."status" = 'Cancelado' THEN
    RAISE EXCEPTION 'RN-007: tarefa inativa ou cancelada não pode ser concluída';
  END IF;
  IF atual."status" = 'Concluído' THEN tarefa_id := atual."id"; proxima_id := NULL; RETURN NEXT; RETURN; END IF;

  UPDATE "tarefas" SET "status" = 'Concluído', "atualizadoEm" = CURRENT_TIMESTAMP WHERE "id" = atual."id";
  IF atual."periodicidade" IS NOT NULL AND atual."ativo" AND atual."serieEncerradaEm" IS NULL AND p_proximo_prazo IS NOT NULL THEN
    SELECT "id" INTO id_proxima FROM "tarefas" WHERE "serieId" = COALESCE(atual."serieId", atual."id") AND "prazo" = p_proximo_prazo LIMIT 1;
    IF id_proxima IS NULL THEN
      id_proxima := md5(random()::text || clock_timestamp()::text || atual."id");
      INSERT INTO "tarefas" (
        "id", "projetoId", "nome", "descricao", "prazo", "status", "periodicidade", "diaSemana", "serieId", "prazoOriginal", "serieEncerradaEm", "diasAntecedencia", "responsavelId", "responsavelUsuarioId", "comprovanteExigido", "comprovanteQuantidade", "comprovanteInstrucoes", "ativo", "criadoEm", "atualizadoEm"
      ) VALUES (
        id_proxima, atual."projetoId", atual."nome", atual."descricao", p_proximo_prazo, 'A iniciar', atual."periodicidade", atual."diaSemana", COALESCE(atual."serieId", atual."id"), COALESCE(atual."prazoOriginal", atual."prazo"), NULL, atual."diasAntecedencia", atual."responsavelId", atual."responsavelUsuarioId", atual."comprovanteExigido", atual."comprovanteQuantidade", atual."comprovanteInstrucoes", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      );
      INSERT INTO "atribuicoes" ("id", "usuarioId", "entidadeTipo", "entidadeId", "criadoEm")
      SELECT md5(random()::text || clock_timestamp()::text || id_proxima), u."id", 'TAREFA', id_proxima, CURRENT_TIMESTAMP
      FROM "pessoas_envolvidas" pe JOIN "usuarios" u ON u."pessoaEnvolvidaId" = pe."id"
      WHERE pe."id" = atual."responsavelId" AND pe."temAcesso" = true
      ON CONFLICT ("usuarioId", "entidadeTipo", "entidadeId") DO NOTHING;
      INSERT INTO "subtarefas" ("id", "tarefaId", "titulo", "descricao", "prazo", "etiquetas", "comprovanteExigido", "comprovanteQuantidade", "comprovanteInstrucoes", "status", "ativo", "criadoEm", "atualizadoEm")
      SELECT md5(random()::text || clock_timestamp()::text || s."id" || id_proxima), id_proxima, s."titulo", s."descricao",
        CASE WHEN s."prazo" IS NULL OR atual."prazo" IS NULL THEN s."prazo" ELSE p_proximo_prazo + (s."prazo" - COALESCE(p_prazo_serie, atual."prazo")) END,
        s."etiquetas", s."comprovanteExigido", s."comprovanteQuantidade", s."comprovanteInstrucoes", 'EM_ANDAMENTO', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM "subtarefas" s WHERE s."tarefaId" = atual."id" AND s."ativo" AND s."status" <> 'CANCELADO';
    END IF;
  END IF;
  tarefa_id := atual."id"; proxima_id := id_proxima; RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION concluir_tarefa(TEXT, TIMESTAMP, TIMESTAMP) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION concluir_tarefa(TEXT, TIMESTAMP, TIMESTAMP) TO multiplus_app;
