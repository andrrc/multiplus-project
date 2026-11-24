# Análise: etapa 3 dos comprovantes, pedido de prazo e impedimento

- **Data:** 2026-11-24
- **Pedido original:** analisar a etapa 3 do módulo de comprovantes (planejamento, Fase 2): o colaborador externo diz "não consigo cumprir este prazo" e pede mais prazo ou informa um impedimento, e o coordenador do item decide.
- **Status:** **aprovada pelo usuário em 2026-11-24, com todas as recomendações das perguntas 1 a 15.** Nenhum código, banco ou teste foi alterado. O que a cliente já definiu está na seção 1; o que é interpretação nossa está marcado como **pendente de validação** e vira pergunta na seção 9.
- **Origem da regra:** protótipo `telas-novas/sistema-gestao-multiplus-colaborador-externo/` (especificação, seções 3.2, 5.2 e 6, e o diálogo em `01-minhas-tarefas.html`), análise geral [comprovantes-colaborador-externo.md](comprovantes-colaborador-externo.md) (seção 10, pergunta 6) e a decisão de 2026-11-23 em `docs/decisoes-desenvolvimento.md`: **quem decide é o coordenador do item, a administração ou o interno do projeto.**
- **Esta etapa muda dado, permissão e regra de prazo**, por isso começa por análise aprovada (regra do `AGENTS.md`).

## 1. Escopo previsto

### Regra em uma frase

Na tela do item, o colaborador externo responsável tem o link **"Não consigo cumprir este prazo"** e escolhe entre **pedir mais prazo** (nova data e motivo obrigatório) ou **informar impedimento** (motivo obrigatório); o pedido avisa o coordenador, que decide; **aprovando o pedido de prazo, o prazo do item muda e o sistema guarda o prazo anterior.**

### O que a cliente já definiu

- O externo pode pedir prazo e informar impedimento; a administração ou o interno decide (especificação do externo, seção 3.2).
- O diálogo tem duas opções: "Pedir mais prazo" (nova data e motivo) e "Informar impedimento" (motivo) (seção 5.2).
- O pedido gera um aviso para o coordenador, e a resposta gera outro para o externo ("resposta a pedido de prazo" é um dos tipos de aviso do perfil, seção 3.5).
- **Quando o pedido de prazo é aprovado, o prazo do item muda e o histórico registra o prazo original** (seção 5.2).
- Prioridade **Média** (seção 6, item 5).
- Decisão de 2026-11-23: **o coordenador do item decide, administração ou interno do projeto.**

### O que o protótipo **não** define (pendente de validação)

1. O que acontece quando um **impedimento** é aceito (o protótipo só o registra como mensagem: "Impedimento informado: ...").
2. Se o pedido de prazo ou o impedimento **pausa a contagem** enquanto espera a decisão.
3. Se o pedido vale para **subtarefa**.
4. Os limites da **nova data**.
5. Se **recusar** exige motivo e se o coordenador pode aprovar com **outra data**.
6. Se o interno responsável também pode pedir.

Cada um vira pergunta na seção 9, com recomendação.

### Fora do escopo desta etapa

- **Mensagens com a Múltiplus** no item: são a etapa 4. O protótipo mostra o pedido "nas mensagens do item"; esta etapa mostra o pedido e a resposta num cartão do próprio item, e a etapa 4 os integra à conversa (pergunta 12).
- **Histórico automático** geral dos itens (Fase 4): aqui só se guarda o prazo anterior de cada pedido aprovado.
- **WhatsApp**, página de Instruções e foto de exemplo (etapa 4).
- Pedido do **interno** ou da **administração** para mudar o próprio prazo: a administração já edita o prazo na tela de edição, e o interno não edita prazo hoje (só `ADMIN` tem UPDATE em `tarefas`).

## 2. Permissões

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Pedir prazo ou informar impedimento | Não (edita o prazo direto) | Não, nesta etapa (pergunta 4) | **Sim**, só nos itens de que é o responsável | Não |
| Ver o pedido | Todos | Os dos projetos a que está atribuído | **Só os próprios** | **Nunca** |
| Aprovar ou recusar | Sim | Sim, nos pedidos de **externo** dos projetos dele | Não | Não |
| Retirar o pedido pendente | Sim | Não | O próprio pedido | Não |

