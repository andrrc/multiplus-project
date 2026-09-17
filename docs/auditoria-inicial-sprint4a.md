# Auditoria Inicial do Repositório — Sprint 4A

**Versão:** 1.2
**Data:** 16/09/2026
**Autor:** André (Somma)
**Base:** `docs/divisao-sprint4-projetos-tarefas.md` § 7, SRS v2.2, ADD v1.9, PDD v1.0,
auditoria da Sprint 3
**Status:** Concluída. Oito achados; o bloqueio de A1 foi resolvido pelas decisões da Seção 10

---

## 1. Resumo

A Seção 7 do plano pede confirmar "o que já existe de `Tarefa.responsavel`, RN-006,
`listarOpcoesDeAtribuicao` e RF-013 de cliente, e o estado atual das políticas de `projetos` e
`tarefas` após as correções pré-Sprint 4". As quatro respostas estão na Seção 3: **tudo existe e
funciona**, e é menos trabalho do que o plano supunha.

O que a auditoria encontrou além do perguntado é o oposto: **a etapa A2 não é acrescentar
permissão, é retirar.** As políticas de RLS hoje dão ao Colaborador Interno escrita ampla em
projeto, tarefa e subtarefa — o contrário do que a RN-007 determina. A migration de ontem
(`26160cf`) recriou todas as nove políticas e manteve esses ramos, porque estava corrigindo
herança de desativação, não permissão. Existe inclusive **um teste de integração que afirma o
comportamento que a RN-007 proíbe** (§ 4.2). A 4A vai mudar comportamento testado, não preencher
lacuna, e isso muda como a etapa é revisada.

O segundo bloqueio era mais simples e mais chato: **os 9 valores de status de tarefa do RF-024
não estavam escritos em documento nenhum** (§ 4.4). Resolvido na Seção 10 — a Talita fechou as
duas listas em 16/09, e a etapa A1 está liberada.

| | |
|---|---|
| Etapas prontas para começar | A1, A3, A8 |
| Etapas com escopo maior que o planejado | A2 (§ 4.1, § 4.2, § 4.3) |
| Etapas bloqueadas | nenhuma. A4/A5/A7 seguem dependendo de A1 e A2, como no plano |
| Achados que geram trabalho fora das etapas | § 4.6 (seletores), § 4.7 (documento) |

---

## 2. Estado da base, verificado nesta auditoria

Rodado em 16/09/2026, no `main`, commit `04775dd`:

| Verificação | Resultado |
|---|---|
| `npm run test:unit` | 62 testes, 4 arquivos — passa |
| `npm run test:integration` | 100 testes, 9 arquivos — passa |
| `npm run test:smoke` | 15 testes, 3 arquivos — passa |
| `npx tsc --noEmit` | limpo |
| Migrations pendentes | nenhuma (18 aplicadas) |

**177 testes no total.** A auditoria da Sprint 3 registrou 161; a diferença são os testes do
RF-042 (`41e4198`) e os das correções seguintes.

As **seis correções pré-Sprint 4** do item 0.6 estão todas no `main`, cada uma com commit próprio:
`26160cf` (RLS de projetos/tarefas), `f672ec7` (cliente desativado criando acesso), `e8717c8`
(aviso de falha do convite), `eaecd57` (oráculo de tempo), `41e4198` (testes do RF-042),
`02324f2` + `04775dd` (documentos). **Item 0.6 pode ser marcado.**

Os **seis herdados da Sprint 3** (§ 5.3, 5.7, 5.8, 5.9, 5.10 e 5.12) continuam abertos, como o
plano previa — reconfirmados um a um na Seção 7 desta auditoria.

---

## 3. Respostas às quatro perguntas da Seção 7

### 3.1. `Tarefa.responsavel` e RN-006 — prontos e testados

`Tarefa.responsavelId` é FK opcional para `PessoaEnvolvida` (`prisma/schema.prisma`, relação
`TarefaResponsavel`), não para `Usuario` — a migração do ADR-007 já foi feita.
`definirResponsavelTarefa` (`src/lib/tarefas.ts`) cria a `Atribuicao` quando a pessoa tem acesso,
não cria quando não tem, é idempotente no upsert, e remove a atribuição da pessoa anterior na
troca (RN-006). Cinco testes de integração em `tests/integration/tarefas-rn006.integration.test.ts`
cobrem os cinco caminhos, inclusive a troca para `null`.

