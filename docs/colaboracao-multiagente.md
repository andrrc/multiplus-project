# Colaboração entre agentes (Claude Code e Codex)

Este documento define como dois agentes de programação, Claude Code e OpenAI Codex, trabalham ao mesmo tempo
neste repositório sem se atrapalhar. A fonte única das regras do projeto continua sendo o [`AGENTS.md`](../AGENTS.md);
aqui estão só as regras de convivência. Quem decide e integra é sempre a pessoa responsável pelo projeto.

- **Status:** proposta preparada em 2026-11-23, aguardando a aprovação do usuário (muda o fluxo de Git descrito no `AGENTS.md`).
- **Onboarding do Codex:** [onboarding-codex.md](onboarding-codex.md), com o prompt de inicialização.
- **Tarefas:** [tarefas/README.md](tarefas/README.md) (registro, modelo de tarefa e modelo de revisão).
- **Auditoria que originou isto:** [analises/auditoria-multiagente.md](analises/auditoria-multiagente.md).

## 1. Princípios

1. **Um escopo por agente.** Cada tarefa tem dono, branch, pasta de trabalho e lista de arquivos permitidos.
2. **Ninguém integra sozinho.** O agente publica a branch; a pessoa responsável revisa e faz o merge.
3. **Nenhum agente edita a branch do outro.** Revisão gera relatório, não commit.
4. **Decisão de regra de negócio, permissão, dado ou prazo é humana.** Vale a regra do `AGENTS.md`: análise aprovada antes do código.
5. **O conhecimento fica nos arquivos**, nunca só na conversa. Nenhum agente pode supor que o outro viu o seu histórico.

## 2. O que cada agente lê sozinho e o que precisa ser lido

| Fonte | Claude Code | Codex |
|---|---|---|
| `AGENTS.md` (regras do projeto) | Lê, por importação: o `CLAUDE.md` só contém `@AGENTS.md` | Lê direto, ao entrar no repositório |
| `CLAUDE.md` | Lê | Não usa |
| Memória do Claude (`~/.claude/projects/.../memory/`) | Lê, mas **fica fora do repositório** | **Não vê.** Nada que o Codex precise pode existir só ali |
| `docs/` (planejamento, decisões, módulos, este protocolo) | Só se mandado ou se citado | Só se mandado ou se citado |
| O prompt de início da tarefa | Recebe | Recebe |

Por isso a seção "Por onde começar" do `AGENTS.md` lista os documentos a ler, e o prompt do Codex repete a lista. Não duplique regras
em dois arquivos: se uma regra vale para os dois, ela vai no `AGENTS.md`.

## 3. Papéis

- **Pessoa responsável (humano):** define as tarefas, aprova análises, revisa Pull Requests, faz o merge e decide conflitos.
- **Agente principal (hoje, Claude Code):** conhece o histórico do projeto, escreve análises e consolida a documentação compartilhada.
- **Agente secundário (Codex):** executa tarefas com escopo fechado, a partir deste protocolo e do `AGENTS.md`. Pode virar principal no futuro: os papéis não são fixos por tecnologia, e não há divisão obrigatória entre frontend e backend.

## 4. Ciclo de uma tarefa

1. A pessoa (ou o agente principal, com aprovação) cria o arquivo da tarefa a partir de [MODELO-DE-TAREFA.md](tarefas/MODELO-DE-TAREFA.md) em `docs/tarefas/` e a registra no [registro](tarefas/README.md), com os arquivos compartilhados que ela vai reservar.
2. Cria-se o ambiente isolado: `bash scripts/agentes/novo-worktree.sh <claude|codex> <id-da-tarefa>`.
3. O agente trabalha **só** dentro do escopo, commita na própria branch e roda `bash scripts/agentes/verificar.sh`.
4. O agente preenche o resumo no arquivo da tarefa, publica a branch (`git push -u origin <agente>/<id>`) e avisa a pessoa.
5. Outro agente (ou a pessoa) faz a revisão cruzada (seção 9) e entrega o relatório.
6. A pessoa abre o Pull Request para `staging`, confere o CI e faz o merge.
7. Depois do merge, remove-se o ambiente: `bash scripts/agentes/remover-worktree.sh <agente> <id> --apagar-branch`.

