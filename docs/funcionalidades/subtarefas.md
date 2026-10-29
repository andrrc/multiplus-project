# Subtarefas e etiquetas

- **Última revisão:** 2026-10-29.
- **Requisitos:** RF-008, RF-009, RF-021, RF-025, RF-037, RF-039; RN-001, RN-004.
- **Módulos relacionados:** Tarefas, Projetos, Comentários.

## Visão geral

Uma **subtarefa** é um passo menor dentro de uma tarefa, como "Coletar assinatura do
responsável legal". Cada subtarefa tem título, prazo opcional, status (Em andamento,
Concluída ou Cancelada), um responsável e etiquetas coloridas para organização.

A tela **Subtarefas** é o painel de acompanhamento da Administradora e também a tela
inicial dela ao entrar no sistema.

## Quem pode fazer o quê

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Criar subtarefa | Sim | Só na tarefa em que é responsável, se a Administradora permitiu | Idem | Não |
| Editar, trocar o responsável, cancelar ou reabrir | Sim | Não | Não | Não |
| Solicitar conclusão | Qualquer uma (confirma diretamente) | Só as próprias | Só as próprias | Não |
| Confirmar ou rejeitar pedido | Sim | Não | Não | Não |
| Ver o painel `/subtarefas` | Sim | Não | Não | Não |
| Gerenciar o catálogo de etiquetas | Sim | Não | Não | Não |

Ter acesso à tarefa ou ao projeto **não** dá direito a concluir a subtarefa de outra
pessoa (RN-004).

---

## Funcionalidades

### S1. Criar e editar subtarefa

**Como funciona.**
- **Onde:** na tela da tarefa, em "Nova subtarefa". Para editar, cada subtarefa ativa tem um
  botão "Editar" na própria linha da lista, sem precisar abrir os detalhes.
- **Status nos detalhes:** a etiqueta "Status ▾" abre um menu suspenso (antes era uma
  fileira de botões), que fecha ao escolher uma opção, ao clicar fora ou ao apertar Esc.
- **Campos:** título, descrição, prazo de conclusão (opcional), status, responsável e
  etiquetas.
- **Responsável:** alguém da "Equipe Múltiplus" ou uma das "Pessoas envolvidas" do
  cliente.
- **Criação pelo colaborador:** quando o colaborador cria a subtarefa (ver T10 em
  `tarefas.md`), ele próprio fica como responsável e o status inicial é Em andamento;
  o formulário não permite escolher responsável ou status.
- **Auditoria:** fica registrado quem criou e quando.

**Detalhes técnicos.**
- **Rotas:** ADMIN usa `/tarefas/[id]/subtarefas/nova`; colaborador autorizado usa
  `/minhas-tarefas/[id]/subtarefas/nova`. Edição fica em
  `/tarefas/[id]/subtarefas/[subtarefaId]/editar`.
- **Funções:** `criarSubtarefa` e `atualizarSubtarefa`, em `src/lib/projetos-tarefas.ts`.
- **Responsável:** `validarResponsavelSubtarefa` exige **exatamente um** responsável. Ele
  pode ser uma pessoa ativa do cliente da tarefa ou um usuário ativo da equipe.
- A rota administrativa `/tarefas/[id]/subtarefas/nova` é exclusiva do `ADMIN`; o
  colaborador autorizado usa `/minhas-tarefas/[id]/subtarefas/nova`. A função
  `criarSubtarefa` define servidor-side o colaborador como responsável e inicia a
  subtarefa em `EM_ANDAMENTO`, mesmo se a requisição tentar enviar outros valores.
- **Testes:**
  - `projetos-tarefas-a4.integration.test.ts`: "Administrador cria subtarefa…" e
    "recusa responsável de subtarefa ausente ou que não pertence ao cliente";
  - `colaborador-cria-subtarefas.integration.test.ts`: permissão de criação, auditoria,
    responsável/status forjados e negação a colaborador sem acesso.

