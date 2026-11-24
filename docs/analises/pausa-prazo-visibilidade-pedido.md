# Análise: a pausa do prazo para quem lê o pedido mas não lê os arquivos

> Estado: **aprovada em 2026-11-23 pelo usuário (opção A, sem envios reais de comprovante na VPS)**. Mexe em dado (coluna nova), em RLS (nenhuma política muda, mas a regra de prazo passa a depender de um dado novo) e em regra de prazo, então não começa sem a sua aprovação. Origem: achado 4 da revisão cruzada da `etapa2-prazo` ([relatório do Codex](../tarefas/etapa2-prazo-revisao.md), na branch `codex/revisao-etapa2-prazo`). Decisão já tomada em 2026-11-23: **quem enxerga o pedido deve ver a pausa**, sem ampliar a leitura dos arquivos.

## 1. O problema

A etapa 2 decide a pausa assim: existe um pedido de conclusão `PENDENTE` com pelo menos um arquivo de comprovante. A consulta conta os arquivos do pedido (`_count.arquivos`, e nos filtros `arquivos: { some: {} }`), e essa contagem passa pelo RLS.

O RLS de `arquivos_comprovante` deixa ler: a administração, quem enviou o arquivo e o interno atribuído ao projeto. O RLS de `solicitacoes_conclusao` deixa ler mais gente: também o externo atribuído à tarefa e quem é responsável por ela, sem exigir que tenha enviado ou esteja no projeto.

Quem lê o pedido e não lê os arquivos enxerga contagem zero, então o item volta a aparecer como atrasado para ele. Isso acontece com:

1. o novo responsável de uma tarefa reatribuída pela administração durante a conferência;
2. o externo atribuído à tarefa que não foi quem enviou (dois externos na mesma tarefa);
3. o interno responsável por uma tarefa, sem atribuição ao projeto.

Para a administração e para quem enviou, a pausa aparece certa. A divergência é o que o Codex apontou: duas pessoas veem a mesma tarefa com situações diferentes.

## 2. Por que não dá para corrigir só no código

- A função `solicitacao_tem_comprovantes(id)` já existe (`SECURITY DEFINER`, com `GRANT` para `multiplus_app`), mas o Prisma não a aceita em `where` nem em `include`.
- Chamá-la depois de cada consulta cobriria cerca de dez pontos de leitura de `src/lib/projetos-tarefas.ts`. Não cobriria os filtros de "cliente com atraso" (`idsDeClientesComAtraso`) e de "atrasados de meses anteriores", que precisam da regra dentro do `where`.
- O resultado seria uma regra espalhada, o oposto do que a função única `prazo-em-conferencia.ts` quer garantir.

## 3. Opções

| Opção | Como | Prós | Contras |
|---|---|---|---|
| **A. Coluna no pedido (recomendada)** | `solicitacoes_conclusao.quantidadeArquivos` (inteiro, padrão 0), gravada por `solicitar_conclusao` no mesmo `INSERT` do pedido, que já conta os arquivos anexados antes de criar o pedido. Consultas e filtros passam a usar `quantidadeArquivos > 0`. | Quem lê o pedido sabe se há arquivo, sem ler arquivo nenhum. Regra volta a ser uma coluna simples, igual em todas as consultas, filtros incluídos. Nenhuma política de RLS muda. | Migration com a coluna e o preenchimento dos pedidos existentes. |
| B. Pós-processamento com a função existente | Depois de cada consulta, perguntar à função quais pedidos têm arquivo. | Sem migration. | Dez pontos de código; os filtros de cliente e de atrasados anteriores ficam sem a correção; mais consultas por tela. |
| C. Não corrigir | Registrar a limitação (já está como L9). | Nada a fazer. | Contraria a decisão de 2026-11-23. |

### Por que a coluna é segura

- Os arquivos entram no pedido no momento do envio e **nunca são apagados depois**, então a contagem gravada no `INSERT` do pedido não muda. Não precisa de trigger para mantê-la.
- O pedido é histórico imutável (trigger que recusa alterar o envio). Gravar a contagem na criação respeita isso.
- A coluna revela só "quantos arquivos o envio tem" a quem já lê o pedido. O nome, o caminho e o conteúdo dos arquivos continuam sob o RLS dos arquivos.
- O `CLIENTE` continua sem ler pedidos nem arquivos.

### Preenchimento dos pedidos existentes

Os pedidos já gravados precisam receber a contagem. O trigger de imutabilidade recusa `UPDATE` no envio, então a migration faz o preenchimento dentro dela, sem afrouxar o trigger para o uso normal (por exemplo, criando a coluna e preenchendo antes de o trigger passar a valer para ela, ou com a exceção restrita a esta coluna). O desenho exato fica na tarefa, com teste. A etapa 1 já foi publicada, então pode haver envios reais; **preciso confirmar com você** se há (ver a pergunta 2). Sem envios, o preenchimento é trivial.

## 4. O que muda, se aprovada a opção A

- Migration nova, com timestamp posterior a `20261118120000_ultimo_acesso_usuario`: coluna, preenchimento e `solicitar_conclusao` redefinida a partir da versão mais recente (`grep -l "FUNCTION solicitar_conclusao" prisma/migrations/*/migration.sql`).
- `prisma/schema.prisma`: o campo novo em `SolicitacaoConclusao`.
- `src/lib/prazo-em-conferencia.ts`: `emConferenciaDesde` passa a ler `quantidadeArquivos`; `PEDIDO_PENDENTE_PARA_PRAZO` e `SEM_CONFERENCIA_EM_ANDAMENTO` deixam de usar `_count`/`arquivos`. As consultas de `projetos-tarefas.ts` que selecionam `_count: { arquivos }` só para a pausa trocam o campo.
- Telas e regras puras: nenhuma muda; elas já recebem `emConferenciaDesde`.
- Documentação: tarefas, subtarefas, área do cliente e a limitação L9 sai.

## 5. Testes

- Integração, perfil permitido e negado, no mesmo cenário dos três casos do item 1: o novo responsável, o segundo externo e o interno responsável sem atribuição ao projeto passam a ver a pausa; o `CLIENTE` segue sem ler pedidos e arquivos; ninguém além de quem já lia passa a ler arquivo.
- Integração: pedido sem arquivo continua sem pausa; devolvido e retirado voltam a contar; a coluna nasce certa pelo ciclo real (`solicitarConclusao`).
- Os testes da etapa 2 continuam verdes sem alterar asserção.

## 6. Dependências e ordem

- Depende da `etapa2-prazo` integrada em `staging`.
- A Fase 6 (régua de avisos) e o anel de "obrigações em dia" do portal passam a usar a coluna, sem função `SECURITY DEFINER` extra.
- Arquivos compartilhados que a tarefa reserva: `prisma/schema.prisma`, `prisma/migrations/**` e `src/lib/projetos-tarefas.ts`.

## 7. O que preciso que você decida

1. Aprova a **opção A** (coluna no pedido)? **Aprovada.**
2. Já existem envios de comprovante reais na VPS? **Não** (resposta do usuário em 2026-11-23). O preenchimento dos pedidos existentes só precisa cobrir os dados de teste e de staging; a migration ainda deve preencher a coluna de quem já tiver pedido, por segurança.
