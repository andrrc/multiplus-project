# Tarefas

- **Última revisão:** 2026-10-29.
- **Requisitos:** RF-005, RF-006, RF-007, RF-009, RF-015, RF-018, RF-019, RF-024, RF-039;
  RN-001, RN-006, RN-007, RN-008.
- **Módulos relacionados:** Projetos, Subtarefas, Agenda, Notificações, Comentários.

## Visão geral

Uma **tarefa** é uma etapa de trabalho dentro de um **projeto** de um cliente, como
"Protocolar renovação da LO". Ela tem prazo, status e, opcionalmente, um responsável e uma
recorrência. Cada tarefa pode ser dividida em **subtarefas** (ver `subtarefas.md`).

```
Cliente → Projeto → Tarefa → Subtarefa
```

A Administradora cria e gerencia todas as tarefas. Os colaboradores veem e concluem apenas
as tarefas ligadas a eles.

## Quem pode fazer o quê

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Criar, editar e mudar o status | Sim | Não | Não | Não |
| Ver a lista de todas as tarefas (`/tarefas`) | Sim | Não | Não | Não |
| Ver as próprias tarefas (`/minhas-tarefas`) | — | Sim | Sim | Não |
| Solicitar conclusão da tarefa | Sim (conclui diretamente) | Se for responsável ou estiver atribuído ao **projeto** | Se for responsável ou estiver atribuído à **tarefa** | Não |
| Confirmar ou rejeitar pedido | Sim | Não | Não | Não |
| Criar subtarefa na tarefa | Sim | Se for o responsável **e** a Administradora tiver permitido | Idem | Não |
| Desativar e reativar | Sim | Não | Não | Não |

Com o cliente desativado, colaboradores perdem o acesso às tarefas dos projetos dele. A
Administradora continua vendo tudo.

---

## Funcionalidades

### T1. Criar tarefa

**Como funciona.**
- **Onde:** a tarefa é criada de dentro de um projeto, em "Nova tarefa".
- **Campos:** nome, descrição, responsável, prazo, status inicial, recorrência e
  antecedência do aviso de prazo.
- **Responsável:** uma pessoa envolvida do cliente ou um integrante da equipe. Também é
  possível deixar sem responsável.
- **Subtarefas pelo responsável:** uma caixa de seleção define se o responsável pode criar
  subtarefas (ver T10).

**Detalhes técnicos.**
- **Rota:** `/projetos/[id]/tarefas/nova`, com a action `criarTarefaERedirecionarAction`.
- **Função:** `criarTarefa`, em `src/lib/projetos-tarefas.ts`. É exclusiva do `ADMIN`.
- **Validações no servidor:**
  - prazo obrigatório e válido;
  - dia da semana entre 0 e 6;
  - antecedência maior que zero;
  - um único tipo de responsável;
  - a pessoa precisa ser ativa e do cliente do projeto, ou o usuário precisa ser ativo e
    ter perfil de equipe.
- **Auditoria:** a tarefa grava `criadoPorId` e `criadoPorNome`.
- **Testes:**
  - `projetos-tarefas-a4.integration.test.ts`: "Administrador cria projeto e tarefa
    recorrente com responsável" e "colaborador não acessa CRUD administrativo";
  - `colaborador-cria-subtarefas.integration.test.ts`: "registra administradora, data e
    hora ao criar a tarefa".

### T2. Listar tarefas (Administradora)

**Como funciona.**
- **Conteúdo:** todas as tarefas ativas de projetos ativos, com cliente, projeto, prazo,
  status e responsável.
- **Filtros:** por cliente, projeto, tarefa e responsável. O responsável pode ser pessoa envolvida ou integrante da equipe; "Sem responsável" encontra registros sem nenhum dos dois vínculos. A seleção é aplicada automaticamente e permanece na URL. O filtro considera o responsável direto da tarefa. Ao trocar outro filtro, o responsável é preservado; uma combinação incompatível mostra lista vazia e pode ser limpa em "Todos os responsáveis". Escolher um cliente limita os projetos oferecidos.
- **Destaque:** um indicador mostra quantas subtarefas estão sem responsável.
- **Progresso das subtarefas:** ao filtrar por responsável (inclusive "Sem responsável"),
  a coluna "Subtarefas" mostra concluídas/total, como `2/6`. Considera todas as subtarefas
  ativas da tarefa, mesmo atribuídas a outras pessoas; canceladas e desativadas ficam
  fora. Sem subtarefas elegíveis, mostra `0/0`. Ao voltar a "Todos os responsáveis", a
  coluna desaparece. No celular, o cartão mostra "Subtarefas: 2/6 concluídas".
