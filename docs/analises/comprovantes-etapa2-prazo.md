# Análise: etapa 2 dos comprovantes, o prazo para de contar durante a conferência

- **Data:** 2026-11-23
- **Pedido original:** tarefa `etapa2-analise` ([docs/tarefas/etapa2-analise.md](../tarefas/etapa2-analise.md)): descrever como o sistema deve parar de contar o prazo de uma tarefa ou subtarefa enquanto um envio de comprovante aguarda conferência, e o que isso muda em semáforo, atrasos, agenda, portal e avisos.
- **Status:** aprovada pelo usuário em 2026-11-23 (opção A e recomendações das perguntas 1 a 10). Nenhum código, banco ou teste foi alterado. O que a cliente já respondeu está na seção 1; o que ainda é interpretação nossa está marcado como **pendente de validação** e reunido na seção 9.
- **Origem da regra:** respostas da cliente de 2026-11-23 (pergunta 4 de [comprovantes-colaborador-externo.md](comprovantes-colaborador-externo.md), seção 10, e linha de 2026-11-23 de `docs/decisoes-desenvolvimento.md`): o prazo para de contar durante a conferência, **só quando o pedido tem comprovante**, e a pausa de prazo do colaborador interno é a mesma regra.

## 1. Escopo previsto

### Regra em uma frase

Item (tarefa ou subtarefa) com **pedido de conclusão pendente que tem arquivos** fica "em conferência": sai de atraso, de "vence em breve" e dos avisos de prazo, e mostra "Enviado em dd/mm". Ao confirmar, o item conclui. Ao devolver ou retirar o pedido, o prazo volta a contar.

### O que a cliente já definiu

- O prazo para de contar quando o envio tem comprovante, e só então (resposta de 2026-11-23).
- Vale também para o colaborador interno (mesma regra).
- Protótipos: o item mostra "Enviado em dd/mm" e não conta atraso; se confirmado, vale a data do envio; se rejeitado, o prazo volta a contar (`telas-novas/sistema-gestao-multiplus-colaborador-externo/00-especificacao-colaborador-externo.md`, seção 3.3; `telas-novas/colaborador-interno/00-especificacao-colaborador-interno.md`, seção 3.3). O protótipo do cliente conta como "em dia" o que está "enviado para confirmação (prazo pausado)" (`telas-novas/cliente/00-especificacao-cliente.md`, seção 5.1).

### Definição precisa

| Momento | O que acontece | Fonte no código |
|---|---|---|
| **Começa** | No instante em que existe um pedido `PENDENTE` com pelo menos um arquivo. A hora é a do banco (`solicitadoEm`, `@default(now())`), nunca a do celular. | `solicitar_conclusao` (migration `20261117120000_comprovantes_etapa1`) cria o pedido e liga os arquivos na mesma operação |
| **Pedido sem arquivo** | Nada muda: o prazo continua contando, como hoje. Só existe pedido sem arquivo em item que **não** exige comprovante, porque o banco recusa o envio sem a quantidade exigida e só aceita arquivo em item que exige. | `solicitar_conclusao` (quantidade) e `registrar_arquivo_comprovante` ("este item não exige comprovante") |
| **Termina por confirmação** | O item vira `CONCLUIDO`; já sai do atraso pelo status. "Vale a data do envio": a data é a de `solicitadoEm` do pedido aprovado. Não existe hoje uma coluna de data de conclusão (`concluir_tarefa` só troca o status). | `decidirSolicitacaoConclusao`, `concluir_tarefa` |
| **Termina por devolução** | Pedido `REJEITADA`: o item volta a contar na hora, com o **mesmo prazo** (pergunta 1, confirmada pela cliente em 2026-11-23). | `decidirSolicitacaoConclusao` restaura `statusAnterior` |
| **Termina por retirada** | Pedido `CANCELADA` (solicitante ou administração): volta a contar. Os arquivos ficam presos ao pedido cancelado, que é imutável; um novo envio exige novos arquivos (comportamento da etapa 1, não muda). | `cancelar_solicitacao_conclusao`; `solicitar_conclusao` só conta rascunhos sem pedido |
| **Item fechado ou desativado** | Concluído, cancelado ou desativado prevalece sobre a pausa, como já prevalece sobre o prazo. | `fechado` em `lista-tarefas.ts`, `situacaoDoPrazo` |

A pausa vale **só para o item que recebeu o pedido**: o pedido de uma subtarefa pausa a subtarefa e a tarefa-mãe continua contando (pendente de validação, pergunta 3).

### O que não muda

