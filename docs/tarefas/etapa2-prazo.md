# TAREFA etapa2-prazo — Etapa 2 dos comprovantes (o prazo para durante a conferência)

> Implementa a análise aprovada [comprovantes-etapa2-prazo.md](../analises/comprovantes-etapa2-prazo.md). Campo sem resposta fica como **pendente de validação**.

| Campo | Valor |
|---|---|
| **ID** | `etapa2-prazo` |
| **Agente responsável** | claude |
| **Branch** | `claude/etapa2-prazo` (criada a partir de `claude/etapa2-analise`, porque a análise ainda não está em `origin/staging`) |
| **Worktree** | `~/multiplus-worktrees/claude-etapa2-prazo` |
| **Estado** | em revisão (código, testes, documentação e conferência visual prontos; falta a revisão cruzada) |
| **Quem aprovou o escopo** | o usuário, em 2026-11-23, ao aprovar a análise e pedir o início da implementação |
| **Revisor** | codex |

## 1. Objetivo

Item (tarefa ou subtarefa) com pedido de conclusão pendente que tem arquivos de comprovante deixa de contar prazo: sai de atraso, de "vence em breve" e dos avisos de prazo, e mostra "Enviado em dd/mm". Devolvido ou retirado, volta a contar com o prazo original. Pedido sem arquivo continua contando.

## 2. Contexto da funcionalidade

- Módulo: [../funcionalidades/tarefas.md](../funcionalidades/tarefas.md) (limitação L7, que esta tarefa remove), `subtarefas.md`, `notificacoes.md`, `agenda.md`.
- **Análise aprovada** (obrigatória, muda regra de prazo): [../analises/comprovantes-etapa2-prazo.md](../analises/comprovantes-etapa2-prazo.md). Aprovada em 2026-11-23, com as dez perguntas respondidas e a devolução (opção A) confirmada pela cliente.
- Decisões que valem aqui: pausa **derivada** do pedido pendente com arquivos, **sem migration, sem RLS e sem coluna nova**; a pausa vale só para o item que recebeu o pedido; "A iniciar" da subtarefa e a régua de avisos da Fase 6 ficam para depois, reaproveitando a função única.
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
- Tarefas que dependem desta: a régua de avisos da Fase 6 e a análise do portal (anel de "obrigações em dia"), ambas ainda não criadas, e o "A iniciar" da subtarefa.

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
- [x] Funciona em 375 px e no desktop, sem rolagem horizontal; só tokens de `globals.css`. (Conferido no navegador em 23/11/2026, veja a seção 9.)
- [ ] Permissão e visibilidade conferidas por perfil, com teste do permitido e do negado.

## 7. Testes obrigatórios

- Unitário em `tests/unit/`: a função única (todos os estados do pedido), `situacaoDoPrazo`, `lista-tarefas`, `agenda-itens`, `painel`, `lista-meus-projetos`, `calcularPercentualEmDia`, o selo (inclusive 22h de Brasília) e o PDF.
- Integração em `tests/integration/`: `idsDeClientesComAtraso`, agenda e atrasados anteriores, job de avisos, ciclo enviar/devolver/reenviar/confirmar/retirar, subtarefa, recorrência e visibilidade por perfil.
- Jornada de navegador: ampliar `tests/browser/comprovantes.spec.ts` (externo envia item atrasado e vê "Enviado em"; devolvido volta a "Atrasado"), a 375 px e no desktop.
- Os testes existentes de semáforo, atraso, agenda, painel e portal continuam verdes **sem alterar asserção**.
- Verificação final: `bash scripts/agentes/verificar.sh --completo` sem falhas novas.

## 8. Notas para o planejamento e as decisões

Para quem integra consolidar (esta tarefa não edita os dois documentos):

- **`planejamento-diferencas-prototipos.md`, Fase 2:** etapa 2 dos comprovantes implementada (o prazo para durante a conferência), sem migration. A limitação L7 já foi removida de `docs/funcionalidades/tarefas.md`. Restam a etapa 3 (pedido de prazo e impedimento) e a etapa 4.
- **`decisoes-desenvolvimento.md`:** registrar (a) a regra: pausa só com pedido pendente com arquivos, vale só para o item que recebeu o pedido, devolvido ou retirado volta com o **prazo original** (confirmado pela cliente em 2026-11-23); (b) a forma de guardar: derivada do pedido, sem coluna, migration ou RLS nova; (c) a ordem: etapa 2 antes do "A iniciar" da subtarefa.
- **Dependências para as próximas fases:** a régua de avisos da Fase 6 (escalada depois de 3 dias) e o anel de "obrigações em dia" do portal devem usar `src/lib/prazo-em-conferencia.ts`; o portal exige função booleana `SECURITY DEFINER`, sem abrir leitura de pedidos ao cliente. O "A iniciar" da subtarefa altera filtros por `EM_ANDAMENTO` que a pausa também toca (`idsDeClientesComAtraso`, `contarMinhasPendencias`, `solicitar_conclusao`).
- **Lacuna anterior:** o job de avisos de prazo cobre só tarefas (não subtarefas) e o evento de "prazo vencido" não existe.
- **Integração com a tarefa `duplicar-projeto`:** as duas editam `src/app/(painel)/projetos/[id]/page.tsx` (linhas diferentes) e acrescentam linha ao registro em `docs/tarefas/README.md`; quem integra resolve o encaixe.

