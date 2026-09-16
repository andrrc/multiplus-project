# RFs Novos e Revisões — SRS Múltiplus Software

**Para aplicar na versão:** SRS v2.1
**Data:** 14/09/2026
**Autor:** André (Somma)
**Origem:** sessão de planejamento das Sprints 3 e 4 (14/09/2026)

Este documento traz os requisitos novos e as revisões de requisitos existentes, no formato do
SRS, prontos para serem inseridos. Ao aplicar, atualizar também o Histórico de Revisões do
SRS e do ADD.

---

## Parte 1 — Requisitos Funcionais Novos

### 3.17 Administração e Acesso (Sprint 3)

> Módulo identificado como lacuna no planejamento de 14/09/2026. O RF-030 e o RF-032 já
> existiam no SRS desde a v1.3, mas nunca haviam sido desenhados em tela nem alocados a
> nenhuma sprint — e são pré-requisito das telas de colaborador do módulo de Projetos e
> Tarefas, que dependem de `Atribuicao` populada.

#### RF-040 — Gestão de usuários internos
| Campo | Valor |
|-------|-------|
| **ID** | RF-040 |
| **Módulo** | Autenticação / Administração |
| **Descrição** | O sistema deve oferecer ao Administrador uma listagem de todos os usuários internos, com busca por nome/e-mail, filtro por perfil e indicação do status de acesso (Ativo, Pendente de ativação, Desativado) e da quantidade de atribuições de cada um. A partir dela deve ser possível criar, editar, reenviar convite e desativar/reativar um usuário (RF-039) |
| **Prioridade** | Must |
| **Critério de aceite** | Dado o Administrador logado, quando acessar a listagem de usuários, então deve visualizar todos os usuários internos com perfil e status. Dado um usuário desativado, quando ele tentar logar, então o acesso deve ser negado, mas seu histórico de comentários e conclusões permanece visível no sistema. Dado um usuário com zero atribuições, quando a listagem for exibida, então essa condição deve ser sinalizada visualmente |
| **Nota** | Desativar um usuário nunca apaga seu histórico — mesma lógica do RF-029 para o cliente |

#### RF-041 — Gestão de atribuições
| Campo | Valor |
|-------|-------|
| **ID** | RF-041 |
| **Módulo** | Autenticação / Permissões |
| **Descrição** | O sistema deve permitir ao Administrador vincular e desvincular um usuário a projetos (Colaborador Interno) ou a tarefas (Colaborador Externo), respeitando a granularidade de cada perfil (RN-005). A atribuição deve poder ser feita tanto no cadastro do usuário (RF-030) quanto posteriormente, a qualquer momento. Atribuições criadas automaticamente por definição de responsável (RN-006) devem ser identificadas como tais e não podem ser removidas manualmente — a remoção se dá trocando o responsável da tarefa |
| **Prioridade** | Must |
| **Critério de aceite** | Dado um Colaborador Interno, quando o Administrador o atribuir a um projeto, então ele deve passar a visualizar todas as tarefas e subtarefas daquele projeto. Dado um Colaborador Externo, quando for atribuído a uma tarefa, então deve visualizar apenas aquela tarefa. Dado uma atribuição de origem automática (RN-006), quando o Administrador tentar removê-la diretamente, então o sistema deve bloquear a ação e orientar a trocar o responsável da tarefa |
| **Nota** | Fecha a ação pendente registrada no ADR-005 ("solicitar a atribuição de tarefa(s)/projeto(s) na mesma tela") |

#### RF-042 — Perfil próprio do usuário
| Campo | Valor |
|-------|-------|
| **ID** | RF-042 |
| **Módulo** | Autenticação (extensão) |
| **Descrição** | Todo usuário autenticado deve poder visualizar e editar seus próprios dados básicos (nome), alterar a própria senha informando a senha atual, e consultar suas atribuições em modo somente leitura. O e-mail é somente leitura para perfis não-Administrador — apenas o Administrador altera e-mail de usuário |
| **Prioridade** | Must |
| **Critério de aceite** | Dado um usuário logado, quando acessar "Meu Perfil", então deve visualizar seus dados e suas atribuições. Dado que ele informe a senha atual correta e uma nova senha válida, quando confirmar, então a senha deve ser alterada. Dado um usuário não-Administrador, quando acessar o perfil, então o campo de e-mail deve estar em modo somente leitura |

