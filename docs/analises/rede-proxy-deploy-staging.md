# Análise: rede do proxy no deploy do staging

- **Data:** 2026-11-10
- **Pedido original:** Tratar a falha existente no CI antes de publicar as alterações visuais.
- **Status:** aprovada em 2026-11-10

## 1. Escopo previsto

Corrigir no repositório a validação do deploy em modo de proxy externo: verificar a rede `caddy_proxy`, definida em `docker-compose.proxy.yml`, em lugar de `somma_default`. Atualizar `ops/README.md` para documentar a mesma rede. A mudança será publicada pelo fluxo normal de CI e deploy; não há alteração manual na VPS nem criação de redes. A execução do deploy já autorizado pelo repositório continuará sendo automática.

## 2. Permissões

Não se aplica a perfis da aplicação: a alteração é uma checagem de infraestrutura; não muda ações, rotas, RLS ou acesso a dados.

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Permissões existentes | Sem alteração | Sem alteração | Sem alteração | Sem alteração |

## 3. Dados

Não se aplica: não altera campos, validações, dados sensíveis, schema, migration ou backfill. O deploy normal continua seguindo `ops/deploy.sh` e suas verificações existentes.

## 4. Impacto em telas e funções existentes

- `ops/deploy.sh`: altera somente a checagem da rede externa anterior ao deploy.
- `ops/README.md`: atualiza o nome documentado da rede.
- `docker-compose.proxy.yml` já usa `caddy_proxy` e não precisa mudar.
- O CI continua executando o mesmo deploy e verificando `/api/health`.

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| Verificação aponta para rede diferente da usada pelo Compose | Usar `caddy_proxy`, já declarada como externa no override | Conferência automatizada entre os arquivos e validação de sintaxe do script |
| Proxy não alcança a aplicação | O Compose já conecta o app com alias `multiplus-app` à rede compartilhada | Deploy automático e healthcheck HTTPS do CI |
| Mudança indevida no servidor | Não alterar a VPS manualmente; usar o fluxo versionado existente | Revisão do diff e acompanhamento do CI |
| Autorização, RLS, mascaramento, IDOR, validação, unicidade, registros desativados, SQL, fuso, links, uploads ou notificações | Não se aplica: nenhuma camada de domínio é alterada | Suíte completa e jornadas de navegador permanecem obrigatórias |

## 6. Casos-limite e estados

Modo standalone não muda. Em modo externo, a ausência de `caddy_proxy` continua interrompendo o deploy com mensagem explícita. Se o healthcheck falhar, o fluxo existente de rollback permanece responsável por tratar o problema.

## 7. Interface

Não se aplica: sem mudanças de tela ou responsividade.

## 8. Plano de testes

Verificar `bash -n ops/deploy.sh`, confirmar que a rede validada corresponde à do override e executar `npx prisma generate`, `npm run typecheck`, `npm run lint`, `npm test` e `npm run test:browser`. Após publicação, acompanhar o CI, o deploy e `/api/health`.

## 9. Perguntas em aberto

1. Aprovar a correção versionada? **Resposta:** aprovada pelo usuário em 2026-11-10.

**Evidência:** o run 42842508960 passou na suíte e nas jornadas e falhou antes do deploy porque `somma_default` não existe. Diagnóstico SSH somente de leitura mostrou `caddy_proxy`; `multiplus-app-1` e `app-caddy-1` estão conectados a ela, e a aplicação estava saudável.
