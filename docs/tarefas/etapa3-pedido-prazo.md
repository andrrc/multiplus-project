# TAREFA etapa3-pedido-prazo — Pedido de prazo e impedimento (etapa 3 dos comprovantes)

> Campo sem resposta fica como **pendente de validação**, nunca como suposição. Escopo aprovado pelo usuário em 2026-11-24: a
> [análise](../analises/comprovantes-etapa3-pedido-prazo-impedimento.md) foi aprovada com as quinze recomendações, e a tarefa foi pedida
> para o Codex. **A análise é a especificação**: em caso de dúvida, vale o que está nela; se ela não responde, pare e pergunte.

| Campo | Valor |
|---|---|
| **ID** | `etapa3-pedido-prazo` |
| **Agente responsável** | codex |
| **Branch** | `codex/etapa3-pedido-prazo` (criada a partir de `origin/staging`) |
| **Worktree** | `~/multiplus-worktrees/codex-etapa3-pedido-prazo` |
| **Estado** | aprovada |
| **Quem aprovou o escopo** | o usuário, em 2026-11-24 (análise aprovada e criação da tarefa) |
| **Revisor** | claude |
| **Criada em** | 2026-11-24 |

## 1. Objetivo

O colaborador externo responsável por uma tarefa ou subtarefa diz "não consigo cumprir este prazo" e **pede mais prazo** (nova data e motivo) ou
**informa um impedimento** (motivo). O coordenador do item, a administração ou o interno atribuído ao projeto, aprova ou recusa. Aprovando o
pedido de prazo, o prazo do item muda e o sistema guarda o prazo anterior. **Nenhuma regra de prazo é reescrita.**

## 2. Contexto da funcionalidade

- **Especificação:** [../analises/comprovantes-etapa3-pedido-prazo-impedimento.md](../analises/comprovantes-etapa3-pedido-prazo-impedimento.md) (aprovada). Leia as seções 2 a 8 e as respostas da seção 9.
- **Decisões que valem aqui:** `docs/decisoes-desenvolvimento.md` (linhas de 2026-11-23 sobre a etapa 2 e a pausa do prazo, e a de 2026-11-24 sobre a etapa 3).
- **Módulo e protótipo:** [../funcionalidades/tarefas.md](../funcionalidades/tarefas.md) e `telas-novas/sistema-gestao-multiplus-colaborador-externo/` (especificação, seções 3.2 e 5.2, e o diálogo em `01-minhas-tarefas.html`). Os dados dos protótipos são ilustrativos.
- **Esta tarefa muda dado, permissão e RLS?** **Sim**, e a análise aprovada cobre os três. Não muda nenhuma regra de prazo: a aprovação altera só o campo `prazo`.

**Resumo do que foi aprovado (a análise tem o detalhe):**

1. Tabela nova `pedidos_prazo`, escrita **só por funções do banco** (sem política de INSERT), com um pedido pendente por item e o prazo anterior guardado no próprio pedido.
2. O pedido vale para **tarefa e subtarefa**. Pede só o **externo responsável**; vê só os próprios pedidos; o cliente nunca vê.
3. Decidem a administração e o **interno atribuído ao projeto**, este por **caminho delegado que só pode mudar `prazo`**. Recusar exige resposta; aprovar não.
4. **Impedimento aceito não tem efeito automático** nesta etapa. Pedido de prazo pendente e impedimento **não** pausam o prazo.
5. Regras da nova data: posterior ao prazo atual, não anterior a hoje (Brasília) e, em tarefa recorrente, anterior à próxima ocorrência; `prazoOriginal` não muda.
6. Bloqueios: item em conferência, concluído, cancelado ou desativado não aceita pedido; item sem prazo aceita só impedimento.
7. Dois eventos de aviso novos: `PEDIDO_PRAZO_RECEBIDO` e `PEDIDO_PRAZO_RESPONDIDO`.
8. O chat com a Múltiplus **não** entra (etapa 4): o pedido e a resposta aparecem num cartão do próprio item.

**A conferir durante a implementação** (a análise deixa em aberto; anote a resposta no resumo e, se mexer em regra, pergunte):

- O que acontece com perfil sem linha de preferência para os eventos novos (a migration deve inserir as linhas dos quatro perfis).
- O que o novo responsável enxerga de um pedido pendente quando o item muda de dono.

## 3. Escopo

**Arquivos e módulos permitidos:**