### S2. Responsável da subtarefa

**Como funciona.**
- **Troca rápida:** a Administradora troca o responsável direto na lista de subtarefas da
  tarefa.
- **Aviso de pendência:** quando há subtarefas sem responsável, a tela da tarefa mostra
  um aviso com um link para a primeira delas.
- **Acesso do responsável:** quem é responsável por uma subtarefa passa a ver a tarefa, o
  projeto e o cliente relacionados, e só isso.

**Detalhes técnicos.**
- **Funções:** `atualizarResponsavelSubtarefa` e `atualizarResponsavelSubtarefaFormAction`.
- **Testes:** `projetos-tarefas-a4.integration.test.ts`, com os casos "ao trocar o
  responsável…" e "responsável por subtarefa vê o cliente e projeto relacionados…".

### S3. Concluir subtarefa (RF-021, RN-004)

**Como funciona.**
- **Pedido:** o responsável solicita a conclusão da própria subtarefa. O status permanece
  “Em andamento” até a confirmação. O solicitante pode retirar o pedido enquanto estiver
  pendente.
- **Decisão:** somente ADMIN confirma ou rejeita; a rejeição preserva o status anterior e
  pode incluir comentário. A confirmação muda para “Concluída” e bloqueia edições do
  colaborador. ADMIN continua podendo editar ou reabrir.
- **O que o colaborador não pode:** editar, reabrir ou cancelar a subtarefa.

**Detalhes técnicos.**
- **Funções:** `solicitarConclusao`, `cancelarSolicitacaoConclusao` e
  `decidirSolicitacaoConclusao` em `src/lib/projetos-tarefas.ts`.
- **Banco:** função SQL valida vínculo/responsável, status ativo e perfil; RLS e trigger
  impedem conclusão ou edição direta pelo colaborador. Há no máximo um pedido pendente por
  item e o histórico é preservado.
- **Fila:** ADMIN revisa todos os pedidos pendentes no topo do painel `/subtarefas`; os
  links das notificações também abrem a fila.
- **Testes:** `aprovacao-conclusao.integration.test.ts` e
  `subtarefas-rn004.integration.test.ts`, incluindo o colaborador interno dono do projeto
  sendo barrado.

### S4. Painel de subtarefas (RF-037)

**Como funciona.**
- **Conteúdo:** lista as subtarefas de todos os projetos, ordenadas por prazo.
- **Destaques:** linhas brancas, que passam a cinza-papel (`bg-papel`) ao passar o mouse, sem outra cor de fundo,
  nem quando a subtarefa está atrasada. O atraso aparece no
  semáforo ("Atrasado N dias", em vermelho) e na etiqueta de status. O indicador "Em dia"
  mostra o percentual no prazo somente dos registros encontrados pelos filtros. No celular, os cartões são brancos com borda esquerda azul.
- **ID:** a tabela de `/subtarefas` ganha uma coluna **ID** com o caminho completo cliente/projeto/tarefa/subtarefa; o cartão móvel mostra o mesmo código junto ao título.
- **Quando atrasa:** o dia do prazo ainda conta como em dia; o atraso começa à meia-noite de
  Brasília, o mesmo horário em que o semáforo muda.
- **Filtros:** por cliente, projeto, tarefa e responsável. O responsável pode ser pessoa envolvida ou integrante da equipe; "Sem responsável" encontra registros sem nenhum dos dois vínculos. A seleção é aplicada automaticamente e permanece na URL. O filtro considera o responsável direto da subtarefa, independentemente do responsável da tarefa pai. Ao trocar outro filtro, o responsável é preservado; uma combinação incompatível mostra lista vazia e pode ser limpa em "Todos os responsáveis". Por padrão, mostra só as pendentes, e
  "Mostrar concluídas e canceladas" inclui o resto.
- **Link antigo:** a rota antiga `/prazos` redireciona para cá.