- O cálculo de dias (`calcularDiasRestantes`, dia civil de São Paulo) e a regra "o dia do prazo ainda conta como em dia" (`estaAtrasada`, RN-001).
- O semáforo do **projeto**: o projeto não tem pedido de conclusão, então não pausa.
- A recorrência: a próxima ocorrência é calculada a partir do prazo e do `prazoOriginal` da série (`calcularProximaOcorrencia`, chamada em `decidirSolicitacaoConclusao`), nunca da data do envio. A pausa não desloca nada. Ver seção 6.
- Os limites do semáforo e as regras de status das análises já aprovadas ([semaforo-prazos-projetos-tarefas.md](semaforo-prazos-projetos-tarefas.md), [semaforo-dias-corridos.md](semaforo-dias-corridos.md), [semaforo-vermelho-so-atrasado.md](semaforo-vermelho-so-atrasado.md)): vermelho só para vencido, âmbar até o limite, verde acima. A pausa acrescenta um estado, não muda as faixas.

### Fora do escopo

Pedido de prazo e impedimento (etapa 3); página `/instrucoes`, foto de exemplo e avisos "comprovante confirmado ou devolvido" (etapa 4); o status "A iniciar" da subtarefa e o aviso de atraso a cada 3 dias com escalada (Fase 3 do planejamento). Esta análise só registra o que eles exigirão desta regra (seções 4 e 9).

## 2. Permissões

Não há permissão nova nem leitura nova. O que cada perfil enxerga da pausa sai de dados que ele já lê hoje.

| Perfil | Vê a pausa? | Por quê (código) |
|---|---|---|
| **ADMIN** | Sim, de todos os itens | `solicitacoes_conclusao_select`: `app_current_perfil() = 'ADMIN'` |
| **ADMIN_INTERNO** | Sim, nos projetos a que está atribuído e nos itens de que é responsável | Mesma política: atribuição ao projeto, `responsavelUsuarioId`, `atribuidoAUsuarioId` |
| **ADMIN_EXTERNO** | Sim, nos itens atribuídos a ele | Mesma política: atribuição à tarefa, responsável ou subtarefa atribuída. A tela dele já tem o grupo "Aguardando conferência" |
| **CLIENTE** | **Não, e hoje não precisa** | Não há cláusula para `CLIENTE` em `solicitacoes_conclusao_select`, nem em `arquivos_comprovante_select`. O portal mostra só o semáforo do **projeto** e a data da tarefa, sem atraso (`portal/page.tsx:103`, `portal/[id]/page.tsx:53,73`) |

- **Nada de dado novo para o cliente.** O selo "Enviado em dd/mm" usa `solicitadoEm`, que administração, interno e externo já veem na lista de envios (`carregarEnvios`, `projetos-tarefas.ts`). Autor, arquivos e motivo continuam restritos como na etapa 1.
- **Quando o portal precisar** (o anel "X de Y obrigações em dia" do protótipo do cliente, que conta o "enviado para confirmação" como em dia), a análise própria dele deve expor **só um booleano** por item, por função `SECURITY DEFINER` no padrão de `contar_subtarefas_portal`, sem data, autor, motivo nem arquivo. Não se abre leitura de `solicitacoes_conclusao` ao cliente.
- **Quem pode causar a pausa e o fim dela** não muda: enviar (colaborador responsável), confirmar ou devolver (administração e interno do projeto, por delegação), retirar (solicitante ou administração).

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Ver o selo "Enviado em dd/mm" e a pausa | Sim | Sim, no escopo dele | Sim, nos itens dele | Não |
| Provocar a pausa (enviar com comprovante) | Não envia | Sim, se responsável | Sim, se responsável | Não |
| Encerrar a pausa (confirmar, devolver) | Sim | Sim, em pedido de externo do projeto dele | Não | Não |
| Encerrar a pausa (retirar) | Sim | O próprio pedido | O próprio pedido | Não |

## 3. Dados

### Forma de guardar a pausa: comparação

