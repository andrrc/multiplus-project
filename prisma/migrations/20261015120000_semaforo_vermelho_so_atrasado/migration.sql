-- RF-009 — o vermelho do semáforo passa a indicar só prazo vencido. Resta um único limite
-- configurável: âmbar de "vence hoje" até "diasAmareloAte" dias; verde acima disso.
-- O limite vermelho configurado vira o limite âmbar (5/10 → 5), preservando a escolha da ADMIN.
ALTER TABLE "configuracoes_semaforo" DROP CONSTRAINT "configuracoes_semaforo_limites_check";

UPDATE "configuracoes_semaforo" SET "diasAmareloAte" = "diasVermelhoAte" WHERE "id" = 1;

ALTER TABLE "configuracoes_semaforo" DROP COLUMN "diasVermelhoAte";
ALTER TABLE "configuracoes_semaforo" ALTER COLUMN "diasAmareloAte" SET DEFAULT 5;
ALTER TABLE "configuracoes_semaforo" ADD CONSTRAINT "configuracoes_semaforo_limites_check"
  CHECK ("diasAmareloAte" BETWEEN 0 AND 365);
