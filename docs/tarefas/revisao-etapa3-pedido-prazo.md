# REVISÃO da tarefa etapa3-pedido-prazo — Pedido de prazo e impedimento (etapa 3 dos comprovantes)

> O revisor **não edita** a branch revisada. Este relatório vai para a pessoa responsável; a correção fica com o autor (Codex).

| Campo | Valor |
|---|---|
| **Tarefa** | `etapa3-pedido-prazo` (arquivo `docs/tarefas/etapa3-pedido-prazo.md`) |
| **Branch revisada** | `codex/etapa3-pedido-prazo`, no commit `eca3c8b` (um commit, sobre `origin/staging` em `151c1f8`) |
| **Revisor** | claude |
| **Data** | 2026-11-24 |
| **Veredito** | **aprovar com ressalvas**: corrigir o achado 1 antes de integrar (a migration ainda não foi publicada, então pode ser ajustada na própria migration); os demais dependem de resposta do usuário |

## 1. O que foi conferido

- [x] Escopo: nenhum arquivo proibido foi tocado (`regras-projetos-tarefas.ts`, `prazo-em-conferencia.ts`, `situacao-prazo.ts`, `semaforo.ts`, `agenda-itens.ts`, `src/ui/**`, `navegacao.ts`, `globals.css`, `package*.json`, configuração de testes, planejamento e decisões). Os arquivos reservados (`schema.prisma`, uma migration, `src/lib/projetos-tarefas.ts`) respeitam a tarefa; `projetos-tarefas.ts` nem foi alterado. Timestamp `20261124130000` é posterior ao da última migration de `origin/staging`.
- [x] Aderência ao `AGENTS.md`: regra pura em `pedidos-prazo-regras.ts`, acesso a dados em `pedidos-prazo.ts`, Server Action junto da rota, `comContextoDeUsuario` (role restrita), datas em UTC, tokens de cor existentes (conferi todos em `globals.css`; nenhum hex fixo).
- [x] Segurança: tabela só com `GRANT SELECT` e política de leitura (admin; externo só os próprios; interno atribuído ao projeto; cliente nunca). Escrita só por funções `SECURITY DEFINER` com `search_path` fixo e `REVOKE ... FROM PUBLIC`. As funções internas (`item_do_pedido_prazo`, `validar_data_pedido_prazo`, `proxima_ocorrencia_pedido_prazo`) não têm `GRANT` para a role da aplicação. A Server Action monta os campos um a um e o servidor valida de novo no banco.
- [x] Caminho delegado do interno: os gatilhos `tarefas_enforce_rn007` e `subtarefas_enforce_rn004` foram redefinidos a partir do corpo vigente (`20261117120000_comprovantes_etapa1`), preservando `ADMIN`, sessão nula e `decisao_delegada_*`. O novo ramo exige perfil `ADMIN_INTERNO`, **`current_user` igual ao dono da tabela** (só vale dentro da função proprietária; uma configuração de sessão feita pela role da aplicação não basta) e compara `to_jsonb(NEW) - 'prazo'` com o antigo, então mudar qualquer outro campo falha.
- [x] Concorrência: ordem de travas tarefa → subtarefa → pedido, igual na criação e na decisão; índice único parcial por item pendente; imutabilidade por gatilho.
- [x] Regressões: o diff de `notificacoes.ts` só acrescenta o filtro por perfil dos dois eventos e a reserva de envio (chave por destinatário: `chave:{usuario}`); os outros eventos seguem iguais. `ROTULO_EVENTO` e os `Record<EventoNotificacao, ...>` ficaram exaustivos (typecheck passa).
- [x] Testes: os de integração cobrem o permitido e o negado pela role restrita; não encontrei `skip`, `only`, `todo` nem aumento de timeout no diff dos testes.
- [x] Verificações que **eu** rodei: `npm run test:unit` no worktree do Codex (395 passam). **Não** repeti a integração nem as jornadas de navegador (confio no relato do Codex: 370 de integração e smoke e 10 jornadas, no Git Bash).
- [x] Verificação extra: comparei `proxima_ocorrencia_pedido_prazo` (SQL) com a série de datas em um banco descartável (criado e apagado por mim, sem tocar em `multiplus_test`): periodicidades mensal, trimestral, semestral e anual, âncoras nos dias 1 a 31, 373.643 prazos entre duas datas da série, **0 divergências**. O caso 31/01 → 01/02 dá 28/02 e o semanal com dia fixo dá a terça seguinte.

