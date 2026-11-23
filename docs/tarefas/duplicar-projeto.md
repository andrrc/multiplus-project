# TAREFA duplicar-projeto — Duplicar projeto

> Campo sem resposta fica como **pendente de validação**, nunca como suposição. A tarefa só passa de `proposta` para `aprovada` depois que a pessoa
> responsável responder as perguntas da seção 2.

| Campo | Valor |
|---|---|
| **ID** | `duplicar-projeto` |
| **Agente responsável** | codex |
| **Branch** | `codex/duplicar-projeto` (criada a partir de `origin/staging`) |
| **Worktree** | `~/multiplus-worktrees/codex-duplicar-projeto` |
| **Estado** | proposta |
| **Quem aprovou o escopo** | pendente (aguarda o usuário) |
| **Revisor** | claude |
| **Criada em** | 2026-11-23 |

## 1. Objetivo

A administração duplica um projeto existente para começar outro parecido sem recriar tudo à mão: o sistema cria um projeto novo, **no mesmo cliente**, com as tarefas e
subtarefas do original em estado inicial, **sem datas e sem comprovantes enviados**.

## 2. Contexto da funcionalidade

- **Regra aprovada pela cliente em 2026-11-23** (registrada em `docs/decisoes-desenvolvimento.md`): "Duplicar projeto copia tarefas e subtarefas com status 'A iniciar', sem datas e
  sem comprovantes enviados."
- Protótipo: `telas-novas/sistema-gestao-multiplus/04-projeto.html` (item "Duplicar projeto" no menu "…" do cabeçalho; prioridade Baixa na especificação). O protótipo
  **não define o que mais é copiado**. Os dados dos protótipos são ilustrativos.
- Módulo: [../funcionalidades/projetos.md](../funcionalidades/projetos.md) (seção P4, Detalhe do projeto) e [../funcionalidades/tarefas.md](../funcionalidades/tarefas.md).
- Esta tarefa **não muda permissão, RLS, dado novo nem regra de prazo**: cria registros com os modelos que já existem (`Projeto`, `Tarefa`, `Subtarefa`), só para `ADMIN`. Por isso não exige
  análise à parte, **mas exige as respostas abaixo**.

**Perguntas que a pessoa responsável precisa responder antes de começar (pendentes de validação):**

1. **Status das subtarefas.** O status "A iniciar" **ainda não existe** para subtarefa (hoje: `EM_ANDAMENTO`, `CONCLUIDO`, `CANCELADO`; o item "A iniciar" de subtarefa está na Fase 7 do
   planejamento). Recomendação: a subtarefa copiada nasce `EM_ANDAMENTO`, o status inicial de hoje, e a Fase 7 ajusta depois. Aprovado?
2. **O que mais copiar.** Recomendação: copiar `nome` e `descricao` do projeto e das tarefas, o `titulo` e a `descricao` das subtarefas, as `etiquetas` das subtarefas, a **configuração** de
   comprovante exigido (`comprovanteExigido`, `comprovanteQuantidade`, `comprovanteInstrucoes`; é a exigência, não os arquivos), `colaboradorPodeCriarSubtarefas` e `diasAntecedencia`.
   **Não** copiar: datas (`dataInicio`, `dataPrevistaConclusao`, `prazo`, `prazoOriginal`), status (todos nascem iniciais), comprovantes enviados, pedidos de conclusão, comentários, documentos,
   valor contratado, número da proposta, recorrência (`periodicidade`, `diaSemana`, `serieId`, `serieEncerradaEm`) e responsáveis. Aprovado, ou quer mudar algum item?
3. **Nome do projeto novo.** Recomendação: `Cópia de <nome do original>`, editável logo depois. Aprovado?
4. **Fluxo na tela.** Recomendação: o botão "Duplicar" na página do projeto abre uma confirmação que mostra o que será copiado; depois da criação, vai para o projeto novo. Aprovado?
5. **Cópia de projeto desativado.** Recomendação: só projetos **ativos** podem ser duplicados, e só tarefas e subtarefas **ativas** são copiadas. Aprovado?

## 3. Escopo

**Arquivos e módulos permitidos:**

- `src/lib/duplicar-projeto.ts` (novo): a regra de duplicação, numa transação, reaproveitando as funções existentes.
- Arquivos novos em `src/app/(painel)/projetos/[id]/duplicar/` (Server Action e, se a confirmação pedir, uma página).
- `src/app/(painel)/projetos/[id]/page.tsx`, **só** para acrescentar o botão e o link da confirmação (mudança mínima).
- `tests/unit/duplicar-projeto*.test.ts` e `tests/integration/duplicar-projeto.integration.test.ts` (novos). Jornada de navegador em arquivo novo, se o escopo pedir.
- `docs/funcionalidades/projetos.md` (seção do detalhe do projeto e histórico).

