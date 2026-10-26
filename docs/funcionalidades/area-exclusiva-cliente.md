# Área Exclusiva do Cliente

- **Última revisão:** 2026-10-23.
- **Requisitos:** RF-011, RF-012, RF-022, RF-048, RF-049, RF-050; RN-009, RN-014, RN-015, RN-016.
- **Módulos relacionados:** Projetos, Tarefas, Subtarefas, Documentos, Notificações, Autenticação.

## Visão geral

O cliente entra com as credenciais já criadas pela equipe e acompanha os projetos do próprio cadastro em `/portal`. A área é somente leitura; documentos do cliente e do projeto abrem no Google Drive.

O portal mostra status, datas, última movimentação, progresso dos projetos, tarefas, prazos, responsáveis e progresso agregado de subtarefas. O cliente não vê comentários, valor contratado nem conteúdo de subtarefa. A equipe continua usando `/meus-projetos` para sua própria visão.

## Quem pode fazer o quê

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Acessar `/portal` | Não | Não | Não | Projetos próprios ativos |
| Ver tarefas e responsáveis | Não | Não | Não | Tarefas ativas dos próprios projetos |
| Abrir documentos | Não | Não | Não | Links ativos próprios |
| Ler conteúdo de subtarefas, comentários ou valor contratado | Não pelo portal | Não pelo portal | Não pelo portal | Não |
| Criar ou editar registros | Não pelo portal | Não pelo portal | Não pelo portal | Não |
| Bloquear acesso do cliente na ficha | Sim | Não | Não | Não |

## Funcionalidades

### C1. Painel e detalhe do projeto (RF-012, RF-050)

**Como funciona.**
- Após login, CLIENTE chega ao painel `/portal`; o menu contém Acompanhamento e Meu Perfil.
- O painel lista os projetos ativos próprios, ordenados pela atividade mais recente. Sem projetos, informa “Nenhum projeto cadastrado ainda”.
- O detalhe mostra status, datas, atualização, progresso, tarefas, responsável e documentos vinculados ao projeto ou ao cadastro. O indicador agregado do projeto usa o rótulo “Progresso” no painel e no detalhe.
- O painel e o detalhe mostram “Dias restantes” junto à conclusão prevista, com o semáforo existente: dias até o prazo, “Vence hoje”, atraso, “Sem prazo”, “Concluído” ou “Cancelado”. A contagem usa dias corridos e o dia atual em São Paulo.
- Os nomes são identificados por rótulos explícitos: “Nome do projeto” nos cartões e no detalhe, e “Nome da tarefa” em cada item de tarefa.
- Cada tarefa aparece em seu próprio cartão; o nome e o status ocupam posições estáveis, enquanto prazo, responsável e progresso se alinham em colunas que se empilham no celular. O progresso distingue “Subtarefas concluídas” da conclusão da própria tarefa e inclui uma barra visual.
- Os status de projeto e tarefa usam etiquetas coloridas: lilás para A iniciar, azul para Em andamento, verde para Concluído e vermelho para Cancelado. Outros status de tarefa mantêm a etiqueta neutra.
- Links externos são validados no servidor como HTTP/HTTPS e abrem com proteção `noreferrer`.

**Detalhes técnicos.**
- **Rotas:** `/portal` e `/portal/[id]`, protegidas por `exigirAcessoARota`.
- **Etiquetas de status:** `src/ui/etiqueta-status-portal.tsx` mapeia os quatro status principais para os tokens de cor da identidade visual.
- **Indicador de prazo:** `IndicadorSemaforoProjeto` em `src/ui/indicador-dias-restantes.tsx`, calculado com `calcularDiasRestantes`; usa somente `dataPrevistaConclusao` e `status` já selecionados pelo portal.
- **Consultas:** `listarProjetosPortal` e `buscarProjetoPortal` em `src/lib/portal-cliente.ts`; selects explícitos não retornam descrição, subtarefas, comentários ou valor contratado.
- **Acesso:** RLS filtra projetos/tarefas/documentos por `clienteId`, inclui herança de desativação e nega IDs de outras contas.
- **Teste:** `portal-cliente-sprint6.integration.test.ts` cobre vínculo, IDOR, documentos, payload minimizado e presença do prazo/status usados pelo indicador.

### C2. Progresso e última atualização (RF-048/RF-049)

