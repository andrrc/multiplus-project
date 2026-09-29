# Divisão da Sprint 4 — Projetos e Tarefas (4A e 4B)

**Versão:** 1.1
**Data:** 16/09/2026
**Autor:** André (Somma)
**Base:** SRS v2.3, ADD v1.9, PDD v1.0, Padrão de Testes v1.0,
`docs/auditoria-inicial-sprint4a.md` v1.2
**Status:** Divisão aprovada e decisões fechadas (D1 a D9). A 4A pode começar pela etapa A1

---

## 1. Por que dividir

A Sprint 4 original tem 12 telas, upload de imagem e o sistema de notificações inteiro. É
maior que qualquer sprint anterior e mistura dois tipos de risco que falham em silêncio:

| Risco | Onde aparece | Como falha |
|---|---|---|
| Permissão e herança de desativação no banco | Núcleo Projeto/Tarefa/Subtarefa | Um `ativo` ou um `NULL` esquecido não quebra nada visível, só vaza registro |
| Infraestrutura nova (MinIO, cron, e-mail) | Comentários com imagem e notificações | Job que não roda, e-mail duplicado ou imagem acessível sem login |

Separar os dois permite testar e aprovar cada risco isoladamente. A 4A já entrega valor real à
Talita: ela passa a controlar prazos dentro do sistema.

**Dependências que justificam a ordem:** notificação de "novo comentário" exige comentários;
aviso de prazo exige recorrência; RN-009 nas notificações exige o soft delete de
Projeto/Tarefa/Subtarefa. Tudo isso nasce na 4A.

---

## 2. Tarefa 0 — antes da 4A

Pendências herdadas da Sprint 1. O Padrão de Testes § 5 pressupõe que existem, e a auditoria da
Sprint 3 mostrou que não existiam.

**Executada em 16/09/2026, no que não depende de infraestrutura.** Não há VPS: o `.env` aponta
para `localhost`, o domínio do `.env.example` não resolve e nunca houve deploy. Produção fica
fora da Sprint 4 inteira.

| # | Tarefa | Estado |
|---|---|---|
| 0.1 | Endpoint `/api/health` | **Feito.** `src/lib/saude.ts` + `src/app/api/health/route.ts`: 200 só depois de um `SELECT 1` real no Postgres, 503 caso contrário. Dois testes de integração |
| 0.2 | Workflow do GitHub Actions | **Feito.** `.github/workflows/ci.yml`, job `verificacao`: typecheck, lint e suíte completa com Postgres de serviço, a cada push. Script `typecheck` acrescentado ao `package.json` |
| 0.3 | Deploy via SSH com verificação | **Escrito e dormente.** O job existe, depende de `needs: verificacao` e chama `/api/health` antes de dar o deploy por bom — mas só roda com a variável de repositório `DEPLOY_ATIVO`. Sem VPS, ligá-lo deixaria o CI vermelho a cada push |
| 0.4 | UptimeRobot | **Fora de alcance:** não há o que monitorar |
| 0.5 | Confirmar backup (ADR-002) | **Fora de alcance:** não há o que salvar. Encerra a D5 |
| 0.6 | Confirmar as 6 correções pré-Sprint 4 | **Feito.** Todas no `main`, com commit próprio e teste — ver auditoria § 2 |
| 0.7 | SRS atualizado | **Feito.** v2.3: RF-024 com as duas listas de status, exemplo da RN-004 corrigido, Critério de Aceite Global marcado |
| 0.8 | Corrigir documentos | Parcial. Falta renomear `SRS_Multiplus_Software_v1.0.md` (o nome diz v1.0, o conteúdo está na v2.3) e marcar onde termina a versão vigente |

**Consequência que precisa aparecer no fechamento da 4A:** o Padrão de Testes exige
"healthcheck pós-deploy" das duas metades da Sprint 4, porque as duas mexem em schema. Sem VPS
ele não tem onde rodar. A 4A fecha **sem** esse item, registrado como pendência de
infraestrutura — não como checkbox marcado sem ter acontecido, que foi exatamente o problema
que a auditoria encontrou na Sprint 3.

---

## 3. Sprint 4A — Núcleo e visão gerencial

### 3.1 Escopo

**Requisitos:**

- RF-004, RF-005, RF-006, RF-008, RF-024, RF-025 e RF-038: núcleo Projeto/Tarefa/Subtarefa
- RF-009 (% em dia) e RF-037 (Painel de Subtarefas)
- RF-018 a RF-021 e RF-046: permissões aplicadas nas telas e no endpoint
- RF-013: parte de projeto
- RF-039: soft delete de Projeto, Tarefa e Subtarefa
- RN-001, RN-004, RN-005, RN-006 (UI), RN-007, RN-008 e RN-009

