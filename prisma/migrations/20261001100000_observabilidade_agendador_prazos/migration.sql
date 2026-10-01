ALTER TABLE "configuracoes_notificacao"
  ADD COLUMN "ultimaExecucaoPrazoEm" TIMESTAMP(3),
  ADD COLUMN "ultimaExecucaoPrazoStatus" TEXT,
  ADD COLUMN "ultimoSucessoPrazoEm" TIMESTAMP(3),
  ADD COLUMN "ultimoSucessoPrazoTarefas" INTEGER,
  ADD COLUMN "ultimoSucessoPrazoEmailsEnviados" INTEGER,
  ADD COLUMN "ultimoSucessoPrazoInAppCriados" INTEGER;

CREATE TABLE "registros_envio_prazo" (
  "id" TEXT NOT NULL,
  "chave" TEXT NOT NULL,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "registros_envio_prazo_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "registros_envio_prazo_chave_key" ON "registros_envio_prazo"("chave");

-- Somente a conexão proprietária do serviço manipula os registros de idempotência.
ALTER TABLE "registros_envio_prazo" ENABLE ROW LEVEL SECURITY;
