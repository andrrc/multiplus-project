CREATE TABLE "configuracoes_semaforo" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "diasVermelhoAte" INTEGER NOT NULL DEFAULT 5,
  "diasAmareloAte" INTEGER NOT NULL DEFAULT 10,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "configuracoes_semaforo_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "configuracoes_semaforo_limites_check" CHECK ("diasVermelhoAte" >= 0 AND "diasAmareloAte" <= 365 AND "diasVermelhoAte" < "diasAmareloAte")
);
INSERT INTO "configuracoes_semaforo" ("id", "diasVermelhoAte", "diasAmareloAte", "atualizadoEm") VALUES (1, 5, 10, CURRENT_TIMESTAMP);
ALTER TABLE "configuracoes_semaforo" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE ON "configuracoes_semaforo" TO multiplus_app;
CREATE POLICY configuracoes_semaforo_select ON "configuracoes_semaforo"
  FOR SELECT USING (app_current_perfil() IS NOT NULL);
CREATE POLICY configuracoes_semaforo_update ON "configuracoes_semaforo"
  FOR UPDATE USING (app_current_perfil() = 'ADMIN')
  WITH CHECK (app_current_perfil() = 'ADMIN');
