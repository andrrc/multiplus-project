# Análise: reenviar convite de acesso do cliente

- **Data:** 2026-10-08
- **Pedido original:** “No botão de criar acesso do cliente, o que acontece, se o cliente perder a validade dos 7 dias? deveria ter um botão para reenviar link de acesso do cliente (empresa)”
- **Status:** aprovada em 2026-10-08

## 1. Escopo previsto

### Inclui

- Na ficha do cliente, oferecer a ação de reenviar convite quando já existe um acesso CLIENTE ativo, mas ainda sem senha definida (status “Pendente de ativação”).
- A ação deve gerar um token novo de definição de senha, com a validade atual de sete dias e uso único; a geração invalida o convite anterior.
- Recomenda-se que a ação envie o convite ao e-mail associado ao usuário CLIENTE e, como no fluxo de criação, devolva para a Administradora um link copiável para compartilhamento manual, mesmo se o Resend enviar o e-mail.
- Mostrar o resultado do envio e o link recém-gerado em estado transitório, sem persistir o token em texto puro.
- Permitir a ação somente para ADMIN e somente para o usuário CLIENTE vinculado ao `clienteId` da ficha. A regra deve ser validada no servidor, não apenas pela exibição do botão.
- Manter a validade e a política de uso atuais. Não alterar criação de acesso, login ou recuperação de senha.

### Fica de fora

- Alterar o e-mail/login já associado à conta caso o Ponto de Contato da empresa tenha mudado. A proposta é reenviar para `Usuario.email` atual.
- Reenviar convite para conta que já definiu senha; nesses casos, a pessoa usa recuperação de senha.
- Reativar cadastro de cliente ou acesso bloqueado automaticamente. O ADMIN primeiro precisa reativar o cadastro e/ou desbloquear o acesso conforme o caso.
- Alterar prazo de sete dias, uso único, formato do e-mail ou adicionar migration.

## 2. Permissões

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Ver status do acesso na ficha interna | Sim | Conforme acesso já existente à ficha | Conforme acesso já existente à ficha | Não acessa esta rota |
| Criar acesso ainda não existente | Sim, cliente ativo e com e-mail | Não | Não | Não |
| Reenviar convite de conta pendente | Sim, somente conta CLIENTE vinculada à ficha, ativa e sem senha | Não | Não | Não |
| Definir senha com o link | Não se aplica à ação administrativa; destinatário do convite | Não se aplica | Não se aplica | Sim, somente para a conta correspondente ao token válido |
| Ver/receber o link em texto | Sim, na resposta transitória da ação autorizada | Não | Não | Recebe o link pelo canal enviado/compartilhado |
| Editar, desativar ou reativar cliente | Conforme regras atuais de Clientes | Não | Não | Não |
| Ver dados sensíveis do cliente | Conforme mascaramento atual: ADMIN pode ver; demais perfis não | Não | Não | Não |

## 3. Dados

- Sem novos campos ou migration.
- O alvo é localizado pelo vínculo `Usuario.clienteId` e `perfil = CLIENTE`; não aceitar um `usuarioId` arbitrário vindo do formulário.
- A reemissão usa `criarTokenAcesso(usuario.id, "DEFINIR_SENHA")`. O banco armazena somente o hash; o token anterior deixa de validar e o novo expira em 168 horas.
- O convite vai para o `Usuario.email` atual da conta do portal. A troca do ponto de contato/e-mail de login fica fora deste pedido.
- O acesso permanece pendente até a definição da senha. O vencimento do token não remove nem bloqueia a conta.

## 4. Impacto em telas e funções existentes

