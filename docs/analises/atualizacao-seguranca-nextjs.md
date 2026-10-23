# Análise: atualização de segurança do Next.js

- **Data:** 2026-10-23
- **Pedido original:** “Sim” — confirmação para tratar separadamente, no `staging`, a atualização de segurança recomendada após o aviso do Next.js.
- **Status:** aprovada em 2026-10-23

## 1. Escopo previsto

Atualizar o Next.js e o `eslint-config-next` de `16.4.0` para `16.4.1`, mantendo os pacotes da mesma versão, e atualizar o `package-lock.json` de forma consistente. A atualização atende ao alerta de segurança [GHSA-673q-mjm6-r5xr](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr).

Ficam fora do escopo: atualização de outras dependências sem necessidade direta, mudança de comportamento do produto, schema ou migration, e publicação em produção (`main`).

## 2. Permissões

Não se aplica: a alteração atualiza uma dependência do servidor e não muda ações, perfis ou acesso a dados.

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Usar o sistema após a atualização | Sem mudança | Sem mudança | Sem mudança | Sem mudança |
| Ver dados ou funções novas | Não se aplica | Não se aplica | Não se aplica | Não se aplica |

## 3. Dados

Não se aplica: não há campos, validações, mudança de dados, migration ou backfill. `package.json` e `package-lock.json` registram a nova versão do framework.

## 4. Impacto em telas e funções existentes

- Dependência global declarada em `package.json` e resolvida em `package-lock.json`.
- O Next.js atende as rotas da aplicação; não se prevê mudança intencional de interface ou contrato de dados.
- Foi lido o guia de atualização disponível em `node_modules/next/dist/docs/01-app/01-getting-started/18-upgrading.md`; não há guia específico da versão 16 no pacote instalado.

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| A versão atual está no intervalo vulnerável do aviso oficial | Atualizar para `16.4.1` ou versão posterior compatível e confirmar a versão resolvida no lockfile | Verificar a versão instalada/resolvida; typecheck e build/CI |
| Mudança do framework causa incompatibilidade em rotas ou renderização | Conferir o guia de upgrade local e validar a suíte completa exigida pelo repositório | `npm run typecheck`, `npm run lint`, `npm test` e CI/deploy |
| Lockfile fica inconsistente com `package.json` | Atualizar ambos usando npm e confirmar `npm ci`/CI | Instalação do CI e inspeção do diff do lockfile |
| A auditoria aponta vulnerabilidades em outras dependências transitivas | Manter o escopo desta alteração; registrar para avaliação separada, pois a correção automática proposta exige mudanças incompatíveis em MinIO/Prisma | `npm audit --omit=dev` |

## 6. Casos-limite e estados

- Não há alteração de estado de negócio nem de tela.
- Rotas existentes, autenticação, portal do cliente e renderização em celular precisam continuar funcionando conforme a suíte e o smoke do CI.
- Sem migration ou mudança de comportamento esperada.

## 7. Interface

Não se aplica: nenhuma tela, texto, cor ou fluxo visual será alterado.

## 8. Plano de testes

- Confirmar que `next` resolve para a versão corrigida no `package-lock.json` e após instalação limpa.
- Executar `npx prisma generate`, `npm run typecheck`, `npm run lint` e `npm test`, conforme a verificação completa do repositório.
- `npm audit --omit=dev` ainda aponta sete vulnerabilidades moderadas/altas ligadas a dependências transitivas de MinIO e Prisma; `npm audit fix --force` propõe mudanças incompatíveis e ficou fora do escopo aprovado.
- Publicar no `staging` somente com os comandos locais aprovados; acompanhar CI, deploy e `/api/health`.

## 9. Perguntas em aberto

1. Aprovar o escopo descrito para atualizar Next.js para `16.4.1` no `staging`? — **Resposta:** aprovado pelo usuário em 2026-10-23; `eslint-config-next` será alinhado na mesma versão.
