# Análise: controle dos canais de notificação

- **Data:** 2026-09-30
- **Pedido original:** “Eu quero realmente ter total controle/preferencia de e-mail ou sistema as notificações nessa página.”
- **Status:** aprovada em 2026-09-30

## 1. Escopo previsto

Dar à Administradora (Talita) controle efetivo sobre os canais de cada notificação exibida em “Preferências por perfil” em `/notificacoes`, respeitando as escolhas por perfil e evento já previstas no RF-022.

Inclui:
- Fazer todos os disparos de notificações de domínio consultarem `PreferenciaNotificacao` antes de enviar e-mail ou gravar aviso in-app.
- Remover o caminho especial de e-mail de menção que hoje ignora as preferências. A proposta é usar a configuração de `NOVO_COMENTARIO` para os destinatários da menção e para o e-mail de confirmação do autor, respeitando cada canal escolhido.
- Fazer com que cada evento listado nas preferências tenha o disparo correspondente; em particular, ativar o evento `ATRIBUICAO_RECEBIDA`, que já aparece na tela mas não é disparado hoje, para atribuições de projetos, tarefas e subtarefas.
- Manter a configuração por perfil/evento, as opções independentes “E-mail” e “App”, os padrões atuais do banco e a proteção ADMIN já existente.
- Garantir que desligar um canal impeça aquele envio; desligar ambos impede os dois. A preferência deve se aplicar a todos os usuários ativos do perfil correspondente.

Fora do escopo: e-mails operacionais de convite, definição/recuperação de senha e outras mensagens que não sejam notificações de eventos do sistema; preferências individuais por usuário; mudança dos perfis permitidos na página; edição dos limites do semáforo.

## 2. Permissões

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Ver e alterar preferências de canais por perfil/evento | Sim | Não | Não | Não |
| Receber notificações segundo a preferência do próprio perfil | Sim | Sim, conforme eventos habilitados | Sim, conforme eventos habilitados | Conforme configuração do perfil; atualmente começa desabilitado |
| Ver os próprios avisos in-app | Sim, pela central atual | A central não está disponível no menu | A central não está disponível no menu | A central não está disponível no menu |

Sem mudança de permissão proposta. A action e a função de domínio já restringem alteração/leitura ao `ADMIN`; RLS também limita acesso às preferências.

## 3. Dados

- Reutilizar `PreferenciaNotificacao` (`perfil`, `evento`, `email`, `inApp`); nenhuma migration parece necessária.
- Manter a unicidade atual por perfil e evento e os defaults persistidos existentes.
- Não há dados sensíveis nem backfill previsto.
- Destinatários de menção continuam limitados a usuários que podem acessar o registro. Não ampliar a audiência do comentário.

## 4. Impacto em telas e funções existentes

- `src/app/(painel)/notificacoes/page.tsx`: manter a seção existente, que mostra os dois checkboxes por evento e perfil.
- `src/app/(painel)/notificacoes/actions.ts`: preservar validação de perfil/evento e action protegida.
- `src/lib/notificacoes.ts`: centralizar o respeito às preferências para notificação in-app e e-mail; substituir o caminho especial de `dispararEmailsMencaoComentario`.
- `src/app/(painel)/projetos/actions.ts`: ajustar o fluxo de comentário/menções.
- `src/lib/projetos-tarefas.ts`, `src/lib/tarefas.ts` e `src/lib/usuarios.ts`: disparar `ATRIBUICAO_RECEBIDA` ao criar ou alterar atribuições de projeto, tarefa ou subtarefa.
- `prisma/schema.prisma` e migrations: nenhum impacto esperado, salvo descoberta de necessidade durante a implementação.
- `docs/funcionalidades/notificacoes.md` e `docs/funcionalidades/comentarios-mencoes.md`: documentar o comportamento final, exceções remanescentes e histórico.
- `docs/decisoes-desenvolvimento.md`: registrar a decisão com links para os módulos.
- Não foi encontrado PDD específico para Notificações; o SRS define RF-022 como configuração por perfil e RF-023 como canais conforme essa configuração.

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| Caminho de menção continua enviando e-mail com preferência desligada | Não enviar e-mail diretamente fora do despachante sujeito a preferências | Integração: e-mail desligado não envia; ligado envia somente aos destinatários autorizados |
| Preferência de um canal altera indevidamente o outro | Avaliar `email` e `inApp` separadamente para cada destinatário | Integração: testar as quatro combinações ligado/desligado e verificar ausência/presença de cada canal |
| Menção vaza comentário ou notifica usuário sem acesso | Preservar a lista validada por `listarUsuariosMencionaveis`; não ampliar destinatários | Integração: pessoa sem vínculo não recebe e-mail nem in-app |
| A action de configuração pode ser chamada por perfil não ADMIN | Manter verificação na action/função de domínio e RLS | Integração: ADMIN altera; demais perfis recebem erro esperado |
| Evento aparece configurável, mas não dispara | Cobrir cada evento exibido; adicionar disparo de atribuição se aprovado | Integração: cada fluxo gera apenas os canais ligados para o perfil destinatário |
| E-mail operacional deixa de ser enviado por engano | Restringir mudança a notificações de eventos; convite e recuperação permanecem independentes | Teste de regressão dos fluxos operacionais se funções compartilhadas forem tocadas |