- **O interno não ganha permissão geral de editar prazo.** Hoje a política `tarefas_update` só admite `ADMIN` ou uma decisão delegada de conclusão (`decisao_delegada_tarefa`), e o gatilho `tarefas_enforce_rn007` recusa qualquer outra mudança por colaborador. A decisão do interno sobre o pedido de prazo seguiria o mesmo padrão da decisão delegada da etapa 1 (`habilitar_decisao_delegada`, `pode_decidir_solicitacao_delegada`, migration `20261117120000_comprovantes_etapa1`): uma função `SECURITY DEFINER` confere quem é e o que pode, e os gatilhos aceitam **só a mudança do campo `prazo`** naquele caminho.
- **"Coordenador do item"** é, no sistema, a administração e o interno atribuído ao **projeto** (`atribuicoes` com `entidadeTipo = PROJETO`), o mesmo critério de `interno_atribuido_ao_item_do_comprovante`. Quem for interno responsável pelo item **sem** atribuição ao projeto **não** decide (**pendente de validação**, pergunta 4).
- **O cliente não vê nada novo**: a política de leitura não tem cláusula para `CLIENTE`, e o portal não mostra pedidos.

## 3. Dados

### Tabela nova `pedidos_prazo`

Cada linha é um pedido de **um** item, com a mesma forma de alvo da tabela `solicitacoes_conclusao` (`tarefaId` ou `subtarefaId`, exatamente um).

| Coluna | Para quê |
|---|---|
| `id` | chave |
| `tarefaId`, `subtarefaId` | alvo; um e só um (CHECK) |
| `tipo` | `PRAZO` ou `IMPEDIMENTO` (enum novo) |
| `solicitadoPorId`, `solicitadoPorNome`, `solicitadoEm` | autor, com o nome gravado (o usuário pode ser desativado) e o instante do servidor |
| `prazoAtual` | o prazo do item **no instante do pedido** (é o "prazo original" que o histórico pede) |
| `prazoNovo` | a data pedida; **obrigatória** quando `tipo = PRAZO` e nula no impedimento (CHECK) |
| `motivo` | texto obrigatório, com limite de tamanho (CHECK) |
| `status` | `PENDENTE`, `APROVADO`, `RECUSADO`, `CANCELADO` (enum novo) |
| `decididoPorId`, `decididoPorNome`, `decididoEm`, `respostaDecisao` | quem decidiu, quando e a resposta |

- **Índice único parcial:** no máximo **um pedido `PENDENTE` por item**.
- **Imutável depois de decidido:** um gatilho nos moldes de `solicitacoes_conclusao_enforce` recusa mudar pedido que não está pendente e qualquer campo do autor ou do pedido; só se decide ou se cancela.
- **O prazo anterior fica no pedido**, e não numa coluna do item: assim o histórico de prorrogações de um item é a sequência dos seus pedidos `APROVADO`, e a tarefa não ganha coluna nova.
- **A coluna `prazoOriginal` da tarefa não é tocada.** Ela é a âncora da recorrência (`calcularProximaOcorrencia`, `regras-projetos-tarefas.ts`); a aprovação muda só `prazo`, a data da ocorrência atual. Veja o caso da seção 6.

### Escrita só por funções

- **Sem política de INSERT** na tabela: o pedido nasce por `solicitar_pedido_prazo(...)`, `SECURITY DEFINER`, que confere o responsável (`colaborador_responsavel_pelo_item`), o estado do item e as regras da seção 6.
- **A decisão** é `decidir_pedido_prazo(...)`, que aplica a aprovação e a mudança de `prazo` **na mesma transação**; a retirada é `cancelar_pedido_prazo(...)`.
- Execução liberada só para a role da aplicação, `REVOKE` para `PUBLIC`, como nas funções da etapa 1.
- **Leitura:** política `pedidos_prazo_select` nos moldes da de `solicitacoes_conclusao`: `ADMIN`, o autor, e o interno atribuído ao projeto; o externo **só o que ele mesmo pediu**. `GRANT SELECT` para a role da aplicação.

