# Análise: padronização de horários em Brasília

- **Data:** 2026-10-20
- **Pedido original:** "O horário da VPS eu acredito que esteja errado. Preciso verificar em todos os lugares. [...] Preciso investigar."
- **Status:** aprovada em 2026-10-20
- **Aprovação:** usuário solicitou explicitamente implementar o plano apresentado, com Brasília em todas as telas e sem alterar o fuso global da VPS.

## 1. Escopo previsto
Centralizar a apresentação de instantes em America/Sao_Paulo. Corrigir comentários, notificações, horários do job, última movimentação do portal e reaproveitar o padrão na criação de tarefas/subtarefas. Agenda e avisos passam a usar o dia de Brasília. Preservar datas civis de prazos e registros históricos. Não criar agendamentos nem alterar infraestrutura ou outros sistemas da VPS.

Diagnóstico por leitura: VPS sincronizada via NTP, em Europe/Berlin; aplicação e PostgreSQL em UTC. Os três relógios concordam no instante. Portal e notificações formatam em UTC; comentários omitem fuso. Agenda e job usam dia UTC. Nenhum cron de avisos foi encontrado nos locais inspecionados; acionamento externo não foi descartado.

## 2. Permissões
Nenhuma alteração. Cada tela mantém sua autorização e os mesmos campos já disponíveis.

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Agenda e central de notificações | Sim | Não | Não | Não |
| Ler comentários/identificação de criação | Conforme acesso atual | Conforme vínculo atual | Conforme vínculo atual | Não |
| Última movimentação no portal | Não pelo portal | Não pelo portal | Não pelo portal | Projetos próprios ativos |

## 3. Dados
Sem campo, schema, migration ou backfill. Instantes permanecem em UTC; prazos continuam representados como datas em meia-noite UTC. Helpers internos recebem Date e retornam texto ou data civil de referência. Nulos mantêm as mensagens atuais. Não deslocar registros históricos sem evidência de erro na gravação.

## 4. Impacto em telas e funções existentes
- src/lib/datas.ts: formatação compartilhada e dia de Brasília já usado pelo semáforo/atraso.
- src/lib/notificacoes.ts: dispararPrazoProximo, janela e dedupeKey diária.
- src/app/(painel)/agenda/page.tsx: mês inicial e destaque de hoje.
- src/app/(painel)/notificacoes/page.tsx: aviso e execução do job.
- src/app/(painel)/portal/page.tsx e portal/[id]/page.tsx: última atualização.
- src/app/(painel)/projetos/comentarios.tsx: componente usado em projetos, tarefas e subtarefas, também nas visões dos colaboradores.
- src/app/(painel)/tarefas/[id]/page.tsx e minhas-tarefas/[id]/page.tsx: autoria/criação de tarefa e subtarefa.
- Sem alteração na função SQL ultima_atualizacao_portal ou no controle de acesso.

## 5. Riscos e segurança
| Risco | Mitigação | Teste que cobre |
|---|---|---|
| Horário três horas adiantado ou dependente do servidor | Fuso explícito no helper | Unitários com instante conhecido e processos em UTC, Berlim e São Paulo |
| Virar dia, mês ou ano às 21h | Dia civil de Brasília compartilhado | Unitários da agenda e datas nos limites de meia-noite |
| Deslocar vencimentos para o dia anterior | Não converter datas civis como instantes | Agenda com prazo em meia-noite UTC e integração do aviso com data exata |
| Aviso omitir hoje ou incluir amanhã antes da hora | Janela ancorada no dia de Brasília | Integração antes/depois de meia-noite |
| Duplicar avisos às 21h ou suprimir no próximo dia | Chave por tarefa/dia de Brasília/destinatário | Integração de deduplicação entre 20h59, 21h e meia-noite |

Autorização, RLS, IDOR, campos sensíveis, views, comparações NULL, mass assignment, validação de formulário, unicidade de cadastro, registros inativos, SQL redefinido, links e upload: não se aplica mudança; consultas e políticas existentes ficam preservadas. Destinatários e filtros de ativos permanecem cobertos pela suíte de notificações e portal. Nenhum novo dado enviado ao navegador ou e-mail.

## 6. Casos-limite e estados
Cobrir 02:59:59Z/03:00:00Z, viradas de mês/ano, horário 00 em vez de 24 e ausência de movimentação. Manter vazio/erro/sem permissão atuais. Sem nova entidade, listagem, edição, concorrência ou paginação.

## 7. Interface
Mesmos componentes, tokens e estrutura do PDD; texto da central informa Brasília. Conferir desktop e 375 px; eventual impossibilidade deve ser reportada.

## 8. Plano de testes
Primeiro reproduzir falhas. Unitários para formatação e agenda; integração do job para janela/deduplicação. Executar prisma generate, typecheck, lint e npm test completos. Publicar em staging e acompanhar CI/deploy/healthcheck 200. Documentar os módulos afetados no mesmo commit.

## 9. Perguntas em aberto
Nenhuma. Em 2026-10-20, usuário escolheu Brasília em todas as telas e correção apenas do Multiplus. O pedido posterior de implementação aprovou o plano. Não se aplica confirmação adicional.