## 5. Branches e worktrees

- **Nome da branch:** `claude/<id-da-tarefa>` ou `codex/<id-da-tarefa>`. O prefixo `codex/` já existe no histórico do projeto.
- **Origem:** sempre `origin/staging`. As branches locais `main` e `staging` não recebem commits de agente em modo multiagente.
- **Onde ficam os worktrees:** **fora do projeto**, em `~/multiplus-worktrees/<agente>-<id>` (ou na pasta de `MULTIPLUS_WORKTREES`). O projeto fica no OneDrive, que sincronizaria a `node_modules` inteira. O Codex também mantém worktrees próprios em `~/.codex/worktrees`: eles valem as mesmas regras.
- **Sem upstream automático:** o script cria a branch com `--no-track`. Sem isso, um `git push` iria para `origin/staging` e dispararia o deploy. A publicação é sempre explícita: `git push -u origin <branch>`.
- **Cada worktree tem a sua `node_modules`** (`npm ci` e `npx prisma generate`; o cliente Prisma vive dentro de `node_modules` e não pode ser compartilhado entre branches com schemas diferentes) e o seu `.env`, copiado do checkout principal e **nunca commitado**.
- **Proibido:** `git push --force`, reescrever commit já publicado, `git reset --hard` ou `git clean` em checkout alheio, apagar worktree ou branch que não seja da própria tarefa, `-X ours`/`-X theirs`.

Comandos úteis:

```bash
bash scripts/agentes/novo-worktree.sh codex etapa2-prazo --simular   # mostra o que faria, sem criar nada
bash scripts/agentes/novo-worktree.sh codex etapa2-prazo
bash scripts/agentes/verificar.sh                                    # arquivos sensíveis, typecheck, lint, unitários
bash scripts/agentes/verificar.sh --completo                         # inclui integração e navegador, com trava
bash scripts/agentes/remover-worktree.sh codex etapa2-prazo --apagar-branch
git worktree list
```

**Onde rodar os scripts: no Git Bash.** No Windows, o comando `bash` do PowerShell abre o **WSL**, e não o Git Bash; rodar ali criaria o worktree dentro do Linux (`/root/...`), sem `node_modules`, e o Git do Windows o veria como "prunable" (aconteceu duas vezes). Por isso os scripts **recusam rodar no WSL** sobre um repositório do Windows (`_ambiente.sh`) e explicam o que fazer. No PowerShell, chame o bash do Git pelo caminho: `& "C:\Program Files\Git\bin\bash.exe" scripts/agentes/novo-worktree.sh codex <id>`. Um repositório que mora dentro do próprio WSL (fora de `/mnt/`) continua funcionando.

`remover-worktree.sh` recusa remover quando há alteração não commitada ou commit que ainda não está em `origin/staging`, e nunca usa `--force`.

## 6. Banco e portas (recursos compartilhados)

| Recurso | Valor | Regra |
|---|---|---|
| Postgres local | `127.0.0.1:5434`, um só para todos os worktrees | Ninguém recria o contêiner nem apaga o volume (`down -v` é proibido). |
| Banco de testes de integração | `multiplus_test` (nome fixo, validado no código) | **Uma suíte por vez em toda a máquina.** |
| Banco das jornadas de navegador | `multiplus_test_e2e` (nome fixo) | Idem; o Playwright também usa a porta fixa `3105`. |
| Servidor de desenvolvimento | `npm run dev` escolhe a primeira porta livre de 3001 a 3100 | Sem conflito entre worktrees. |
| MinIO local | `127.0.0.1:9000` e `9001` | Compartilhado; não apague o bucket. |

A trava de `verificar.sh --completo` impede duas suítes de banco ao mesmo tempo (ela fica na pasta comum do Git, vista por todos os worktrees). Rodar `npx vitest run` ou `npm run test:browser` direto, sem o script, **fura a trava**: não faça isso enquanto outro agente trabalha. Os testes unitários não usam banco e rodam em paralelo sem problema.