### Notificações: dois eventos novos

- `PEDIDO_PRAZO_RECEBIDO` (para o coordenador) e `PEDIDO_PRAZO_RESPONDIDO` (para o externo). Isso exige acrescentar valores ao enum `EventoNotificacao` (migration `ALTER TYPE ... ADD VALUE`), linhas em `preferencias_notificacao` para cada perfil, texto de e-mail (`email-templates.ts`), rótulo e ícone em `lista-avisos.tsx` e o caso em `notificacoes-toasts.ts`.
- **A conferir na implementação:** o que acontece com perfil sem linha de preferência para o evento novo (o padrão das colunas é `email` e `inApp` verdadeiros). A migration deve inserir as linhas para os quatro perfis para não depender do padrão.

### Migration

**Sim.** Uma só: tabela, enums, índice, CHECKs, gatilhos, funções, políticas, `GRANT` e os valores novos de evento. Timestamp posterior ao da última (`20261124120000_pausa_prazo_quantidade_arquivos`). Ao redefinir `tarefas_enforce_rn007` e `subtarefas_enforce_rn004`, parte-se do corpo vigente (`20261117120000_comprovantes_etapa1`), como manda o `AGENTS.md`. Arquivos compartilhados que a tarefa reservaria: `prisma/schema.prisma`, `prisma/migrations/**` e `src/lib/projetos-tarefas.ts` (se as consultas forem estendidas lá).

## 4. Impacto em telas e funções existentes

### 4.1 O que **não** muda

- **O cálculo de prazo.** Aprovar um pedido só altera o campo `prazo`. Tudo que deriva dele (semáforo, atrasos, agenda, painéis, PDFs, "cliente com atraso", portal e a função `prazo-em-conferencia.ts` da etapa 2) recalcula sozinho na próxima leitura. **Nenhuma regra de prazo é reescrita.**
- **Os avisos de prazo.** A chave de idempotência do aviso diário é `prazo:{tarefa}:{dia da execução}` (`dispararPrazoProximo`, `notificacoes.ts`): ela não depende da data do prazo, então o prazo novo é avaliado normalmente no dia seguinte.
- **A etapa 1 e a etapa 2.** O pedido de conclusão e o de prazo são tabelas e fluxos separados.

### 4.2 O que muda (a implementar)

| Onde | O que muda |
|---|---|
| `src/lib/` (novo arquivo, por exemplo `pedidos-prazo.ts`) | Regras puras (validar a nova data, estado do pedido) e as funções de leitura e escrita que chamam as funções SQL |
| Server Actions em `src/app/(painel)/projetos/actions.ts` (ou arquivo novo) | Pedir, decidir e retirar; dados montados campo a campo, sem repassar o formulário; avisos disparados **depois** da transação, como nas outras ações |
| Tela do item do externo (`/minhas-tarefas/[id]`) | Link "Não consigo cumprir este prazo", diálogo com as duas opções, e o cartão "Pedidos de prazo" com o pendente e as respostas |
| Telas do coordenador (`/tarefas/[id]` da administração e `/minhas-tarefas/[id]` do interno) | Cartão com o pedido pendente, "Aprovar" e "Recusar" e a resposta; histórico dos pedidos do item |
| Painel da administração e do interno | Bloco "Aguardando sua decisão" com os pedidos de prazo e impedimento pendentes (pergunta 11) |
| Notificações | Dois eventos novos (seção 3) |
| `src/ui/` | Provavelmente nada novo; reaproveitar `Cartao`, `BotaoConfirmacao` (`botao-confirmacao.tsx`) e os campos existentes. Qualquer componente novo em `src/ui/` é arquivo compartilhado e exige reserva |

### 4.3 Documentação a atualizar na implementação

