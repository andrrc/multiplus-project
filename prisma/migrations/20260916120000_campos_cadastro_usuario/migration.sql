-- RF-030 / RF-040 — campos de cadastro do usuário interno.
--
-- O RF-030 original previa apenas e-mail e atribuições; o cadastro real precisa identificar
-- a pessoa (cargo na equipe, contato e documento) para a Talita distinguir duas pessoas com
-- o mesmo perfil de acesso. Todos opcionais, no mesmo princípio do RF-002d do Cadastro de
-- Clientes: campo em branco vira NULL, com validação de formato só quando preenchido — não
-- trava a criação de um acesso urgente por falta de um dado secundário.
--
-- `cpf` e `cnpj` formam o par PF/PJ já usado em `clientes` (ADR-006) e `pessoas_envolvidas`
-- (ADR-007), mas sem coluna discriminadora: qual dos dois vale é dado por qual está
-- preenchido. Também sem UNIQUE — quem identifica o usuário é o e-mail, que já é único.
--
-- Não-destrutiva: todas as colunas entram nullable, sem default e sem UPDATE de dados.

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "cargo" TEXT,
ADD COLUMN     "cnpj" TEXT,
ADD COLUMN     "cpf" TEXT,
ADD COLUMN     "observacoes" TEXT,
ADD COLUMN     "telefone" TEXT;
