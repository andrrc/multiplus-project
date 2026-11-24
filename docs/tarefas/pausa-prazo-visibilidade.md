# TAREFA pausa-prazo-visibilidade — A pausa do prazo para quem lê o pedido mas não lê os arquivos

> Resolve o achado 4 da revisão cruzada da `etapa2-prazo`. Campo sem resposta fica como **pendente de validação**.

| Campo | Valor |
|---|---|
| **ID** | `pausa-prazo-visibilidade` |
| **Agente responsável** | claude |
| **Branch** | `claude/pausa-prazo-visibilidade` (criada a partir de `origin/staging`, **depois** de a `etapa2-prazo` estar integrada) |
| **Worktree** | `~/multiplus-worktrees/claude-pausa-prazo-visibilidade` |
| **Estado** | em revisão (código, testes e documentação prontos em 2026-11-24; falta a revisão cruzada) |
| **Quem aprovou o escopo** | o usuário, em 2026-11-23, ao aprovar a opção A da análise |
| **Revisor** | codex |

## 1. Objetivo

Quem enxerga o pedido de conclusão de um item em conferência (novo responsável depois de reatribuição, segundo externo atribuído à tarefa, interno responsável sem atribuição ao projeto) passa a ver a pausa do prazo, como a administração e quem enviou já veem, sem ganhar leitura de nenhum arquivo.

## 2. Contexto da funcionalidade

- Módulo: [../funcionalidades/tarefas.md](../funcionalidades/tarefas.md) (limitação L9, que esta tarefa remove), `subtarefas.md`, `notificacoes.md`.
- **Análise obrigatória** (muda dado e regra de prazo): [../analises/pausa-prazo-visibilidade-pedido.md](../analises/pausa-prazo-visibilidade-pedido.md). Aprovada em 2026-11-23 (opção A; sem envios reais de comprovante na VPS).
- Decisão já tomada (2026-11-23): quem enxerga o pedido deve ver a pausa, sem ampliar a leitura dos arquivos. Registrada em [etapa2-prazo.md](etapa2-prazo.md), achado 4.
- Esta tarefa muda dado, RLS (nenhuma política) e regra de prazo: sim. Link da análise acima.

## 3. Escopo

**Arquivos e módulos permitidos:**

- `prisma/schema.prisma` (campo `quantidadeArquivos` em `SolicitacaoConclusao`) e uma migration nova.
- `src/lib/prazo-em-conferencia.ts`: `emConferenciaDesde`, `PEDIDO_PENDENTE_PARA_PRAZO` e `SEM_CONFERENCIA_EM_ANDAMENTO` passam a usar a coluna.
- `src/lib/projetos-tarefas.ts` (consultas que selecionam `_count: { arquivos }` só para a pausa), `src/lib/clientes.ts` e `src/lib/notificacoes.ts` se algum `select` ou filtro precisar trocar.
- Testes: `tests/unit/prazo-em-conferencia.unit.test.ts`, `tests/integration/prazo-em-conferencia.integration.test.ts` (e arquivos novos).
- Docs: `docs/funcionalidades/{tarefas,subtarefas,notificacoes,area-exclusiva-cliente}.md` e a seção 8 deste arquivo.

**Arquivos e módulos proibidos:**

- Qualquer política de RLS existente: **nenhuma muda**. Em particular `arquivos_comprovante_select` não pode ficar mais permissiva.
- Telas e regras puras (`situacao-prazo`, `lista-tarefas`, `agenda-itens`, `painel` e as páginas): já recebem `emConferenciaDesde`.
- `docs/analises/planejamento-diferencas-prototipos.md` e `docs/decisoes-desenvolvimento.md` (as notas vão na seção 8).
- Os arquivos de outras tarefas em andamento (conferir o registro antes de começar).

**Arquivos compartilhados reservados por esta tarefa** (seção 7 do protocolo):

- `prisma/schema.prisma` e `prisma/migrations/**`.
- `src/lib/projetos-tarefas.ts`.

## 4. Dependências

- Tarefas que precisam estar integradas antes: `etapa2-prazo` (a função única e a pausa nascem nela) e a aprovação da análise.
- Tarefas que dependem desta: a régua de avisos da Fase 6 e o anel de "obrigações em dia" do portal, que podem ler a coluna.

## 5. Contratos e interfaces relevantes

