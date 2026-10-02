# Análise: Área Exclusiva do Cliente — Sprint 6

- **Data:** 2026-10-02
- **Pedido original:** “Vamos executar a sprint 6” — Plano de Execução — Sprint 6: Área Exclusiva do Cliente, versão 1.0, de 02/10/2026.
- **Status:** aprovada em 2026-10-02

## 1. Escopo previsto

### Inclui

- Auditar e estender login, vínculo do usuário ao cadastro de cliente, bloqueio de acesso, revalidação de sessão, RLS, preferências de notificação e rotas existentes.
- Indicador de conclusão (RF-048/RN-014): tarefas concluídas sobre tarefas ativas e não canceladas; subtarefas concluídas sobre subtarefas ativas e não canceladas. Tarefa sem subtarefas é binária. Sem filhos ativos, não exibir percentual.
- Indicador de última atualização (RF-049/RN-015), incluindo as escritas especificadas no plano e excluindo leituras e registros desativados.
- RLS de leitura para CLIENTE em projetos e tarefas do próprio cadastro e em documentos do próprio cadastro/projetos; negar conteúdo de subtarefas, valores de projeto e comentários, inclusive acesso direto à role de aplicação.
- Agregação segura de contagem de subtarefas por tarefa, sem liberar SELECT de subtarefas.
- Portal somente leitura: lista de projetos, detalhe com tarefas e responsável, progresso agregado, links de documentos e estado vazio.
- Menu e tela inicial de CLIENTE apontam para o portal; Meu Perfil continua disponível. Guardas de rota negam acesso cruzado por perfil.
- Preferências de eventos do perfil CLIENTE permanecem desligadas por padrão; quando habilitadas, destinatários de eventos limitam-se aos usuários CLIENTE vinculados ao projeto correspondente.
- Testes unitários, integração/RLS e smoke para os riscos e fluxos do plano; documentação de funcionalidades e decisões, SRS v2.6 e ADD v1.13 conforme o plano.
- Verificação visual em 375 px e desktop, suíte local completa, publicação em `origin/staging`, acompanhamento do CI/deploy e healthcheck.

### Fora do escopo

- Criação/edição de projetos, tarefas ou documentos pelo cliente; comentários do cliente; upload de arquivos; acesso a subtarefas ou valor contratado.
- Reformulação de `/meus-projetos`, que permanece a visão dos colaboradores.
- Alterações de autenticação/convite além do necessário para validar o fluxo já existente de ativação e bloqueio do cliente.

## 2. Permissões

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Criar/editar/desativar/reativar projeto, tarefa ou documento | Sim | Não | Não | Não |
| Listar/abrir projetos | Todos, inclusive desativados conforme regra atual | Escopo atribuído atual | Escopo atribuído atual | Projetos ativos do próprio cadastro |
| Ler tarefas | Todas conforme regra atual | Escopo atribuído atual | Escopo atribuído atual | Tarefas ativas dos próprios projetos |
| Ler documentos | Todos conforme regra atual | Conforme acesso atual | Conforme acesso atual | Ativos do próprio cadastro e de seus projetos |
| Ler subtarefas ou seu conteúdo | Sim conforme acesso atual | Escopo atual | Escopo atual | Não; somente total e concluídas via agregação |
| Ler comentários | Conforme regra atual | Conforme regra atual | Conforme regra atual | Não |
| Ler valor contratado | Sim | Não | Não | Não |
| Ver/editar preferências de notificação | ADMIN configura todos os perfis | Não | Não | Não; preferências CLIENTE começam desligadas |
| Receber evento com preferência habilitada | Conforme preferência e regra atual | Conforme preferência e regra atual | Conforme preferência e regra atual | Somente evento de seus próprios projetos |
| Acessar portal | Não se aplica; rotas internas continuam | Não | Não | Sim |
| Acessar rotas exclusivas de equipe/administração | Sim conforme MENU | Só rotas declaradas | Só rotas declaradas | Não |

## 3. Dados

- Não se prevê nova tabela ou coluna se a última atualização puder ser agregada na consulta, recomendação do plano. Esta opção depende da decisão aberta abaixo.
- Projeto: nome, status, datas, prazo previsto, atualização, percentual, responsável conforme regra confirmada; não retornar descrição interna nem valor contratado sem decisão expressa.
- Tarefa: nome, status, prazo, responsável e contagem agregada de subtarefas concluídas/ativas. Não selecionar subtarefas para o perfil CLIENTE.
- Documento: nome e URL HTTP/HTTPS já validados no servidor; somente registros ativos do cliente/projeto acessível. Abrir link externo com `target="_blank" rel="noreferrer"`.
- Indicadores: excluir registros inativos e status cancelado. Sem denominador válido, não renderizar percentual; subtarefa concluída conta como concluída, enquanto tarefa concluída é o caso binário quando não possui subtarefas.
- Unicidade e backfill: não se aplica se não houver migration. Se a agregação demandar nova estrutura persistida, revisar análise, migration e backfill antes de implementar.
- Dados sensíveis: comentários, título/descrição/responsável/etiquetas/prazo de subtarefa e valor contratado não podem vir na resposta/consulta CLIENTE. Responsável da tarefa é mostrado conforme plano; confirmar qual campo/nome deve aparecer.

