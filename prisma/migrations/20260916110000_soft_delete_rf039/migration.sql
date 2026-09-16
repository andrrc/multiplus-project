-- RF-039 / ADR-008 — desativação (soft delete) transversal.
--
-- O sistema deixa de oferecer exclusão permanente: registro sai das listagens e de todo
-- cálculo, mas continua no banco com o histórico intacto. Esta migration cobre as tabelas
-- que já existem (Cliente, Pessoa Envolvida, Documento, Usuário); Projeto, Tarefa e
-- Subtarefa entram na Sprint 4, quando o módulo tiver CRUD.
--
-- Não-destrutiva por construção: `ativo` entra NOT NULL DEFAULT true, então todo registro
-- já cadastrado permanece ativo sem nenhum UPDATE de dados.
--
-- `usuarios.ativo` NÃO é criada aqui — já existia desde a Sprint 1 com a semântica do
-- RF-029 (bloquear acesso do cliente), que é a mesma operação do RF-039. Reaproveitá-la
-- evita duas colunas concorrentes dizendo se o usuário entra ou não no sistema; a tabela
-- ganha apenas as duas colunas de auditoria.
--
-- A cascata do ADR-008 (desativar o pai torna os filhos inacessíveis) é resolvida nas
-- políticas de RLS da migration seguinte, por herança — nunca marcando os filhos, porque
-- isso tornaria a reativação uma operação destrutiva de informação.

-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "ativo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "desativadoEm" TIMESTAMP(3),
ADD COLUMN     "desativadoPor" TEXT;

-- AlterTable
ALTER TABLE "documentos" ADD COLUMN     "ativo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "desativadoEm" TIMESTAMP(3),
ADD COLUMN     "desativadoPor" TEXT;

-- AlterTable
ALTER TABLE "pessoas_envolvidas" ADD COLUMN     "ativo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "desativadoEm" TIMESTAMP(3),
ADD COLUMN     "desativadoPor" TEXT;

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "desativadoEm" TIMESTAMP(3),
ADD COLUMN     "desativadoPor" TEXT;

-- CreateIndex
CREATE INDEX "clientes_ativo_idx" ON "clientes"("ativo");

-- CreateIndex
CREATE INDEX "documentos_ativo_idx" ON "documentos"("ativo");

-- CreateIndex
CREATE INDEX "pessoas_envolvidas_ativo_idx" ON "pessoas_envolvidas"("ativo");

-- CreateIndex
CREATE INDEX "usuarios_ativo_idx" ON "usuarios"("ativo");