## 2. Achados

| # | Severidade | Arquivo:linha | O que está errado | Cenário em que falha | Sugestão |
|---|---|---|---|---|---|
| 1 | **média** | `prisma/migrations/20261124130000_pedidos_prazo/migration.sql:119-121` e `:315-329` | O item de **subtarefa** só conta como fechado pelo status da própria subtarefa (e por `ativo` da tarefa/projeto/cliente). O status da **tarefa-mãe** é ignorado, e o gatilho de cancelamento, quando a tarefa conclui ou é cancelada, só cancela os pedidos da própria tarefa (os das subtarefas só caem se a tarefa for desativada). | A tarefa é concluída (a conclusão não exige subtarefas fechadas) com um pedido de prazo pendente em uma subtarefa. O pedido continua `PENDENTE`, aparece em "Aguardando sua decisão" no painel e a decisão **aprova e muda o prazo de uma subtarefa de tarefa já concluída**. A análise (seção 6) manda o pedido pendente virar `CANCELADO` quando o item fecha. | Em `item_do_pedido_prazo`, tratar a subtarefa como fechada também quando `t."status"` for `Concluído` ou `Cancelado`; no gatilho `cancelar_pedido_prazo_item_fechado`, no ramo de `tarefas`, cancelar também os pedidos das subtarefas quando o status da tarefa vira `Concluído`/`Cancelado`. Acrescentar um teste de integração desse caso. |
| 2 | média (pré-existente, agora exposta) | `prisma/migrations/20261117120000_comprovantes_etapa1/migration.sql:431` (`concluir_tarefa`) | Ao criar a próxima ocorrência, o prazo da subtarefa copiada é `p_proximo_prazo + (s.prazo - atual.prazo)`, usando o prazo **atual** da tarefa. Com a prorrogação aprovada, `atual.prazo` anda e o prazo da subtarefa não, então a distância aumenta. | Tarefa mensal com prazo 10/01 e subtarefa em 05/01 (5 dias antes). Prorrogada para 20/01 e concluída. A próxima ocorrência é 10/02, mas a subtarefa copiada vai para 10/02 − 15 dias = **26/01**, antes de o mês de fevereiro começar; o esperado é 05/02. A edição do prazo pela administração já causava o mesmo efeito; a etapa 3 passa a provocá-lo no fluxo normal. | Não é código do Codex nem estava no escopo. Precisa de decisão do usuário (pergunta 1), porque mexe em regra de prazo da recorrência. |
| 3 | baixa | `migration.sql:294-312` e `cartao.tsx` (`podeRetirar` na tela da administração) | `cancelar_pedido_prazo` e o botão "Retirar pedido" também valem para a **administração**. A análise e a tarefa dizem que quem retira é o **autor** (externo); a administração recusa, com resposta obrigatória. | A administração "retira" o pedido do externo: o pedido vira `CANCELADO` com o nome da administração como `decididoPorNome`, sem resposta e sem aviso ao externo. | Limitar a retirada ao autor (e deixar a administração com "Recusar"), ou confirmar com o usuário que a retirada pela administração é desejada (pergunta 2). |
| 4 | baixa | `migration.sql:238-290` (`decidir_pedido_prazo`) | A decisão não checa se o item está em conferência (só a criação checa). | O externo pede prazo, depois envia o comprovante (item em conferência, prazo pausado) e o coordenador aprova a prorrogação durante a conferência. O prazo muda enquanto está pausado. Não quebra nada (a pausa e o prazo novo se combinam), mas a análise não cobre o caso. | Registrar como comportamento aceito ou bloquear a aprovação em conferência (pergunta 3). |
| 5 | baixa | `migration.sql:137-163` e `pedidos-prazo-regras.ts:28-35` | A regra da próxima ocorrência existe agora em três lugares (TS, SQL e a função de agenda do mesmo TS). O teste de integração cobre um caso (31/01 → 01/02). Eu verifiquei o SQL por inteiro (seção 1), mas nada na suíte impede uma divergência futura. | Alguém muda `calcularProximaOcorrencia` e esquece a cópia em SQL: a tela aceita a data e o banco recusa, ou o contrário. | Acrescentar à integração uma grade curta (âncoras 29, 30 e 31, passos 1 e 3) comparando o SQL com `calcularProximaOcorrencia`. Pode ficar para depois da integração. |