**Migrations.** O timestamp de uma migration nova precisa ser posterior à última de `origin/staging`, e migration já publicada é imutável. Por isso:

- Só uma tarefa por vez pode mexer em `prisma/schema.prisma` e em `prisma/migrations/`; ela é reservada no registro.
- Antes de publicar a branch: `git fetch origin && git rebase origin/staging` e conferir o timestamp.
- Ninguém roda migration na VPS; o `ops/deploy.sh` faz isso no deploy.

## 7. Arquivos compartilhados

São os pontos onde duas tarefas quase sempre colidem. Mexer neles exige reserva no registro de tarefas **antes** de começar, e só uma tarefa por vez pode reservar cada item:

- `prisma/schema.prisma` e `prisma/migrations/**`;
- `src/lib/navegacao.ts` (menu e guarda de rota);
- `src/app/globals.css` (tokens de cor e tipografia);
- `src/ui/**` (componentes compartilhados: a mudança afeta todas as telas);
- `package.json`, `package-lock.json` (dependência nova também exige aprovação humana);
- `src/lib/projetos-tarefas.ts` (concentra muitas consultas), `src/lib/prisma-app.ts`, `src/server/auth/**`;
- configuração de testes (`vitest*.mts`, `playwright.config.ts`, `tests/setup-env.ts`, `tests/integration/setup/**`);
- `.github/**`, `ops/**`, `Dockerfile`, `docker-compose*.yml`, `Caddyfile`;
- `AGENTS.md`, `CLAUDE.md` e esta pasta de colaboração.

**Documentação compartilhada.** `docs/analises/planejamento-diferencas-prototipos.md` e `docs/decisoes-desenvolvimento.md` são editados por todo mundo ao fim de cada entrega, então geram conflito. Em modo multiagente, o agente **não** os edita na branch da tarefa: escreve a seção "Notas para o planejamento e as decisões" no arquivo da tarefa, e quem integra consolida os dois documentos no merge. A página do módulo em `docs/funcionalidades/` continua sendo atualizada na própria tarefa.

Se uma tarefa descobre que precisa de um arquivo compartilhado que não reservou, ela **para**, registra no arquivo da tarefa e pede decisão à pessoa. Não edita por conta própria.

## 8. Integração

- O agente nunca faz push em `staging` ou `main`, nunca faz merge e nunca abre Pull Request sem pedido. O push de `staging` e `main` dispara o deploy, quando as variáveis do repositório o habilitam.
- O Pull Request vai para `staging`. O CI roda em todo push e Pull Request (typecheck, lint, suíte completa e navegador) e o deploy só roda depois que ele passa.
- Antes de pedir a integração: `git fetch origin && git rebase origin/staging` na branch da tarefa (permitido enquanto ela não foi publicada; depois de publicada, trate como histórico compartilhado e resolva por merge a pedido da pessoa).
- Conflito de integração: leia os dois lados e resolva arquivo por arquivo; se a regra de negócio dos dois lados diverge, **pare e pergunte**.
- A pessoa pode integrar uma tarefa de cada vez, na ordem das dependências declaradas.

## 9. Revisão cruzada

- Claude implementa e o Codex revisa, ou o contrário. Quem revisa trabalha em um **worktree de leitura** da branch do outro, sem commitar nela.
- A entrega é um arquivo `docs/tarefas/<id>-revisao.md` preenchido com [MODELO-DE-REVISAO.md](tarefas/MODELO-DE-REVISAO.md). Ele fica na branch do **revisor** ou é entregue à pessoa; nunca entra como commit na branch revisada.
- O revisor avalia: aderência à arquitetura e ao `AGENTS.md`, padrões de código, segurança (permissão no servidor e no RLS, dado sensível mascarado, validação no servidor), tratamento de erro, regressão, contratos e integrações, qualidade dos testes (perfil permitido **e** negado) e complexidade desnecessária.
- Cada achado leva **severidade** (crítica, alta, média, baixa), **arquivo e linha**, **cenário que falha** e **sugestão**. A correção é feita pelo autor, na branch dele.
- A aprovação para integrar é da pessoa.