## 4. Impacto em telas e funções existentes

Verificado por busca de usos no repositório:

- `src/lib/navegacao.ts`: `MENU`, `TELA_INICIAL`, guardas e `perfilPodeAcessar`.
- `src/app/(painel)/meu-perfil/` e layout do painel: navegação existente do CLIENTE.
- `src/app/(painel)/meus-projetos/`: visão atual exclusiva de colaboradores; deve permanecer independente.
- `src/lib/projetos-tarefas.ts`: consultas administrativas/de colaborador, cálculo existente de `% em dia`, `buscarProjeto`; evitar expor includes internos por reutilização descuidada.
- `src/lib/regras-projetos-tarefas.ts`: cálculos puros existentes; avaliar extensão para os novos indicadores de conclusão sem conflitar com `% em dia`.
- `src/server/auth/contexto.ts`, `src/server/auth/config.ts`, `src/proxy.ts`: contexto e guarda atualizados por request; confirmar comportamento da sessão CLIENTE.
- `src/lib/notificacoes.ts`, `src/app/(painel)/notificacoes/actions.ts` e página de notificações: preferências CLIENTE já aparecem na configuração administrativa; revisar geração de destinatários e filtros por evento.
- `src/lib/comentarios.ts`: autorização por perfil; RLS vigente em `prisma/migrations/20260917151000_fix_comentarios_rls/migration.sql` permite CLIENTE no próprio escopo, incompatível com o novo requisito de nenhum comentário.
- `prisma/migrations/20260916190000_rls_heranca_projetos_tarefas/migration.sql`: funções/políticas de herança e acesso para projeto/tarefa; estender a partir da versão mais recente.
- RLS de documentos em `prisma/migrations/20260916110500_rls_soft_delete_cascata/migration.sql`; políticas de `valores_projeto` em `prisma/migrations/20260918110000_valor_contratado_projeto/migration.sql`.
- Páginas existentes de projeto/tarefa/subtarefa e documentos: conferir todos os usos alterados e preservar visões de equipe.
- Testes existentes relevantes: `tests/integration/autenticacao-permissoes.integration.test.ts`, `tests/integration/notificacoes-rf022.integration.test.ts`, `tests/integration/soft-delete-rf039.integration.test.ts`, `tests/integration/projetos-tarefas-a4.integration.test.ts`, `tests/unit/projetos-tarefas.unit.test.ts` e `tests/smoke/autenticacao.smoke.test.ts`.
- Documentação a atualizar após aprovação: SRS para v2.6, ADD para v1.13 conforme o plano, novos documentos de design do portal se necessário, módulos em `docs/funcionalidades/` e índice `docs/decisoes-desenvolvimento.md`.

**Ajuste da versão durante a implementação:** o histórico do SRS já registra a v2.6 em 01/10/2026 (após a versão base considerada no plano da sprint). Para manter a sequência sem reutilizar número de versão, a documentação desta sprint será publicada como SRS v2.7; o ADD avança para v1.13 como previsto.

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| CLIENTE consultar projeto/documento de outra conta por IDOR | Toda consulta filtrada por vínculo do cliente e RLS aplicada; detalhe não confiar só na URL | Integração com usuário A consultando ID do cliente B |
| RLS atual permitir comentários ao CLIENTE | Revisar política mais recente e negar SELECT e INSERT ao CLIENTE; preservar perfis internos | Integração: comentário não retorna e INSERT falha para CLIENTE; perfis permitidos continuam funcionando |
| Conteúdo de subtarefa chegar via Prisma ou SQL direto | SELECT continua negado ao perfil CLIENTE; função `SECURITY DEFINER` retorna somente `{total, concluidas}`, com zeros para tarefa inexistente; revogar permissões desnecessárias | Integração com role `multiplus_app`: SELECT vazio/negado, agregação exata sem campos de subtarefa |
| Views bypassarem RLS | Qualquer view nova deve usar `security_invoker = true`; preferir função agregadora cuidadosamente limitada | Integração com role CLIENTE e teste de dados de outro cliente |
| Função SECURITY DEFINER ficar executável sem escopo ou retornar NULL | `search_path` fixo, validação de acesso à tarefa, retorno zero para inexistente, grants explícitos | Integração: tarefa própria, tarefa de terceiro e id inexistente |
| Valor contratado incluído por relação no Prisma | Queries do portal usam `select` explícito e nunca incluem `valorContratado` | Integração: campo não existe na resposta de projeto CLIENTE |
| Registro desativado/cancelado entrar em lista ou percentual | Filtrar `ativo` em cada consulta e status cancelado no cálculo | Unitário e integração cobrindo cancelados/desativados |
| Notificação revelar atividade de projeto de outro cliente | Resolver destinatários pelo projeto e vínculo CLIENTE ativo, não só pela preferência de perfil | Integração com dois clientes e preferência ligada |
| Sessão continuar válida após bloqueio do cliente | Reutilizar revalidação de usuário/cliente ativa a cada request e testar sessão preexistente | Smoke/integration: bloqueio revoga próximo request e login novo |
| Navegação esconder item, mas rota ficar aberta | Declarar portal no MENU e testar guarda por perfil para rota e subrota | Unitário de acesso por perfil |
| Datas ou links renderizados incorretamente/inseguros | Datas formatadas em UTC; aceitar só HTTP/HTTPS; links externos com `noreferrer` | Teste existente de validação URL e verificação visual |
| Mudança em funções SQL apagar regra anterior | Recriar funções partindo da migration mais recente que as redefine; criar migration posterior ao remoto | Revisão da migration e integração das políticas |

## 6. Casos-limite e estados

- Painel sem projetos: “Nenhum projeto cadastrado ainda”, sem ação de criação.
- Projeto sem tarefas ativas: não exibir percentual. Projeto cancelado ou desativado não aparece ao cliente.
- Tarefa sem subtarefas: indicador binário (0% ou 100%). Tarefa cancelada não entra no numerador nem no denominador.
- Subtarefas todas canceladas/desativadas: nenhuma contagem válida; não mostrar percentual/progresso ambíguo.
- Tarefa/projeto inexistente, de outra conta ou desativado: não revelar existência; retornar estado não encontrado/sem acesso definido pelo padrão do app.
- Documentos podem estar vinculados ao cliente sem projeto ou diretamente ao projeto; links inválidos não devem ser renderizados.
- Nome/responsável longo em celular; nenhuma rolagem horizontal; alvos de toque de pelo menos 44 px.
- Atualização concorrente: derivação por agregação evita estado duplicado; verificar consistência transacional e custo para o volume atual.
- Última atualização deve excluir leitura e escrita em registro desativado. Definir comportamento de comentários existentes: apesar da regra de atualização incluir “comentar”, cliente não poderá comentar; comentários internos ainda podem atualizar a data.

## 7. Interface

- Ler identidade visual em `docs/Identidade_Visual_Multiplus.md` antes de construir as telas e seguir os tokens existentes.
- Usar a convenção atual de páginas server-side do grupo `src/app/(painel)/` e a estrutura visual do PDD de Projetos/Tarefas apenas onde fizer sentido; o PDD existente exclui expressamente o portal e não define suas telas.
- Portal com painel de projetos e detalhe separado, sem comentários/valores/conteúdo de subtarefa. Cliente acessa Meu Perfil pelo menu.
- Verificar 375 px e desktop com navegador/DevTools antes da conclusão.
- Nome da rota e ordem da listagem aguardam decisão; sugestão do plano: rota `/acompanhamento` e atualização mais recente primeiro.

## 8. Plano de testes

- **Unitários:** cálculo de conclusão para cancelados, desativados, sem filhos, tarefa sem subtarefas, projeto vazio, tudo concluído/nada concluído; política/critério de última atualização para escrita, leitura e registros desativados.
- **Integração/RLS:** CLIENTE próprio vs. outro cliente; projetos/tarefas/documentos; campos excluídos; nenhuma leitura/inserção de comentário; nenhuma leitura de subtarefa e retorno apenas da contagem; valor contratado ausente; cascata de cliente/projeto desativado; preferências desligadas e destinatário restrito quando ligadas.
- **Rotas:** CLIENTE entra no portal e não acessa administração/rotas de colaborador; perfis de equipe não acessam portal; `/meus-projetos` preservado para equipe.
- **Smoke:** login do cliente, painel, detalhe, progresso agregado, abertura de documento; bloquear o cliente pela ficha e confirmar recusa no request subsequente.
- **Regressão:** suíte completa, incluindo módulos anteriores. Após aprovação, escrever/ajustar os testes antes do código de correção; não publicar com suíte vermelha.
- **Interface:** conferir painel e detalhe em 375 px e desktop.

## 9. Perguntas em aberto

1. **Última atualização (A2):** aprovar cálculo por agregação na consulta (recomendado, sem coluna/trigger) ou preferir coluna mantida por trigger? — **Resposta:** cálculo por agregação na consulta, sem coluna/trigger, aprovado em 2026-10-02.
2. **Rota do portal (C3):** usar `/acompanhamento` (sugestão) ou `/portal`? `/meus-projetos` fica reservado aos colaboradores. — **Resposta:** `/portal`, aprovado em 2026-10-02.
3. **Percentual em telas internas (A1):** RF-048 pede visibilidade também para Administrador e colaboradores. Implementar exibição interna nesta sprint ou calcular agora e exibir somente no portal, deixando a superfície interna para etapa posterior? — **Resposta:** incluir a exibição nas telas internas nesta sprint.
4. **Ordenação do painel:** aprovar atualização mais recente primeiro (sugestão) ou prefere outra ordenação? — **Resposta:** atualização mais recente primeiro, aprovado em 2026-10-02.
5. **Responsável exibido ao cliente:** o plano pede o responsável da tarefa. Aprovar exibir o nome do responsável atual (pessoa envolvida ou usuário da equipe) para o CLIENTE? Isso não foi decidido no SRS/PDD e nomes de equipe expõem dado pessoal. — **Resposta:** sim, exibir o nome atual do responsável, aprovado em 2026-10-02.
