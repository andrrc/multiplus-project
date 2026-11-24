# Agenda

- **Última revisão:** 2026-10-20.
- **Requisitos:** RF-036; ADR-009.
- **Módulos relacionados:** Tarefas.

## Visão geral

A **Agenda** é um calendário mensal com os prazos de todas as tarefas. Ela mostra também
as **próximas ocorrências** de tarefas recorrentes que ainda não existem, calculadas na
hora, para a Administradora planejar o mês.

## Quem pode fazer o quê

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Ver a agenda de todos os projetos (`/agenda`) | Sim | Não | Não | Não |
| Ver a agenda dos prazos do próprio escopo (`/minha-agenda`) | Não se aplica | Sim | Não | Não |

---

## Funcionalidades

A apresentação do calendário está em adaptação visual aos modelos da Múltiplus; os eventos, consultas e a navegação mensal continuam existentes. No celular, os mesmos itens são agrupados por dia em ordem cronológica para facilitar a leitura.


### G1. Calendário mensal de prazos (RF-036)

**Como funciona.**
- **Navegação:** mês anterior e próximo mês, com o dia de hoje destacado.
- **Tipos de item:** prazo normal, atrasado (vermelho terra, a partir da meia-noite de
  Brasília seguinte ao prazo), visita/reunião e tarefa
  recorrente ainda não criada (fundo azul claro com borda tracejada, identificada como
  "Tarefa recorrente").
- **Filtros:** por cliente, por projeto, **por responsável** (18/11/2026; pessoa envolvida, equipe ou "Sem responsável") e "Só visitas/reuniões".
- **Em conferência (23/11/2026):** a tarefa com pedido de conclusão pendente que tem comprovantes ganha a
  classe "Em conferência" (azul claro, na legenda), nem atrasada nem "vence em breve", e fica fora da faixa de
  atrasados de meses anteriores ([análise](../analises/comprovantes-etapa2-prazo.md)). Na lista por dia e no painel do dia o item mostra "Em conferência · Enviado em dd/mm" (dia de Brasília); no PDF, a situação sai como "Enviado em dd/mm". A agenda lista só tarefas, não subtarefas.
- **Faixa de atrasados (23/11/2026):** quando há itens abertos e vencidos em meses anteriores ao exibido, uma faixa vermelha avisa "N itens atrasados de meses anteriores continuam abertos" e o link "Ver atrasados" abre a lista de tarefas atrasadas (na agenda da administração, com os filtros de cliente, projeto e responsável em uso; na do colaborador interno, em Minhas tarefas). Sem ela, o atraso do mês passado sumia ao navegar para o mês atual. Concluído, cancelado, desativado e sem prazo não contam; o dia do prazo ainda não é atraso. `contarAtrasadosAnteriores` (`src/lib/agenda-itens.ts`), `contarAtrasadosAnterioresAgenda` e `contarAtrasadosAnterioresColaborador` (`src/lib/projetos-tarefas.ts`); o colaborador interno só conta o que a RLS já entrega a ele.
- **Exportar PDF (18/11/2026):** o botão "Exportar PDF" da barra de filtros gera a agenda do mês, em lista (data, item, projeto, cliente, responsável e situação do prazo), com os mesmos filtros da tela. A ocorrência futura de tarefa recorrente sai como "Próxima ocorrência", sem situação de prazo.
- **Mês vazio:** a tela avisa que não há prazos no mês.

- **Nome completo:** ao passar o mouse sobre um item, a dica do navegador mostra o nome
  completo da tarefa, inclusive nas recorrências e na lista "+N mais".

**Detalhes técnicos.**
- **Exibição:** atributo HTML `title` nos itens, usando o nome já carregado; recorrências
  mantêm também a identificação "Tarefa recorrente" na dica.
- **Rota:** `/agenda?mes=&cliente=&projeto=&responsavel=&visitas=1`. O PDF vem de `GET /api/exportacao-pdf/agenda` (mesmos parâmetros), só para `ADMIN`; o mês sai de `intervaloDoMes` (`src/lib/agenda-periodo.ts`), a mesma conta da tela. Testes: `filtro-responsavel.integration.test.ts`, `busca-e-exportacao-projetos.integration.test.ts` e `agenda-periodo.unit.test.ts`.
- **Função:** `listarItensAgenda` (`src/lib/projetos-tarefas.ts`), que reaproveita
  `listarPrazos`: tarefas ativas de projetos ativos, em todos os status.

### G2. Ocorrências projetadas (ADR-009)

**Como funciona.**
- **O que é:** para tarefas recorrentes, a agenda mostra as ocorrências futuras que ainda
  não foram criadas. Na interface, elas são identificadas como "Tarefa recorrente".
- **Quando vira real:** a ocorrência só é criada de fato quando a anterior é concluída
  (ver T5 em `tarefas.md`).

**Detalhes técnicos.**
- **Função:** `projetarOcorrenciasFuturas` (`src/lib/regras-projetos-tarefas.ts`). Calcula
  em memória, sem gravar, e não duplica ocorrências que já existem.
