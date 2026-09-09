-- Corrige "infinite recursion detected in policy for relation tarefas".
--
-- Causa: projetos_select (ramo ADMIN_EXTERNO) faz SELECT ... FROM tarefas, e
-- tarefas_select (ramo CLIENTE) faz SELECT ... FROM projetos. O Postgres
-- precisa montar o plano da política inteira antes de avaliar qualquer
-- ramo — então mesmo numa sessão ADMIN_EXTERNO (que nunca cairia no ramo
-- CLIENTE de tarefas_select), ele detecta que expandir projetos_select exige
-- expandir tarefas_select, que exige expandir projetos_select de novo.
--
-- Correção: o ramo de projetos_select que enxerga "tarefas" passa a chamar
-- uma função SECURITY DEFINER. Rodando como a role dona das tabelas (que não
-- tem mais FORCE ROW LEVEL SECURITY — só bypassa RLS quando chamada de
-- dentro da função, não abre acesso direto pra ninguém), a consulta interna
-- a "tarefas" não re-aciona a política de RLS de "tarefas", quebrando o
-- ciclo. Único lugar do modelo com essa referência cruzada projetos↔tarefas;
-- as demais tabelas (clientes, subtarefas) só dependem de projetos/tarefas
-- num sentido só, sem ciclo.

ALTER TABLE "usuarios" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "clientes" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "projetos" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "tarefas" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "subtarefas" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "atribuicoes" NO FORCE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION admin_externo_tem_tarefa_no_projeto(p_projeto_id TEXT) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM "tarefas" t
    JOIN "atribuicoes" a ON a."entidadeTipo" = 'TAREFA' AND a."entidadeId" = t."id"
    WHERE t."projetoId" = p_projeto_id AND a."usuarioId" = app_current_usuario_id()
  )
$$;

DROP POLICY projetos_select ON "projetos";

CREATE POLICY projetos_select ON "projetos" FOR SELECT USING (
  app_current_perfil() = 'ADMIN'
  OR (
    app_current_perfil() = 'CLIENTE'
    AND "clienteId" = (SELECT "clienteId" FROM "usuarios" WHERE "id" = app_current_usuario_id())
  )
  OR (
    app_current_perfil() = 'ADMIN_INTERNO'
    AND EXISTS (
      SELECT 1 FROM "atribuicoes" a
      WHERE a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = "projetos"."id"
        AND a."usuarioId" = app_current_usuario_id()
    )
  )
  OR (
    app_current_perfil() = 'ADMIN_EXTERNO'
    AND admin_externo_tem_tarefa_no_projeto("projetos"."id")
  )
);
