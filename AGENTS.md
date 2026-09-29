<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Regras de trabalho neste repositório

Estas regras valem para qualquer agente (Claude, Codex ou outro) e para qualquer alteração:
funcionalidade, correção, refatoração, migration ou documentação. Elas existem porque já
tivemos problemas concretos:

- **Funcionalidade duplicada:** branches paralelas e worktrees implementaram a mesma coisa
  duas vezes.
- **Conflito de migrations:** duas migrations com o mesmo timestamp.
- **Código descartado sem revisão:** merges resolvidos em bloco.
- **CI quebrado por outro módulo:** um push feito sem rodar a suíte completa quebrou o
  `staging` por um teste de outro módulo.
- **Funcionalidade pela metade:** entregue sem editar/listar, sem prever permissões e sem
  pensar no celular.
- **Interface fora da identidade visual:** telas usando classes de cor que nem existem.

O fluxo de uma alteração é sempre o mesmo, na ordem abaixo:

1. [Sincronizar o `staging`](#1-antes-de-começar-sincronizar) antes de tocar em qualquer arquivo.
2. [Analisar](#2-análise-antes-de-implementar): prever escopo, ambiguidades e riscos em
   `docs/analises/`. **Esperar a aprovação do usuário.**
3. Implementar na [ordem dos 8 passos](#3-ordem-de-implementação-os-8-passos), junto com
   os [testes](#5-testes) e seguindo as [regras de interface](#6-interface).
4. Rodar a [verificação completa](#54-verificação-antes-do-commit-e-do-push) localmente.
5. Atualizar o [registro de decisões](#7-registro-das-decisões-de-desenvolvimento).
6. [Commitar e publicar](#4-versionamento) no `origin/staging`.
7. [Acompanhar o CI e o deploy](#45-depois-do-push) até ficarem verdes.
8. [Reportar](#8-resposta-final) o que foi feito e testado.

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
  resolva com `reset`, rebase forçado ou `merge -X theirs/ours`.
- **Alterações locais que não são da sua tarefa:** preserve-as. Não faça commit delas,
  não as descarte (`checkout --`, `restore`, `stash drop`, `clean`) e não as misture nos
  seus commits.

## 2. Análise antes de implementar

Um pedido curto ("quero uma página de cadastro de X") quase nunca descreve tudo o que a
entrega precisa. Antes de escrever código, o agente prevê o que está implícito, o que é
ambíguo e o que pode dar errado. Só programa depois de o usuário aprovar a análise.

### 2.1 Quando é obrigatória

| Tipo de alteração | Análise |
|---|---|
| Funcionalidade nova | Obrigatória |
| Alteração de funcionalidade existente | Obrigatória |
| Correção de bug fora da camada visual | Obrigatória |
| Mudança de regra de negócio ou de permissão | Obrigatória |
| Migration ou mudança de schema | Obrigatória |
| Somente front-end: layout, estilo, texto, responsividade, sem dado, regra ou permissão nova | Dispensada. A [seção 6](#6-interface) continua valendo. |

Uma mudança "de tela" que passa a exibir um dado que antes não aparecia **não** é só
front-end. Ela envolve permissão e mascaramento, e exige análise.

### 2.2 Como fazer

1. **Ler o que já está decidido:**
   - o SRS (`docs/SRS_Multiplus_Software_v1.0.md`) e o PDD do módulo
     (`docs/product-design-multiplus-<modulo>.md`);
   - `docs/decisoes-desenvolvimento.md`, as análises anteriores em `docs/analises/` e a
     identidade visual.
2. **Ler o código que será afetado:** procure os usos de cada função, componente, rota e
   tabela que você pretende mudar, com `grep -rn "nome" src tests prisma`.
3. **Escrever a análise** em `docs/analises/<funcionalidade>.md` (nome em minúsculas, com
   hífens, por exemplo `cadastro-fornecedores.md`), seguindo o modelo da seção 2.4.
   Seções que não se aplicam ficam com "Não se aplica" e o motivo, em vez de serem apagadas.
4. **Apresentar ao usuário** um resumo com o escopo, as perguntas em aberto e os riscos
   principais, e o caminho do arquivo. **Pare e espere a aprovação**, mesmo que não haja
   pergunta em aberto.
5. **Depois da aprovação:**
   - registre no arquivo as respostas e ajustes, marque `Status: aprovada em AAAA-MM-DD`
     e só então comece a implementar;
   - as decisões vão para `docs/decisoes-desenvolvimento.md`;
   - cada risco vira um teste (seção 5).

O arquivo de análise entra no repositório no mesmo push da implementação. Se o
comportamento mudar durante o desenvolvimento, atualize a análise.

### 2.3 O que a análise precisa prever

**Ciclo completo da entidade.** Quem pede "cadastro" precisa também de:

- listagem (com busca, filtros, ordenação e o toggle "mostrar desativados");
- detalhe;
- edição;
- desativação e reativação. Aqui **não existe exclusão definitiva**: registros são
  desativados (RF-039 / ADR-008), com cascata para os dependentes.

Pergunte ao usuário o que fica de fora, em vez de supor.

**Permissões.** Uma matriz com cada perfil (`ADMIN`, `ADMIN_INTERNO`, `ADMIN_EXTERNO`,
`CLIENTE`) contra cada ação:

- criar, listar, ver detalhe, editar, desativar e reativar;
- ver campos sensíveis.

Uma célula que o SRS e as decisões não respondem é uma **pergunta em aberto**, não uma
suposição.

**Dados.**

- Campos, obrigatoriedade, formato e validação, sempre no servidor.
- Unicidade, por exemplo CPF/CNPJ e números sequenciais.
- Campos sensíveis que precisam de mascaramento.
- Migration necessária e o que acontece com os registros que já existem (backfill).

**Impacto em telas e funções existentes.** Liste cada rota, componente e função afetados,
com base no `grep` do passo 2. Por exemplo:

- onde a entidade aparece: menus, listagens, detalhe de cliente/projeto/tarefa;
- o que depende dela: notificações, agenda, painel de subtarefas, indicadores e "% em dia";
- rota renomeada, que precisa de redirecionamento para os links antigos.

**Riscos de segurança e problemas conhecidos.** Percorra a lista abaixo inteira. Ela reúne
o que já causou erro neste projeto ou é típico do tipo de sistema:

| Risco | Como evitar |
|---|---|
| Autorização só na interface (botão escondido, rota acessível) | Checar o perfil na função de `src/lib` ou na server action **e** no RLS |
| Dado sensível chegando ao navegador, mesmo escondido na tela | Filtrar na query, view ou RLS. Testar que o campo **não vem** na resposta |
| View sobre tabela com RLS ignorando o RLS | `security_invoker = true` na migration que cria a view |
| Comparação com `NULL` em trigger ou função de autorização passando batido | Checar `IS NOT NULL` dos dois lados antes de comparar |
| Trocar o id na URL e acessar registro de outro cliente, projeto ou tarefa (IDOR) | Buscar sempre pelo id **e** pelo vínculo do usuário. Testar com perfil sem vínculo |
| Action que aceita do formulário campos que o usuário não pode definir (`perfil`, `ativo`, `clienteId` alheio) | Montar os dados explicitamente, campo por campo |
| Validação só no navegador | Repetir a validação no servidor |
| Duplicidade por corrida (dois cadastros simultâneos) | Restrição `UNIQUE` no banco, não só verificação prévia |
| Registro desativado entrando em listas, cálculos, agenda ou notificações | Filtrar `ativo` em cada consulta. Testar o registro desativado |
| Função SQL redefinida a partir de versão antiga, apagando regra | Partir da migration mais recente (seção 4.4) |
| Datas deslocadas por fuso | Seguir o padrão do projeto: datas em UTC e formatação com `timeZone: "UTC"` |
| Link externo (Drive) com `javascript:` ou abrindo sem proteção | Aceitar só `http(s)` e usar `target="_blank" rel="noreferrer"` |
| Upload (imagem de comentário) sem limite | Validar tipo e tamanho no servidor. Bucket privado |
| E-mail ou notificação revelando dado a quem não tem acesso | Destinatários calculados pela mesma regra de permissão da tela |

**Casos-limite e estados.**

- Estados de tela: vazio, erro, sem permissão e registro desativado.
- Campos opcionais nulos.
- Volume grande: a listagem precisa de paginação?
- Concorrência: duas pessoas editando o mesmo registro.
- Comportamento no celular.

### 2.4 Modelo do arquivo de análise

```markdown
# Análise: <funcionalidade>

- **Data:** AAAA-MM-DD
- **Pedido original:** <o que o usuário pediu, com as palavras dele>
- **Status:** aguardando aprovação | aprovada em AAAA-MM-DD

## 1. Escopo previsto
O que entra (ciclo completo) e o que fica explicitamente de fora.

## 2. Permissões
| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|

## 3. Dados
Campos, validações, unicidade, campos sensíveis, migration e backfill.

## 4. Impacto em telas e funções existentes
Rotas, componentes e funções afetados (com caminho do arquivo).

## 5. Riscos e segurança
| Risco | Mitigação | Teste que cobre |
|---|---|---|

## 6. Casos-limite e estados

## 7. Interface
Telas, comportamento no celular e componentes existentes reaproveitados.

## 8. Plano de testes
Unitários, integração e smoke (ver seção 5 do AGENTS.md).

## 9. Perguntas em aberto
1. <pergunta> — **Resposta:** <preenchida após a conversa, com data>
```

## 3. Ordem de implementação: os 8 passos

Para cada módulo ou funcionalidade nova, implemente nesta ordem, sem pular nem inverter.
Em alterações menores, siga os passos que se aplicam, na mesma ordem.

1. **CRUD principal da entidade:** os RFs do núcleo do módulo primeiro.
2. **Dados relacionados ou derivados:** entidades que dependem da principal (ex.:
   Responsável Legal e Ponto de Contato do cliente), com atenção às regras de herança
   de dados.
3. **Listas e relacionamentos opcionais:** dados dinâmicos e não obrigatórios no cadastro.
4. **Integrações com módulos auxiliares:** ex.: vínculo de documentos externos (links do
   Google Drive, sem upload).
5. **Mascaramento de dados sensíveis:** feito **no backend, na query, na view ou no RLS**,
   nunca só escondido na interface. Um perfil sem permissão não pode ver o dado abrindo
   o DevTools e inspecionando a resposta.
6. **Criação de acesso:** reaproveite os fluxos de autenticação que já existem (convite e
   definição de senha por e-mail) em vez de duplicar lógica.
7. **Testes:** unitários (regras), integração (principalmente permissão e RLS,
   confirmando que o campo mascarado **não vem na resposta**, e não só que a tela não o
   mostra) e smoke do fluxo completo. Ver seção 5.
8. **Interface:** as telas por último, seguindo o PDD do módulo e a [seção 6](#6-interface).

## 4. Versionamento

### 4.1 Uma branch só: `staging`

- Desenvolva e publique diretamente em `origin/staging`. Cada push nele dispara o CI e,
  com o CI verde, o deploy automático no ambiente de teste da VPS.
- **Não crie** branches (`codex/*`, `feature/*` ou qualquer outra) nem worktrees
  (`git worktree add`). Os worktrees e branches `codex/*` que ainda existem são legados.
  Não trabalhe neles nem os use como base.
- **`main` é produção.** Não faça merge, push ou PR para `main` sem pedido explícito
  do usuário naquela conversa.
- **Nunca** use `git push --force` / `--force-with-lease` no `staging`, nem reescreva
  commits que já foram publicados.

### 4.2 Commits

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

### 4.3 Integrar com o remoto antes do push

Outra pessoa ou outro agente pode ter publicado no `staging` enquanto você trabalhava:

```bash
git fetch origin
git rebase origin/staging        # só reaplica os SEUS commits ainda não publicados
```

- **Conflito:** resolva arquivo por arquivo, lendo os dois lados e mantendo o
  comportamento de ambos. **Nunca** resolva em bloco (`-X theirs`, `-X ours`,
  `checkout --theirs .`).
- **Não sabe qual lado vale:** aborte (`git rebase --abort`) e pergunte.
- **Depois de resolver:** rode de novo a verificação completa da seção 5.4. Um conflito
  resolvido é código novo.

### 4.4 Migrations (Prisma + SQL)

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
  permitido **e** o negado (ver seção 5.2).
- **Na VPS:** `ops/deploy.sh` aplica as migrations sozinho. Não rode migration à mão.
  O acesso `ssh vps` é para diagnóstico somente de leitura, como consultar
  `_prisma_migrations`, `docker ps` e logs. Qualquer alteração manual na VPS exige pedido
  explícito.

### 4.5 Depois do push

```bash
git push origin staging
gh run watch                     # ou: gh run list --branch staging --limit 3
```

- **A tarefa só termina com o CI verde** (typecheck, lint, suíte completa e deploy com
  `/api/health` respondendo 200).
- **CI vermelho:** investigue o log (`gh run view <id> --log-failed`) e publique a correção
  como **novo commit** o quanto antes. O `staging` quebrado bloqueia o trabalho de todos.
  Não use `revert` nem force-push sem combinar com o usuário.

## 5. Testes

O padrão completo está em [`docs/padrao-testes-por-sprint-multiplus.md`](docs/padrao-testes-por-sprint-multiplus.md).
Esta seção resume o que é obrigatório em cada alteração.

### 5.1 Ambiente

Os testes de integração e de smoke usam um Postgres real, em um banco separado
(`multiplus_test`), que o `globalSetup` cria e migra sozinho. O banco de desenvolvimento
nunca é tocado.

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d postgres
```

- **Configuração:** exige `TEST_DATABASE_URL` e `TEST_APP_DATABASE_URL` no `.env` (ver
  `.env.example`).
- **Senha da role:** a role `multiplus_app` precisa de senha no banco de teste.
- **Postgres indisponível:** **não publique.** Informe o usuário. A seção 5.4 não pode ser
  pulada.

### 5.2 Que teste escrever

| O que mudou | Tipo | Onde |
|---|---|---|
| Regra pura (cálculo de prazo, recorrência, máscara, validação, indicador) | Unitário | `tests/unit/<modulo>.unit.test.ts` |
| Função de `src/lib`, server action, RLS, trigger, função SQL, permissão por perfil | Integração | `tests/integration/<modulo>.integration.test.ts` |
| Fluxo crítico ponta a ponta (login, convite, recuperação de senha, acesso) | Smoke | `tests/smoke/<modulo>.smoke.test.ts` |

- **Cabeçalho:** todo arquivo de teste começa com um comentário citando o RF/RN coberto.
- **Riscos da análise:** cada risco listado na análise (seção 2) tem um teste
  correspondente.
- **Correção de bug:** primeiro escreva o teste que reproduz o bug e falha. Depois
  corrija o código.
- **Permissão e RLS:** teste os dois lados. O perfil autorizado consegue, e cada perfil
  não autorizado recebe erro. Em asserções de erro, use a mensagem esperada
  (`toThrow(/RN-007/)`), não apenas `toThrow()`.
- **Mudança de regra, validação ou mensagem de erro:** procure todos os testes que dependem
  dela antes de publicar (`grep -rn "trecho" tests/`). Foi assim que o `staging` quebrou em
  28/09: mudou a paleta de etiquetas e um teste de outro arquivo usava uma cor que deixou
  de existir.

### 5.3 O que é proibido para "fazer o teste passar"

- **Afrouxar asserções:** trocar `toThrow(/mensagem/)` por `toThrow()`, `toEqual` por
  `toBeDefined`, ou remover `expect`.
- **Pular testes:** usar `it.skip`, `describe.skip`, `it.only`, `.todo`, ou comentar e
  apagar o teste.
- **Relaxar a configuração:** aumentar timeout ou desligar `fileParallelism` para esconder
  uma falha intermitente.

Se o comportamento mudou **de propósito**, atualize o teste para o novo comportamento
esperado, com a mesma precisão de antes. Registre também a mudança em
`docs/decisoes-desenvolvimento.md`.

### 5.4 Verificação antes do commit e do push

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

## 6. Interface

Vale para toda alteração de tela, inclusive as que dispensam análise.

### 6.1 Identidade visual

Leia [`docs/Identidade_Visual_Multiplus.md`](docs/Identidade_Visual_Multiplus.md) antes de
criar ou alterar uma tela. Também leia o PDD do módulo
(`docs/product-design-multiplus-<modulo>.md`) para a estrutura da tela.

- **Cores só pelos tokens de `src/app/globals.css`.** Os disponíveis são `azul`,
  `azul-esc`, `verde`, `verde-esc`, `tinta`, `tinta2`, `papel`, `branco`, `cinza`, `linha`,
  `ambar`, `critico`, `critico-cl`, `azul-cl`, `verde-cl`, `verde-borda` e os `menu-*`.
  - Não use hex fixo (`bg-[#...]`, `style={{ color: "#..." }}`) nem a paleta padrão do
    Tailwind (`red-500`, `gray-100`…).
- **Confira se o token existe antes de usá-lo:**
  `grep -- "--color-<nome>:" src/app/globals.css`. Classe com cor inexistente **não dá
  erro**: o Tailwind simplesmente não gera o estilo e a cor some da tela.
  - O teste `tests/unit/identidade-visual-tokens.unit.test.ts` falha se alguma classe de
    cor usar um token inexistente. Em 29/09, 33 usos de `vermelho`, `vermelho-cl` e
    `azul-cl` estavam invisíveis por esse motivo.
  - Se precisar de uma cor nova, pergunte ao usuário. Depois adicione-a ao `globals.css`
    **e** ao documento de identidade visual, e registre a decisão.
- **A cor codifica informação:**
  - `critico` (vermelho terra) = prazo vencido ou erro;
  - `ambar` = pendência ou atenção;
  - `azul` = questão estrutural ou link;
  - `verde` = solução, entrega ou ação principal.
- **Tipografia:**
  - `font-[family-name:var(--font-interface)]` (Archivo) para títulos, tabelas, valores,
    prazos, etiquetas e botões;
  - `font-[family-name:var(--font-leitura)]` (Source Serif 4) para texto corrido;
  - `tabular-nums` em números e datas em coluna;
  - caixa alta só em rótulos curtos.
- **Forma:**
  - raio pequeno: 3 px em cartões e botões, 2 px em etiquetas;
  - **sem sombras**: a separação vem de borda de 1 px em `linha`. A única exceção são
    as camadas flutuantes sobre o conteúdo (modais e menus suspensos);
  - gradiente institucional só em destaque pontual.
- **Não copie o estilo de uma tela existente sem conferir com o documento.** O documento
  prevalece sobre o código.

### 6.2 Responsividade (celular)

Toda tela nova ou alterada funciona em **375 px de largura** e no desktop.

- **Sem rolagem horizontal da página:** conteúdo e formulários ficam em uma coluna no
  celular.
- **Tabelas:** no celular viram lista ou cartões. O padrão do projeto é tabela com
  `hidden md:block` mais lista com `md:hidden`, como em `src/app/(painel)/subtarefas/page.tsx`.
- **Toque:** botões, links e campos com área mínima de 44 px (`min-h-11`).
- **Textos longos** (razão social, nome de tarefa) quebram ou truncam sem estourar o layout.
- **Verificar de verdade:** abra a tela em 375 px e em desktop (navegador ou DevTools)
  antes de concluir. Se não for possível, diga isso na resposta final.

### 6.3 Impacto em telas existentes

- **Alterar componente de `src/ui/`, função de `src/lib/` ou tipo compartilhado:** liste
  todos os usos (`grep -rn "Nome" src`) e confira cada tela afetada, não só a que motivou
  a mudança.
- **Renomear ou remover rota:** atualize menu (`src/lib/navegacao.ts`), links internos,
  `revalidatePath`, notificações e tela inicial por perfil. Deixe redirecionamento para
  a rota antiga, como foi feito de `/prazos` para `/subtarefas`.
- **Mudar formato de dado exibido** (datas, status, rótulos): procure todas as telas que
  mostram aquele dado, para manter a consistência.

## 7. Registro das decisões de desenvolvimento

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

- **Diferença entre os documentos:** a análise (`docs/analises/`) registra o que foi
  previsto **antes** de implementar. O registro de decisões descreve o comportamento que
  ficou valendo.
- **Decisão alterada depois:** atualize a entrada original e registre a mudança. O documento
  descreve o comportamento **atual**.
- **Sem invenção:** não registre decisões que não foram discutidas. Se faltar uma
  decisão necessária para implementar, pergunte ao usuário **antes** de implementar.

## 8. Resposta final

Ao concluir, informe:

1. **Análise:** o caminho do arquivo em `docs/analises/`, se houve.
2. **Commits:** o hash e a mensagem de cada commit publicado no `staging`.
3. **Testes:** os comandos executados e o resultado de cada um (ex.: `npm test` →
   `312 passed`).
4. **Testes criados ou alterados:** quais foram e o que cobrem.
5. **Interface:** se foi conferida em 375 px e em desktop.
6. **CI e deploy:** o status do run e do healthcheck do `staging`.
7. **Pendências:** o que não foi possível verificar e por quê. Isso inclui testes não
   executados, CI ainda rodando e decisões pendentes com o usuário.

## 9. Edição de arquivos

- **Codificação:** os arquivos são UTF-8, com texto em português acentuado. Depois de
  editar por shell, confira se a acentuação continua íntegra (`Seção`, não `SeÃ§Ã£o`).
- **Quebras de linha:** o repositório mistura CRLF e LF. Preserve a quebra de linha de cada
  arquivo e não converta arquivos inteiros. Um diff que troca todas as linhas esconde a
  mudança real.
- **Arquivos gerados:** não edite à mão código gerado (`node_modules`, `.next`, cliente
  Prisma).