| | **A. Derivar do pedido** (recomendada) | **B. Gravar o instante e os dias pausados** | **C. Derivar + função SQL booleana** |
|---|---|---|---|
| **Como** | "Em conferência" = existe pedido `PENDENTE` com arquivos para o item. Calculado na consulta e numa função pura. | Colunas novas em `tarefas` e `subtarefas` (por exemplo `prazoPausadoEm` e `diasPausados`), mantidas por trigger sobre `solicitacoes_conclusao`. | O mesmo que A, mais `item_em_conferencia(tipo, id)` `SECURITY DEFINER`, para o job e o portal. |
| **Migration** | **Não** | Sim (colunas, trigger, backfill dos pedidos pendentes hoje) | Sim, só a função, e `GRANT` |
| **RLS** | Nenhuma mudança | Colunas em tabela que o `CLIENTE` já lê por linha (`tarefas`): exige cuidado para a coluna não vazar no portal | Função nova com `REVOKE`/`GRANT` ao `multiplus_app` |
| **Fonte da verdade** | Uma só: o pedido | Duas (pedido e colunas), que podem divergir | Uma só |
| **Consulta** | Um `include` do pedido pendente por item; já há índices `[status, solicitadoEm]`, `[tarefaId, solicitadoEm]`, `[subtarefaId, solicitadoEm]` e `[solicitacaoId]` nos arquivos | Coluna simples, sem junção | Igual a A |
| **Devolução com prazo restante preservado** | Não resolve sozinha | Resolve (soma os dias pausados) | Não resolve sozinha |
| **Risco** | A regra fica em código de consulta: cada lista precisa incluir o pedido (mitigado pela função única e pelos testes por ponto) | Trigger novo em tabela já delicada (RN-007/RN-004, decisão delegada); `decididoEm` hoje vem do relógio da aplicação (`new Date()` em `decidirSolicitacaoConclusao`), não do banco | Mais uma função `DEFINER` a manter |

**Recomendação: A.** A regra "só com comprovante" já é derivável do dado existente (`solicitacao_tem_comprovantes` faz exatamente essa pergunta), não exige migration nem RLS e não cria segunda fonte da verdade. Deriva-se dos **arquivos**, não da flag `comprovanteExigido`: se a administração mudar a flag com um pedido pendente, a regra continua correta. B só se justifica se a cliente pedir que o prazo restante seja preservado na devolução (pergunta 1); C entra quando o portal ou o job precisarem da resposta sem passar pelo Prisma.

### Consequências de A

- **Sem migration**, portanto `prisma/schema.prisma` e `prisma/migrations/**` não precisam ser reservados pela tarefa de implementação.
- **Sem coluna de data de conclusão.** "Vale a data do envio" fica derivado de `solicitadoEm` do pedido `APROVADA`. Se uma tela futura (o "Feito nos últimos 30 dias" do portal) precisar da data de forma barata, a coluna entra na análise dela.
- **Função única.** Um módulo novo em `src/lib/` (nome sugerido `prazo-em-conferencia.ts`) exporta:
  - `emConferencia(pedidos)`: recebe os pedidos do item (`status`, `solicitadoEm`, quantidade de arquivos) e devolve `{ enviadoEm } | null`;
  - um fragmento de `where` do Prisma para "sem conferência em andamento" (`solicitacoesConclusao: { none: { status: PENDENTE, arquivos: { some: {} } } }`) e o inverso, para as consultas que filtram no banco (`idsDeClientesComAtraso`, job de avisos, contagens da agenda).
- Todas as funções puras existentes ganham o dado **como parâmetro opcional**, com o padrão "não está em conferência". Assim, quem não passa o dado se comporta como hoje e os testes atuais continuam valendo.

## 4. Impacto em telas e funções existentes

Levantamento por leitura do código (`grep` por `estaAtrasada`, `calcularDiasRestantes`, `situacaoDoPrazo`, `IndicadorSemaforoProjeto`, `CelulaPrazo`, `idsDeClientesComAtraso`, `diasAmareloAte`, e leitura dos arquivos). Nenhum ponto hoje consulta o pedido para decidir prazo ou atraso.

### 4.1 Regras puras e componentes

