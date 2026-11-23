# Auditoria do repositório para o trabalho com vários agentes

- **Data:** 2026-11-23
- **Status:** relatório de preparação do ambiente multiagente. Nada aqui altera regra de negócio nem código da aplicação.
- **Método:** leitura do repositório no commit `0af5a30` da `staging`, de `package.json`, das configurações de teste e lint, do CI, do Docker, dos
  scripts e da documentação, mais consultas de leitura ao Git e à API do GitHub. As verificações da linha de base foram rodadas em 2026-11-23.
- **Resultado:** o protocolo está em [../colaboracao-multiagente.md](../colaboracao-multiagente.md); o onboarding do Codex, em [../onboarding-codex.md](../onboarding-codex.md).

## 1. O que existe (verificado)

| Item | Situação |
|---|---|
| Stack | Next 16.4.1 (App Router, build com `--webpack`), React 19.2.8, TypeScript estrito (`strict`), Prisma 6.19.3, PostgreSQL 16, Auth.js v5 beta (JWT), Tailwind 4, Zod 4, PDFKit, MinIO, Resend. Node 20 no CI e na imagem. |
| Organização | `src/app` (rotas e Server Actions; telas autenticadas no grupo `(painel)`), `src/lib` (domínio), `src/ui` (apresentação), `src/server/auth` (contexto), `prisma/`, `tests/`, `docs/`, `ops/`, `scripts/`. Detalhado em `docs/codigo/README.md`. |
| Banco | 59 migrations; RLS em todas as tabelas de domínio; duas roles (dona e `multiplus_app`); funções SQL `SECURITY DEFINER` e triggers para regras que o RLS não expressa. |
| Autorização | Perfis `ADMIN`, `ADMIN_INTERNO`, `ADMIN_EXTERNO` e `CLIENTE`; menu e guarda de rota numa tabela só (`src/lib/navegacao.ts`); checagem no servidor e no RLS. |
| Testes | 51 arquivos unitários, 41 de integração, 4 de smoke e 5 jornadas de navegador. Comandos: `test:unit`, `test:integration`, `test:smoke`, `test:browser`, `test`. |
| Lint e tipos | ESLint 9 (config flat, `core-web-vitals` e TypeScript do Next) e `tsc --noEmit`. **Não há Prettier nem outro formatador.** |
| CI | `.github/workflows/ci.yml`: roda em todo `push`, `pull_request` e manualmente (typecheck, lint, suíte completa com Postgres 16, Playwright). O job de deploy roda só em push para `main` ou `staging`, depois do CI, e só se as variáveis do repositório o habilitarem. |
| Git | Remoto `origin` (GitHub, `andrrc/multiplus-project`); branches `main` e `staging`; `core.autocrlf=true`; sem hooks locais. |
| Instruções para a IA | `AGENTS.md` (fonte única), `CLAUDE.md` (só `@AGENTS.md`), memória do Claude fora do repositório, `.claude/launch.json` (local, não versionado). |
| Documentação | `docs/codigo/`, `docs/funcionalidades/` (uma página por módulo), `docs/analises/`, `docs/decisoes-desenvolvimento.md`, `docs/pendencias-antes-producao.md`, arquitetura, SRS e padrão de testes. |

Linha de base verde em 2026-11-23: typecheck e lint sem erros, 359 testes unitários, 337 de integração e smoke e 7 jornadas de navegador passando.

## 2. Riscos para o trabalho paralelo

