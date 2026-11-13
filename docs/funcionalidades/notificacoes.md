# Notificações

- **Última revisão:** 2026-11-03.
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
| Solicitação de conclusão | Colaborador pede conclusão ou recebe a decisão de Talita | Pedido recebido, se habilitado | Resultado do próprio pedido, se habilitado | Não |
| Tarefa concluída | Uma tarefa é confirmada como concluída | Somente Talita, se a preferência ADMIN estiver habilitada | Não | Cliente vinculado, se a preferência CLIENTE estiver habilitada |
| Projeto concluído | O projeto é marcado como concluído | Somente Talita, se a preferência ADMIN estiver habilitada | Não | Cliente vinculado, se a preferência CLIENTE estiver habilitada |
| Novo comentário | Alguém comenta em registro acessível | Conforme acesso e preferência | Conforme acesso e preferência | Cliente vinculado recebe aviso sem conteúdo, se habilitado |
| Atribuição recebida | Nova atribuição de projeto, tarefa ou subtarefa | Sim | Sim | Não |

## Quem pode fazer o quê

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Ver a central de notificações | Sim | Sim, em `/minhas-notificacoes` | Sim, em `/minhas-notificacoes` | Não |
| Configurar preferências por perfil e limites do semáforo | Sim | Não | Não | Não |

---

## Funcionalidades

As caixas de notificações são apresentadas como **Avisos** no menu e no título, mantendo as rotas, os dados e as ações existentes.


### N1. Central de notificações

**Como funciona.**
- **Lista:** avisos recentes, com um ponto azul nas não lidas, o link "Abrir registro",
  "Marcar como lida" e "Marcar todas como lidas".
- **Sino:** ADMIN, ADMIN_INTERNO e ADMIN_EXTERNO acessam a própria caixa pelo menu. Para
  ADMIN, o sino mostra também o contador de não lidas e abre `/notificacoes`. Não há prévia
  suspensa. Avisos in-app novos aparecem como toast no canto inferior direito; ao entrar no
  painel, um toast resume a quantidade de não lidas. Abrir a central marca as não lidas da
  própria conta como lidas.
- Em telas estreitas, o texto do aviso e a data ocupam linhas próprias quando necessário.
  Nas preferências, o nome do evento fica acima dos controles quando falta espaço; E-mail,
  App e Salvar permanecem juntos e alinhados. Com largura suficiente, o nome fica à esquerda
  e os controles à direita, sempre em uma única linha.

**Detalhes técnicos.**
- **Rotas:** `/notificacoes` para ADMIN e `/minhas-notificacoes` para ADMIN_INTERNO e
  ADMIN_EXTERNO. Cada rota aparece no menu do perfil correspondente.
- **Menu:** o sino e contador de não lidas (99+ quando ultrapassa 99) são compartilhados
  entre desktop e mobile. O contador é consultado no servidor ao carregar o painel; a caixa
  completa continua exibindo as 50 notificações mais recentes.
- **Funções:** `listarNotificacoes` (últimas 50), `contarNotificacoesNaoLidas`,
  `marcarNotificacaoLida` e `marcarTodasNotificacoesLidas`.

### N7. Toasts em tempo real

**Como funciona.** Notificações in-app novas aparecem sem recarregar o painel. Cada cartão
mostra título, mensagem, horário, ícone por tipo, botão de fechar e barra de seis segundos.
O relógio pausa quando o cartão recebe o mouse ou foco. No máximo três cartões aparecem ao
mesmo tempo; os seguintes entram na fila. O resumo de entrada abre a central. Clicar num
aviso individual marca somente aquele aviso como lido e abre seu registro; quando não há
destino, abre a central. Abrir a central marca todas as não lidas próprias. Em múltiplas
abas, cada aba ativa recebe os avisos e sincroniza leituras.