#### RF-043 — Navegação e tela inicial por perfil
| Campo | Valor |
|-------|-------|
| **ID** | RF-043 |
| **Módulo** | Transversal / Navegação |
| **Descrição** | O menu do sistema deve exibir apenas os itens acessíveis ao perfil autenticado — itens não acessíveis **não aparecem**, não ficam desabilitados (mesma lógica do RF-020). Cada perfil tem uma tela inicial definida após o login: <br>• **Administrador**: Painel de Tarefas por Prazo (RF-037) · menu: Prazos, Agenda, Clientes, Projetos, Usuários, Notificações, Perfil<br>• **Colaborador Interno**: Meus Projetos · menu: Meus Projetos, Perfil<br>• **Colaborador Externo**: Minhas Tarefas · menu: Minhas Tarefas, Perfil<br>• **Cliente**: Área Exclusiva (Sprint 6) |
| **Prioridade** | Must |
| **Critério de aceite** | Dado um usuário autenticado, quando o login for concluído, então ele deve ser direcionado à tela inicial do seu perfil. Dado um Colaborador Interno ou Externo, quando visualizar o menu, então os itens Agenda, Prazos, Clientes e Usuários não devem estar presentes. Dado uma tentativa de acesso direto por URL a uma rota fora do perfil, então o sistema deve negar o acesso |
| **Nota** | A escolha do Painel de Prazos como tela inicial do Administrador se deve a ser a tela de trabalho diário, já ordenada por urgência e filtrada com pendentes |

#### RF-039 — Desativação de registros (soft delete)
| Campo | Valor |
|-------|-------|
| **ID** | RF-039 |
| **Módulo** | Transversal |
| **Descrição** | O sistema não deve oferecer exclusão permanente de registros. Em vez disso, Projeto, Tarefa, Subtarefa, Cliente, Pessoa Envolvida, Documento e Usuário devem poder ser **desativados**, mantendo o registro e seu histórico no banco. Registro desativado fica oculto das listagens por padrão (revelável por um toggle "Mostrar desativados"), é somente leitura, e sai de todo cálculo e visão gerencial: não entra no "% em dia" (RF-009), não aparece na Agenda (RF-036) nem no Painel de Prazos (RF-037), e não dispara notificação de prazo (RF-007). Apenas o Administrador desativa e reativa (RN-007) |
| **Prioridade** | Must |
| **Critério de aceite** | Dado um registro ativo, quando o Administrador o desativar, então ele deve sumir das listagens padrão e sair de todos os indicadores, sem ser apagado. Dado um registro desativado, quando o Administrador o reativar, então ele deve voltar ao estado anterior à desativação. Dado um projeto desativado, quando um usuário tentar acessar suas tarefas, então elas também devem estar inacessíveis, sem terem sido marcadas individualmente como desativadas |
| **Nota técnica** | Colunas `ativo` (boolean, padrão true), `desativado_em`, `desativado_por`. A cascata é por herança de acesso, não por marcação dos filhos — marcar cada filho tornaria a reativação uma operação destrutiva de informação. Ver **ADR-008** no ADD |

---

### 3.18 Complementos do módulo de Projetos e Tarefas (Sprint 4)

#### RF-038 — Campos do cadastro de projeto
| Campo | Valor |
|-------|-------|
| **ID** | RF-038 |
| **Módulo** | Projetos e Tarefas |
| **Descrição** | O cadastro de projeto (RF-004) deve conter: cliente vinculado (obrigatório, não editável após a criação), nome do projeto (obrigatório), descrição (opcional, texto longo), data de início (opcional), data prevista de conclusão (opcional) e status (obrigatório, lista do RF-024, padrão "A iniciar") |
| **Prioridade** | Must |
| **Critério de aceite** | Dado o formulário de projeto, quando o usuário preencher cliente e nome e salvar, então o projeto deve ser criado com status "A iniciar". Dado que data de início e data prevista de conclusão sejam preenchidas, quando a conclusão for anterior ao início, então o sistema deve bloquear o salvamento com erro inline |
| **Origem** | Lacuna identificada no planejamento da Sprint 4 — o SRS não definia nenhum campo de projeto além de cliente e status |

#### RF-046 — Visibilidade do cliente para Colaborador Externo
| Campo | Valor |
|-------|-------|
| **ID** | RF-046 |
| **Módulo** | Autenticação / Permissões |
| **Descrição** | O Colaborador Externo deve visualizar **apenas o nome/razão social** do cliente associado à tarefa atribuída, em modo somente leitura e sem link de navegação para o cadastro do cliente. Não devem ser exibidos CNPJ/CPF, endereço, segmento, atividade principal, porte, município, telefone (já coberto pelo RF-020) ou qualquer outro dado cadastral |
| **Prioridade** | Must |
| **Critério de aceite** | Dado um Colaborador Externo visualizando uma tarefa atribuída, quando a tela for renderizada, então deve exibir o nome do cliente e nenhum outro dado cadastral. Dado uma tentativa de acesso direto ao cadastro daquele cliente por URL, então o acesso deve ser negado |
| **Nota** | Decisão de negócio a validar com a Talita: o Colaborador Externo pode ser terceiro de fora da Múltiplus, e expor a carteira de clientes tem implicação de confidencialidade e LGPD (RNF-002). O acesso foi liberado porque trabalho ambiental sem saber de qual empreendimento se trata é impraticável |

