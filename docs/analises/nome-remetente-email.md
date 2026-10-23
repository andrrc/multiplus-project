# Análise: Nome do remetente dos e-mails

- **Data:** 2026-10-22
- **Pedido original:** “E-mail: Mudar nome do email para \"SGA Múltiplus Ambiental\"”
- **Status:** aprovada em 2026-10-22

## 1. Escopo previsto

Alterar o nome de exibição do remetente para **SGA Múltiplus Ambiental** em todos os
e-mails enviados pelo sistema: convites e definição de senha, recuperação de senha,
notificações e menções. Preservar o endereço de e-mail atual e os destinatários,
assuntos, conteúdo, templates e regras de envio.

O nome padrão está em `src/lib/email.ts`; o valor de `EMAIL_FROM` substitui o campo
completo `nome <endereço>`. O exemplo em `.env.example` também declara um valor próprio.
Se o ambiente de produção define `EMAIL_FROM`, essa configuração precisa receber o novo
nome para que a mudança apareça nos e-mails enviados lá. Não há alteração de banco,
cadastro de usuário ou interface.

## 2. Permissões

A configuração do remetente é global e não é uma ação disponível aos perfis. Não se
aplica uma matriz de CRUD ou de campos sensíveis.

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Configurar nome do remetente | Não se aplica: configuração global do sistema | Não se aplica: configuração global do sistema | Não se aplica: configuração global do sistema | Não se aplica: configuração global do sistema |
| Receber e-mails | Conforme os eventos e preferências existentes | Conforme os eventos e preferências existentes | Conforme os eventos e preferências existentes | Conforme os eventos e preferências existentes |

## 3. Dados

Não se aplica. Nenhum dado de negócio, validação, unicidade, mascaramento, migration ou
backfill é necessário. A mudança afeta somente o rótulo visível do remetente; o endereço
atual permanece como está.

## 4. Impacto em telas e funções existentes

- `src/lib/email.ts`: origem central do campo `from`, com fallback e suporte a
  `EMAIL_FROM`.
- `.env.example`: valor documentado de `EMAIL_FROM`.
- `src/lib/convites.ts`, `src/app/esqueci-senha/actions.ts` e
  `src/lib/notificacoes.ts`: chamam o envio compartilhado e herdam o remetente.
- `src/lib/email-templates.ts`: conteúdo visual dos e-mails; não precisa mudar.
- `docs/funcionalidades/autenticacao-acesso.md` e
  `docs/funcionalidades/notificacoes.md`: registrar o comportamento final e o histórico.
- `docs/decisoes-desenvolvimento.md`: incluir a entrada cronológica.

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| O valor configurado em `EMAIL_FROM` manter o nome antigo e prevalecer sobre o fallback | Atualizar o valor de referência e identificar que a variável de produção precisa usar `SGA Múltiplus Ambiental <endereço-atual>` | Unitário: verificar o `from` efetivamente enviado com `EMAIL_FROM` definido e sem ele |
| Alterar acidentalmente o endereço junto com o nome | Manter o endereço existente nos dois valores | Unitário: afirmar nome e endereço do remetente |
| Algum fluxo usar outro mecanismo de envio | Conferir todos os usos de `enviarEmail` identificados na análise e manter o envio centralizado | Unitário de `enviarEmail` e cobertura dos fluxos existentes |

Não se aplica autorização por perfil, RLS, mascaramento, IDOR, upload, links externos ou
datas: a alteração não recebe dados do usuário nem muda acesso ou conteúdo do e-mail.

## 6. Casos-limite e estados

- `EMAIL_FROM` ausente: usar o novo nome e preservar o endereço padrão.
- `EMAIL_FROM` presente: respeitar o endereço configurado e usar o valor explicitamente
  configurado; em produção, ajustar o nome se a variável ainda estiver com o rótulo antigo.
- Provedor não configurado ou falha no envio: manter o comportamento atual.
- Concorrência, paginação, estado desativado, celular e estado de tela: não se aplicam,
  pois não há alteração de tela nem de dados de negócio.

## 7. Interface

Não há interface de usuário. O nome aparece no cabeçalho do e-mail conforme o cliente de
e-mail do destinatário o apresenta. Não se aplica verificação em 375 px ou desktop.

## 8. Plano de testes

- Unitário: verificar nome e endereço no parâmetro `from` enviado ao provedor com e sem
  `EMAIL_FROM` explícito.
- Regressão: executar os testes existentes de convites, recuperação de senha e
  notificações para confirmar que o envio centralizado e seu conteúdo permanecem iguais.
- Smoke manual de recebimento em produção: não se aplica à suíte local; depende da
  configuração do ambiente e de envio real após a publicação.

## 9. Perguntas em aberto

1. A mudança deve incluir a atualização do `EMAIL_FROM` configurado no ambiente de
   produção, mantendo o endereço atual? — **Resposta:** sim, aprovada pelo usuário em
   2026-10-22; manter o endereço já configurado nesse ambiente.
