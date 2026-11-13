<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Múltiplus Software

Next.js (App Router) + Prisma 6 + PostgreSQL com RLS. Responda e comente em português,
com acentuação correta. Referências do produto: `docs/SRS_Multiplus_Software_v1.0.md` e
`docs/product-design-multiplus-<modulo>.md`.

## Comandos

```bash
npm run dev            # servidor local
npm run typecheck
npm run lint
npm test               # integração + smoke + unitários (precisa do Postgres de teste)
npm run test:unit      # só unitários, não precisa de banco
```

Os testes de integração e smoke usam o banco `multiplus_test`, criado e migrado pelo
`globalSetup`. Suba o Postgres com
`docker compose -f docker-compose.yml -f docker-compose.local.yml up -d postgres`
e configure `TEST_DATABASE_URL` e `TEST_APP_DATABASE_URL` no `.env`.

## Git

- Trabalhe direto na branch `staging`. Não crie branches nem worktrees.
- `main` é produção: não faça merge, push nem PR para ela sem pedido explícito.
- Nunca use `git push --force` nem reescreva commits já publicados.
- Adicione arquivos pelo caminho (`git add caminho`), nunca `git add -A`, `.` ou `commit -a`.
  Não deixe entrar `.env`, dumps, `*.tgz`, `tsconfig.tsbuildinfo` nem `report/`.
- Se houver alterações locais que não são da sua tarefa, preserve-as: não commite, não
  descarte e não misture nos seus commits.
- Mensagem no padrão do histórico, em português: `tipo(escopo): descrição`
  (`feat`, `fix`, `refactor`, `test`, `docs`, `ci`, `chore`, `ui`).
- Antes do push: `git fetch origin && git rebase origin/staging`. Em conflito, leia os
  dois lados e resolva arquivo por arquivo. Nunca use `-X theirs` / `-X ours`.
- Depois do push, apenas informe que foi publicado. Não fique esperando o CI.

## Banco e migrations

- O timestamp de uma migration nova precisa ser posterior à última do `origin/staging`.
- Migration já publicada é imutável: corrija com uma migration nova.
- Ao redefinir uma função SQL, parta do corpo da migration mais recente que a define
  (`grep -l "FUNCTION nome" prisma/migrations/*/migration.sql`).
- Tabela, view ou função nova precisa de policy RLS ou `GRANT`. Views sobre tabelas com
  RLS usam `security_invoker = true`.
- Não rode migration na VPS à mão: `ops/deploy.sh` faz isso.

## Segurança e regras do domínio

- Permissão se checa no servidor (função de `src/lib` ou server action) e no RLS, nunca só
  escondendo o botão na tela.
- Dado sensível é mascarado na query, view ou RLS. O campo não pode chegar ao navegador.
- Valide tudo no servidor. Em server actions, monte os dados campo a campo: não repasse o
  formulário inteiro (`perfil`, `ativo` e `clienteId` não podem vir do cliente).
- Não existe exclusão definitiva: registros são desativados (RF-039 / ADR-008). Consultas
  filtram `ativo`.
- Datas em UTC, formatadas com `timeZone: "UTC"`.

## Testes

- Rode `typecheck`, `lint` e os testes do módulo que você alterou. Se mudou regra, validação
  ou mensagem de erro, procure outros testes que dependem dela (`grep -rn "trecho" tests/`).
  A suíte completa roda no CI.
- Mudança de regra ou permissão leva teste: unitário em `tests/unit/`, integração em
  `tests/integration/` (RLS e permissão, testando o perfil permitido e o negado), smoke em
  `tests/smoke/`.
- Correção de bug: escreva primeiro o teste que falha.
- Não afrouxe asserções, não use `skip`/`only`/`todo` e não aumente timeout para fazer
  teste passar.

## Interface

- Identidade visual: `docs/Identidade_Visual_Multiplus.md`. A referência são os protótipos
  de `telas-novas/`.
- Cores só pelos tokens de `src/app/globals.css`. Sem hex fixo nem paleta padrão do Tailwind.
  Classe com token inexistente não dá erro, a cor só some: confira com
  `grep -- "--color-<nome>:" src/app/globals.css`.
- A tela precisa funcionar em 375 px e no desktop, sem rolagem horizontal. Tabelas viram
  lista no celular (padrão em `src/app/(painel)/subtarefas/page.tsx`).
- Ao mudar componente de `src/ui/` ou função de `src/lib/`, procure todos os usos
  (`grep -rn "Nome" src`).
- Ao renomear uma rota, atualize `src/lib/navegacao.ts` e deixe redirecionamento da antiga.

## Edição de arquivos

- Arquivos em UTF-8. Depois de editar por shell, confira se a acentuação continuou íntegra.
- O repositório mistura CRLF e LF: preserve a quebra de linha de cada arquivo.
- Não edite código gerado (`node_modules`, `.next`, cliente Prisma).
