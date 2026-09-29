# Projetos

- **Última revisão:** 2026-09-29, no commit `fe1b5b4` do `staging`.
- **Requisitos:** RF-004, RF-009, RF-013, RF-016, RF-018, RF-020, RF-024, RF-038, RF-039.
- **Módulos relacionados:** Clientes, Tarefas, Comentários.

## Visão geral

Um **projeto** é um serviço contratado por um cliente, como "Renovação da LO 2026". Um
cliente pode ter vários projetos (RF-004), e cada projeto reúne tarefas, documentos (links
do Drive) e comentários.

Os campos de um projeto são:
- número da proposta comercial;
- valor contratado;
- data de início e conclusão prevista;
- status: A iniciar, Em andamento, Concluído ou Cancelado.

O **semáforo** mostra quantos dias úteis faltam para a conclusão prevista.

## Quem pode fazer o quê

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Criar, editar, mudar o status, desativar e reativar | Sim | Não | Não | Não |
| Ver todos os projetos (`/projetos`) | Sim | Não | Não | Não |
| Ver os próprios projetos (`/meus-projetos`) | — | Os atribuídos a ele e os que contêm tarefas dele | Os que contêm tarefas ou subtarefas dele | Não |
| Ver o **valor contratado** | Sim | **Não** (bloqueado no banco) | **Não** | Não |
| Vincular documento ao projeto | Sim | Não | Não | Não |

---

## Funcionalidades

### P1. Criar e editar projeto (RF-038)

**Como funciona.**
- **Campos:** a Administradora informa cliente, nome, proposta comercial (número e ano,
  por exemplo `109/2026`), descrição, datas, status e valor contratado.
- **Atalho pelo cliente:** ao criar um projeto a partir da ficha do cliente, o cliente já
  vem selecionado.

**Detalhes técnicos.**
- **Rotas:** `/projetos/novo` (aceita `?clienteId=`) e `/projetos/[id]/editar`.
- **Funções:** `criarProjeto` e `atualizarProjeto` (`src/lib/projetos-tarefas.ts`).
- **Validações:**
  - a conclusão prevista não pode ser anterior ao início;
  - a proposta é montada por `montarNumeroProposta` (`src/lib/numero-proposta.ts`), que
    exige número e ano de 4 dígitos, ou nenhum dos dois.
- **Valor contratado:** fica numa tabela separada (`ValorProjeto`), com RLS próprio.
- **Testes:**
  - `numero-proposta.unit.test.ts`;
  - `projetos-tarefas-a4.integration.test.ts`: "Administrador cria projeto…" e "mantém o
    valor contratado inacessível a colaboradores no banco".

### P2. Listar projetos (Administradora)

**Como funciona.**
- **Colunas:** projeto, cliente (com link para a ficha), proposta, valor, prazo final,
  **Dias restantes** e status.
- **Busca:** por projeto ou cliente.
- **Desativados:** "Mostrar desativados" inclui os projetos desativados.

**Detalhes técnicos.**
- **Rota:** `/projetos`.
- **Função:** `listarProjetos(ctx, incluirDesativados, busca)`.
- **Celular:** a tabela vira lista de cartões.

### P3. Dias restantes e semáforo do prazo

**Como funciona.**
- **O que mostra:** o número de **dias úteis** (segunda a sexta) até a conclusão prevista.
  Feriados contam como dia normal.
- **Cores:** vermelho terra até 5 dias úteis, âmbar de 6 a 10 e verde acima de 10.
- **Situações especiais:** prazo vencido mostra o atraso em dias úteis. Prazo hoje ou no
  fim de semana tem rótulo próprio.
- **Projetos sem contagem:** sem prazo, concluídos, cancelados ou desativados aparecem
  identificados por texto.
- **Nomes na interface:** na listagem, a coluna se chama "Dias restantes". No detalhe e em
  Meus Projetos, o nome é "Semáforo do prazo".

**Detalhes técnicos.**
- **Componente e cálculo:** `IndicadorSemaforoProjeto` e `calcularDiasUteisRestantes`
  (`src/ui/indicador-dias-restantes.tsx`).
- **Teste:** `indicador-dias-restantes.unit.test.ts`, que cobre cores, hoje, fim de
  semana, atraso e rótulos.

### P4. Detalhe do projeto

**Como funciona.**
- **Painel:** mostra valor contratado, janela do projeto (início e conclusão), semáforo,
  tarefas concluídas e status. O status pode ser trocado ali mesmo.
- **Seções:** lista de tarefas (com troca de status), documentos do projeto e comentários.

**Detalhes técnicos.**
- **Rota:** `/projetos/[id]`.
- **Funções:** `buscarProjeto`, `alterarStatusProjetoAction` e
  `criarDocumentoProjetoAction`.

### P5. Documentos do projeto (RF-013)

**Como funciona.**
- **O que é:** a Administradora vincula links (Google Drive) com um nome ao projeto. Não
  há upload de arquivo.
- **Onde aparecem:** na tela do projeto e, para os colaboradores, junto com os documentos
  gerais do cliente.

**Detalhes técnicos.**
- **Função:** `criarDocumentoProjeto`, que confere se o projeto pertence ao cliente
  informado.
- **Teste:** `projetos-tarefas-a4.integration.test.ts`, "Administrador cria subtarefa e
  documento vinculado ao projeto".

### P6. Meus projetos (colaboradores)

**Como funciona.**
- **Lista:** o colaborador vê os projetos em que atua, com cliente, tarefas e semáforo.
- **No projeto:** as tarefas visíveis para ele e os documentos do projeto e do cliente.
  O valor contratado **não** aparece.

**Detalhes técnicos.**
- **Rotas:** `/meus-projetos` e `/meus-projetos/[id]`.
- **Funções:** `listarProjetosAtribuidos` e `buscarProjetoAtribuido`. A visibilidade das
  tarefas é limitada pelo RLS.

### P7. Desativar e reativar (RF-039)

**Como funciona.**
- **Desativar:** o projeto desativado some das listas e dos cálculos, e as tarefas e
  subtarefas dele deixam de aparecer para os colaboradores.
- **Reativar:** traz tudo de volta.
- **Cliente desativado:** desativar o cliente tem o mesmo efeito sobre todos os projetos
  dele.

**Detalhes técnicos.**
- **Função:** `definirAtivoProjetoAction` → `definirAtivo`.
- **Herança sem marcar os filhos:** os filhos não são marcados. A herança é feita pelo RLS
  (`cliente_do_projeto_esta_ativo`).
- **Testes:**
  - `projetos-tarefas-a4.integration.test.ts`: "desativa e reativa projeto sem marcar
    seus filhos";
  - `soft-delete-rf039.integration.test.ts`: cascata a partir do cliente.

### P8. Comentários no projeto (RF-016)

Descritos em `comentarios-mencoes.md`.

---

## Limitações e pendências conhecidas

| # | Situação | Efeito |
|---|---|---|
| L1 | O semáforo conta feriados como dia útil. | Perto de feriados, o prazo parece maior do que é. Decisão registrada (ver histórico). |
| L2 | O mesmo indicador tem dois nomes: "Dias restantes" na listagem e "Semáforo do prazo" nas demais telas. | É intencional, pela decisão de 29/09. |
| L3 | O link de documento do projeto só é conferido como "não vazio" (`criarDocumentoProjeto`). | Aceita texto que não é link e esquemas como `javascript:`. Ver L3 em `clientes.md`. |

## Histórico de alterações

| Data | Commit | Alteração |
|---|---|---|
| 2026-09-16 | `26160cf` | Desativar o cliente passa a esconder os projetos dele dos colaboradores |
| 2026-09-17 | `6342b73`, `4ec8adf`, `5522d07` | Sprint 4A: cadastro, telas da Administradora e Meus Projetos |
| 2026-09-18 | `305c823`, `f6c2bc4` | Valor contratado, com campo formatado em moeda |
| 2026-09-25 | `d0e3951` | Status em destaque no detalhe do projeto |
| 2026-09-25 | `0956cdf` | Prazo do projeto exibido no painel |
| 2026-09-25 | `a5ac35c` | Link para o cliente na listagem de projetos |
| 2026-09-25 | `28537e0` | Criar projeto a partir da ficha do cliente |
| 2026-09-28 | `a976715` | Número da proposta comercial (número/ano) |
| 2026-09-29 | `8b66162` | Semáforo de prazo em dias úteis |
| 2026-09-29 | `82cfccf`, `c229dfc` | Listagem mostra "Dias restantes" mantendo as cores do semáforo (ver abaixo) |
| 2026-09-29 | `d731f79` | Correção das cores inexistentes na identidade visual |

### Decisão de 2026-09-29: dias restantes na listagem

- **Objetivo:** tornar o prazo restante mais explícito na listagem, sem perder a leitura
  visual do semáforo.
- **O que foi decidido:**
  - só o rótulo da coluna e do campo mudou para "Dias restantes", e o indicador colorido
    continua;
  - a contagem é em dias úteis, sem sábados e domingos;
  - o semáforo permanece com esse nome nas demais telas.
