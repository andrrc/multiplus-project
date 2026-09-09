-- Corrige uma falha real de RLS encontrada pelo teste de integração
-- (cadastro-clientes-rls.integration.test.ts): por padrão, uma VIEW no Postgres
-- executa a consulta interna com o papel de quem CRIOU a view (o dono das tabelas,
-- que não sofre RLS sem FORCE ROW LEVEL SECURITY — e este projeto não usa FORCE,
-- ver 20260903191825_fix_rls_projetos_tarefas_recursion). Resultado: a view
-- "responsaveis_legais_seguro"/"pontos_contato_seguro" mascarava o telefone
-- corretamente, mas ignorava a política de SELECT da tabela base — até o perfil
-- CLIENTE, que não deveria enxergar nada, via a linha inteira (só sem telefone).
--
-- `security_invoker = true` (Postgres 15+) faz a view rodar com o papel de quem a
-- está consultando (aqui, sempre "multiplus_app", nunca dono/superuser) — então a
-- política de RLS da tabela base volta a valer de verdade através da view.

ALTER VIEW "responsaveis_legais_seguro" SET (security_invoker = true);
ALTER VIEW "pontos_contato_seguro" SET (security_invoker = true);
