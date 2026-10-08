/** RF-043 / RN-014 a RN-016 — EXECUTE público revogado em funções SECURITY DEFINER. */
import { afterAll, describe, expect, it } from "vitest";
import { appDb, fecharConexoes, ownerDb } from "./setup/helpers";

afterAll(async () => {
  await fecharConexoes();
});

describe("hardening de funções SECURITY DEFINER", () => {
  it("não deixa PUBLIC executar nenhuma função SECURITY DEFINER do schema public", async () => {
    const funcoes = await ownerDb.$queryRaw<Array<{ oid: string; assinatura: string; permitePublic: boolean }>>`
      SELECT p.oid::text AS oid,
             p.oid::regprocedure::text AS assinatura,
             EXISTS (
               SELECT 1 FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) acl
               WHERE acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
             ) AS "permitePublic"
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.prosecdef
    `;
    expect(funcoes.length).toBeGreaterThan(0);
    expect(funcoes.filter((funcao) => funcao.permitePublic).map((funcao) => funcao.assinatura)).toEqual([]);
  });

  it("concede execução ao runtime nas funções de policy e nega chamadas a trigger functions", async () => {
    const grants = await appDb.$queryRaw<Array<{ assinatura: string; permiteApp: boolean }>>`
      SELECT assinatura,
             has_function_privilege(current_user, assinatura::regprocedure, 'EXECUTE') AS "permiteApp"
      FROM unnest(ARRAY[
        'cliente_esta_ativo(text)',
        'cliente_do_projeto_esta_ativo(text)',
        'cliente_da_tarefa_esta_ativo(text)',
        'admin_externo_tem_tarefa_no_projeto(text)',
        'colaborador_tem_subtarefa_na_tarefa(text)',
        'colaborador_tem_subtarefa_no_projeto(text)',
        'colaborador_tem_subtarefa_no_cliente(text)',
        'concluir_tarefa(text,timestamp without time zone)',
        'comentario_alvo_acessivel(text,text,text)',
        'contar_subtarefas_portal(text)',
        'ultima_atualizacao_portal(text)',
        'responsavel_nome_portal(text)',
        'preencher_nome_criador()',
        'herdar_permissao_tarefa_recorrente()'
      ]) AS assinatura
    `;
    const permissoes = new Map(grants.map((grant) => [grant.assinatura, grant.permiteApp]));
    for (const nome of [
      "cliente_esta_ativo(text)",
      "cliente_do_projeto_esta_ativo(text)",
      "cliente_da_tarefa_esta_ativo(text)",
      "admin_externo_tem_tarefa_no_projeto(text)",
      "colaborador_tem_subtarefa_na_tarefa(text)",
      "colaborador_tem_subtarefa_no_projeto(text)",
      "colaborador_tem_subtarefa_no_cliente(text)",
      "concluir_tarefa(text,timestamp without time zone)",
      "comentario_alvo_acessivel(text,text,text)",
      "contar_subtarefas_portal(text)",
      "ultima_atualizacao_portal(text)",
      "responsavel_nome_portal(text)",
    ]) {
      expect(permissoes.get(nome), `${nome} precisa estar executável pela role da aplicação`).toBe(true);
    }
    expect(permissoes.get("preencher_nome_criador()"), "trigger não deve ser invocável diretamente").toBe(false);
    expect(permissoes.get("herdar_permissao_tarefa_recorrente()"), "trigger não deve ser invocável diretamente").toBe(false);
  });
});