**Como funciona.**
- Projeto: tarefas concluídas sobre tarefas ativas não canceladas. Tarefa: subtarefas concluídas sobre subtarefas ativas não canceladas. Tarefa sem subtarefas ativas usa 0% ou 100% pelo próprio status. Sem itens elegíveis não há percentual. No portal, o indicador agregado do projeto é identificado como “Progresso”.
- A última movimentação agrega projeto, tarefa, subtarefa, comentário e documento ativo. Leitura não altera o horário; atividade em registro desativado fica fora.
- O percentual de conclusão também aparece nas telas internas de projeto e tarefa.

**Detalhes técnicos.**
- **Regra pura:** `calcularPercentualConclusao` e `calcularUltimaAtualizacaoProjeto` em `src/lib/regras-projetos-tarefas.ts`.
- **Agregações restritas:** `contar_subtarefas_portal`, `ultima_atualizacao_portal` e `responsavel_nome_portal`, funções `SECURITY DEFINER` que retornam somente os campos autorizados.
- **Sem SELECT de subtarefas para CLIENTE:** a política mantém bloqueado o conteúdo das linhas; o portal consulta apenas totais e concluídas.
- **Testes:** `tests/unit/projetos-tarefas.unit.test.ts` e `tests/integration/portal-cliente-sprint6.integration.test.ts`.

### C3. Bloqueio de acesso e alertas

**Como funciona.** O controle existente na ficha do cliente continua bloqueando o próximo request autenticado. Quando a preferência de evento CLIENTE é ligada, conclusão de projeto/tarefa e novo comentário do próprio projeto podem gerar e-mail ou aviso in-app; avisos de comentário não incluem o texto e apontam para o detalhe do portal. Todas as preferências CLIENTE começam desligadas.

**Detalhes técnicos.**
- Destinatários resolvidos pelo vínculo ativo entre usuário CLIENTE e cliente do projeto em `listarClientesAtivosDoProjeto` (`src/lib/notificacoes.ts`).
- O envio seleciona `/portal/[id]` para CLIENTE e mantém as rotas internas dos demais perfis.
- **Teste:** integração valida preferência desligada por padrão e que o envio habilitado inclui somente o cliente dono do projeto.

### C4. Horário da última movimentação

**Como funciona.** A última atualização dos projetos, no painel e no detalhe do portal, aparece na data e hora de Brasília. Sem movimentação, a mensagem existente é preservada.

**Detalhes técnicos.** As duas rotas `/portal` usam `formatarDataHoraBrasilia`; a função SQL e a agregação de atividade permanecem iguais. Datas de início e vencimento continuam como datas civis. Cobertura do formato e das viradas em `datas.unit.test.ts`; acesso continua coberto em `portal-cliente-sprint6.integration.test.ts`.

## Limitações e pendências conhecidas

| # | Situação | Efeito |
|---|---|---|
| L1 | CLIENTE ainda não tem página própria para a central de notificações in-app. | Preferência in-app pode gravar avisos que não ficam visíveis em uma caixa do cliente; e-mail funciona conforme a preferência. |

## Histórico de alterações

| Data | Commit | Alteração |
|---|---|---|
| 2026-10-26 | este commit | Mostrar dias restantes para conclusão prevista nos cartões e no detalhe do portal ([análise](../analises/dias-restantes-portal-cliente.md)). |
| 2026-10-26 | este commit | Trocar o rótulo do indicador do projeto de “Conclusão” para “Progresso” no painel e no detalhe do portal, sem alterar os cálculos. |
| 2026-10-23 | este commit | Separar os cartões de tarefa, alinhar os dados em grade responsiva e mostrar progresso visual |
| 2026-10-23 | este commit | Identificar explicitamente os nomes de projeto e tarefa no portal |
| 2026-10-22 | este commit | Colorir etiquetas de status de projetos e tarefas no portal conforme a identidade visual |
| 2026-10-02 | `b81feaf` | Portal somente leitura, agregações de conclusão/atividade, políticas RLS e destinatários de notificação limitados ([análise](../analises/area-exclusiva-cliente-sprint-6.md)). |
| 2026-10-20 | este commit | Padronizar horários e referência de dia em Brasília ([análise](../analises/padronizacao-horarios-brasilia.md)) |
