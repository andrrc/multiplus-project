# Análise: erro de transação na revalidação da sessão

- **Data:** 2026-11-03
- **Pedido original:** “Resolva este problema: Transaction API error: Unable to start a transaction in the given time”, em `obterContexto`.
- **Status:** aprovada em 2026-11-03

## 1. Escopo previsto

Diagnosticar e corrigir a falha intermitente ao iniciar a transação que revalida uma sessão autenticada. A correção deve manter a consulta real ao banco e as proteções atuais. O limite de espera compartilhado de `comContextoDeUsuario` é uma possível solução, condicionada a reproduzir o problema e confirmar que a espera explica a falha. Investigar também concorrência, disponibilidade e pool antes de concluir. Não mudar regras de autenticação, acesso ou cadastro. Os ajustes visuais locais já existentes aguardam avaliação separada e não fazem parte desta correção.

## 2. Permissões

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Revalidar a própria sessão ativa | Sim | Sim | Sim | Sim |
| Usar sessão desativada ou versão inválida | Não | Não | Não | Não |
| Acessar rotas e dados | Conforme regras atuais | Conforme regras atuais | Conforme regras atuais | Conforme regras atuais |
| Ver campos sensíveis, criar, editar, desativar ou reativar registros | Conforme regras atuais | Conforme regras atuais | Conforme regras atuais | Conforme regras atuais |

## 3. Dados

A consulta usa somente id, estado ativo, perfil e versão da sessão do usuário. Não há campos novos, alteração de validação, unicidade, schema, migration ou backfill. Não expor dados adicionais ao navegador.

## 4. Impacto em telas e funções existentes

- `src/server/auth/contexto.ts`: `obterContexto`, `exigirAdmin` e `exigirAcessoARota`, usados por páginas, actions e API autenticadas.
- `src/lib/prisma-app.ts`: cliente restrito e `comContextoDeUsuario`, usado em múltiplos módulos. Evitar mudanças globais desnecessárias; se reutilizado, manter o contexto RLS e seus prazos existentes.
- `src/app/(painel)/layout.tsx`, páginas como `/clientes` e `/subtarefas` e ações autenticadas: consomem a revalidação e podem ser afetadas. O layout possui edição visual local independente a preservar.
- `tests/integration/revalidacao-sessao.integration.test.ts`: testes existentes de perfil atual, desativação, versão e falha fechada.
- `docs/funcionalidades/autenticacao-acesso.md` e índice de decisões: documentar a solução efetivamente adotada após aprovação.

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| Autorizar sessão antiga ou inválida ao falhar o banco | Falhar fechado; não retornar claims antigos | Integração: banco indisponível, usuário inativo e versão inválida |
| Perder isolamento ou usar perfil antigo | Manter role restrita, contexto transacional RLS e buscar perfil atual | Integração: revalidação com perfis alterados e teste de acesso negado |
| Apenas adiar falha de pool esgotado | Investigar conexões, reproduzir contenção e limitar espera; não alegar que prazo maior resolve esgotamento permanente | Integração: espera temporária e erro quando indisponibilidade persiste |
| Regressão de outros consumidores do contexto | Manter contrato público e executar suíte completa | Integração e smoke existentes |
| Comparação SQL com NULL, view sem invoker, IDOR, campos indevidos, unicidade, dados sensíveis, inativos, datas, links, uploads ou notificações | Não alterar essas consultas, schema, funções SQL ou dados; manter checagens existentes | Suíte de integração/RLS e smoke existente |

## 6. Casos-limite e estados

Sessão ausente, usuário removido ou inativo, mudança de perfil, versão revogada, banco indisponível, contenção temporária e permanente, requisições simultâneas e compilação inicial em desenvolvimento. Não fazer fallback para autorização sem revalidação. Não há mudança de listagem, paginação ou edição concorrente de entidades.

## 7. Interface

Nenhuma alteração visual prevista. O erro afeta páginas autenticadas em desktop e celular; testar navegação local quando houver sessão disponível. Preservar filtros e alinhamento pendentes de avaliação.

## 8. Plano de testes

- Primeiro reproduzir a falha com teste determinístico na interface `obterContexto`, com banco de teste real e contenção controlada, se tecnicamente viável; confirmar que falha antes da correção.
- Integração: recuperação após contenção temporária; erro seguro com indisponibilidade persistente; sessão válida, inativa, removida, versão inválida e perfil atualizado. A interface `exigirAcessoARota` verifica o efeito da revalidação sobre autorização; esses testes não medem desempenho real sob carga de produção.
- Smoke de acesso autenticado existente; verificações locais e suíte completa (`prisma generate`, typecheck, lint e `npm test`) conforme AGENTS.md.
- Verificar no navegador local a navegação afetada; sem credenciais disponíveis, registrar a limitação.

## 9. Perguntas em aberto

1. Aprovar o escopo e as interfaces de teste propostas (`obterContexto` e `exigirAcessoARota`)? — **Resposta:** aprovado por André em 2026-11-03.
2. A causa exata é contenção temporária, compilação ou outra condição? — **Resposta:** contenção por mais de dois segundos reproduziu o mesmo P2028 no teste; isso confirma um mecanismo possível, sem provar que todos os episódios locais tiveram essa causa. A correção reutiliza o limite de espera de 10 segundos já adotado pelo projeto.