- **O que não é projetado:** série cancelada, desativada ou encerrada.
- **Teste:** `projetos-tarefas.unit.test.ts`, no bloco "ADR-009 — projeção da Agenda",
  com 4 casos.

---

### G3. Referência de hoje em Brasília

**Como funciona.** O dia destacado e o mês inicial acompanham Brasília, inclusive após 21h, nas viradas de mês e de ano. Os prazos continuam no dia cadastrado.

**Detalhes técnicos.** `dataDeHojeEmSaoPaulo` determina o dia civil usado por `/agenda`, com o mesmo instante usado para avaliar atrasos. Cobertura em `agenda.unit.test.ts` e `datas.unit.test.ts`.

### G4. Agenda do colaborador interno (13/11/2026)

**Como funciona.** O colaborador interno tem a própria agenda (`/minha-agenda`, protótipo interno/07) com os prazos das tarefas dos projetos
a que tem acesso. É só de leitura, sem os filtros de cliente, projeto e visita da administração, e cada prazo abre a tarefa em `/minhas-tarefas`.
O colaborador externo não tem agenda.

**Detalhes técnicos.**
- **Função:** `listarItensAgendaColaborador` (`src/lib/projetos-tarefas.ts`) roda com o contexto do usuário, então a RLS entrega só as tarefas do escopo
  dele, e recusa qualquer perfil que não seja `ADMIN_INTERNO`. A montagem dos itens e a projeção de recorrências são as mesmas da administração
  (`montarItensAgenda`).
- **Tela:** `agenda/visao-agenda.tsx` é a apresentação compartilhada; `/agenda` e `/minha-agenda` informam a rota base e o destino do link da tarefa.
- **Teste:** `agenda-colaborador.integration.test.ts` (isolamento por projeto e recusa dos demais perfis) e a jornada de `colaborador.spec.ts`.

## Limitações e pendências conhecidas

| # | Situação | Efeito |
|---|---|---|
| L1 | Itens com o mesmo projeto, nome e data são unificados na tela. | Duas tarefas distintas com o mesmo nome e prazo no mesmo projeto aparecem como uma só. |
| L2 | A agenda mostra só tarefas. | Prazos de subtarefas não aparecem. |
| L3 | O calendário segue o protótipo `09-agenda` só no visual (13/11/2026). | Faltam os prazos de subtarefas e de projeto, que dependem de dados e regras novos. O filtro por responsável e o "Exportar PDF" foram feitos em 18/11/2026 e a faixa de atrasados de meses anteriores, em 23/11/2026. A agenda do colaborador interno foi aberta em `/minha-agenda` (G4). |

## Histórico de alterações

| Data | Commit | Alteração |
|---|---|---|
| 2026-11-23 | este commit | Classe "Em conferência" para a tarefa com envio de comprovante aguardando conferência (etapa 2) |
| 2026-11-23 | este commit | Faixa de atrasados de meses anteriores na agenda da administração e do colaborador interno |
| 2026-11-18 | este commit | Filtro por responsável e Exportar PDF do mês na agenda da administração |
| 2026-11-13 | este commit | Agenda do colaborador interno (`/minha-agenda`), com consulta própria limitada ao escopo dele ([análise](../analises/restricao-externo-e-agenda-interno.md)) |
| 2026-11-13 | este commit | Agenda no padrão do protótipo: itens coloridos pelo semáforo (visitas em roxo, recorrentes tracejadas), painel do dia ao lado, visualização Mês/Lista e filtros aplicados na hora |
| 2026-11-12 | este commit | Agrupar os itens da agenda por dia no celular |
| 2026-11-10 | este commit | Iniciar adaptação visual da agenda |
| 2026-09-17 | `ddec7eb` | Agenda mensal com ocorrências projetadas (Sprint 4B) |
| 2026-09-28 | `9969bff` | Projeção semanal respeita o dia da semana escolhido |
| 2026-09-29 | `d731f79` | Atrasados e ocorrências projetadas voltam a ter cor (tokens inexistentes corrigidos) |
| 2026-09-30 | `8aa5ba1` | RF-036 formalizado no SRS v2.5; escopo atual mantém a Agenda limitada a tarefas |
| 2026-10-14 | `48dd05d` | Renomear na interface a ocorrência projetada para "Tarefa recorrente" |
| 2026-10-15 | `75498a1` | Atraso passa a virar à meia-noite de Brasília, igual ao semáforo ([análise](../analises/atraso-fuso-e-lista-subtarefas-sem-fundo.md)) |
| 2026-10-20 | este commit | Exibir o nome completo dos itens ao passar o mouse na agenda |
| 2026-10-20 | este commit | Padronizar horários e referência de dia em Brasília ([análise](../analises/padronizacao-horarios-brasilia.md)) |
| 2026-10-27 | este commit | Explicar montagem da agenda e projeção de recorrências no código ([guia](../codigo/README.md), [análise](../analises/documentacao-codigo-portugues.md)) |