**Arquivos e módulos proibidos:**

- `prisma/schema.prisma` e `prisma/migrations/**` (a numeração hierárquica de projeto, tarefa e subtarefa já é atribuída pelo banco; **não** é preciso migration).
- `src/ui/**`, `src/lib/navegacao.ts`, `src/app/globals.css`, `package.json`, `package-lock.json`.
- `src/lib/projetos-tarefas.ts`: **chame** as funções exportadas (`criarProjeto`, `criarTarefa`, `criarSubtarefa`) sem alterá-las. Se for impossível sem mudar o arquivo, **pare** e peça a reserva.
- CI, `ops/`, Docker, configuração de testes.
- `docs/analises/planejamento-diferencas-prototipos.md` e `docs/decisoes-desenvolvimento.md` (as notas vão na seção 8).
- Os arquivos da tarefa `etapa2-analise`.

**Arquivos compartilhados reservados por esta tarefa:** nenhum.

## 4. Dependências

- Tarefas que precisam estar integradas antes: nenhuma.
- Tarefas que dependem desta: nenhuma. A tarefa da Fase 7 ("A iniciar" de subtarefa) deve revisar a cópia depois (pergunta 1).

## 5. Contratos e interfaces relevantes

- `criarProjeto`, `criarTarefa` e `criarSubtarefa` (`src/lib/projetos-tarefas.ts`, tipos `DadosProjeto`, `DadosTarefa`, `DadosSubtarefa`): só `ADMIN` chama (`exigirAdministrador`). Leia como cada uma valida e
  monta os dados antes de decidir se a duplicação passa por elas ou grava direto pelo Prisma na mesma transação (`comContextoDeUsuario`, `src/lib/prisma-app.ts`).
- Numeração: `numeroLocal` de projeto (por cliente), tarefa (por projeto) e subtarefa (por tarefa) é atribuído por trigger do banco (migration `ids_hierarquicos`); **não** informe `numeroLocal`.
- Soft delete: consulte só `ativo = true`; a administração enxerga os desativados, então o filtro é da aplicação.
- Server Action: monte os dados campo a campo (regra do `AGENTS.md`); `clienteId` e o projeto de origem vêm da rota e são validados no servidor.
- Auditoria de criação: veja como `criarTarefa` e `criarSubtarefa` preenchem `criadoPorId` e `criadoPorNome` e mantenha o padrão.
- Notificações: confira se a criação de tarefa ou subtarefa dispara aviso hoje; a duplicação **não** deve disparar aviso em massa sem aprovação.

## 6. Critérios de aceite

- [ ] Só a administração vê o botão e só ela executa a duplicação (servidor e RLS); interno, externo e cliente recebem erro de permissão.
- [ ] O projeto novo fica no **mesmo cliente**, com `status` inicial e sem datas, e recebe o próximo `numeroLocal` do cliente.
- [ ] Tarefas e subtarefas ativas do original são copiadas, em estado inicial, com os campos da pergunta 2 conforme aprovado, **sem** datas, comprovantes enviados, pedidos de conclusão e comentários.
- [ ] A cópia é atômica: se algo falhar no meio, nada é criado.
- [ ] O projeto original, as tarefas e os arquivos dele não mudam.
- [ ] Projeto desativado, inexistente ou de outro cliente não é duplicado (erro claro).
- [ ] Funciona em 375 px e no desktop, sem rolagem horizontal.

## 7. Testes obrigatórios

- Unitário em `tests/unit/`: a escolha dos campos copiados e o que fica de fora, como função pura.
- Integração em `tests/integration/` (RLS e permissão): `ADMIN` duplica; `ADMIN_INTERNO`, `ADMIN_EXTERNO` e `CLIENTE` são recusados; só itens ativos são copiados; numeração correta; atomicidade em caso de falha;
  o original permanece intacto; o status inicial das subtarefas conforme a pergunta 1.
- Jornada de navegador em `tests/browser/` (arquivo novo): abrir o projeto, duplicar e ver o projeto novo.
- Verificação final: `bash scripts/agentes/verificar.sh --completo` sem falhas novas.

## 8. Notas para o planejamento e as decisões

(Preencher ao terminar.) Registrar em `planejamento-diferencas-prototipos.md`, Fase 4: "Duplicar projeto" feito, com o que é copiado. Em `decisoes-desenvolvimento.md`: as respostas das perguntas 1 a 5.

## 9. Resumo da implementação (preenchido ao terminar)

- Commits e arquivos alterados (resumo):
- Decisões tomadas durante o trabalho:
- Verificações executadas e resultado (comando e saída resumida):
- Falhas preexistentes encontradas (com o comando que as reproduz em `origin/staging`):
- Pendências e riscos:
- Pergunta em aberto para a pessoa responsável:
