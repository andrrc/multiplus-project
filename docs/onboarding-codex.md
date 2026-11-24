# Onboarding técnico para o Codex

Este documento coloca o Codex no projeto como um desenvolvedor novo da equipe. Tudo o que está aqui foi verificado no repositório em
2026-11-23; o que não pôde ser verificado está marcado como **pendente de validação**. Você não tem acesso ao histórico das conversas
anteriores: o que importa está em arquivos versionados, e o [`AGENTS.md`](../AGENTS.md) é a fonte das regras. Em caso de divergência
entre este arquivo e o `AGENTS.md`, vale o `AGENTS.md`; avise a pessoa responsável.

## 1. O que é o sistema

O **SGA Múltiplus Ambiental** controla clientes, projetos, tarefas, subtarefas e prazos de uma consultoria ambiental. A cliente final é a
Talita (administradora). O produto é descrito em `docs/SRS_Multiplus_Software_v1.0.md` (requisitos, com códigos `RF-` e `RN-`) e a
arquitetura original em `docs/architecture-multiplus-software.md`. Hoje só há dados fictícios: o sistema ainda não está em produção.

## 2. Arquitetura atual

| Camada | Tecnologia (versão em `package.json`) |
|---|---|
| Aplicação | Next.js 16.4.1 (App Router), React 19.2.8, TypeScript estrito, Tailwind 4 |
| Banco | PostgreSQL 16 self-hosted com **RLS**, Prisma 6.19.3 (não atualizar) |
| Autenticação | Auth.js v5 (beta), sessão por JWT, senha com bcrypt, convite e recuperação por token |
| Arquivos | MinIO (S3), bucket privado, com rota autenticada |
| E-mail | Resend |
| PDF | PDFKit |
| Testes | Vitest 5 (unitário, integração, smoke) e Playwright (jornadas) |
| Infraestrutura | Docker Compose, Caddy, VPS; CI e deploy no GitHub Actions (`.github/workflows/ci.yml`) |

**Caminho de uma requisição** (detalhado em `docs/codigo/README.md`): `src/proxy.ts` (verificação rápida de sessão) → página em `src/app/` →
Server Action valida a entrada → função de domínio em `src/lib/` → `comContextoDeUsuario` (`src/lib/prisma-app.ts`) abre a transação, informa
usuário e perfil ao banco e deixa o **RLS** filtrar. O cliente Prisma "dono" (`src/lib/prisma.ts`) ignora o RLS e só serve ao login e aos tokens.

| Pasta | Responsabilidade |
|---|---|
| `src/app/` | Rotas, páginas, layouts, Server Actions e rotas de API. O grupo `(painel)` tem as telas autenticadas. |
| `src/lib/` | Regras de negócio, validação, consultas e integrações. Arquivos pequenos e puros (como `situacao-prazo.ts`) têm teste unitário. |
| `src/ui/` | Componentes compartilhados de apresentação. Mudar um deles afeta várias telas. |
| `src/server/auth/` | Configuração do Auth.js, credenciais e montagem do contexto do usuário. |
| `prisma/` | `schema.prisma`, migrations SQL (imutáveis depois de publicadas) e seed. |
| `tests/` | `unit/`, `integration/`, `smoke/`, `browser/`. |
| `docs/` | Documentação. `docs/funcionalidades/<módulo>.md` descreve cada módulo. |
| `telas-novas/` | Protótipos HTML da cliente: referência visual e de comportamento; os dados deles são ilustrativos. |
| `scripts/`, `ops/` | Ferramentas locais e de operação (deploy, backup, job de avisos). |

## 3. Perfis e módulos mais importantes

Quatro perfis: `ADMIN` (administração), `ADMIN_INTERNO` (colaborador interno), `ADMIN_EXTERNO` (colaborador externo) e `CLIENTE`.
O menu e a guarda de rota saem de uma tabela só, `src/lib/navegacao.ts`.

| Módulo | Onde ler |
|---|---|
| Clientes (PF e PJ, pessoas envolvidas, laudo técnico restrito) | `docs/funcionalidades/clientes.md` |
| Usuários, convites e atribuições | `docs/funcionalidades/usuarios.md`, `autenticacao-acesso.md` |
| Projetos | `docs/funcionalidades/projetos.md` |
| Tarefas, recorrência, conclusão e comprovantes | `docs/funcionalidades/tarefas.md` |
| Subtarefas e etiquetas | `docs/funcionalidades/subtarefas.md` |
| Agenda | `docs/funcionalidades/agenda.md` |
| Notificações (tela, e-mail e tempo real) | `docs/funcionalidades/notificacoes.md` |
| Portal do cliente | `docs/funcionalidades/area-exclusiva-cliente.md` |
| Telas, padrões visuais e pendências visuais | `docs/funcionalidades/interface.md`, `docs/Identidade_Visual_Multiplus.md` |

## 4. Fluxos de negócio que você precisa conhecer

- **Conclusão com aprovação (RN-007).** O colaborador **não conclui direto**: ele solicita a conclusão (`solicitar_conclusao`, no banco) e a administração
  confirma ou rejeita. O colaborador interno atribuído ao projeto também pode decidir o pedido de um colaborador externo.