**Herdados da Sprint 3** (auditoria da Sprint 3, § 5): guarda de rota do RF-043 em `/clientes`
(§ 5.3, resolvida pela D1); `definirAcessoClienteAtivo` sem auditoria (§ 5.7);
`definirSenhaAction` sem checar usuário ativo (§ 5.8); teste de `listarOpcoesDeAtribuicao`
(§ 5.9); e-mail bloqueado para o Administrador no Meu Perfil (§ 5.10); edição de cliente
desativado que abre e só barra no salvar (§ 5.12).

Mais o § 5.5: trocar a tela inicial do Administrador para o Painel de Subtarefas e acrescentar os
itens de menu **Subtarefas** e **Projetos**. Agenda e Notificações entram na 4B.

**Fica para a 4B:** RF-007, RF-016, RF-017, RF-022, RF-023, RF-036 e RF-047.

### 3.2 Etapas e dependências

| Etapa | Conteúdo | Depende de |
|---|---|---|
| **A1 — Schema** | Campos do RF-038; enums de status do RF-024 (as listas estão no SRS v2.3, § 3.x); recorrência em tarefa (periodicidade, vínculo de série, encerramento de série); etiquetas como array de texto (D3), reconciliando a coluna `etiqueta` singular que já existe; `ativo`, `desativado_em` e `desativado_por` em Projeto, Tarefa e Subtarefa; `projetoId` opcional em documento, mantendo `clienteId` obrigatório (auditoria § 4.7). Migrations não-destrutivas, no padrão da `20260916110000` | Tarefa 0 |
| **A2 — RLS e herança** | Ver § 3.3: a herança **já existe**; esta etapa é sobretudo uma retirada de permissão | A1 |
| **A3 — Regras puras** | Cálculo da próxima ocorrência (RN-008); **projeção de ocorrências futuras (ADR-009)**, que sobe da 4B por causa da D2; definição de atrasada (RN-001); cálculo do % em dia (RF-009); filtro de desativados (RN-009). Funções sem banco, testáveis isoladamente | A1 |
| **A4 — Ações de servidor** | CRUD de projeto, tarefa, subtarefa e documento de projeto; desativar e reativar; concluir tarefa (materializando a ocorrência projetada, quando for o caso, na mesma transação); concluir subtarefa; filtro de `ativo` nos dois seletores de atribuição (auditoria § 4.6). Toda ação checa perfil no servidor, sem confiar na UI | A2, A3 |
| **A5 — Telas do Administrador** | Lista de projetos, formulário e detalhe de projeto, formulário e detalhe de tarefa, checklist, documentos do projeto, toggle "Mostrar desativados" | A4 |
| **A6 — Telas do colaborador** | Meus Projetos (Interno), Minhas Tarefas (Externo), detalhe de tarefa somente leitura com botão "Marcar como concluída"; RF-020 e RF-046 aplicados. As duas telas hoje listam `Atribuicao`, não projeto/tarefa — e mostram "(projeto removido)" para o que a RLS esconde, o que depois da A1 passaria a acontecer com todo projeto desativado | A4 |
| **A7 — Visão gerencial** | Painel de Subtarefas com filtro padrão "pendentes" e filtro por cliente/projeto; ocorrência vencida e não concluída convive com a projetada seguinte; % em dia no painel e no detalhe do projeto, visível só para o Administrador; troca do redirecionamento em `src/lib/navegacao.ts` e dos itens de menu | A3, A5 |
| **A8 — Herdados** | § 5.3 (com a D1: remover os ramos de não-Administrador e trocar `obterContexto()` por `exigirAcessoARota`), 5.7, 5.8, 5.9, 5.10 e 5.12 | § 5.9 depende de A4 |

Os nomes das telas em A5 a A7 são provisórios e serão alinhados ao PDD.

### 3.3 A etapa A2 em detalhe — o que a auditoria mudou

A herança de desativação, que o plano original colocava aqui, **já foi feita** na migration
`20260916190000_rls_heranca_projetos_tarefas`, e nas nove políticas das três tabelas. O que
sobra para a A2 é mais delicado do que parecia:

**1. Retirar escrita, não conceder.** Sete políticas dão hoje ao Colaborador Interno o poder de
criar, editar e apagar projeto, tarefa e subtarefa — o contrário da RN-007 (auditoria § 4.1).
Uma política que se retira precisa do teste escrito **antes**, senão a suíte fica verde nos dois
mundos, e o risco é o inverso do usual: não é "esqueci de liberar", é "sobrou liberado", que
nenhuma tela mostra.

**2. Inverter o teste de checklist.** A trigger `subtarefas_enforce_rn004` trata o Colaborador
Interno como gestor do checklist, e existe um teste que **afirma** isso
(`tests/integration/subtarefas-rn004.integration.test.ts:166`). A RN-007 tornou a gestão do
checklist exclusiva do Administrador, e a Talita confirmou em 16/09. O teste passa a afirmar o
oposto, e o porquê precisa estar no corpo dele.

**3. Trocar a lista de negação por lista de permissão.** A trigger protege colunas
**nomeando-as** (`etiqueta`, `tarefaId`, `atribuidoAId`). As colunas que a A1 cria em
`subtarefas` — `ativo`, `desativadoEm`, `desativadoPor`, etiquetas — ficariam de fora, e o
colaborador atribuído poderia desativar a própria subtarefa direto pelo banco. Livre passa a ser
só `concluida`; qualquer outra alteração por quem não é Administrador levanta exceção.

**4. A exceção da conclusão** (RN-007) entra por uma função `SECURITY DEFINER`
`concluir_tarefa(id)` — não reabrindo `tarefas_update`, que liberaria qualquer coluna daquela
linha. Precisa de teste que tente alterar o prazo como colaborador e confirme a recusa.

**Nulos na fronteira.** As três armadilhas conhecidas valem integralmente em A2 e A3:
`NULL = NULL` em PL/pgSQL, `null === null` em TypeScript, e subselect em política gerando
recursão. Revisar toda comparação de coluna nullable nas políticas novas.

### 3.4 Testes — Sprint 4A

**RFs/RNs cobertos:** RF-004, 005, 006, 008, 009, 013, 018 a 021, 024, 025, 037, 038, 039, 046;
RN-001, 004, 005, 006, 007, 008, 009; ADR-009

- [x] **Unitário — RN-008:** prazo 10/09 mensal concluído em 20/09 gera 10/10; 31/01 mensal gera
  28/02 (e 29/02 em ano bissexto); a ocorrência seguinte a 28/02 volta a 31/03, ancorada no
  prazo original da série e não no anterior; semanal, trimestral, semestral e anual; tarefa
  cancelada não gera próxima
- [x] **Unitário — ADR-009 (projeção):** a ocorrência seguinte aparece mesmo com a anterior
  vencida e não concluída; série cancelada não projeta; ocorrência já materializada não aparece
  duplicada
- [x] **Unitário — RN-001:** prazo hoje e não concluída conta como em dia; prazo ontem e não
  concluída conta como atrasada; sem tolerância
- [x] **Unitário — RF-009:** conjunto vazio (exibe percentual nulo, renderizado como \"—\", sem divisão por zero);
  concluídas; desativadas fora do cálculo
- [x] **Permissão — RN-007 (retirada):** Colaborador Interno e Externo não criam, não editam e
  não desativam projeto, tarefa, subtarefa ou item de checklist, testado **no banco e na ação de
  servidor**; colaborador não altera nenhuma coluna além do status para "Concluído". Escrito
  antes da migration que retira os ramos
- [x] **Permissão — RN-004:** Interno com acesso ao projeto não conclui subtarefa atribuída a
  outra pessoa, e **não gere mais o checklist** (inversão do teste atual)
- [x] **Permissão — colunas novas da subtarefa:** o atribuído não altera `ativo` nem as
  etiquetas; só `concluida`
- [ ] **Permissão — RN-005:** Externo atribuído à Tarefa Y não vê outras tarefas do projeto
- [ ] **Permissão — RN-009/ADR-008:** projeto desativado torna tarefas e subtarefas
  inacessíveis para colaborador sem marcá-las; reativar devolve o estado anterior exato;
  subtarefa já desativada antes continua desativada após reativar o projeto
- [ ] **Permissão — RF-046:** Externo vê só o nome do cliente; acesso direto ao cadastro por
  URL é negado
- [ ] **Permissão — RF-043:** rotas de Administrador negadas por URL para os demais perfis,
  chamando as guardas de verdade e não só a função pura (§ 5.3)
- [ ] **Integração — § 5.9:** `listarOpcoesDeAtribuicao` com projetos e tarefas reais, incluindo
  um projeto desativado que não pode aparecer
- [ ] **Smoke:** Administrador cria projeto, tarefa recorrente e checklist; Externo conclui a
  tarefa; próxima ocorrência aparece no Painel de Subtarefas
- [ ] **Regressão:** suíte completa das Sprints 1 a 3 passando
- [ ] **Healthcheck pós-deploy:** N/A — não há produção (ver Seção 2)
- [ ] **Falha de integração externa:** N/A

### 3.5 Maior risco

**A2.** É onde os dois bugs mais caros do projeto já aconteceram, e onde o erro não aparece na
tela. Agora com um agravante: a etapa mexe em política e teste que hoje estão **verdes e
errados**. Recomendação: A2 logo após A1, com os testes de permissão escritos antes das telas.

### 3.6 Demonstração de aceite para a Talita

1. Criar um projeto para um cliente, com uma tarefa mensal e um checklist
2. Entrar como colaborador e marcar a tarefa como concluída
3. Mostrar a próxima ocorrência no Painel de Subtarefas, com a data ancorada no prazo original
4. Mostrar uma tarefa vencida sem conclusão: ela continua listada como atrasada, e a ocorrência
   seguinte já aparece ao lado (D2)
5. Mostrar o % em dia mudando
6. Desativar o projeto e mostrar que ele sai do painel e do indicador; reativar e mostrar a volta

---

## 4. Sprint 4B — Agenda, comentários e notificações

### 4.1 Escopo

- RF-036: agenda mensal, consumindo a projeção do ADR-009 que a 4A já terá construído
- RF-016, RF-017 e RF-047: comentários com imagem ou link, imutáveis
- RF-007, RF-022 e RF-023: notificações por e-mail e in-app
- RN-009 aplicada às notificações
- Itens de menu **Agenda** e **Notificações**

### 4.2 Etapas e dependências

| Etapa | Conteúdo | Depende de |
|---|---|---|
| **B1 — Infra de imagem** | O MinIO **já está no `docker-compose.yml`** desde a Sprint 1 (container, volume, healthcheck e variáveis no serviço `app`), mas nenhuma linha de código o usa. Falta: bucket privado, cliente no código, limite de corpo de requisição no Caddy e na aplicação, e sync do bucket para o R2 | 4A entregue |
| **B2 — Comentários** | Tabela de comentários nos três níveis; RLS só com `SELECT` e `INSERT`, sem política de `UPDATE` ou `DELETE` (RF-047); UI sem ações de editar ou excluir | 4A |
| **B3 — Upload** | Redimensionamento no navegador (~2000px, WebP); validação no servidor por tipo real do arquivo (não pela extensão) e por tamanho (10MB); imagem servida por rota autenticada (D7) | B1, B2 |
| **B4 — Agenda** | Tela mensal sobre a função de projeção da 4A; tarefas com prazo e com status "Visita/reunião agendada"; itens projetados sem ação de edição | 4A (A3) |
| **B5 — Modelo de notificações** | Configuração de eventos por perfil (RF-022, cinco eventos da decisão 14); antecedência padrão de 7 dias com sobrescrita por tarefa; tabela de notificação in-app com estado de lida | 4A |
| **B6 — Disparo** | Eventos síncronos (tarefa concluída, projeto concluído, novo comentário, atribuição recebida) disparados pela ação; job diário de prazo próximo com registro de envio para não repetir; responsável sem login não recebe, só o Administrador (decisão 11) | B5; "novo comentário" depende de B2 |
| **B7 — E-mail** | Templates no Resend; falha do Resend não derruba a ação que gerou o evento | B6 |
| **B8 — Telas** | Agenda, central de notificações com indicador de não lidas, configuração de notificações por perfil, comentários nas telas de projeto, tarefa e subtarefa | B2 a B7 |

### 4.3 Testes — Sprint 4B

**RFs/RNs cobertos:** RF-007, 016, 017, 022, 023, 036, 047; RN-009

- [ ] **Unitário — RF-007:** aviso no dia exato da antecedência; antecedência sobrescrita na
  tarefa prevalece sobre o padrão
- [ ] **Permissão — RF-047:** nenhum perfil, incluindo o Administrador, altera ou remove
  comentário, testado no banco
- [ ] **Permissão — imagem:** URL da imagem não abre sem sessão; Externo não abre imagem de
  comentário de tarefa que não é dele
- [ ] **Permissão — RN-009:** tarefa ou projeto desativado não gera notificação nem aparece na
  agenda
- [ ] **Integração — job de prazo:** rodar o job duas vezes no mesmo dia envia uma única vez;
  responsável sem login não recebe
- [ ] **Integração — upload:** arquivo acima de 10MB e tipo não permitido são recusados no
  servidor, mesmo que o navegador seja contornado
- [ ] **Smoke:** comentário com imagem numa tarefa gera notificação in-app e e-mail para os
  perfis configurados
- [ ] **Regressão:** suíte completa das Sprints 1 a 4A
- [ ] **Healthcheck pós-deploy:** depende de haver produção até lá
- [ ] **Falha de integração externa:** Resend fora do ar não impede concluir a tarefa ou
  publicar o comentário

### 4.4 Maior risco

**B3 e B6.** Imagem servida sem checagem de permissão vaza conteúdo de um cliente para
qualquer pessoa com o link. Job sem controle de envio manda e-mail em duplicidade ou deixa de
mandar sem ninguém perceber.

---

## 5. Decisões — todas fechadas em 16/09/2026

| # | Decisão | Resolução |
|---|---|---|
| D1 | Ramos para não-Administrador em `/clientes`: menu errado ou código morto? | **Código morto.** A8 remove os ramos e troca `obterContexto()` por `exigirAcessoARota("/clientes")` nas quatro páginas |
| D2 | Tarefa recorrente que vence sem conclusão gera a próxima? | **Sim** (Talita, 16/09) — e era o que o critério de aceite do RF-006 já dizia. **Não traz cron:** o ADR-009 resolve por projeção em tempo de renderização, então a função sobe da 4B (B4) para a 4A (A3) |
| D3 | Etiquetas de subtarefa: array de texto ou tabela própria? | **Array de texto**, reconciliando a coluna `etiqueta` singular já existente |
| D4 | SRS atualizado antes da execução | **Feito** — v2.3 |
| D5 | Backup e monitoramento existem de fato? | **Encerrada:** não há VPS |
| D6 | Tarefa 0 dentro da 4A ou como entrega à parte? | **À parte, antes** — executada em 16/09 |
| D7 | Imagem por rota autenticada ou URL assinada? | **Rota autenticada** |
| D8 | Lista de valores de status do RF-024 | **Fechada com a Talita** em 16/09: 4 de projeto, 9 de tarefa, padrão "A iniciar". No SRS v2.3 |
| D9 | Como aplicar migrations em produção | **Serviço `migrate` no `docker-compose.yml`**, com a role dona, antes de o app subir — a role do container `app` é restrita por RLS e não altera schema. **Adiada:** sem VPS não há o que aplicar |

---

## 6. Pendências de negócio para o checkpoint da 4A com a Talita

1. ~~Colaborador só tem "Marcar como concluída", sem estados intermediários~~ — **confirmado em
   16/09**
2. Colaborador Externo vendo o nome do cliente (RF-046) e a implicação de LGPD com terceiros
3. Posição da migração assistida (RF-044) na Sprint 7. **É entregável contratual**; se ela
   espera migrar antes de usar o sistema, precisa subir. Não deveria esperar até a Sprint 6
   para aparecer
4. Trocar o perfil de um usuário apaga as atribuições dele (RN-005)

---

## 7. O que falta para fechar os planos detalhados

- **PDD de Projetos e Tarefas:** existe, é a v1.0 de 14/09/2026
  (`docs/product-design-multiplus-projetos-tarefas.md`), e cobre as Telas 1 a 5 e 9 a 13. Falta
  acrescentar as **Telas 6, 7 e 8** — que não existem no documento e correspondem ao checklist
  de subtarefas, aos documentos do projeto e ao detalhe de tarefa do colaborador (etapas A5 e
  A6) — e reconciliar o documento com o SRS v2.3, já que ele foi escrito sobre a v2.0
- **Renomear `SRS_Multiplus_Software_v1.0.md`** e marcar onde termina a versão vigente
  (item 0.8)

---

## Histórico de Revisões

| Versão | Data | Autor | Alterações |
|---|---|---|---|
| 1.1 | 16/09/2026 | André (Somma) | Decisões D1 a D9 fechadas; Tarefa 0 executada e sem VPS; A2 reescrita com os três achados da auditoria (retirar escrita, inverter o teste de checklist, lista de permissão na trigger); projeção do ADR-009 sobe da 4B para a 4A por causa da D2; PDD e MinIO reconhecidos como já existentes |
| 1.0 | 16/09/2026 | André (Somma) | Divisão da Sprint 4 em 4A (núcleo e visão gerencial) e 4B (agenda, comentários e notificações), com Tarefa 0 de infra antes da 4A |
