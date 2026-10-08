# Notificações

- **Última revisão:** 2026-10-02, implementação da Sprint 6.
- **Requisitos:** RF-007, RF-022, RF-023, RF-050.
- **Módulos relacionados:** Tarefas, Projetos, Comentários.

## Visão geral

O sistema avisa sobre acontecimentos importantes **dentro do sistema** (central de
notificações) e **por e-mail**. A Administradora escolhe quais eventos cada perfil recebe
e por qual canal, e define com quantos dias de antecedência o prazo de uma tarefa é
avisado.

### Eventos e padrão de cada perfil

| Evento | Quando acontece | ADMIN | ADMIN_INTERNO e ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Prazo próximo | A tarefa vence dentro da antecedência | Sim | Sim | Não |
| Tarefa concluída | Uma tarefa é concluída | Somente Talita, se a preferência ADMIN estiver habilitada | Não | Cliente vinculado, se a preferência CLIENTE estiver habilitada |
| Projeto concluído | O projeto é marcado como concluído | Somente Talita, se a preferência ADMIN estiver habilitada | Não | Cliente vinculado, se a preferência CLIENTE estiver habilitada |
| Novo comentário | Alguém comenta em registro acessível | Conforme acesso e preferência | Conforme acesso e preferência | Cliente vinculado recebe aviso sem conteúdo, se habilitado |
| Atribuição recebida | Nova atribuição de projeto, tarefa ou subtarefa | Sim | Sim | Não |

## Quem pode fazer o quê

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Ver a central de notificações | Sim | Não (sem menu) | Não (sem menu) | Não |
| Configurar preferências por perfil e limites do semáforo | Sim | Não | Não | Não |

---

## Funcionalidades

### N1. Central de notificações

**Como funciona.**
- **Lista:** avisos recentes, com as não lidas destacadas, o link "Abrir registro",
  "Marcar como lida" e "Marcar todas como lidas".

**Detalhes técnicos.**
- **Rota:** `/notificacoes`.
- **Funções:** `listarNotificacoes` (últimas 50), `marcarNotificacaoLida` e
  `marcarTodasNotificacoesLidas`.

### N5. Configuração global do semáforo

**Como funciona.** O ADMIN configura os limites em dias úteis para vermelho e amarelo. Verde começa acima do limite amarelo. A configuração se aplica a projetos, tarefas e subtarefas. Padrão: vermelho até 5 e amarelo até 10; sábados e domingos são excluídos.

A configuração visual é independente do prazo de antecedência dos e-mails. `diasAntecedenciaPadrao` e o job de notificações de prazo permanecem preservados.

**Detalhes técnicos.** Singleton `ConfiguracaoSemaforo` em `configuracoes_semaforo`, com RLS permitindo leitura autenticada e atualização somente por ADMIN. Consulta/validação em `src/lib/semaforo.ts`, editor em `/notificacoes`. Migration `20260929100000_configuracao_semaforo`.



### N2. Preferências por perfil e canal (RF-022)

**Como funciona.** Para cada perfil e cada evento, a Administradora liga ou desliga o
aviso no sistema e o e-mail. A escolha vale para todas as pessoas ativas daquele perfil.
Menções e confirmações em comentários seguem as mesmas opções de canal de “Novo comentário”.
Quando alguém recebe uma atribuição de projeto, tarefa ou subtarefa, o evento “Atribuição
recebida” é enviado pelos canais configurados para o perfil da pessoa.

**Detalhes técnicos.**
- **Tabela:** `PreferenciaNotificacao`, com uma linha por perfil e evento.
- **Funções:** `atualizarPreferenciaNotificacao`, `dispararEventoNotificacao`,
  `dispararNotificacoesMencaoComentario` e `dispararNotificacaoAtribuicaoRecebida`.
- **Teste:** `notificacoes-rf022.integration.test.ts`, com as combinações de canais, menção,
  atribuição recebida e falha de envio no endpoint com fixture de prazo futuro.
- **Falhas:** erro de e-mail não bloqueia a ação que gerou o aviso.
- **Audiência:** `dispararEventoNotificacao` exige `usuarioIds`; lista vazia não envia. Comentários usam usuários ativos com acesso ao alvo. Eventos de conclusão direcionam somente à conta ADMIN da Talita e não notificam o executor. Preferências por perfil/canal continuam valendo.