- `prisma/schema.prisma` e **uma** migration nova em `prisma/migrations/` (**reservados**, seção abaixo). O timestamp precisa ser posterior ao da última de `origin/staging` (hoje `20261124120000_pausa_prazo_quantidade_arquivos`): confira antes de publicar.
- `src/lib/projetos-tarefas.ts` (**reservado**): só para acrescentar consultas, sem mudar assinaturas nem comportamento das funções existentes.
- Arquivos novos em `src/lib/`, por exemplo `pedidos-prazo.ts` (acesso ao banco) e `pedidos-prazo-regras.ts` (regras puras, para teste unitário).
- Server Actions: arquivo novo, de preferência junto da tela (por exemplo `src/app/(painel)/minhas-tarefas/[id]/pedido-prazo/` e `src/app/(painel)/tarefas/[id]/`), ou `src/app/(painel)/projetos/actions.ts` se acrescentar for mais coerente; dados montados campo a campo.
- Telas: `src/app/(painel)/minhas-tarefas/[id]/page.tsx`, `src/app/(painel)/tarefas/[id]/page.tsx`, `src/app/(painel)/painel/page.tsx` e `src/app/(painel)/painel/painel-interno.tsx` (bloco "Aguardando sua decisão"), e os arquivos novos de componente que elas pedirem dentro da própria pasta da rota.
- Notificações: `src/lib/notificacoes.ts`, `src/lib/email-templates.ts`, `src/lib/notificacoes-toasts.ts`, `src/app/(painel)/notificacoes/lista-avisos.tsx` e a tela de preferências por perfil em `src/app/(painel)/configuracoes/`, só para registrar os dois eventos novos.
- Testes novos: `tests/unit/pedidos-prazo*.test.ts`, `tests/integration/pedidos-prazo.integration.test.ts` e uma jornada nova em `tests/browser/`.
- Documentação: `docs/funcionalidades/tarefas.md`, `subtarefas.md`, `notificacoes.md` e `interface.md`.

**Arquivos e módulos proibidos:**

- As regras de prazo: `src/lib/prazo-em-conferencia.ts`, `src/lib/situacao-prazo.ts`, `src/lib/semaforo.ts`, `src/lib/agenda-itens.ts` e `src/lib/regras-projetos-tarefas.ts`. **Use-as, não as altere** (a análise garante que nada nelas muda; se parecer necessário, pare e pergunte).
- `src/ui/**`, `src/lib/navegacao.ts`, `src/app/globals.css`, `package.json`, `package-lock.json`, `src/lib/prisma-app.ts` e `src/server/auth/**` (sem reserva).
- Configuração de testes (`vitest*.mts`, `playwright.config.ts`, `tests/setup-env.ts`, `tests/integration/setup/**`), CI, `ops/`, Docker.
- A etapa 4: mensagens, página de Instruções, foto de exemplo.
- `docs/analises/planejamento-diferencas-prototipos.md` e `docs/decisoes-desenvolvimento.md` (as notas vão na seção 8).
- Os arquivos de qualquer outra tarefa.

**Arquivos compartilhados reservados por esta tarefa:**

- `prisma/schema.prisma`
- `prisma/migrations/**`
- `src/lib/projetos-tarefas.ts`

## 4. Dependências

- Tarefas que precisam estar integradas antes: nenhuma. A etapa 2 e a `pausa-prazo-visibilidade` já estão em `staging`.
- Tarefas que dependem desta: a etapa 4 (mensagens), que vai integrar o pedido e a resposta à conversa.
- **Enquanto esta tarefa correr, nenhuma outra pode reservar** `prisma/schema.prisma`, as migrations nem `src/lib/projetos-tarefas.ts`.

## 5. Contratos e interfaces relevantes

