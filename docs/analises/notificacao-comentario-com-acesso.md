# Análise: segurança dos destinatários de notificações (Etapa B)

- **Data:** 2026-10-01
- **Pedido original:** “Pode executar a etapa B”, referente ao plano de correções antes da Sprint 5.
- **Status:** aprovada em 2026-10-01

## 1. Escopo previsto

- Restringir avisos de `NOVO_COMENTARIO`, `TAREFA_CONCLUIDA` e `PROJETO_CONCLUIDO` a usuários ativos que tenham acesso ao registro correspondente, tanto no canal in-app quanto por e-mail, respeitando preferências e canais de RF-022/RF-023.
- Tornar obrigatória a lista `usuarioIds` em `dispararEventoNotificacao`; lista vazia não envia a ninguém. Remover o comportamento que expande chamada sem lista para todos os usuários elegíveis do perfil.
- Nas actions, calcular e passar os destinatários de acordo com o alvo (projeto, tarefa ou subtarefa) e as atribuições/vínculos de acesso. Preservar validação de menções e evitar notificações duplicadas.
- Excluir tarefas com status `CANCELADO` do envio de avisos de prazo próximo, além das já excluídas por inatividade/conclusão.
- Fora do escopo: alterar quem pode acessar ou editar registros, mudar preferências/canais, alterar o conteúdo dos avisos ou revisar outros eventos além dos citados e dos call sites que precisem da nova assinatura.
- Sem schema ou migration previstos.

## 2. Permissões

“Receber” abaixo depende também de usuário ativo e de preferência/canal habilitado para o evento.

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Receber aviso de comentário se tiver acesso ao alvo | Sim, se autorizado | Sim, se atribuído ao projeto | Sim, se atribuído à tarefa | Sim, se vinculado ao cliente e preferência habilitada |
| Receber aviso de conclusão de tarefa | Somente Talita (conta ADMIN), se preferência do evento habilitada | Não | Não | Não |
| Receber aviso de conclusão de projeto | Somente Talita (conta ADMIN), se preferência do evento habilitada | Não | Não | Não |
| Receber aviso de prazo próximo | Conforme regra existente de responsável/admin, exceto tarefa cancelada | Sem mudança | Sem mudança | Sem mudança |
| Acessar/alterar registros ou comentar | Sem mudança | Sem mudança | Sem mudança | Sem mudança; permissões atuais não serão alteradas |

## 3. Dados

- Nenhum campo, tabela, migration ou backfill previsto.
- `usuarioIds` deve ser uma lista explícita e calculada no servidor; nunca derivar destinatários de dados de formulário controláveis pelo usuário. Para conclusão, a audiência é apenas a conta da Talita, sem autoaviso ao executor, e a preferência existente do evento continua sendo respeitada.
- Apenas usuários ativos com acesso contextual ao registro devem ser selecionados; preferências continuam definindo se cada canal recebe o aviso.
- Para tarefa de prazo, filtrar status `CANCELADO` na consulta que seleciona os avisos.

## 4. Impacto em telas e funções existentes