### N3. Aviso de prazo próximo (RF-007)

Descrito em `tarefas.md`, na seção T9. A antecedência global pode ser alterada nesta tela;
quando a tarefa define sua própria antecedência, ela prevalece. O job é preparado para
execução diária às 08:00 (horário de Brasília). A última tentativa e as métricas do último
sucesso aparecem nesta página, exclusiva do ADMIN.

### N4. Conclusão de tarefa e projeto (RF-023)

**Como funciona.** Concluir uma tarefa ou marcar um projeto como concluído gera um aviso
conforme as preferências.

**Detalhes técnicos.**
- **Disparo:** acontece nas actions de `src/app/(painel)/projetos/actions.ts`.
- **Deduplicação:** usa `dedupeKey`, uma por registro e momento da conclusão.
- **Teste:** `notificacoes-email.unit.test.ts`, que cobre a renderização, o escape do
  conteúdo e o link interno.

**Detalhes técnicos do job de prazo.** A rota exige `CRON_SECRET` em bearer; o deploy valida
e entrega o segredo ao container. `ops/disparar-notificacoes-prazo.sh` pode ser agendado
após o deploy. A observabilidade grava tentativa/estado e, no sucesso, tarefas processadas,
e-mails enviados e notificações in-app criadas. `RegistroEnvioPrazo` impede repetição por
tarefa/dia/destinatário e não é acessível pela role `multiplus_app`.

---

## Limitações e pendências conhecidas

| # | Situação | Efeito |
|---|---|---|
| L1 | O código do agendador e o script estão prontos, mas a linha de cron ainda precisa ser instalada na VPS pelo usuário. | Avisos não serão disparados automaticamente até a ativação e confirmação da primeira execução. Ver [procedimento](../../ops/README.md#avisos-diários-de-prazo) e L1 em `tarefas.md`. |
| L2 | Colaboradores não têm a central de notificações no menu. | Os avisos no sistema gravados para eles não aparecem em nenhuma tela. Só o e-mail chega. |
| L3 | CLIENTE ainda não tem uma caixa própria para notificações in-app. | Se o canal in-app for ligado para CLIENTE, o aviso é gravado, mas não aparece numa página do cliente; e-mail permanece funcional. |

## Histórico de alterações

| Data | Commit | Alteração |
|---|---|---|
| 2026-10-08 | pendente | Fixture temporal do RF-022 garante que o job processe tarefa e exercite o retorno HTTP 500 ([análise](../analises/fixture-temporal-notificacoes-rf022.md)) |
| 2026-10-02 | `b81feaf` | Preferências CLIENTE começam desligadas; conclusões e comentários podem avisar somente clientes vinculados, com link do próprio portal ([análise](../analises/area-exclusiva-cliente-sprint-6.md)) |
| 2026-10-01 | `2154bb3` | Aplicar antecedência por tarefa, deduplicar canais, medir execuções e preparar cron diário ([análise](../analises/agendador-avisos-prazo.md)) |
| 2026-10-01 | 83f7524 | Lista obrigatória de destinatários, conclusão somente para Talita e audiência por acesso ([análise](../analises/notificacao-comentario-com-acesso.md)) |
| 2026-09-30 | 011bc10 | Corrigir a documentação do disparo de atribuição recebida |
| 2026-09-30 | ce3b73f | Preferências controlam menções, confirmações do autor e avisos de novas atribuições ([análise](../analises/controle-total-notificacoes.md)) |
| 2026-09-29 | `f2ebb80` | Semáforo configurável compartilhado entre projetos, tarefas e subtarefas ([análise](../analises/semaforo-prazos-projetos-tarefas.md)) |
| 2026-09-17 | `5827166` | Healthcheck e CI (base para o job) |
| 2026-09-17 | `022fec0`, `d6ed6d1`, `dc16183` | Disparo de notificações, templates de e-mail e central de notificações (Sprint 4B) |
| 2026-09-18 | `a567583` | Correção do modelo de preferências |