**Detalhes técnicos.** O evento `NOTIFY` do PostgreSQL é disparado depois do commit por
trigger em `notificacoes`, com apenas id, usuário, estado de leitura e horário. A rota
`/api/notificacoes/stream` mantém SSE autenticado no runtime Node, filtra sinais pela sessão
e busca somente campos da notificação própria sob RLS. Cursor SSE recupera avisos não lidos
da janela recente depois de reconexão. A rota fecha a conexão ao desconectar ou invalidar a
sessão. Estilos derivados: tarefa/projeto concluído (sucesso), prazo e solicitação (aviso),
comentário e atribuição (informação); o estilo erro fica disponível sem evento atual.
`ToastNotifications` é compartilhado pelo layout do painel; o resumo é único por sessão e
reinicia quando uma nova autenticação começa. A central marca as próprias não lidas ao ser
aberta. Em desenvolvimento, ADMIN pode usar “Gerar toasts de demonstração” na central para
mostrar os quatro estilos na aba atual. Os exemplos são temporários no navegador, não entram
no banco e não alteram contador, e-mail ou SSE. Cada clique substitui os exemplos anteriores.
O controle não aparece em produção e deve ser removido antes do lançamento na VPS.
Cobertura em `notificacoes-toasts.unit.test.ts`,
`notificacoes-realtime.integration.test.ts` e `tests/browser/notificacoes.spec.ts`.

### N5. Configuração global do semáforo

**Como funciona.** O vermelho é reservado ao prazo vencido. O ADMIN configura um único limite, "Amarelo até (dias)": do dia do prazo até esse limite o indicador fica âmbar, e acima dele, verde. A configuração se aplica a projetos, tarefas e subtarefas. Padrão: 5 dias corridos; sábados, domingos e feriados contam.

A configuração visual é independente do prazo de antecedência dos e-mails. `diasAntecedenciaPadrao` e o job de notificações de prazo permanecem preservados.

**Detalhes técnicos.** Singleton `ConfiguracaoSemaforo` em `configuracoes_semaforo`, com RLS permitindo leitura autenticada e atualização somente por ADMIN. Consulta/validação em `src/lib/semaforo.ts`, editor em `/notificacoes`. Migration `20260929100000_configuracao_semaforo`.



### N2. Preferências por perfil e canal (RF-022)

**Como funciona.** Para cada perfil e cada evento, a Administradora liga ou desliga o
aviso no sistema e o e-mail. A escolha vale para todas as pessoas ativas daquele perfil.
Menções e confirmações em comentários seguem as mesmas opções de canal de “Novo comentário”.
Quando alguém recebe uma atribuição de projeto, tarefa ou subtarefa, o evento “Atribuição
recebida” é enviado pelos canais configurados para o perfil da pessoa. O evento
“Solicitação de conclusão” avisa ADMIN sobre pedidos novos e o solicitante sobre a decisão.
Os pedidos usam a fila em `/subtarefas`; somente a aprovação gera também o aviso de tarefa
concluída.

**Detalhes técnicos.**
- **Tabela:** `PreferenciaNotificacao`, com uma linha por perfil e evento.
- **Funções:** `atualizarPreferenciaNotificacao`, `dispararEventoNotificacao`,
  `dispararNotificacoesMencaoComentario` e `dispararNotificacaoAtribuicaoRecebida`.
- **Teste:** `notificacoes-rf022.integration.test.ts`, com as combinações de canais, menção,
  atribuição recebida e falha de envio no endpoint com fixture de prazo futuro.
