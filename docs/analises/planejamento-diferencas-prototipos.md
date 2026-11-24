# Planejamento: diferenças restantes entre os protótipos e o sistema

- **Data:** 2026-11-17
- **Status:** em andamento (atualizado em 2026-11-23). Os itens marcados "Feito" já foram implementados; o resto segue como proposta.
- **Origem:** lista de diferenças que sobraram depois da migração visual de `telas-novas/` e da etapa 1 dos comprovantes ([interface](../funcionalidades/interface.md), [mapeamento](../mapeamento-telas-talita.md)).
- **Aviso:** a classificação de cada item é leitura da documentação e do schema, não de cada tela. Antes de começar um item, a análise dele confirma o que existe no código.

## 1. Como organizar

Cada item entra em uma de quatro classes, que decidem o caminho dele:

| Classe | O que é | Caminho |
|---|---|---|
| **A** | Só muda a tela ou usa consultas e dados que já existem. Sem permissão nova. | Implementar direto, com teste, e registrar em `docs/funcionalidades/`. |
| **B** | Precisa de coluna, tabela ou migration nova, mas sem mudar quem vê o quê. | Análise curta em `docs/analises/`, aprovação, depois o fluxo de 8 passos. |
| **C** | Muda permissão, RLS, regra de prazo ou de aprovação. | Análise completa, aprovação do usuário antes de qualquer código, testes de RLS por perfil. |
| **D** | Depende de resposta ou decisão de produto da Talita. | Perguntar primeiro; depois cai em B ou C. |

Regras que valem para todas as fases (AGENTS.md): trabalhar na `staging`, um commit por tema, `typecheck`, `lint` e testes do módulo antes do push, atualizar a documentação do módulo no mesmo commit, e nada de campo criado só porque aparece no protótipo (os números do protótipo são ilustrativos).

## 2. Classificação dos itens

### Administradora

| Item | Classe | Observação |
|---|---|---|
| "Próxima ocorrência" da tarefa | **Feito em 18/11/2026** | Derivável da recorrência; a agenda já calcula a próxima ocorrência. |
| Texto de "Atribuição pendente" no cabeçalho | **Já existia** | O aviso aparece na tarefa; o protótipo não traz mais nada com esse nome. |
| Coluna de etiquetas nas subtarefas | **Feito em 18/11/2026** | Consulta com junção; conferir custo da consulta. |
| Texto do responsável com o papel dele | **Feito em 18/11/2026** | Consulta. |
| PDF de tarefas e subtarefas ignora o filtro de situação | **Feito em 18/11/2026** | Correção: a lista já tem `lista-tarefas.ts` compartilhado com o PDF. |
| Agenda: filtro por responsável | **Feito em 18/11/2026** | Mesmo padrão dos filtros de tarefas. |
| Agenda: Exportar PDF | **Feito em 18/11/2026** | Já existe infraestrutura de PDF (`pdfkit`). |
| Exportar PDF do projeto | **Feito em 18/11/2026** | Sem valor contratado no PDF, como na lista. |
| "Quem acessa este projeto" | **Feito em 18/11/2026** (só administração) | Lê atribuições e pessoas envolvidas. Se for aberto a outro perfil, vira C. |
| Avisos: contexto de cada aviso e ações diretas | B | Precisa guardar o alvo da ação no aviso; verificar o que `Notificacao` já guarda. |
| Faixa de atrasados de meses anteriores (é da agenda, não dos avisos) | **Feito em 23/11/2026** | Na agenda da administração e na do interno; "Ver atrasados" abre a lista. |
| Cobrar responsável | C | Cria aviso manual para outra pessoa: limite de uso, quem pode cobrar quem, registro. |
| Histórico automático junto dos comentários | B | Registrar eventos (mudou status, prazo, responsável). Conferir se já há tabela de auditoria aproveitável. |
| Duplicar projeto | **Feito em 23/11/2026** | Só a administração. Cria "Cópia de <nome>" no mesmo cliente, com as tarefas e subtarefas ativas em estado inicial, sem datas, responsáveis, recorrência, comprovantes enviados, pedidos, comentários, documentos, valor nem proposta. A numeração vem dos gatilhos existentes e não há migration nem aviso. A subtarefa nasce "Em andamento" até a Fase 7. |
| Usuários: "Último acesso" | **Feito em 18/11/2026** | Gravado no login, visível só à administração ([análise](ultimo-acesso-e-cadastro-incompleto.md)). A data é a do login, não a do último uso. |
| Usuários: lista única de clientes e externos e filtro por empresa | **Já existia** (16/11/2026) | A lista mostra clientes e externos, com coluna Empresa e filtro por empresa. Falta só escolher a empresa antes do perfil no cadastro (B/D). |
| Clientes: filtro "Cadastro incompleto" | **Feito em 18/11/2026** | Sem segmento ou sem cidade, como no protótipo. |
| Configurações: régua de avisos, escalonamento, resumo mensal | B/C | Mexe no agendador e nas notificações. Fase própria. |