| Arquivo e função | Hoje | O que muda |
|---|---|---|
| `src/lib/datas.ts` `calcularDiasRestantes` | Dias corridos entre hoje (São Paulo) e o prazo | **Nada.** Continua pura; a decisão de pausar vem antes |
| `src/lib/regras-projetos-tarefas.ts` `estaAtrasada` e `calcularPercentualEmDia` | Atrasada = prazo anterior a hoje e não concluída; "% em dia" sobre tarefas ativas | `TarefaParaIndicador` ganha `emConferencia`; item em conferência não é atrasado e conta como em dia |
| `src/lib/situacao-prazo.ts` `situacaoDoPrazo`, `contarSituacoes`, `rotulosSituacao` | `atrasado`, `proximo`, `prazo`, `sem`, `fechado` | Novo valor `em_conferencia`, tratado como `fechado` nas contagens e filtros: aparece só em "Todos". Sem botão novo (recomendação, pergunta 5). `FiltroSituacao` precisa excluir o novo valor |
| `src/lib/lista-tarefas.ts` `situacaoDoItem`, `filtrarPorSituacao` | Usa `status` e `ativo` | Recebe `emConferencia`. Usada pela lista de Tarefas, de Subtarefas, Minhas tarefas e pelo PDF |
| `src/lib/agenda-itens.ts` `classeDoItemAgenda`, `contarAtrasadosAnteriores`, mapas `COR_ITEM_AGENDA`, `COR_BARRA_AGENDA`, `ROTULO_CLASSE_AGENDA` | Classe pelo status e pelos dias; faixa de "atrasados de meses anteriores" | Nova classe `conferencia` (cor neutra, rótulo "Em conferência"); fora da faixa de atrasados anteriores. Os três mapas são `Record` e o TypeScript obriga a incluir a classe |
| `src/lib/painel.ts` `separarItensPainel`, `percentualEmDia` | Atrasados e "vencem em N dias" só por prazo | O item em conferência sai dos dois grupos e do numerador de atrasados |
| `src/lib/lista-meus-projetos.ts` `contarMinhasPendencias`, `tarefasAtrasadas` | Atrasadas = abertas com prazo vencido | Exclui o item em conferência de "atrasadas". "Pendências" continuam contando (o item segue aberto) |
| `src/lib/exportacao-pdf-tarefas.ts` `indicadorPrazo` (l. 127), `linhaTarefa`, `linhaSubtarefa`, filtro por situação (l. 565 e 571) | Mesmo rótulo do semáforo ("Atrasado N dias") | PDF mostra "Enviado em dd/mm", igual à tela (o PDF e a tela devem concordar, regra já seguida em `lista-tarefas.ts`). Exige que `listarPrazos` e `listarSubtarefasPrazos` tragam o pedido |
| `src/ui/indicador-dias-restantes.tsx` `IndicadorSemaforoProjeto` | Texto e cor por status e dias | Nova propriedade (por exemplo `emConferenciaDesde`): se presente e o item aberto, mostra "Enviado em dd/mm" em tom neutro. Data formatada no fuso de Brasília a partir do instante (`formatarDataHoraBrasilia`), não como data civil UTC |
| `src/ui/lista.tsx` `CelulaPrazo` | Repassa ao indicador | Repassa a nova propriedade |

### 4.2 Consultas (onde o pedido precisa ser carregado)

| Arquivo e função | Hoje | O que muda |
|---|---|---|
| `src/lib/projetos-tarefas.ts` `listarPrazos`, `listarSubtarefasPrazos` (administração) | Sem o pedido | `include` do pedido pendente com arquivos (`take: 1`, só `solicitadoEm`) |
| `listarTarefasAtribuidas`, `listarSubtarefasAtribuidas`, `buscarTarefaParaColaborador` (colaboradores) | Já trazem o último pedido (`status`, `comentarioDecisao`) ou `pedidoPendente` | Acrescentar `solicitadoEm` e a contagem de arquivos ao que já vem |
| `buscarProjeto`, `buscarProjetoAtribuido` (listas de tarefas dentro do projeto) | Sem o pedido | Idem, para a lista de tarefas e o contador de atrasadas |
| `listarItensAgenda`, `listarItensAgendaColaborador`, `montarItensAgenda`, `contarAtrasadosAnterioresAgenda`, `contarAtrasadosAnterioresColaborador` | `ItemAgenda` sem o pedido; os dois contadores filtram só por status e prazo | `ItemAgenda` ganha o campo; os contadores ganham o fragmento "sem conferência em andamento". A agenda só lista **tarefas** (não subtarefas) |
| `src/lib/clientes.ts` `idsDeClientesComAtraso` (l. 241), usada em `clientes.ts:227` (lista da administração) e `:380` (`listarClientesContextuais`) | `prazo < hoje` em tarefa aberta ou subtarefa `EM_ANDAMENTO`, direto no Prisma | Acrescentar o fragmento nos dois ramos. Cliente cujo único item vencido está em conferência deixa de aparecer "com atraso" |

### 4.3 Telas que calculam atraso por conta própria

Estas contas não passam por função compartilhada; cada uma precisa ser trocada pela função única. Foram achadas com `grep`:

| Arquivo | Cálculo |
|---|---|
| `src/app/(painel)/painel/page.tsx` l. 63 a 86 | Monta os itens, separa atrasados e calcula "Itens em dia". Também `LinhaItem` (l. 41) fixa `status="EM_ANDAMENTO"` no indicador |
| `src/app/(painel)/painel/painel-interno.tsx` l. 36 a 42 | `atrasadas`, `vencem` e a faixa da semana por `calcularDiasRestantes` |
| `src/app/(painel)/minhas-tarefas/tela-externo.tsx` l. 70 a 77 e l. 88 | **Falha hoje:** o item do grupo "Aguardando conferência" continua contado em "N atrasadas" e mostra o selo "Atrasado N dias" |
| `src/app/(painel)/minhas-tarefas/page.tsx` l. 100, 115, 125, 185 | Situação por `situacaoDoItem`; ação "Concluir" por `acaoDaLinha` |
| `src/app/(painel)/minhas-tarefas/[id]/page.tsx` l. 95 e 122 | Selo da tarefa e de cada subtarefa |
| `src/app/(painel)/tarefas/page.tsx` l. 74 a 76 e 136; `subtarefas/page.tsx` l. 74, 79 a 81 e 174 | Situação por `situacaoDoPrazo` e selo; `indicadorDePrazosSubtarefas` (l. 74) |
| `src/app/(painel)/tarefas/[id]/page.tsx` l. 67, 121, 165 | `subtarefasAtrasadas` por `calcularDiasRestantes` e selos |
| `src/app/(painel)/projetos/[id]/page.tsx` l. 47 a 51 e 173 | `tarefasAtrasadas`, `subtarefasAtrasadas`, `tarefasProximas` e selo por tarefa |
| `src/app/(painel)/meus-projetos/[id]/page.tsx` l. 26 e 71 | `atrasadas` e selo |
| `src/app/(painel)/agenda/visao-agenda.tsx` l. 63 | `classeDoItemAgenda(item, calcularDiasRestantes(...))`; a legenda (l. 164) ganha a classe nova |

### 4.4 Avisos de prazo

- `src/lib/notificacoes.ts` `dispararPrazoProximo` (l. 250 a 310), chamada por `executarJobPrazo` e pela rota `src/app/api/jobs/notificacoes-prazo/route.ts` (cron das 08:00 em `ops/README.md`): seleciona tarefas ativas, não concluídas nem canceladas, com prazo dentro da antecedência. **Não olha o pedido**, então hoje o externo que já enviou continua recebendo "Prazo próximo". Recebe o fragmento "sem conferência em andamento" no `whereBase`. Roda com a role dona (`prisma`, sem RLS), portanto enxerga todos os pedidos.
- O job **só cobre tarefas**, não subtarefas. É uma lacuna anterior a esta análise, e fica fora dela (pergunta 6).
- **Não existe aviso de "prazo vencido"**: o enum `EventoNotificacao` só tem `PRAZO_PROXIMO`, `TAREFA_CONCLUIDA`, `CONCLUSAO_SOLICITADA`, `PROJETO_CONCLUIDO`, `NOVO_COMENTARIO` e `ATRIBUICAO_RECEBIDA`. Portanto "o aviso de atraso para durante a conferência" ainda não tem o que parar. A régua com escalada depois de 3 dias (Fase 3) deve nascer usando a mesma função, registrada aqui como requisito.

### 4.5 Pontos revisados que **não** mudam

`src/lib/lista-projetos.ts`, `projetos/page.tsx`, `projetos/[id]` (cabeçalho), `meus-projetos/page.tsx`, `clientes/[id]/page.tsx` (todos usam o prazo do **projeto**); `portal/page.tsx` e `portal/[id]/page.tsx` (prazo do projeto e data da tarefa); `src/lib/portal-cliente.ts`; `src/lib/avisos-agrupamento.ts` e `src/lib/agenda-periodo.ts` (usam "hoje" para agrupar avisos e montar o calendário, não prazo de item); `src/lib/semaforo.ts` (limites).

### 4.6 Documentação a atualizar na implementação

