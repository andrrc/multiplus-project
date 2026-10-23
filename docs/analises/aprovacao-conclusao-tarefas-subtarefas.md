# Análise: aprovação da conclusão de tarefas e subtarefas

- **Data:** 2026-10-22
- **Pedido original:** "Estruturar a parte de conclusão de subtarefas/tarefas. A Talita explicou que quando um colaborador conclui algo, se caso ele concluiu algo por engano, não tem como voltar atrás, e deveríamos ter como voltar atrás porque o colaborador interno pode errar, ai o que ela gostaria de acrescentar é quando um colaborador marca como concluído e ela confirmar aquela conclusão, ai se ela confirmar, realmente o usuário não vai poder mais editar."
- **Status:** aprovada em 2026-10-22

## 1. Escopo previsto

- Aplicar aprovação a tarefas e subtarefas concluídas por ADMIN_INTERNO ou ADMIN_EXTERNO, respeitando exatamente as permissões existentes para concluir cada tipo de item.
- Em vez de concluir imediatamente, o colaborador cria uma solicitação pendente. O status operacional do item fica inalterado enquanto aguarda decisão.
- O solicitante pode cancelar o próprio pedido pendente. ADMIN pode aprovar ou rejeitar. A rejeição encerra o pedido e mantém o status operacional anterior; pode incluir comentário opcional.
- A aprovação altera o status para `CONCLUIDO`. A partir daí, o colaborador não pode alterar o item; ADMIN preserva a capacidade de editar ou reabrir pelos fluxos atuais.
- Registrar histórico de pedidos, solicitantes, decisões e autores das decisões. Permitir no máximo uma solicitação pendente por item.
- Criar uma fila administrativa central e permitir chegar a cada pedido por notificações. Adicionar evento configurável usando os canais de e-mail e in-app existentes; notificar o solicitante do resultado.
- Efeitos de conclusão (indicadores, portal e notificação de tarefa concluída) passam a ocorrer somente após aprovação. Tarefa recorrente gera a próxima ocorrência somente na aprovação.
- Conclusões que já existem na implantação são consideradas aprovadas e não entram na fila. Sem alteração do comportamento de projetos ou de comentários.

## 2. Permissões

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Solicitar conclusão de tarefa | Sim; também pode concluir diretamente pelo fluxo administrativo | Sim, conforme o vínculo/autorização existente | Sim, conforme o vínculo/autorização existente | Não |
| Solicitar conclusão de subtarefa | Sim; também pode concluir diretamente pelo fluxo administrativo | Sim, somente se for o responsável | Sim, somente se for o responsável | Não |
| Ver fila de pedidos pendentes | Sim | Não | Não | Não |
| Ver o pedido e a decisão de um item | Sim | Solicitante e usuários já autorizados a ver o item; respeitar escopo contextual | Solicitante e usuários já autorizados a ver o item; respeitar escopo contextual | Não recebe detalhes de pedidos |
| Cancelar pedido pendente | Sim | Somente o próprio pedido | Somente o próprio pedido | Não |
| Aprovar ou rejeitar | Sim | Não | Não | Não |
| Editar/reabrir item após aprovado | Sim | Não | Não | Não |

As ações precisam ser protegidas no servidor e pelo RLS/banco. Não confiar em botões ocultos. A solicitação deve validar item ativo, acesso atual e autorização de conclusão. O histórico não deve conceder acesso ao item por conhecer seu ID.

## 3. Dados

- Criar uma entidade de solicitação de conclusão com tipo/identificador do item, vínculo opcional a tarefa ou subtarefa, estado (`PENDENTE`, `APROVADA`, `REJEITADA` ou `CANCELADA`), status do item no momento do pedido, solicitante/data, decisor/data e comentário opcional da decisão.
- Garantir no banco que cada solicitação aponte para exatamente uma tarefa ou subtarefa e que exista no máximo um pedido pendente por item. Preservar pedidos anteriores para auditoria.
- O status existente de tarefa/subtarefa permanece inalterado enquanto o pedido estiver pendente ou rejeitado. Logo, pedidos pendentes não entram em contagens de concluídos, indicadores de progresso nem no portal do cliente.
- Não reclassificar nem exigir aprovação retroativa de itens que já estão `CONCLUIDO` na implantação. Sem backfill de status dos itens; pedidos novos não alteram o status até a aprovação.
- Adicionar evento próprio de notificação para solicitação/decisão, integrado a `EventoNotificacao` e às preferências existentes por perfil/canal. A notificação de tarefa concluída e o disparo de recorrência são exclusivos da aprovação.
- Não há novos campos sensíveis de cliente. Expor comentário e identidades da solicitação somente a ADMIN e a usuários autorizados ao item.

## 4. Impacto em telas e funções existentes