- **Comprovantes (etapa 1 pronta).** A tarefa ou subtarefa pode exigir fotos e arquivos; o envio vira o pedido de conclusão e a conferência pode
  devolver com motivo. O prazo ainda **não** para durante a conferência (etapa 2, decidida pela cliente, depende de análise aprovada).
- **Recorrência.** Concluir uma tarefa recorrente cria a próxima ocorrência (`concluir_tarefa`, no banco), ancorada no prazo original da série.
- **Semáforo de prazo.** Dias restantes e a cor (atrasado, vence em breve, no prazo) usam um limite configurável; o dia do prazo ainda conta como em dia.
- **Atribuição.** O colaborador interno enxerga por projeto; o externo, por tarefa (com acesso contextual por subtarefa). O RLS faz o filtro, não a tela.
- **Desativar, não excluir.** Nada é apagado de verdade: a desativação é em cascata e reversível (ADR-008).
- **Avisos de prazo.** Um job diário (`ops/disparar-notificacoes-prazo.sh`, rota em `src/app/api/jobs`) dispara os avisos; a central de avisos é por perfil.
- **Cliente (portal).** Vê só os dados limitados do próprio cadastro; nunca valores nem comentários internos. Os comprovantes também não são expostos a ele (política ainda a confirmar com a cliente).

## 5. Dependências entre componentes

- Toda tela chama funções de `src/lib/`; nenhuma consulta de domínio fica solta na página.
- `src/lib/projetos-tarefas.ts` concentra muitas consultas de projetos, tarefas e subtarefas e é usado por várias telas: mexa nele com reserva e com cuidado.
- Regras que o RLS sozinho não expressa viram **trigger** (por exemplo, a RN-004 da subtarefa) ou função SQL `SECURITY DEFINER`.
- Mudança em `src/ui/` ou em função de `src/lib/` pede `grep -rn "Nome" src` para achar todos os usos.
- Rota nova precisa entrar em `src/lib/navegacao.ts`, senão responde "negado".

## 6. Padrões a respeitar

Estão no `AGENTS.md` e valem sem exceção: permissão no servidor e no RLS (nunca só esconder o botão); dado sensível mascarado na consulta, não na tela;
validação no servidor, com dados montados campo a campo nas Server Actions; datas em UTC e `timeZone: "UTC"` na exibição (horários de criação e envio em Brasília);
cores só pelos tokens de `src/app/globals.css`; telas funcionando em 375 px e no desktop sem rolagem horizontal; tabelas viram lista no celular;
testes com o perfil permitido **e** o negado; mensagens e comentários em português, com acentuação correta; sem `skip`, `only` ou `todo`.
Arquivos em UTF-8 e **preservando o CRLF ou o LF de cada um**; para texto longo, use um script ou a ferramenta de escrita, não heredoc.

## 7. Como rodar o projeto

Pré-requisitos: Node 20 e Docker Desktop. A porta do Postgres local é **5434** e o MinIO usa **9000** e **9001**.

```bash
cp .env.example .env                         # preencha as senhas; nunca commite o .env
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d postgres minio
npm install                                  # em worktree novo: npm ci
npm run db:migrate
docker compose -f docker-compose.yml -f docker-compose.local.yml --profile ops run --rm db-role   # sincroniza a senha da role multiplus_app
npm run db:seed                              # cria o administrador inicial e imprime o link de definir senha
npm run dev                                  # usa a primeira porta livre de 3001 a 3100
```

Os detalhes e variáveis estão em `README.md` e `.env.example`. **Em worktree**, use `bash scripts/agentes/novo-worktree.sh`, que já copia o `.env` e instala as dependências. **Rode os scripts no Git Bash**, e não no `bash` do PowerShell (que é o WSL): no WSL eles recusam rodar. No PowerShell use `& "C:\Program Files\Git\bin\bash.exe" scripts/agentes/<script>.sh <argumentos>`.

## 8. Como executar os testes

| Verificação | Comando | Banco |
|---|---|---|
| Tipos e lint | `npm run typecheck` e `npm run lint` | não |
| Unitários | `npm run test:unit` | não |
| Integração e smoke | `npx vitest run` | `multiplus_test` |
| Navegador | `npm run test:browser` (porta 3105) | `multiplus_test_e2e` |
| Tudo, com trava e checagem de arquivos sensíveis | `bash scripts/agentes/verificar.sh --completo` | ambos |

Defina `TEST_DATABASE_URL` e `TEST_APP_DATABASE_URL` no `.env` (veja `.env.example`). Os nomes dos bancos de teste são fixos e validados em
`tests/integration/setup/banco-teste-seguro.ts`: **só uma suíte de banco por vez na máquina inteira** (a trava do script cuida disso). O estado de
referência de `origin/staging` é tudo verde. O servidor de desenvolvimento do Next mostra um aviso de vulnerabilidade e, na primeira execução do
Playwright, pode recusar subir: repita o comando e **não rode `next upgrade`**.

## 9. Como trabalhar em paralelo com o Claude Code