### Colaborador interno

| Item | Classe | Observação |
|---|---|---|
| Subtarefas dentro da lista de tarefas | **Feito em 23/11/2026** | Consulta; RLS já limita ao escopo. |
| Filtro "Só subtarefas" | **Feito em 23/11/2026** | Depende do item anterior. |
| Contagem de "minhas pendências" por pessoa em Meus projetos | **Feito em 23/11/2026** | Conferir que não expõe dado de quem o interno não vê. |
| Comentários no nível da tarefa | B | Hoje os comentários ficam no projeto; conferir o modelo. |
| Abas "Minhas / Da equipe" | C | "Da equipe" mostra trabalho de outras pessoas: define escopo de leitura e RLS. |
| "Concluir" na linha | **Feito em 23/11/2026** | O protótipo não pede conclusão direta: o botão da linha é "Concluir e enviar para confirmação", e a administração continua confirmando (regra de 22/10/2026). É o atalho para o pedido que já existe; com comprovante exigido, leva ao envio. |
| "Exportar PDF" para o colaborador | C | Precisa garantir mascaramento e escopo. |
| "Novo" com mais opções | C | Depende do que o interno pode criar. |

### Colaborador externo (etapas dos comprovantes)

| Item | Classe | Observação |
|---|---|---|
| Parar o prazo durante a conferência e pausa de prazo | **Feito em 23/11/2026** | Etapa 2 ([análise](comprovantes-etapa2-prazo.md)): o item com pedido pendente com comprovantes sai de atraso, de "vence em breve" e dos avisos e mostra "Enviado em dd/mm". A pausa do interno é a mesma regra (só vale com comprovante). Derivada do pedido, sem migration nem RLS nova; o portal não muda. |
| Pedido de prazo e impedimento | C | Etapa 3: quem decide, o que acontece com o prazo. |
| Mensagens, página de Instruções, foto de exemplo | B/C | Etapa 4: mensagens restritas exigem análise de permissão. |

### Cliente (portal)

| Item | Classe | Observação |
|---|---|---|
| Filtro "Em andamento / Concluídos" na lista de projetos | **Feito em 18/11/2026** | Filtro por status que o portal já entrega. |
| Trilha de etapas e atualizações da Múltiplus | B/D | Precisa de etapas nomeadas e de comentários liberados ao cliente; definir com a Talita. |
| Unidades do cliente e seletor de unidade | B/D | Modelo novo; `Unidade de trabalho` hoje é outra coisa (vínculo de recorrência). |
| Drive do cliente | B/D | Link ou integração; definir. |
| Relatórios e "Gerar relatório" (PDF, histórico) | B/C | Dependem de unidades e do que o cliente pode ver. Nunca expor comentário interno nem valor. |
| "Ver como cliente" | C | Representação de usuário: risco de segurança alto; precisa de análise própria e registro. |

### Todos os perfis

| Item | Classe | Observação |
|---|---|---|
| Telefone editável pelo próprio usuário | C | `Usuario.telefone` já existe; falta permitir a edição pelo dono. Segue a análise de formatação de telefone e o mascaramento. |
| Tabela "Avisos que você recebe" | B/C | Preferências individuais por tipo e canal; hoje as preferências são por perfil. |
| Status "A iniciar" de subtarefa | C | Muda o enum, o progresso, o semáforo e os testes. `StatusSubtarefa` hoje tem só Em andamento, Concluído e Cancelado. Ao entrar, revisar a cópia de projeto (a subtarefa copiada passa a nascer "A iniciar"), `solicitar_conclusao` (só aceita subtarefa `EM_ANDAMENTO`), `idsDeClientesComAtraso` e `contarMinhasPendencias`. |

## 3. Fases propostas

Ordem pensada para entregar valor sem decisão primeiro, deixar as regras de prazo juntas e adiar o que depende da Talita.

### Fase 0: decisões (em paralelo, sem código)
- Cobrar as respostas pendentes da Talita sobre os comprovantes (perguntas 1, 2, 4, 5 e 6 da [análise](comprovantes-colaborador-externo.md)).
- Levar à Talita as perguntas novas da seção 4.
- Entregável: análise dos comprovantes atualizada e uma lista de decisões por item da classe D.

### Fase 1: acabamentos de classe A (sem decisão nova)
**Andamento (23/11/2026): Fase 1 concluída.** Em 18/11 saíram os itens da administração e do portal; em 23/11, a faixa de atrasados de meses anteriores (que é da agenda), as subtarefas na lista do interno com "Só subtarefas", o "Concluir" na linha e as minhas pendências em Meus projetos. A próxima fase é a 2, que começa pela análise da etapa 2 dos comprovantes.