`docs/funcionalidades/tarefas.md` (remover a limitação L7 e o trecho "o prazo continua contando", l. 234 e 365), `subtarefas.md`, `notificacoes.md`, `agenda.md`, `area-exclusiva-cliente.md` (só para registrar que o portal não muda), `docs/SRS_Multiplus_Software_v1.0.md` (RF-009), `docs/decisoes-desenvolvimento.md` e `planejamento-diferencas-prototipos.md` (consolidados por quem integra).

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| Uma tela esquecida continua mostrando "Atrasado" para item em conferência | Função única; troca das contas repetidas de `calcularDiasRestantes < 0` (pelo menos oito pontos da seção 4.3); a lista da seção 4 vira o roteiro de revisão | Um teste por ponto da lista |
| Item voltar a contar sem querer (devolução ou retirada não reconhecida) | A pausa é derivada: some assim que o pedido deixa de ser `PENDENTE` | Integração: devolver e retirar voltam ao atraso na hora |
| Perfil enxergar diferente do outro (RLS) | A leitura do pedido segue `solicitacoes_conclusao_select`. Caso-limite: externo que só tem uma subtarefa e vê a tarefa-mãe na lista dele **não** lê o pedido de tarefa de outra pessoa, então a tarefa-mãe dele segue o prazo normal | Integração por perfil (administração, interno do projeto, interno de fora, externo dono, externo alheio) |
| Cliente ganhar dado novo | Nenhuma leitura nova; portal inalterado | Integração: `CLIENTE` continua sem ler pedidos e arquivos; portal inalterado |
| Aviso de prazo enviado a quem já entregou | Fragmento no `whereBase` do job | Integração do job: item em conferência não gera aviso, e volta a gerar após a devolução |
| Fuso: "Enviado em" mostrar o dia errado perto da meia-noite | Formatar o instante `solicitadoEm` em Brasília, não como data civil UTC | Unitário: envio às 22h de Brasília (01h UTC do dia seguinte) mostra o dia local |
| Data do envio falsificada | `solicitadoEm` é `now()` do banco (etapa 1); o cliente não a informa | Já coberto em `comprovantes.integration.test.ts` (a confirmar na implementação) |
| Cliente com atraso aparecer ou sumir errado na lista de clientes | Fragmento nos dois ramos de `idsDeClientesComAtraso` | Integração: só item em conferência = sem atraso; item devolvido = com atraso |
| Regressão nas regras já aprovadas de semáforo | Parâmetro opcional com padrão "sem conferência" | Suíte atual do semáforo e do atraso continua verde sem alteração |

Não se aplicam: upload, links externos, dado sensível novo, e-mail novo, mascaramento. Não há migration, `GRANT` nem política nova na opção A.

## 6. Casos-limite e estados

- **Devolvido:** volta a contar com o prazo original. Se a data do prazo já passou, o item reaparece atrasado, contando desde o prazo (inclui os dias da conferência), com o motivo da devolução como hoje (pergunta 1).
- **Retirado:** o solicitante ou a administração cancela o pedido; volta a contar. Os arquivos continuam presos ao pedido cancelado, e o novo envio precisa de arquivos novos.
- **Concluído no mesmo dia:** envio e confirmação no mesmo dia não mostram a pausa a ninguém, e "Enviado em" é o dia do envio.
- **Enviado depois do prazo vencido:** o item já estava atrasado ao enviar. Pelo protótipo, sai do atraso e mostra "Enviado em dd/mm". Vale a data do envio se confirmado (pergunta 2).
- **Pedido de subtarefa:** pausa só a subtarefa; "N subtarefas atrasadas" na tarefa e o prazo da tarefa-mãe seguem a conta normal (pergunta 3). Pedido da tarefa e de uma subtarefa podem coexistir, cada um pausa o seu item.
- **Pedido sem arquivo** (item que não exige comprovante, caso comum do interno): continua contando. O diálogo "Concluir e enviar para confirmação" do protótipo diz que o prazo para de contar; na implementação esse texto só pode aparecer quando o item exige comprovante (pergunta 4).
- **Administração liga ou desliga "exige comprovante" com pedido pendente:** vale o que foi enviado (arquivos), não a flag.
- **Administração edita o prazo durante a conferência:** o prazo novo vale ao voltar a contar; a pausa não interfere.
- **Item desativado ou de cliente/projeto inativo com pedido pendente:** sai das listas operacionais pela regra atual. Reativado, o pedido continua pendente e a pausa volta junto.
- **Tarefa recorrente:** a próxima ocorrência nasce na confirmação, calculada de `prazo` e `prazoOriginal` da série (`decidirSolicitacaoConclusao` chama `calcularProximaOcorrencia`). Enviar cedo, tarde ou em conferência longa não muda a data da próxima. A agenda continua projetando as ocorrências futuras normalmente.
- **Fim de semana e feriado:** não importam; os dias são corridos (análise de 2026-10-15).
- **Item sem prazo:** nunca conta atraso; em conferência mostra "Enviado em dd/mm" no lugar de "Sem prazo", para a pessoa saber que há um envio aguardando.

## 7. Interface

