# TAREFA etapa2-prazo — Etapa 2 dos comprovantes (o prazo para durante a conferência)

> Implementa a análise aprovada [comprovantes-etapa2-prazo.md](../analises/comprovantes-etapa2-prazo.md). Campo sem resposta fica como **pendente de validação**.

| Campo | Valor |
|---|---|
| **ID** | `etapa2-prazo` |
| **Agente responsável** | claude |
| **Branch** | `claude/etapa2-prazo` (criada a partir de `claude/etapa2-analise`, porque a análise ainda não está em `origin/staging`) |
| **Worktree** | `~/multiplus-worktrees/claude-etapa2-prazo` |
| **Estado** | em andamento |
| **Quem aprovou o escopo** | o usuário, em 2026-11-23, ao aprovar a análise e pedir o início da implementação |
| **Revisor** | codex |

## 1. Objetivo

Item (tarefa ou subtarefa) com pedido de conclusão pendente que tem arquivos de comprovante deixa de contar prazo: sai de atraso, de "vence em breve" e dos avisos de prazo, e mostra "Enviado em dd/mm". Devolvido ou retirado, volta a contar com o prazo original. Pedido sem arquivo continua contando.

## 2. Contexto da funcionalidade

- Módulo: [../funcionalidades/tarefas.md](../funcionalidades/tarefas.md) (limitação L7, que esta tarefa remove), `subtarefas.md`, `notificacoes.md`, `agenda.md`.
- **Análise aprovada** (obrigatória, muda regra de prazo): [../analises/comprovantes-etapa2-prazo.md](../analises/comprovantes-etapa2-prazo.md). Aprovada em 2026-11-23, com as dez perguntas respondidas e a devolução (opção A) confirmada pela cliente.
- Decisões que valem aqui: pausa **derivada** do pedido pendente com arquivos, **sem migration, sem RLS e sem coluna nova**; a pausa vale só para o item que recebeu o pedido; "A iniciar" da subtarefa e a régua de avisos da Fase 3 ficam para depois, reaproveitando a função única.
- Protótipos de referência: `telas-novas/sistema-gestao-multiplus-colaborador-externo/00-especificacao-colaborador-externo.md` (seção 3.3) e `telas-novas/colaborador-interno/00-especificacao-colaborador-interno.md` (seção 3.3). Dados dos protótipos são ilustrativos.

## 3. Escopo

**Arquivos e módulos permitidos:**

- `src/lib/prazo-em-conferencia.ts` (novo): função única e fragmentos de consulta.
- Regras puras: `src/lib/situacao-prazo.ts`, `lista-tarefas.ts`, `regras-projetos-tarefas.ts`, `agenda-itens.ts`, `painel.ts`, `lista-meus-projetos.ts`, `exportacao-pdf-tarefas.ts`.
- Consultas e avisos: `src/lib/clientes.ts` (`idsDeClientesComAtraso`), `src/lib/notificacoes.ts` (`dispararPrazoProximo`), `src/lib/projetos-tarefas.ts` (reservado, ver abaixo).
- Telas: `src/app/(painel)/` — `painel/page.tsx`, `painel/painel-interno.tsx`, `minhas-tarefas/page.tsx`, `minhas-tarefas/tela-externo.tsx`, `minhas-tarefas/[id]/page.tsx`, `tarefas/page.tsx`, `tarefas/[id]/page.tsx`, `subtarefas/page.tsx`, `projetos/[id]/page.tsx`, `meus-projetos/[id]/page.tsx`, `agenda/visao-agenda.tsx`.
- Testes: `tests/unit/`, `tests/integration/` e `tests/browser/comprovantes.spec.ts` (ajustes e arquivos novos).
- Docs: `docs/funcionalidades/{tarefas,subtarefas,notificacoes,agenda,area-exclusiva-cliente}.md`, SRS (RF-009) e a seção 8 deste arquivo.

**Arquivos e módulos proibidos:**

- `prisma/schema.prisma` e `prisma/migrations/**` (a opção aprovada não tem migration; se aparecer necessidade, **pare** e pergunte).
- `src/lib/navegacao.ts`, `src/app/globals.css`, `package.json`, `package-lock.json`, configuração de testes, CI, `ops/`, Docker.
- `docs/analises/planejamento-diferencas-prototipos.md` e `docs/decisoes-desenvolvimento.md` (as notas vão na seção 8).
- Os arquivos da tarefa `duplicar-projeto` (`src/lib/duplicar-projeto.ts`, `src/app/(painel)/projetos/[id]/duplicar/**`, `tests/**/duplicar-projeto*`). Ponto de contato: a tarefa do Codex acrescenta **uma linha** (o botão) em `projetos/[id]/page.tsx`; esta tarefa edita outras linhas do mesmo arquivo. Quem integra resolve o encaixe.