- **Falhas:** erro de e-mail não bloqueia a ação que gerou o aviso.
- **Audiência:** `dispararEventoNotificacao` exige `usuarioIds`; lista vazia não envia. Comentários usam usuários ativos com acesso ao alvo. Eventos de conclusão direcionam somente à conta ADMIN da Talita e não notificam o executor. Preferências por perfil/canal continuam valendo.
- **Aprovação:** `CONCLUSAO_SOLICITADA` usa preferências independentes para os canais; pedidos são enviados aos ADMIN ativos, e decisões ao solicitante. `TAREFA_CONCLUIDA` só é disparado depois da aprovação.
- **Apresentação do e-mail:** notificações e menções usam o mesmo cartão institucional dos
  convites de acesso, com logo pública, conteúdo alinhado à esquerda, botão verde e rodapé.
  O botão de ação usa o texto “Abrir no sistema”.
  O remetente é identificado como “SGA Múltiplus Ambiental”; o endereço vem de
  `EMAIL_FROM` ou do padrão em `src/lib/email.ts`.
  Links de e-mail são absolutos com base em `AUTH_URL` e ajustados à rota que cada perfil
  pode abrir. Notificações in-app antigas conservam a rota que já tinham gravada.
  O evento de atribuição também cobre atribuições de subtarefas. Concluir uma subtarefa não
  dispara e-mail atualmente; não existe evento `SUBTAREFA_CONCLUIDA`.

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

### N6. Horários e dia dos avisos em Brasília

**Como funciona.** Avisos recentes e últimas execuções mostram data e hora de Brasília. A janela dos avisos e a contagem de um envio por dia só viram à meia-noite de Brasília.

**Detalhes técnicos.** `formatarDataHoraBrasilia` formata os instantes; `dispararPrazoProximo` usa `dataDeHojeEmSaoPaulo` para a janela e a chave de deduplicação. Não altera destinatários, preferências, datas dos vencimentos ou agenda de execução. Cobertura em `datas.unit.test.ts` e `notificacoes-rf022.integration.test.ts`.

## Limitações e pendências conhecidas

