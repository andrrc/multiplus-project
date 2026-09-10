-- ADR-007: "Pessoa do Operacional" -> "Pessoa Envolvida", com tipo (Pessoa/Empresa) e acesso
-- opcional. Escrita à mão em vez do diff automático do Prisma: o diff naive faz DROP TABLE +
-- CREATE TABLE (perde dado) e não sabe migrar `subtarefas.atribuidoAId` de Usuario pra
-- PessoaEnvolvida — aqui usamos RENAME/backfill pra preservar tudo que já existe.
--
-- Também inclui a atualização de RLS de RN-004 (o "salto adicional" via
-- usuarios.pessoaEnvolvidaId já previsto no ADR-007) — não dá pra separar em outra
-- migration porque as políticas de subtarefas_select/subtarefas_update têm dependência de
-- catálogo na coluna atribuidoAId (bloqueiam o RENAME/DROP da coluna antiga se não forem
-- recriadas antes).

-- ============================================================================
-- pessoas_operacional -> pessoas_envolvidas (RENAME preserva dado, GRANTs e políticas de
-- RLS já ligadas por OID, não por nome — não precisa recriar as policies dessa tabela)
-- ============================================================================

CREATE TYPE "TipoPessoaEnvolvida" AS ENUM ('PESSOA', 'EMPRESA');

ALTER TABLE "pessoas_operacional" RENAME TO "pessoas_envolvidas";
ALTER TABLE "pessoas_envolvidas" RENAME CONSTRAINT "pessoas_operacional_pkey" TO "pessoas_envolvidas_pkey";
ALTER TABLE "pessoas_envolvidas" RENAME CONSTRAINT "pessoas_operacional_clienteId_fkey" TO "pessoas_envolvidas_clienteId_fkey";

ALTER TABLE "pessoas_envolvidas"
  ADD COLUMN "tipo" "TipoPessoaEnvolvida" NOT NULL DEFAULT 'PESSOA',
  ADD COLUMN "temAcesso" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "telefone" TEXT,
  ADD COLUMN "cpf" TEXT,
  ADD COLUMN "cnpj" TEXT,
  ALTER COLUMN "cargo" DROP NOT NULL;

-- ============================================================================
-- usuarios.pessoaEnvolvidaId — FK opcional e única (ADR-005/ADR-007)
-- ============================================================================

ALTER TABLE "usuarios" ADD COLUMN "pessoaEnvolvidaId" TEXT;
CREATE UNIQUE INDEX "usuarios_pessoaEnvolvidaId_key" ON "usuarios"("pessoaEnvolvidaId");
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_pessoaEnvolvidaId_fkey"
  FOREIGN KEY ("pessoaEnvolvidaId") REFERENCES "pessoas_envolvidas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- tarefas.responsavelId — campo NOVO (RF-005), sem dado a migrar: o módulo de
-- Projetos/Tarefas ainda não tem CRUD/UI, só o esqueleto de RLS da Sprint 1.
-- ============================================================================

ALTER TABLE "tarefas" ADD COLUMN "responsavelId" TEXT;
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_responsavelId_fkey"
  FOREIGN KEY ("responsavelId") REFERENCES "pessoas_envolvidas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- subtarefas.atribuidoAId — migração real de FK Usuario -> FK PessoaEnvolvida.
--
-- As policies subtarefas_select/subtarefas_update precisam ser dropadas antes: elas têm
-- dependência de catálogo na coluna atribuidoAId (CREATE POLICY compila USING/WITH CHECK
-- num expression tree preso à coluna), o que bloqueia RENAME/DROP dela.
-- ============================================================================

DROP POLICY "subtarefas_select" ON "subtarefas";
DROP POLICY "subtarefas_update" ON "subtarefas";

ALTER TABLE "subtarefas" DROP CONSTRAINT "subtarefas_atribuidoAId_fkey";
ALTER TABLE "subtarefas" RENAME COLUMN "atribuidoAId" TO "atribuidoAId_usuario_old";
ALTER TABLE "subtarefas" ADD COLUMN "atribuidoAId" TEXT;

-- Backfill: um Usuario ADMIN_EXTERNO vinculado a uma Pessoa Envolvida carrega a referência
-- certa. ADMIN (sem Pessoa Envolvida, ADR-007) ou ADMIN_EXTERNO genuíno sem vínculo ficam
-- com atribuidoAId = NULL — não há como preservar a referência corretamente nesses casos, e
-- não existe dado real de produção aqui hoje (só fixtures de teste, já que o módulo de
-- Tarefas não tem UI ainda).
UPDATE "subtarefas" s
SET "atribuidoAId" = u."pessoaEnvolvidaId"
FROM "usuarios" u
WHERE s."atribuidoAId_usuario_old" = u."id" AND u."pessoaEnvolvidaId" IS NOT NULL;

ALTER TABLE "subtarefas" DROP COLUMN "atribuidoAId_usuario_old";
ALTER TABLE "subtarefas" ADD CONSTRAINT "subtarefas_atribuidoAId_fkey"
  FOREIGN KEY ("atribuidoAId") REFERENCES "pessoas_envolvidas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- RN-004 — recriação das policies e da trigger com o "salto adicional" já previsto no
-- ADR-007: Usuario -> usuarios.pessoaEnvolvidaId (reverso) -> comparar com atribuidoAId,
-- em vez de comparar app_current_usuario_id() direto (que agora é um id de Usuario, não
-- de PessoaEnvolvida).
-- ============================================================================

CREATE POLICY subtarefas_select ON "subtarefas" FOR SELECT USING (
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
);

CREATE POLICY subtarefas_update ON "subtarefas" FOR UPDATE USING (
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
) WITH CHECK (
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
);

CREATE OR REPLACE FUNCTION subtarefas_enforce_rn004() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  eh_gestor boolean;
  minha_pessoa_envolvida_id text;
BEGIN
  eh_gestor := app_current_perfil() = 'ADMIN' OR (
    app_current_perfil() = 'ADMIN_INTERNO' AND EXISTS (
      SELECT 1 FROM "tarefas" t
      JOIN "atribuicoes" a ON a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = t."projetoId"
      WHERE t."id" = NEW."tarefaId" AND a."usuarioId" = app_current_usuario_id()
    )
  );

  SELECT "pessoaEnvolvidaId" INTO minha_pessoa_envolvida_id FROM "usuarios" WHERE "id" = app_current_usuario_id();

  IF NEW."concluida" IS DISTINCT FROM OLD."concluida" THEN
    IF NOT (app_current_perfil() = 'ADMIN' OR OLD."atribuidoAId" = minha_pessoa_envolvida_id) THEN
      RAISE EXCEPTION 'RN-004: apenas o responsável pela subtarefa (ou o Administrador) pode concluí-la';
    END IF;
  END IF;

  IF NEW."etiqueta" IS DISTINCT FROM OLD."etiqueta"
     OR NEW."tarefaId" IS DISTINCT FROM OLD."tarefaId"
     OR NEW."atribuidoAId" IS DISTINCT FROM OLD."atribuidoAId" THEN
    IF NOT eh_gestor THEN
      RAISE EXCEPTION 'RN-004: sem permissão para alterar esta subtarefa além do campo concluida';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