- `src/app/(painel)/clientes/[id]/page.tsx`: exibir a ação na seção “Acesso ao portal do cliente” apenas para status pendente e cadastro ativo.
- `src/app/(painel)/clientes/[id]/acoes-cliente.tsx`: estado de envio, resultado do Resend, link copiável temporário e estado responsivo do botão.
- `src/app/(painel)/clientes/[id]/actions.ts`: nova Server Action protegida por `exigirAdmin` e pela validação de cliente ativo/vínculo.
- `src/lib/clientes.ts`: serviço que resolve a conta CLIENTE pelo vínculo do cliente e rejeita conta inexistente, bloqueada, já ativada ou cliente desativado.
- `src/lib/convites.ts`: reutilizar o envio de convite para origem CLIENTE e retorno transitório do link, sem duplicar template ou geração de token.
- `src/lib/tokens.ts`: reutilizar geração, validade, hash e invalidação existentes; nenhuma alteração prevista.
- Referência existente: `src/lib/usuarios.ts#reenviarConvite` e `src/app/(painel)/usuarios/acoes-usuario.tsx` já implementam reenvio para usuários internos, mas não resolvem o vínculo e a origem CLIENTE.
- Testes: `tests/integration/` para autorização, vínculo, estado da conta e invalidação do token anterior; `tests/smoke/` para reenviar, copiar/usar o link e definir senha.
- Documentação: atualizar `docs/funcionalidades/clientes.md`, `docs/funcionalidades/autenticacao-acesso.md`, SRS, PDD de Cadastro de Clientes e `docs/decisoes-desenvolvimento.md`.

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| Ação exposta a perfil sem permissão | Checar ADMIN na Server Action e no serviço | Integração: perfil não ADMIN recebe erro RN esperado e não cria token |
| Troca de `clienteId` para emitir convite de outro cliente | Resolver usuário por cliente e perfil CLIENTE dentro do serviço; não aceitar `usuarioId` do navegador | Integração: ADMIN só reemite para usuário associado ao cliente informado |
| Reenvio de conta já ativada, bloqueada ou cliente desativado | Validar `senhaHash`, `Usuario.ativo` e `Cliente.ativo` no servidor | Integração: cada estado inválido falha sem gerar token ou enviar e-mail |
| Link anterior continuar válido depois da reemissão | Reutilizar `criarTokenAcesso`, que invalida tokens de acesso anteriores antes de criar outro | Integração: token antigo inválido e o novo válido |
| Token em claro persistido, logado ou exposto em leitura da ficha | Devolver link somente na resposta transitória da ação; persistir hash; não registrar segredo | Integração: hash armazenado, token em claro ausente e link fora da query de detalhe |
| Repetição involuntária mandar vários e-mails e invalidar links anteriores | Desabilitar botão durante o request, apresentar confirmação e deixar claro que cada reenvio substitui o link anterior | Smoke: botão tem estado pendente e resposta explica novo prazo; avaliar proteção de frequência conforme padrão existente |
| Convite chegar a um e-mail diferente do contato atual da empresa | Reenviar ao `Usuario.email` vinculado, que também é o login existente; indicar o destinatário na confirmação | Integração: o envio usa o e-mail associado à conta CLIENTE |

## 6. Casos-limite e estados

- Link expirado: a conta continua “Pendente de ativação”; ADMIN pode emitir outro link.
- Link ainda válido: o botão continua disponível; novo envio invalida o anterior e o novo vale sete dias.
- Resend indisponível ou falha: preservar a conta, mostrar o erro e disponibilizar o novo link manual.
- Conta já ativada: não exibir ação de reenvio; orientar a pessoa a usar “Esqueci minha senha” se perdeu acesso.
- Acesso bloqueado ou cliente desativado: não permitir reenvio até o ADMIN regularizar o status.
- Conta de cliente inexistente: manter “Criar acesso do cliente”.
- Reenvios concorrentes: só o token gerado por último permanece válido; requests sucessivos podem invalidar links enviados anteriormente.
- Mobile: ação e link devem caber em 375 px, com botões de toque de pelo menos 44 px.

## 7. Interface

- Na área de acesso, status “Pendente de ativação” acompanhado de “Reenviar convite”.
- Durante o envio, desabilitar o botão e mostrar “Reenviando…”.
- Ao concluir, indicar envio por e-mail ou falha do Resend, destinatário e novo link copiável com validade de sete dias/uso único.
- Reaproveitar o estilo atual da ficha do cliente, identidade visual e botão de cópia do link manual.
- Em status “Ativo”, manter somente a opção de bloquear/desbloquear; reenvio não aparece.

## 8. Plano de testes

- Unitário: resultado da operação nos estados permitido e recusados.
- Integração: ADMIN autorizado e perfil negado; associação ao cliente; conta pendente; conta ativada/bloqueada; cliente desativado; destino de e-mail; invalidação de token anterior; token novo válido, de uso único e com expiração; falha do Resend ainda retorna link manual.
- Smoke: ficha mostra reenvio para acesso pendente, novo link é utilizável para definir senha, e o link anterior deixa de funcionar.
- Execução completa: `npx prisma generate`, `npm run typecheck`, `npm run lint` e `npm test`.
- Inspeção visual da ficha em 375 px e desktop.

## 9. Perguntas em aberto

1. Ao clicar em “Reenviar convite”, a ação deve tentar enviar e-mail pelo Resend **e** mostrar um novo link copiável na ficha, substituindo o link anterior? — **Resposta:** Sim. A aprovação da análise confirmou o reenvio por e-mail e a exibição do novo link copiável; o link anterior deve ser invalidado.
2. O e-mail deve ir para o e-mail já associado ao login do portal (`Usuario.email`), mesmo que o Ponto de Contato da empresa tenha mudado depois? — **Resposta:** Sim. Usar o e-mail atual vinculado à conta, sem alterar o login.