**Detalhes técnicos.**
- **Filtro por responsável (RF-005/RF-037):** `responsavel=pessoa:<id>`, `usuario:<id>` ou `sem`; validado e aplicado no servidor em `listarPrazos`/`listarSubtarefasPrazos`. Parâmetro inválido mostra aviso e resultado vazio. `listarResponsaveisParaFiltro` exige ADMIN e retorna apenas valor e rótulo, com origem e cliente para distinguir pessoas envolvidas. Opções consideram os demais filtros e o toggle, incluem responsáveis inativos ainda vinculados a registros elegíveis e não expõem dados de contato. A agenda continua sem esse filtro.
- **Testes do filtro:** `filtro-responsavel.integration.test.ts` (origens, homônimos, nulos, composição, inativos, indicador, agenda e perfis negados) e `filtro-responsavel.unit.test.ts` (parâmetros, URL, seleção sem resultado e nome da equipe na tabela/cartão).
- **Rota:** `/subtarefas`, que é a tela inicial do `ADMIN`.
- **Funções:** `listarSubtarefasPrazos` e `indicadorDePrazosSubtarefas`.
- **Regras de prazo:**
  - atraso segue o RN-001, em que o dia do prazo ainda conta como em dia;
  - desativadas saem do percentual (RF-009).
- **Testes:**
  - `projetos-tarefas.unit.test.ts`: RN-001 e RF-009;
  - `identidade-visual-tokens.unit.test.ts`: garante que a cor de atraso exista.
- **Identificador:** `numeroLocal` é atribuído pelo banco em toda criação, inclusive nas subtarefas copiadas para recorrências, e é único dentro da tarefa. O CUID continua como chave técnica. A formatação e alocação estão cobertas por `identificadores-hierarquicos.unit.test.ts` e `identificadores-hierarquicos.integration.test.ts`.

### S5. Etiquetas nas subtarefas (RF-025)

**Como funciona.**
- **Uso:** cada subtarefa pode ter várias etiquetas coloridas, escolhidas de um catálogo
  único para todo o sistema.
- **Etiqueta nova:** ao marcar uma subtarefa, dá para criar uma etiqueta ali mesmo,
  escolhendo uma das 12 cores (Azul, Ciano, Verde, Lima, Amarelo, Âmbar, Laranja,
  Vermelho, Rosa, Roxo, Índigo, Cinza).
- **Painel "Adicionar etiqueta":** continua aberto enquanto se escolhem várias etiquetas
  e fecha ao clicar fora dele, ao apertar Esc ou em "Fechar etiquetas".

**Detalhes técnicos.**
- **Função:** `salvarEtiquetasSubtarefa` (`src/lib/etiquetas.ts`).
- **Validação:** nomes de 1 a 40 caracteres, únicos sem diferenciar maiúsculas e
  minúsculas.
- **Armazenamento:** a subtarefa guarda os **nomes** das etiquetas (`String[]`), não uma
  referência ao catálogo.
- **Cores:** as cores válidas estão em `src/lib/etiqueta-colors.ts`. Cores gravadas por
  versões anteriores continuam aceitas.

### S6. Catálogo de etiquetas

**Como funciona.**
- **Tela:** a Administradora cria, renomeia, troca a cor e exclui etiquetas em
  **Etiquetas**. A tela mostra em quantas subtarefas cada uma é usada.
- **Renomear e excluir:** renomear atualiza todas as subtarefas que a usam, e excluir
  remove a etiqueta de todas elas.

**Detalhes técnicos.**
- **Rota:** `/etiquetas`.
- **Funções:** `criarEtiquetaGerenciada`, `atualizarEtiquetaGerenciada` e
  `excluirEtiquetaGerenciada`. Renomear e excluir usam `array_replace` e `array_remove`
  em `subtarefas.etiquetas`, na mesma transação.