- **Padrão a seguir (etapa 1):** migration `20261117120000_comprovantes_etapa1`: `solicitar_conclusao`, `colaborador_responsavel_pelo_item(p_tipo, p_item_id)` (quem é responsável pelo item), `interno_atribuido_ao_item_do_comprovante(p_tarefa_id, p_subtarefa_id)` (interno atribuído ao projeto), `habilitar_decisao_delegada` e `decisao_delegada_tarefa` e `decisao_delegada_subtarefa` (decisão do interno), e `solicitacoes_conclusao_enforce` (imutabilidade). Funções `SECURITY DEFINER` com `SET search_path = public`, `REVOKE ALL ... FROM PUBLIC` e `GRANT EXECUTE` à role `multiplus_app`.
- **Gatilhos que hoje bloqueiam colaborador de mudar tarefa e subtarefa:** `tarefas_enforce_rn007` e `subtarefas_enforce_rn004`. O caminho da decisão do pedido de prazo precisa passar por eles **só para o campo `prazo`**. **Ao redefini-los, parta do corpo mais recente:** `grep -l "FUNCTION tarefas_enforce_rn007" prisma/migrations/*/migration.sql`, e preserve o caminho que já existe (`app.decisao_solicitacao`).
- **Detectar item em conferência** (bloqueio do pedido): `src/lib/prazo-em-conferencia.ts` (`emConferenciaDesde`) e a coluna `quantidadeArquivos` do pedido de conclusão (migration `20261124120000_pausa_prazo_quantidade_arquivos`). No banco, a função de pedido precisa fazer essa checagem por conta própria.
- **Próxima ocorrência de tarefa recorrente:** `calcularProximaOcorrencia` (`src/lib/regras-projetos-tarefas.ts`); a regra "anterior à próxima ocorrência" vale no servidor **e** no banco.
- **Acesso:** `comContextoDeUsuario` (`src/lib/prisma-app.ts`); nunca o cliente "dono" (`src/lib/prisma.ts`) para o que já tem sessão. `exigirAdministrador` e o padrão das Server Actions em `src/app/(painel)/projetos/actions.ts`.
- **Notificações:** `dispararEventoNotificacao`, o enum `EventoNotificacao`, a tabela `preferencias_notificacao` e o padrão da chave de idempotência (`solicitacao-conclusao:{id}:pendente`). Dispare **depois** da transação.
- **Datas:** UTC, com `timeZone: "UTC"` na exibição; "hoje" é o dia civil de Brasília (`dataDeHojeEmSaoPaulo`, `src/lib/datas.ts`).
- **Não apague nada:** os pedidos ficam no histórico; só mudam de estado.

## 6. Critérios de aceite

- [ ] Só o **externo responsável** cria pedido (tarefa ou subtarefa dele); administração, interno e cliente são recusados, no servidor **e** no banco.
- [ ] O externo vê **só os próprios** pedidos; o interno vê os dos projetos a que está atribuído; a administração vê todos; o **cliente nunca** lê a tabela.
- [ ] Um pedido pendente por item; depois de qualquer decisão, pode pedir de novo.
- [ ] A nova data respeita as regras da seção 2 (posterior ao prazo atual, não anterior a hoje, anterior à próxima ocorrência em tarefa recorrente), no servidor e no banco.
- [ ] Item em conferência, concluído, cancelado ou desativado não aceita pedido; item sem prazo aceita só impedimento; o pedido pendente vira `CANCELADO` quando o item fecha.
- [ ] **Aprovar** muda **só `prazo`** do item, na mesma transação, e grava o prazo anterior no pedido; `prazoOriginal` e as ocorrências futuras não mudam. Se o prazo do item já não for o `prazoAtual` do pedido, a decisão avisa e pede confirmação em vez de sobrescrever.
- [ ] **Recusar** exige resposta; **aprovar** aceita resposta opcional.
- [ ] O interno atribuído ao projeto decide por caminho delegado: **nenhuma permissão geral de editar prazo**, e uma tentativa de mudar outro campo por esse caminho falha.
- [ ] Impedimento: registra, notifica e permite resposta; **sem efeito automático** no item nem no prazo.
- [ ] O externo pode **retirar** o próprio pedido pendente.
- [ ] Dois avisos novos, por e-mail e no sistema, respeitando as preferências por perfil (linhas inseridas pela migration para os quatro perfis) e com idempotência por pedido.
- [ ] O cartão do pedido aparece na tela do item do externo, da administração e do interno; o bloco "Aguardando sua decisão" aparece no painel da administração e do interno.
- [ ] **Nenhuma regra de prazo muda:** semáforo, atrasos, agenda, painéis, PDFs, avisos e a pausa da etapa 2 recalculam pelo novo `prazo`, e a suíte existente continua verde.
- [ ] Telas funcionam em 375 px e no desktop, sem rolagem lateral, só com tokens de cor de `globals.css`.

## 7. Testes obrigatórios

