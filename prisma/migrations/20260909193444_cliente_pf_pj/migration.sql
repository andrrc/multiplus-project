-- ADR-006 (docs/architecture-multiplus-software.md): Cliente passa a suportar Pessoa
-- Física além de Pessoa Jurídica — tabela única com discriminador `tipo`, colunas
-- específicas de cada tipo ficam nullable, validação de consistência fica na aplicação
-- (src/lib/clientes.ts), não no banco.
--
-- Migration não-destrutiva: `tipo` entra com DEFAULT 'PESSOA_JURIDICA' NOT NULL, então os
-- clientes já cadastrados na Sprint 2 (todos PJ) recebem o valor automaticamente, sem
-- backfill manual. `cnpj` vira nullable (só obrigatório para PJ, validado na aplicação).

-- CreateEnum
CREATE TYPE "TipoCliente" AS ENUM ('PESSOA_FISICA', 'PESSOA_JURIDICA');

-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "cep" TEXT,
ADD COLUMN     "cpf" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "municipio" TEXT,
ADD COLUMN     "rg" TEXT,
ADD COLUMN     "tipo" "TipoCliente" NOT NULL DEFAULT 'PESSOA_JURIDICA',
ALTER COLUMN "cnpj" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "clientes_cpf_key" ON "clientes"("cpf");