Leia [colaboracao-multiagente.md](colaboracao-multiagente.md) inteiro. O resumo:

1. Você só começa uma tarefa que tenha arquivo em `docs/tarefas/<id>.md`, com escopo, arquivos permitidos e critérios de aceite.
2. Seu trabalho fica na branch `codex/<id>` e no worktree dela. Você nunca commita em `staging` ou `main` e nunca faz merge ou push forçado.
3. Você não edita arquivo fora do escopo, nem arquivo compartilhado que a tarefa não reservou, nem a branch do Claude Code.
4. Você não consolida `planejamento-diferencas-prototipos.md` e `decisoes-desenvolvimento.md`: escreva as notas no arquivo da tarefa.
5. Ao terminar, rode `bash scripts/agentes/verificar.sh`, preencha o resumo da tarefa e entregue o relatório padrão (seção 11).

## 10. Decisões que exigem aprovação humana

Dependência nova ou atualizada; atualização do Next ou do Prisma; mudança de regra de negócio, permissão, RLS ou regra de prazo; contrato de rota ou de Server
Action; migration; CI, deploy, Docker, `ops/` e variáveis de ambiente; refatoração fora do escopo; serviço compartilhado ou produção; remover dado ou documento;
qualquer mudança em `AGENTS.md`. Na dúvida, pare e pergunte.

## 11. Relatório de entrega (formato padrão)

Entregue ao terminar, no resumo do arquivo da tarefa e na resposta final:

1. **O que foi feito**, em poucas linhas, ligado aos critérios de aceite.
2. **Arquivos alterados**, agrupados por pasta.
3. **Decisões tomadas** e por quê.
4. **Verificações rodadas** e resultado (comando e saída resumida).
5. **Falhas preexistentes** (com o comando que as reproduz em `origin/staging`).
6. **Pendências, riscos e perguntas** para a pessoa responsável.
7. **Notas para o planejamento e as decisões**, para quem integra.

## 12. Prompt de inicialização do Codex

Cole o texto abaixo no início da sessão do Codex, preenchendo `<ID>` e `<AGENTE>`. Ele não substitui o arquivo da tarefa.

```text
Você é um desenvolvedor que acaba de entrar na equipe do projeto SGA Múltiplus Ambiental (Next.js 16, Prisma 6, PostgreSQL com RLS).
Você trabalha junto com o Claude Code, em paralelo, e a pessoa responsável pelo projeto decide e integra.

Antes de qualquer alteração, leia, nesta ordem:
1. AGENTS.md (regras do projeto; vale para você e para o Claude Code).
2. docs/onboarding-codex.md (visão do sistema, como rodar e testar).
3. docs/colaboracao-multiagente.md (como trabalhamos em paralelo, o que é compartilhado e o que exige aprovação).
4. docs/tarefas/<ID>.md (a SUA tarefa: escopo, arquivos permitidos e proibidos, critérios de aceite e testes).
5. A página do módulo em docs/funcionalidades/ que a tarefa cita e as decisões em docs/decisoes-desenvolvimento.md.
Não presuma nada sobre conversas anteriores: o que importa está nesses arquivos. Se uma informação não estiver lá, pergunte.

Seu ambiente:
- Branch: <AGENTE>/<ID>, em um worktree próprio criado por: bash scripts/agentes/novo-worktree.sh <AGENTE> <ID>
- Trabalhe SOMENTE nessa branch e nessa tarefa. Nunca commite em staging ou main, nunca faça merge, nunca use push forçado
  e nunca edite a branch do Claude Code nem a de outra tarefa.
- Publique a branch só quando eu pedir: git push -u origin <AGENTE>/<ID>. Não abra Pull Request sem pedido.

Regras de trabalho:
- Antes de implementar, leia o código relacionado e reutilize o que já existe. Siga os padrões do AGENTS.md.
- Não inicie refatorações por conta própria. Não adicione nem atualize dependências. Não altere regra de negócio, permissão, RLS,
  regra de prazo, contrato de rota ou de Server Action, migration, CI, deploy ou Docker sem aprovação expressa.
- Não edite arquivos fora do escopo da tarefa nem arquivos compartilhados que ela não reservou
  (lista em docs/colaboracao-multiagente.md, seção 7). Se precisar de um, pare e me diga.
- Não edite docs/analises/planejamento-diferencas-prototipos.md nem docs/decisoes-desenvolvimento.md: escreva as notas no arquivo da tarefa.
- Preserve o CRLF ou o LF de cada arquivo e a acentuação em UTF-8. Não rode formatação global.
- Em dúvida de regra de negócio, de segurança ou de arquitetura, pare e pergunte.

Antes de terminar, rode: bash scripts/agentes/verificar.sh (e --completo, se a tarefa mexe em banco ou telas).
Se algo falhar, confira se a falha já existe em origin/staging antes de tratá-la como sua.

Entregue o relatório no formato da seção 11 de docs/onboarding-codex.md, e preencha o resumo no arquivo da tarefa.
Comece confirmando o que entendeu da tarefa e do escopo, e liste as dúvidas antes de escrever código.
```
