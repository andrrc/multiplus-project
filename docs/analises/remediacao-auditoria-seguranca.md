# Análise: remediação dos achados da auditoria de segurança

- **Data:** 2026-10-08
- **Pedido original:** “Pode começar a análise de remediação”
- **Status:** aprovada em 2026-10-08

## 1. Escopo previsto

Remediar os achados identificados na revisão do código e no `npm audit`, sem alterar as permissões funcionais dos perfis:

1. Atualizar dependências afetadas pelo `npm audit`, começando pelo Next.js `16.3.4` e pelas dependências transitivas vulneráveis. A atualização deve usar versões corrigidas e compatíveis com as APIs utilizadas. Não executar `npm audit fix --force` sem revisar cada mudança; em particular, o relatório sugere um downgrade do SDK MinIO que precisa de checagem de compatibilidade. A árvore atual é `minio@8.0.7` → `query-string@7.1.3` → `decode-uri-component@0.2.2`, além de `stream-json@1.9.1`. O `npm audit fix --dry-run` mostrou que atualizações compatíveis corrigem alguns alertas, mas não limpam a auditoria; o caminho automático forçado sugere `minio@7.1.3`, uma mudança de major. A validação final deve repetir `npm audit` e `npm audit --omit=dev`.
2. Revogar a execução de funções `SECURITY DEFINER` para `PUBLIC` e conceder `EXECUTE` somente à role `multiplus_app` nas funções chamadas pela aplicação ou por políticas RLS. Funções de trigger devem manter o funcionamento dos triggers sem uma concessão pública desnecessária. Criar uma migration posterior à última migration de `origin/staging` (atualmente `20261002100000_area_exclusiva_cliente_sprint6`).
3. Limitar tentativas de autenticação no próprio fluxo Credentials do Auth.js, de modo que chamadas diretas ao endpoint de autenticação não contornem o controle. A resposta de falha deve continuar genérica e não revelar se o e-mail existe. A proposta inicial é registrar somente falhas, com limites por IP e e-mail, e usar o limitador em memória já existente, adequado à implantação atual de um processo. Isso mantém a limitação documentada de que reinício zera a contagem e múltiplas instâncias exigiriam estado compartilhado.
4. Adicionar uma política CSP compatível com o Next.js App Router. A política deve ser aplicada no servidor e testada em rotas públicas e autenticadas; avaliar nonce por requisição caso os scripts gerados pelo Next.js precisem dele. Manter os cabeçalhos existentes no Caddy.

**Fora do escopo:** mudança nas permissões de negócio/RLS, troca do provedor de autenticação ou storage, pentest da VPS/rede/firewall, rotação de secrets, alteração de política de senha e refatoração ampla do sistema de rate limit. Não está prevista mudança visível de interface.

## 2. Permissões

Não há mudança intencional na matriz funcional de perfis. As proteções novas valem igualmente para todos os perfis.

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Entrar com credenciais válidas em conta ativa, respeitado o limite de tentativas | Sim | Sim | Sim | Sim |
| Continuar usando sessão e ações permitidas ao perfil atual | Sem mudança | Sem mudança | Sem mudança | Sem mudança |
| Executar diretamente funções SQL de autorização pela role da aplicação | Sem mudança de perfil; somente `multiplus_app` recebe os grants requeridos | Sem mudança | Sem mudança | Sem mudança |
| Receber respostas sob a política CSP do sistema | Sim | Sim | Sim | Sim |

## 3. Dados

- Atualização de dependências: sem alteração de dados da aplicação.
- Migration: somente ACLs de funções; sem alteração de tabelas, backfill ou dados de clientes.
- Rate limit: a proposta inicial usa memória do processo, sem persistência. Se for escolhido armazenamento compartilhado, haverá tabela/migration e a análise precisará ser ajustada antes da implementação.
- CSP e autenticação: não adicionar campos ao usuário nem expor claims novos ao navegador.
- A identidade, senha, perfil e vínculo com cliente continuam regidos pelo comportamento atual documentado em `docs/funcionalidades/autenticacao-acesso.md`.

## 4. Impacto em telas e funções existentes

