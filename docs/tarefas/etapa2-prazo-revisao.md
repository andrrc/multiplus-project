# REVISÃO da tarefa etapa2-prazo — Pausa do prazo durante a conferência

> Revisão cruzada conforme a [seção 9 do protocolo](../colaboracao-multiagente.md#9-revisão-cruzada). O relatório está na branch local do revisor, `codex/revisao-etapa2-prazo`.

| Campo | Valor |
|---|---|
| **Tarefa** | [etapa2-prazo](etapa2-prazo.md) |
| **Branch revisada** | `origin/claude/etapa2-prazo`, commit `a840724` |
| **Revisor** | Codex |
| **Data** | 2026-11-23 |
| **Veredito** | **Pedir mudanças**. Meus projetos e duas exportações ainda sinalizam tarefas em conferência como atrasadas. |

## 1. O que foi conferido

- [x] Escopo. Conferi `git diff --stat origin/staging...a840724` e o recorte após a aprovação da tarefa. As alterações em `src/ui/**` e `src/lib/projetos-tarefas.ts` têm reserva. Os commits da análise vieram da base declarada na tarefa. A jornada ficou em `comprovantes-prazo.spec.ts`.
- [x] Arquitetura, nomenclatura e código. O módulo `prazo-em-conferencia.ts` concentra a derivação do estado e os fragmentos Prisma. As superfícies recebem o instante de envio. Algumas ainda repetem o teste de pausa antes de calcular dias e três descartam um dado de pausa que a consulta já entrega.
- [x] Segurança. O diff preserva as migrations, as políticas, as ações de conclusão e as consultas do portal. O portal usa sua própria seleção de campos, sem pedidos, arquivos ou data de envio. As ações de envio, decisão e retirada mantêm suas verificações de perfil no servidor e no banco. Há um teste de leitura negada com um usuário `CLIENTE` real do próprio projeto. A diferença entre a visibilidade de um pedido e a de seus arquivos tem efeito no cálculo para alguns colaboradores, conforme o achado 4.
- [x] Regra aprovada. Pedido pendente com pelo menos um arquivo pausa o item associado. Pedido sem arquivo, aprovado, devolvido ou retirado deixa de alimentar a pausa. O cálculo reutiliza o prazo cadastrado. A consulta separa tarefa e subtarefa. Alterar a exigência de comprovante não muda por si só o resultado. Revisei também a data de envio em Brasília, a recorrência, o futuro uso no portal e as dependências da Fase 6.
- [x] Superfícies e componentes. Busquei `situacaoDoPrazo`, `calcularDiasRestantes`, `estaAtrasada`, `prazo`, `atrasad`, `IndicadorSemaforoProjeto` e `CelulaPrazo`. Conferi listas e detalhes, painel administrativo e interno, agenda, PDFs, clientes com atraso e job de avisos. `CelulaPrazo` encaminha a nova propriedade. O selo dá precedência a desativado, concluído e cancelado. Os selos de prazo do próprio projeto seguem o contrato anterior. Os percentuais contam o item em conferência como em dia, conforme a resposta 5. As listas de atraso e de próximos vencimentos o excluem.
- [x] Contratos e integrações. `idsDeClientesComAtraso` aplica o filtro a tarefas e subtarefas. As duas agendas excluem a conferência do contador de meses anteriores. O job aplica o filtro ao agregado e à seleção de tarefas e o teste confere a retomada após devolução. A lacuna anterior de avisos de subtarefa e de prazo vencido permanece fora do escopo.
- [x] Testes. Os unitários cobrem estados do pedido, filtros, percentuais, agenda, painéis, contagens e selo, incluindo data civil de Brasília e item sem prazo. A integração cobre administração, interno do projeto, externo autor, cliente negado, agenda e avisos. A jornada valida o selo e os totais do externo antes e depois da devolução pelo interno. As lacunas estão na seção 2. O diff preserva as asserções anteriores e não introduz `skip`, `only` ou `todo`.
- [x] Complexidade e dependências. Nenhuma dependência foi acrescentada. Há duplicação da regra de disponibilidade do prazo em algumas telas.
- [x] Verificações. Rodei `bash scripts/agentes/verificar.sh --completo` no worktree de revisão, com PostgreSQL local na porta 5434. A checagem de arquivos sensíveis, o typecheck e o lint passaram. **52 arquivos e 381 testes unitários, 43 arquivos e 350 testes de integração e smoke, e 8 jornadas de navegador passaram.** O Playwright passou na repetição automática. O script terminou com código 0.
- [ ] Conferência visual em 375 px e desktop, a cargo do usuário.

## 2. Achados

Os achados de implementação abaixo vêm da leitura dos caminhos de produção e de suas chamadas. A suíte foi executada no commit revisado.

| # | Severidade | Arquivo:linha | O que está errado | Cenário em que falha | Sugestão |
|---|---|---|---|---|---|
| 1 | Alta | `src/app/(painel)/meus-projetos/page.tsx:57` e `:95` | O cartão “Próxima entrega” pode selecionar um prazo pausado e chama o semáforo sem `emConferenciaDesde`, embora `listarProjetosAtribuidos` já forneça o campo. | O interno abre Meus projetos. A tarefa mais antiga tem comprovante pendente. O cartão a mostra como próxima entrega e “Atrasado N dias”, ainda que “Minhas atrasadas” já a desconsidere. | Excluir itens em conferência da escolha da próxima entrega e ajustar o texto vazio quando houver tarefas abertas sem prazo correndo. Cobrir com um cartão que tenha uma tarefa em conferência e outra com prazo ativo. |
| 2 | Alta | `src/lib/exportacao-pdf-tarefas.ts:488` e `:537` | As exportações do detalhe do projeto e da agenda não encaminham `emConferenciaDesde` a `indicadorPrazo`. Os PDFs das listas de tarefas e subtarefas encaminham o dado. | A administração exporta um projeto ou o mês da agenda com uma tarefa vencida em conferência. O PDF imprime “Atrasado N dias” enquanto a interface sinaliza a conferência. Um prazo futuro também pode aparecer como vencimento próximo. | Encaminhar o campo nas duas chamadas, mantendo a apresentação própria de ocorrências projetadas. Verificar o texto nas exportações geradas. |
| 3 | Média | `src/app/(painel)/agenda/visao-agenda.tsx:92` e `:149` | A agenda classifica e colore o item como conferência. O item exibe só “Em conferência” na lista e no painel do dia. A data que aparece é a do prazo. | Na agenda, quem vê a tarefa em conferência precisa abrir o detalhe para encontrar o dia do envio, embora o critério de aceite inclua “Enviado em dd/mm”. | Usar `rotuloEnviadoEm(emConferenciaDesde)` na descrição do item da agenda e preservar “Em conferência” na legenda. |
| 4 | Média | `src/lib/projetos-tarefas.ts:659`, `:723` e `prisma/migrations/20261117120000_comprovantes_etapa1/migration.sql:215`, `:252` | A pausa no contexto do colaborador depende da visibilidade simultânea do pedido e dos arquivos. A política do pedido pode permitir a leitura ao responsável atual enquanto a dos arquivos continua restrita ao autor, à administração e ao interno atribuído ao projeto. É um caso distinto do externo que vê a tarefa-mãe sem acesso ao pedido. | Se a administração trocar o responsável de uma tarefa com envio pendente por outro externo, a consulta do novo responsável pode ver o pedido com contagem zero e voltar a mostrar atraso para ele. A administração ainda vê a pausa. | Fixar o comportamento esperado num teste de integração de reatribuição. Se o novo responsável deve ver a pausa, alinhar a derivação às permissões aprovadas sem ampliar a leitura do arquivo. Validar qualquer mudança de política antes de implementar. |
| 5 | Média | `tests/integration/busca-e-exportacao-projetos.integration.test.ts:117`, `:129` e `src/lib/exportacao-pdf-tarefas.ts:128` | A suíte valida a geração do arquivo. Falta verificar o texto do prazo em conferência. A função de linha privada não impede um teste pelo exportador. | Um PDF válido com texto de atraso indevido passa nas verificações atuais. | Testar o texto “Enviado em dd/mm” e a ausência de atraso em PDFs de tarefa, subtarefa, projeto e agenda. |
| 6 | Média | `tests/browser/comprovantes-prazo.spec.ts:52` e `:68` e `tests/integration/prazo-em-conferencia.integration.test.ts:62`, `:119` | A jornada semeia o pedido e o arquivo diretamente no banco. A integração da etapa 2 também usa esse atalho para a criação. Testes anteriores cobrem operações da etapa 1. Falta afirmar a pausa durante todo o ciclo real de envio, devolução, reenvio e confirmação. O caso de retirada usa prazo futuro e só verifica ausência da pausa. | Uma regressão na ligação dos arquivos ao pedido ou na retomada do prazo vencido após retirada pode passar nas novas verificações. | Exercitar `solicitarConclusao` com anexos registrados e afirmar a situação e a data do prazo em cada transição. Acrescentar asserções de prazo à jornada existente de `comprovantes.spec.ts:64`, que já parte de rascunhos preparados e envia pela interface. |
| 7 | Baixa | `src/app/(painel)/painel/painel-interno.tsx:38`, `src/app/(painel)/projetos/[id]/page.tsx:48` e `src/app/(painel)/tarefas/[id]/page.tsx:67` | A detecção do pedido está centralizada. A decisão de calcular dias e usar o resultado como atraso ou vencimento ainda se repete. | Ao mudar essa decisão, cada tela pode evoluir em ritmo diferente, como já ocorreu na passagem do dado para os PDFs. | Reaproveitar uma regra comum de dias de prazo aplicáveis ou de situação, mantendo a escolha dos grupos por tela. |

## 3. O que está bom

- O instante do envio deriva de `solicitadoEm` do banco. O teste de fuso verifica a diferença entre o dia em Brasília e em UTC.
- A pausa é derivada do pedido pendente e dos arquivos, com um filtro compartilhado nas consultas de atraso e avisos. Devolução e retirada dispensam recálculo ou gravação do prazo.
- O teste do job comprova ausência do aviso durante a conferência, retomada após devolução e envio normal quando o pedido está sem arquivo.
- O teste da agenda confirma a exclusão do atraso anterior para administração e interno. A integração também verifica a independência entre a tarefa-mãe e a subtarefa.
- O portal continua com consultas próprias e a cobertura de leitura negada inclui um cliente do projeto com pedido e arquivo existentes.

## 4. Falhas preexistentes encontradas

O servidor do Next interrompeu a primeira inicialização do navegador com o aviso de segurança já registrado na seção 10 do protocolo. O próprio script repetiu o Playwright e as oito jornadas passaram. O ambiente também registrou ausência de configuração do Resend, sem falha de teste. Não executei uma suíte separada em `origin/staging`.

## 5. Perguntas para a pessoa responsável

- Na reatribuição durante a conferência, o novo responsável que já consegue ver o pedido deve ver também a pausa? A resposta orienta o tratamento do achado 4 sem mudar o acesso aos arquivos por padrão.
