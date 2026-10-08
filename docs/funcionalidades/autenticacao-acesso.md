# Autenticação e acesso

- **Última revisão:** 2026-10-02, implementação da Sprint 6.
- **Requisitos:** RF-011, RF-014, RF-031, RF-032, RF-043, RF-050.
- **Módulos relacionados:** Usuários, Clientes.

## Visão geral

Todos entram com **e-mail e senha**. Ninguém escolhe a própria senha no cadastro: ela é
definida pelo **link do convite**. Quem esquece a senha recebe um link de recuperação por
e-mail.

Depois do login, cada perfil cai na **sua tela inicial** e só vê no menu o que pode
acessar.

## Tela inicial e menu por perfil (RF-043)

| Perfil | Tela inicial | Menu |
|---|---|---|
| `ADMIN` | Subtarefas | Clientes, Usuários, Projetos, Subtarefas, Agenda, Etiquetas, Notificações, Tarefas, Meu Perfil |
| `ADMIN_INTERNO` | Minhas Tarefas | Clientes, Meus Projetos, Minhas Tarefas, Meu Perfil |
| `ADMIN_EXTERNO` | Minhas Tarefas | Clientes, Meus Projetos, Minhas Tarefas, Meu Perfil |
| `CLIENTE` | Acompanhamento (`/portal`) | Acompanhamento, Meu Perfil |

---

## Funcionalidades

### A1. Login (RF-014, RF-011)

**Como funciona.**
- **Quem entra:** o usuário ativo e com senha definida entra com e-mail e senha.
- **Quem não entra:** o usuário desativado ou que ainda não definiu a senha.

**Detalhes técnicos.**
- **Rota:** `/login`.
- **Funções:** `autenticarComCredenciais` (`src/server/auth/credentials.ts`) e Auth.js,
  com sessão JWT (`src/server/auth/config.ts`).
- **Senha:** hash com bcrypt (`src/lib/senha.ts`).
- **Teste:** `autenticacao.smoke.test.ts`.

### A2. Definir senha pelo convite (RF-031)

**Como funciona.**
- **O link:** vale por **7 dias** e só pode ser usado uma vez.
- **Acesso do cliente:** ao criar a conta, o `ADMIN` também vê na ficha o link para copiar
  e compartilhar manualmente, mesmo se o Resend enviar o e-mail. Sem Resend, a criação da
  conta continua válida e o link manual é a forma de entregar o convite. O link fica apenas
  no resultado transitório da ação e some ao sair da ficha.
- **Reenvio:** para conta CLIENTE ainda pendente, a ADMIN pode enviar um novo convite ao
  e-mail atual da conta. O link anterior é invalidado; o novo vale sete dias e também fica
  copiável na ficha, inclusive se o Resend estiver indisponível. Conta já ativada deve usar
  recuperação de senha; conta bloqueada ou cliente desativado não permite reenvio.
- **Apresentação:** o convite enviado por e-mail usa o logo da Múltiplus, um botão para
  definir a senha e o link em texto para os casos em que o botão não funcione.
- **Política de senha:** no mínimo 8 caracteres, com pelo menos uma letra e um número.

**Detalhes técnicos.**
- **Rota:** `/definir-senha`.
- **Funções:** `validarTokenAcesso`, `consumirTokenAcesso` e `validarPoliticaSenha`
  (`src/lib/politica-senha.ts`).
- **Token:** `DEFINIR_SENHA`, com TTL de 168 h.
- **Reenvio de cliente:** `reenviarConviteAcessoCliente` localiza o usuário por `clienteId`
  e perfil `CLIENTE`, exige ADMIN, cadastro e conta ativos e senha ainda não definida.
- **Escopo do link manual:** criação e reenvio de acesso de cliente; convites de usuários
  internos e Pessoas Envolvidas mantêm o fluxo atual sem devolver o segredo à tela.
- **Testes:** `reenviar-convite-cliente.integration.test.ts` e
  `cadastro-clientes.smoke.test.ts` cobrem as permissões, token substituído e ativação.

### A3. Recuperar senha (RF-032)

**Como funciona.**
- **O pedido:** a pessoa informa o e-mail e recebe um link válido por **1 hora**.
- **Resposta igual para todos:** a tela responde da mesma forma se o e-mail existe ou
  não, para não revelar quem tem conta.
