# Análise: Link manual para convite de acesso do cliente

- **Data:** 2026-10-05
- **Pedido original:** “quando eu clicasse para criar o acesso de algum cliente, gerasse um link na tela para mim enviar para o cliente acessar também. Assim eu posso testar também.”
- **Status:** aprovada em 2026-10-05

## 1. Escopo previsto

### Inclui

- Ao criar o acesso do cliente na ficha, a Administradora recebe na resposta dessa ação o link de definição de senha, mesmo se o e-mail Resend for enviado com sucesso.
- Exibir o resultado do envio (enviado, não configurado ou falha) junto do link, para distinguir convite por e-mail de compartilhamento manual.
- Permitir copiar o link e deixá-lo visível/selecionável na tela após a criação.
- Reutilizar o token `DEFINIR_SENHA` já criado para o convite: válido por 7 dias e de uso único. Gerar novo convite invalida tokens anteriores ainda não usados.
- Exibir o link apenas na resposta transitória da Server Action autorizada para `ADMIN`; não persistir o token em claro, não incluí-lo em logs, query de leitura da ficha ou HTML estático/cacheado.
- Cobrir pessoa jurídica (Ponto de Contato) e pessoa física (a própria pessoa), mantendo o fluxo atual de criação da conta.

### Fica de fora

- Reenviar/regenerar link para contas já existentes ou mostrar links depois de atualizar/reabrir a ficha.
- Expor link de convite de usuários internos ou Pessoas Envolvidas.
- Alterar política de senha, validade, uso único, envio Resend ou fluxo de login.
- Criar novos dados persistidos ou migration.

## 2. Permissões

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Criar acesso do cliente | Sim, cliente ativo e com e-mail obrigatório | Não | Não | Não |
| Receber link manual em resposta da ação | Sim, somente na sessão que criou o acesso | Não | Não | Não |
| Ler token/link em consulta posterior | Não se aplica: segredo não é persistido em claro | Não | Não | Não |

## 3. Dados

- Nenhum campo ou migration novos.
- O token aleatório já tem hash SHA-256 guardado em `TokenAcesso`; a string original só existe durante a criação e será devolvida transitoriamente ao ADMIN.
- E-mail destinatário segue RF-031: Pessoa Jurídica usa Ponto de Contato; Pessoa Física usa o e-mail da própria pessoa.
- O link contém token de definição de senha, portanto é credencial temporária. Quem tiver o link pode definir a senha daquela conta enquanto estiver válido.

## 4. Impacto em telas e funções existentes

- `src/lib/tokens.ts`: geração existente `criarTokenAcesso` e validade de sete dias; manter hash e invalidação de token anterior.
- `src/lib/convites.ts`: propagar o link e o status do envio de forma controlada para o chamador do acesso de cliente, sem alterar os outros fluxos de convite.
- `src/lib/clientes.ts`: `criarAcessoCliente` deve devolver o link somente para a ação explicitamente solicitada.
- `src/app/(painel)/clientes/[id]/actions.ts`: `criarAcessoAction` já exige ADMIN e cliente visível/ativo; sua resposta serializável carregará o link e resultado do e-mail.
- `src/app/(painel)/clientes/[id]/acoes-cliente.tsx` e `src/app/(painel)/clientes/[id]/page.tsx`: estado transitório de resultado com link selecionável e botão copiar, na seção “Acesso do cliente”.
- `tests/integration/` e `tests/smoke/`: validar escopo da autorização, token e experiência de criação. Atualizar documentação do módulo Clientes e Autenticação, SRS e índice de decisões.

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| Link secreto vazar para perfil não ADMIN por Server Action | Exigir ADMIN no servidor e não confiar na visibilidade do botão | Chamada sem ADMIN não retorna token e não cria link; ADMIN autorizado recebe somente o seu link |
| Token aparecer em log, URL de listagem ou HTML pré-renderizado/cacheado | Não registrar token; devolvê-lo apenas no resultado transitório da Server Action; usar componente client-state e não revalidar segredo para a página | Revisão e integração verificam que token não está persistido em claro nem em resposta de consulta da ficha |
| Link antigo continuar válido após compartilhar outro convite | Reusar `criarTokenAcesso`, que invalida tokens pendentes do usuário | Integração: link anterior deixa de validar quando novo convite é emitido |
| Link ser usado por pessoa errada ou depois de expirar | Mostrar aviso de que quem tiver o link pode definir senha; preservar uso único e TTL de 7 dias | Integração: token válido antes do uso, inválido depois do consumo/expiração |
| Resend envia e a Administradora também compartilha link | Informar resultado de envio; ambos usam o mesmo token e a primeira definição de senha consome o link | Smoke cobre status de e-mail enviado e link manual válido; UI explica uso único |
| Link construído com host incorreto | Usar `linkDefinirSenha` e `AUTH_URL` configurado para a origem do ambiente | Teste confirma origem e caminho `/definir-senha` com o token criado |

## 6. Casos-limite e estados

- Sucesso de envio pelo Resend: mostrar confirmação do e-mail e link manual idêntico ao enviado.
- Resend não configurado ou indisponível: criação permanece válida e a tela mostra o link para envio manual, com estado de e-mail correspondente.
- E-mail ausente, cliente desativado ou duplicidade: ação falha com mensagem atual e nenhum link é exibido.
- Após refresh/navegação, o link não reaparece; para recuperá-lo será necessária funcionalidade separada de reenviar convite.
- Copiar link em desktop/celular; link pode quebrar visualmente sem estourar largura e botão tem alvo de toque mínimo de 44 px.
- Ao compartilhar o link, qualquer uso consome o token e o torna inválido para os demais destinatários.

## 7. Interface

- Resultado aparece na ficha do cliente, dentro do bloco de acesso, somente após a ação de criação.
- Incluir estado do envio, instrução de validade/uso único, campo/link selecionável e ação “Copiar link”.
- Reutilizar tokens e componentes existentes; respeitar identidade visual e largura de 375 px.

## 8. Plano de testes

- Unitário: montagem/validação do link e estado da resposta da ação para status de envio.
- Integração: criar link somente para ADMIN autorizado; pessoa correta como destinatário; hash persistido, token válido, único e expirável; falha sem revelar token a outros perfis.
- Smoke: criar acesso PJ e PF, conferir status de envio e link de definição de senha, definir senha pelo link e confirmar que o token não pode ser reutilizado.
- `npx prisma generate`, `npm run typecheck`, `npm run lint` e `npm test` conforme o fluxo do repositório.

## 9. Perguntas em aberto

1. Aprovar que o link manual seja mostrado após qualquer criação bem-sucedida, inclusive quando o Resend confirmar envio? — **Resposta:** aprovado pelo usuário em 2026-10-05.
