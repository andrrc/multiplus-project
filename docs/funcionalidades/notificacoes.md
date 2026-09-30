# Notificações

- **Última revisão:** 2026-09-30, no commit a registrar do `staging`.
- **Requisitos:** RF-007, RF-022, RF-023.
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
| Tarefa concluída | Uma tarefa é concluída | Sim | Não | Não |
| Projeto concluído | O projeto é marcado como concluído | Sim | Não | Não |
| Novo comentário | Alguém comenta | Sim | Sim | Não |
| Atribuição recebida | Previsto, mas **nunca disparado** (ver limitações) | Sim | Sim | Não |

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
- **Teste:** `notificacoes-rf022.integration.test.ts`, com as combinações de canais, menção
  e atribuição recebida.
- **Falhas:** erro de e-mail não bloqueia a ação que gerou o aviso.

### N3. Aviso de prazo próximo (RF-007)

Descrito em `tarefas.md`, na seção T9. A antecedência padrão é de 7 dias e pode ser
alterada nesta tela.

### N4. Conclusão de tarefa e projeto (RF-023)

**Como funciona.** Concluir uma tarefa ou marcar um projeto como concluído gera um aviso
conforme as preferências.

**Detalhes técnicos.**
- **Disparo:** acontece nas actions de `src/app/(painel)/projetos/actions.ts`.
- **Deduplicação:** usa `dedupeKey`, uma por registro e momento da conclusão.
- **Teste:** `notificacoes-email.unit.test.ts`, que cobre a renderização, o escape do
  conteúdo e o link interno.

---

## Limitações e pendências conhecidas

| # | Situação | Efeito |
|---|---|---|
| L1 | **Nenhum agendador chama o job de prazo** (`/api/jobs/notificacoes-prazo`). | Avisos de prazo nunca são disparados. Ver L1 em `tarefas.md`. |
| L2 | **Eventos sem destinatário explícito vão para todos os usuários ativos dos perfis habilitados.** Isso vale para comentário sem menção, tarefa concluída e projeto concluído. | Colaboradores recebem avisos, com nome e link, de registros a que não têm acesso. Hoje afeta comentários (ver L1 em `comentarios-mencoes.md`). Afeta conclusões se a Administradora ativar esses avisos para colaboradores. |
| L3 | Colaboradores não têm a central de notificações no menu. | Os avisos no sistema gravados para eles não aparecem em nenhuma tela. Só o e-mail chega. |
| L4 | A antecedência por tarefa é ignorada. Ver L2 em `tarefas.md`. | — |

## Histórico de alterações

| Data | Commit | Alteração |
|---|---|---|
| 2026-09-30 | a registrar | Preferências controlam também menções e atribuições recebidas ([análise](../analises/controle-total-notificacoes.md)) |
| 2026-09-29 | `f2ebb80` | Semáforo configurável compartilhado entre projetos, tarefas e subtarefas ([análise](../analises/semaforo-prazos-projetos-tarefas.md)) |
| 2026-09-17 | `5827166` | Healthcheck e CI (base para o job) |
| 2026-09-17 | `022fec0`, `d6ed6d1`, `dc16183` | Disparo de notificações, templates de e-mail e central de notificações (Sprint 4B) |
| 2026-09-18 | `a567583` | Correção do modelo de preferências |
