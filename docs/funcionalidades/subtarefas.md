# Subtarefas e etiquetas

- **Última revisão:** 2026-09-29, no commit `fe1b5b4` do `staging`.
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
| Concluir | Qualquer uma | Só as próprias | Só as próprias | Não |
| Ver o painel `/subtarefas` | Sim | Não | Não | Não |
| Gerenciar o catálogo de etiquetas | Sim | Não | Não | Não |

Ter acesso à tarefa ou ao projeto **não** dá direito a concluir a subtarefa de outra
pessoa (RN-004).

---

## Funcionalidades

### S1. Criar e editar subtarefa

**Como funciona.**
- **Onde:** na tela da tarefa, em "Nova subtarefa".
- **Campos:** título, descrição, prazo de conclusão (opcional), status, responsável e
  etiquetas.
- **Responsável:** alguém da "Equipe Múltiplus" ou uma das "Pessoas envolvidas" do
  cliente.
- **Criação pelo colaborador:** quando o colaborador cria a subtarefa (ver T10 em
  `tarefas.md`), ele próprio fica como responsável.
- **Auditoria:** fica registrado quem criou e quando.

**Detalhes técnicos.**
- **Rotas:** `/tarefas/[id]/subtarefas/nova` e
  `/tarefas/[id]/subtarefas/[subtarefaId]/editar`.
- **Funções:** `criarSubtarefa` e `atualizarSubtarefa`, em `src/lib/projetos-tarefas.ts`.
- **Responsável:** `validarResponsavelSubtarefa` exige **exatamente um** responsável. Ele
  pode ser uma pessoa ativa do cliente da tarefa ou um usuário ativo da equipe.
- **Testes:**
  - `projetos-tarefas-a4.integration.test.ts`: "Administrador cria subtarefa…" e
    "recusa responsável de subtarefa ausente ou que não pertence ao cliente";
  - `colaborador-cria-subtarefas.integration.test.ts`.

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
- **Quem conclui:** o responsável conclui a própria subtarefa, e a Administradora conclui
  qualquer uma.
- **O que o colaborador não pode:** editar, reabrir ou cancelar.

**Detalhes técnicos.**
- **Funções:** `concluirSubtarefa` e `atualizarStatusSubtarefa`. Status diferente de
  concluído é exclusivo do `ADMIN`.
- **Banco:** uma trigger confere o responsável, de modo que o acesso ao projeto ou à
  tarefa não basta.
- **Teste:** `subtarefas-rn004.integration.test.ts`, com 10 casos, incluindo o
  colaborador interno dono do projeto sendo barrado.

### S4. Painel de subtarefas (RF-037)

**Como funciona.**
- **Conteúdo:** lista as subtarefas de todos os projetos, ordenadas por prazo.
- **Destaques:** as atrasadas aparecem em vermelho terra, e o indicador "Em dia" mostra
  o percentual no prazo.
- **Filtros:** por cliente, projeto e tarefa. Por padrão, mostra só as pendentes, e
  "Mostrar concluídas e canceladas" inclui o resto.
- **Link antigo:** a rota antiga `/prazos` redireciona para cá.

**Detalhes técnicos.**
- **Rota:** `/subtarefas`, que é a tela inicial do `ADMIN`.
- **Funções:** `listarSubtarefasPrazos` e `indicadorDePrazosSubtarefas`.
- **Regras de prazo:**
  - atraso segue o RN-001, em que o dia do prazo ainda conta como em dia;
  - desativadas saem do percentual (RF-009).
- **Testes:**
  - `projetos-tarefas.unit.test.ts`: RN-001 e RF-009;
  - `identidade-visual-tokens.unit.test.ts`: garante que a cor de atraso exista.

### S5. Etiquetas nas subtarefas (RF-025)

**Como funciona.**
- **Uso:** cada subtarefa pode ter várias etiquetas coloridas, escolhidas de um catálogo
  único para todo o sistema.
- **Etiqueta nova:** ao marcar uma subtarefa, dá para criar uma etiqueta ali mesmo,
  escolhendo uma das 12 cores (Azul, Ciano, Verde, Lima, Amarelo, Âmbar, Laranja,
  Vermelho, Rosa, Roxo, Índigo, Cinza).

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

**Como funciona.** Subtarefas exibem o mesmo indicador global de prazo que projetos e tarefas nas listas e nos detalhes. Nas listas, o indicador de atraso já informa que o prazo passou; não há um segundo rótulo “Atrasada” na mesma coluna. Os limites são configurados pelo ADMIN em `/notificacoes`; a contagem exclui fins de semana. Concluída permanece verde, cancelada vermelha e sem prazo sem cor.

**Detalhes técnicos.** Reutiliza `IndicadorSemaforoProjeto` e `buscarLimitesSemaforo`. A lista respeita os filtros e o acesso já existentes. Testes unitários e de integração em `indicador-dias-restantes.unit.test.ts` e `semaforo-rf009.integration.test.ts`.

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