- `package.json` e `package-lock.json`: atualizar Next.js e dependências com avisos, preservando compatibilidade do SDK MinIO e do Prisma.
- `src/server/auth/config.ts` e `src/server/auth/credentials.ts`: aplicar o rate limit na autorização do provider, inclusive para chamadas diretas ao endpoint Auth.js.
- `src/lib/rate-limit.ts`: acrescentar operações para consultar bloqueio, contabilizar falha e limpar estado após autenticação bem-sucedida, sem contar logins válidos como falhas.
- `prisma/migrations/`: nova migration com revogação de grants públicos e concessões explícitas à role `multiplus_app` para as funções necessárias. Revisar todas as funções `SECURITY DEFINER`, incluindo as definidas antes da Sprint 6.
- `Caddyfile` e, se necessário após ler a documentação local do Next.js, configuração de resposta da aplicação: política CSP e preservação dos cabeçalhos atuais. A documentação instalada mostra que nonce exige renderização dinâmica para todas as páginas, desativa geração estática/cache e pode aumentar custo; a política escolhida é estática no Caddy, com `unsafe-inline` em scripts para compatibilidade com a hidratação do Next, sem `unsafe-eval`.
- `tests/unit/administracao-acesso.unit.test.ts`, `tests/smoke/autenticacao.smoke.test.ts` e testes de integração de autenticação/RLS: cobertura dos limites, grants e regressão.
- Após implementação, atualizar `docs/funcionalidades/autenticacao-acesso.md`, remover a limitação L2 se o login estiver protegido, descrever a limitação residual do rate limit em memória (L3), e acrescentar uma linha em `docs/decisoes-desenvolvimento.md`.
- Não há PDD de autenticação listado em `docs/`; a mudança não altera layout ou fluxo visual. PDD e identidade visual não se aplicam.

## 5. Riscos e segurança

| Risco | Mitigação prevista | Teste que cobre |
|---|---|---|
| Atualizar Next.js ou dependências quebrar APIs usadas pelo projeto | Antes de codar, ler a documentação correspondente em `node_modules/next/dist/docs/`; atualizar para versões corrigidas e compatíveis; revisar o diff do lockfile | `npm run typecheck`, `npm run lint`, `npm test`, build local e `npm audit` completo/produção |
| Resolver alertas do MinIO com downgrade incompatível ou override inadequado | Inspecionar a árvore de dependências e os usos de `minio`; não aceitar downgrade maior sem compatibilidade verificada; testar fluxo de upload/leitura | Teste de integração de comentários/imagem e smoke do fluxo; `npm audit --omit=dev` |
| Chamada direta ao callback Credentials contornar rate limit aplicado apenas na tela | Colocar a decisão de limite dentro do `authorize` usado pelo endpoint Auth.js | Smoke/integration: repetidas tentativas inválidas pela ação e pela rota Credentials são recusadas pelo limite |
| Limite bloquear pessoa legítima ou contar login válido como falha | Contabilizar falhas de credencial, não tentativas bem-sucedidas; usar resposta genérica; definir janela e limites antes de implementar | Unitário: limite, expiração, limpeza após login válido, chaves por IP/e-mail e mensagens iguais para conta existente/inexistente |
| Atacante consumir a cota de e-mail de outra pessoa e impedir temporariamente o login dela | Não desativar a conta nem aplicar bloqueio permanente; manter cooldown curto e permitir recuperação de senha; revisar se a cota por e-mail deve ser atraso progressivo em vez de negação | Integração: tentativas de um IP não alteram estado permanente da conta; recuperação de senha continua disponível durante o cooldown |
| `PUBLIC` continuar executando função privilegiada | Revogar `EXECUTE` de `PUBLIC` para as funções `SECURITY DEFINER`; conceder apenas o necessário a `multiplus_app`; preservar dono e execução de triggers | Integração consulta ACL (`pg_proc`/`aclexplode`): `PUBLIC` não executa; role da aplicação executa somente as funções requeridas; testes RLS continuam passando |
| Revogar grant necessário quebrar política RLS, view ou rotina | Mapear chamadas diretas, chamadas dentro de políticas e triggers antes de escrever a migration; conceder explicitamente à role de runtime | Integração de permissões existente mais teste de execução permitida/negada por função |
| CSP bloquear scripts, imagens ou navegação legítima | Usar a documentação do Next.js instalado para nonce/headers; validar rotas de login, painel, portal e imagens; ajustar a lista ao que o sistema realmente carrega | Smoke local com console sem bloqueios CSP; cabeçalhos conferidos em rotas públicas e autenticadas |
| Mudança de dependência alcançar funcionalidade não coberta por teste | Revisar `npm ls`/diff do lockfile e cobrir autenticação, upload MinIO e renderização; executar a suíte completa | `npm test`, `npm run typecheck`, `npm run lint`, build e auditoria de dependências |

## 6. Casos-limite e estados