**Para a 4A:** A4 chama essa função, não a reescreve. O único acréscimo previsto é o gatilho pela
UI, que hoje não existe.

### 3.2. `listarOpcoesDeAtribuicao` — correta na forma, sem teste, e com um filtro a acrescentar

`src/lib/usuarios.ts:498`. Roda sob `comContextoDeUsuario` (RLS ativa), recusa quem não é
Administrador, deriva a granularidade do perfil e filtra `cliente.ativo`. A forma está certa.

Duas ressalvas:

1. Continua **sem teste** (§ 5.9 da auditoria da Sprint 3). A consulta nunca executou com projeto
   ou tarefa real, porque a Sprint 3 não tinha nenhum.
2. O filtro é `{ cliente: { ativo: true } }`. Quando A1 criar `projetos.ativo` e `tarefas.ativo`,
   esse filtro **não** os cobre: a Talita conseguiria atribuir um colaborador a um projeto
   desativado. Ver § 4.6.

### 3.3. RF-013 de cliente — implementado; o vínculo a projeto exige uma decisão

`Documento` existe com `nome`, `link`, soft delete completo (`ativo`, `desativadoEm`,
`desativadoPor`) e RLS própria. A criação está em `src/lib/clientes.ts:366` e a desativação usa a
action genérica de `clientes/[id]/actions.ts`, compartilhada com pessoa envolvida.

O ponto de atenção é o schema: `documentos.clienteId` é **NOT NULL**, e as políticas de
`documentos` derivam toda a permissão dele — `cliente_esta_ativo("clienteId")` e o `EXISTS` que
liga o Colaborador Interno ao cliente via projeto atribuído
(`20260916110500_rls_soft_delete_cascata/migration.sql:191`). Ver § 4.7 para a forma de acrescentar
o vínculo de projeto sem reabrir essa RLS.

### 3.4. Políticas de `projetos` e `tarefas` — herança pronta, permissão errada

A migration `20260916190000_rls_heranca_projetos_tarefas` recriou as **nove** políticas das três
tabelas (não só as de `SELECT`) e acrescentou `cliente_do_projeto_esta_ativo` e
`cliente_da_tarefa_esta_ativo`, ambas `SECURITY DEFINER` devolvendo `false` e nunca `NULL`. A
herança de desativação do § 5.1 está fechada, e fechada nos dois sentidos (leitura e escrita).

O que essa migration **não** mexeu — corretamente, não era o escopo dela — foi em quem pode
escrever. É o § 4.1.

---

## 4. Achados

Ordenados por efeito sobre o plano.

### 4.1. A etapa A2 não acrescenta permissão: ela retira

O plano descreve A2 como "políticas de escrita exclusivas do Administrador (RN-007)", como se as
políticas de escrita ainda não existissem. Elas existem desde a Sprint 1 e são **mais permissivas
do que a RN-007 admite**. Ramos de `ADMIN_INTERNO` em vigor hoje
(`20260916190000_rls_heranca_projetos_tarefas/migration.sql`):

| Política | Linha | Quem escreve hoje | RN-007 manda |
|---|---|---|---|
| `projetos_update` | 121 | ADMIN, ADMIN_INTERNO atribuído | só ADMIN |
| `tarefas_insert` | 194 | ADMIN, ADMIN_INTERNO atribuído | só ADMIN |
| `tarefas_update` | 211 | ADMIN, ADMIN_INTERNO atribuído | só ADMIN + a exceção de conclusão |
| `tarefas_delete` | — | ADMIN, ADMIN_INTERNO atribuído | só ADMIN |
| `subtarefas_insert` | 301 | ADMIN, ADMIN_INTERNO atribuído | só ADMIN |
| `subtarefas_update` | — | ADMIN, atribuído, ADMIN_INTERNO | só ADMIN + o atribuído concluindo |
| `subtarefas_delete` | — | ADMIN, ADMIN_INTERNO atribuído | só ADMIN |

`projetos_insert` e `projetos_delete` já são exclusivas do Administrador.