- **Selo "Enviado em dd/mm":** no lugar do "Atrasado N dias", "Vence hoje", "Amanhã" ou "Em N dias", com a data do prazo ao lado como hoje (`CelulaPrazo`). Tom neutro, só com tokens de `src/app/globals.css` (confirmar com `grep -- "--color-<nome>:"`; a tela do externo já usa `bg-azul-cl text-azul-esc` e a lista usa `bg-papel text-cinza`). Sem hex fixo. O texto é curto para caber a 375 px.
- **Tela do externo** (`tela-externo.tsx`): o cartão do grupo "Aguardando conferência" mostra o selo novo e sai do contador "N atrasadas" e de "vence em breve" do resumo.
- **Agenda:** classe "Em conferência" na legenda, com cor neutra, sem tachar (o tachado é do concluído).
- **Painéis:** "Atrasados", "Vencem em N dias" e "Itens em dia" passam a desconsiderar o item em conferência. O cartão "Aguardando sua confirmação" e o atalho "Conferir comprovantes" ficam como estão.
- **Listas de Tarefas e Subtarefas:** o item em conferência não cai em Atrasados, Vencem em até N dias nem No prazo; aparece em Todos, com o selo novo. O PDF segue a lista.
- Verificar tudo a 375 px e no desktop, sem rolagem horizontal.

## 8. Plano de testes

**Unitários** (`tests/unit/`, sem banco), todos com o dado de conferência ausente repetindo os casos de hoje:

- `prazo-em-conferencia` (novo): pedido pendente com arquivos, pendente sem arquivos, rejeitado, cancelado, aprovado, vários pedidos no histórico.
- `situacao-prazo.unit.test.ts` e `situacao-lista-tarefas.unit.test.ts`: o novo valor, contagens e filtros.
- `agenda-itens.unit.test.ts`: classe `conferencia` e `contarAtrasadosAnteriores`.
- `painel.unit.test.ts` e `lista-meus-projetos.unit.test.ts`: atrasados, "em dia" e "minhas atrasadas".
- `indicador-dias-restantes.unit.test.ts`: o selo, inclusive o fuso (envio às 22h de Brasília).
- `calcularPercentualEmDia`, no teste das regras de projeto e tarefa.
- PDF: `indicadorPrazo` com o item em conferência.

**Integração** (Postgres, role restrita pelo RLS; perfil permitido **e** negado):

- Lista de clientes: `idsDeClientesComAtraso` pela administração e pelo interno (`atraso-aguardando-nao-lido.integration.test.ts` é o ponto de partida).
- Agenda e contagem de atrasados anteriores, administração e interno (`atrasados-anteriores-agenda.integration.test.ts`, `agenda-colaborador.integration.test.ts`).
- Job de avisos: item em conferência não avisa; volta a avisar depois da devolução; pedido sem arquivo continua avisando (`notificacoes-rf022.integration.test.ts`).
- Ciclo completo com arquivos (`comprovantes.integration.test.ts`): enviar, devolver, reenviar, confirmar e retirar, conferindo a situação em cada passo.
- Subtarefa: pausa só nela, tarefa-mãe contando.
- Recorrência: a confirmação cria a próxima ocorrência com a mesma data de antes (`aprovacao-conclusao.integration.test.ts`).
- Visibilidade por perfil: externo dono vê a pausa; externo alheio e `CLIENTE` não leem o pedido; interno de outro projeto não vê o item. `portal-cliente-sprint6.integration.test.ts` continua verde, sem mudança.

**Jornada de navegador** (`tests/browser/comprovantes.spec.ts`): o externo envia o comprovante de um item atrasado, vê "Enviado em dd/mm" e o item sai de "atrasadas"; a administração devolve com motivo e o item volta a "Atrasado"; reenvio e confirmação. A 375 px e no desktop.

**Regressão:** os testes existentes de semáforo, atraso, agenda, painel e portal precisam continuar valendo sem alteração de asserção. A lista de arquivos de teste desta seção vem dos nomes e do tema; o conteúdo de cada um será conferido na implementação.

**Verificação:** `bash scripts/agentes/verificar.sh --completo` na tarefa de implementação.

**Para a tarefa de implementação** (protocolo multiagente): deve reservar `src/ui/**` (`indicador-dias-restantes.tsx`, `lista.tsx`) e `src/lib/projetos-tarefas.ts`, ambos compartilhados. Com a opção A não reserva `prisma/**`. Trocar as contas repetidas pela função única é refatoração dentro do escopo da etapa, e a aprovação desta análise a cobre (pergunta 8).

## 9. Perguntas em aberto

