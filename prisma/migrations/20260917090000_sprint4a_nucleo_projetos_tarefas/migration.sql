-- Sprint 4A / A1 — campos do núcleo Projeto/Tarefa/Subtarefa.
-- A migration é não destrutiva: valores legados de status são normalizados e o texto
-- existente de subtarefas vira o título do item; nenhum registro é apagado.

CREATE TYPE "StatusProjeto" AS ENUM (
  'A iniciar',
  'Em andamento',
  'Concluído',
  'Cancelado'
);

CREATE TYPE "StatusTarefa" AS ENUM (
  'A iniciar',
  'Em andamento',
  'Aguardando documento do cliente',
  'Visita/reunião agendada',
  'Protocolado',
  'Sob análise do órgão ambiental',
  'Com exigência a cumprir',
  'Concluído',
  'Cancelado'
);

CREATE TYPE "Periodicidade" AS ENUM (
  'SEMANAL',
  'MENSAL',
  'TRIMESTRAL',
  'SEMESTRAL',
  'ANUAL'
);

ALTER TABLE "projetos"
  ADD COLUMN "descricao" TEXT,
  ADD COLUMN "dataInicio" TIMESTAMP(3),
  ADD COLUMN "dataPrevistaConclusao" TIMESTAMP(3),
  ADD COLUMN "ativo" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "desativadoEm" TIMESTAMP(3),
  ADD COLUMN "desativadoPor" TEXT;

ALTER TABLE "projetos"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "StatusProjeto" USING (
    CASE "status"
      WHEN 'ativo' THEN 'Em andamento'
      WHEN 'em andamento' THEN 'Em andamento'
      WHEN 'concluído' THEN 'Concluído'
      WHEN 'cancelado' THEN 'Cancelado'
      ELSE 'A iniciar'
    END
  )::"StatusProjeto",
  ALTER COLUMN "status" SET DEFAULT 'A iniciar';

ALTER TABLE "tarefas"
  ADD COLUMN "descricao" TEXT,
  ADD COLUMN "prazo" TIMESTAMP(3),
  ADD COLUMN "periodicidade" "Periodicidade",
  ADD COLUMN "serieId" TEXT,
  ADD COLUMN "prazoOriginal" TIMESTAMP(3),
  ADD COLUMN "serieEncerradaEm" TIMESTAMP(3),
  ADD COLUMN "diasAntecedencia" INTEGER,
  ADD COLUMN "ativo" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "desativadoEm" TIMESTAMP(3),
  ADD COLUMN "desativadoPor" TEXT;

ALTER TABLE "tarefas"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "StatusTarefa" USING (
    CASE "status"
      WHEN 'pendente' THEN 'A iniciar'
      WHEN 'a iniciar' THEN 'A iniciar'
      WHEN 'em andamento' THEN 'Em andamento'
      WHEN 'concluído' THEN 'Concluído'
      WHEN 'cancelado' THEN 'Cancelado'
      ELSE 'A iniciar'
    END
  )::"StatusTarefa",
  ALTER COLUMN "status" SET DEFAULT 'A iniciar';

ALTER TABLE "subtarefas"
  RENAME COLUMN "etiqueta" TO "titulo";

ALTER TABLE "subtarefas"
  ADD COLUMN "etiquetas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "ativo" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "desativadoEm" TIMESTAMP(3),
  ADD COLUMN "desativadoPor" TEXT;

ALTER TABLE "documentos"
  ADD COLUMN "projetoId" TEXT;

CREATE INDEX "projetos_ativo_idx" ON "projetos"("ativo");
CREATE INDEX "tarefas_ativo_idx" ON "tarefas"("ativo");
CREATE INDEX "tarefas_serieId_idx" ON "tarefas"("serieId");
CREATE INDEX "subtarefas_ativo_idx" ON "subtarefas"("ativo");
CREATE INDEX "documentos_projetoId_idx" ON "documentos"("projetoId");

ALTER TABLE "documentos"
  ADD CONSTRAINT "documentos_projetoId_fkey"
  FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- A trigger existente ainda usa o nome antigo da coluna. Recriar a função na mesma
-- migration mantém a RN-004 válida entre A1 e a revisão completa das políticas da A2.
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

  IF NEW."titulo" IS DISTINCT FROM OLD."titulo"
     OR NEW."etiquetas" IS DISTINCT FROM OLD."etiquetas"
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