- **Unitário em `tests/unit/`:** a regra da nova data (hoje, prazo atual, próxima ocorrência), o estado do pedido e o texto das telas.
- **Integração em `tests/integration/pedidos-prazo.integration.test.ts` (perfil permitido e negado, pela role RLS-restrita):**
  - o externo responsável pede; o externo de **outro** item é recusado; interno, administração e cliente não pedem;
  - o interno atribuído **decide**; o interno de **outro** projeto é recusado; o cliente nunca lê;
  - a aprovação muda **só `prazo`** e grava o prazo anterior; mudar outro campo pelo caminho delegado falha;
  - um pendente por item, decisão concorrente e imutabilidade depois de decidido;
  - tarefa recorrente: `prazoOriginal` intacto e nova data limitada pela próxima ocorrência;
  - item em conferência, fechado, desativado e sem prazo; pedido pendente vira `CANCELADO` ao fechar o item;
  - os dois eventos respeitam as preferências por perfil e a idempotência.
- **Jornada em `tests/browser/` (arquivo novo):** o externo pede mais prazo, o coordenador aprova, o prazo novo aparece e o externo vê a resposta; a 375 px e no desktop, sem rolagem lateral. Teste que apaga usuário precisa apagar `solicitacoes_conclusao` antes (histórico imutável); confira se `pedidos_prazo` pede o mesmo cuidado.
- **Verificação final:** `bash scripts/agentes/verificar.sh --completo` (pelo **Git Bash**, não pelo PowerShell) sem falhas novas. Avise a pessoa responsável antes de rodar `--completo`, porque só uma suíte de banco roda por vez.
- **Ordem sugerida, um commit por etapa:** (1) migration, funções, políticas e testes de RLS; (2) regras puras e acesso a dados; (3) Server Actions; (4) telas e painel; (5) avisos; (6) jornada e documentação.

## 8. Notas para o planejamento e as decisões

Para quem integra, após a entrega, registrar a conclusão da etapa 3 no planejamento da Fase 2 e consolidar estas decisões:

- Em uma troca de responsável, o novo responsável vê apenas o aviso de que há um pedido pendente no item. O autor, o motivo e o histórico continuam sujeitos às permissões de leitura da análise.
- O histórico guarda o prazo na abertura do pedido e, na aprovação de uma prorrogação, o prazo efetivamente substituído.
- Sem linha de preferência para um evento, `listarDestinatarios` não seleciona o perfil. A migration cadastra os dois eventos com ambos os canais ligados para os quatro perfis.

## 9. Resumo da implementação (preenchido ao terminar)

- **Fluxo implementado.** Pedidos de prazo e impedimento em tarefas e subtarefas, com histórico, retirada, decisão delegada e confirmação quando o prazo vigente mudou. O painel mostra as decisões pendentes e o autor recebe a resposta no cartão e no aviso.
- **Arquivos alterados.** Schema e migration em `prisma/`. Regras, consultas e avisos em `src/lib/`. Server Actions, cartões, diálogo e painel em `src/app/`. Testes unitários, de integração e de navegador em `tests/`. Documentação dos módulos em `docs/funcionalidades/`.
- **Decisões tomadas.** O fluxo segue as duas aprovações da seção 8 e usa `calcularProximaOcorrencia` após o rebase sobre os commits `4528285` e `151c1f8`. O teste mensal de 31/01 para 01/02 verifica a preservação da ocorrência de fevereiro. Os avisos reutilizam o registro de idempotência do job de prazo, com chaves próprias por pedido.
- **Verificações.** `npx prisma generate` passou após o rebase e após a edição do schema. `bash scripts/agentes/verificar.sh` e `bash scripts/agentes/verificar.sh --completo` passaram no Git Bash. A verificação completa incluiu typecheck, lint, 395 testes unitários, 370 de integração e smoke e 10 jornadas de navegador. A jornada nova conferiu os avisos e a ausência de rolagem horizontal em 375 px e no desktop.
- **Falhas preexistentes.** A primeira inicialização do Next no Playwright apresentou a recusa já registrada no onboarding e o script prosseguiu na segunda tentativa. Uma falha inicial da busca de Meus projetos não se repetiu em `origin/staging` (`npx playwright test tests/browser/colaborador.spec.ts -g "colaborador interno"`) nem na verificação final da tarefa.
- **Pendências e riscos.** A série semanal legada sem dia fixo segue o intervalo de sete dias a partir do prazo vigente, conforme `151c1f8`. O teste de integração usa envio de e-mail simulado. Continuam abertas a etapa 4 e a definição de um efeito automático para impedimento aceito, caso a Talita o solicite.
- **Perguntas para a pessoa responsável.** Nenhuma para o escopo atual.
