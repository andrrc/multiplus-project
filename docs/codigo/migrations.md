# Leitura das migrations SQL

Este documento registra a finalidade e o efeito principal de cada migration, em ordem de aplicação. Os comentários existentes em cada `migration.sql` explicam as escolhas e detalhes internos. Os arquivos históricos permanecem imutáveis; esta referência é complementar e deve acompanhar migrations futuras sem reescrever as já publicadas.

| Migration | O que faz |
|---|---|
| `20260903155218_init` | Cria enums e tabelas iniciais de usuários, clientes, projetos, tarefas, tokens e atribuições. |
| `20260903155236_rls_policies` | Ativa as políticas de segurança por linha e define o contexto de usuário/perfil usado pela role de aplicação. |
| `20260903191319_fix_rn004_concluida_check` | Separa a autorização para concluir subtarefa das permissões mais amplas de gestão do checklist. |
| `20260903191825_fix_rls_projetos_tarefas_recursion` | Reestrutura políticas que se referenciavam circularmente entre projetos e tarefas. |
| `20260909135608_cadastro_clientes_schema` | Adiciona endereço e tabelas de responsáveis legais, pontos de contato e pessoas operacionais. |
| `20260909135654_cadastro_clientes_rls_masking` | Aplica acesso por perfil às novas tabelas e mascara contatos sensíveis para colaboradores. |
| `20260909140342_views_seguras_security_invoker` | Faz as views seguras respeitarem as policies da pessoa que consulta, por `security_invoker`. |
| `20260909193444_cliente_pf_pj` | Introduz o tipo PF/PJ, torna campos de CNPJ compatíveis com PF e preserva os clientes PJ existentes. |
| `20260910185330_cliente_campos_rf002abc` | Acrescenta os campos complementares de cadastro previstos no RF-002. |
| `20260910185823_responsavel_contato_opcionais` | Permite campos opcionais nas pessoas de contato, mantendo validação condicional na aplicação. |
| `20260910191124_pessoas_envolvidas_adr007` | Renomeia e amplia pessoas operacionais para pessoas envolvidas, preservando vínculos e dados existentes. |
| `20260910191500_rename_pessoas_envolvidas_policies` | Renomeia policies para refletir o nome novo da tabela, sem alterar seu enforcement. |
| `20260910192500_fix_rn004_null_pessoa_envolvida` | Corrige a primeira comparação de autorização que podia passar indevidamente quando um lado era `NULL`. |
| `20260910192900_fix_rn004_null_ambos_lados` | Completa a proteção da RN-004 verificando explicitamente os dois lados antes de comparar IDs nulos. |
| `20260916110000_soft_delete_rf039` | Adiciona estado `ativo` para desativação reversível e preservação do histórico. |
| `20260916110500_rls_soft_delete_cascata` | Atualiza políticas para ocultar registros desativados de quem não administra e respeitar a cascata. |
| `20260916120000_campos_cadastro_usuario` | Adiciona dados complementares opcionais aos usuários internos. |
| `20260916190000_rls_heranca_projetos_tarefas` | Faz a desativação do cliente propagar o bloqueio de acesso a projetos, tarefas e subtarefas. |
| `20260917090000_sprint4a_nucleo_projetos_tarefas` | Cria o núcleo de projetos, tarefas, subtarefas, recorrência e vínculos do módulo. |
| `20260917091000_fix_rn004_transition_trigger` | Ajusta a trigger de subtarefas para verificar a transição de estado conforme a RN-004. |
| `20260917120000_sprint4a_rls_rn007` | Adiciona as policies de acesso para o núcleo e aplica a RN-007 a tarefas e responsáveis. |
| `20260917121000_fix_rn039_admin_reactivation` | Permite à ADMIN reativar registros, preservando a regra de desativação para os demais perfis. |
| `20260917122000_fix_rn039_parent_write_guard` | Impede escrita em registros dependentes quando cliente ou projeto pai está desativado. |
| `20260917130000_a4_concluir_tarefa_atomico` | Implementa a conclusão da tarefa e a criação da próxima ocorrência recorrente numa função transacional. |
| `20260917150000_comentarios_4b` | Cria a estrutura de comentários e os vínculos necessários para sua leitura. |
| `20260917151000_fix_comentarios_rls` | Corrige o acesso RLS aos comentários de projeto, tarefa e subtarefa. |
| `20260917160000_modelo_notificacoes_4b` | Cria eventos, preferências e registros de notificação por usuário/canal. |
| `20260917170000_idempotencia_notificacoes_4b` | Adiciona chaves únicas para evitar duplicidade no processamento de notificações. |
| `20260918100000_responsavel_usuario_equipe` | Permite que tarefa tenha pessoa responsável da equipe, além de pessoa envolvida do cliente. |
| `20260918110000_valor_contratado_projeto` | Persiste valor contratado do projeto em estrutura própria com controle de acesso. |
| `20260918120000_responsavel_subtarefa_equipe` | Permite atribuir subtarefa a membro da equipe, mantendo a exclusividade entre origens do responsável. |
| `20260918130000_acesso_subtarefa_colaborador` | Expõe contexto mínimo de cliente/projeto/tarefa quando o colaborador é responsável direto por subtarefa. |
| `20260918140000_acesso_contextual_tarefa` | Estende o acesso contextual para responsabilidade direta por tarefa. |
| `20260918150000_fix_concluir_tarefa_nulo` | Impede que `NULL` numa relação de pessoa envolvida contorne a autorização de conclusão. |
| `20260925120000_subtarefas_completas` | Substitui o booleano de conclusão por status, ajusta dados existentes e atualiza a trigger da RN-004. |
| `20260928120000_colaborador_cria_subtarefas_auditoria` | Registra criador e data de criação e permite a criação autorizada por colaborador responsável. |
| `20260928130000_cliente_numero_identificacao` | Cria sequência, preenche números para clientes existentes e torna o identificador único e obrigatório. |
| `20260928140000_projeto_numero_proposta` | Adiciona o número da proposta comercial ao projeto. |
| `20260928150000_recorrencia_copia_subtarefas` | Atualiza a conclusão recorrente para copiar subtarefas elegíveis na mesma transação da ocorrência seguinte. |
| `20260928170000_dia_semana_recorrencia` | Armazena dia da semana em séries semanais e preserva o valor de séries já cadastradas. |
| `20260928180000_mencoes_comentarios` | Adiciona IDs de usuários mencionados aos comentários. |
| `20260928190000_etiquetas_coloridas_reutilizaveis` | Cria catálogo global de etiquetas, migra valores existentes e configura acesso RLS inicial. |
| `20260928200000_gerenciamento_etiquetas` | Concede escrita e exclusão controladas de etiquetas à aplicação, com policies administrativas. |
| `20260929100000_configuracao_semaforo` | Cria configuração global de limites do semáforo com valores padrão e acesso administrativo. |
| `20261001100000_observabilidade_agendador_prazos` | Adiciona dados de observabilidade e registros de idempotência para o agendador de prazos. |
| `20261002100000_area_exclusiva_cliente_sprint6` | Restringe o portal aos próprios dados e bloqueia consultas diretas de subtarefas pelo perfil CLIENTE. |
| `20261008120000_restringir_execucao_funcoes_definer` | Revoga execução pública das funções `SECURITY DEFINER` e concede apenas os acessos necessários. |
| `20261015120000_semaforo_vermelho_so_atrasado` | Simplifica a configuração do semáforo para âmbar até o limite e vermelho somente após o prazo. |
| `20261021170000_laudo_tecnico` | Cria laudos técnicos, anotações, links e controles de acesso administrativos. |
| `20261022110000_evento_conclusao_solicitada` | Acrescenta evento de notificação para pedido de conclusão. |
| `20261022111000_aprovacao_conclusao` | Cria solicitações de conclusão, índices de pendência, RLS e transições de decisão. |

Para entender cada instrução SQL, leia o arquivo apontado na coluna da migration e seus comentários inline. Não edite uma migration publicada: qualquer correção posterior deve ser uma nova migration, criada depois da última do `origin/staging`.
