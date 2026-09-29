<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Regras de trabalho neste repositório

Estas regras valem para qualquer agente (Claude, Codex ou outro) e para qualquer alteração:
funcionalidade, correção, refatoração, migration ou documentação. Elas existem porque já
tivemos:

- **Branches paralelas e worktrees:** implementaram a mesma funcionalidade duas vezes.
- **Migrations com o mesmo timestamp:** entraram em conflito entre si.
- **Merges resolvidos em bloco:** descartaram código sem ninguém revisar.
- **Push sem rodar a suíte completa:** quebrou o CI do `staging` por causa de um teste de
  outro módulo.

O fluxo de uma alteração é sempre o mesmo, na ordem abaixo. Cada etapa tem uma seção própria.

1. [Sincronizar o `staging`](#1-antes-de-começar-sincronizar) antes de tocar em qualquer arquivo.
2. Implementar a alteração junto com os [testes](#3-testes).
3. Rodar a [verificação completa](#34-verificação-antes-do-commit-e-do-push) localmente.
4. Atualizar o [registro de decisões](#4-registro-das-decisões-de-desenvolvimento).
5. [Commitar e publicar](#2-versionamento) no `origin/staging`.
6. [Acompanhar o CI e o deploy](#25-depois-do-push) até ficarem verdes.
7. [Reportar](#5-resposta-final) o que foi feito e testado.

---

## 1. Antes de começar: sincronizar

Todo trabalho acontece na branch `staging`, no worktree principal do repositório. Antes da
primeira edição:

```bash
git fetch origin --prune
git status                      # precisa estar em "staging" e mostrar o que já existe localmente
git pull --ff-only origin staging
```

- **Branch diferente de `staging`:** pare e informe. Não troque de branch se houver
  alterações locais que não são suas.
- **`git pull --ff-only` falhou (histórico divergente):** pare e peça orientação. Não
  resolva com `reset`, `rebase` forçado ou `merge -X theirs/ours`.
- **Alterações locais que não são da sua tarefa:** preserve-as. Não faça commit delas,
  não as descarte (`checkout --`, `restore`, `stash drop`, `clean`) e não as misture nos
  seus commits.

## 2. Versionamento

### 2.1 Uma branch só: `staging`

- Desenvolva e publique diretamente em `origin/staging`. Cada push nele dispara o CI e,
  com o CI verde, o deploy automático no ambiente de teste da VPS.
- **Não crie** branches (`codex/*`, `feature/*` ou qualquer outra) nem worktrees
  (`git worktree add`). Os worktrees e branches `codex/*` que ainda existem são legados.
  Não trabalhe neles nem os use como base.
- **`main` é produção.** Não faça merge, push ou PR para `main` sem pedido explícito
  do usuário naquela conversa.
- **Nunca** use `git push --force` / `--force-with-lease` no `staging`, nem reescreva
  commits que já foram publicados.

### 2.2 Commits

- **Por tema.** Um commit por mudança coesa. Por exemplo, "migration e schema da recorrência",
  "tela de subtarefas" e "docs" viram três commits, e não um commit "várias alterações".
- **Adicione arquivos pelo caminho** (`git add caminho/arquivo`). Não use `git add -A`,
  `git add .` ou `git commit -a`: eles arrastam alterações de outras pessoas e arquivos
  temporários.
- **Mensagem no padrão já usado no histórico**, em português: `tipo(escopo): descrição`.
  - Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `ci`, `chore`, `ui`.
  - Escopo: o módulo (`tarefas`, `subtarefas`, `clientes`, `etiquetas`…).
  - Descrição: no imperativo e com acentuação correta.
- **Antes de commitar, confira o que entra:** `git status` e `git diff --staged`. Não
  pode entrar `.env`, arquivo de dump/backup, `*.tgz`, `tsconfig.tsbuildinfo` nem a pasta
  `report/`.

### 2.3 Integrar com o remoto antes do push

Outra pessoa ou outro agente pode ter publicado no `staging` enquanto você trabalhava:

```bash
git fetch origin
git rebase origin/staging        # só reaplica os SEUS commits ainda não publicados
```

- **Conflito:** resolva arquivo por arquivo, lendo os dois lados e mantendo o
  comportamento de ambos. **Nunca** resolva em bloco (`-X theirs`, `-X ours`,
  `checkout --theirs .`).
- **Não sabe qual lado vale:** aborte (`git rebase --abort`) e pergunte.
- **Depois de resolver:** rode de novo a verificação completa da seção 3.4. Um conflito
  resolvido é código novo.

### 2.4 Migrations (Prisma + SQL)

- **Nome:** o timestamp da migration nova precisa ser **posterior à última migration do
  `origin/staging`**. Confira com `ls prisma/migrations` depois do `fetch`/`rebase`.
  Duas migrations com o mesmo timestamp ou fora de ordem quebram o `migrate deploy`.
- **Commit:** `prisma/schema.prisma` e a pasta da migration vão **no mesmo commit**.
- **Migration publicada é imutável.** Se ela já está no `origin/staging`, já foi aplicada
  na VPS, e o Prisma recusa migration alterada. Corrija com uma migration nova.
- **Funções SQL (`CREATE OR REPLACE FUNCTION`, como `concluir_tarefa`):** parta sempre do
  corpo que está na **migration mais recente** que redefine aquela função. Procure com
  `grep -l "FUNCTION nome" prisma/migrations/*/migration.sql`. Partir de uma versão antiga
  apaga silenciosamente a regra que outra migration acrescentou.
- **RLS e permissões:** migration que cria tabela, view ou função precisa ter a policy ou o
  `GRANT` correspondente. Ela também precisa de teste de integração que prove o acesso
  permitido **e** o negado (ver seção 3.2).
- **Na VPS:** `ops/deploy.sh` aplica as migrations sozinho. Não rode migration à mão.
  O acesso `ssh vps` é para diagnóstico somente de leitura, como consultar
  `_prisma_migrations`, `docker ps` e logs. Qualquer alteração manual na VPS exige pedido
  explícito.

### 2.5 Depois do push

```bash
git push origin staging
gh run watch                     # ou: gh run list --branch staging --limit 3
```

- **A tarefa só termina com o CI verde** (typecheck, lint, suíte completa e deploy com
  `/api/health` respondendo 200).
- **CI vermelho:** investigue o log (`gh run view <id> --log-failed`) e publique a correção
  como **novo commit** o quanto antes. O `staging` quebrado bloqueia o trabalho de todos.
  Não use `revert` nem force-push sem combinar com o usuário.

## 3. Testes

O padrão completo está em [`docs/padrao-testes-por-sprint-multiplus.md`](docs/padrao-testes-por-sprint-multiplus.md).
Esta seção resume o que é obrigatório em cada alteração.

### 3.1 Ambiente

Os testes de integração e de smoke usam um Postgres real, em um banco separado
(`multiplus_test`), que o `globalSetup` cria e migra sozinho. O banco de desenvolvimento
nunca é tocado.

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d postgres
```

- **Configuração:** exige `TEST_DATABASE_URL` e `TEST_APP_DATABASE_URL` no `.env` (ver
  `.env.example`).
- **Senha da role:** a role `multiplus_app` precisa de senha no banco de teste.
- **Postgres indisponível:** **não publique.** Informe o usuário. A seção 3.4 não pode ser
  pulada.

### 3.2 Que teste escrever

| O que mudou | Tipo | Onde |
|---|---|---|
| Regra pura (cálculo de prazo, recorrência, máscara, validação, indicador) | Unitário | `tests/unit/<modulo>.unit.test.ts` |
| Função de `src/lib`, server action, RLS, trigger, função SQL, permissão por perfil | Integração | `tests/integration/<modulo>.integration.test.ts` |
| Fluxo crítico ponta a ponta (login, convite, recuperação de senha, acesso) | Smoke | `tests/smoke/<modulo>.smoke.test.ts` |

- **Cabeçalho:** todo arquivo de teste começa com um comentário citando o RF/RN coberto.
- **Correção de bug:** primeiro escreva o teste que reproduz o bug e falha. Depois
  corrija o código.
- **Permissão e RLS:** teste os dois lados. O perfil autorizado consegue, e cada perfil
  não autorizado recebe erro. Em asserções de erro, use a mensagem esperada
  (`toThrow(/RN-007/)`), não apenas `toThrow()`.
- **Mudança de regra, validação ou mensagem de erro:** procure todos os testes que dependem
  dela antes de publicar (`grep -rn "trecho" tests/`). Foi assim que o `staging` quebrou em
  28/09: mudou a paleta de etiquetas e um teste de outro arquivo usava uma cor que deixou
  de existir.

### 3.3 O que é proibido para "fazer o teste passar"

- **Afrouxar asserções:** trocar `toThrow(/mensagem/)` por `toThrow()`, `toEqual` por
  `toBeDefined`, ou remover `expect`.
- **Pular testes:** usar `it.skip`, `describe.skip`, `it.only`, `.todo`, ou comentar e
  apagar o teste.
- **Relaxar a configuração:** aumentar timeout ou desligar `fileParallelism` para esconder
  uma falha intermitente.

Se o comportamento mudou **de propósito**, atualize o teste para o novo comportamento
esperado, com a mesma precisão de antes. Registre também a mudança em
`docs/decisoes-desenvolvimento.md`.

### 3.4 Verificação antes do commit e do push

- **Durante o desenvolvimento:** rode os testes do módulo que está mexendo, por exemplo
  `npx vitest run tests/integration/tarefas-rn006.integration.test.ts`.
- **Antes do push:** rode **exatamente o que o CI roda**, sempre com a suíte completa e
  não só a do módulo:

```bash
npx prisma generate
npm run typecheck
npm run lint
npm test                         # integração + smoke + unitários
```

Alterações só em `docs/` ou em arquivos `.md` dispensam a suíte local. O CI continua
precisando ficar verde depois do push.

Tudo precisa passar. Se algum teste falhar por motivo alheio à sua alteração,
confira se ele também falha no `origin/staging` sem as suas mudanças. Depois informe
o usuário antes de publicar. Não publique com teste vermelho.

## 4. Registro das decisões de desenvolvimento

Para cada funcionalidade, correção ou outra alteração de código, crie ou atualize
[`docs/decisoes-desenvolvimento.md`](docs/decisoes-desenvolvimento.md), no mesmo commit do
código ou logo após. Use o formato já existente no arquivo:

```markdown
## <Módulo>: <resumo da alteração>

- **Data:** AAAA-MM-DD
- **Objetivo:** por que a alteração foi feita.
- **Decisão:** o que foi combinado com o usuário.
- **Comportamentos:** regras, casos-limite e permissões.
- **Efeito na interface:** o que muda para quem usa o sistema.
```

- **Decisão alterada depois:** atualize a entrada original e registre a mudança. O documento
  descreve o comportamento **atual**.
- **Sem invenção:** não registre decisões que não foram discutidas. Se faltar uma
  decisão necessária para implementar, pergunte ao usuário **antes** de implementar.

## 5. Resposta final

Ao concluir, informe:

1. **Commits:** o hash e a mensagem de cada commit publicado no `staging`.
2. **Testes:** os comandos executados e o resultado de cada um (ex.: `npm test` →
   `312 passed`).
3. **Testes criados ou alterados:** quais foram e o que cobrem.
4. **CI e deploy:** o status do run e do healthcheck do `staging`.
5. **Pendências:** o que não foi possível verificar e por quê. Isso inclui testes não
   executados, CI ainda rodando e decisões pendentes com o usuário.

## 6. Edição de arquivos

- **Codificação:** os arquivos são UTF-8, com texto em português acentuado. Depois de
  editar por shell, confira se a acentuação continua íntegra (`Seção`, não `SeÃ§Ã£o`).
- **Quebras de linha:** o repositório mistura CRLF e LF. Preserve a quebra de linha de cada
  arquivo e não converta arquivos inteiros. Um diff que troca todas as linhas esconde a
  mudança real.
- **Arquivos gerados:** não edite à mão código gerado (`node_modules`, `.next`, cliente
  Prisma).