**Arquivos compartilhados reservados por esta tarefa** (seção 7 do protocolo):

- `src/ui/indicador-dias-restantes.tsx` e `src/ui/lista.tsx` (`src/ui/**`).
- `src/lib/projetos-tarefas.ts`.

## 4. Dependências

- Tarefas que precisam estar integradas antes: `etapa2-analise` (a análise ainda só existe na branch dela; esta branch parte dela).
- Tarefas que dependem desta: a régua de avisos da Fase 3 e a análise do portal (anel de "obrigações em dia"), ambas ainda não criadas, e o "A iniciar" da subtarefa.

## 5. Contratos e interfaces relevantes

- `solicitar_conclusao` e `registrar_arquivo_comprovante` (migration `20261117120000_comprovantes_etapa1`): **não mudam**. "Pedido com comprovante" = pedido `PENDENTE` com ao menos um registro em `arquivos_comprovante`.
- RLS de `solicitacoes_conclusao` e `arquivos_comprovante`: **não muda**. `CLIENTE` não lê nenhuma das duas.
- Assinaturas públicas de `src/lib/projetos-tarefas.ts`: só se acrescentam campos ao que as consultas devolvem; nenhum parâmetro obrigatório novo. Cada função pura ganha o dado de conferência como parâmetro **opcional** com o padrão "não está em conferência".

## 6. Critérios de aceite

- [ ] Item em conferência (pedido pendente com arquivos) não é atrasado, não aparece em "Atrasados" nem em "Vencem em N dias" e mostra "Enviado em dd/mm" (fuso de Brasília) em todas as telas, na agenda e no PDF listados na seção 4 da análise.
- [ ] Pedido sem arquivo continua contando prazo como hoje.
- [ ] Devolvido ou retirado: volta a contar na hora, com o prazo original.
- [ ] A pausa vale só para o item que recebeu o pedido (subtarefa não pausa a tarefa-mãe).
- [ ] `idsDeClientesComAtraso` e o job `dispararPrazoProximo` ignoram o item em conferência.
- [ ] As contas repetidas de `calcularDiasRestantes < 0` nas telas passam pela função única.
- [ ] Nenhuma migration, política de RLS, coluna nova ou leitura nova para `CLIENTE`; o portal fica como está.
- [ ] Funciona em 375 px e no desktop, sem rolagem horizontal; só tokens de `globals.css`.
- [ ] Permissão e visibilidade conferidas por perfil, com teste do permitido e do negado.

## 7. Testes obrigatórios

- Unitário em `tests/unit/`: a função única (todos os estados do pedido), `situacaoDoPrazo`, `lista-tarefas`, `agenda-itens`, `painel`, `lista-meus-projetos`, `calcularPercentualEmDia`, o selo (inclusive 22h de Brasília) e o PDF.
- Integração em `tests/integration/`: `idsDeClientesComAtraso`, agenda e atrasados anteriores, job de avisos, ciclo enviar/devolver/reenviar/confirmar/retirar, subtarefa, recorrência e visibilidade por perfil.
- Jornada de navegador: ampliar `tests/browser/comprovantes.spec.ts` (externo envia item atrasado e vê "Enviado em"; devolvido volta a "Atrasado"), a 375 px e no desktop.
- Os testes existentes de semáforo, atraso, agenda, painel e portal continuam verdes **sem alterar asserção**.
- Verificação final: `bash scripts/agentes/verificar.sh --completo` sem falhas novas.

## 8. Notas para o planejamento e as decisões

(Preencher ao terminar.) Registrar em `planejamento-diferencas-prototipos.md`, Fase 2: etapa 2 dos comprovantes implementada; remover a limitação L7 da página de tarefas.

## 9. Resumo da implementação (preenchido ao terminar)

- Commits e arquivos alterados (resumo):
- Decisões tomadas durante o trabalho:
- Verificações executadas e resultado (comando e saída resumida):
- Falhas preexistentes encontradas (com o comando que as reproduz em `origin/staging`):
- Pendências e riscos:
- Pergunta em aberto para a pessoa responsável:
