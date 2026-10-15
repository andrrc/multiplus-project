# Projetos

- **Última revisão:** 2026-10-02, implementação da Sprint 6.
- **Requisitos:** RF-004, RF-009, RF-013, RF-016, RF-018, RF-020, RF-024, RF-038, RF-039, RF-048, RF-049, RF-050.
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

O **semáforo** mostra quantos dias corridos faltam para a conclusão prevista.

## Quem pode fazer o quê

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Criar, editar, mudar o status, desativar e reativar | Sim | Não | Não | Não |
| Ver todos os projetos (`/projetos`) | Sim | Não | Não | Não |
| Ver os próprios projetos (`/meus-projetos`) | — | Os atribuídos a ele e os que contêm tarefas dele | Os que contêm tarefas ou subtarefas dele | Não |
| Ver conclusão nas telas de projeto/tarefa | Sim | Sim, no escopo atribuído | Sim, no escopo atribuído | Sim, no portal próprio |
| Acessar `/portal` | Não | Não | Não | Projetos próprios ativos |
| Ver o **valor contratado** | Sim | **Não** (bloqueado no banco) | **Não** | Não |
| Vincular documento ao projeto | Sim | Não | Não | Não |

---

## Funcionalidades

### P10. Percentual de conclusão e acompanhamento do cliente (RF-048 a RF-050)

**Como funciona.** Projeto e telas de equipe mostram a conclusão das tarefas ativas; cada tarefa mostra progresso das subtarefas elegíveis. O portal do cliente lista projetos por última movimentação e mostra status, datas, tarefas, responsável, progresso agregado e links de documento. Cancelados e desativados não entram nos indicadores.

**Detalhes técnicos.**
- **Portal:** `/portal` e `/portal/[id]`; dados filtrados por vínculo do cliente e selects com campos explícitos.
- **Agregações protegidas:** subtarefas retornam só `{total, concluidas}`; comentários, valores de projeto e conteúdo de subtarefa permanecem inacessíveis a CLIENTE via RLS.
- **Testes:** `projetos-tarefas.unit.test.ts`, `portal-cliente-sprint6.integration.test.ts` e `administracao-acesso.unit.test.ts`.

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
- **Linhas:** sem cor de fundo, nem ao passar o mouse nem para projeto desativado, que
  aparece identificado pelo texto "Desativado" no semáforo.

**Detalhes técnicos.**
- **Rota:** `/projetos`.
- **Função:** `listarProjetos(ctx, incluirDesativados, busca)`.
- **Celular:** a tabela vira lista de cartões.

### P3. Dias restantes e semáforo do prazo

**Como funciona.**
- **O que mostra:** o número de **dias corridos** até a conclusão prevista. Sábados, domingos
  e feriados contam como qualquer outro dia.
- **Cores:** vermelho só para prazo vencido. Do dia do prazo até o limite configurado pelo ADMIN
  (padrão 5 dias), âmbar; acima dele, verde.
- **Situações especiais:** prazo vencido mostra o atraso em dias numa caixa vermelha
  sólida com texto branco. Prazo hoje mostra "Vence hoje".
- **Projetos sem contagem:** sem prazo, concluídos, cancelados ou desativados aparecem
  identificados por texto. Concluído fica verde; cancelado e desativado, cinza.
- **Nomes na interface:** na listagem, a coluna se chama "Dias restantes". No detalhe e em
  Meus Projetos, o nome é "Semáforo do prazo".

**Detalhes técnicos.**
- **Componente e cálculo:** `IndicadorSemaforoProjeto` e `calcularDiasRestantes`
  (`src/ui/indicador-dias-restantes.tsx`), com "hoje" no fuso `America/Sao_Paulo`.
- **Configuração:** limites editáveis pelo ADMIN em `/notificacoes`; os mesmos valores são usados em projetos, tarefas e subtarefas.
- **Testes:** `indicador-dias-restantes.unit.test.ts` cobre faixas em dias corridos, hoje, prazo no fim de semana, fuso, atraso e estados especiais; `semaforo-rf009.integration.test.ts` cobre leitura, edição e RLS.

### P4. Detalhe do projeto

**Como funciona.**
- **Painel:** mostra valor contratado, janela do projeto (início e conclusão), semáforo,
  tarefas concluídas e status. O status pode ser trocado ali mesmo. Na lista de tarefas,
  o menu de status abre por cima do cartão sem ser cortado pelas bordas.
- **Seções:** lista de tarefas (com troca de status e botão "Editar" em cada tarefa ativa,
  que abre `/tarefas/[id]/editar`), documentos do projeto e comentários.

**Detalhes técnicos.**
- **Rota:** `/projetos/[id]`.
- **Funções:** `buscarProjeto`, `alterarStatusProjetoAction` e
  `criarDocumentoProjetoAction`.

### P5. Documentos do projeto (RF-013)

**Como funciona.**
- **O que é:** a Administradora vincula links (Google Drive) com um nome ao projeto. Links
  novos devem ser URLs HTTP ou HTTPS válidas, validadas no servidor. Não há upload de arquivo.
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
| L2 | O mesmo indicador tem dois nomes: "Dias restantes" na listagem e "Semáforo do prazo" nas demais telas. | É intencional, pela decisão de 29/09. |

## Histórico de alterações

| Data | Commit | Alteração |
|---|---|---|
| 2026-10-15 | este commit | Botão "Editar" em cada tarefa ativa da lista do detalhe do projeto |
| 2026-10-15 | `75498a1` | Linhas da listagem sem cor de fundo, inclusive ao passar o mouse e para desativados ([análise](../analises/atraso-fuso-e-lista-subtarefas-sem-fundo.md)) |
| 2026-10-15 | `9f3a725` | Semáforo: vermelho só para prazo vencido, âmbar até o limite configurável (padrão 5 dias) e cancelado em cinza ([análise](../analises/semaforo-vermelho-so-atrasado.md)) |
| 2026-10-15 | `035aa9a` | Semáforo passa a contar dias corridos, com os mesmos limites 5/10 ([análise](../analises/semaforo-dias-corridos.md)) |
| 2026-10-14 | `035aa9a` | Destacar prazos vencidos com caixa vermelha sólida e texto branco |
| 2026-10-14 | `1f63d75` | Corrigir recorte do menu de status das tarefas no detalhe do projeto |
| 2026-10-01 | `9e20f9c` | Links de documentos limitados a URLs HTTP/HTTPS no servidor ([análise](../analises/validacao-esquema-links.md)) |
| 2026-10-02 | `b81feaf` | Indicadores de conclusão e portal próprio de acompanhamento do cliente; RLS sem leitura de comentários/subtarefas/valores ([análise](../analises/area-exclusiva-cliente-sprint-6.md)) |
| 2026-09-29 | `f2ebb80` | Semáforo configurável compartilhado entre projetos, tarefas e subtarefas ([análise](../analises/semaforo-prazos-projetos-tarefas.md)) |
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
  - a contagem era em dias úteis, sem sábados e domingos (substituída por dias corridos em
    15/10/2026);
  - o semáforo permanece com esse nome nas demais telas.