| Arquivo/área | Impacto previsto |
|---|---|
| `src/lib/projetos-tarefas.ts` | Separar solicitação, cancelamento e decisão; preservar regras existentes de autorização. Aprovação de tarefa precisa continuar atômica com a criação da ocorrência recorrente e cópia de subtarefas. |
| `src/app/(painel)/projetos/actions.ts` | Adicionar server actions para pedir/cancelar/decidir; enviar notificações somente após transação bem-sucedida e revalidar as telas afetadas. |
| `src/app/(painel)/minhas-tarefas/[id]/page.tsx` e `src/app/(painel)/tarefas/[id]/page.tsx` | Trocar a ação imediata do colaborador por solicitar/retirar pedido e mostrar estado pendente ou decisão. Exibir ações de decisão somente para ADMIN. |
| Painel de `/subtarefas` e `/notificacoes` | Disponibilizar fila com tarefas e subtarefas pendentes e links das notificações para os respectivos itens. Incluir estados vazio/erro/sem permissão. |
| `src/lib/notificacoes.ts`, preferência e template | Adicionar evento e destinatários corretos: ADMIN ao receber pedido; solicitante ao receber decisão. Respeitar preferências de e-mail e in-app e evitar duplicidade após reenvios. |
| `prisma/schema.prisma` e nova migration | Criar enum/modelo de solicitação, relações, índices, invariantes e políticas RLS/GRANT. A migration deve partir das funções SQL mais recentes; `concluir_tarefa` parte de `20260928170000_dia_semana_recorrencia`. |
| `tests/integration` e smoke | Cobrir autorização por perfil e vínculo, histórico, efeitos da aprovação, cancelamento, recorrência, RLS e notificações. |
| `docs/SRS_Multiplus_Software_v1.0.md`, `docs/funcionalidades/tarefas.md`, `docs/funcionalidades/subtarefas.md`, `docs/funcionalidades/notificacoes.md` e `docs/decisoes-desenvolvimento.md` | Formalizar a regra, os novos estados/ações e a decisão no índice cronológico. |

Foram localizados os fluxos atuais em `concluirTarefa`, `concluirSubtarefa`, `atualizarStatusTarefa` e `atualizarStatusSubtarefa`; a função SQL `concluir_tarefa` cria a recorrência. O detalhe do colaborador usa `concluirTarefaFormAction` e `concluirSubtarefaFormAction`. ADMIN já tem edição de status nas telas administrativas. Notificações de conclusão e progresso do portal dependem do status efetivo `CONCLUIDO`.

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| Outro colaborador solicita ou cancela pedido alheio | Validar sessão, perfil, responsável/vínculo e autor do pedido no servidor e no banco | Integração: responsável permitido; colega, perfil sem vínculo e solicitante diferente recebem erro RN esperado |
| ADMIN_INTERNO ou ADMIN_EXTERNO aprova via chamada direta | Exigir ADMIN em action, função de domínio e RLS | Integração: ambos os perfis colaboradores e CLIENTE não decidem; ADMIN decide |
| Acesso a pedido de tarefa de outro cliente pelo ID | Consultar o registro pelo vínculo autorizado; ADMIN vê a fila, requester vê sua solicitação | Integração: trocar IDs não revela solicitação nem comentário |
| Duas solicitações concorrentes para o mesmo item | Restrição/índice único parcial no banco para estado pendente e transição atômica | Integração: chamadas simultâneas resultam em apenas um pedido pendente |
| Pedido pendente parecer conclusão efetiva | Manter status existente até aprovação; não incluir pendências em agregações ou efeitos | Integração: status, contagem do portal, semáforo e notificação de conclusão permanecem não concluídos |
| Aprovação recorrente duplicar próxima ocorrência ou copiá-la antes da decisão | Executar decisão, conclusão e criação da recorrência na mesma transação/operação idempotente | Integração: pedir/cancelar/rejeitar não cria ocorrência; aprovação cria uma única ocorrência com subtarefas uma única vez |
| Notificação enviada antes do commit, duplicada ou para perfil sem acesso | Disparar após sucesso; calcular destinatários por solicitação/decisão e deduplicar por evento | Integração: preferências email/in-app independentes, nenhum aviso em cancelamento, decisão enviada ao solicitante |
| Alteração de regra no trigger RN-007 ou RN-004 apagar proteção existente | Atualizar a função a partir da migration mais recente e preservar verificações de NULL e vínculo | Integração: regressões do responsável por subtarefa e dos vínculos de tarefa permanecem bloqueadas |
| Registro antigo concluído parar de aparecer como concluído | Tratar ausência de solicitação como histórico anterior já confirmado | Integração: tarefa/subtarefa `CONCLUIDO` anterior segue nos agregados e fora da fila |
| Decisão concorrente entre ADMINs ou edição durante aprovação | Bloquear a linha/solicitação na transação; validar pendência e status atual antes de decidir; restaurar status capturado se rejeitado | Integração: apenas uma decisão efetiva; segundo decisor recebe estado já resolvido; status original preservado mesmo após edição ADMIN durante a pendência |
| Aprovação/rejeição ficar inacessível em tela pequena | Layout responsivo com cartões e botões com alvo mínimo de 44 px | Smoke visual a 375 px e desktop; ausência de rolagem horizontal |

