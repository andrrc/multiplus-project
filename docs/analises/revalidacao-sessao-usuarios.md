# Análise: revalidação de sessão após desativação ou mudança de perfil

- **Data:** 2026-09-30
- **Pedido original:** “Sessão não revalidada (`autenticacao-acesso.md` L1, marcado prioridade alta). Usuário desativado mantém acesso até a sessão expirar — padrão de 30 dias. Isso esvazia o RF-039 e a RN-007 na prática: a Talita desativa alguém, a tela confirma, e a pessoa continua entrando por um mês. Está aberto desde a Sprint 3. [...] Os dois são de segurança e nenhum é grande. Eu os faria antes de abrir módulo novo.”
- **Status:** aprovada em 2026-10-01

## 1. Escopo previsto

Revalidar a identidade, o estado ativo e o perfil associado ao usuário em cada requisição autenticada no servidor.

- Usuário desativado deve perder acesso imediatamente, inclusive em sessões JWT que já foram emitidas; requisições autenticadas devem ser recusadas e redirecionadas ao login.
- Mudança de perfil deve substituir os claims antigos antes de autorizar a requisição, para que o usuário não conserve os privilégios do perfil anterior.
- Login de usuário desativado continua recusado.
- Fora do escopo: encurtar o prazo padrão do JWT, invalidar sessões por troca de senha ou alterar o fluxo de convite/recuperação de senha.

## 2. Permissões

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Acessar funções permitidas ao próprio perfil quando a conta estiver ativa | Sim | Sim | Sim | Sim |
| Continuar usando sessão depois da desativação | Não | Não | Não | Não |
| Manter permissões antigas depois da mudança de perfil | Não | Não | Não | Não |
| Desativar usuário ou alterar perfil | Conforme RN-007 / RF-040 | Não | Não | Não |

## 3. Dados

- Usar `Usuario.id`, `Usuario.ativo` e `Usuario.perfil` já persistidos.
- Nenhuma alteração de schema, migration ou backfill prevista.
- Não devolver dados cadastrais adicionais ao navegador. Revalidar os campos mínimos necessários para autorização.

## 4. Impacto em telas e funções existentes

- `src/server/auth/config.ts`: claims JWT e callback de sessão atualmente preservam `id`, `perfil` e `clienteId` sem nova consulta.
- `src/server/auth/contexto.ts`: `obterContexto` confia nos claims da sessão sem validar o estado atual do usuário.
- `src/app/(painel)/layout.tsx`: consome `auth()` diretamente e renderiza nome/perfil do token.
- `src/proxy.ts`: a verificação de perfil é otimista; as guardas do servidor devem continuar sendo a autorização efetiva.
- Funções e actions que usam `obterContexto`, `exigirAdmin` ou `exigirAcessoARota` devem herdar a revalidação central.
- `src/server/auth/credentials.ts`: o login já confere `ativo`; preservar esse bloqueio.
- `docs/funcionalidades/autenticacao-acesso.md`, SRS (RF-039, RF-040, RF-043), ADD se houver decisão arquitetural nova e `docs/decisoes-desenvolvimento.md` devem refletir o comportamento final.

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| Claim do JWT antigo continuar autorizando acesso após desativação | Consultar estado atual antes de emitir contexto autenticado e rejeitar usuário inativo | Integração: sessão já emitida + usuário desativado; contexto e acesso a rota recusados |
| Perfil antigo permanecer em uso depois de uma troca de perfil | Recarregar perfil atual do banco e construir o contexto com o valor persistido | Integração: token com perfil antigo não conserva rota/ação restrita ao perfil anterior |
| Algum caminho usar `auth()` e ignorar revalidação central | Auditar usos de `auth()` e concentrar leitura confiável de sessão/contexto; layout não pode confiar em perfil obsoleto | Teste cobrindo layout/guarda e busca no código por caminhos diretos restantes |
| Consulta ao banco indisponível levar à autorização com claims antigos | Falhar de forma fechada: erro de revalidação não autoriza a requisição | Teste: falha de leitura do usuário não retorna contexto autenticado |
| Resposta de sessão expor campo adicional | Projetar explicitamente os campos atuais da sessão | Teste: sessão contém apenas claims já necessários, sem dado sensível novo |

## 6. Casos-limite e estados

- Token válido com usuário ativo e perfil inalterado: acesso segue normalmente.
- Usuário desativado durante sessão aberta: a próxima requisição autenticada deve ser recusada.
- Perfil alterado durante sessão aberta: próxima autorização deve usar o perfil atualizado.
- Usuário removido ou não encontrado: sessão deve ser recusada.
- Indisponibilidade da consulta ao usuário: falhar fechado, sem fallback para claims antigos.
- Rotas públicas de login e recuperação de senha continuam acessíveis sem sessão.
- Comportamento de navegação após sessão invalidada: direcionar ao login sem loop de redirecionamento.

## 7. Interface

Após invalidação, a próxima navegação protegida leva ao login com uma mensagem própria. A alteração não exige ação manual de logout pela Administradora. A tela de login mantém o layout responsivo existente.

## 8. Plano de testes

- Integração de autenticação/contexto: sessão criada antes da desativação é recusada na próxima requisição.
- Integração de permissões: sessão com perfil antigo passa a usar o perfil atual; validar rotas e actions permitidas e negadas.
- Testes de usuário ausente e falha no acesso ao banco com resultado fechado; o contexto retornado contém apenas `usuarioId` e o perfil atual.
- Smoke: autenticar, desativar a conta administrativamente e tentar acessar uma rota protegida com a sessão existente.
- Regressão: login e recuperação de senha continuam funcionando para usuário ativo.
- Verificação completa antes do push conforme AGENTS.md.

## 9. Perguntas em aberto

1. **Mudança de perfil:** atualizar o perfil efetivo imediatamente na sessão existente (sem exigir novo login), removendo os privilégios do perfil anterior. — **Resposta:** aprovado por André em 2026-10-01.