Itens: "Próxima ocorrência", "Atribuição pendente", etiquetas e papel do responsável, correção do filtro no PDF, filtro por responsável e PDF na agenda, PDF do projeto, "Quem acessa" (só administração), faixa de atrasados de meses anteriores, subtarefas na lista de tarefas do interno com "Só subtarefas", contagem de pendências por pessoa, filtro Em andamento/Concluídos do portal.
- Separar em 3 ou 4 commits por tela (tarefa, listas, agenda e PDFs, interno, portal).
- Cada commit leva teste e a atualização de `docs/funcionalidades/`.
- Estimativa: a fase mais rápida; cada tela é pequena.

### Fase 2: regras de prazo e comprovantes (etapas 2, 3 e 4)
**Andamento (23/11/2026): etapa 2 concluída.** A análise foi aprovada no mesmo dia, com a devolução mantendo o prazo original (confirmada pela Talita), e a implementação saiu sem migration, com a função única `src/lib/prazo-em-conferencia.ts` ([tarefa](../tarefas/etapa2-prazo.md)). Faltam as etapas 3 (pedido de prazo e impedimento) e 4 (Instruções, foto de exemplo e mensagens). **Pendência da etapa 2:** quem lê o pedido mas não lê os arquivos (novo responsável depois de reatribuição, segundo externo atribuído, interno responsável sem atribuição ao projeto) ainda vê o item em conferência como atrasado. Decidido em 23/11/2026 que deve ver a pausa; a correção é a tarefa [pausa-prazo-visibilidade](../tarefas/pausa-prazo-visibilidade.md), com [análise aprovada](pausa-prazo-visibilidade-pedido.md) (coluna no pedido, migration).

**Etapa 3 (24/11/2026): concluída.** Pedido de prazo e impedimento, com a tabela `pedidos_prazo` escrita só por funções, o interno atribuído ao projeto decidindo por caminho delegado limitado ao campo `prazo` e nenhuma regra de prazo reescrita ([análise](comprovantes-etapa3-pedido-prazo-impedimento.md), [tarefa](../tarefas/etapa3-pedido-prazo.md), [revisão cruzada](../tarefas/revisao-etapa3-pedido-prazo.md)). O efeito automático do impedimento aceito ficou fora, a pedido futuro da Talita. Para a etapa 3 funcionar em recorrência mensal, foi corrigida antes a conta de `calcularProximaOcorrencia` (um prazo prorrogado para outro mês pulava um ciclo). **Pendências abertas pela revisão:** (1) as subtarefas copiadas para a próxima ocorrência de uma tarefa prorrogada saem com a data deslocada, porque `concluir_tarefa` mede a distância pelo prazo vigente e não pela data da série (regra de prazo; tarefa à parte); (2) a administração também pode retirar o pedido do externo, o que a análise reservava ao autor; (3) a aprovação é permitida com o item em conferência. Os três aguardam decisão do usuário (recomendações no relatório da revisão). Falta a etapa 4.

Itens: parar o prazo durante a conferência, pausa de prazo, pedido de prazo e impedimento, Instruções, foto de exemplo e mensagens.
- Segue a ordem já definida na análise dos comprovantes: etapa 2 (com análise própria da regra de prazo), depois 3 e 4.
- Depende das respostas da Fase 0.
- Risco principal: a etapa 2 atravessa semáforo, atrasos, agenda, portal e avisos; os testes existentes de semáforo e de atraso precisam continuar valendo.

### Fase 3: permissões do colaborador interno
Itens: abas "Minhas / Da equipe", Exportar PDF do colaborador, "Novo" com mais opções, "Concluir" na linha (atalho para o pedido de conclusão, sem mudar a regra de aprovação), comentários no nível da tarefa.
- Uma análise de permissão para o conjunto, com a tabela de quem vê e faz o quê, como em `restricao-externo-e-agenda-interno.md`.
- Testes de RLS para o perfil permitido e o negado.

### Fase 4: administração (dado novo)
Itens: histórico automático, cobrar responsável, avisos com contexto e ações diretas, duplicar projeto e escolha da empresa antes do perfil no cadastro de usuário. ("Cadastro incompleto" e "Último acesso" foram feitos em 18/11/2026, e "Duplicar projeto" em 23/11/2026.)
- Começar pelo histórico automático, porque avisos com contexto e outros itens podem reaproveitá-lo.
- Usuários com empresa exige modelo definido antes (classe D).

### Fase 5: portal do cliente
Itens: unidades e seletor, Drive, trilha de etapas e atualizações, Relatórios e "Gerar relatório", "Ver como cliente".
- Maior fase e a que mais depende da Talita. Fazer uma análise única do portal, com a regra de o cliente nunca ver comentário interno, valor nem comprovante.
- "Ver como cliente" fica por último e com análise de segurança própria.