Também verificados: sem upload, links externos ou datas civis novas; comentário da decisão é texto simples e opcional. Não há necessidade de campos de cliente ou mascaramento de contato. Manter os filtros atuais de ativos e autorização em consultas da fila.

## 6. Casos-limite e estados

- Estados: sem pedidos; pedido pendente; item concluído anteriormente; pedido cancelado; rejeitado sem comentário; rejeitado com comentário; item/tarefa desativado; erro de rede/decisão concorrente; acesso negado.
- Não permitir novo pedido se o item estiver concluído, cancelado ou desativado, ou se já houver pedido pendente.
- O cancelamento do pedido não altera status, progresso, prazo ou recorrência.
- Ao rejeitar, restaurar o status que estava vigente quando o pedido foi criado, mesmo se ADMIN o tiver alterado enquanto o pedido aguardava. Comentário é opcional.
- Ao aprovar, tarefas recorrentes criam apenas a próxima ocorrência prevista por RN-008; uma repetição da aprovação não duplica a ocorrência.
- Se o item for desativado enquanto aguarda, não permitir aprovar nem incluir em listagens operacionais; ADMIN pode consultar histórico preservado.
- Reabrir item aprovado é ação ADMIN pelo fluxo de edição existente; não gera novo pedido automaticamente. Nova conclusão de colaborador após reabertura exige nova solicitação.
- Comentários existentes permanecem disponíveis conforme permissões atuais; o bloqueio pós-aprovação refere-se à edição/conclusão do item.
- Atualizar resultado na tela imediatamente após solicitação ou decisão e preservar navegação por link de notificação.

## 7. Interface

- No detalhe da tarefa/subtarefa, colaborador autorizado vê “Solicitar conclusão”; com pedido próprio pendente vê “Retirar solicitação”; após aprovação vê o status concluído sem ação de edição/conclusão.
- ADMIN tem fila única de pedidos em `/subtarefas`, identificando tipo do item, cliente/projeto/tarefa, responsável/solicitante, data e ações “Confirmar” e “Rejeitar”. Rejeitar oferece comentário opcional.
- Caixa de notificações usa links diretos para a fila ou item. Pedido aparece para Talita; resultado aparece para o solicitante.
- No celular, a fila vira cartões, formulário de decisão fica em coluna e a tela não ganha rolagem horizontal. Reutilizar tokens e componentes existentes da identidade visual.

## 8. Plano de testes

- Integração: permissões e recusas RN-007/RN-004 por perfil, atribuição, projeto e solicitante; RLS de leitura e gravação; concorrência; histórico e comentário; cancelamento; aprovação/rejeição.
- Integração: status e progresso antes/depois da decisão; visibilidade no portal; notificação da solicitação, resultado e conclusão; preferências por canal; ausência de notificação no cancelamento.
- Integração de recorrência: nenhuma ocorrência no pedido/rejeição/cancelamento; aprovação atômica gera uma ocorrência e copia subtarefas; repetição idempotente.
- Unitário: apresentação do estado, botões por perfil, validação de comentário opcional e links/estado da fila.
- Smoke visual: fluxo completo em 375 px e desktop com ADMIN_INTERNO, ADMIN_EXTERNO e ADMIN.
- Verificação completa antes do commit/push, conforme o repositório: `npx prisma generate`, `npm run typecheck`, `npm run lint` e `npm test`. Publicação apenas com suíte verde; depois acompanhar CI, deploy e `/api/health`.

## 9. Perguntas em aberto

1. Aplicar a aprovação a tarefas e subtarefas? — **Resposta:** sim, conforme plano aprovado pelo usuário em 2026-10-22.
2. Abranger ADMIN_INTERNO e ADMIN_EXTERNO e permitir retirada pelo solicitante? — **Resposta:** sim; retirada encerra apenas o pedido, sem alterar status.
3. Quem decide, como rejeita e qual efeito da aprovação? — **Resposta:** somente ADMIN; rejeição preserva o status operacional anterior e aceita comentário opcional; aprovação bloqueia edição do colaborador, mantendo ADMIN com permissão de editar/reabrir.
4. Onde revisar e como notificar? — **Resposta:** fila central em `/subtarefas`, acesso também por notificações, evento configurável nos canais existentes e aviso de resultado ao solicitante.
5. Como tratar conclusões já existentes? — **Resposta:** considerá-las aprovadas; não criar pedidos retroativos.