`docs/funcionalidades/tarefas.md` e `subtarefas.md` (pedido de prazo e impedimento), `notificacoes.md` (eventos novos), `interface.md`, a seção 10 de [comprovantes-colaborador-externo.md](comprovantes-colaborador-externo.md), o planejamento (Fase 2, etapa 3) e `docs/decisoes-desenvolvimento.md`.

## 5. Riscos e segurança

| # | Risco | Tratamento |
|---|---|---|
| 1 | **Externo pedir prazo de item que não é dele.** | A função confere `colaborador_responsavel_pelo_item`; o RLS de leitura mostra só os próprios pedidos. Teste do perfil negado. |
| 2 | **Interno ampliar o poder de editar prazo.** | Nenhuma política de UPDATE nova para o interno. O caminho delegado só passa dentro da função de decisão, e o gatilho aceita, nele, **apenas** a mudança de `prazo`. Teste que tenta mudar outro campo e falha. |
| 3 | **Vazar dado ao cliente.** | Nenhuma cláusula para `CLIENTE`; o portal não lê a tabela. Teste do perfil `CLIENTE` negado. |
| 4 | **Prazo anterior à data de hoje ou absurdo.** | Validação no servidor **e** no banco (seção 6). |
| 5 | **Duplicar ou pular a próxima ocorrência de tarefa recorrente.** | A nova data não pode alcançar a próxima ocorrência (seção 6). |
| 6 | **Decisão concorrente** (dois coordenadores decidem ao mesmo tempo). | A função trava a linha (`FOR UPDATE`) como a da etapa 1, e o índice único parcial garante um pendente por item. |
| 7 | **Texto livre com conteúdo indevido.** | O motivo é texto, exibido como texto (sem HTML), com limite de tamanho; não há envio de arquivo nesta etapa. |
| 8 | **Notificação em massa ou duplicada.** | Chave de idempotência por pedido, como em `solicitacao-conclusao:{id}:pendente`. |

## 6. Casos-limite e estados

| Situação | Comportamento recomendado |
|---|---|
| **Item em conferência** (pedido de conclusão pendente com arquivos, etapa 2) | **Não aceita** pedido de prazo nem impedimento: o prazo já está pausado. A tela mostra o porquê. |
| **Item concluído, cancelado ou desativado** | Não aceita pedido; pedido pendente vira `CANCELADO` se o item fecha. |
| **Item atrasado** | É o caso principal. Aceita pedido de prazo. |
| **Item sem prazo** | Não aceita pedido **de prazo** (não há prazo a prorrogar); aceita impedimento. |
| **Nova data** | Posterior ao prazo atual **e** não anterior a hoje (data civil de Brasília). Em item atrasado, vale a data de hoje em diante. |
| **Tarefa recorrente** | A nova data tem de ser **anterior à próxima ocorrência** da série (`calcularProximaOcorrencia`). Aprovar mexe só na ocorrência atual; a âncora `prazoOriginal` e as ocorrências futuras não mudam. **Correção prévia (2026-11-24):** a conta antiga indexava a série pelo mês do prazo atual e pulava um ciclo quando a prorrogação caía em outro mês (31/01 prorrogado para 01/02 daria 31/03 em vez de 28/02). Foi corrigida em `calcularProximaOcorrencia` antes da implementação, sem coluna nova (a ocorrência é a maior data da série que não passa do prazo); a tarefa do Codex não toca essa função. |
| **Subtarefa** | O pedido vale para a própria subtarefa. O sistema **não** limita hoje a subtarefa ao prazo da tarefa-mãe (não há essa validação no código); a aprovação mantém isso e a tela do coordenador mostra um aviso se a data passar do prazo da mãe ou da previsão do projeto. |
| **Dois pedidos** | Só um pendente por item. Depois da decisão (inclusive recusa), o externo pode pedir de novo. |
| **Pedido pendente e o externo envia o comprovante** | Os dois fluxos seguem independentes; se o item concluir, o pedido pendente vira `CANCELADO`. |
| **Pedido pendente e mudança de responsável** | O pedido continua do autor; o novo responsável vê o histórico se o RLS lhe der acesso ao item (**a conferir** na implementação). |
| **Aprovação depois que o prazo mudou por outro caminho** (a administração editou o prazo) | O pedido guarda `prazoAtual`; se o prazo do item já não for igual a ele, a decisão avisa e exige confirmação, em vez de sobrescrever em silêncio. |
| **Impedimento aceito** | Depende da pergunta 1. |
| **Coordenador desativado ou sem interno atribuído** | Cai na administração, que sempre decide. |