## 6. Casos-limite e estados

- Ambos canais desligados: nenhum aviso enviado/criado.
- Só e-mail: e-mail enviado, sem registro in-app.
- Só App: registro in-app criado, sem e-mail.
- Ambos ligados: os dois canais usados.
- Preferência ausente para par perfil/evento: comportamento seguro é não enviar; confirmar integridade dos registros existentes.
- Usuário inativo: não recebe notificação.
- Menção ao autor: e-mail e aviso in-app de confirmação seguem a preferência `NOVO_COMENTARIO` do perfil do autor.
- Falha no provedor de e-mail: não impede a ação de negócio nem a criação do aviso in-app.
- Evento `ATRIBUICAO_RECEBIDA`: disparar quando uma nova atribuição é criada ou quando o responsável muda; não disparar ao remover ou salvar sem mudança.
- Interface atual organiza várias preferências em coluna lateral e em sequência; verificar 375 px e desktop após a alteração necessária.

## 7. Interface

Manter a seção “Preferências por perfil”, com caixas “E-mail” e “App” independentes por evento. Tornar a descrição mais explícita de que a escolha se aplica a todos os usuários do perfil e é respeitada nos envios, inclusive menções. Não criar nova cor; seguir tokens existentes e manter responsividade em 375 px e desktop.

## 8. Plano de testes

- Integração do módulo `notificacoes`: matriz de canais por perfil/evento, canais desligados, usuário inativo e evento de atribuição se implementado.
- Integração de comentários/menções: preferências respeitadas para pessoa mencionada e autor; preservação do filtro de acesso; combinações email/in-app.
- Integração de permissão para leitura/alteração das preferências: ADMIN permitido, demais perfis negados com mensagem esperada.
- Regressão de convite/recuperação se houver alteração em componentes compartilhados de e-mail.
- Smoke do fluxo completo somente se a rota/fluxo existente permitir exercitar configuração e entrega; caso contrário, registrar a limitação e cobrir por integração.
- Verificação local completa antes do push conforme AGENTS.md, incluindo `npx prisma generate`, `npm run typecheck`, `npm run lint` e `npm test`.

## 9. Perguntas em aberto

1. **Menções:** confirma que a opção de `NOVO_COMENTARIO` deve controlar também o e-mail enviado à pessoa mencionada e a cópia de confirmação ao autor? Se “App” estiver ligado, a pessoa mencionada/autor também deve receber o aviso in-app normal de novo comentário? — **Resposta:** Sim, ambos os destinatários seguem os canais configurados em `NOVO_COMENTARIO`, inclusive App, conforme aprovado em 2026-09-30.
2. **Atribuições:** confirma que devemos fazer o evento `ATRIBUICAO_RECEBIDA`, já listado mas atualmente sem disparo, passar a ser enviado conforme os canais escolhidos? — **Resposta:** Sim, implementar o disparo seguindo os canais escolhidos, conforme aprovado em 2026-09-30.