**Por que importa.** Uma política que se retira é diferente de uma que se escreve: o teste que
prova a retirada precisa existir *antes*, senão a suíte fica verde nos dois mundos. E o risco de
regressão é o inverso do usual — não é "esqueci de liberar", é "sobrou liberado", que nenhuma tela
mostra.

**Recomendação.** A2 começa por uma migration que derruba os ramos de `ADMIN_INTERNO` das sete
políticas acima, com o teste de permissão da RN-007 escrito primeiro, no banco e na ação de
servidor — como a § 3.4 do plano já pede. A exceção da conclusão entra depois, por
`concluir_tarefa(id)`, e não reabrindo `tarefas_update`.

### 4.2. A trigger da RN-004 trata o Colaborador Interno como gestor — e um teste afirma isso

`subtarefas_enforce_rn004` (última versão em `20260910192900_fix_rn004_null_ambos_lados`) calcula
`eh_gestor` como `ADMIN` **ou** `ADMIN_INTERNO` atribuído ao projeto, e permite ao gestor alterar
`etiqueta`, `tarefaId` e `atribuidoAId`. Ou seja: o Colaborador Interno gere o checklist.

Isso era a regra até a revisão da RN-007. O SRS v2.2 (linha 806) diz hoje que gerir o checklist
"**passou a ser exclusiva do Administrador** com a RN-007".

E existe um teste que trava o comportamento antigo:

```
tests/integration/subtarefas-rn004.integration.test.ts:166
"mesmo o ADMIN_INTERNO dono do projeto, que não pode concluir, continua podendo gerir o
checklist (etiqueta)"
```

**Para a 4A:** A2 altera a trigger (retirar `ADMIN_INTERNO` de `eh_gestor`) **e** inverte esse
teste. Um teste que passa a afirmar o oposto do que afirmava merece o porquê no corpo dele,
apontando a RN-007 — senão a próxima leitura parece um bug introduzido.

### 4.3. A proteção por coluna da subtarefa é uma lista de negação, e a 4A cria colunas novas

A trigger protege colunas **nomeando-as**: `etiqueta`, `tarefaId`, `atribuidoAId`. Toda coluna
que não está nessa lista fica livre para quem passou pela política de `UPDATE` — e quem passa
inclui a pessoa atribuída à subtarefa.

A etapa A1 acrescenta `ativo`, `desativadoEm`, `desativadoPor` e as etiquetas do RF-025 em
`subtarefas`. Nenhuma delas entra na lista. Resultado, se nada mudar: **o colaborador atribuído
poderá desativar e reativar a própria subtarefa direto pelo banco**, sem tela e sem erro.

É a mesma armadilha da § 3.3 do plano ("RLS protege linhas, não colunas"), que o plano cita só
para tarefa. Vale para subtarefa, e lá já existe o mecanismo — mal orientado.

**Recomendação.** Inverter a lista na mesma migration que mexer na trigger: livre é só
`concluida` (e só para o atribuído ou o Administrador); **qualquer** outra coluna alterada por
quem não é Administrador levanta exceção. Assim a proteção passa a valer para as colunas da 4A e
para as que vierem depois, sem ninguém precisar lembrar de acrescentá-las.

### 4.4. A1 está bloqueada: os 9 status de tarefa não existem em documento nenhum

O plano manda criar "enums de status do RF-024 (4 de projeto, 9 de tarefa)".

- **Projeto:** os 4 estão no PDD, linha 518 — *A iniciar | Em andamento | Concluído | Cancelado*,
  padrão "A iniciar". Prontos para virar enum.
- **Tarefa:** o PDD diz "9 valores do RF-024" (linha 592) e **não os lista**. Uma varredura em
  `docs/` acha só cinco, por menção solta: "A iniciar", "Concluído", "Protocolado", "Sob análise
  do órgão ambiental" e "Visita/reunião agendada". Faltam quatro.
- O RF-024 no SRS continua genérico — "ex.: em andamento, concluído, atrasado" (linha 459) — e o
  Critério de Aceite Global correspondente está **desmarcado**: "[ ] Lista de valores de status
  (RF-024) validada com a Talita" (linha 863).

Não é detalhe de redação. `status` é enum no banco, entra em migration, e mudar valor de enum
depois com dado gravado é retrabalho caro. Além disso a RN-007 fala nos "outros oito valores"
como os que o colaborador não pode escolher, e a Tela 5 do PDD desenha um seletor com eles.