- E-mail inexistente, conta desativada, conta sem senha e senha incorreta devem continuar produzindo falha genérica no login; nenhuma variante deve permitir descobrir contas por mensagem.
- Um login válido não deve consumir a cota de falhas. A janela expirada deve liberar nova tentativa; o estado em memória pode se perder ao reiniciar o processo.
- Limite por e-mail pode ser abusado para causar indisponibilidade temporária a uma vítima; não desativar o usuário e manter disponível o fluxo de recuperação de senha.
- IP ausente ou encaminhado pelo proxy: usar o comportamento seguro definido para o ambiente atual; não confiar em um cabeçalho que possa ser fornecido diretamente por cliente quando o proxy não o sobrescrever.
- Requisições ao callback Credentials feitas sem usar a tela de login também passam pelo mesmo limite.
- Funções SQL chamadas por políticas RLS e funções de trigger precisam continuar operando depois da revogação de `PUBLIC`.
- Dados e permissões entre clientes, projetos, tarefas e subtarefas permanecem iguais antes e depois da nova migration.
- CSP deve funcionar em login, recuperação/definição de senha, painel, portal, imagens de comentário e links externos já permitidos.
- A atualização deve passar no build e nas suítes, sem exigir migração de dados da aplicação.

## 7. Interface

Sem mudanças de layout. O login mantém a mesma mensagem genérica para credenciais inválidas ou tentativas limitadas, sem revelar a existência da conta. A CSP é uma configuração de resposta HTTP, não uma nova tela. A verificação visual em 375 px não se aplica se a interface permanecer inalterada; o fluxo de login deve ser exercitado por smoke test.

## 8. Plano de testes

- **Unitário:** limites de tentativas inválidas por IP/e-mail, expiração, sucesso não contabilizado, limpeza e resposta genérica.
- **Integração/Auth.js:** limite aplicado no callback Credentials, inclusive sem passar pela Server Action da tela; login válido ainda funciona.
- **Integração/Postgres:** conferir ausência de `EXECUTE` para `PUBLIC` nas funções protegidas e preservar os grants necessários de `multiplus_app`; executar os testes RLS de projetos/tarefas/subtarefas e portal.
- **Integração/smoke de mídia:** upload permitido e leitura autenticada de imagem seguem funcionando após atualização do SDK MinIO.
- **CSP:** smoke de login, painel, portal e imagem; confirmar cabeçalho e ausência de bloqueios legítimos no console do navegador.
- **Dependências/build:** `npm audit`, `npm audit --omit=dev`, `npm run typecheck`, `npm run lint`, `npm test` e `npm run build`.
- Antes do push, seguir a verificação completa definida no `AGENTS.md`; não publicar com teste vermelho.

## 9. Perguntas em aberto

1. **Rate limit do login:** contar falhas por IP e e-mail em memória, com janela de 15 minutos: 5 falhas por e-mail e 20 por IP. — **Resposta:** aprovado por André em 2026-10-08.
2. **Escopo da atualização de dependências:** atualizar para versões corrigidas compatíveis; se o MinIO só puder ser corrigido por downgrade/override incompatível, pausar e apresentar a alternativa antes de alterar a dependência? — **Resposta:** manter o SDK MinIO 8; buscar correção compatível e não fazer downgrade para 7.1.3, aprovado por André em 2026-10-08. A versão mais recente publicada na linha v8 é 8.0.7. O código da SDK usa `stream-json/jsonl/Parser.js`; o advisory requer `stream-json` 3.6.0, uma major ESM, e a árvore atual também usa `decode-uri-component` 0.2.2 enquanto a correção é 0.5.0. Nenhum override foi aplicado sem teste de compatibilidade do pacote e do fluxo de mídia. O risco permanece pendente para a próxima versão compatível do SDK ou correção upstream validada.

## Resultado da remediação

- Next.js e `eslint-config-next` atualizados juntos para 16.4.0; `npm audit fix` atualizou dependências transitivas compatíveis. As vulnerabilidades críticas do Next e outras corrigíveis sem downgrade foram removidas.
- O build padrão com Turbopack falhou ao resolver fontes Google com Next 16.4.0; o build de produção passou com a opção oficial `--webpack`. O script `npm run build` usa essa opção para manter o build reproduzível nesta versão.
- O login passa a limitar falhas a 5 por e-mail e 20 por IP em 15 minutos, usando `X-Real-IP` sobrescrito pelo Caddy. O bloqueio é aplicado no próprio `authorize` do Auth.js.
- A migration revoga `EXECUTE` de `PUBLIC` em todas as funções `SECURITY DEFINER` do schema `public` e concede à role `multiplus_app` as permissões necessárias para policies e funções usadas pelo runtime.
- Caddy entrega CSP, mantendo `unsafe-inline` para a compatibilidade dos scripts inline gerados pelo Next; `unsafe-eval` é bloqueado. CSP nonce não foi adotada porque a documentação do Next exige renderização dinâmica em todas as páginas e desabilita geração estática/cache.
- Permanecem alertas na cadeia do MinIO 8 e no Prisma 6.19.3. `npm audit --omit=dev` após as atualizações ainda reporta 7 vulnerabilidades (4 moderadas, 3 altas); não foi feito downgrade nem override major sem compatibilidade demonstrada.