- **Responsável:** fica em coluna própria, entre Cliente e Prazo, e mostra "—" quando a
  tarefa não tem responsável. O nome é exibido tanto para pessoa envolvida quanto para usuário da equipe. No celular, o cartão traz a linha "Responsável:" (ou "Sem
  responsável").
- **ID:** a tabela ganha uma coluna **ID** com o código hierárquico do registro, mantido inteiro em uma linha dentro do contêiner rolável; no cartão móvel, o ID aparece em uma linha própria junto ao nome. O código tem a forma `TAR-<cliente>-<projeto>-<tarefa>` e usa sequências locais por projeto.
- **Tabela larga:** se todas as colunas não couberem na largura disponível, aparece a orientação “Deslize para ver as demais colunas”, que permanece visível durante a rolagem.
- **Acessibilidade:** a área da tabela pode receber foco e ser percorrida pelo teclado.

**Detalhes técnicos.**
- **Indicador:** componente compartilhado `src/ui/rolagem-horizontal.tsx`, usado pela listagem para medir o excesso de conteúdo e mostrar a orientação sem cobrir a tabela.
- **Filtro por responsável (RF-005/RF-037):** `responsavel=pessoa:<id>`, `usuario:<id>` ou `sem`; validado e aplicado no servidor em `listarPrazos`/`listarSubtarefasPrazos`. Parâmetro inválido mostra aviso e resultado vazio. `listarResponsaveisParaFiltro` exige ADMIN e retorna apenas valor e rótulo, com origem e cliente para distinguir pessoas envolvidas. Opções consideram os demais filtros e o toggle, incluem responsáveis inativos ainda vinculados a registros elegíveis e não expõem dados de contato. A agenda continua sem esse filtro.
- **Agregação de progresso (RF-008/RF-039, RN-007/RN-009):** a página solicita a contagem
  pelo terceiro argumento de `listarPrazos`. Uma agregação `groupBy` no servidor, por
  tarefa e status, conta apenas filhos ativos/não cancelados dos ids da seleção.
  Retorna somente números adicionais, preserva o aviso de atribuição e não realiza
  agregação extra na agenda ou nas chamadas que não solicitam progresso. A nova
  contagem não muda o detalhe da tarefa, que continua incluindo canceladas ativas no total.
- **Testes do progresso:** `progresso-subtarefas.integration.test.ts` cobre contagens,
  mistura de responsáveis, filtros/isolamento, inativas/canceladas, mudanças de status,
  retorno mínimo, agenda e perfis negados; `filtro-responsavel.unit.test.ts` cobre
  exibição condicional e texto acessível na tabela e nos cartões.
- **Identificador:** `numeroLocal` é atribuído pelo banco em toda criação de tarefa, inclusive recorrência, e é único dentro do projeto. O CUID continua nas rotas e relações. `identificadores-hierarquicos.unit.test.ts` cobre a formatação; `identificadores-hierarquicos.integration.test.ts` cobre geração concorrente e proteção do contador.
- **Testes do filtro:** `filtro-responsavel.integration.test.ts` (origens, homônimos, nulos, composição, inativos, indicador, agenda e perfis negados) e `filtro-responsavel.unit.test.ts` (parâmetros, URL, seleção sem resultado e nome da equipe na tabela/cartão).
- **Rota:** `/tarefas` (e `/tarefa`, que redireciona para ela).
- **Funções:** `listarPrazos` (com `pendentes: false`), `listarTarefasParaFiltro` e o
  componente `src/app/(painel)/filtros-listagens.tsx`.
- **Atraso:** segue o RN-001. O dia do prazo ainda conta como em dia, e o atraso começa no
  dia seguinte, à meia-noite de Brasília (`estaAtrasada`, com o mesmo "hoje" do semáforo:
  `dataDeHojeEmSaoPaulo`, em `src/lib/datas.ts`). Vale também para o "% em dia" e a agenda.
- **Linhas:** linhas brancas, que passam a cinza-papel (`bg-papel`) ao passar o mouse; sem outra cor de fundo.

### T3. Detalhe e edição da tarefa (Administradora)

**Como funciona.**
- **Detalhe:** mostra os dados da tarefa, as subtarefas (com troca de responsável e de
  status) e os comentários.
- **Ações:** a Administradora muda o status, conclui, edita e desativa a tarefa por essa
  tela.
- **Menu de status:** a etiqueta "Status ▾" abre um menu suspenso, que fecha ao escolher
  uma opção, ao clicar fora dele ou ao apertar Esc. O mesmo vale para o status de cada
  subtarefa.

**Detalhes técnicos.**
- **Rotas:** `/tarefas/[id]` e `/tarefas/[id]/editar`.
- **Funções:** `buscarTarefa` (carrega inclusive desativadas), `atualizarTarefa` e
  `atualizarStatusTarefa`.
- **Status possíveis (RF-024):** A iniciar, Em andamento, Aguardando documento do cliente,
  Visita/reunião agendada, Protocolado, Sob análise do órgão ambiental, Com exigência a
  cumprir, Concluído e Cancelado.

### T4. Responsável e atribuição automática (RN-006)

**Como funciona.**
- **Acesso automático:** quando o responsável é uma pessoa do cliente **com acesso ao
  sistema**, ela passa a ver a tarefa sem nenhum passo extra.
- **Troca de responsável:** a pessoa anterior perde esse acesso.
- **Integrante da equipe:** quando o responsável é da equipe, ele também recebe o acesso à
  tarefa.

**Detalhes técnicos.**
- **Registro do acesso:** cria ou remove `Atribuicao` (`entidadeTipo = TAREFA`) na mesma
  transação da criação ou edição. O código está em `sincronizarAtribuicaoAutomatica` e
  `atualizarTarefa`.
- **Teste:** `tarefas-rn006.integration.test.ts`, que cobre pessoa com e sem acesso,
  idempotência e troca para outra pessoa ou para ninguém.

### T5. Recorrência (RF-006, RN-008)

**Como funciona.**
- **Periodicidades:** semanal, mensal, trimestral, semestral ou anual.
- **Próxima ocorrência:** ao concluir uma ocorrência, a próxima é criada automaticamente
  com status "A iniciar", o mesmo responsável e as subtarefas da anterior.
- **Semanal:** repete no dia da semana escolhido em "Repetir em".
- **Demais periodicidades:** repetem no mesmo dia do mês do prazo original. Em mês mais
  curto usa o último dia (31/01 vira 28/02 e depois volta a 31/03).
- **Subtarefas copiadas:** entram apenas as ativas e não canceladas, com status "Em
  andamento" e o prazo deslocado na mesma proporção. **Elas não levam o responsável** e
  aparecem como "sem responsável" na listagem.
- **Encerrar a série:** basta editar a tarefa e escolher "Sem recorrência".

**Detalhes técnicos.**
- **Cálculo da data:** `calcularProximaOcorrencia`, em `src/lib/regras-projetos-tarefas.ts`,
  sempre ancorado em `prazoOriginal`.
- **Criação da ocorrência:** a função SQL `concluir_tarefa` cria a próxima ocorrência na
  mesma transação da conclusão, sem duplicar se já existir uma com a mesma série e o mesmo
  prazo. A versão vigente está em `20260928170000_dia_semana_recorrencia`.
- **Campos da série:** `serieId`, `prazoOriginal`, `periodicidade` e `diaSemana`. Tarefas
  semanais antigas receberam o dia da semana do próprio prazo.
- **Testes:**
  - `projetos-tarefas.unit.test.ts` (RN-008): periodicidades, meses curtos e dia
    escolhido;
  - `projetos-tarefas-a4.integration.test.ts`: "persiste e aplica o dia semanal escolhido
    na próxima ocorrência".

### T6. Concluir tarefa

**Como funciona.**
- **Pedido:** ADMIN_INTERNO e ADMIN_EXTERNO solicitam a conclusão das tarefas pelas quais
  já tinham permissão para concluir. A tarefa mantém o status atual enquanto Talita decide.
- **Decisão:** somente ADMIN pode confirmar ou rejeitar. Rejeitar mantém o status anterior
  e aceita comentário opcional; o solicitante pode retirar seu próprio pedido pendente.
- **Após confirmar:** o status passa a concluído e o colaborador não pode mais editar a
  tarefa. ADMIN continua podendo editar e reabrir.
- **Recorrência:** a próxima ocorrência só é criada depois da confirmação, na mesma
  operação que conclui a tarefa. Pedidos retirados ou rejeitados não criam ocorrências.
- **Histórico:** pedidos, retiradas e decisões ficam registrados; existe no máximo um
  pedido pendente por tarefa. Conclusões existentes antes desta mudança continuam válidas.

**Detalhes técnicos.**
- **Funções:** `solicitarConclusao`, `cancelarSolicitacaoConclusao` e
  `decidirSolicitacaoConclusao` em `src/lib/projetos-tarefas.ts`; `concluir_tarefa` é
  chamada na aprovação e preserva a criação atômica da próxima ocorrência.
- **Permissão:** solicitação e decisão são validadas no servidor e no RLS/SQL; o status da
  tarefa só pode ser alterado diretamente por ADMIN. Solicitações exigem item ativo,
  cliente ativo e vínculo/responsável permitido.
- **Interface:** `/minhas-tarefas/[id]` permite pedir ou retirar; a fila ADMIN fica em
  `/subtarefas`, com atalhos pelas notificações.
- **Testes:**
  - `aprovacao-conclusao.integration.test.ts`: permissões, retirada, rejeição,
    comentário, aprovação e bloqueio pós-aprovação;
  - `projetos-tarefas-a4.integration.test.ts`: recorrência somente após aprovação;
  - `conclusao-actions.unit.test.ts`: ADMIN conclui diretamente e colaboradores solicitam confirmação;
  - migration `fix_concluir_tarefa_nulo`: garante a recusa quando a comparação de
    permissão envolve `NULL`.

### T7. Desativar e reativar (RF-039)

**Como funciona.**
- **Nada é apagado de fato:** a tarefa desativada some das listas e dos cálculos, e pode
  ser reativada pela Administradora.
- **Na tela:** o botão aparece como **"Excluir"** (ver limitações).

**Detalhes técnicos.**
- **Código:** `excluirTarefaAction` → `definirAtivoTarefaAction(id, false)` →
  `definirAtivo` (`src/lib/desativacao.ts`), exclusivo do `ADMIN`.
- **Teste:** `projetos-tarefas-a4.integration.test.ts`, "Administrador exclui tarefa
  apenas de forma lógica e pode restaurá-la".

### T8. Minhas tarefas (colaboradores)

**Como funciona.**
- **Lista:** o colaborador vê, em ordem de prazo, as tarefas em que é responsável, está
  atribuído, ou é responsável por alguma subtarefa.
- **Na tarefa:** ele conclui a tarefa (se tiver permissão), conclui as próprias subtarefas
  e comenta.
- **O que ele vê:** o cliente e o projeto, mas não dados restritos como o valor
  contratado.

**Detalhes técnicos.**
- **Rotas:** `/minhas-tarefas` e `/minhas-tarefas/[id]`.
- **Funções:** `listarTarefasAtribuidas` e `buscarTarefaParaColaborador`, que calcula
  `podeConcluirTarefa` e `podeCriarSubtarefas`.
- **RLS:** migrations `sprint4a_rls_rn007`, `rls_heranca_projetos_tarefas` e
  `acesso_contextual_tarefa`.
- **Visibilidade:** o colaborador interno atribuído ao projeto chega às demais tarefas
  pela tela Meus Projetos.
- **Testes:** `projetos-tarefas-a4.integration.test.ts`, com os três casos de "vê apenas
  o projeto e a tarefa relacionados".

### T9. Aviso de prazo próximo (RF-007)

**Como funciona.**
- **O que dispara:** tarefas que vencem dentro da antecedência configurada geram um aviso
  no sistema e por e-mail.
- **Exclusões:** tarefas concluídas, canceladas ou inativas não geram aviso.
- **Destinatário:** o responsável recebe o aviso. Sem responsável com acesso, o aviso vai
  para a Administradora.
- **Configuração:** a antecedência padrão é de 7 dias e pode ser alterada em
  Notificações. O valor definido na tarefa prevalece; sem valor próprio, aplica-se o
  padrão global.

**Detalhes técnicos.**
- **Código:** `dispararPrazoProximo` (`src/lib/notificacoes.ts`), exposto em
  `GET /api/jobs/notificacoes-prazo`. Exige `Authorization: Bearer $CRON_SECRET`.
- **Deduplicação:** um aviso por tarefa, dia e destinatário; cobre e-mail e in-app.
- **Execução:** endpoint autenticado por `CRON_SECRET`; procedimento diário às 08:00
  (horário de Brasília) em `ops/README.md`. A página `/notificacoes` mostra tentativas e
  contagens do último sucesso.
- **Situação atual:** código pronto; ativação manual do cron na VPS pendente.

### T10. Permitir que o responsável crie subtarefas

**Como funciona.** Ao criar a tarefa, a Administradora pode permitir que o responsável
crie subtarefas. A subtarefa criada pelo colaborador fica atribuída a ele mesmo, com
registro de quem criou e quando.

**Detalhes técnicos.**
- **Campo:** `colaboradorPodeCriarSubtarefas`.
- **Regra:** está em `criarSubtarefa`.
- **Teste:** `colaborador-cria-subtarefas.integration.test.ts`, que cobre a permissão
  concedida, a permissão negada e outro colaborador. O colaborador cria pela rota
  `/minhas-tarefas/[id]/subtarefas/nova`.

---

### T11. Semáforo de prazo

**Como funciona.** A lista administrativa, as telas de tarefas atribuídas e os detalhes mostram as cores de prazo do semáforo global: vermelho só para prazo vencido (caixa vermelha sólida com texto branco), âmbar do dia do prazo até o limite configurado (padrão 5 dias) e verde acima dele. O cálculo usa dias corridos, incluindo fins de semana e feriados. Concluído permanece verde, cancelado fica cinza e sem prazo sem cor.

**Detalhes técnicos.** `IndicadorSemaforoProjeto` recebe `LimitesSemaforo` carregados por `buscarLimitesSemaforo`; configuração singleton em `configuracoes_semaforo`, editável pelo ADMIN na página de notificações. Testes: `indicador-dias-restantes.unit.test.ts` e `semaforo-rf009.integration.test.ts`.

### T12. Horários de criação e avisos em Brasília

**Como funciona.** A identificação de criação das tarefas e subtarefas continua mostrando Brasília, agora pelo padrão compartilhado. Avisos de prazo usam o dia de Brasília, inclusive entre 21h e meia-noite.

**Detalhes técnicos.** `/tarefas/[id]` e `/minhas-tarefas/[id]` usam `formatarDataHoraBrasilia`; `dispararPrazoProximo` ancora janela e deduplicação em `dataDeHojeEmSaoPaulo`. Cobertura em `datas.unit.test.ts` e `notificacoes-rf022.integration.test.ts`.

## Limitações e pendências conhecidas

| # | Situação | Efeito |
|---|---|---|
| L1 | O código do job e o script de cron estão prontos, mas a linha ainda precisa ser instalada na VPS pelo usuário. | Avisos não serão enviados automaticamente até ativar o cron e confirmar a primeira execução. |
| L3 | O botão de desativação diz "Excluir", mas a ação é reversível. | O rótulo contradiz o RF-039 ("desativar", nunca excluir). |
| L4 | A listagem `/tarefas` só mostra tarefas ativas e não tem "Mostrar desativadas" (RF-039). | Uma tarefa desativada só é encontrada pela URL direta, então na prática não dá para reativá-la pela interface. |
| L5 | Subtarefas copiadas na recorrência não levam o responsável. | Não se sabe se é intencional. **Confirmar com a Administradora.** |
| L6 | O campo `serieEncerradaEm` existe, mas nenhuma tela o preenche. | Encerrar uma série é feito removendo a recorrência na edição. |

## Histórico de alterações

| Data | Commit | Alteração |
|---|---|---|
| 2026-10-29 | este commit | Manter o aviso durante a rolagem e remover o degradê sobre a tabela |
| 2026-10-29 | este commit | Indicar a rolagem horizontal disponível na tabela de tarefas |
| 2026-10-29 | este commit | Corrigir quebra dos IDs na tabela e preservar o código completo nos cartões móveis |
| 2026-10-29 | este commit | Adicionar coluna ID hierárquica em `/tarefas`, sequência local por projeto e exibição no detalhe/portal ([análise](../analises/ids-hierarquicos-projeto-tarefa-subtarefa.md)) |
| 2026-10-27 | este commit | Explicar regras, rotas, testes e operações do código em português do Brasil ([guia](../codigo/README.md), [análise](../analises/documentacao-codigo-portugues.md)) |
| 2026-10-22 | este commit | Solicitação de conclusão por colaboradores e confirmação/rejeição ADMIN; recorrência somente após aprovação ([análise](../analises/aprovacao-conclusao-tarefas-subtarefas.md)) |
| 2026-10-20 | este commit | Coluna de subtarefas concluídas/total nas tarefas filtradas por responsável, excluindo canceladas/desativadas ([análise](../analises/progresso-subtarefas-tarefas-filtradas.md)) |
| 2026-10-19 | este commit | Filtro por responsável, combinado com os filtros existentes, com opção sem responsável e nome da equipe em tarefas ([análise](../analises/filtro-responsavel-tarefas-subtarefas.md)) |
| 2026-10-16 | este commit | Menus de status (tarefa e subtarefa) fecham ao escolher uma opção, ao clicar fora ou ao apertar Esc |
| 2026-10-16 | `348405d` | Responsável ganha coluna própria na tabela de `/tarefas` (antes vinha ao lado do nome); no celular, linha "Responsável:" no cartão |
| 2026-10-15 | `9b5195d` | Linhas da tabela voltam a ter destaque ao passar o mouse, em cinza-papel sobre fundo branco (sem verde e sem cor de estado) |
| 2026-10-15 | `75498a1` | Atraso passa a virar à meia-noite de Brasília, igual ao semáforo, também no "% em dia"; linhas de `/tarefas` sem fundo ao passar o mouse ([análise](../analises/atraso-fuso-e-lista-subtarefas-sem-fundo.md)) |
| 2026-10-15 | `9f3a725` | Semáforo: vermelho só para prazo vencido, âmbar até o limite configurável (padrão 5 dias) e cancelado em cinza ([análise](../analises/semaforo-vermelho-so-atrasado.md)) |
| 2026-10-15 | `035aa9a` | Semáforo passa a contar dias corridos ([análise](../analises/semaforo-dias-corridos.md)) |
| 2026-10-14 | `035aa9a` | Destacar prazos vencidos com caixa vermelha sólida e texto branco |
| 2026-10-02 | `b81feaf` | Percentual de conclusão exclui tarefas/subtarefas canceladas e desativadas; progresso de tarefa aparece também no portal ([análise](../analises/area-exclusiva-cliente-sprint-6.md)) |
| 2026-10-01 | `2154bb3` | Aplicar antecedência por tarefa, preservar exclusão de canceladas e preparar agendador/observabilidade ([análise](../analises/agendador-avisos-prazo.md)) |
| 2026-10-01 | 83f7524 | Avisos de prazo excluem tarefas canceladas ([análise](../analises/notificacao-comentario-com-acesso.md)) |
| 2026-09-29 | `f2ebb80` | Semáforo configurável compartilhado entre projetos, tarefas e subtarefas ([análise](../analises/semaforo-prazos-projetos-tarefas.md)) |
| 2026-09-16 | `26160cf` | Desativar o cliente passa a esconder projetos, tarefas e subtarefas dos colaboradores |
| 2026-09-17 | `6342b73`, `579cdd3`, `fe0ad63`, `47df249`, `4ec8adf`, `5522d07` | Sprint 4A: cadastro, RLS, recorrência, "% em dia", telas da Administradora e dos colaboradores |
| 2026-09-18 | `13bb3ba` | Integrante da equipe pode ser o responsável da tarefa |
| 2026-09-18 | `347065c` | Exclusão lógica (desativação) de tarefas |
| 2026-09-18 | `ab65484` | Colaborador vê a tarefa quando é responsável só por uma subtarefa |
| 2026-09-18 | `a6fe875` | Acesso contextual limitado à tarefa e à subtarefa |
| 2026-09-25 | `3b4a259`, `06bdbfc` | Filtros por cliente e projeto, aplicados automaticamente e dependentes |
| 2026-09-28 | `9066c72`, `5f6a3b4` | Responsável pode criar subtarefas quando a Administradora permitir |
| 2026-09-28 | `e894321` | Recorrência copia as subtarefas para a próxima ocorrência |
| 2026-09-28 | `57942e8` | Conclusão recusa corretamente quando a checagem de permissão envolve `NULL` |
| 2026-09-28 | `9969bff` | Escolha do dia da semana na recorrência semanal |
| 2026-09-29 | `d731f79` | O botão de desativação e as tarefas atrasadas na agenda voltam a aparecer em vermelho terra (correção de cores inexistentes) |
| 2026-10-20 | este commit | Padronizar horários e referência de dia em Brasília ([análise](../analises/padronizacao-horarios-brasilia.md)) |