**Recomendação.** Fechar a lista com a Talita **antes** de A1 — é uma pergunta curta, e a 4A
inteira depende dela. Tratar como decisão D8, bloqueando A1, e registrar na D4 (SRS v2.2 →
enumerar o RF-024). Enquanto não fechar, A3 (regras puras) pode andar: ela depende de *prazo* e
*concluída*, não da lista completa.

### 4.5. O SRS empilha três versões — e isso é convenção, não corrupção

**Correção da v1.0 desta auditoria.** A v1.0 classificou como corrupção o fato de
`docs/SRS_Multiplus_Software_v1.0.md` ter 2294 linhas com três documentos completos (v2.2 nas
linhas 1–876, v1.7 em 877–1609, v1.6 em 1610–2294), e recomendou truncar o arquivo. **É
deliberado:** a linha 875 declara a convenção — *"As versões anteriores do documento seguem
abaixo, na íntegra, em ordem decrescente"* — e o ADD faz o mesmo (`architecture-multiplus-software.md:756`).
Truncar apagaria histórico proposital. A recomendação foi retirada.

O que sobra é menor, e continua valendo:

- **Uma busca devolve três respostas.** `grep` por RF-024 traz três redações, e a da v1.6 não
  conhece a RN-007. Para leitura humana o cabeçalho de versão resolve; para agentes de IA lendo o
  arquivo, não. Mitigação barata: uma linha logo abaixo do cabeçalho da versão vigente dizendo
  onde ela termina.
- **O nome do arquivo diz `v1.0` e o conteúdo vigente está na v2.2.** Renomear para
  `SRS_Multiplus_Software.md` — sem versão no nome, que é o que gera a confusão — não custa nada
  e elimina o convite ao erro.

### 4.6. Os dois seletores de atribuição precisam do filtro de `ativo` na mesma migration de A1

Além do `listarOpcoesDeAtribuicao` da § 3.2, `listarAtribuicoesDetalhadas`
(`src/lib/usuarios.ts:400`) resolve os nomes sob RLS: projeto invisível vira `entidadeNome: null`,
e as telas mostram **"(projeto removido)"** (`meus-projetos/page.tsx`, `minhas-tarefas/page.tsx`).

Hoje isso só acontece com dado inconsistente. Depois de A1, todo projeto desativado vai produzir
essa linha — texto que afirma uma remoção que não houve, na tela do colaborador, exatamente no
caso que a RN-009 manda tratar por ocultação.

**Recomendação.** Fechar os dois na etapa A4: `ativo: true` nos filtros do seletor, e filtrar as
atribuições órfãs na listagem em vez de rotulá-las. O teste da § 5.9 cobre os dois de uma vez se
a fixture incluir um projeto desativado.

### 4.7. Documento de projeto: como acrescentar sem reabrir a RLS

`documentos.clienteId` é NOT NULL e sustenta toda a política. A forma barata de atender o RF-013
em projeto é **acrescentar `projetoId` opcional e manter `clienteId` obrigatório**, preenchido a
partir do cliente do projeto na criação. As políticas atuais continuam valendo sem uma linha de
alteração, e a herança de desativação do projeto entra depois, por conjunção, quando
`projetos.ativo` existir.

A alternativa — `clienteId` nullable, com a política escolhendo o caminho conforme qual FK está
preenchida — reabre em `documentos` a mesma comparação de coluna nullable que já custou duas
correções na trigger da RN-004.

### 4.8. O PDD de Projetos e Tarefas v1.0 existe

A Seção 7 do plano o lista como pendência. Ele está em
`docs/product-design-multiplus-projetos-tarefas.md`, v1.0 de 14/09/2026, e cobre as Telas 1 a 5 e
9 a 13, com estados e casos-limite na Seção 9 e matriz de rastreabilidade na 10.

Duas observações: ele é baseado no **SRS v2.0**, anterior à v2.2; e a numeração salta de Tela 5
para Tela 9 — **as Telas 6, 7 e 8 não existem no documento**. Pelo mapa das etapas, o que falta
desenhar é o checklist de subtarefas, os documentos do projeto e o detalhe de tarefa do
colaborador — justamente A5 e A6.

