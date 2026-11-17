# Planejamento: diferenças restantes entre os protótipos e o sistema

- **Data:** 2026-11-17
- **Status:** proposta para aprovação. Nada aqui foi implementado.
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
| "Próxima ocorrência" da tarefa | A | Derivável da recorrência; a agenda já calcula a próxima ocorrência. |
| Texto de "Atribuição pendente" no cabeçalho | A | Derivado das atribuições existentes. |
| Coluna de etiquetas nas subtarefas | A | Consulta com junção; conferir custo da consulta. |
| Texto do responsável com o papel dele | A | Consulta. |
| PDF de tarefas e subtarefas ignora o filtro de situação | A | Correção: a lista já tem `lista-tarefas.ts` compartilhado com o PDF. |
| Agenda: filtro por responsável | A | Mesmo padrão dos filtros de tarefas. |
| Agenda: Exportar PDF | A | Já existe infraestrutura de PDF (`pdfkit`). |
| Exportar PDF do projeto | A | Sem valor contratado no PDF, como na lista. |
| "Quem acessa este projeto" | A (só administração) | Lê atribuições e pessoas envolvidas. Se for aberto a outro perfil, vira C. |
| Avisos: contexto de cada aviso e ações diretas | B | Precisa guardar o alvo da ação no aviso; verificar o que `Notificacao` já guarda. |
| Avisos: faixa de atrasados de meses anteriores | A | Consulta sobre prazos já existentes. |
| Cobrar responsável | C | Cria aviso manual para outra pessoa: limite de uso, quem pode cobrar quem, registro. |
| Histórico automático junto dos comentários | B | Registrar eventos (mudou status, prazo, responsável). Conferir se já há tabela de auditoria aproveitável. |
| Duplicar projeto | B/D | Definir o que copia (tarefas, subtarefas, comprovantes, datas) e como ficam os IDs hierárquicos. |
| Usuários: "Último acesso" | D | Exige registrar login (LGPD). A decisão anterior foi não criar; só refazer se a Talita pedir. |
| Usuários: lista única de clientes e externos, filtro e escolha de empresa | B/D | `Usuario` não tem vínculo com empresa; definir o modelo antes. |
| Clientes: filtro "Cadastro incompleto" | D | Falta definir quais campos tornam um cadastro incompleto; depois é A. |
| Configurações: régua de avisos, escalonamento, resumo mensal | B/C | Mexe no agendador e nas notificações. Fase própria. |

### Colaborador interno

| Item | Classe | Observação |
|---|---|---|
| Subtarefas dentro da lista de tarefas | A | Consulta; RLS já limita ao escopo. |
| Filtro "Só subtarefas" | A | Depende do item anterior. |
| Contagem de "minhas pendências" por pessoa em Meus projetos | A | Conferir que não expõe dado de quem o interno não vê. |
| Comentários no nível da tarefa | B | Hoje os comentários ficam no projeto; conferir o modelo. |
| Abas "Minhas / Da equipe" | C | "Da equipe" mostra trabalho de outras pessoas: define escopo de leitura e RLS. |
| "Concluir" direto na linha | C | O interno pede a conclusão e a administração confirma (regra de 22/10/2026). Só vale se a regra mudar. |
| "Exportar PDF" para o colaborador | C | Precisa garantir mascaramento e escopo. |
| "Novo" com mais opções | C | Depende do que o interno pode criar. |

### Colaborador externo (etapas dos comprovantes)

| Item | Classe | Observação |
|---|---|---|
| Parar o prazo durante a conferência e pausa de prazo | C | Etapa 2: mexe em semáforo, atrasos, agenda, portal e avisos. A pausa de prazo do interno entra junto, porque é a mesma regra. |
| Pedido de prazo e impedimento | C | Etapa 3: quem decide, o que acontece com o prazo. |
| Mensagens, página de Instruções, foto de exemplo | B/C | Etapa 4: mensagens restritas exigem análise de permissão. |

### Cliente (portal)

| Item | Classe | Observação |
|---|---|---|
| Filtro "Em andamento / Concluídos" na lista de projetos | A | Filtro por status que o portal já entrega. |
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
| Status "A iniciar" de subtarefa | C | Muda o enum, o progresso, o semáforo e os testes. `StatusSubtarefa` hoje tem só Em andamento, Concluído e Cancelado. |

## 3. Fases propostas

Ordem pensada para entregar valor sem decisão primeiro, deixar as regras de prazo juntas e adiar o que depende da Talita.

### Fase 0: decisões (em paralelo, sem código)
- Cobrar as respostas pendentes da Talita sobre os comprovantes (perguntas 1, 2, 4, 5 e 6 da [análise](comprovantes-colaborador-externo.md)).
- Levar à Talita as perguntas novas da seção 4.
- Entregável: análise dos comprovantes atualizada e uma lista de decisões por item da classe D.