## 9. Resumo da implementação (preenchido ao terminar)

- Commits e arquivos alterados (resumo): `c7cbf5a` (esta tarefa), `1d2ba62` (código e testes: função única `src/lib/prazo-em-conferencia.ts`; regras puras em `situacao-prazo`, `lista-tarefas`, `regras-projetos-tarefas`, `agenda-itens`, `painel`, `lista-meus-projetos`, `exportacao-pdf-tarefas`; consultas em `projetos-tarefas`, `clientes`, `notificacoes`; selo em `src/ui/indicador-dias-restantes.tsx` e `src/ui/lista.tsx`; 11 telas; `tests/unit/prazo-em-conferencia.unit.test.ts` e `tests/integration/prazo-em-conferencia.integration.test.ts`), `66a7d58` (documentação: funcionalidades de tarefas, subtarefas, notificações, agenda e área do cliente, SRS RF-009, esta tarefa) e o commit da jornada `tests/browser/comprovantes-prazo.spec.ts`.
- Decisões tomadas durante o trabalho: a branch parte de `claude/etapa2-analise` (desvio do protocolo, que manda partir de `origin/staging`), porque a análise aprovada ainda não está em `origin/staging`; `ItemAgenda.emConferenciaDesde` ficou opcional para não alterar fixtures de testes existentes; o item em conferência aparece só em "Todos" nas listas, sem botão de filtro novo (pergunta 5 da análise); a classe da agenda usa `bg-azul-cl text-azul-esc` (tokens já existentes).
- Verificações executadas e resultado (comando e saída resumida): `bash scripts/agentes/verificar.sh --completo` em 2026-11-23, com o Postgres local no ar: arquivos sensíveis ok, typecheck ok, lint ok, 52 arquivos e 381 testes unitários passando (359 anteriores mais 22 novos), 43 arquivos e 350 testes de integração e smoke passando (337 anteriores mais 13 novos, de `prazo-em-conferencia.integration.test.ts`) e 8 jornadas de navegador passando (7 anteriores mais `comprovantes-prazo.spec.ts`). Nenhuma asserção existente foi alterada. A primeira tentativa, sem o Docker, falhou só por `ECONNREFUSED 127.0.0.1:5434`.
- Falhas preexistentes encontradas (com o comando que as reproduz em `origin/staging`): nenhuma nos testes que rodaram. O servidor de desenvolvimento do Next recusou subir na primeira tentativa das jornadas (recusa conhecida do protocolo, seção 10).
- Pendências e riscos: (1) a conferência visual foi feita em 23/11/2026 (veja o item abaixo); (2) não há teste unitário do texto do PDF (`indicadorPrazo` não é exportado); (3) caso-limite documentado na análise: externo que só tem uma subtarefa e vê a tarefa-mãe não lê o pedido da tarefa (RLS), então o prazo da tarefa-mãe segue normal para ele; (4) a branch parte de `claude/etapa2-analise` e leva os commits da análise, que ainda não estão em `origin/staging`.
- Conferência visual (2026-11-23, servidor local em banco isolado com 9 itens de exemplo: 7 tarefas e 2 subtarefas; 375 px e 1280 px): tela do externo (`/minhas-tarefas` e a página da tarefa-mãe), painel, agenda (mês e lista), listas de tarefas e subtarefas, página da tarefa e do projeto, e contagem de clientes com atraso. Resultado: os itens em conferência aparecem azuis com "Enviado em 23/11" e saem de "Atrasados" e "Vencem em N dias" em todas as telas; os atrasados reais (inclusive a tarefa-mãe e o pedido sem comprovante) seguem contando; o percentual "em dia" do painel (56%, 5 de 9) e o das subtarefas (50%, 1 de 2) batem com a regra; sem rolagem lateral e sem erro no console. Não conferido: o texto do PDF, a tela de cliente com atraso só por conferência (coberta por teste de integração). Observação de interface (não é defeito da regra): o pedido sem comprovante aparece na seção "Aguardando conferência" do externo, mas mantém "Atrasado N dias", porque a regra só pausa o prazo com arquivo anexado; se a Talita estranhar, vale revisar o nome da seção.
- Pergunta em aberto para a pessoa responsável: abrir o Pull Request para `staging` (com a revisão cruzada do Codex, conforme o protocolo)?