**Recomendação.** Trocar o item da Seção 7 de "escrever o PDD" para "acrescentar as Telas 6 a 8 e
reconciliar com o SRS v2.2". É bem menos trabalho do que o plano supõe.

---

## 5. Gap de schema para A1

O que existe hoje em `Projeto`, `Tarefa` e `Subtarefa` é o esqueleto da Sprint 1: id, nome,
vínculo, `status` como **texto livre** com default `"ativo"` / `"pendente"`, e o `responsavelId`
da RN-006. Falta:

| Tabela | Falta | Requisito |
|---|---|---|
| `projetos` | `descricao`, `dataInicio`, `dataPrevistaConclusao`, `status` como enum (4 valores) | RF-038 |
| `projetos` | `ativo`, `desativadoEm`, `desativadoPor` | RF-039 |
| `tarefas` | `descricao`, `prazo`, `status` como enum (9 valores — ver § 4.4) | RF-005, RF-024 |
| `tarefas` | periodicidade, vínculo de série, encerramento de série | RF-006, RN-008 |
| `tarefas` | `ativo`, `desativadoEm`, `desativadoPor` | RF-039 |
| `subtarefas` | etiquetas (D3: array de texto) | RF-025 |
| `subtarefas` | `ativo`, `desativadoEm`, `desativadoPor` | RF-039 |
| `documentos` | `projetoId` opcional (ver § 4.7) | RF-013 |

Dois cuidados na migration de `status`: os defaults atuais (`"ativo"`, `"pendente"`) **não são**
valores da lista nova, então a conversão texto → enum precisa mapeá-los explicitamente; e não há
nenhuma linha real nessas três tabelas hoje (só fixtures de teste), o que torna a migration
barata — a mesma janela que a `20260916190000` aproveitou.

---

## 6. Tarefa 0 — estado real

Coluna "Antes" = o que a auditoria encontrou; "Agora" = depois da execução da Tarefa 0 em
16/09/2026.

| # | Item | Antes | Agora |
|---|---|---|---|
| 0.1 | `/api/health` | Não existia | **Feito.** `src/lib/saude.ts` + `src/app/api/health/route.ts`, com teste dos dois caminhos (200 e 503) |
| 0.2 | GitHub Actions | Não existia | **Feito.** `.github/workflows/ci.yml`, job `verificacao`: typecheck, lint e suíte completa com Postgres de serviço. Script `typecheck` acrescentado ao `package.json` |
| 0.3 | Deploy com verificação | Não existia | **Escrito e dormente.** O job existe e chama `/api/health`, mas só roda com a variável `DEPLOY_ATIVO` — ver § 11.1 |
| 0.4 | UptimeRobot | A confirmar | **Fora de alcance:** não há VPS (§ 11.1) |
| 0.5 | Backup (ADR-002) | A confirmar (D5) | **Fora de alcance:** não há VPS (§ 11.1) |
| 0.6 | Seis correções pré-Sprint 4 | **Feito**, ver Seção 2 | Sem mudança |
| 0.7 | SRS | Parcial: o cabeçalho já diz v2.2, mas o RF-024 segue genérico (§ 4.4) e o exemplo da RN-004 (linha 806) ainda diz que o Colaborador Interno "pode ver/editar o checklist", contradizendo o texto revisado da própria linha | Pendente: a lista do § 10.1 precisa entrar no RF-024 |
| 0.8 | Corrigir documentos | Parcial: `02324f2` e `04775dd` fecharam o § 5.11; falta o item de nome/marcação do § 4.5 | Pendente |

**Achado lateral para a 4B:** o MinIO **já está no `docker-compose.yml`** desde a Sprint 1 —
container, volume, healthcheck e variáveis no serviço `app`. Nenhuma linha de código o usa
(`grep` por `minio` em `src/` não acha nada), o bucket não é criado por nenhum script e o
`Caddyfile` não tem limite de corpo de requisição. A etapa B1 é menor do que o plano descreve:
falta o bucket privado, o cliente no código, o limite no Caddy e o sync para o R2.

---

## 7. Herdados da Sprint 3 — reconfirmados abertos

