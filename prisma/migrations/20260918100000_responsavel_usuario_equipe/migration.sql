-- RF-005 — tarefa pode ter como responsável uma pessoa envolvida do cliente
-- ou um usuário ativo da equipe interna.
ALTER TABLE "tarefas" ADD COLUMN "responsavelUsuarioId" TEXT;

ALTER TABLE "tarefas"
  ADD CONSTRAINT "tarefas_responsavelUsuarioId_fkey"
  FOREIGN KEY ("responsavelUsuarioId") REFERENCES "usuarios"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "tarefas_responsavelUsuarioId_idx" ON "tarefas"("responsavelUsuarioId");
