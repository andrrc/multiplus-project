CREATE TYPE "StatusSolicitacaoConclusao" AS ENUM ('PENDENTE', 'APROVADA', 'REJEITADA', 'CANCELADA');

CREATE TABLE "solicitacoes_conclusao" (
  "id" TEXT NOT NULL,
  "tarefaId" TEXT,
  "subtarefaId" TEXT,
  "solicitadoPorId" TEXT,
  "solicitadoPorNome" TEXT NOT NULL,
  "solicitadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "statusAnterior" TEXT NOT NULL,
  "status" "StatusSolicitacaoConclusao" NOT NULL DEFAULT 'PENDENTE',
  "decididoPorId" TEXT,
  "decididoPorNome" TEXT,
  "decididoEm" TIMESTAMP(3),
  "comentarioDecisao" TEXT,
  CONSTRAINT "solicitacoes_conclusao_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "solicitacoes_conclusao_alvo_check" CHECK (("tarefaId" IS NOT NULL) <> ("subtarefaId" IS NOT NULL)),
  CONSTRAINT "solicitacoes_conclusao_status_anterior_check" CHECK ("statusAnterior" IN ('A_INICIAR', 'EM_ANDAMENTO', 'AGUARDANDO_DOCUMENTO_CLIENTE', 'VISITA_REUNIAO_AGENDADA', 'PROTOCOLADO', 'SOB_ANALISE_ORGAO_AMBIENTAL', 'COM_EXIGENCIA_A_CUMPRIR', 'CONCLUIDO', 'CANCELADO')),
  CONSTRAINT "solicitacoes_conclusao_comentario_check" CHECK ("comentarioDecisao" IS NULL OR char_length("comentarioDecisao") <= 2000),
  CONSTRAINT "solicitacoes_conclusao_tarefa_fkey" FOREIGN KEY ("tarefaId") REFERENCES "tarefas"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "solicitacoes_conclusao_subtarefa_fkey" FOREIGN KEY ("subtarefaId") REFERENCES "subtarefas"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "solicitacoes_conclusao_solicitante_fkey" FOREIGN KEY ("solicitadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "solicitacoes_conclusao_decisor_fkey" FOREIGN KEY ("decididoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "solicitacoes_conclusao_status_solicitadoEm_idx" ON "solicitacoes_conclusao"("status", "solicitadoEm");
CREATE INDEX "solicitacoes_conclusao_tarefaId_solicitadoEm_idx" ON "solicitacoes_conclusao"("tarefaId", "solicitadoEm");
CREATE INDEX "solicitacoes_conclusao_subtarefaId_solicitadoEm_idx" ON "solicitacoes_conclusao"("subtarefaId", "solicitadoEm");
CREATE UNIQUE INDEX "solicitacoes_conclusao_tarefa_pendente_key" ON "solicitacoes_conclusao"("tarefaId") WHERE "tarefaId" IS NOT NULL AND "status" = 'PENDENTE';
CREATE UNIQUE INDEX "solicitacoes_conclusao_subtarefa_pendente_key" ON "solicitacoes_conclusao"("subtarefaId") WHERE "subtarefaId" IS NOT NULL AND "status" = 'PENDENTE';

ALTER TABLE "solicitacoes_conclusao" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE ON "solicitacoes_conclusao" TO multiplus_app;
CREATE POLICY solicitacoes_conclusao_select ON "solicitacoes_conclusao" FOR SELECT USING (
  app_current_perfil() = 'ADMIN'
  OR "solicitadoPorId" = app_current_usuario_id()
  OR (
    app_current_perfil() IN ('ADMIN_INTERNO', 'ADMIN_EXTERNO')
    AND EXISTS (
      SELECT 1 FROM "usuarios" u
      WHERE u."id" = app_current_usuario_id() AND u."ativo"
        AND (
          ("tarefaId" IS NOT NULL AND EXISTS (
            SELECT 1 FROM "tarefas" t
            JOIN "projetos" p ON p."id" = t."projetoId"
            JOIN "clientes" c ON c."id" = p."clienteId"
            WHERE t."id" = "solicitacoes_conclusao"."tarefaId"
              AND t."ativo" AND p."ativo" AND c."ativo"
              AND (
                (app_current_perfil() = 'ADMIN_INTERNO' AND EXISTS (
                  SELECT 1 FROM "atribuicoes" a WHERE a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = p."id" AND a."usuarioId" = u."id"
                ))
                OR (app_current_perfil() = 'ADMIN_EXTERNO' AND EXISTS (
                  SELECT 1 FROM "atribuicoes" a WHERE a."entidadeTipo" = 'TAREFA' AND a."entidadeId" = t."id" AND a."usuarioId" = u."id"
                ))
                OR t."responsavelUsuarioId" = u."id"
                OR (t."responsavelId" IS NOT NULL AND u."pessoaEnvolvidaId" IS NOT NULL AND t."responsavelId" = u."pessoaEnvolvidaId")
              )
          ))
          OR ("subtarefaId" IS NOT NULL AND EXISTS (
            SELECT 1 FROM "subtarefas" s
            JOIN "tarefas" t ON t."id" = s."tarefaId"
            JOIN "projetos" p ON p."id" = t."projetoId"
            JOIN "clientes" c ON c."id" = p."clienteId"
            WHERE s."id" = "solicitacoes_conclusao"."subtarefaId"
              AND s."ativo" AND t."ativo" AND p."ativo" AND c."ativo"
              AND (
                s."atribuidoAUsuarioId" = u."id"
                OR (s."atribuidoAId" IS NOT NULL AND u."pessoaEnvolvidaId" IS NOT NULL AND s."atribuidoAId" = u."pessoaEnvolvidaId")
              )
          ))
        )
    )
  )
);
CREATE POLICY solicitacoes_conclusao_update ON "solicitacoes_conclusao" FOR UPDATE USING (
  app_current_perfil() = 'ADMIN'
  OR ("solicitadoPorId" = app_current_usuario_id() AND "status" = 'PENDENTE')
) WITH CHECK (
  app_current_perfil() = 'ADMIN'
  OR ("solicitadoPorId" = app_current_usuario_id() AND "status" = 'CANCELADA')
);

CREATE OR REPLACE FUNCTION solicitacoes_conclusao_enforce() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW."status" <> 'PENDENTE' OR NEW."decididoPorId" IS NOT NULL OR NEW."decididoEm" IS NOT NULL THEN
      RAISE EXCEPTION 'RN-007: nova solicitação deve iniciar pendente';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD."status" <> 'PENDENTE'
     OR NEW."id" IS DISTINCT FROM OLD."id"
     OR NEW."tarefaId" IS DISTINCT FROM OLD."tarefaId"
     OR NEW."subtarefaId" IS DISTINCT FROM OLD."subtarefaId"
     OR NEW."solicitadoPorId" IS DISTINCT FROM OLD."solicitadoPorId"
     OR NEW."solicitadoPorNome" IS DISTINCT FROM OLD."solicitadoPorNome"
     OR NEW."solicitadoEm" IS DISTINCT FROM OLD."solicitadoEm"
     OR NEW."statusAnterior" IS DISTINCT FROM OLD."statusAnterior" THEN
    RAISE EXCEPTION 'RN-007: histórico de solicitação é imutável';
  END IF;

  IF app_current_perfil() = 'ADMIN' AND NEW."status" IN ('APROVADA', 'REJEITADA') THEN
    IF NEW."decididoPorId" IS DISTINCT FROM app_current_usuario_id()
       OR NEW."decididoPorNome" IS NULL
       OR NEW."decididoEm" IS NULL THEN
      RAISE EXCEPTION 'RN-007: decisão precisa identificar o Administrador e o horário';
    END IF;
    IF NEW."status" = 'APROVADA' AND NOT (
      (NEW."tarefaId" IS NOT NULL AND EXISTS (SELECT 1 FROM "tarefas" t WHERE t."id" = NEW."tarefaId" AND t."status" = 'Concluído'))
      OR (NEW."subtarefaId" IS NOT NULL AND EXISTS (SELECT 1 FROM "subtarefas" s WHERE s."id" = NEW."subtarefaId" AND s."status" = 'CONCLUIDO'))
    ) THEN
      RAISE EXCEPTION 'RN-007: o item precisa estar concluído antes de aprovar a solicitação';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW."status" = 'CANCELADA'
     AND (app_current_perfil() = 'ADMIN' OR OLD."solicitadoPorId" = app_current_usuario_id())
     AND NEW."decididoPorId" IS NULL
     AND NEW."decididoPorNome" IS NULL
     AND NEW."decididoEm" IS NULL THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'RN-007: sem permissão para decidir esta solicitação';
END;
$$;
CREATE TRIGGER trg_solicitacoes_conclusao_enforce
BEFORE INSERT OR UPDATE ON "solicitacoes_conclusao"
FOR EACH ROW EXECUTE FUNCTION solicitacoes_conclusao_enforce();

CREATE OR REPLACE FUNCTION solicitar_conclusao(p_tipo TEXT, p_item_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  perfil_atual TEXT := app_current_perfil();
  usuario_atual TEXT := app_current_usuario_id();
  pessoa_atual TEXT;
  nome_atual TEXT;
  item_tarefa "tarefas"%ROWTYPE;
  item_subtarefa "subtarefas"%ROWTYPE;
  autorizado BOOLEAN := false;
  novo_id TEXT;
BEGIN
  IF perfil_atual NOT IN ('ADMIN_INTERNO', 'ADMIN_EXTERNO') OR usuario_atual IS NULL THEN
    RAISE EXCEPTION 'Ação restrita a colaboradores autenticados.';
  END IF;
  SELECT "nome", "pessoaEnvolvidaId" INTO nome_atual, pessoa_atual FROM "usuarios" WHERE "id" = usuario_atual AND "ativo";
  IF nome_atual IS NULL THEN RAISE EXCEPTION 'Usuário inativo ou não encontrado.'; END IF;

  IF p_tipo = 'TAREFA' THEN
    SELECT * INTO item_tarefa FROM "tarefas" WHERE "id" = p_item_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Tarefa não encontrada.'; END IF;
    IF NOT item_tarefa."ativo" OR NOT cliente_do_projeto_esta_ativo(item_tarefa."projetoId")
       OR item_tarefa."status" IN ('Concluído', 'Cancelado') THEN
      RAISE EXCEPTION 'RN-007: tarefa inativa, cancelada ou concluída não aceita solicitação.';
    END IF;
    autorizado := (
      (perfil_atual = 'ADMIN_INTERNO' AND EXISTS (SELECT 1 FROM "atribuicoes" a WHERE a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = item_tarefa."projetoId" AND a."usuarioId" = usuario_atual))
      OR (perfil_atual = 'ADMIN_EXTERNO' AND EXISTS (SELECT 1 FROM "atribuicoes" a WHERE a."entidadeTipo" = 'TAREFA' AND a."entidadeId" = item_tarefa."id" AND a."usuarioId" = usuario_atual))
      OR item_tarefa."responsavelUsuarioId" = usuario_atual
      OR (item_tarefa."responsavelId" IS NOT NULL AND pessoa_atual IS NOT NULL AND item_tarefa."responsavelId" = pessoa_atual)
    );
  ELSIF p_tipo = 'SUBTAREFA' THEN
    SELECT * INTO item_subtarefa FROM "subtarefas" WHERE "id" = p_item_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Subtarefa não encontrada.'; END IF;
    IF NOT item_subtarefa."ativo" OR item_subtarefa."status" <> 'EM_ANDAMENTO'
       OR NOT cliente_da_tarefa_esta_ativo(item_subtarefa."tarefaId") THEN
      RAISE EXCEPTION 'RN-004: subtarefa inativa, cancelada ou concluída não aceita solicitação.';
    END IF;
    autorizado := item_subtarefa."atribuidoAUsuarioId" = usuario_atual
      OR (item_subtarefa."atribuidoAId" IS NOT NULL AND pessoa_atual IS NOT NULL AND item_subtarefa."atribuidoAId" = pessoa_atual);
  ELSE
    RAISE EXCEPTION 'Tipo de item inválido.';
  END IF;

  IF autorizado IS NOT TRUE THEN RAISE EXCEPTION 'RN-007: sem permissão para solicitar a conclusão deste item.'; END IF;

  novo_id := md5(random()::text || clock_timestamp()::text || p_item_id);
  INSERT INTO "solicitacoes_conclusao" ("id", "tarefaId", "subtarefaId", "solicitadoPorId", "solicitadoPorNome", "statusAnterior", "status")
  VALUES (novo_id, CASE WHEN p_tipo = 'TAREFA' THEN p_item_id END, CASE WHEN p_tipo = 'SUBTAREFA' THEN p_item_id END, usuario_atual, nome_atual,
    CASE WHEN p_tipo = 'TAREFA' THEN
      CASE item_tarefa."status"::text
        WHEN 'A iniciar' THEN 'A_INICIAR'
        WHEN 'Em andamento' THEN 'EM_ANDAMENTO'
        WHEN 'Aguardando documento do cliente' THEN 'AGUARDANDO_DOCUMENTO_CLIENTE'
        WHEN 'Visita/reunião agendada' THEN 'VISITA_REUNIAO_AGENDADA'
        WHEN 'Protocolado' THEN 'PROTOCOLADO'
        WHEN 'Sob análise do órgão ambiental' THEN 'SOB_ANALISE_ORGAO_AMBIENTAL'
        WHEN 'Com exigência a cumprir' THEN 'COM_EXIGENCIA_A_CUMPRIR'
        WHEN 'Concluído' THEN 'CONCLUIDO'
        WHEN 'Cancelado' THEN 'CANCELADO'
      END
    ELSE item_subtarefa."status"::text END, 'PENDENTE');
  RETURN novo_id;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'RN-007: já existe uma solicitação de conclusão pendente para este item.';
END;
$$;

CREATE OR REPLACE FUNCTION cancelar_solicitacao_conclusao(p_solicitacao_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  atual "solicitacoes_conclusao"%ROWTYPE;
BEGIN
  SELECT * INTO atual FROM "solicitacoes_conclusao" WHERE "id" = p_solicitacao_id FOR UPDATE;
  IF NOT FOUND OR atual."status" <> 'PENDENTE' THEN RAISE EXCEPTION 'RN-007: solicitação não está pendente.'; END IF;
  IF app_current_perfil() <> 'ADMIN' AND atual."solicitadoPorId" IS DISTINCT FROM app_current_usuario_id() THEN
    RAISE EXCEPTION 'RN-007: somente quem solicitou pode retirar o pedido.';
  END IF;
  UPDATE "solicitacoes_conclusao" SET "status" = 'CANCELADA' WHERE "id" = atual."id";
  RETURN atual."id";
END;
$$;

REVOKE ALL ON FUNCTION solicitar_conclusao(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION cancelar_solicitacao_conclusao(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION solicitar_conclusao(TEXT, TEXT) TO multiplus_app;
GRANT EXECUTE ON FUNCTION cancelar_solicitacao_conclusao(TEXT) TO multiplus_app;

-- Colaboradores passam a solicitar; apenas ADMIN pode atualizar status diretamente.
DROP POLICY tarefas_update ON "tarefas";
CREATE POLICY tarefas_update ON "tarefas" FOR UPDATE USING (
  app_current_perfil() = 'ADMIN' AND cliente_do_projeto_esta_ativo("projetoId")
) WITH CHECK (
  app_current_perfil() = 'ADMIN' AND cliente_do_projeto_esta_ativo("projetoId")
);
DROP POLICY subtarefas_update ON "subtarefas";
CREATE POLICY subtarefas_update ON "subtarefas" FOR UPDATE USING (
  app_current_perfil() = 'ADMIN' AND cliente_da_tarefa_esta_ativo("tarefaId")
) WITH CHECK (
  app_current_perfil() = 'ADMIN' AND cliente_da_tarefa_esta_ativo("tarefaId")
);

CREATE OR REPLACE FUNCTION tarefas_enforce_rn007() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF app_current_perfil() IS NULL OR app_current_perfil() = 'ADMIN' THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'RN-007: colaboradores precisam solicitar conclusão; somente o Administrador confirma o status';
END;
$$;

CREATE OR REPLACE FUNCTION subtarefas_enforce_rn004() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF app_current_perfil() IS NULL OR app_current_perfil() = 'ADMIN' THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'RN-004: colaboradores precisam solicitar conclusão; somente o Administrador confirma o status';
END;
$$;

-- Baseada na definição vigente de 2026-09-28; materialização da recorrência segue atômica,
-- mas a chamada direta agora é exclusiva do ADMIN e será usada na aprovação.
CREATE OR REPLACE FUNCTION concluir_tarefa(
  p_tarefa_id TEXT,
  p_proximo_prazo TIMESTAMP(3) DEFAULT NULL
) RETURNS TABLE (tarefa_id TEXT, proxima_id TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  atual "tarefas"%ROWTYPE;
  id_proxima TEXT;
BEGIN
  IF app_current_perfil() IS NULL THEN RAISE EXCEPTION 'Sessão de usuário ausente'; END IF;
  IF app_current_perfil() <> 'ADMIN' THEN RAISE EXCEPTION 'RN-007: conclusão de colaborador requer confirmação do Administrador'; END IF;

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
        "id", "projetoId", "nome", "descricao", "prazo", "status", "periodicidade", "diaSemana", "serieId", "prazoOriginal", "serieEncerradaEm", "diasAntecedencia", "responsavelId", "responsavelUsuarioId", "ativo", "criadoEm", "atualizadoEm"
      ) VALUES (
        id_proxima, atual."projetoId", atual."nome", atual."descricao", p_proximo_prazo, 'A iniciar', atual."periodicidade", atual."diaSemana", COALESCE(atual."serieId", atual."id"), COALESCE(atual."prazoOriginal", atual."prazo"), NULL, atual."diasAntecedencia", atual."responsavelId", atual."responsavelUsuarioId", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      );
      INSERT INTO "atribuicoes" ("id", "usuarioId", "entidadeTipo", "entidadeId", "criadoEm")
      SELECT md5(random()::text || clock_timestamp()::text || id_proxima), u."id", 'TAREFA', id_proxima, CURRENT_TIMESTAMP
      FROM "pessoas_envolvidas" pe JOIN "usuarios" u ON u."pessoaEnvolvidaId" = pe."id"
      WHERE pe."id" = atual."responsavelId" AND pe."temAcesso" = true
      ON CONFLICT ("usuarioId", "entidadeTipo", "entidadeId") DO NOTHING;
      INSERT INTO "subtarefas" ("id", "tarefaId", "titulo", "descricao", "prazo", "etiquetas", "status", "ativo", "criadoEm", "atualizadoEm")
      SELECT md5(random()::text || clock_timestamp()::text || s."id" || id_proxima), id_proxima, s."titulo", s."descricao",
        CASE WHEN s."prazo" IS NULL OR atual."prazo" IS NULL THEN s."prazo" ELSE p_proximo_prazo + (s."prazo" - atual."prazo") END,
        s."etiquetas", 'EM_ANDAMENTO', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM "subtarefas" s WHERE s."tarefaId" = atual."id" AND s."ativo" AND s."status" <> 'CANCELADO';
    END IF;
  END IF;
  tarefa_id := atual."id"; proxima_id := id_proxima; RETURN NEXT;
END;
$$;

-- Novas preferências: Talita recebe pedidos; ambos perfis colaboradores recebem decisões.
INSERT INTO "preferencias_notificacao" ("id", "perfil", "evento", "email", "inApp", "atualizadoEm")
SELECT md5(random()::text || clock_timestamp()::text), p."perfil", 'CONCLUSAO_SOLICITADA',
  p."perfil" IN ('ADMIN', 'ADMIN_INTERNO', 'ADMIN_EXTERNO'),
  p."perfil" IN ('ADMIN', 'ADMIN_INTERNO', 'ADMIN_EXTERNO'), CURRENT_TIMESTAMP
FROM unnest(enum_range(NULL::"Perfil")) AS p("perfil")
ON CONFLICT ("perfil", "evento") DO NOTHING;