## 10. Validação

Comandos, todos na raiz do worktree. O estado de referência de `origin/staging` em 2026-11-23 é **tudo verde**: typecheck e lint limpos, 359 testes unitários, 337 de integração e smoke, 7 jornadas de navegador. Uma falha nova, portanto, é regressão da tarefa, a menos que se prove o contrário rodando o mesmo comando em `origin/staging`.

| Verificação | Comando | Precisa de banco |
|---|---|---|
| Tipos | `npm run typecheck` | não |
| Lint | `npm run lint` | não |
| Unitários | `npm run test:unit` | não |
| Integração e smoke | `npx vitest run` (ou `npm run test:integration` / `test:smoke`) | sim: `multiplus_test` |
| Jornadas de navegador | `npm run test:browser` | sim: `multiplus_test_e2e` |
| Suíte completa | `npm test` (integração, smoke e unitários) | sim |
| Tudo isso, com trava e checagem de arquivos sensíveis | `bash scripts/agentes/verificar.sh --completo` | sim |

O servidor de desenvolvimento do Next imprime um aviso de vulnerabilidade e, na primeira execução do Playwright, pode recusar subir: repita o comando. Não rode `next upgrade` por conta própria (está registrado em `docs/pendencias-antes-producao.md`). Não há Prettier configurado: **não rode formatação global**. O formato de cada arquivo (CRLF ou LF) deve ser preservado.

## 11. Conflitos e escalonamento

| Situação | O que fazer |
|---|---|
| Duas tarefas querem o mesmo arquivo compartilhado | A que reservou primeiro segue; a outra espera ou é replanejada pela pessoa. |
| A tarefa exige arquivo fora do escopo | Parar, registrar no arquivo da tarefa e pedir decisão. |
| Regra de negócio ambígua ou contraditória | Não decidir: perguntar à pessoa. |
| Teste que falha antes da mudança | Registrar como preexistente, com o comando e a saída; não "consertar" no escopo da tarefa. |
| Conflito de merge com a outra branch | Resolver lendo os dois lados; se for regra divergente, pedir decisão. |
| Dúvida sobre segurança ou dado pessoal | Parar e pedir decisão. |

## 12. Decisões que exigem aprovação humana

Dependência nova ou atualização de dependência; atualização do Next, do Prisma ou de outra peça de infraestrutura; mudança de regra de negócio, de permissão, de RLS ou de regra de prazo; mudança de contrato de rota (`/api/...`) ou de Server Action usada por outra tela; migration (inclusive a decisão de criá-la); mudança em CI, deploy, `ops/`, Docker ou variáveis de ambiente; mudança em `AGENTS.md` e neste protocolo; refatoração fora do escopo da tarefa; qualquer ação em serviço compartilhado ou em produção; remoção de dado, documento ou configuração.

## 13. Pendências desta preparação

- **Proteção de branch:** a API do GitHub informa `staging` e `main` como não protegidas. Recomenda-se exigir Pull Request e o CI verde na `staging` (e na `main`) para que um push direto de agente não dispare o deploy. É uma mudança em serviço compartilhado: depende da decisão da pessoa responsável.
- **Bancos de teste por worktree:** hoje o nome é fixo e validado em `tests/integration/setup/banco-teste-seguro.ts`; a trava serializa as suítes, mas não permite paralelismo. Um banco por worktree exigiria alterar esse código e o Playwright (porta). Fica como melhoria futura, com aprovação.
- **Branches e worktrees antigos do Codex** (`codex/comentarios-mencoes`, `codex/drive-links-project-deadline`, `codex/periodicidade-dia-semana`, `codex/recorrencia-subtarefas`, `codex/staging-sync`, e dois worktrees "prunable" em `Temp`): não foram tocados. A limpeza (`git worktree prune`, apagar branches integradas) fica para a pessoa decidir.
- **Revisão de pull request pelo outro agente:** o fluxo está definido, mas ainda não foi exercitado em uma tarefa real.
