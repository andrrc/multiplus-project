<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Múltiplus Software

Next.js (App Router) + Prisma 6 + PostgreSQL com RLS. Responda e comente em português,
com acentuação correta. Referências do produto: `docs/SRS_Multiplus_Software_v1.0.md` e
`docs/product-design-multiplus-<modulo>.md`.

## Por onde começar

Antes de trabalhar, leia o estado atual do projeto. Ele fica nos arquivos, não na conversa:

- `docs/analises/planejamento-diferencas-prototipos.md`: o que falta entre os protótipos de
  `telas-novas/` e o sistema, em fases, com o andamento e as perguntas ainda sem resposta da cliente.
- `docs/decisoes-desenvolvimento.md`: decisões já tomadas, em ordem de data. Não as refaça.
- `docs/funcionalidades/<modulo>.md`: como cada módulo funciona, com limitações e histórico.
- `docs/pendencias-antes-producao.md`: o que precisa ser resolvido antes de ir para produção.
- `git log --oneline -20`: o que foi feito por último.

Mudança que altera dado, permissão ou regra de prazo começa por uma análise em
`docs/analises/`, aprovada pelo usuário antes do código. Ao terminar um trabalho, atualize no
mesmo commit o `planejamento-diferencas-prototipos.md` e a página do módulo em
`docs/funcionalidades/`, para a próxima pessoa ou ferramenta saber o que mudou.

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

## Decisões que o código não mostra

- **Dados dos protótipos são ilustrativos.** Em `telas-novas/`, nomes, números, datas e contagens
  (clientes de exemplo, "último acesso", valores) não precisam existir no sistema. Copie a
  estrutura, o visual e o comportamento; não crie campo nem migration só porque um número aparece.
- **Prisma fica na 6.19.3.** Não atualize para a 7 ou a 8: a 7 exige driver adapters e a 8 é voltada
  à plataforma gerenciada da Prisma.
- **Sessão por JWT, sem adapter do Auth.js.** Definir e recuperar senha usam `src/lib/tokens.ts` e a
  tabela `TokenAcesso`.
- **Duas roles no Postgres.** A dona das tabelas ignora o RLS e só serve para o login e os tokens,
  antes de existir sessão (`src/lib/prisma.ts`). Todo o resto usa a role restrita pelo RLS
  (`src/lib/prisma-app.ts`).
- **Regra que o RLS sozinho não cobre vira trigger.** Exemplo: a RN-004 da subtarefa (só o atribuído
  conclui) compara valor antigo e novo, o que a política não faz.
- **O Next 16 chama o middleware de `proxy.ts`.**
- **Desativar tem duas camadas.** O RLS esconde o registro desativado de quem não é administrador; a
  aplicação filtra `ativo` por padrão e o "Mostrar desativados" desliga esse filtro.
- **A BrasilAPI exige o header `User-Agent`** no `fetch` do Node.
- A porta do Postgres local é a 5434, porque a 5432 e a 5433 já são de outros projetos da máquina.

## Edição de arquivos

- Arquivos em UTF-8. Depois de editar por shell, confira se a acentuação continuou íntegra.
- O repositório mistura CRLF e LF: preserve a quebra de linha de cada arquivo. Um padrão com `\n`
  não casa em arquivo CRLF e a substituição "roda" sem alterar nada.
- Para conteúdo longo com acentos e crases, não use heredoc no shell: ele quebra e pode não criar o
  arquivo. Use a ferramenta de escrita de arquivo ou um script Python com
  `io.open(..., encoding="utf-8", newline="")` que falhe quando a âncora não existir.
- Não edite código gerado (`node_modules`, `.next`, cliente Prisma).