- `solicitar_conclusao` (3 argumentos): redefinir a partir do corpo da migration mais recente que a define; gravar `quantidadeArquivos` no mesmo `INSERT` do pedido, com a contagem que a função já calcula. A assinatura não muda.
- Trigger que torna o pedido imutável: continua valendo. O preenchimento dos pedidos existentes é feito pela migration sem afrouxá-lo para o uso normal.
- Assinaturas públicas de `src/lib/projetos-tarefas.ts` não mudam; só o que as consultas selecionam internamente.
- Tipo `PedidoParaPrazo` de `prazo-em-conferencia.ts` troca `_count`/`arquivos` por `quantidadeArquivos`.
- `CLIENTE` continua sem ler `solicitacoes_conclusao` e `arquivos_comprovante`.

## 6. Critérios de aceite

- [ ] O novo responsável de uma tarefa reatribuída durante a conferência vê "Enviado em dd/mm" e não vê atraso; o mesmo vale para o segundo externo atribuído e para o interno responsável sem atribuição ao projeto.
- [ ] Ninguém além de quem já lia passa a ler arquivo de comprovante (teste do negado).
- [ ] Pedido sem arquivo, devolvido e retirado continuam contando prazo.
- [ ] Os filtros "cliente com atraso" e "atrasados de meses anteriores" usam a coluna e dão o mesmo resultado que as listas.
- [ ] Pedidos existentes recebem a contagem certa na migration.
- [ ] Os testes da etapa 2 continuam verdes sem alterar asserção.

## 7. Testes obrigatórios

- Unitário em `tests/unit/`: `emConferenciaDesde` e os fragmentos de consulta com a coluna nova.
- Integração em `tests/integration/` (RLS e permissão): os três casos do item 1 da análise, perfil permitido e negado; `CLIENTE` negado; o ciclo real pelo `solicitarConclusao`; o preenchimento dos pedidos existentes.
- Jornada de navegador: não se aplica (nenhuma tela muda).
- Verificação final: `bash scripts/agentes/verificar.sh --completo` sem falhas novas.

## 8. Notas para o planejamento e as decisões

- `decisoes-desenvolvimento.md`: registrar que a existência de arquivo no envio fica guardada no pedido (`quantidadeArquivos`), para a pausa não depender da leitura dos arquivos; e a razão (RLS).
- `planejamento-diferencas-prototipos.md`: fecha a pendência da Fase 2 sobre a visibilidade da pausa; a Fase 6 usa a coluna.

## 9. Resumo da implementação (preenchido ao terminar)

- Commits e arquivos alterados (resumo): migration `20261124120000_pausa_prazo_quantidade_arquivos` (coluna `quantidadeArquivos`, preenchimento dos pedidos existentes, gatilho dos arquivos e gatilho de imutabilidade redefinido); `prisma/schema.prisma` (um campo); `src/lib/prazo-em-conferencia.ts` (tipo, `emConferenciaDesde`, `PEDIDO_PENDENTE_PARA_PRAZO`, `SEM_CONFERENCIA_EM_ANDAMENTO`); `src/lib/projetos-tarefas.ts` (três `select` do colaborador e `carregarEnvios`); testes unitário e de integração; `docs/funcionalidades/tarefas.md` e a análise.
- Decisões tomadas durante o trabalho: a contagem é mantida por **gatilho nos arquivos**, e não gravada no `INSERT` do pedido como a análise previa (ajuste registrado na análise): a função `solicitar_conclusao` liga os arquivos depois de criar o pedido, e o gatilho cobre qualquer caminho, inclusive fixtures de teste. As telas de conferência da administração (`painel/page.tsx`, `subtarefas/page.tsx`, `listarSolicitacoesConclusaoPendentes`) continuam contando os arquivos que a administração lê, porque mostram "Conferir N comprovantes".
- Verificações executadas e resultado (comando e saída resumida): `bash scripts/agentes/verificar.sh --completo` em 2026-11-24, com o Postgres local no ar: arquivos sensíveis ok, typecheck ok, lint ok, 54 arquivos e 390 testes unitários, 44 arquivos e 362 testes de integração e smoke (357 anteriores mais 5 novos) e 9 jornadas de navegador, tudo passando, código de saída 0. Nenhuma asserção existente foi alterada; o único ajuste em teste antigo foi o formato da fixture do `emConferenciaDesde` (`_count` virou `quantidadeArquivos`), com a mesma asserção.
- Falhas preexistentes encontradas (com o comando que as reproduz em `origin/staging`): nenhuma até aqui.
- Pendências e riscos: o preenchimento dos pedidos existentes foi verificado executando o trecho da migration contra um pedido já devolvido com 3 arquivos (contagem passou de 0 para 3 e o gatilho voltou a ficar ativo); a migration inteira foi aplicada do zero no banco de teste. Não foi aplicada sobre um banco com dados reais.
- Pergunta em aberto para a pessoa responsável: nenhuma (a opção A foi aprovada e não há envios reais na VPS).