#### RF-047 — Imutabilidade de comentários
| Campo | Valor |
|-------|-------|
| **ID** | RF-047 |
| **Módulo** | Projetos e Tarefas (extensão) |
| **Descrição** | Comentários publicados (RF-016) não podem ser editados nem removidos por nenhum perfil, incluindo o Administrador. O comentário é registro histórico com autor e data/hora |
| **Prioridade** | Should |
| **Critério de aceite** | Dado um comentário publicado, quando qualquer perfil visualizar o item, então não devem existir ações de editar ou excluir aquele comentário |
| **Nota** | Em contexto de prazo regulatório ambiental, o histórico de quem disse o quê e quando tem valor probatório — permitir edição posterior esvaziaria isso |

---

### 3.19 Fechamento do projeto (Sprint 7)

#### RF-044 — Migração assistida dos dados existentes
| Campo | Valor |
|-------|-------|
| **ID** | RF-044 |
| **Módulo** | Fechamento |
| **Descrição** | Migração dos dados hoje mantidos em planilhas, Trello e Google Drive para o sistema — clientes, projetos, tarefas com prazo, licenças e links de documentos, conforme previsto na Proposta Comercial Enxuta |
| **Prioridade** | Must |
| **Critério de aceite** | Dado o conjunto de dados existentes fornecido pela Talita, quando a migração for concluída, então os registros devem estar acessíveis no sistema com os mesmos prazos e vínculos da origem, validados por amostragem com a Talita |
| **Nota** | Já constava dos Critérios de Aceite Globais do SRS, mas nunca havia sido escrito como requisito nem alocado a sprint. **É entregável contratual** — se a Talita espera migrar antes de usar o sistema de verdade, precisa subir na ordem do roadmap |

#### RF-045 — Exclusão de dados sob solicitação (LGPD)
| Campo | Valor |
|-------|-------|
| **ID** | RF-045 |
| **Módulo** | Conformidade |
| **Descrição** | O sistema deve permitir ao Administrador atender a uma solicitação de exclusão de dados pessoais, conforme exigido pelo RNF-002. Diferente do RF-039 (desativação), esta operação remove ou anonimiza efetivamente os dados pessoais do titular |
| **Prioridade** | Must |
| **Critério de aceite** | Dado uma solicitação de exclusão de dados de um titular, quando o Administrador executar a operação, então os dados pessoais devem ser removidos ou anonimizados, preservando a integridade referencial dos registros operacionais que não identifiquem o titular |
| **Nota** | O RNF-002 exige "possibilidade de exclusão de dados sob solicitação" desde a v1.0 do SRS, sem nenhum requisito funcional que a implementasse. Definir com apoio jurídico o que é removido e o que é anonimizado |

---

## Parte 2 — Regras de Negócio Novas

| ID | Regra | Exemplo concreto |
|----|-------|-------------------|
| **RN-007** | Apenas o Administrador cria, edita, desativa e reativa registros (projeto, tarefa, subtarefa, item de checklist, documento, usuário). Colaborador Interno e Externo têm exatamente duas ações de escrita: marcar como concluída uma tarefa atribuída, e marcar como concluída uma subtarefa atribuída a si (RN-004). Colaborador **não tem seletor de status** — tem uma única ação "Marcar como concluída", que move a tarefa para "Concluído"; os outros oito valores do RF-024 são exclusivos do Administrador | Um Colaborador Interno atribuído ao Projeto X vê todas as tarefas, pode concluir as suas, mas não consegue criar uma tarefa nova nem mover uma tarefa para "Protocolado" |
| **RN-008** | A próxima ocorrência de uma tarefa recorrente é sempre contada a partir da **data de prazo original**, nunca da data de conclusão. Cancelar uma tarefa recorrente **encerra a série inteira** — nenhuma ocorrência futura é gerada | Tarefa mensal com prazo 10/09 concluída em 20/09 gera a próxima em **10/10**, não 20/10. Se a série derivasse pela data de conclusão, um prazo regulatório anual sairia do lugar ao longo dos anos |
| **RN-009** | Registro desativado (RF-039) é excluído de todo cálculo, visão gerencial e disparo automático: "% em dia" (RF-009), Agenda (RF-036), Painel de Prazos (RF-037) e notificação de prazo (RF-007). A desativação de um pai torna os filhos inacessíveis por herança, sem marcá-los individualmente | Desativar um projeto com 12 tarefas tira as 12 de todos os painéis; reativá-lo devolve todas ao estado exato anterior |