| # | Situação | Efeito |
|---|---|---|
| L1 | O código do agendador e o script estão prontos, mas a linha de cron ainda precisa ser instalada na VPS pelo usuário. | Avisos não serão disparados automaticamente até a ativação e confirmação da primeira execução. Ver [procedimento](../../ops/README.md#avisos-diários-de-prazo) e L1 em `tarefas.md`. |
| L2 | CLIENTE ainda não tem uma caixa própria para notificações in-app. | Se o canal in-app for ligado para CLIENTE, o aviso é gravado, mas não aparece numa página do cliente; e-mail permanece funcional. |
| L3 | O botão local de demonstração é temporário e continua no código até a revisão pré-produção. | Não aparece quando `NODE_ENV=production`; remover botão, evento e amostras antes do lançamento da VPS. |
| L4 | A caixa de avisos segue o protótipo `10-avisos` só no visual (13/11/2026). | Faltam "Marcar como não lido", "Ver comprovantes", "Cobrar responsável", o contexto (cliente e projeto) em cada aviso, o arquivamento após 90 dias e a página própria de preferências (as preferências continuam ao lado da lista). |

## Histórico de alterações

| Data | Commit | Alteração |
|---|---|---|
| 2026-11-12 | este commit | Ajustar o destaque de avisos não lidos |
| 2026-11-10 | este commit | Iniciar adaptação visual das caixas de avisos |
| 2026-11-03 | este commit | Acrescentar botão local de demonstração dos quatro estilos de toast, sem gravar notificações ([análise](../analises/gerador-toasts-teste.md)) |
| 2026-11-03 | este commit | Exibir toasts de notificações em tempo real por SSE, resumo de entrada e leitura sincronizada ao abrir a central ([análise](../analises/toast-notifications-realtime.md)) |
| 2026-11-03 | este commit | Exibir sino e contador para ADMIN com acesso à caixa existente; prévia e aviso automático cancelados após revisão ([análise](../analises/caixa-notificacoes-popup.md)) |
| 2026-10-28 | este commit | Padronizar as preferências: controles em uma linha e disposição orientada pela largura do cartão |
| 2026-10-28 | este commit | Adaptar a central de notificações a telas estreitas e permitir que mensagens e controles longos quebrem sem estourar o conteúdo |
| 2026-10-27 | este commit | Adicionar sino e contador de não lidas da própria conta ao menu de colaboradores, mantendo a caixa e a audiência existentes ([análise](../analises/central-notificacoes-colaboradores.md)) |
| 2026-10-27 | este commit | Explicar os fluxos de notificações, mensagens e jobs no código ([guia](../codigo/README.md), [análise](../analises/documentacao-codigo-portugues.md)) |
| 2026-10-23 | este commit | Ajustar o texto do botão para “Abrir no sistema” e direcionar links de e-mail para a rota autorizada de cada perfil; notificações in-app antigas permanecem como estavam ([análise](../analises/guarda-clientes-subtarefa-colaborador-links-email.md)) |
| 2026-10-22 | este commit | Atualizar o nome do remetente compartilhado para “SGA Múltiplus Ambiental”, preservando o endereço ([análise](../analises/nome-remetente-email.md)) |
| 2026-10-22 | este commit | Evento configurável de solicitação/decisão de conclusão, caixa de notificações para colaboradores e aviso de tarefa concluída somente após aprovação ([análise](../analises/aprovacao-conclusao-tarefas-subtarefas.md)) |
| 2026-10-15 | `75498a1` | Registrar a limitação L4: o aviso de prazo próximo ainda usa "hoje" em UTC, enquanto semáforo e atraso passaram ao horário de Brasília ([análise](../analises/atraso-fuso-e-lista-subtarefas-sem-fundo.md)) |
| 2026-10-15 | `9f3a725` | Semáforo: vermelho só para prazo vencido, âmbar até o limite configurável (padrão 5 dias) e cancelado em cinza ([análise](../analises/semaforo-vermelho-so-atrasado.md)) |
| 2026-10-15 | `035aa9a` | Limites do semáforo passam a valer em dias corridos ([análise](../analises/semaforo-dias-corridos.md)) |
| 2026-10-08 | `fd8d21f` | Alinhar notificações e menções ao layout institucional dos convites de acesso |
| 2026-10-08 | `20dd992` | Fixture temporal do RF-022 garante que o job processe tarefa e exercite o retorno HTTP 500 ([análise](../analises/fixture-temporal-notificacoes-rf022.md)) |
| 2026-10-02 | `b81feaf` | Preferências CLIENTE começam desligadas; conclusões e comentários podem avisar somente clientes vinculados, com link do próprio portal ([análise](../analises/area-exclusiva-cliente-sprint-6.md)) |
| 2026-10-01 | `2154bb3` | Aplicar antecedência por tarefa, deduplicar canais, medir execuções e preparar cron diário ([análise](../analises/agendador-avisos-prazo.md)) |
| 2026-10-01 | 83f7524 | Lista obrigatória de destinatários, conclusão somente para Talita e audiência por acesso ([análise](../analises/notificacao-comentario-com-acesso.md)) |
| 2026-09-30 | 011bc10 | Corrigir a documentação do disparo de atribuição recebida |
| 2026-09-30 | ce3b73f | Preferências controlam menções, confirmações do autor e avisos de novas atribuições ([análise](../analises/controle-total-notificacoes.md)) |
| 2026-09-29 | `f2ebb80` | Semáforo configurável compartilhado entre projetos, tarefas e subtarefas ([análise](../analises/semaforo-prazos-projetos-tarefas.md)) |
| 2026-09-17 | `5827166` | Healthcheck e CI (base para o job) |
| 2026-09-17 | `022fec0`, `d6ed6d1`, `dc16183` | Disparo de notificações, templates de e-mail e central de notificações (Sprint 4B) |
| 2026-09-18 | `a567583` | Correção do modelo de preferências |
| 2026-10-20 | este commit | Padronizar horários e referência de dia em Brasília ([análise](../analises/padronizacao-horarios-brasilia.md)) |
| 2026-11-13 | este commit | Caixa de avisos no padrão do protótipo: avisos agrupados por período (Hoje, Ontem, Esta semana, Anteriores), ícone por tipo, filtros Todos/Não lidos e por tipo |