### Fase 6: avisos e preferências
Itens: régua de avisos, escalonamento, resumo mensal, "Avisos que você recebe" e telefone editável.
- Mexe no agendador de avisos e nas notificações em tempo real. Reaproveitar as análises `agendador-avisos-prazo` e `controle-total-notificacoes`.

### Fase 7: status "A iniciar" de subtarefa
Item isolado porque muda o enum e vários cálculos (progresso, semáforo, painéis). A Talita confirmou que precisa (23/11/2026). A etapa 2 já foi feita, então esta fase reaproveita a função única de prazo e revisa a cópia de projeto (a subtarefa copiada nasce "Em andamento" até aqui).

## 4. Perguntas para a Talita

1. ~~**Último acesso**~~ — decidido e feito em 18/11/2026 (você).
2. ~~**Cadastro incompleto**~~ — decidido e feito em 18/11/2026: sem segmento ou sem cidade.
3. ~~**Duplicar projeto**~~ — respondido em 2026-11-23: copia as tarefas e as subtarefas com status "A iniciar", sem datas e sem comprovantes enviados.
4. ~~**Colaborador "Da equipe"**~~ — respondido em 2026-11-23: sim, como no protótipo `colaborador-interno/02-minhas-tarefas` (aba com tudo o que está aberto nos projetos dele, só leitura, com "Conferir" nos comprovantes de externos e "Cobrar" no externo atrasado). **Muda permissão de leitura: precisa de análise aprovada antes do código (Fase 3).**
5. ~~**Concluir direto**~~ — o protótipo já responde: o interno continua enviando para confirmação.
6. ~~**Unidades do cliente**~~ — respondido em 2026-11-23: **unidade é o CNPJ** e **cada projeto pertence a um CNPJ** do cliente. Hoje o cliente tem um único CNPJ ou CPF, então isto pede dado novo (CNPJs do cliente e o vínculo do projeto) e análise antes do código (Fase 5).
7. ~~**Drive**~~ — respondido em 2026-11-23: o link da pasta fica na ficha do cliente, preenchido pela administração, e aparece no portal.
8. ~~**Trilha de etapas**~~ — respondido em 2026-11-23: as etapas são as tarefas do projeto, na ordem; projeto com mais de 6 tarefas mostra "X de Y entregas concluídas"; o cliente só vê comentários marcados "Visível ao cliente".
9. ~~**Relatórios**~~ — respondido em 2026-11-23: período (mês atual, mês anterior, trimestre ou ano), unidade e as 5 seções do protótipo; **o resumo mensal por e-mail entra agora** (1º dia útil, com histórico), e não depois.
10. ~~**Régua de avisos e escalonamento**~~ — respondido em 2026-11-23: **a administração recebe a escalada**; o escalonamento ao cliente fica desligado por padrão. A escalada acontece **depois de 3 dias de atraso** (recomendação aceita em 2026-11-23; o protótipo repete o aviso de atraso a cada 3 dias).
11. ~~**Subtarefa "A iniciar"**~~ — respondido em 2026-11-23: incluir o status.

### Respostas de 2026-11-23 aos comprovantes

- **O prazo para de contar durante a conferência:** sim, só quando o pedido tem comprovante (etapa 2).
- **Guarda das fotos:** sempre; não há limpeza automática. Falta definir backup e espaço em disco (ver [pendências antes da produção](../pendencias-antes-producao.md)).
- **Pedido de prazo e impedimento:** decide o coordenador do item, a administração ou o interno do projeto (etapa 3).
- **Regras já implementadas da etapa 1:** confirmadas em 2026-11-23 (tipos de arquivo, até 20 arquivos de 10 MB por envio e devolução com motivo obrigatório).
- **Devolução na etapa 2:** o prazo volta com a data original, sem somar os dias da conferência (confirmado pela Talita em 2026-11-23, [análise](comprovantes-etapa2-prazo.md)).

## 5. Riscos e dependências

- **Prazo:** a etapa 2 (inclusive a pausa do interno) foi feita em 23/11/2026, com a função única `src/lib/prazo-em-conferencia.ts`. O "A iniciar" da subtarefa e a régua de avisos da Fase 6 devem reaproveitá-la: o job de prazo hoje cobre só tarefas e não existe aviso de "prazo vencido".
- **RLS:** todo item que amplia leitura (Da equipe, Quem acessa, Relatórios) exige testar o perfil negado. Itens de portal têm risco de vazar dado interno.
- **Migrations:** o timestamp de cada migration nova precisa ser posterior à última da `origin/staging`; migration publicada é imutável.
- **Dependência de respostas:** as Fases 2, 4, 5 e 6 só andam depois da Fase 0.
- **Ordem sugerida:** 0 e 1 em paralelo; depois 2; depois 3 e 4; por último 5, 6 e 7.