## 7. Interface

- **Externo (celular primeiro):** o link "Não consigo cumprir este prazo" fica abaixo do botão "Enviar comprovante", como no protótipo. O diálogo traz as duas opções (rádio), o campo de data (só em "Pedir mais prazo"), o motivo obrigatório e "Enviar pedido". Depois do envio, o item mostra o cartão "Pedido de prazo: aguardando decisão", com a data pedida e o motivo, e o botão "Retirar pedido". A resposta aparece no mesmo cartão e no aviso.
- **Coordenador:** cartão no topo do item, no mesmo lugar do "Pedido de conclusão pendente", com "Aprovar" e "Recusar" e o campo de resposta. Mostra o prazo atual, o prazo pedido, quantos dias a mais, o motivo e o autor.
- **Tudo funcionando em 375 px e no desktop**, sem rolagem lateral, e só com os tokens de cor de `globals.css`.
- **Dados do protótipo são ilustrativos:** copiar estrutura e comportamento, não os textos de exemplo.

## 8. Plano de testes

- **Unitário (`tests/unit/`):** a regra da nova data (hoje, prazo atual, próxima ocorrência), o estado do pedido, o texto da tela do externo e do coordenador.
- **Integração (`tests/integration/`, RLS e permissão, perfil permitido e negado):**
  - o externo responsável pede; o externo de **outro** item é recusado; interno, administração e cliente não pedem;
  - o interno atribuído **decide**; o interno de **outro** projeto é recusado; o cliente nunca lê;
  - a aprovação muda **só** `prazo` e grava o prazo anterior no pedido; tentativa de mudar outro campo no caminho delegado falha;
  - um pedido pendente por item; decisão concorrente; imutabilidade depois de decidido;
  - tarefa recorrente: `prazoOriginal` intacto e nova data limitada pela próxima ocorrência;
  - item em conferência, fechado, desativado e sem prazo;
  - o pedido pendente vira `CANCELADO` quando o item fecha;
  - os dois eventos de notificação respeitam as preferências por perfil e a idempotência.
- **Jornada de navegador (`tests/browser/`):** o externo pede mais prazo; o coordenador aprova; o prazo novo aparece no item; o externo vê a resposta. A 375 px e no desktop, sem rolagem lateral.
- **Regressão:** a suíte existente de semáforo, atraso, agenda e avisos continua verde, porque nenhuma regra de prazo muda.
- Falhas preexistentes se separam das novas rodando o mesmo comando em `origin/staging`.

## 9. Perguntas em aberto

Cada pergunta traz a recomendação. As respostas da cliente de 2026-11-23 cobrem só o que está na seção 1. Em 2026-11-24 o usuário aprovou as recomendações das quinze perguntas. Sobre a pergunta 1, a opção A foi aprovada pelo usuário e **não consta resposta da Talita**: se ela quiser o efeito automático do impedimento aceito (cancelar o item ou um status novo), isso entra numa etapa posterior.