Cada pergunta traz a recomendação. As respostas da cliente de 2026-11-23 cobrem só o que está na seção 1; o resto era **pendente de validação**. Em 2026-11-23 o usuário aprovou todas as recomendações e depois respondeu as dez uma a uma, confirmando todas. A cliente (Talita) confirmou a pergunta 1 em 2026-11-23, informada pelo usuário: o prazo não muda na devolução (opção A).

1. **Devolução: o prazo volta como estava ou ganha os dias da conferência?** O protótipo diz só "o prazo volta a contar". **Recomendação:** a data do prazo não muda (opção A da seção 3, sem coluna nem migration). O risco é uma conferência demorada devolver o item já atrasado; a etapa 3 (pedido de prazo) é a ferramenta para isso. A opção B (prazo restante preservado, com migration, trigger e um `decididoEm` confiável, já que hoje vem do relógio da aplicação) ficou descartada. — **Resposta:** opção A, confirmada pelo usuário e pela cliente em 2026-11-23.
2. **Item enviado depois do prazo vencido** sai do atraso e mostra "Enviado em dd/mm", como no protótipo? **Recomendação:** sim. Se confirmado, vale a data do envio; sem coluna nova (derivada de `solicitadoEm`). — **Resposta:** confirmada pelo usuário, uma a uma, em 2026-11-23.
3. **A pausa vale só para o item que recebeu o pedido?** **Recomendação:** sim. O pedido da subtarefa não pausa a tarefa-mãe. — **Resposta:** confirmada pelo usuário, uma a uma, em 2026-11-23.
4. **Colaborador interno concluindo item que não exige comprovante:** o prazo continua contando, e o diálogo "Concluir e enviar para confirmação" não pode dizer que ele para? **Recomendação:** sim, porque a cliente disse que a regra do interno é a mesma e hoje só item que exige comprovante aceita arquivo. Pedir a confirmação de que ela entendeu assim, pois o protótipo do interno escreve a pausa como regra geral do envio. — **Resposta:** confirmada pelo usuário, uma a uma, em 2026-11-23.
5. **Telas e contagens:** item em conferência sai de "Atrasados" e "Vencem em N dias", conta como em dia nos percentuais e **não ganha botão de filtro novo**? **Recomendação:** sim; aparece só em "Todos", com o selo. — **Resposta:** confirmada pelo usuário, uma a uma, em 2026-11-23.
6. **Avisos:** o aviso de véspera para durante a conferência e volta na devolução, e a futura escalada de atraso de 3 dias (Fase 3) usa a mesma função? **Recomendação:** sim. O job cobre só tarefas, não subtarefas, e o evento de "prazo vencido" não existe; ambos ficam fora desta etapa e registrados como dependência da Fase 3. — **Resposta:** confirmada pelo usuário, uma a uma, em 2026-11-23.
7. **Data de conclusão gravada:** adiar para quando o portal precisar do "Feito nos últimos 30 dias"? **Recomendação:** sim, sem coluna agora. — **Resposta:** confirmada pelo usuário, uma a uma, em 2026-11-23.
8. **Refatoração:** aprova trocar as contas repetidas de `calcularDiasRestantes < 0` (seção 4.3) pela função única na própria tarefa de implementação? **Recomendação:** sim, é o que impede a regra de divergir entre telas. — **Resposta:** confirmada pelo usuário, uma a uma, em 2026-11-23.
9. **Portal do cliente:** nada muda agora (seção 2); quando o anel de "obrigações em dia" for feito, usa uma função booleana `SECURITY DEFINER`, sem abrir leitura de pedidos. **Recomendação:** registrar como requisito da análise do portal. — **Resposta:** confirmada pelo usuário, uma a uma, em 2026-11-23.
10. **Ordem das tarefas:** fazer a etapa 2 (sem migration) antes do status "A iniciar" da subtarefa? O planejamento sugere planejar as duas juntas. **Recomendação:** etapa 2 primeiro, numa só tarefa que inclui a pausa do interno; "A iniciar" depois, reaproveitando a função única, já que ele altera os filtros por `status === EM_ANDAMENTO` (por exemplo em `idsDeClientesComAtraso` e `contarMinhasPendencias`). — **Resposta:** confirmada pelo usuário, uma a uma, em 2026-11-23.

### Recomendação geral

Aprovar a opção A (derivar do pedido, sem migration nem RLS) com as recomendações acima. A implementação entra numa tarefa só, com a função única, o parâmetro opcional em todas as regras existentes e um teste por ponto da seção 4. O ponto mais delicado, e o único que pode exigir migration depois, é a pergunta 1.