| Item | Onde | Confirmação |
|---|---|---|
| § 5.3 | `clientes/page.tsx:13`, `[id]/page.tsx:70`, `[id]/editar/page.tsx:9`, `novo/page.tsx:6` | As quatro chamam `obterContexto()`; nenhuma chama `exigirAcessoARota`. Depende de D1 |
| § 5.7 | `src/lib/clientes.ts:417` | `definirAcessoClienteAtivo` continua gravando só `ativo`, sem `desativadoEm`/`desativadoPor` e sem `ctx` |
| § 5.8 | `src/app/definir-senha/actions.ts` | Nenhuma menção a `ativo`; `signIn` na linha 68 sem `try/catch` |
| § 5.9 | `src/lib/usuarios.ts:498` | Sem teste. Ver § 3.2 e § 4.6 |
| § 5.10 | `meu-perfil/formularios.tsx:46` | `readOnly disabled` incondicional; `emailEditavel` só controla o texto de ajuda |
| § 5.12 | `clientes/[id]/editar/page.tsx:10` | Checa perfil, não checa `cliente.ativo` |

---

## 8. Efeito nas decisões D1 a D8

| # | O que a auditoria acrescenta |
|---|---|
| D1 | Confirmado que as quatro páginas de `/clientes` não têm guarda de servidor e que `MENU` declara `perfis: ["ADMIN"]`. A recomendação do plano (código morto) segue de pé |
| D2 | Sem efeito — nada no código pressupõe geração no vencimento |
| D3 | Array de texto não conflita com nada existente; `subtarefas.etiqueta` (singular, `String` obrigatório) já existe e precisa ser reconciliado com a coluna nova, não duplicado |
| D4 | Ganha um item: enumerar o RF-024 (§ 4.4). O SRS **não** deve ser truncado — ver § 4.5 |
| D5 | Segue aberta. O MinIO está de pé desde a Sprint 1, então a pergunta sobre backup vale desde já |
| D6 | Sem efeito |
| D7 | Sem efeito |
| **D8 (nova)** | **Lista dos 9 status de tarefa do RF-024. Bloqueia A1** |

---

## 9. Recomendações

1. **Fechar a D8 antes de A1.** É uma pergunta à Talita, e A1 não fecha sem ela.
2. **Reordenar A2:** primeiro a retirada dos ramos de `ADMIN_INTERNO` (§ 4.1) com os testes de
   permissão escritos antes, depois a trigger da RN-004 virando lista de permissão (§ 4.3), por
   último a exceção de conclusão via `concluir_tarefa(id)`. A herança já está pronta, o que
   libera tempo da etapa para isso.
3. **Tratar a inversão do teste de checklist (§ 4.2) como item explícito do plano**, não como
   ajuste de suíte.
4. **Acrescentar à A4** o filtro de `ativo` nos dois seletores (§ 4.6), junto com o teste da
   § 5.9 que já estava previsto.
5. **Renomear o arquivo do SRS e marcar onde termina a versão vigente** (§ 4.5), junto com a D4.

---

## 10. Decisões da Talita — 16/09/2026

Respostas obtidas na consulta feita a partir desta auditoria. Fecham a **D8** e a **D2**, e
confirmam a RN-007.

### 10.1. D8 — os valores de status do RF-024 (RESOLVIDA)

**Projeto (4), padrão "A iniciar":**
`A iniciar` · `Em andamento` · `Concluído` · `Cancelado`

**Tarefa (9), padrão "A iniciar":**
`A iniciar` · `Em andamento` · `Aguardando documento do cliente` ·
`Visita/reunião agendada` · `Protocolado` · `Sob análise do órgão ambiental` ·
`Com exigência a cumprir` · `Concluído` · `Cancelado`

A lista de tarefa foi proposta nesta sessão e aprovada sem alteração. Com isso o Critério de
Aceite Global "Lista de valores de status (RF-024) validada com a Talita" (SRS, linha 863) pode
ser marcado, e **A1 deixa de estar bloqueada**.

### 10.2. D2 — a próxima ocorrência aparece ao vencer, não só ao concluir (RESOLVIDA)

Resposta: *"A de outubro deve aparecer assim mesmo."*

**Não era uma pergunta em aberto.** O critério de aceite do RF-006 já diz "quando o prazo atual
for concluído **ou vencer**". A Talita confirmou o requisito que já estava escrito; o que o plano
tratava como decisão era, na verdade, uma dúvida de implementação.