1. **O que o impedimento aceito faz?** O protótipo só registra a mensagem. Opções: **(A)** nada automático: o coordenador responde e age pelos meios que já existem (cancelar, reatribuir, editar o prazo); **(B)** aceitar **cancela** o item; **(C)** status novo "Com impedimento". **Recomendação: A** nesta etapa, porque B e C mudam regra de negócio, e B ainda exigiria o interno poder cancelar. **Esta é a única pergunta que provavelmente precisa da Talita.** — **Resposta:** aprovada pelo usuário em 2026-11-24.
2. **Impedimento pendente ou aceito pausa o prazo?** **Recomendação:** não; o prazo continua contando, como no pedido de prazo, para não criar uma segunda regra de pausa fora da etapa 2. — **Resposta:** aprovada pelo usuário em 2026-11-24.
3. **Pedido de prazo pendente pausa o prazo?** **Recomendação:** não; só a conferência de comprovante pausa. — **Resposta:** aprovada pelo usuário em 2026-11-24.
4. **Quem pede?** **Recomendação:** só o colaborador **externo** responsável, como no protótipo. O interno responsável **não** pede nesta etapa; quem decide é o interno **atribuído ao projeto**, e o interno responsável sem atribuição ao projeto não decide. — **Resposta:** aprovada pelo usuário em 2026-11-24.
5. **O pedido vale para subtarefa?** **Recomendação:** sim, tarefa e subtarefa, porque o externo recebe os dois tipos de item. — **Resposta:** aprovada pelo usuário em 2026-11-24.
6. **Limites da nova data.** **Recomendação:** posterior ao prazo atual, não anterior a hoje e, em tarefa recorrente, anterior à próxima ocorrência (seção 6). — **Resposta:** aprovada pelo usuário em 2026-11-24.
7. **Item em conferência, concluído, cancelado ou sem prazo** não aceitam pedido de prazo (sem prazo aceita impedimento). **Recomendação:** sim. — **Resposta:** aprovada pelo usuário em 2026-11-24.
8. **Um pedido pendente por item**, com novo pedido liberado depois de qualquer decisão. **Recomendação:** sim. — **Resposta:** aprovada pelo usuário em 2026-11-24.
9. **Decisão.** Aprovar na data pedida (sem editar a data), resposta opcional ao aprovar e **obrigatória ao recusar**, como a devolução de comprovante. **Recomendação:** sim. O coordenador que quiser outra data recusa e usa a edição de prazo (administração) ou orienta na resposta. — **Resposta:** aprovada pelo usuário em 2026-11-24.
10. **Avisos.** Dois eventos novos (recebido e respondido), por e-mail e no sistema, com as preferências padrão ligadas para os quatro perfis. **Recomendação:** sim. — **Resposta:** aprovada pelo usuário em 2026-11-24.
11. **Onde o coordenador vê o pedido.** Cartão no item **e** um bloco "Aguardando sua decisão" no painel da administração e do interno. **Recomendação:** sim; só o aviso deixaria o pedido esquecido. — **Resposta:** aprovada pelo usuário em 2026-11-24.
12. **Mensagens.** Esta etapa **não** entrega o chat; o pedido e a resposta aparecem no cartão do item, e a etapa 4 os integra às mensagens. **Recomendação:** sim. — **Resposta:** aprovada pelo usuário em 2026-11-24.
13. **Prazo da tarefa-mãe e do projeto.** A aprovação **não** altera o prazo da mãe nem a previsão do projeto, e a tela do coordenador avisa se a data os ultrapassar. **Recomendação:** sim. — **Resposta:** aprovada pelo usuário em 2026-11-24.
14. **Retirar o pedido.** O externo pode retirar o próprio pedido pendente. **Recomendação:** sim. — **Resposta:** aprovada pelo usuário em 2026-11-24.
15. **Divisão do trabalho.** **Recomendação:** uma tarefa só, com migration, regras, ações e telas, porque o banco e as telas dependem um do outro; se for dividir, a primeira parte é a migration com as funções e os testes de RLS, e a segunda as telas. Os arquivos compartilhados a reservar estão na seção 3. — **Resposta:** aprovada pelo usuário em 2026-11-24.

### Recomendação geral

Aprovar a tabela `pedidos_prazo` escrita só por funções, o caminho delegado do interno limitado a mudar `prazo`, os dois eventos de aviso e a regra de que **nenhuma regra de prazo muda**, com as recomendações acima. O ponto que pede decisão da cliente é o efeito do **impedimento aceito** (pergunta 1); com a recomendação A, a etapa 3 pode começar sem esperar por ela, e o efeito automático fica para uma etapa posterior se a Talita quiser.