---

## Parte 3 — Revisões de Requisitos Existentes

### RF-006 — Recorrência automática de tarefas
**Acrescentar à Descrição:** a próxima ocorrência é contada a partir da data de prazo
original, não da data de conclusão (RN-008). Cancelar uma tarefa recorrente encerra a série
inteira, sem geração de ocorrências futuras.
**Acrescentar ao Critério de aceite:** "Dado uma tarefa mensal com prazo em 10/09 concluída em
20/09, quando a próxima ocorrência for gerada, então seu prazo deve ser 10/10. Dado uma tarefa
recorrente com status alterado para 'Cancelado', quando isso ocorrer, então nenhuma ocorrência
futura deve ser gerada."

### RF-007 — Notificação por e-mail de prazos
**Acrescentar à Descrição:** o número de dias de antecedência é definido como **configuração
global** (padrão 7 dias, ajustável na tela de Notificações), podendo ser **sobrescrito por
tarefa** através de um campo opcional no cadastro. Quando o responsável da tarefa é uma Pessoa
Envolvida **sem acesso ao sistema** (`tem_acesso = não`), o sistema **não envia e-mail a ela**
— notifica apenas o Administrador, que repassa pelo canal que já utiliza.
**Acrescentar ao Critério de aceite:** "Dado uma tarefa com campo de antecedência preenchido,
quando o job diário for executado, então o valor da tarefa prevalece sobre o global. Dado uma
tarefa cujo responsável não tem acesso ao sistema, quando o prazo se aproximar, então apenas o
Administrador deve ser notificado."
**Justificativa da decisão sobre responsável sem login:** desde o ADR-007 o responsável pode
ser alguém sem login, cujo e-mail foi fornecido ao cliente da Talita e não à Múltiplus —
enviar e-mail transacional a essa pessoa tem leitura de LGPD (RNF-002).