- `src/lib/notificacoes.ts`: `DadosEvento.usuarioIds` é opcional; `listarDestinatarios` faz envio amplo quando a lista falta; `dispararPrazoProximo` filtra conclusão, mas não cancelamento.
- `src/lib/comentarios.ts`: `obterEscopoDoAlvo` e `listarUsuariosMencionaveis` já consultam vínculo e perfil para projeto/tarefa/subtarefa; avaliar reutilizar ou generalizar a regra sem divergir do acesso efetivo.
- `src/app/(painel)/projetos/actions.ts`: call sites de comentário, conclusão de tarefa e conclusão de projeto precisam calcular e fornecer a lista explícita.
- `tests/integration/notificacoes-rf022.integration.test.ts` e demais usos de `dispararEventoNotificacao`: atualizar chamadas e cobrir inclusão/exclusão de destinatários.
- `docs/funcionalidades/comentarios-mencoes.md`, `notificacoes.md`, `tarefas.md`, índice `docs/funcionalidades/README.md` e `docs/decisoes-desenvolvimento.md`: documentar audiência efetiva e remover limitações resolvidas.
- Referências: RF-022/RF-023 e RNF-002 no SRS; PDD de projetos/tarefas. Nenhuma mudança visual prevista.

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| Omitir `usuarioIds` mantém envio global | Argumento obrigatório e nenhuma expansão global; lista vazia não envia | Unitário/integração: chamada sem lista falha na compilação; lista vazia não produz entrega |
| Resolver acesso de projeto, tarefa ou subtarefa de forma divergente | Reutilizar a regra contextual e validar o vínculo do usuário com o alvo | Integração: perfil com acesso recebe e perfil sem vínculo não recebe, em in-app e e-mail |
| Cliente inativo manter colaborador/cliente na audiência | Exigir cliente ativo para destinatários CLIENTE e colaboradores vinculados; ADMIN mantém seu acesso | Integração: após desativar o cliente, usuário vinculado não recebe aviso |
| Usuário forja menção ou ID de destinatário | Calcular audiência exclusivamente no servidor e manter validação de menção | Integração: ID sem acesso não recebe; menção inválida é recusada |
| E-mail e in-app aplicam filtros diferentes | Filtrar antes de gerar os dois canais e preservar preferências por canal | Integração: conferir destinatários e preferências de cada canal |
| Projeto concluído notifica usuário sem atribuição nele | Derivar audiência do acesso real ao projeto e suas tarefas | Integração: cobrir ADMIN, interno, externo e cliente conforme decisão de acesso |
| Tarefa cancelada ainda gera aviso de prazo | Excluir `CANCELADO` na seleção do job | Integração: tarefa ativa em prazo entra; cancelada não entra |
| Call site esquecido após tornar a lista obrigatória | Busca de todos os usos e atualização explícita de cada um | Typecheck e busca/revisão de todos os call sites |

## 6. Casos-limite e estados

- Audiência vazia: gravar/alterar o registro normalmente, mas não criar entrega de notificação.
- Notificações de conclusão são enviadas somente à conta da Talita e apenas se a preferência do evento estiver habilitada; executor e demais usuários não recebem.
- Comentário em subtarefa: determinar audiência pelo acesso contextual à tarefa/projeto pai; clientes vinculados podem receber quando habilitados na preferência.
- Tarefa ou projeto inativo, destinatário inativo ou sem canal habilitado: não enviar conforme filtros existentes.
- Tarefa cancelada não recebe aviso de prazo, mesmo dentro da janela; tarefa concluída continua excluída.
- Erro ao resolver audiência: falhar fechado, sem fallback global.
- Projeto com colaboradores externos atribuídos a tarefas distintas: só incluir quem tenha vínculo que conceda acesso ao alvo e ao nível do evento.

## 7. Interface

Sem alteração de interface ou responsividade. A mudança é no cálculo de audiência e no agendamento de notificações.

## 8. Plano de testes

- Integração dos três eventos com usuário autorizado e sem acesso, verificando separadamente notificações in-app e destinatários de e-mail.
- Cobrir comentário em projeto, tarefa e subtarefa; conclusão de projeto/tarefa; perfis e vínculos aplicáveis, inclusive cliente conforme decisão.
- Preferências de e-mail e in-app ligadas/desligadas independentemente; destinatários inativos; cliente desativado; audiência vazia; menção válida/inválida; ausência de duplicatas.
- Teste de prazo próximo que compara tarefa elegível, concluída e cancelada.
- Atualizar testes existentes e testar todos os usos da assinatura obrigatória. Executar a suíte completa antes do push conforme AGENTS.md.

## 9. Perguntas em aberto

1. **Audiência de conclusão:** respondido em 2026-10-01 — notificar somente Talita, se a preferência do evento estiver habilitada; não notificar quem concluiu.
2. **Clientes:** respondido em 2026-10-01 — cliente vinculado pode receber aviso de comentário quando a preferência estiver habilitada.
3. **Audiência de comentário:** aprovada em 2026-10-01 — avisar todos os usuários ativos com acesso ao alvo, não apenas mencionados; excluir o autor do aviso geral; menções continuam com confirmação ao autor conforme fluxo atual.