### Fase 1: acabamentos de classe A (sem decisão nova)
Itens: "Próxima ocorrência", "Atribuição pendente", etiquetas e papel do responsável, correção do filtro no PDF, filtro por responsável e PDF na agenda, PDF do projeto, "Quem acessa" (só administração), faixa de atrasados de meses anteriores, subtarefas na lista de tarefas do interno com "Só subtarefas", contagem de pendências por pessoa, filtro Em andamento/Concluídos do portal.
- Separar em 3 ou 4 commits por tela (tarefa, listas, agenda e PDFs, interno, portal).
- Cada commit leva teste e a atualização de `docs/funcionalidades/`.
- Estimativa: a fase mais rápida; cada tela é pequena.

### Fase 2: regras de prazo e comprovantes (etapas 2, 3 e 4)
Itens: parar o prazo durante a conferência, pausa de prazo, pedido de prazo e impedimento, Instruções, foto de exemplo e mensagens.
- Segue a ordem já definida na análise dos comprovantes: etapa 2 (com análise própria da regra de prazo), depois 3 e 4.
- Depende das respostas da Fase 0.
- Risco principal: a etapa 2 atravessa semáforo, atrasos, agenda, portal e avisos; os testes existentes de semáforo e de atraso precisam continuar valendo.

### Fase 3: permissões do colaborador interno
Itens: abas "Minhas / Da equipe", Exportar PDF do colaborador, "Novo" com mais opções, "Concluir" direto na linha (só se a Talita mudar a regra de aprovação), comentários no nível da tarefa.
- Uma análise de permissão para o conjunto, com a tabela de quem vê e faz o quê, como em `restricao-externo-e-agenda-interno.md`.
- Testes de RLS para o perfil permitido e o negado.

### Fase 4: administração (dado novo)
Itens: histórico automático, cobrar responsável, avisos com contexto e ações diretas, duplicar projeto, Usuários com lista única e empresa, "Cadastro incompleto", "Último acesso" (se pedido).
- Começar pelo histórico automático, porque avisos com contexto e outros itens podem reaproveitá-lo.
- Duplicar projeto e Usuários com empresa exigem modelo definido antes (classe D).

### Fase 5: portal do cliente
Itens: unidades e seletor, Drive, trilha de etapas e atualizações, Relatórios e "Gerar relatório", "Ver como cliente".
- Maior fase e a que mais depende da Talita. Fazer uma análise única do portal, com a regra de o cliente nunca ver comentário interno, valor nem comprovante.
- "Ver como cliente" fica por último e com análise de segurança própria.

### Fase 6: avisos e preferências
Itens: régua de avisos, escalonamento, resumo mensal, "Avisos que você recebe" e telefone editável.
- Mexe no agendador de avisos e nas notificações em tempo real. Reaproveitar as análises `agendador-avisos-prazo` e `controle-total-notificacoes`.

### Fase 7: status "A iniciar" de subtarefa
Item isolado porque muda o enum e vários cálculos (progresso, semáforo, painéis). Fazer só se a Talita confirmar que precisa; pode andar junto da Fase 2 se a regra de prazo já estiver aberta.

## 4. Perguntas para a Talita

1. **Último acesso:** ela quer ver quando cada pessoa acessou o sistema? (envolve registrar o login)
2. **Cadastro incompleto:** quais campos do cliente tornam o cadastro incompleto?
3. **Duplicar projeto:** o que deve ser copiado (tarefas, subtarefas, datas, comprovantes exigidos)?
4. **Colaborador "Da equipe":** o interno deve ver tarefas de outros colaboradores do mesmo projeto? Só leitura?
5. **Concluir direto:** o interno pode concluir sem a confirmação dela, ou continua pedindo a conclusão?
6. **Unidades do cliente:** o que é uma unidade (filial, obra, local)? Um projeto pertence a uma unidade?
7. **Drive:** pasta compartilhada por cliente? Quem coloca o link?
8. **Trilha de etapas:** as etapas são fixas por tipo de projeto ou definidas por projeto? O cliente vê comentários?
9. **Relatórios:** o que entra no PDF do cliente, por período e por unidade? Há resumo mensal automático?
10. **Régua de avisos e escalonamento:** quando avisar e quem recebe a escalada quando o responsável não age?
11. **Subtarefa "A iniciar":** ela precisa desse status, ou "Em andamento" basta?

## 5. Riscos e dependências

- **Prazo:** etapa 2, pausa de prazo e "A iniciar" mexem nas mesmas regras de semáforo e progresso. Planejar juntas evita refazer testes duas vezes.
- **RLS:** todo item que amplia leitura (Da equipe, Quem acessa, Relatórios) exige testar o perfil negado. Itens de portal têm risco de vazar dado interno.
- **Migrations:** o timestamp de cada migration nova precisa ser posterior à última da `origin/staging`; migration publicada é imutável.
- **Dependência de respostas:** as Fases 2, 4, 5 e 6 só andam depois da Fase 0.
- **Ordem sugerida:** 0 e 1 em paralelo; depois 2; depois 3 e 4; por último 5, 6 e 7.
