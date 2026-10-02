/** RF-011/RF-012/RF-022/RF-048 a RF-050; RN-009/RN-014 a RN-016 — portal do cliente e RLS. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buscarProjetoPortal, listarProjetosPortal } from "@/lib/portal-cliente";
import { dispararEventoNotificacao, listarClientesAtivosDoProjeto } from "@/lib/notificacoes";
import { comoUsuario, fecharConexoes, limparFixtures, ownerDb } from "./setup/helpers";

let clienteA: { id: string };
let clienteB: { id: string };
let projetoA: { id: string };
let projetoB: { id: string };
let tarefaA: { id: string };
let usuarioA: { id: string };
let usuarioB: { id: string };
let admin: { id: string };
let subtarefaConcluida: { id: string };

const ctxA = () => ({ usuarioId: usuarioA.id, perfil: "CLIENTE" as const });
const ctxB = () => ({ usuarioId: usuarioB.id, perfil: "CLIENTE" as const });
const dia = (value: string) => new Date(`${value}T00:00:00.000Z`);

beforeAll(async () => {
  await limparFixtures();
  clienteA = await ownerDb.cliente.create({ data: { razaoSocial: "Cliente Portal A", cnpj: "66777888000108", segmento: "Industrial", origemContato: "Indicação" } });
  clienteB = await ownerDb.cliente.create({ data: { razaoSocial: "Cliente Portal B", cnpj: "66777888000280", segmento: "Industrial", origemContato: "Indicação" } });
  projetoA = await ownerDb.projeto.create({ data: { clienteId: clienteA.id, nome: "Projeto Portal A", atualizadoEm: dia("2026-09-01") } });
  projetoB = await ownerDb.projeto.create({ data: { clienteId: clienteB.id, nome: "Projeto Portal B" } });
  tarefaA = await ownerDb.tarefa.create({ data: { projetoId: projetoA.id, nome: "Tarefa Portal A", descricao: "Texto interno", atualizadoEm: dia("2026-09-02") } });
  const pessoa = await ownerDb.pessoaEnvolvida.create({ data: { clienteId: clienteA.id, nome: "Responsável Portal", temAcesso: false } });
  await ownerDb.tarefa.update({ where: { id: tarefaA.id }, data: { responsavelId: pessoa.id } });
  subtarefaConcluida = await ownerDb.subtarefa.create({ data: { tarefaId: tarefaA.id, titulo: "Segredo da subtarefa", descricao: "Não deve aparecer", status: "CONCLUIDO", atualizadoEm: dia("2026-09-04") } });
  await ownerDb.subtarefa.create({ data: { tarefaId: tarefaA.id, titulo: "Outra subtarefa", status: "EM_ANDAMENTO", atualizadoEm: dia("2026-09-03") } });
  await ownerDb.subtarefa.create({ data: { tarefaId: tarefaA.id, titulo: "Cancelada", status: "CANCELADO" } });
  await ownerDb.subtarefa.create({ data: { tarefaId: tarefaA.id, titulo: "Desativada", status: "CONCLUIDO", ativo: false } });
  await ownerDb.documento.create({ data: { clienteId: clienteA.id, projetoId: projetoA.id, nome: "Documento A", link: "https://drive.google.com/a" } });
  await ownerDb.documento.create({ data: { clienteId: clienteA.id, nome: "Documento do cadastro", link: "https://drive.google.com/cliente-a" } });
  await ownerDb.documento.create({ data: { clienteId: clienteB.id, projetoId: projetoB.id, nome: "Documento B", link: "https://drive.google.com/b" } });
  admin = await ownerDb.usuario.create({ data: { nome: "Admin Portal", email: "admin.portal.s6@teste.local", perfil: "ADMIN" } });
  usuarioA = await ownerDb.usuario.create({ data: { nome: "Cliente Portal A", email: "cliente.portal.s6.a@teste.local", perfil: "CLIENTE", clienteId: clienteA.id } });
  usuarioB = await ownerDb.usuario.create({ data: { nome: "Cliente Portal B", email: "cliente.portal.s6.b@teste.local", perfil: "CLIENTE", clienteId: clienteB.id } });
  await ownerDb.valorProjeto.create({ data: { projetoId: projetoA.id, valorContratado: "12345.67" } });
  await ownerDb.comentario.create({ data: { projetoId: projetoA.id, texto: "Comentário interno", autorId: admin.id, criadoEm: dia("2026-09-05") } });
});

afterAll(async () => {
  await ownerDb.preferenciaNotificacao.update({ where: { perfil_evento: { perfil: "CLIENTE", evento: "TAREFA_CONCLUIDA" } }, data: { email: false, inApp: false } });
  await ownerDb.notificacao.deleteMany();
  await limparFixtures();
  await fecharConexoes();
});

describe("RN-016 — leitura limitada do cliente", () => {
  it("vê só projetos e documentos próprios, e não pode trocar o id do projeto", async () => {
    const projetos = await listarProjetosPortal(ctxA());
    expect(projetos.map(({ id }) => id)).toEqual([projetoA.id]);
    expect((await listarProjetosPortal(ctxB())).map(({ id }) => id)).toEqual([projetoB.id]);
    expect(await buscarProjetoPortal(ctxA(), projetoB.id)).toBeNull();
    const detalhe = await buscarProjetoPortal(ctxA(), projetoA.id);
    expect(detalhe?.documentos.map(({ nome }) => nome).sort()).toEqual(["Documento A", "Documento do cadastro"]);
    expect(Object.keys(detalhe ?? {})).not.toContain("valorContratado");
    expect(Object.keys(detalhe?.tarefas[0] ?? {})).not.toContain("descricao");
    expect(Object.keys(detalhe?.tarefas[0] ?? {})).not.toContain("subtarefas");
  });

  it("não recebe linhas de subtarefas, comentários ou valores mesmo consultando direto pela role da aplicação", async () => {
    const [subtarefas, comentarios, valores] = await comoUsuario(ctxA(), async (tx) => Promise.all([
      tx.subtarefa.findMany({ where: { tarefaId: tarefaA.id } }),
      tx.comentario.findMany({ where: { projetoId: projetoA.id } }),
      tx.valorProjeto.findMany({ where: { projetoId: projetoA.id } }),
    ]));
    expect(subtarefas).toEqual([]);
    expect(comentarios).toEqual([]);
    expect(valores).toEqual([]);
    await expect(comoUsuario(ctxA(), (tx) => tx.comentario.create({ data: { projetoId: projetoA.id, texto: "Tentativa cliente", autorId: usuarioA.id } }))).rejects.toThrow(/row-level security/i);
    expect(subtarefaConcluida.id).toBeTruthy();
  });

  it("retorna apenas totais agregados e timestamp da atividade do próprio projeto", async () => {
    const detalhe = await buscarProjetoPortal(ctxA(), projetoA.id);
    expect(detalhe?.tarefas[0].progresso).toEqual({ total: 2, concluidas: 1, percentual: 50 });
    expect(detalhe?.tarefas[0].responsavel).toBe("Responsável Portal");
    expect(detalhe?.ultimaAtualizacao).toBeInstanceOf(Date);
    const vazado = await comoUsuario(ctxA(), (tx) => tx.$queryRaw<Array<{ em: Date | null }>>`SELECT ultima_atualizacao_portal(${projetoB.id}) AS em`);
    expect(vazado[0].em).toBeNull();
  });
});

describe("RF-022 — destinatários cliente limitados ao próprio projeto", () => {
  it("com preferência ativa, resolve e avisa apenas o cliente do projeto", async () => {
    expect(await ownerDb.preferenciaNotificacao.findUniqueOrThrow({ where: { perfil_evento: { perfil: "CLIENTE", evento: "TAREFA_CONCLUIDA" } } })).toMatchObject({ email: false, inApp: false });
    await ownerDb.preferenciaNotificacao.update({ where: { perfil_evento: { perfil: "CLIENTE", evento: "TAREFA_CONCLUIDA" } }, data: { email: false, inApp: true } });
    const destinatarios = await listarClientesAtivosDoProjeto(projetoA.id);
    expect(destinatarios).toEqual([usuarioA.id]);
    const metricas = await dispararEventoNotificacao("TAREFA_CONCLUIDA", {
      titulo: "Tarefa concluída", mensagem: "Uma tarefa do seu projeto foi concluída.",
      url: `/tarefas/${tarefaA.id}`, urlCliente: `/portal/${projetoA.id}`,
      usuarioIds: destinatarios,
    });
    expect(metricas.inAppCriadas).toBe(1);
    const avisos = await ownerDb.notificacao.findMany({ where: { evento: "TAREFA_CONCLUIDA" } });
    expect(avisos.map(({ usuarioId }) => usuarioId)).toEqual([usuarioA.id]);
    expect(avisos[0].url).toBe(`/portal/${projetoA.id}`);
  });
});
