-- B6 — permite que jobs repetidos não criem o mesmo aviso duas vezes.
ALTER TABLE "notificacoes" ADD COLUMN "dedupeKey" TEXT;
CREATE UNIQUE INDEX "notificacoes_dedupeKey_key" ON "notificacoes"("dedupeKey");
