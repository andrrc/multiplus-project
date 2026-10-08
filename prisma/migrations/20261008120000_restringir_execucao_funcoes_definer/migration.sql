-- Hardening: funções SECURITY DEFINER não devem ser invocáveis por PUBLIC.
-- Revoga dinamicamente todas as existentes no schema da aplicação, inclusive
-- futuras funções já criadas antes desta migration, sem tocar nos grants explícitos.
DO $$
DECLARE
  funcao RECORD;
BEGIN
  FOR funcao IN
    SELECT p.oid::regprocedure AS assinatura
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', funcao.assinatura);
  END LOOP;
END;
$$;

-- Funções chamadas por policies RLS ou diretamente pelo runtime Prisma.
GRANT EXECUTE ON FUNCTION cliente_esta_ativo(TEXT) TO multiplus_app;
GRANT EXECUTE ON FUNCTION cliente_do_projeto_esta_ativo(TEXT) TO multiplus_app;
GRANT EXECUTE ON FUNCTION cliente_da_tarefa_esta_ativo(TEXT) TO multiplus_app;
GRANT EXECUTE ON FUNCTION admin_externo_tem_tarefa_no_projeto(TEXT) TO multiplus_app;
GRANT EXECUTE ON FUNCTION colaborador_tem_subtarefa_na_tarefa(TEXT) TO multiplus_app;
GRANT EXECUTE ON FUNCTION colaborador_tem_subtarefa_no_projeto(TEXT) TO multiplus_app;
GRANT EXECUTE ON FUNCTION colaborador_tem_subtarefa_no_cliente(TEXT) TO multiplus_app;
GRANT EXECUTE ON FUNCTION concluir_tarefa(TEXT, TIMESTAMP WITHOUT TIME ZONE) TO multiplus_app;
GRANT EXECUTE ON FUNCTION comentario_alvo_acessivel(TEXT, TEXT, TEXT) TO multiplus_app;
GRANT EXECUTE ON FUNCTION contar_subtarefas_portal(TEXT) TO multiplus_app;
GRANT EXECUTE ON FUNCTION ultima_atualizacao_portal(TEXT) TO multiplus_app;
GRANT EXECUTE ON FUNCTION responsavel_nome_portal(TEXT) TO multiplus_app;