| # | Risco | Gravidade | Tratamento nesta preparação |
|---|---|---|---|
| R1 | **Bancos de teste com nome fixo** (`multiplus_test`, `multiplus_test_e2e`, validados no código) e porta fixa `3105` no Playwright. Duas suítes ao mesmo tempo destroem os dados uma da outra. | Alta | `scripts/agentes/verificar.sh --completo` usa uma trava na pasta comum do Git. Banco por worktree fica como melhoria futura, que mexe em infraestrutura de teste. |
| R2 | **`staging` e `main` sem proteção de branch** (a API devolve `protected: false`). Um push direto de agente na `staging` dispara o deploy, se habilitado. | Alta | O protocolo proíbe push nelas; o script cria branch sem upstream. A proteção em si depende de decisão e de permissão da pessoa responsável. |
| R3 | **Contradição de regra:** o `AGENTS.md` dizia "trabalhe direto na `staging`; não crie branches nem worktrees". | Média | Reconciliada: agente único segue na `staging`; tarefa multiagente usa branch e worktree. Aprovação pendente. |
| R4 | **Arquivos de alta colisão:** `prisma/schema.prisma`, migrations (timestamp ordenado), `src/lib/navegacao.ts`, `globals.css`, `package*.json`, `src/ui/**`, `src/lib/projetos-tarefas.ts` (muito usado), configuração de testes, CI, `ops/`. | Média | Lista e regra de reserva na seção 7 do protocolo. |
| R5 | **Documentos editados por todo mundo:** `planejamento-diferencas-prototipos.md` e `decisoes-desenvolvimento.md` mudam a cada entrega e gerariam conflito de merge. | Média | Em modo multiagente, são consolidados por quem integra; o agente escreve as notas no arquivo da tarefa. |
| R6 | **O projeto fica dentro do OneDrive** (`Área de Trabalho`): `node_modules` e `.next` num worktree ali seriam sincronizados. | Média | Worktrees ficam fora, em `~/multiplus-worktrees`. O checkout principal continua onde está. |
| R7 | **Quebras de linha mistas** (CRLF e LF por arquivo) e sem formatador. Um agente que reformata ou reescreve o arquivo inteiro cria um diff enorme. | Média | Regra no `AGENTS.md` e no prompt do Codex; `verificar.sh` não formata nada. |
| R8 | **Serviços locais compartilhados:** um só Postgres (porta 5434) e um só MinIO para todos os worktrees. | Média | Proibido recriar contêiner, apagar volume ou bucket; documentado. |
| R9 | **Migrations concorrentes** podem ter timestamp fora de ordem. | Média | Uma tarefa por vez em schema e migrations, com rebase e conferência antes de publicar. |
| R10 | O Codex não vê a memória do Claude. | Baixa | As convenções que só existiam na memória foram para o `AGENTS.md`; o onboarding repete o essencial. |

## 3. Inconsistências e problemas técnicos encontrados (registrados, não corrigidos)

1. **Aviso de vulnerabilidade do Next** no servidor de desenvolvimento, que na primeira execução do Playwright recusa subir e funciona na segunda. Já está em `docs/pendencias-antes-producao.md`.
2. **Configuração do Prisma em `package.json#prisma`** está obsoleta e será removida no Prisma 7 (o Prisma imprime o aviso a cada comando). Não afeta a 6.19.3.
3. **Arquivos de trabalho versionados na raiz:** `design-qa.md`, `security_best_practices_report.md` e a pasta `dados/` (só um logotipo) estão no Git. Vale decidir se pertencem ao repositório. `output/`, `tmp/`, `report/` e `test-results/` já são ignorados.
4. **Itens soltos desde antes desta preparação** e fora de qualquer commit: `.claude/`, `docs/analises/id-laudo-tecnico.md` e `public/logo-multiplus-bimi.svg`. Por decisão do usuário, ficam como estão.
5. **Branches e worktrees antigos do Codex:** cinco branches locais `codex/*`, uma remota (`codex/recorrencia-subtarefas`) e dois worktrees "prunable" em `Temp`. Não foram alterados.
6. **A raiz contém `tsconfig.codex-verification.tsbuildinfo`**, ignorado pelo `*.tsbuildinfo`. O nome sugere uma verificação feita pelo Codex neste checkout (não confirmado).
7. **O `README.md` diz que o projeto usa Node 20+** e o CI e a imagem usam Node 20; não há `.nvmrc` nem campo `engines` que fixe a versão para os worktrees.
8. **Não existe `docs/api-contracts.md`** porque o projeto não tem uma API pública separada: os contratos são as Server Actions e as funções de `src/lib`, descritos nas páginas de módulo. Por isso não foi criado um arquivo de contratos novo.

## 4. Decisões de projeto tomadas para evitar duplicação

- Não foram criados `architecture.md`, `coding-standards.md`, `database.md` nem `api-contracts.md`: já existem `docs/architecture-multiplus-software.md`, `docs/codigo/`, `docs/funcionalidades/` e o `AGENTS.md`, que cobrem os mesmos assuntos. O que faltava eram apenas o protocolo de convivência e o onboarding, agora em arquivos novos que apontam para os existentes.
- As regras gerais continuam **só** no `AGENTS.md`; o protocolo cobre apenas a convivência entre agentes.

## 5. Pendente de validação

- **Como o Codex lê as instruções:** o comportamento de ler o `AGENTS.md` da raiz foi usado como premissa (é o padrão da ferramenta e o projeto já teve branches `codex/*`); não foi possível verificar a configuração local do Codex neste ambiente.
- **Permissão para ativar a proteção de branch** no GitHub, e se as variáveis `DEPLOY_STAGING_ATIVO` e `DEPLOY_PRODUCTION_ATIVO` estão ligadas hoje.
- **Se a pessoa responsável quer o Codex abrindo Pull Requests** ou só publicando a branch (o protocolo assume o segundo caso).