**E a implementação não traz cron para a 4A.** O ADR-009 já decidiu o mecanismo: calcular e
exibir as ocorrências futuras em tempo de renderização, sem persistir, como itens indicativos não
editáveis — descartando explicitamente a opção de gerar antecipadamente no banco. A consequência
é de ordem, não de infraestrutura: **a função de projeção sobe da 4B (etapa B4) para a 4A (etapa
A3)**, onde já estava prevista a irmã dela, o cálculo da próxima ocorrência pela RN-008. Continua
sendo função pura, sem banco e sem job agendado.

Dois detalhes que isso cria:

- **A4:** concluir uma ocorrência que ainda é projeção precisa materializá-la e concluí-la na
  mesma transação — senão a conclusão não tem linha onde gravar.
- **A7:** a ocorrência vencida e não concluída **continua** na lista, como atrasada (RN-001), ao
  lado da projetada seguinte. As duas convivem, e é isso que a demonstração de aceite mostra.

### 10.3. RN-007 confirmada — o colaborador só marca como concluída

Resposta: *"Exato, só pode marcar como concluído."*

Confirma, direto com quem define a regra, a retirada dos ramos de escrita do § 4.1 e a inversão
do teste de checklist do § 4.2 — que deixam de ser interpretação do SRS e passam a ser decisão
validada. Antecipa o item 1 das pendências de negócio do checkpoint da 4A.

---

## 11. Decisões do André — 16/09/2026

### 11.1. Não há VPS: produção fica fora da Sprint 4

Confirmado com o André. O `.env` aponta para `localhost`, o domínio do `.env.example` não
resolve, o README registra que o gate de CI e o healthcheck "ficam pra quando a sprint tocar
deploy real na Contabo", e as três ações do ADR-002 seguem desmarcadas. **Nunca houve deploy.**

Consequências, todas aceitas:

- **0.3** fica escrito e dormente, atrás da variável `DEPLOY_ATIVO`. Um job que falha em todo
  push por falta de secrets deixaria o CI permanentemente vermelho, e CI sempre vermelho não é
  gate — é ruído que ensina a ignorar o sinal.
- **0.4 e 0.5** saem do caminho crítico: não há o que monitorar nem o que fazer backup.
- **O "healthcheck pós-deploy obrigatório"** que o Padrão de Testes exige das duas metades da
  Sprint 4 **não tem onde rodar**. A 4A fecha sem ele, e isso passa a ser pendência de
  infraestrutura, não de sprint — precisa estar explícito no fechamento, senão vira um item de
  checklist marcado sem ter acontecido, que é o problema que esta auditoria encontrou na
  Sprint 3.
- **D5 encerrada** pelo mesmo motivo.

### 11.2. Decisões aprovadas

| # | Decisão | Efeito |
|---|---|---|
| D1 | Os ramos de não-Administrador em `/clientes` são código morto | A8 remove os ramos e troca `obterContexto()` por `exigirAcessoARota("/clientes")` nas quatro páginas. Destrava o § 5.3 |
| D3 | Etiquetas de subtarefa como array de texto | A1 cria a coluna nova e reconcilia a `etiqueta` singular que já existe — sem manter as duas |
| D7 | Imagem servida por rota autenticada | Só vale na 4B (B3); registrada para não ser rediscutida |
| D9 | Migrations em produção por um serviço `migrate` no `docker-compose.yml`, com a role dona, antes de o app subir | **Adiada:** sem VPS não há o que aplicar. A decisão fica registrada para quando a produção existir, e o `ci.yml` aponta para cá |

---

## Histórico de Revisões

| Versão | Data | Autor | Alterações |
|---|---|---|---|
| 1.2 | 16/09/2026 | André (Somma) | Tarefa 0 executada (0.1, 0.2 e 0.3); Seção 11 com as decisões do André — sem VPS, D1/D3/D7 aprovadas e D9 adiada |
| 1.1 | 16/09/2026 | André (Somma) | Correção do § 4.5: o empilhamento de versões no SRS é convenção declarada do projeto, não corrupção — recomendação de truncar retirada. Decisões da Talita de 16/09 registradas na Seção 10 |
| 1.0 | 16/09/2026 | André (Somma) | Auditoria inicial do repositório para a Sprint 4A, pedida na Seção 7 do documento de divisão da Sprint 4 |