- **Testes:**
  - `projetos-tarefas-a4.integration.test.ts`: "Talita renomeia e exclui etiqueta com
    propagação…";
  - `administracao-acesso.unit.test.ts`: "o catálogo de etiquetas é exclusivo do
    Administrador".

### S7. Replicação na recorrência

Descrita em `tarefas.md`, na seção T5. Ao concluir uma tarefa recorrente, as subtarefas
ativas e não canceladas são copiadas para a próxima ocorrência.

---

### S5. Semáforo de prazo

**Como funciona.** Subtarefas exibem o mesmo indicador global de prazo que projetos e tarefas nas listas e nos detalhes. Nas listas, o indicador de atraso já informa que o prazo passou; não há um segundo rótulo “Atrasada” na mesma coluna. O atraso aparece numa caixa vermelha sólida com texto branco. O vermelho é só para prazo vencido; do dia do prazo até o limite configurado pelo ADMIN em `/notificacoes` (padrão 5 dias), âmbar; a contagem é em dias corridos, incluindo fins de semana. Concluída permanece verde, cancelada fica cinza e sem prazo sem cor.

**Detalhes técnicos.** Reutiliza `IndicadorSemaforoProjeto` e `buscarLimitesSemaforo`. A lista respeita os filtros e o acesso já existentes. Testes unitários e de integração em `indicador-dias-restantes.unit.test.ts` e `semaforo-rf009.integration.test.ts`.

### S9. Horários de criação e comentários em Brasília

**Como funciona.** A identificação de criação e o horário dos comentários usam Brasília nas visões da equipe. O prazo da subtarefa continua na data cadastrada.

**Detalhes técnicos.** As telas de detalhe de tarefa e o componente `Comentarios` usam `formatarDataHoraBrasilia`. Sem alteração de schema, prazo ou acesso. Cobertura da formatação e dos fusos em `datas.unit.test.ts`.

## Limitações e pendências conhecidas

| # | Situação | Efeito |
|---|---|---|
| L1 | Subtarefas copiadas pela recorrência ficam **sem responsável**, embora a regra de criação exija exatamente um. | Aparecem no aviso "sem responsável" da tarefa. **Confirmar com a Administradora** se é intencional. |
| L2 | A tela de edição oferece "Sem responsável", mas o servidor recusa salvar sem responsável. | A pessoa escolhe a opção e recebe erro. |
| L3 | Existe a ação de desativar subtarefa (`definirAtivoSubtarefaAction`), mas nenhuma tela a usa (RF-039). | Na prática só dá para **cancelar** a subtarefa, não desativá-la. |
| L4 | As etiquetas são gravadas por nome na subtarefa. | Consistência depende da propagação ao renomear e excluir. Uma alteração direta no banco pode deixar nomes órfãos. |

## Histórico de alterações