### RF-017 — Anexo de imagem e link em comentário
**Acrescentar à Descrição:** formatos aceitos: **WebP, JPEG e PNG**. Tamanho máximo por
arquivo: **10MB**. O sistema deve redimensionar a imagem **no navegador** antes do upload
(lado maior limitado a aproximadamente 2000px, com conversão para WebP).
**Acrescentar Nota técnica:** resolve a ação pendente do ADR-003 ("definir tamanho máximo por
upload"). O limite é dimensionado pelo destino do arquivo — MinIO no VPS Contabo, sincronizado
para o Cloudflare R2, cujo free tier é de 10GB. Sem compressão no cliente, poucas centenas de
anexos estourariam a franquia. Na prática, com o redimensionamento, uma foto de celular de 8MB
resulta em algo na ordem de 400KB; o limite de 10MB existe como trava contra o caso patológico.
**Acrescentar ao Critério de aceite:** "Dado um arquivo fora dos formatos aceitos ou acima de
10MB, quando o usuário tentar anexá-lo, então o sistema deve exibir erro inline nomeando os
formatos aceitos e o limite, **preservando o texto já digitado no comentário**."

### RF-021 e RN-004 — Check de subtarefa
**Reescrever a parte sobre gestão de checklist.** O texto atual afirma que "gerir o checklist
(criar/editar/reordenar itens) segue o escopo normal de acesso à tarefa/projeto". Com a RN-007,
isso deixa de valer: **criar, editar, reordenar e remover itens de checklist passa a ser
exclusivo do Administrador**. Ao colaborador resta apenas marcar como concluída a subtarefa
atribuída a si.
**A distinção original permanece válida em outro eixo:** mesmo o Administrador criando os
itens, a conclusão continua restrita a quem está atribuído àquela subtarefa (ou ao próprio
Administrador).

### RF-022 — Configuração de notificações por perfil
**Acrescentar à Descrição** a lista de eventos configuráveis: prazo se aproximando (RF-007),
tarefa concluída (RF-023), projeto concluído (RF-023), novo comentário (novo), atribuição
recebida (novo). Cada evento é configurável por perfil em dois canais independentes: e-mail e
dentro do sistema (in-app). A tela também abriga a configuração global de dias de antecedência
do aviso de prazo (RF-007).
**Padrão inicial:** Administrador recebe todos os eventos nos dois canais; colaboradores
recebem prazo, comentário e atribuição.
**Eventos deliberadamente não incluídos:** "tarefa atrasada" (dispara depois do vencimento,
quando não há mais o que prevenir, e o Administrador já vê no Painel de Prazos) e "mudança de
status" (ruído excessivo, dado que a tarefa percorre vários dos 9 valores do RF-024).

### RF-024 — Status de projeto e tarefa
**Acrescentar Nota:** apenas o Administrador pode escolher livremente entre os 9 valores de
status de tarefa (RN-007). Colaborador Interno e Externo não possuem seletor de status — têm
uma única ação, "Marcar como concluída", que move a tarefa para "Concluído". Valores como
"Protocolado" e "Sob análise do órgão ambiental" pressupõem contato com o órgão ambiental,
atribuição do Administrador.

### RF-036 — Agenda mensal do Administrador
**Acrescentar Nota técnica:** como o RF-006 só gera a próxima ocorrência quando a anterior é
concluída ou vence, as ocorrências de meses futuros ainda não existem no banco. A agenda
**calcula e exibe** essas ocorrências futuras como itens indicativos (projeção visual), sem
criá-las — não são clicáveis para edição. A alternativa (gerar ocorrências antecipadamente no
banco) foi descartada por exigir mudança no modelo de dados e no job de cron, e por criar
registros órfãos ao cancelar uma série (RN-008). Ver **ADR-009** no ADD.
**Acrescentar ao Critério de aceite:** "Dado uma tarefa recorrente mensal cuja próxima
ocorrência ainda não foi gerada, quando o Administrador navegar para o mês seguinte, então a
ocorrência projetada deve aparecer no dia correspondente, identificada como projeção."

### RN-002 — Recorrência
**Acrescentar:** complementada pela RN-008 quanto à ancoragem do cálculo (prazo original, não
data de conclusão) e ao efeito do cancelamento (encerra a série inteira).

### Seção 8 — Critérios de Aceite Globais
O item "Migração assistida dos dados existentes (planilhas/Trello/Drive) realizada conforme
proposta" agora tem requisito formal correspondente: **RF-044**, alocado à Sprint 7.

---

## Parte 4 — ADRs a registrar no ADD

### ADR-008: Soft delete com cascata por herança, sem marcação de filhos
**Contexto:** decidido no planejamento da Sprint 3/4 que não haverá exclusão permanente de
registros, apenas desativação (RF-039).
**Opção escolhida:** colunas `ativo`, `desativado_em`, `desativado_por`; a desativação de um
pai torna os filhos inacessíveis por herança de acesso, **sem** marcar cada filho
individualmente.
**Opção descartada:** propagar a marcação para cada filho — tornaria a reativação uma operação
destrutiva, já que não haveria como distinguir o filho que estava desativado antes do que foi
desativado pela cascata.
**Consequência que exige teste:** as políticas de RLS e todas as queries de indicador precisam
filtrar `ativo = true` subindo a cadeia inteira (subtarefa → tarefa → projeto → cliente). É a
categoria de erro silencioso já vista no ADR-007.

### ADR-009: Projeção visual de ocorrências recorrentes na agenda
**Contexto:** o RF-036 exige que a agenda mostre ocorrências recorrentes, mas o RF-006 só as
cria quando a anterior é concluída ou vence — meses futuros ficariam vazios.
**Opção escolhida:** calcular e exibir as ocorrências futuras em tempo de renderização, sem
persistir. Itens indicativos, não editáveis.
**Opção descartada:** gerar ocorrências antecipadamente no banco (ex.: manter as próximas 12)
— exigiria decidir a janela, tratar o cancelamento de série (RN-008) e evitar poluir o Painel
de Prazos com tarefas que ninguém criou.
**Consequência que exige teste:** a função de projeção precisa de teste unitário para cada
periodicidade, incluindo o caso-limite de meses com menos dias (prazo 31/01 mensal → 28/02).

---

## Parte 5 — Pendências para validar com a Talita

Três decisões tomadas neste planejamento são de negócio, não técnicas, e foram definidas
provisoriamente. Levar ao próximo checkpoint:

1. **Status que o colaborador pode movimentar** — definido como apenas "Marcar como
   concluída". Confirmar se ela espera que o colaborador sinalize outros estados intermediários.
2. **Colaborador Externo ver o nome do cliente (RF-046)** — liberado por necessidade prática,
   mas tem implicação de confidencialidade quando o colaborador é terceiro de fora da Múltiplus.
3. **Posição da migração assistida (RF-044) no roadmap** — alocada à Sprint 7; se ela espera
   migrar antes de usar o sistema de verdade, precisa subir.