**Severidade:** crítica = vaza dado, fura permissão ou quebra regra de negócio; alta = falha provável em uso normal; média = falha em caso de borda ou teste faltando; baixa = estilo, clareza ou melhoria.

## 3. O que está bom

- O gatilho do caminho delegado é o ponto mais delicado da tarefa e ficou sólido: condição por dono da tabela, só `prazo` muda e a mensagem de erro é clara.
- O novo responsável de um item enxerga só `pendente` (função `estado_pedido_prazo`), sem autor, motivo ou histórico, como a tarefa pedia.
- Chave de idempotência por destinatário também no canal só e-mail, e o teste de integração cobre esse caso.
- A tela pede confirmação quando o prazo mudou desde a abertura, e o banco confere o mesmo valor, em vez de confiar no cliente.
- O diálogo, o cartão e o painel funcionam em 375 px (a jornada confere rolagem horizontal) e reaproveitam `Cartao` e `botoes` sem mexer em `src/ui`.
- O relato de verificação é honesto (cita a recusa conhecida do Next e a falha inicial não reproduzida em `origin/staging`).

## 4. Falhas preexistentes encontradas

Nenhuma nova. Não rodei as jornadas de navegador, então não reproduzi a falha inicial de "Meus projetos" que o Codex relatou.

## 4.1 Reconferência da correção do achado 1 (commit `9e97e26`)

- O commit altera só a migration (a condição de item fechado e o gatilho de cancelamento) e acrescenta o teste de integração (tarefa concluída ou cancelada, com recusa da decisão e do novo pedido). Nenhum arquivo fora do escopo.
- O Codex corrigiu a migration no lugar e atualizou as funções nos bancos de teste à mão. Para não depender disso, apliquei **todas** as migrations da branch em um banco descartável (`prisma migrate deploy`, banco apagado depois): aplicam sem erro e as duas funções saem com o texto novo. Quem já aplicou a migration antiga em um banco local (o `multiplus_dev`, por exemplo) precisa recriar essas duas funções ou refazer o banco, porque o Prisma não reaplica migration alterada.
- Resultado informado pelo Codex: typecheck, lint, 395 unitários, 372 de integração e smoke e 10 jornadas passam. Não os repeti.
- Achado 1: **resolvido**. Veredito final: **aprovar** para integração; os achados 2 a 5 seguem como perguntas e melhorias, sem bloquear.

## 5. Perguntas para a pessoa responsável

1. **Subtarefas da próxima ocorrência (achado 2).** Quando a tarefa recorrente tem o prazo prorrogado, as subtarefas copiadas devem manter a mesma distância da data da série (05/02 no exemplo) ou a distância ao prazo vigente (26/01)? Recomendação: manter a distância em relação à data da série, o que exige ajustar `concluir_tarefa` (regra de prazo, fora do escopo do Codex, tarefa separada).
2. **Retirada pela administração (achado 3).** A administração pode retirar o pedido do externo ou só recusar? Recomendação: só o autor retira; a administração recusa.
3. **Aprovar em conferência (achado 4).** Pode aprovar prorrogação enquanto o item está em conferência? Recomendação: sim, sem mudança (a pausa continua valendo).

**Respostas do usuário (2026-11-24): seguir as três recomendações.** Achado 2: medir pela data da série, com [análise](../analises/subtarefas-da-recorrencia-prorrogada.md) aguardando aprovação. Achado 3: só o autor retira, corrigido pela migration `20261124140000_pedido_prazo_so_autor_retira`. Achado 4: mantido como está.