| Data | Commit | Alteração |
|---|---|---|
| 2026-10-29 | este commit | Adicionar coluna ID hierárquica em `/subtarefas`, com sequência local por tarefa e códigos nos detalhes ([análise](../analises/ids-hierarquicos-projeto-tarefa-subtarefa.md)) |
| 2026-10-27 | este commit | Explicar regras, acessos e interface de subtarefas e etiquetas no código ([guia](../codigo/README.md), [análise](../analises/documentacao-codigo-portugues.md)) |
| 2026-10-23 | este commit | Separar a rota de criação de subtarefa do colaborador e manter a rota administrativa exclusiva do ADMIN ([análise](../analises/guarda-clientes-subtarefa-colaborador-links-email.md)) |
| 2026-10-22 | este commit | Solicitação de conclusão pelo responsável, fila ADMIN, retirada, rejeição e bloqueio após aprovação ([análise](../analises/aprovacao-conclusao-tarefas-subtarefas.md)) |
| 2026-10-19 | este commit | Filtro por responsável, combinado com os filtros existentes, com opção sem responsável e nome da equipe em tarefas ([análise](../analises/filtro-responsavel-tarefas-subtarefas.md)) |
| 2026-10-16 | este commit | Painel "Adicionar etiqueta" fecha ao clicar fora ou ao apertar Esc |
| 2026-10-16 | `fc53ae2` | Status da subtarefa nos detalhes vira menu suspenso, que fecha ao escolher, ao clicar fora ou ao apertar Esc |
| 2026-10-15 | `7218e25` | Botão "Editar" na linha de cada subtarefa ativa, na lista do detalhe da tarefa |
| 2026-10-15 | `9b5195d` | Linhas da tabela voltam a ter destaque ao passar o mouse, em cinza-papel sobre fundo branco (sem verde e sem cor de estado) |
| 2026-10-15 | `75498a1` | Lista sem cor de fundo nas linhas (inclusive atrasadas) e sem borda vermelha; atraso passa a virar à meia-noite de Brasília, igual ao semáforo ([análise](../analises/atraso-fuso-e-lista-subtarefas-sem-fundo.md)) |
| 2026-10-15 | `9f3a725` | Semáforo: vermelho só para prazo vencido, âmbar até o limite configurável (padrão 5 dias) e cancelado em cinza ([análise](../analises/semaforo-vermelho-so-atrasado.md)) |
| 2026-10-15 | `035aa9a` | Semáforo passa a contar dias corridos ([análise](../analises/semaforo-dias-corridos.md)) |
| 2026-10-14 | `035aa9a` | Destacar prazos vencidos com caixa vermelha sólida e texto branco |
| 2026-09-29 | `86bb070` | Remover o rótulo de atraso duplicado na coluna de prazo, mantendo o semáforo como único indicador |
| 2026-09-29 | `f2ebb80` | Semáforo configurável compartilhado entre projetos, tarefas e subtarefas ([análise](../analises/semaforo-prazos-projetos-tarefas.md)) |
| 2026-09-17 | `a79a2a8` | Painel de prazos (Sprint 4A) |
| 2026-09-18 | `25b1e67`, `60b0fb7` | Atribuição de responsável a subtarefas |
| 2026-09-18 | `ac5ce5f` | Integrante da equipe pode ser o responsável da subtarefa |
| 2026-09-18 | `ab65484` | Responsável só por subtarefa passa a ver a tarefa |
| 2026-09-25 | `c907c9d` | Subtarefas completas: descrição, prazo, status e etiquetas |
| 2026-09-25 | `0956cdf` | Painel de Prazos passa a ser o painel de Subtarefas |
| 2026-09-25 | `3b4a259`, `06bdbfc` | Filtros dependentes por cliente, projeto e tarefa |
| 2026-09-28 | `9066c72`, `5f6a3b4` | Colaborador responsável pode criar subtarefas, com permissão da tarefa |
| 2026-09-28 | `e894321` | Subtarefas copiadas para a próxima ocorrência da tarefa recorrente |
| 2026-09-28 | `321a4e8`, `d5b749b` | Etiquetas coloridas reutilizáveis e edição de etiquetas |
| 2026-09-28 | `0cb869e`, `e5722af` | Catálogo global de etiquetas |
| 2026-09-28 | `c297878`, `0062cb6`, `d65f10e` | Paleta de 12 cores. O ajuste de tons quebrou um teste, e as cores antigas voltaram a ser aceitas |
| 2026-09-30 | `8aa5ba1` | RF-037 formalizado no SRS v2.5 para o Painel de Subtarefas |
| 2026-09-29 | `d731f79` | Subtarefas atrasadas voltam a aparecer em vermelho terra |
| 2026-10-02 | `b81feaf` | CLIENTE não consulta diretamente conteúdo de subtarefas; o portal recebe apenas contagem agregada protegida por RLS ([análise](../analises/area-exclusiva-cliente-sprint-6.md)) |
| 2026-10-20 | este commit | Padronizar horários e referência de dia em Brasília ([análise](../analises/padronizacao-horarios-brasilia.md)) |