- **Link novo invalida o anterior.**

**Detalhes técnicos.**
- **Rota:** `/esqueci-senha`.
- **Token:** `RECUPERAR_SENHA`, com TTL de 1 h.
- **Limite de pedidos:** 3 por e-mail e 10 por IP, a cada 15 minutos. O controle fica
  **em memória** (`src/lib/rate-limit.ts`).
- **Envio do e-mail:** acontece fora do caminho da resposta, para o tempo de resposta não
  revelar se a conta existe.
- **Testes:** `recuperacao-senha.integration.test.ts` (13 casos) e
  `autenticacao.smoke.test.ts`.

### A4. Proteção de rotas (RF-043)

**Como funciona.**
- **Acesso por URL:** abrir diretamente uma página de outro perfil leva de volta à tela
  inicial.
- **Rota nova:** fica **negada por padrão** até ser declarada no menu.

**Detalhes técnicos.**
- **Duas camadas:**
  - `src/proxy.ts` encaminha sessões ausentes ao login, sem usar perfil possivelmente antigo
    para decidir permissões;
  - `exigirAcessoARota` (`src/server/auth/contexto.ts`) protege cada página com o perfil
    atual do banco.
- **Configuração:** as regras vêm de `MENU` e `perfilPodeAcessar` (`src/lib/navegacao.ts`).
- **Dados:** a camada que vale é o RLS no banco, que recebe perfil e usuário por
  `comContextoDeUsuario`.
- **Sessão atualizada:** `obterContexto` consulta a própria linha do usuário no banco em
  cada request autenticado. Conta inativa ou ausente é redirecionada ao login com uma
  mensagem; mudança de perfil passa a valer no request seguinte. O layout também usa o
  perfil atual para montar o menu.
- **Testes:** `administracao-acesso.unit.test.ts`, que cobre negação de rota, sub-rota e
  rota desconhecida, e `revalidacao-sessao.integration.test.ts`, que cobre desativação,
  remoção e mudança de perfil durante uma sessão existente.

---

## Limitações e pendências conhecidas

| # | Situação | Efeito |
|---|---|---|
| L2 | O **login** não tem limite de tentativas. Só a recuperação de senha tem. | A senha fica exposta a tentativa e erro automatizada. |
| L3 | O limite de tentativas é em memória. | Zera a cada reinício do app e não funciona com mais de uma instância. |
| L4 | CLIENTE ainda não tem página própria para os avisos in-app. | Notificações com canal in-app habilitado não aparecem numa caixa do cliente; o canal de e-mail funciona. Ver `area-exclusiva-cliente.md`. |

## Histórico de alterações

| Data | Commit | Alteração |
|---|---|---|
| 2026-10-08 | `ee7db52` | Reenvio de convite para acesso CLIENTE pendente; substitui o token anterior e retorna link copiável transitório ([análise](../analises/reenviar-convite-cliente-pendente.md)) |
| 2026-09-09 | `c016fe4` | Sprint 1: login, definição de senha, recuperação de senha, RLS base |
| 2026-09-16 | `1169d46` | Sprint 3: menu e tela inicial por perfil, e proteção de rotas |
| 2026-09-16 | `eaecd57` | Envio do e-mail de recuperação fora do caminho da resposta |
| 2026-09-17 | `4f08144` | SEO e identidade da aplicação |
| 2026-09-25 | `0956cdf` | Tela inicial da Administradora passa a ser Subtarefas |
| 2026-10-01 | `9bce2c0` | Revalidar status ativo e perfil da sessão a cada request autenticado ([análise](../analises/revalidacao-sessao-usuarios.md)) |
| 2026-10-02 | `b81feaf` | CLIENTE passa a abrir `/portal`; rotas continuam protegidas por perfil e o bloqueio de sessão permanece aplicado ([análise](../analises/area-exclusiva-cliente-sprint-6.md)) |
| 2026-10-05 | `1339997` | Link de definição de senha copiável na ficha ao criar acesso do cliente ([análise](../analises/link-manual-convite-cliente.md)) |
| 2026-10-08 | `1339997` | Convite de definição de senha ganha layout visual com marca, botão principal e link alternativo |
