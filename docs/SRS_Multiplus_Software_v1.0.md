# Especificação de Requisitos — Múltiplus Software

**Versão:** 2.3
**Data:** 16/09/2026
**Autor:** André (Somma)
**Status:** Rascunho — módulo de Administração e Acesso (Sprint 3) especificado e implementado. RF-039 a RF-047 e RN-007 a RN-009 incorporados a partir do documento complementar `docs/rfs-novos-srs-multiplus.md`
**Tipo de sistema:** SaaS com múltiplos perfis (equipe interna + portal do cliente)

---

## 1. Introdução

### 1.1 Propósito

O Múltiplus Software é um sistema web para centralizar o controle de clientes, projetos e prazos
ambientais da Múltiplus Ambiental, hoje espalhados entre planilhas, Trello e Google Drive. O sistema
substitui esse controle manual por uma ferramenta única, reduz o risco de perda de prazos de
condicionantes ambientais e oferece um canal direto para o cliente acompanhar o andamento do próprio
projeto sem depender de mensagens manuais via WhatsApp.

### 1.2 Escopo

**Dentro do escopo (Opção Enxuta — proposta de 06/08/2026):**

- Cadastro de clientes com preenchimento automático via CNPJ
- Controle de projetos e tarefas com prazos e recorrência
- Indicador de "% em dia"
- Subtarefas
- Controle de licenças ambientais (LP/LI/LO)
- Área exclusiva de acompanhamento para o cliente final
- Organização de documentos via links do Google Drive

**Fora do escopo (reservado para eventual Proposta Completa):**

- Funil de CRM para leads
- Módulo de Visitas Técnicas
- Cofre de Credenciais
- Treinamento presencial extenso
- Customizações de identidade visual além do já definido
- Integrações não mencionadas nesta proposta

### 1.3 Público-alvo deste documento

André (desenvolvedor/arquiteto do projeto) e Talita (validação de escopo antes da modelagem técnica).

### 1.4 Glossário

| Termo                   | Definição                                                                |
| ----------------------- | -------------------------------------------------------------------------- |
| Condicionante ambiental | Obrigação/prazo imposto por órgão ambiental como parte de uma licença |
| LP / LI / LO            | Licença Prévia / Licença de Instalação / Licença de Operação       |
| Subtarefa               | Registro subordinado a uma tarefa, com descrição, prazo opcional, responsável, etiquetas, status e comentários |
| Área Exclusiva         | Painel de acesso restrito onde o cliente final acompanha seus projetos     |

---

## 2. Visão Geral do Sistema

### 2.1 Contexto

Sistema web standalone. Substitui o uso combinado de planilhas, Trello e Google Drive para gestão
de clientes e prazos. Mantém o Google Drive apenas como repositório de arquivos, referenciado por
link — não há upload direto de arquivos dentro do sistema nesta fase.

### 2.2 Usuários e Personas

| Persona                           | Quem é                                                           | Necessidades principais                                                          | Nível técnico      |
| --------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------- |
| Administrador (Talita)            | Responsável pela Múltiplus Ambiental                            | Controle total: todos os clientes, projetos, dados sensíveis                    | Intermediário       |
| Colaborador Interno (Estagiário) | Apoio operacional interno                                         | Executar tarefas nos projetos aos quais foi atribuído, sem ver dados sensíveis | Leigo/Intermediário |
| Colaborador Externo               | Colaborador (interno ou externo) designado a tarefas específicas | Comentar e finalizar as tarefas atribuídas, sem visão do restante do projeto   | Leigo/Intermediário |
| Cliente / Empresa                 | Empresa atendida pela Múltiplus                                  | Acompanhar o andamento do próprio projeto sem precisar perguntar por WhatsApp   | Leigo                |

> **Nota:** este modelo de 4 perfis (Seções 3.9-3.13) foi detalhado após o fechamento da
> Opção Enxuta, que previa apenas dois níveis de acesso (equipe interna x cliente). André
> optou por absorver esse detalhamento sem aditivo — ver Seção 3.9.

### 2.3 Premissas e Dependências

**Premissas:**

- O volume de clientes/projetos está dentro do porte atual da Múltiplus (baixo/médio)
- A equipe interna é pequena (2 pessoas) — não há necessidade de perfis granulares por enquanto

**Dependências externas:**

- Serviço de consulta de CNPJ (ex.: BrasilAPI, citada na proposta como serviço terceiro sujeito a instabilidade)
- Serviço de envio de e-mail para notificações de prazo
- Google Drive (apenas como destino de links, sem integração de API nesta fase)

---

## 3. Requisitos Funcionais

### 3.1 Cadastro de Clientes

#### RF-001 — Cadastro de cliente Pessoa Jurídica via CNPJ

| Campo                          | Valor                                                                                                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-001                                                                                                                                                                                                  |
| **Módulo**              | Cadastro de Clientes                                                                                                                                                                                    |
| **Descrição**          | Quando o tipo de cliente for Pessoa Jurídica (RF-034), o sistema deve permitir cadastrar informando o CNPJ, preenchendo automaticamente razão social, endereço e demais dados públicos disponíveis |
| **Prioridade**           | Must                                                                                                                                                                                                    |
| **Critério de aceite**  | Dado um CNPJ válido, quando o usuário o inserir no cadastro, então o sistema deve preencher automaticamente os campos disponíveis via consulta externa                                              |
| **User Story vinculada** | US-001                                                                                                                                                                                                  |
| **Nota**                 | Não se aplica a Pessoa Física — ver RF-035, que não tem auto-preenchimento (não existe consulta pública por CPF, ao contrário do CNPJ)                                                           |

#### RF-002 — Dados complementares do cliente (segmento e origem)

| Campo                          | Valor                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-002                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Módulo**              | Cadastro de Clientes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Descrição**          | O sistema deve permitir registrar segmento e origem do contato, com listas de valores que dependem do tipo de cliente (RF-034):• **Origem** (comum aos dois tipos): Google, Instagram, LinkedIn, Evento, Indicação• **Segmento — Pessoa Física**: Proprietário rural, Parceiro, Outro *(texto livre obrigatório)*• **Segmento — Pessoa Jurídica**: Indústria, Posto de combustível, Transportadora, Centro de distribuição, Área rural, Outros *(texto livre obrigatório)*Quando o usuário selecionar "Outro"/"Outros", o sistema deve exibir um campo adicional de texto livre, obrigatório, onde o usuário informa o segmento específico daquele cliente. O valor digitado passa a ser tratado como um segmento real do cliente, disponível para busca e filtro (RF-003) |
| **Prioridade**           | Must                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Critério de aceite**  | Dado um cliente cadastrado, quando o usuário selecionar segmento e origem, então a lista de segmento exibida deve corresponder ao tipo de cliente (PF ou PJ) selecionado. Dado o segmento "Outro"/"Outros" selecionado, quando o usuário tentar salvar sem preencher o texto livre, então o sistema deve bloquear o salvamento com erro inline no campo. Dado um segmento digitado em texto livre, quando o cliente for salvo, então esse valor deve aparecer corretamente no filtro de segmento do Painel de Clientes (RF-003)                                                                                                                                                                                                                                                                                   |
| **User Story vinculada** | US-002                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Nota**                 | Listas de valores definidas — resolve pendência anterior do PDD v1.0/v2.0 (Seção 6)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

#### RF-002a — Atividade principal

| Campo                         | Valor                                                                                                                                                                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                  | RF-002a                                                                                                                                                                                                                |
| **Módulo**             | Cadastro de Clientes                                                                                                                                                                                                   |
| **Descrição**         | O sistema deve permitir registrar a "atividade principal" do cliente, como texto livre, descrevendo em linguagem natural o que a empresa/pessoa faz — não é o CNAE oficial, é uma descrição própria do usuário |
| **Prioridade**          | Should                                                                                                                                                                                                                 |
| **Obrigatório?**       | Não                                                                                                                                                                                                                   |
| **Aplica-se a**         | Pessoa Física e Pessoa Jurídica                                                                                                                                                                                      |
| **Critério de aceite** | Dado um cliente sendo cadastrado, quando o usuário preencher o campo de atividade principal com texto livre, então esse valor deve ser salvo e exibido na tela de Detalhe do Cliente                                 |
| **Origem**              | Solicitado pela Talita na reunião de aprovação da Sprint 2                                                                                                                                                          |

#### RF-002b — Porte da empresa

| Campo                         | Valor                                                                                                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                  | RF-002b                                                                                                                                                        |
| **Módulo**             | Cadastro de Clientes                                                                                                                                           |
| **Descrição**         | O sistema deve permitir registrar o porte da empresa, como lista fixa de opções baseada em faturamento: MEI, ME, EPP, Médio Porte, Grande Porte             |
| **Prioridade**          | Should                                                                                                                                                         |
| **Obrigatório?**       | Não                                                                                                                                                           |
| **Aplica-se a**         | Somente Pessoa Jurídica                                                                                                                                       |
| **Critério de aceite** | Dado um cliente Pessoa Jurídica sendo cadastrado, quando o usuário selecionar o porte, então o valor deve ser salvo e exibido na tela de Detalhe do Cliente |
| **Origem**              | Solicitado pela Talita na reunião de aprovação da Sprint 2                                                                                                  |

#### RF-002c — Município e Estado via API de localização

| Campo                         | Valor                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                  | RF-002c                                                                                                                                                                                                                                                                                                                                                                   |
| **Módulo**             | Cadastro de Clientes                                                                                                                                                                                                                                                                                                                                                      |
| **Descrição**         | O sistema deve permitir selecionar Estado e Município do cliente por busca/seleção, consultando uma API pública de localização (ex.: API de Localidades do IBGE) em vez de digitação livre. O campo`estado` filtra as opções de `municipio` disponíveis. Esses campos são adicionais ao campo `endereco` (texto livre) já existente, não o substituem |
| **Prioridade**          | Should                                                                                                                                                                                                                                                                                                                                                                    |
| **Obrigatório?**       | Não                                                                                                                                                                                                                                                                                                                                                                      |
| **Aplica-se a**         | Pessoa Física e Pessoa Jurídica                                                                                                                                                                                                                                                                                                                                         |
| **Critério de aceite** | Dado o formulário de cadastro, quando o usuário selecionar um Estado, então a lista de Municípios deve ser filtrada automaticamente para aquele estado. Dado um Município selecionado, quando o cliente for salvo, então o valor deve ficar associado ao registro e visível na tela de Detalhe do Cliente                                                          |
| **Nota técnica**       | Nova dependência externa — mesma categoria de risco do RF-001 (consulta CNPJ, Seção 6.1): API sujeita a instabilidade. Precisa de estado de fallback equivalente ("serviço indisponível → digitação manual")                                                                                                                                                     |
| **Origem**              | Solicitado pela Talita na reunião de aprovação da Sprint 2                                                                                                                                                                                                                                                                                                             |

#### RF-002d — Obrigatoriedade mínima no cadastro de cliente

| Campo                         | Valor                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                  | RF-002d                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Módulo**             | Cadastro de Clientes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Descrição**         | A pedido da Talita, o formulário de cadastro de cliente exige o mínimo possível de campos obrigatórios.**Continuam obrigatórios:** tipo de cliente (PF/PJ, RF-034, estrutural ao formulário), nome/razão social, CNPJ (PJ) ou CPF (PF), e o campo de texto livre de segmento quando "Outro/Outros" for selecionado (RF-002). **Tornam-se opcionais:** endereço, segmento, origem do contato, todos os dados de Responsável Legal e Ponto de Contato (RF-026/RF-027) — incluindo `cargo` mesmo quando herdado —, atividade principal, porte, município/estado |
| **Prioridade**          | Must                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Critério de aceite** | Dado o formulário de cadastro, quando o usuário tentar salvar sem preencher um campo não listado como obrigatório, então o sistema deve permitir o salvamento. Quando um campo com validação de formato (CPF, CNPJ, e-mail) for preenchido, então a validação de formato continua sendo aplicada mesmo o campo não sendo obrigatório                                                                                                                                                                                                                                       |
| **Nota**                | Não afeta a seção de Pessoas Envolvidas (RF-028), que segue sua própria regra: a seção é opcional como um todo, mas se o usuário adicionar uma pessoa, os campos obrigatórios daquele cadastro (RF-028) se aplicam normalmente                                                                                                                                                                                                                                                                                                                                                |
| **Origem**              | Solicitado pela Talita na reunião de aprovação da Sprint 2                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

#### RF-003 — Painel central de clientes

| Campo                          | Valor                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-003                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Módulo**              | Cadastro de Clientes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Descrição**          | O sistema deve exibir uma listagem central de todos os clientes cadastrados, com colunas incluindo razão social/nome, CNPJ/CPF, segmento e**cidade**. Deve oferecer uma busca única que filtra simultaneamente por nome, CNPJ/CPF **e cidade**, além de um filtro adicional de cidade em formato dropdown, listando apenas as cidades que já possuem cliente cadastrado                                                                                                                                                                                                                         |
| **Prioridade**           | Must                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Critério de aceite**  | Dado que existam clientes cadastrados, quando o usuário acessar o painel, então deve visualizar a lista com opção de busca por nome/CNPJ/CPF. Dado clientes cadastrados com município preenchido, quando o usuário acessar o painel, então deve visualizar a coluna cidade na listagem. Dado um termo digitado na busca, quando corresponder a nome, CNPJ/CPF ou cidade de algum cliente, então o(s) cliente(s) correspondente(s) devem aparecer no resultado. Dado o filtro dropdown de cidade, quando o usuário selecionar uma cidade, então a listagem deve mostrar apenas clientes daquela cidade |
| **User Story vinculada** | US-003                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Nota**                 | Município é opcional no cadastro (RF-002c) — clientes sem cidade preenchida aparecem na listagem sem valor na coluna, e não aparecem em nenhuma opção do filtro dropdown. Coluna e filtro de cidade adicionados a pedido da Talita na reunião de aprovação da Sprint 2                                                                                                                                                                                                                                                                                                                                 |

---

### 3.2 Controle de Projetos e Tarefas

#### RF-004 — Múltiplos projetos por cliente

| Campo                          | Valor                                                                                                                                     |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-004                                                                                                                                    |
| **Módulo**              | Projetos e Tarefas                                                                                                                        |
| **Descrição**          | O sistema deve permitir associar múltiplos projetos a um mesmo cliente                                                                   |
| **Prioridade**           | Must                                                                                                                                      |
| **Critério de aceite**  | Dado um cliente cadastrado, quando o usuário criar um novo projeto, então ele deve ser vinculado a esse cliente e listado no seu painel |
| **User Story vinculada** | US-004                                                                                                                                    |

#### RF-005 — Tarefas com prazo e responsável

| Campo                          | Valor                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-005                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Módulo**              | Projetos e Tarefas                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Descrição**          | O sistema deve permitir criar tarefas dentro de um projeto, cada uma com prazo ambiental e responsável designado. O campo "responsável" referencia qualquer**Pessoa Envolvida** (RF-028), com ou sem acesso ao sistema — não apenas um Usuário com login. Isso separa *quem está fazendo o trabalho* (pode ser qualquer Pessoa Envolvida, inclusive sem acesso, apenas para controle e registro) de *quem consegue acessar o sistema* (só quem tem `tem_acesso = sim` e está atribuído via `Atribuicao`, RF-019). Quando uma Pessoa Envolvida com `tem_acesso = sim` é definida como responsável, o sistema cria automaticamente o registro correspondente em `Atribuicao` para a tarefa (ver RN-006)                                                          |
| **Prioridade**           | Must                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Critério de aceite**  | Dado um projeto existente, quando o usuário criar uma tarefa com prazo e responsável (qualquer Pessoa Envolvida), então ela deve aparecer vinculada ao projeto com essas informações visíveis. Dado uma Pessoa Envolvida com acesso definida como responsável, quando isso ocorrer, então ela deve enxergar a tarefa no próprio login automaticamente, sem ação manual adicional. Dado uma Pessoa Envolvida sem acesso definida como responsável, quando isso ocorrer, então nenhum registro de`Atribuicao` deve ser criado — a tarefa fica marcada com aquele responsável apenas para controle. Dado uma tarefa com responsável já atribuído, quando o responsável for trocado, então o `Atribuicao` da pessoa anterior deve ser removido automaticamente (RN-006) |
| **User Story vinculada** | US-005                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Nota**                 | Revisado na reunião de aprovação da Sprint 2, a pedido da Talita — antes, o responsável só podia ser um Usuário com login                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

#### RF-006 — Recorrência automática de tarefas

| Campo                          | Valor                                                                                                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-006                                                                                                                                                     |
| **Módulo**              | Projetos e Tarefas                                                                                                                                         |
| **Descrição**          | O sistema deve permitir configurar recorrência automática para tarefas com prazos ambientais periódicos                                                 |
| **Prioridade**           | Must                                                                                                                                                       |
| **Critério de aceite**  | Dado uma tarefa marcada como recorrente, quando o prazo atual for concluído ou vencer, então o sistema deve gerar automaticamente a próxima ocorrência |
| **User Story vinculada** | US-006                                                                                                                                                     |

> ⚠️ **A validar:** a regra exata de recorrência (ex.: mensal, anual, por tipo de licença) não está
> especificada na proposta. Ver RN-002.

#### RF-007 — Notificação por e-mail de prazos

| Campo                          | Valor                                                                                                                                                     |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-007                                                                                                                                                    |
| **Módulo**              | Projetos e Tarefas                                                                                                                                        |
| **Descrição**          | O sistema deve enviar notificação por e-mail ao responsável quando um prazo de tarefa estiver próximo do vencimento                                   |
| **Prioridade**           | Must                                                                                                                                                      |
| **Critério de aceite**  | Dado uma tarefa com prazo definido, quando faltar um número configurável de dias para o vencimento, então o sistema deve enviar e-mail ao responsável |
| **User Story vinculada** | US-007                                                                                                                                                    |

#### RF-008 — Subtarefas

| Campo                          | Valor                                                                                                                                           |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-008                                                                                                                                          |
| **Módulo**              | Projetos e Tarefas                                                                                                                              |
| **Descrição**          | O sistema deve permitir cadastrar subtarefas completas vinculadas a uma tarefa, com título, descrição, prazo opcional, responsável obrigatório, etiquetas e status próprio (Em andamento, Concluído ou Cancelado)                              |
| **Prioridade**           | Must                                                                                                                                          |
| **Critério de aceite**  | Dada uma tarefa, quando o Administrador cadastrar uma subtarefa, então poderá informar todos os campos em formulário dedicado; ao abrir a subtarefa, verá detalhes e comentários. O responsável atribuído pode concluí-la; somente o Administrador pode cancelar ou escolher livremente seu status |
| **User Story vinculada** | US-008                                                                                                                                          |

---

### 3.3 Indicador de Status

#### RF-009 — Indicador de "% em dia"

| Campo                          | Valor                                                                                                                                                                                               |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-009                                                                                                                                                                                              |
| **Módulo**              | Indicadores                                                                                                                                                                                         |
| **Descrição**          | O sistema deve calcular e exibir um indicador visual de percentual de tarefas/projetos em dia versus atrasados                                                                                      |
| **Prioridade**           | Must                                                                                                                                                                                                |
| **Critério de aceite**  | Dado um conjunto de tarefas com prazos, quando o usuário acessar o painel do cliente/projeto, então deve visualizar o percentual em dia calculado com base nos prazos vencidos e não concluídos |
| **User Story vinculada** | US-009                                                                                                                                                                                              |

> ⚠️ **A validar:** a regra de cálculo de "em dia" (ex.: o que conta como atrasado, se há tolerância)
> não está especificada. Ver RN-001.

---

### 3.4 Licenças Ambientais

#### RF-010 — Controle de licenças (LP/LI/LO)

| Campo                          | Valor                                                                                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ID**                   | RF-010                                                                                                                                                 |
| **Módulo**              | Licenças Ambientais                                                                                                                                   |
| **Descrição**          | O sistema deve permitir cadastrar e controlar licenças ambientais (LP, LI, LO) vinculadas a cliente e projeto, incluindo datas de emissão e validade |
| **Prioridade**           | Must                                                                                                                                                   |
| **Critério de aceite**  | Dado um projeto existente, quando o usuário cadastrar uma licença com tipo e validade, então ela deve ficar visível na aba de licenças do projeto |
| **User Story vinculada** | US-010                                                                                                                                                 |

---

### 3.5 Área Exclusiva do Cliente

#### RF-011 — Login do cliente final

| Campo                          | Valor                                                                                                                                        |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-011                                                                                                                                       |
| **Módulo**              | Área Exclusiva do Cliente                                                                                                                   |
| **Descrição**          | O sistema deve fornecer login seguro para o cliente final acessar exclusivamente os dados dos próprios projetos                             |
| **Prioridade**           | Must                                                                                                                                         |
| **Critério de aceite**  | Dado um cliente com credenciais válidas, quando ele fizer login, então deve visualizar apenas os projetos vinculados à sua própria conta |
| **User Story vinculada** | US-011                                                                                                                                       |

#### RF-012 — Painel de acompanhamento do cliente

| Campo                          | Valor                                                                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-012                                                                                                                                  |
| **Módulo**              | Área Exclusiva do Cliente                                                                                                              |
| **Descrição**          | O sistema deve exibir ao cliente final o andamento de seus projetos (status de tarefas e indicador de % em dia) em modo somente-leitura |
| **Prioridade**           | Must                                                                                                                                    |
| **Critério de aceite**  | Dado que o cliente esteja logado, quando acessar seu painel, então deve visualizar o andamento atualizado sem poder editar dados       |
| **User Story vinculada** | US-012                                                                                                                                  |

---

### 3.6 Documentos

#### RF-013 — Organização de links de documentos

| Campo                          | Valor                                                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-013                                                                                                                                      |
| **Módulo**              | Documentos                                                                                                                                  |
| **Descrição**          | O sistema deve permitir vincular links de documentos do Google Drive a um cliente ou projeto específico                                    |
| **Prioridade**           | Must                                                                                                                                        |
| **Critério de aceite**  | Dado um projeto existente, quando o usuário adicionar um link de documento, então ele deve ficar listado e acessível a partir do projeto |
| **User Story vinculada** | US-013                                                                                                                                      |

---

### 3.7 Autenticação e Perfis de Acesso

#### RF-014 — Autenticação de usuários internos

| Campo                          | Valor                                                                                                                                                                         |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-014                                                                                                                                                                        |
| **Módulo**              | Autenticação                                                                                                                                                                |
| **Descrição**          | O sistema deve autenticar os usuários internos (Administrador, Colaborador Interno, Colaborador Externo) por login e senha antes de permitir acesso ao painel administrativo |
| **Prioridade**           | Must                                                                                                                                                                          |
| **Critério de aceite**  | Dado um usuário interno cadastrado, quando ele inserir credenciais válidas, então deve acessar o painel administrativo correspondente ao seu perfil                        |
| **User Story vinculada** | US-014                                                                                                                                                                        |

#### RF-015 — Diferenciação de permissões entre perfis internos

| Campo                          | Valor                                                                                                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ID**                   | RF-015                                                                                                                                                                                           |
| **Módulo**              | Autenticação                                                                                                                                                                                   |
| **Descrição**          | O sistema deve restringir o acesso do Colaborador Interno e do Colaborador Externo conforme o modelo de perfis da Seção 3.9 — escopo de atribuição, dados sensíveis e nível de permissão |
| **Prioridade**           | Must                                                                                                                                                                                             |
| **Critério de aceite**  | Ver critérios de aceite RF-018 a RF-021 (Seção 3.9)                                                                                                                                           |
| **User Story vinculada** | —                                                                                                                                                                                               |

### 3.8 Comentários em Subtarefa, Tarefa e Projeto

> Os requisitos desta seção em diante (3.8 a 3.13) foram detalhados após o fechamento da
> Proposta Comercial Enxuta (06/08/2026), numa rodada de esclarecimento de escopo com a
> Talita. André decidiu conscientemente absorver esse detalhamento sem aditivo contratual —
> tratam-se de especificações mais precisas do sistema que já estava sendo construído, não
> de funcionalidades cobradas à parte.

#### RF-016 — Comentários em subtarefa, tarefa e projeto

| Campo                          | Valor                                                                                                                                                                              |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-016                                                                                                                                                                             |
| **Módulo**              | Projetos e Tarefas (extensão)                                                                                                                                                     |
| **Descrição**          | O sistema deve permitir adicionar comentários de texto em três níveis: subtarefa, tarefa e projeto                                                                              |
| **Prioridade**           | Must                                                                                                                                                                               |
| **Critério de aceite**  | Dado um projeto, tarefa ou subtarefa existente, quando o usuário adicionar um comentário, então ele deve ficar visível associado ao item correspondente, com autor e data/hora |
| **User Story vinculada** | —                                                                                                                                                                                 |

#### RF-017 — Anexo de imagem e link em comentário

| Campo                          | Valor                                                                                                                                           |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-017                                                                                                                                          |
| **Módulo**              | Projetos e Tarefas (extensão)                                                                                                                  |
| **Descrição**          | O sistema deve permitir anexar uma imagem e/ou um link a um comentário (não inclui upload de documento)                                       |
| **Prioridade**           | Must                                                                                                                                            |
| **Critério de aceite**  | Dado um comentário sendo criado, quando o usuário anexar uma imagem ou colar um link, então ambos devem ficar visíveis junto ao comentário |
| **User Story vinculada** | —                                                                                                                                              |
| **Nota técnica**        | Imagem armazenada como arquivo (MinIO), não como blob no banco — ver ADD, ADR-003                                                             |

### 3.9 Sistema de Perfis e Permissões (detalhamento do escopo original)

#### RF-018 — Perfil Colaborador Interno com escopo por projeto

| Campo                          | Valor                                                                                                                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-018                                                                                                                                                                                  |
| **Módulo**              | Autenticação / Permissões                                                                                                                                                            |
| **Descrição**          | O Colaborador Interno deve ser atribuído a um ou mais projetos específicos, visualizando todas as tarefas e subtarefas dentro desses projetos, sem acesso a projetos não atribuídos |
| **Prioridade**           | Must                                                                                                                                                                                    |
| **Critério de aceite**  | Dado um Colaborador Interno atribuído ao Projeto X, quando ele acessar o sistema, então deve ver apenas o Projeto X (e suas tarefas/subtarefas), não outros projetos                 |
| **User Story vinculada** | —                                                                                                                                                                                      |

#### RF-019 — Perfil Colaborador Externo com escopo por tarefa

| Campo                          | Valor                                                                                                                                                             |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-019                                                                                                                                                            |
| **Módulo**              | Autenticação / Permissões                                                                                                                                      |
| **Descrição**          | O Colaborador Externo deve ser atribuído a tarefas específicas (não ao projeto inteiro), podendo comentar e finalizar apenas essas tarefas                     |
| **Prioridade**           | Must                                                                                                                                                              |
| **Critério de aceite**  | Dado um Colaborador Externo atribuído à Tarefa Y, quando ele acessar o sistema, então deve ver apenas a Tarefa Y, podendo comentar e marcá-la como finalizada |
| **User Story vinculada** | —                                                                                                                                                                |

#### RF-020 — Restrição de dados sensíveis para Colaborador Interno e Externo

| Campo                          | Valor                                                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-020                                                                                                                                                        |
| **Módulo**              | Autenticação / Permissões                                                                                                                                  |
| **Descrição**          | O sistema deve ocultar campos de valor e telefone dos dados cadastrais do cliente para os perfis Colaborador Interno e Colaborador Externo                    |
| **Prioridade**           | Must                                                                                                                                                          |
| **Critério de aceite**  | Dado um Colaborador Interno/Externo visualizando um cliente, quando acessar os dados cadastrais, então os campos de valor e telefone não devem ser exibidos |
| **User Story vinculada** | —                                                                                                                                                            |

#### RF-021 — Conclusão de subtarefa restrita ao responsável ou à Talita

| Campo                             | Valor                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                      | RF-021                                                                                                                                                                                                                                                                                                                                                                                            |
| **Módulo**                 | Projetos e Tarefas (extensão)                                                                                                                                                                                                                                                                                                                                                                    |
| **Descrição**             | Apenas a pessoa atribuída a uma subtarefa específica, ou o Administrador (Talita), pode marcá-la como concluída — mesmo que outra pessoa tenha acesso à tarefa/projeto (incluindo o Colaborador Interno atribuído ao projeto inteiro). Isso é uma permissão**distinta** de gerir a subtarefa (criar/editar/reordenar itens), que é exclusiva do Administrador, conforme RN-007 |
| **Prioridade**              | Must                                                                                                                                                                                                                                                                                                                                                                                              |
| **Critério de aceite**     | Dado uma subtarefa atribuída à Pessoa A, quando a Pessoa B (com acesso à mesma tarefa/projeto, mas não atribuída àquela subtarefa) tentar marcar como concluída, então o sistema deve bloquear a ação, mesmo que a Pessoa B seja um Colaborador Interno com acesso ao projeto inteiro                                                                                                   |
| **User Story vinculada**    | —                                                                                                                                                                                                                                                                                                                                                                                                |
| **Nota de implementação** | Descoberto em teste de integração (Sprint 1): a primeira implementação permitia que o Colaborador Interno concluísse subtarefas de outras pessoas dentro do seu próprio projeto, violando esta regra. Corrigido separando a permissão de "gerir subtarefas" da permissão de "marcar concluída"                                                                                            |

### 3.10 Notificações Configuráveis (detalhamento do escopo original)

#### RF-022 — Configuração de notificações por perfil

| Campo                          | Valor                                                                                                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-022                                                                                                                                                                          |
| **Módulo**              | Notificações                                                                                                                                                                  |
| **Descrição**          | A Talita deve poder configurar quais eventos cada perfil recebe notificação (não configurável por pessoa individual)                                                        |
| **Prioridade**           | Must                                                                                                                                                                            |
| **Critério de aceite**  | Dado o painel de configuração de notificações, quando a Talita alterar a configuração de um perfil, então todos os usuários daquele perfil passam a seguir a nova regra |
| **User Story vinculada** | —                                                                                                                                                                              |

#### RF-023 — Notificação de conclusão de tarefa e projeto

| Campo                          | Valor                                                                                                                                                          |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-023                                                                                                                                                         |
| **Módulo**              | Notificações                                                                                                                                                 |
| **Descrição**          | O sistema deve notificar, por e-mail e dentro do sistema (in-app), quando uma tarefa ou projeto for concluído, conforme a configuração de perfil (RF-022)   |
| **Prioridade**           | Must                                                                                                                                                           |
| **Critério de aceite**  | Dado uma tarefa marcada como concluída, quando isso ocorrer, então os perfis configurados para receber esse evento devem ser notificados por e-mail e in-app |
| **User Story vinculada** | —                                                                                                                                                             |
| **Nota técnica**        | Notificação in-app é um componente novo, não previsto na proposta original — implica em nova tabela de notificações e indicador de "não lida"          |

### 3.11 Status e Etiquetas (detalhamento do escopo original)

#### RF-024 — Status de projeto e tarefa

| Campo                          | Valor                                                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-024                                                                                                                                                  |
| **Módulo**              | Projetos e Tarefas (extensão)                                                                                                                          |
| **Descrição**          | Projetos e tarefas devem ter um campo de status fixo, escolhido numa lista fechada (abaixo), distinto do cálculo automático de "% em dia" (RF-009). São coisas diferentes: o status é declarado por quem opera; o "% em dia" é derivado do prazo e da conclusão (RN-001) |
| **Prioridade**           | Must                                                                                                                                                    |
| **Critério de aceite**  | Dado um projeto ou tarefa, quando o usuário alterar o status, então o novo valor deve ser exibido no painel correspondente                            |
| **User Story vinculada** | —                                                                                                                                                      |
| **Nota**                 | Lista validada com a Talita em 16/09/2026. Apenas o Administrador escolhe livremente entre os valores; o colaborador tem uma única ação, "Marcar como concluída" (RN-007) |

**Status de projeto (4), padrão "A iniciar":**

| Valor | Observação |
|---|---|
| A iniciar | padrão na criação (RF-038) |
| Em andamento | |
| Concluído | |
| Cancelado | |

**Status de tarefa (9), padrão "A iniciar":**

| Valor | Observação |
|---|---|
| A iniciar | padrão na criação |
| Em andamento | |
| Aguardando documento do cliente | |
| Visita/reunião agendada | ganha marcador próprio na Agenda (RF-036) |
| Protocolado | |
| Sob análise do órgão ambiental | |
| Com exigência a cumprir | |
| Concluído | único valor que o colaborador alcança, e só na tarefa atribuída a ele (RN-007) |
| Cancelado | encerra a série inteira de uma tarefa recorrente (RN-008) |

Os valores são fechados no banco (enum) desde a Sprint 4A. Acrescentar ou renomear um valor
depois exige migration: a lista muda por decisão registrada, não por ajuste de tela.

#### RF-025 — Etiquetas em subtarefa

| Campo                          | Valor                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-025                                                                                                                    |
| **Módulo**              | Projetos e Tarefas (extensão)                                                                                            |
| **Descrição**          | Subtarefas devem permitir etiquetas livres/customizáveis (tags), distintas do campo de status                            |
| **Prioridade**           | Must                                                                                                                      |
| **Critério de aceite**  | Dado uma subtarefa, quando o usuário adicionar uma etiqueta, então ela deve ficar visível e ser filtrável na listagem |
| **User Story vinculada** | —                                                                                                                        |

### 3.12 Cadastro de Pessoa Jurídica Expandido (detalhamento do escopo original)

#### RF-026 — Cadastro de Responsável Legal

| Campo                          | Valor                                                                                                                                                                         |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-026                                                                                                                                                                        |
| **Módulo**              | Cadastro de Clientes (extensão)                                                                                                                                              |
| **Descrição**          | O sistema deve permitir cadastrar o Responsável Legal da empresa: nome, endereço, RG, CPF, telefone, e-mail                                                                 |
| **Prioridade**           | Must                                                                                                                                                                          |
| **Critério de aceite**  | Dado um cliente cadastrado, quando o usuário preencher os dados do Responsável Legal, então devem ser salvos e vinculados ao cliente                                       |
| **User Story vinculada** | —                                                                                                                                                                            |
| **Nota**                 | Aplica-se apenas a Pessoa Jurídica. Para Pessoa Física, não existe Responsável Legal separado — a própria pessoa cadastrada (RF-035) já é quem responde pelo cadastro |

#### RF-027 — Cadastro de Ponto de Contato com herança de dados

| Campo                          | Valor                                                                                                                                                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-027                                                                                                                                                                                                                          |
| **Módulo**              | Cadastro de Clientes (extensão)                                                                                                                                                                                                |
| **Descrição**          | Quando o Ponto de Contato for a mesma pessoa que o Responsável Legal, o sistema deve copiar automaticamente os dados já cadastrados (nome, endereço, RG, CPF, telefone, e-mail) e solicitar apenas o campo adicional "cargo" |
| **Prioridade**           | Must                                                                                                                                                                                                                            |
| **Critério de aceite**  | Dado um Responsável Legal já cadastrado, quando o usuário marcar "mesmo que o Ponto de Contato", então os campos devem ser preenchidos automaticamente, restando apenas "cargo" a preencher                                 |
| **User Story vinculada** | —                                                                                                                                                                                                                              |
| **Nota**                 | Aplica-se apenas a Pessoa Jurídica, pelo mesmo motivo do RF-026                                                                                                                                                                |

#### RF-028 — Cadastro de Pessoas Envolvidas (revisado — substitui "Pessoas do Operacional")

| Campo                          | Valor                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ID**                   | RF-028                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Módulo**              | Cadastro de Clientes (extensão)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Descrição**          | O sistema deve permitir cadastrar múltiplas**Pessoas Envolvidas** vinculadas a um cliente (PF ou PJ). Cada Pessoa Envolvida tem um tipo — **Pessoa** (indivíduo) ou **Empresa/PJ envolvida** — que determina os campos exibidos no formulário: • **Pessoa**: nome, CPF, telefone, e-mail• **Empresa/PJ envolvida**: razão social (no lugar de nome), CNPJ, telefone, e-mailEm ambos os tipos, **nome/razão social, telefone e e-mail são obrigatórios**; CPF/CNPJ são opcionais. No final do formulário, um checkbox pergunta se essa pessoa **"é um colaborador"** (campo `tem_acesso`). Quando marcado, o sistema cria automaticamente um Usuário com perfil **Colaborador Externo**, vinculado a essa Pessoa Envolvida, disparando o e-mail de definição de senha (mesmo fluxo do RF-030). Quando não marcado, a pessoa fica registrada apenas como referência — sem login — podendo ainda assim ser definida como responsável de tarefa/subtarefa (RF-005) apenas para fins de controle e registro |
| **Prioridade**           | Must                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Critério de aceite**  | Dado um cliente cadastrado (PF ou PJ), quando o usuário adicionar uma Pessoa Envolvida, então ela deve ficar listada como vinculada a esse cliente, com os campos correspondentes ao tipo escolhido (Pessoa ou Empresa/PJ). Dado uma Pessoa Envolvida sendo cadastrada com o checkbox "é um colaborador" marcado, então um Usuário Colaborador Externo deve ser criado automaticamente, vinculado a essa pessoa, com e-mail de definição de senha enviado. Dado o checkbox não marcado, então nenhum Usuário é criado — a pessoa existe apenas como registro de referência                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **User Story vinculada** | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Nota**                 | Aplica-se a**ambos** os tipos de cliente — inclusive Pessoa Física. Substitui e generaliza o RF-028 anterior ("Pessoas do Operacional") — renomeado a pedido da Talita na reunião de aprovação da Sprint 2                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Nota técnica**        | Ver ADR-007 no ADD —`PessoaOperacional` renomeada para `PessoaEnvolvida`, com colunas `tipo` (pessoa/empresa) e `tem_acesso` (boolean)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

### 3.13 Controle de Acesso do Cliente (detalhamento do escopo original)

#### RF-029 — Bloqueio de acesso do cliente pela Talita

| Campo                          | Valor                                                                                                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-029                                                                                                                                                   |
| **Módulo**              | Área Exclusiva do Cliente (extensão)                                                                                                                   |
| **Descrição**          | A Talita deve poder bloquear o login de um cliente à Área Exclusiva, sem excluir os dados do cliente/projeto do sistema                                |
| **Prioridade**           | Must                                                                                                                                                     |
| **Critério de aceite**  | Dado um cliente com acesso bloqueado, quando ele tentar logar, então o acesso deve ser negado, mas seus dados continuam visíveis para a equipe interna |
| **User Story vinculada** | —                                                                                                                                                       |

### 3.14 Onboarding e Recuperação de Acesso

> Lacuna identificada no checklist de qualidade (tipo SaaS multi-perfil) — nenhum requisito
> anterior cobria como um usuário novo entra no sistema ou recupera acesso perdido. Adicionado
> antes da Sprint 1 porque afeta diretamente a modelagem de autenticação.

#### RF-030 — Criação de usuário interno pela Talita

| Campo                          | Valor                                                                                                                                                                                                                                                                  |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-030                                                                                                                                                                                                                                                                 |
| **Módulo**              | Autenticação (extensão)                                                                                                                                                                                                                                             |
| **Descrição**          | A Talita deve poder cadastrar um novo usuário interno (Colaborador Interno ou Externo), definindo seu nome e e-mail (obrigatórios), o perfil de acesso e o(s) projeto(s)/tarefa(s) ao(s) qual(is) ele é atribuído. O cadastro aceita ainda, de forma **opcional**, cargo ou função, telefone, CPF **ou** CNPJ (a pessoa é física ou jurídica, nunca as duas) e observações. O sistema deve enviar um e-mail ao novo usuário com um link para definir a própria senha |
| **Prioridade**           | Must                                                                                                                                                                                                                                                                   |
| **Critério de aceite**  | Dado que a Talita cadastre um novo usuário, quando o cadastro for salvo, então o sistema deve enviar um e-mail com link de definição de senha, e o usuário não deve conseguir logar antes de defini-la. Dado que os campos opcionais fiquem em branco, quando o cadastro for salvo, então ele deve ser aceito assim mesmo. Dado um CPF ou CNPJ preenchido com formato inválido, quando o cadastro for salvo, então o sistema deve recusar com erro inline no campo, sem perder o restante do formulário |
| **Nota**                 | Campos opcionais seguem o princípio do RF-002d: em branco vira NULL, com validação de formato só quando preenchidos — não travam a criação de um acesso urgente. CPF e CNPJ não são únicos no banco: quem identifica o usuário é o e-mail |
| **User Story vinculada** | —                                                                                                                                                                                                                                                                     |

#### RF-031 — Criação de acesso do cliente

| Campo                          | Valor                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-031                                                                                                                                                                                                                                                                                                                                   |
| **Módulo**              | Autenticação (extensão)                                                                                                                                                                                                                                                                                                               |
| **Descrição**          | Ao cadastrar um cliente Pessoa Jurídica (RF-001), o sistema deve permitir gerar um acesso de login para o Ponto de Contato, com o mesmo fluxo de definição de senha por e-mail do RF-030. Para cliente Pessoa Física (RF-035), o acesso é gerado diretamente para a própria pessoa cadastrada, sem Ponto de Contato intermediário |
| **Prioridade**           | Must                                                                                                                                                                                                                                                                                                                                     |
| **Critério de aceite**  | Dado um cliente recém-cadastrado, quando a Talita optar por criar o acesso, então o destinatário do e-mail de definição de senha deve ser o Ponto de Contato (PJ) ou a própria pessoa (PF)                                                                                                                                         |
| **User Story vinculada** | —                                                                                                                                                                                                                                                                                                                                       |

#### RF-032 — Recuperação de senha

| Campo                          | Valor                                                                                                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-032                                                                                                                                                                                      |
| **Módulo**              | Autenticação (extensão)                                                                                                                                                                  |
| **Descrição**          | Todo usuário (interno ou cliente) deve poder solicitar redefinição de senha via "esqueci minha senha", recebendo um link por e-mail                                                      |
| **Prioridade**           | Must                                                                                                                                                                                        |
| **Critério de aceite**  | Dado um usuário na tela de login, quando ele clicar em "esqueci minha senha" e informar o e-mail cadastrado, então deve receber um link válido por tempo limitado para redefinir a senha |
| **User Story vinculada** | —                                                                                                                                                                                          |
| **Nota técnica**        | Auth.js (adapter Postgres) suporta esse fluxo nativamente — sem necessidade de biblioteca adicional                                                                                        |

#### RF-033 — Promoção posterior de Pessoa Envolvida a Colaborador Externo (revisado)

| Campo                          | Valor                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-033                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Módulo**              | Autenticação (extensão)                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Descrição**          | O sistema deve permitir "promover" uma Pessoa Envolvida (RF-028) cadastrada com`tem_acesso = não` a um login de Colaborador Externo a qualquer momento depois, sem precisar recadastrar a pessoa — reaproveitando o mesmo fluxo de convite por e-mail (padrão do RF-031). Esta é a via **posterior**: a criação de acesso no momento do cadastro já é coberta pelo checkbox "é um colaborador" do RF-028; este RF cobre o caso de decidir dar acesso depois |
| **Prioridade**           | Must                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Critério de aceite**  | Dado uma Pessoa Envolvida já cadastrada com`tem_acesso = não`, quando o usuário clicar em "Criar acesso" a partir dela, então um novo Usuário com perfil Colaborador Externo deve ser criado, vinculado a essa pessoa (`tem_acesso` passa a `sim`), com e-mail de definição de senha enviado, sem duplicar o cadastro da pessoa                                                                                                                                 |
| **User Story vinculada** | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Nota técnica**        | FK opcional e única (`pessoa_operacional_id`, renomeada para a entidade `PessoaEnvolvida` no ADR-007) na tabela `Usuario`, não fusão das duas entidades — evita conflito com o schema esperado pelo Auth.js (mesmo motivo do ADR-003/004). A tabela `Atribuicao` continua referenciando apenas `Usuario`, sem mudança                                                                                                                                         |
| **Origem**               | Identificado durante teste manual da Sprint 2 — registrado como ADR-005 no ADD. Revisado na reunião de aprovação da Sprint 2 pra refletir o novo fluxo inline do RF-028                                                                                                                                                                                                                                                                                                  |

### 3.15 Tipo de Cliente: Pessoa Física e Pessoa Jurídica (correção estrutural)

> Identificado durante o desenvolvimento da Sprint 2 — o modelo de Cliente foi construído
> assumindo apenas Pessoa Jurídica, mas a Múltiplus atende também Pessoa Física (ex.:
> proprietário rural individual). Esta seção corrige essa lacuna antes da aprovação da
> Sprint 2 com a Talita. Ver ADR-006 no ADD para a decisão de modelo de dados.

#### RF-034 — Seleção de tipo de cliente

| Campo                          | Valor                                                                                                                                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-034                                                                                                                                                                                               |
| **Módulo**              | Cadastro de Clientes (correção estrutural)                                                                                                                                                         |
| **Descrição**          | O cadastro de cliente deve começar pela escolha do tipo: Pessoa Física ou Pessoa Jurídica. Os campos e fluxos seguintes (RF-001 vs RF-035, RF-026/027 aplicáveis ou não) dependem dessa escolha |
| **Prioridade**           | Must                                                                                                                                                                                                 |
| **Critério de aceite**  | Dado o início de um novo cadastro, quando o usuário escolher o tipo, então o formulário deve exibir os campos correspondentes (PF ou PJ)                                                         |
| **User Story vinculada** | —                                                                                                                                                                                                   |

#### RF-035 — Cadastro de cliente Pessoa Física

| Campo                          | Valor                                                                                                                                                                                                                   |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-035                                                                                                                                                                                                                  |
| **Módulo**              | Cadastro de Clientes (correção estrutural)                                                                                                                                                                            |
| **Descrição**          | Quando o tipo de cliente for Pessoa Física (RF-034), o sistema deve permitir cadastrar: nome, CPF, RG, endereço, CEP, município — sem auto-preenchimento (não existe consulta pública por CPF, diferente do CNPJ) |
| **Prioridade**           | Must                                                                                                                                                                                                                    |
| **Critério de aceite**  | Dado o tipo Pessoa Física selecionado, quando o usuário preencher os campos obrigatórios, então o cliente deve ser salvo com esses dados, sem Responsável Legal ou Ponto de Contato associados                     |
| **User Story vinculada** | —                                                                                                                                                                                                                      |
| **Nota**                 | RF-026 e RF-027 não se aplicam a este tipo — a pessoa cadastrada aqui é, ela mesma, quem recebe o acesso (RF-031)                                                                                                    |

---

### 3.16 Administração e Acesso (Sprint 3)

> Módulo identificado como lacuna no planejamento de 14/09/2026. O RF-030 e o RF-032 já
> existiam no SRS desde a v1.3, mas nunca haviam sido desenhados em tela nem alocados a
> nenhuma sprint — e são pré-requisito das telas de colaborador do módulo de Projetos e
> Tarefas, que dependem de `Atribuicao` populada. Os requisitos abaixo vêm do documento
> complementar `docs/rfs-novos-srs-multiplus.md`, que os numerava como seção 3.17; entram
> aqui como 3.16 para continuar a numeração deste arquivo sem deixar buraco.

#### RF-039 — Desativação de registros (soft delete)

| Campo | Valor |
| ------ | ------ |
| **ID** | RF-039 |
| **Módulo** | Transversal |
| **Descrição** | O sistema não deve oferecer exclusão permanente de registros. Em vez disso, Projeto, Tarefa, Subtarefa, Cliente, Pessoa Envolvida, Documento e Usuário devem poder ser **desativados**, mantendo o registro e seu histórico no banco. Registro desativado fica oculto das listagens por padrão (revelável por um toggle "Mostrar desativados"), é somente leitura, e sai de todo cálculo e visão gerencial: não entra no "% em dia" (RF-009), não aparece na Agenda (RF-036) nem no Painel de Prazos (RF-037), e não dispara notificação de prazo (RF-007). Apenas o Administrador desativa e reativa (RN-007) |
| **Prioridade** | Must |
| **Critério de aceite** | Dado um registro ativo, quando o Administrador o desativar, então ele deve sumir das listagens padrão e sair de todos os indicadores, sem ser apagado. Dado um registro desativado, quando o Administrador o reativar, então ele deve voltar ao estado anterior à desativação. Dado um projeto desativado, quando um usuário tentar acessar suas tarefas, então elas também devem estar inacessíveis, sem terem sido marcadas individualmente como desativadas |
| **Nota técnica** | Colunas `ativo` (boolean, padrão true), `desativado_em`, `desativado_por`. A cascata é por herança de acesso, não por marcação dos filhos — marcar cada filho tornaria a reativação uma operação destrutiva de informação. Ver **ADR-008** no ADD. Em `Usuario` a coluna `ativo` já existia desde a Sprint 1 com a semântica do RF-029 (bloquear acesso do cliente), que é a mesma operação, e foi reaproveitada em vez de duplicada |
| **Status** | Implementado na Sprint 3 para Cliente, Pessoa Envolvida, Documento e Usuário. Projeto, Tarefa e Subtarefa entram na Sprint 4, quando essas tabelas tiverem CRUD |

#### RF-040 — Gestão de usuários internos

| Campo | Valor |
| ------ | ------ |
| **ID** | RF-040 |
| **Módulo** | Autenticação / Administração |
| **Descrição** | O sistema deve oferecer ao Administrador uma listagem de todos os usuários internos, com busca por nome, e-mail ou cargo, filtro por perfil e indicação do status de acesso (Ativo, Pendente de ativação, Desativado) e da quantidade de atribuições de cada um. A partir dela deve ser possível criar, editar, reenviar convite e desativar/reativar um usuário (RF-039) |
| **Prioridade** | Must |
| **Critério de aceite** | Dado o Administrador logado, quando acessar a listagem de usuários, então deve visualizar todos os usuários internos com perfil e status. Dado um usuário desativado, quando ele tentar logar, então o acesso deve ser negado, mas seu histórico de comentários e conclusões permanece visível no sistema. Dado um usuário com zero atribuições, quando a listagem for exibida, então essa condição deve ser sinalizada visualmente |
| **Nota** | Desativar um usuário nunca apaga seu histórico — mesma lógica do RF-029 para o cliente. O status de acesso é derivado de `ativo` mais a existência de senha definida; não é um campo à parte |
| **Nota — troca de perfil descarta atribuições** | Alterar o perfil de um usuário existente **remove as atribuições da granularidade antiga**, porque a granularidade é consequência do perfil (RN-005): as linhas de Colaborador Interno (por projeto) não valem para um Colaborador Externo (por tarefa), e mantê-las deixaria atribuições que a RLS nunca honra — a listagem anunciaria um acesso que não existe. O sistema informa quantas atribuições saíram, em vez de fazer isso em silêncio, e refazê-las é manual. Consequência prática: trocar o perfil de alguém **perde a informação de a quais projetos ou tarefas ele estava vinculado**. Comportamento identificado na auditoria da Sprint 3 (achado D): era decisão de implementação, correta, mas não constava de requisito nenhum |

#### RF-041 — Gestão de atribuições

| Campo | Valor |
| ------ | ------ |
| **ID** | RF-041 |
| **Módulo** | Autenticação / Permissões |
| **Descrição** | O sistema deve permitir ao Administrador vincular e desvincular um usuário a projetos (Colaborador Interno) ou a tarefas (Colaborador Externo), respeitando a granularidade de cada perfil (RN-005). A atribuição deve poder ser feita tanto no cadastro do usuário (RF-030) quanto posteriormente, a qualquer momento. Atribuições criadas automaticamente por definição de responsável (RN-006) devem ser identificadas como tais e não podem ser removidas manualmente — a remoção se dá trocando o responsável da tarefa |
| **Prioridade** | Must |
| **Critério de aceite** | Dado um Colaborador Interno, quando o Administrador o atribuir a um projeto, então ele deve passar a visualizar todas as tarefas e subtarefas daquele projeto. Dado um Colaborador Externo, quando for atribuído a uma tarefa, então deve visualizar apenas aquela tarefa. Dado uma atribuição de origem automática (RN-006), quando o Administrador tentar removê-la diretamente, então o sistema deve bloquear a ação e orientar a trocar o responsável da tarefa |
| **Nota** | Fecha a ação pendente registrada no ADR-005 ("solicitar a atribuição de tarefa(s)/projeto(s) na mesma tela"). A origem "automática" é derivada de a tarefa ter como responsável a Pessoa Envolvida daquele usuário — não é persistida numa coluna, para manter uma fonte de verdade só |

#### RF-042 — Perfil próprio do usuário

| Campo | Valor |
| ------ | ------ |
| **ID** | RF-042 |
| **Módulo** | Autenticação (extensão) |
| **Descrição** | Todo usuário autenticado deve poder visualizar e editar seus próprios dados básicos (nome), alterar a própria senha informando a senha atual, e consultar suas atribuições em modo somente leitura. O e-mail é somente leitura para perfis não-Administrador — apenas o Administrador altera e-mail de usuário |
| **Prioridade** | Must |
| **Critério de aceite** | Dado um usuário logado, quando acessar "Meu Perfil", então deve visualizar seus dados e suas atribuições. Dado que ele informe a senha atual correta e uma nova senha válida, quando confirmar, então a senha deve ser alterada. Dado um usuário não-Administrador, quando acessar o perfil, então o campo de e-mail deve estar em modo somente leitura |

#### RF-043 — Navegação e tela inicial por perfil

| Campo | Valor |
| ------ | ------ |
| **ID** | RF-043 |
| **Módulo** | Transversal / Navegação |
| **Descrição** | O menu do sistema deve exibir apenas os itens acessíveis ao perfil autenticado — itens não acessíveis **não aparecem**, não ficam desabilitados (mesma lógica do RF-020). Cada perfil tem uma tela inicial definida após o login: Administrador no Painel de Tarefas por Prazo (RF-037), com menu Prazos, Agenda, Clientes, Projetos, Usuários, Notificações e Perfil; Colaborador Interno em Meus Projetos, com menu Meus Projetos e Perfil; Colaborador Externo em Minhas Tarefas, com menu Minhas Tarefas e Perfil; Cliente na Área Exclusiva (Sprint 6) |
| **Prioridade** | Must |
| **Critério de aceite** | Dado um usuário autenticado, quando o login for concluído, então ele deve ser direcionado à tela inicial do seu perfil. Dado um Colaborador Interno ou Externo, quando visualizar o menu, então os itens Agenda, Prazos, Clientes e Usuários não devem estar presentes. Dado uma tentativa de acesso direto por URL a rota fora do perfil, então o sistema deve negar o acesso |
| **Nota** | A escolha do Painel de Prazos como tela inicial do Administrador se deve a ser a tela de trabalho diário, já ordenada por urgência e filtrada com pendentes |
| **Status** | Implementado na Sprint 3. O menu do Administrador traz, por ora, apenas Clientes, Usuários e Perfil, e a tela inicial dele é o painel de Clientes: os demais itens entram conforme a Sprint 4 construir cada tela, porque item de menu que leva a rota inexistente é pior que a ausência dele |

---

### 3.17 Complementos do módulo de Projetos e Tarefas (Sprint 4)

#### RF-038 — Campos do cadastro de projeto

| Campo | Valor |
| ------ | ------ |
| **ID** | RF-038 |
| **Módulo** | Projetos e Tarefas |
| **Descrição** | O cadastro de projeto (RF-004) deve conter: cliente vinculado (obrigatório, não editável após a criação), nome do projeto (obrigatório), descrição (opcional, texto longo), data de início (opcional), data prevista de conclusão (opcional) e status (obrigatório, lista do RF-024, padrão "A iniciar") |
| **Prioridade** | Must |
| **Critério de aceite** | Dado o formulário de projeto, quando o usuário preencher cliente e nome e salvar, então o projeto deve ser criado com status "A iniciar". Dado que data de início e data prevista de conclusão sejam preenchidas, quando a conclusão for anterior ao início, então o sistema deve bloquear o salvamento com erro inline |
| **Origem** | Lacuna identificada no planejamento da Sprint 4 — o SRS não definia nenhum campo de projeto além de cliente e status |

#### RF-046 — Visibilidade do cliente para Colaborador Externo

| Campo | Valor |
| ------ | ------ |
| **ID** | RF-046 |
| **Módulo** | Autenticação / Permissões |
| **Descrição** | O Colaborador Externo deve visualizar **apenas o nome/razão social** do cliente associado à tarefa atribuída, em modo somente leitura e sem link de navegação para o cadastro do cliente. Não devem ser exibidos CNPJ/CPF, endereço, segmento, atividade principal, porte, município, telefone (já coberto pelo RF-020) ou qualquer outro dado cadastral |
| **Prioridade** | Must |
| **Critério de aceite** | Dado um Colaborador Externo visualizando uma tarefa atribuída, quando a tela for renderizada, então deve exibir o nome do cliente e nenhum outro dado cadastral. Dado uma tentativa de acesso direto ao cadastro daquele cliente por URL, então o acesso deve ser negado |
| **Nota** | Decisão de negócio a validar com a Talita: o Colaborador Externo pode ser terceiro de fora da Múltiplus, e expor a carteira de clientes tem implicação de confidencialidade e LGPD (RNF-002). O acesso foi liberado porque trabalho ambiental sem saber de qual empreendimento se trata é impraticável |

#### RF-047 — Imutabilidade de comentários

| Campo | Valor |
| ------ | ------ |
| **ID** | RF-047 |
| **Módulo** | Projetos e Tarefas (extensão) |
| **Descrição** | Comentários publicados (RF-016) não podem ser editados nem removidos por nenhum perfil, incluindo o Administrador. O comentário é registro histórico com autor e data/hora |
| **Prioridade** | Should |
| **Critério de aceite** | Dado um comentário publicado, quando qualquer perfil visualizar o item, então não devem existir ações de editar ou excluir aquele comentário |
| **Nota** | Em contexto de prazo regulatório ambiental, o histórico de quem disse o quê e quando tem valor probatório — permitir edição posterior esvaziaria isso |

---

### 3.18 Fechamento do projeto (Sprint 7)

#### RF-044 — Migração assistida dos dados existentes

| Campo | Valor |
| ------ | ------ |
| **ID** | RF-044 |
| **Módulo** | Fechamento |
| **Descrição** | Migração dos dados hoje mantidos em planilhas, Trello e Google Drive para o sistema — clientes, projetos, tarefas com prazo, licenças e links de documentos, conforme previsto na Proposta Comercial Enxuta |
| **Prioridade** | Must |
| **Critério de aceite** | Dado o conjunto de dados existentes fornecido pela Talita, quando a migração for concluída, então os registros devem estar acessíveis no sistema com os mesmos prazos e vínculos da origem, validados por amostragem com a Talita |
| **Nota** | Já constava dos Critérios de Aceite Globais do SRS, mas nunca havia sido escrito como requisito nem alocado a sprint. **É entregável contratual** — se a Talita espera migrar antes de usar o sistema de verdade, precisa subir na ordem do roadmap |

#### RF-045 — Exclusão de dados sob solicitação (LGPD)

| Campo | Valor |
| ------ | ------ |
| **ID** | RF-045 |
| **Módulo** | Conformidade |
| **Descrição** | O sistema deve permitir ao Administrador atender a uma solicitação de exclusão de dados pessoais, conforme exigido pelo RNF-002. Diferente do RF-039 (desativação), esta operação remove ou anonimiza efetivamente os dados pessoais do titular |
| **Prioridade** | Must |
| **Critério de aceite** | Dado uma solicitação de exclusão de dados de um titular, quando o Administrador executar a operação, então os dados pessoais devem ser removidos ou anonimizados, preservando a integridade referencial dos registros operacionais que não identifiquem o titular |
| **Nota** | O RNF-002 exige "possibilidade de exclusão de dados sob solicitação" desde a v1.0 do SRS, sem nenhum requisito funcional que a implementasse. Definir com apoio jurídico o que é removido e o que é anonimizado |

---

## 4. Requisitos Não-Funcionais

#### RNF-001 — Segurança de acesso

| Campo                 | Valor                                                                                        |
| --------------------- | -------------------------------------------------------------------------------------------- |
| **ID**          | RNF-001                                                                                      |
| **Categoria**   | Segurança                                                                                   |
| **Descrição** | O sistema deve garantir que cada cliente autenticado só acesse dados dos próprios projetos |
| **Métrica**    | 0 casos de acesso cruzado entre contas de clientes distintos em teste de QA                  |
| **Prioridade**  | Must                                                                                         |

#### RNF-002 — Conformidade com LGPD

| Campo                 | Valor                                                                                                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**          | RNF-002                                                                                                                                                                      |
| **Categoria**   | Conformidade                                                                                                                                                                 |
| **Descrição** | O sistema deve tratar dados pessoais e de CNPJ dos clientes em conformidade com a LGPD, incluindo controle de acesso e possibilidade de exclusão de dados sob solicitação |
| **Métrica**    | Checklist de conformidade LGPD validado antes da entrega                                                                                                                     |
| **Prioridade**  | Must                                                                                                                                                                         |

#### RNF-003 — Disponibilidade

| Campo                 | Valor                                                                                                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**          | RNF-003                                                                                                                                                               |
| **Categoria**   | Confiabilidade                                                                                                                                                        |
| **Descrição** | O sistema deve estar disponível para acesso da equipe e dos clientes durante o horário comercial, com hospedagem estável conforme plano de manutenção contratado |
| **Métrica**    | Uptime ≥ 99% mensal (melhor esforço, sem SLA formal conforme proposta)                                                                                              |
| **Prioridade**  | Should                                                                                                                                                                |

#### RNF-004 — Usabilidade para usuário leigo

| Campo                 | Valor                                                                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**          | RNF-004                                                                                                                                |
| **Categoria**   | Usabilidade                                                                                                                            |
| **Descrição** | A Área Exclusiva do Cliente deve ser utilizável por um usuário sem conhecimento técnico, sem necessidade de treinamento presencial |
| **Métrica**    | Cliente consegue localizar o status do próprio projeto em até 3 cliques a partir do login                                            |
| **Prioridade**  | Must                                                                                                                                   |

#### RNF-005 — Desempenho do painel

| Campo                 | Valor                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **ID**          | RNF-005                                                                                                                                    |
| **Categoria**   | Performance                                                                                                                                |
| **Descrição** | O painel central de clientes e o indicador de "% em dia" devem carregar rapidamente mesmo com o crescimento do volume de clientes/projetos |
| **Métrica**    | Tempo de carregamento do painel < 2s em condições normais de uso                                                                         |
| **Prioridade**  | Should                                                                                                                                     |

---

## 5. Regras de Negócio

| ID     | Regra                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Exemplo concreto                                                                                                                                                                                                                                                                               |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RN-001 | *(a validar)* Uma tarefa é considerada "atrasada" para fins do indicador de % em dia quando seu prazo vence sem que ela esteja marcada como concluída                                                                                                                                                                                                                                                                                                                | Tarefa com prazo 10/09 não concluída até 11/09 conta como atrasada                                                                                                                                                                                                                          |
| RN-002 | *(a validar)* A recorrência de uma tarefa é definida por tipo de condicionante/licença. Complementada pela RN-008 quanto à ancoragem do cálculo (prazo original, não data de conclusão) e ao efeito do cancelamento (encerra a série inteira)                                                                                                                                                                                                                                                                                                                                                                              | Renovação de LO pode ser anual; outros condicionantes podem ter periodicidade diferente                                                                                                                                                                                                      |
| RN-003 | O cliente final tem acesso somente de leitura aos próprios dados, sem poder editar tarefas, prazos ou documentos                                                                                                                                                                                                                                                                                                                                                        | Cliente acessa o painel mas os botões de edição ficam ocultos/desabilitados                                                                                                                                                                                                                 |
| RN-004 | A conclusão de uma subtarefa só pode ser feita por quem está atribuído a ela especificamente, ou pelo Administrador (Talita) — independente de outro perfil ter acesso à tarefa/projeto. Esta é uma permissão distinta de "gerir a subtarefa" (criar e editar campos da subtarefa), que é exclusiva do Administrador, conforme RN-007. A distinção continua valendo no outro eixo: a conclusão segue restrita à pessoa responsável ou ao Administrador                                                                                                                                                               | Um Colaborador Interno com acesso ao projeto inteiro vê as subtarefas, mas não marca como concluída uma subtarefa atribuída a outra pessoa — e, desde a RN-007, também não cria, edita nem remove itens                                                                                                                                 |
| RN-005 | Colaborador Interno é atribuído por projeto inteiro; Colaborador Externo é atribuído por tarefa específica — granularidades diferentes de escopo                                                                                                                                                                                                                                                                                                                   | Colaborador Interno vê todas as tarefas do Projeto X; Colaborador Externo só vê a Tarefa Y dentro do Projeto X                                                                                                                                                                              |
| RN-006 | Definir uma Pessoa Envolvida com acesso (`tem_acesso = sim`) como responsável de uma tarefa implica atribuição automática de visualização daquela tarefa a ela — as duas ações (responsável + atribuição) deixam de ser independentes nesse caso específico. Ao **trocar** o responsável de uma tarefa, o `Atribuicao` da pessoa anterior é **removido automaticamente** — ela deixa de ver a tarefa assim que deixa de ser responsável | A Talita marca José (Colaborador Externo) como responsável da Tarefa X; o sistema cria automaticamente o registro de`Atribuicao` da Tarefa X pra ele. Se depois ela troca o responsável pra Maria, o `Atribuicao` do José pra aquela tarefa é removido, e um novo é criado pra Maria |
| RN-007 | Apenas o Administrador cria, edita, desativa e reativa registros (projeto, tarefa, subtarefa, documento, usuário). Colaborador Interno e Externo têm exatamente duas ações de escrita: marcar como concluída uma tarefa atribuída, e marcar como concluída uma subtarefa atribuída a si (RN-004). Colaborador **não tem seletor de status** — tem uma única ação "Marcar como concluída", que move a tarefa para "Concluído"; os outros oito valores do RF-024 são exclusivos do Administrador | Um Colaborador Interno atribuído ao Projeto X vê todas as tarefas, pode concluir as suas, mas não consegue criar uma tarefa nova nem mover uma tarefa para "Protocolado" |
| RN-008 | A próxima ocorrência de uma tarefa recorrente é sempre contada a partir da **data de prazo original**, nunca da data de conclusão. Cancelar uma tarefa recorrente **encerra a série inteira** — nenhuma ocorrência futura é gerada | Tarefa mensal com prazo 10/09 concluída em 20/09 gera a próxima em **10/10**, não 20/10. Se a série derivasse pela data de conclusão, um prazo regulatório anual sairia do lugar ao longo dos anos |
| RN-009 | Registro desativado (RF-039) é excluído de todo cálculo, visão gerencial e disparo automático: "% em dia" (RF-009), Agenda (RF-036), Painel de Prazos (RF-037) e notificação de prazo (RF-007). A desativação de um pai torna os filhos inacessíveis por herança, sem marcá-los individualmente | Desativar um projeto com 12 tarefas tira as 12 de todos os painéis; reativá-lo devolve todas ao estado exato anterior |

---

## 6. Integrações e Interfaces Externas

### 6.1 APIs e Serviços Externos

| Sistema                                   | Tipo                                   | Propósito                                                                        | Auth                    | Criticidade |
| ----------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------- | ----------------------- | ----------- |
| Serviço de consulta CNPJ (ex. BrasilAPI) | REST API                               | Preenchimento automático de dados do cliente no cadastro                         | Sem auth / API pública | Média      |
| API de localidades (ex. IBGE)             | REST API                               | Seleção de Estado/Município no cadastro (RF-002c), em vez de digitação livre | Sem auth / API pública | Média      |
| Serviço de e-mail transacional           | API/SMTP                               | Envio de notificações de prazo                                                  | API Key                 | Alta        |
| Google Drive                              | Link externo (sem integração de API) | Repositório de documentos referenciado por link                                  | N/A                     | Baixa       |

### 6.2 Interfaces de Usuário

Três fluxos principais: (1) painel administrativo interno (Talita/estagiário) para cadastro e gestão
de clientes, projetos, tarefas e licenças; (2) área exclusiva do cliente, somente leitura; (3) fluxo
de notificação por e-mail para alertas de prazo. Wireframes ainda não produzidos — próxima etapa
natural após este SRS.

---

## 7. Restrições e Limitações

**Técnicas:**

- Nenhuma stack obrigatória definida neste momento — recomendação livre na Fase 3 (Arquitetura)
- Documentos não são armazenados no sistema, apenas referenciados via link do Google Drive

**Regulatórias:**

- LGPD: dado que o sistema trata CNPJ e dados de contato de clientes (pessoa jurídica, mas com dados de contato pessoal associados)

**De negócio:**

- Prazo: 30 a 45 dias úteis a partir do início do desenvolvimento (conforme proposta)
- Orçamento: R$ 5.000,00 (Opção Enxuta)
- Equipe: 2 usuários internos (Talita + estagiário) na Múltiplus; desenvolvimento por André/Somma

---

## 8. Critérios de Aceite Globais

- [ ] Todos os requisitos **Must** implementados e validados
- [ ] Talita consegue cadastrar um cliente via CNPJ e visualizá-lo no painel
- [ ] Um projeto com tarefas recorrentes gera notificação de prazo por e-mail
- [ ] O indicador de "% em dia" reflete corretamente tarefas atrasadas e em dia
- [ ] O cliente final consegue logar e visualizar o andamento do próprio projeto, sem acesso a dados de terceiros
- [ ] Migração assistida dos dados existentes (planilhas/Trello/Drive) realizada conforme proposta — formalizada como **RF-044**, alocada à Sprint 7
- [ ] RN-001 e RN-002 validados com a Talita antes do início do desenvolvimento
- [x] Lista de valores de status (RF-024) validada com a Talita — 16/09/2026

---

## Histórico de Revisões

| Versão | Data | Autor | Alterações |
| ------- | ---- | ----- | ---------- |
| 2.3 | 16/09/2026 | André (Somma) | RF-024 deixa de ser genérico: as duas listas de status (4 de projeto, 9 de tarefa) validadas com a Talita em 16/09/2026, com o padrão "A iniciar" e a nota de que só o Administrador escolhe livremente (RN-007). Exemplo da RN-004 corrigido — afirmava que o Colaborador Interno "pode ver as subtarefas, sem poder editá-las", contradizendo o texto da própria regra depois da RN-007. Critério de Aceite Global correspondente marcado. Esta versão edita a 2.2 no lugar, sem duplicá-la abaixo: a mudança é pontual e o git guarda o texto anterior |
| 2.2 | 16/09/2026 | André (Somma) | Nota nova no RF-040: trocar o perfil de um usuário descarta as atribuições da granularidade antiga (RN-005) e essa informação não é recuperável — comportamento que existia na implementação desde a Sprint 3 sem constar de requisito nenhum, identificado na auditoria (achado D) |
| 2.1 | 16/09/2026 | André (Somma) | Campos opcionais de cadastro do usuário (cargo, telefone, CPF/CNPJ, observações) acrescentados ao RF-030, e busca por cargo no RF-040. Módulo de Administração e Acesso (Sprint 3): RF-039 a RF-043 na nova seção 3.16; complementos das Sprints 4 e 7 (RF-038, RF-044 a RF-047) nas seções 3.17 e 3.18; RN-007, RN-008 e RN-009; RN-002 e RN-004 revisadas; RF-044 vinculado ao critério de aceite global de migração. Origem: `docs/rfs-novos-srs-multiplus.md` e a sessão de planejamento das Sprints 3 e 4 (14/09/2026) |
| 1.8 | 10/09/2026 | André (Somma) | Itens da reunião de aprovação da Sprint 2 implementados e validados; RN-006 fechada (a troca de responsável remove a atribuição da pessoa anterior) |

> As versões anteriores do documento seguem abaixo, na íntegra, em ordem decrescente.

# Especificação de Requisitos — Múltiplus Software

**Versão:** 1.7
**Data:** 10/09/2026
**Autor:** André (Somma)
**Status:** Rascunho — alterações solicitadas pela Talita na reunião de aprovação da Sprint 2 (segmento customizado, campos novos de cliente, filtro de cidade, renomeação de perfis, Pessoas Envolvidas)
**Tipo de sistema:** SaaS com múltiplos perfis (equipe interna + portal do cliente)

---

## 1. Introdução

### 1.1 Propósito

O Múltiplus Software é um sistema web para centralizar o controle de clientes, projetos e prazos
ambientais da Múltiplus Ambiental, hoje espalhados entre planilhas, Trello e Google Drive. O sistema
substitui esse controle manual por uma ferramenta única, reduz o risco de perda de prazos de
condicionantes ambientais e oferece um canal direto para o cliente acompanhar o andamento do próprio
projeto sem depender de mensagens manuais via WhatsApp.

### 1.2 Escopo

**Dentro do escopo (Opção Enxuta — proposta de 06/08/2026):**

- Cadastro de clientes com preenchimento automático via CNPJ
- Controle de projetos e tarefas com prazos e recorrência
- Indicador de "% em dia"
- Subtarefas
- Controle de licenças ambientais (LP/LI/LO)
- Área exclusiva de acompanhamento para o cliente final
- Organização de documentos via links do Google Drive

**Fora do escopo (reservado para eventual Proposta Completa):**

- Funil de CRM para leads
- Módulo de Visitas Técnicas
- Cofre de Credenciais
- Treinamento presencial extenso
- Customizações de identidade visual além do já definido
- Integrações não mencionadas nesta proposta

### 1.3 Público-alvo deste documento

André (desenvolvedor/arquiteto do projeto) e Talita (validação de escopo antes da modelagem técnica).

### 1.4 Glossário

| Termo                   | Definição                                                                |
| ----------------------- | -------------------------------------------------------------------------- |
| Condicionante ambiental | Obrigação/prazo imposto por órgão ambiental como parte de uma licença |
| LP / LI / LO            | Licença Prévia / Licença de Instalação / Licença de Operação       |
| Subtarefa               | Registro subordinado a uma tarefa, com descrição, prazo opcional, responsável, etiquetas, status e comentários |
| Área Exclusiva         | Painel de acesso restrito onde o cliente final acompanha seus projetos     |

---

## 2. Visão Geral do Sistema

### 2.1 Contexto

Sistema web standalone. Substitui o uso combinado de planilhas, Trello e Google Drive para gestão
de clientes e prazos. Mantém o Google Drive apenas como repositório de arquivos, referenciado por
link — não há upload direto de arquivos dentro do sistema nesta fase.

### 2.2 Usuários e Personas

| Persona                           | Quem é                                                           | Necessidades principais                                                          | Nível técnico      |
| --------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------- |
| Administrador (Talita)            | Responsável pela Múltiplus Ambiental                            | Controle total: todos os clientes, projetos, dados sensíveis                    | Intermediário       |
| Colaborador Interno (Estagiário) | Apoio operacional interno                                         | Executar tarefas nos projetos aos quais foi atribuído, sem ver dados sensíveis | Leigo/Intermediário |
| Colaborador Externo               | Colaborador (interno ou externo) designado a tarefas específicas | Comentar e finalizar as tarefas atribuídas, sem visão do restante do projeto   | Leigo/Intermediário |
| Cliente / Empresa                 | Empresa atendida pela Múltiplus                                  | Acompanhar o andamento do próprio projeto sem precisar perguntar por WhatsApp   | Leigo                |

> **Nota:** este modelo de 4 perfis (Seções 3.9-3.13) foi detalhado após o fechamento da
> Opção Enxuta, que previa apenas dois níveis de acesso (equipe interna x cliente). André
> optou por absorver esse detalhamento sem aditivo — ver Seção 3.9.

### 2.3 Premissas e Dependências

**Premissas:**

- O volume de clientes/projetos está dentro do porte atual da Múltiplus (baixo/médio)
- A equipe interna é pequena (2 pessoas) — não há necessidade de perfis granulares por enquanto

**Dependências externas:**

- Serviço de consulta de CNPJ (ex.: BrasilAPI, citada na proposta como serviço terceiro sujeito a instabilidade)
- Serviço de envio de e-mail para notificações de prazo
- Google Drive (apenas como destino de links, sem integração de API nesta fase)

---

## 3. Requisitos Funcionais

### 3.1 Cadastro de Clientes

#### RF-001 — Cadastro de cliente Pessoa Jurídica via CNPJ

| Campo                          | Valor                                                                                                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-001                                                                                                                                                                                                  |
| **Módulo**              | Cadastro de Clientes                                                                                                                                                                                    |
| **Descrição**          | Quando o tipo de cliente for Pessoa Jurídica (RF-034), o sistema deve permitir cadastrar informando o CNPJ, preenchendo automaticamente razão social, endereço e demais dados públicos disponíveis |
| **Prioridade**           | Must                                                                                                                                                                                                    |
| **Critério de aceite**  | Dado um CNPJ válido, quando o usuário o inserir no cadastro, então o sistema deve preencher automaticamente os campos disponíveis via consulta externa                                              |
| **User Story vinculada** | US-001                                                                                                                                                                                                  |
| **Nota**                 | Não se aplica a Pessoa Física — ver RF-035, que não tem auto-preenchimento (não existe consulta pública por CPF, ao contrário do CNPJ)                                                           |

#### RF-002 — Dados complementares do cliente (segmento e origem)

| Campo                          | Valor                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-002                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Módulo**              | Cadastro de Clientes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Descrição**          | O sistema deve permitir registrar segmento e origem do contato, com listas de valores que dependem do tipo de cliente (RF-034):• **Origem** (comum aos dois tipos): Google, Instagram, LinkedIn, Evento, Indicação• **Segmento — Pessoa Física**: Proprietário rural, Parceiro, Outro *(texto livre obrigatório)*• **Segmento — Pessoa Jurídica**: Indústria, Posto de combustível, Transportadora, Centro de distribuição, Área rural, Outros *(texto livre obrigatório)*Quando o usuário selecionar "Outro"/"Outros", o sistema deve exibir um campo adicional de texto livre, obrigatório, onde o usuário informa o segmento específico daquele cliente. O valor digitado passa a ser tratado como um segmento real do cliente, disponível para busca e filtro (RF-003) |
| **Prioridade**           | Must                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Critério de aceite**  | Dado um cliente cadastrado, quando o usuário selecionar segmento e origem, então a lista de segmento exibida deve corresponder ao tipo de cliente (PF ou PJ) selecionado. Dado o segmento "Outro"/"Outros" selecionado, quando o usuário tentar salvar sem preencher o texto livre, então o sistema deve bloquear o salvamento com erro inline no campo. Dado um segmento digitado em texto livre, quando o cliente for salvo, então esse valor deve aparecer corretamente no filtro de segmento do Painel de Clientes (RF-003)                                                                                                                                                                                                                                                                                   |
| **User Story vinculada** | US-002                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Nota**                 | Listas de valores definidas — resolve pendência anterior do PDD v1.0/v2.0 (Seção 6)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

#### RF-002a — Atividade principal

| Campo                         | Valor                                                                                                                                                                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                  | RF-002a                                                                                                                                                                                                                |
| **Módulo**             | Cadastro de Clientes                                                                                                                                                                                                   |
| **Descrição**         | O sistema deve permitir registrar a "atividade principal" do cliente, como texto livre, descrevendo em linguagem natural o que a empresa/pessoa faz — não é o CNAE oficial, é uma descrição própria do usuário |
| **Prioridade**          | Should                                                                                                                                                                                                                 |
| **Obrigatório?**       | Não                                                                                                                                                                                                                   |
| **Aplica-se a**         | Pessoa Física e Pessoa Jurídica                                                                                                                                                                                      |
| **Critério de aceite** | Dado um cliente sendo cadastrado, quando o usuário preencher o campo de atividade principal com texto livre, então esse valor deve ser salvo e exibido na tela de Detalhe do Cliente                                 |
| **Origem**              | Solicitado pela Talita na reunião de aprovação da Sprint 2                                                                                                                                                          |

#### RF-002b — Porte da empresa

| Campo                         | Valor                                                                                                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                  | RF-002b                                                                                                                                                        |
| **Módulo**             | Cadastro de Clientes                                                                                                                                           |
| **Descrição**         | O sistema deve permitir registrar o porte da empresa, como lista fixa de opções baseada em faturamento: MEI, ME, EPP, Médio Porte, Grande Porte             |
| **Prioridade**          | Should                                                                                                                                                         |
| **Obrigatório?**       | Não                                                                                                                                                           |
| **Aplica-se a**         | Somente Pessoa Jurídica                                                                                                                                       |
| **Critério de aceite** | Dado um cliente Pessoa Jurídica sendo cadastrado, quando o usuário selecionar o porte, então o valor deve ser salvo e exibido na tela de Detalhe do Cliente |
| **Origem**              | Solicitado pela Talita na reunião de aprovação da Sprint 2                                                                                                  |

#### RF-002c — Município e Estado via API de localização

| Campo                         | Valor                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                  | RF-002c                                                                                                                                                                                                                                                                                                                                                                   |
| **Módulo**             | Cadastro de Clientes                                                                                                                                                                                                                                                                                                                                                      |
| **Descrição**         | O sistema deve permitir selecionar Estado e Município do cliente por busca/seleção, consultando uma API pública de localização (ex.: API de Localidades do IBGE) em vez de digitação livre. O campo`estado` filtra as opções de `municipio` disponíveis. Esses campos são adicionais ao campo `endereco` (texto livre) já existente, não o substituem |
| **Prioridade**          | Should                                                                                                                                                                                                                                                                                                                                                                    |
| **Obrigatório?**       | Não                                                                                                                                                                                                                                                                                                                                                                      |
| **Aplica-se a**         | Pessoa Física e Pessoa Jurídica                                                                                                                                                                                                                                                                                                                                         |
| **Critério de aceite** | Dado o formulário de cadastro, quando o usuário selecionar um Estado, então a lista de Municípios deve ser filtrada automaticamente para aquele estado. Dado um Município selecionado, quando o cliente for salvo, então o valor deve ficar associado ao registro e visível na tela de Detalhe do Cliente                                                          |
| **Nota técnica**       | Nova dependência externa — mesma categoria de risco do RF-001 (consulta CNPJ, Seção 6.1): API sujeita a instabilidade. Precisa de estado de fallback equivalente ("serviço indisponível → digitação manual")                                                                                                                                                     |
| **Origem**              | Solicitado pela Talita na reunião de aprovação da Sprint 2                                                                                                                                                                                                                                                                                                             |

#### RF-002d — Obrigatoriedade mínima no cadastro de cliente

| Campo                         | Valor                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                  | RF-002d                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Módulo**             | Cadastro de Clientes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Descrição**         | A pedido da Talita, o formulário de cadastro de cliente exige o mínimo possível de campos obrigatórios.**Continuam obrigatórios:** tipo de cliente (PF/PJ, RF-034, estrutural ao formulário), nome/razão social, CNPJ (PJ) ou CPF (PF), e o campo de texto livre de segmento quando "Outro/Outros" for selecionado (RF-002). **Tornam-se opcionais:** endereço, segmento, origem do contato, todos os dados de Responsável Legal e Ponto de Contato (RF-026/RF-027) — incluindo `cargo` mesmo quando herdado —, atividade principal, porte, município/estado |
| **Prioridade**          | Must                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Critério de aceite** | Dado o formulário de cadastro, quando o usuário tentar salvar sem preencher um campo não listado como obrigatório, então o sistema deve permitir o salvamento. Quando um campo com validação de formato (CPF, CNPJ, e-mail) for preenchido, então a validação de formato continua sendo aplicada mesmo o campo não sendo obrigatório                                                                                                                                                                                                                                       |
| **Nota**                | Não afeta a seção de Pessoas Envolvidas (RF-028), que segue sua própria regra: a seção é opcional como um todo, mas se o usuário adicionar uma pessoa, os campos obrigatórios daquele cadastro (RF-028) se aplicam normalmente                                                                                                                                                                                                                                                                                                                                                |
| **Origem**              | Solicitado pela Talita na reunião de aprovação da Sprint 2                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

#### RF-003 — Painel central de clientes

| Campo                          | Valor                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-003                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Módulo**              | Cadastro de Clientes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Descrição**          | O sistema deve exibir uma listagem central de todos os clientes cadastrados, com colunas incluindo razão social/nome, CNPJ/CPF, segmento e**cidade**. Deve oferecer uma busca única que filtra simultaneamente por nome, CNPJ/CPF **e cidade**, além de um filtro adicional de cidade em formato dropdown, listando apenas as cidades que já possuem cliente cadastrado                                                                                                                                                                                                                         |
| **Prioridade**           | Must                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Critério de aceite**  | Dado que existam clientes cadastrados, quando o usuário acessar o painel, então deve visualizar a lista com opção de busca por nome/CNPJ/CPF. Dado clientes cadastrados com município preenchido, quando o usuário acessar o painel, então deve visualizar a coluna cidade na listagem. Dado um termo digitado na busca, quando corresponder a nome, CNPJ/CPF ou cidade de algum cliente, então o(s) cliente(s) correspondente(s) devem aparecer no resultado. Dado o filtro dropdown de cidade, quando o usuário selecionar uma cidade, então a listagem deve mostrar apenas clientes daquela cidade |
| **User Story vinculada** | US-003                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Nota**                 | Município é opcional no cadastro (RF-002c) — clientes sem cidade preenchida aparecem na listagem sem valor na coluna, e não aparecem em nenhuma opção do filtro dropdown. Coluna e filtro de cidade adicionados a pedido da Talita na reunião de aprovação da Sprint 2                                                                                                                                                                                                                                                                                                                                 |

---

### 3.2 Controle de Projetos e Tarefas

#### RF-004 — Múltiplos projetos por cliente

| Campo                          | Valor                                                                                                                                     |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-004                                                                                                                                    |
| **Módulo**              | Projetos e Tarefas                                                                                                                        |
| **Descrição**          | O sistema deve permitir associar múltiplos projetos a um mesmo cliente                                                                   |
| **Prioridade**           | Must                                                                                                                                      |
| **Critério de aceite**  | Dado um cliente cadastrado, quando o usuário criar um novo projeto, então ele deve ser vinculado a esse cliente e listado no seu painel |
| **User Story vinculada** | US-004                                                                                                                                    |

#### RF-005 — Tarefas com prazo e responsável

| Campo                          | Valor                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-005                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Módulo**              | Projetos e Tarefas                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Descrição**          | O sistema deve permitir criar tarefas dentro de um projeto, cada uma com prazo ambiental e responsável designado. O campo "responsável" referencia qualquer**Pessoa Envolvida** (RF-028), com ou sem acesso ao sistema — não apenas um Usuário com login. Isso separa *quem está fazendo o trabalho* (pode ser qualquer Pessoa Envolvida, inclusive sem acesso, apenas para controle e registro) de *quem consegue acessar o sistema* (só quem tem `tem_acesso = sim` e está atribuído via `Atribuicao`, RF-019). Quando uma Pessoa Envolvida com `tem_acesso = sim` é definida como responsável, o sistema cria automaticamente o registro correspondente em `Atribuicao` para a tarefa (ver RN-006) |
| **Prioridade**           | Must                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Critério de aceite**  | Dado um projeto existente, quando o usuário criar uma tarefa com prazo e responsável (qualquer Pessoa Envolvida), então ela deve aparecer vinculada ao projeto com essas informações visíveis. Dado uma Pessoa Envolvida com acesso definida como responsável, quando isso ocorrer, então ela deve enxergar a tarefa no próprio login automaticamente, sem ação manual adicional. Dado uma Pessoa Envolvida sem acesso definida como responsável, quando isso ocorrer, então nenhum registro de`Atribuicao` deve ser criado — a tarefa fica marcada com aquele responsável apenas para controle                                                                                                                   |
| **User Story vinculada** | US-005                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Nota**                 | Revisado na reunião de aprovação da Sprint 2, a pedido da Talita — antes, o responsável só podia ser um Usuário com login                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

#### RF-006 — Recorrência automática de tarefas

| Campo                          | Valor                                                                                                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-006                                                                                                                                                     |
| **Módulo**              | Projetos e Tarefas                                                                                                                                         |
| **Descrição**          | O sistema deve permitir configurar recorrência automática para tarefas com prazos ambientais periódicos                                                 |
| **Prioridade**           | Must                                                                                                                                                       |
| **Critério de aceite**  | Dado uma tarefa marcada como recorrente, quando o prazo atual for concluído ou vencer, então o sistema deve gerar automaticamente a próxima ocorrência |
| **User Story vinculada** | US-006                                                                                                                                                     |

> ⚠️ **A validar:** a regra exata de recorrência (ex.: mensal, anual, por tipo de licença) não está
> especificada na proposta. Ver RN-002.

#### RF-007 — Notificação por e-mail de prazos

| Campo                          | Valor                                                                                                                                                     |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-007                                                                                                                                                    |
| **Módulo**              | Projetos e Tarefas                                                                                                                                        |
| **Descrição**          | O sistema deve enviar notificação por e-mail ao responsável quando um prazo de tarefa estiver próximo do vencimento                                   |
| **Prioridade**           | Must                                                                                                                                                      |
| **Critério de aceite**  | Dado uma tarefa com prazo definido, quando faltar um número configurável de dias para o vencimento, então o sistema deve enviar e-mail ao responsável |
| **User Story vinculada** | US-007                                                                                                                                                    |

#### RF-008 — Subtarefas

| Campo                          | Valor                                                                                                                                           |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-008                                                                                                                                          |
| **Módulo**              | Projetos e Tarefas                                                                                                                              |
| **Descrição**          | O sistema deve permitir cadastrar subtarefas completas vinculadas a uma tarefa, com título, descrição, prazo opcional, responsável obrigatório, etiquetas e status próprio (Em andamento, Concluído ou Cancelado)                              |
| **Prioridade**           | Must                                                                                                                                          |
| **Critério de aceite**  | Dada uma tarefa, quando o Administrador cadastrar uma subtarefa, então poderá informar todos os campos em formulário dedicado; ao abrir a subtarefa, verá detalhes e comentários. O responsável atribuído pode concluí-la; somente o Administrador pode cancelar ou escolher livremente seu status |
| **User Story vinculada** | US-008                                                                                                                                          |

---

### 3.3 Indicador de Status

#### RF-009 — Indicador de "% em dia"

| Campo                          | Valor                                                                                                                                                                                               |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-009                                                                                                                                                                                              |
| **Módulo**              | Indicadores                                                                                                                                                                                         |
| **Descrição**          | O sistema deve calcular e exibir um indicador visual de percentual de tarefas/projetos em dia versus atrasados                                                                                      |
| **Prioridade**           | Must                                                                                                                                                                                                |
| **Critério de aceite**  | Dado um conjunto de tarefas com prazos, quando o usuário acessar o painel do cliente/projeto, então deve visualizar o percentual em dia calculado com base nos prazos vencidos e não concluídos |
| **User Story vinculada** | US-009                                                                                                                                                                                              |

> ⚠️ **A validar:** a regra de cálculo de "em dia" (ex.: o que conta como atrasado, se há tolerância)
> não está especificada. Ver RN-001.

---

### 3.4 Licenças Ambientais

#### RF-010 — Controle de licenças (LP/LI/LO)

| Campo                          | Valor                                                                                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ID**                   | RF-010                                                                                                                                                 |
| **Módulo**              | Licenças Ambientais                                                                                                                                   |
| **Descrição**          | O sistema deve permitir cadastrar e controlar licenças ambientais (LP, LI, LO) vinculadas a cliente e projeto, incluindo datas de emissão e validade |
| **Prioridade**           | Must                                                                                                                                                   |
| **Critério de aceite**  | Dado um projeto existente, quando o usuário cadastrar uma licença com tipo e validade, então ela deve ficar visível na aba de licenças do projeto |
| **User Story vinculada** | US-010                                                                                                                                                 |

---

### 3.5 Área Exclusiva do Cliente

#### RF-011 — Login do cliente final

| Campo                          | Valor                                                                                                                                        |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-011                                                                                                                                       |
| **Módulo**              | Área Exclusiva do Cliente                                                                                                                   |
| **Descrição**          | O sistema deve fornecer login seguro para o cliente final acessar exclusivamente os dados dos próprios projetos                             |
| **Prioridade**           | Must                                                                                                                                         |
| **Critério de aceite**  | Dado um cliente com credenciais válidas, quando ele fizer login, então deve visualizar apenas os projetos vinculados à sua própria conta |
| **User Story vinculada** | US-011                                                                                                                                       |

#### RF-012 — Painel de acompanhamento do cliente

| Campo                          | Valor                                                                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-012                                                                                                                                  |
| **Módulo**              | Área Exclusiva do Cliente                                                                                                              |
| **Descrição**          | O sistema deve exibir ao cliente final o andamento de seus projetos (status de tarefas e indicador de % em dia) em modo somente-leitura |
| **Prioridade**           | Must                                                                                                                                    |
| **Critério de aceite**  | Dado que o cliente esteja logado, quando acessar seu painel, então deve visualizar o andamento atualizado sem poder editar dados       |
| **User Story vinculada** | US-012                                                                                                                                  |

---

### 3.6 Documentos

#### RF-013 — Organização de links de documentos

| Campo                          | Valor                                                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-013                                                                                                                                      |
| **Módulo**              | Documentos                                                                                                                                  |
| **Descrição**          | O sistema deve permitir vincular links de documentos do Google Drive a um cliente ou projeto específico                                    |
| **Prioridade**           | Must                                                                                                                                        |
| **Critério de aceite**  | Dado um projeto existente, quando o usuário adicionar um link de documento, então ele deve ficar listado e acessível a partir do projeto |
| **User Story vinculada** | US-013                                                                                                                                      |

---

### 3.7 Autenticação e Perfis de Acesso

#### RF-014 — Autenticação de usuários internos

| Campo                          | Valor                                                                                                                                                                         |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-014                                                                                                                                                                        |
| **Módulo**              | Autenticação                                                                                                                                                                |
| **Descrição**          | O sistema deve autenticar os usuários internos (Administrador, Colaborador Interno, Colaborador Externo) por login e senha antes de permitir acesso ao painel administrativo |
| **Prioridade**           | Must                                                                                                                                                                          |
| **Critério de aceite**  | Dado um usuário interno cadastrado, quando ele inserir credenciais válidas, então deve acessar o painel administrativo correspondente ao seu perfil                        |
| **User Story vinculada** | US-014                                                                                                                                                                        |

#### RF-015 — Diferenciação de permissões entre perfis internos

| Campo                          | Valor                                                                                                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ID**                   | RF-015                                                                                                                                                                                           |
| **Módulo**              | Autenticação                                                                                                                                                                                   |
| **Descrição**          | O sistema deve restringir o acesso do Colaborador Interno e do Colaborador Externo conforme o modelo de perfis da Seção 3.9 — escopo de atribuição, dados sensíveis e nível de permissão |
| **Prioridade**           | Must                                                                                                                                                                                             |
| **Critério de aceite**  | Ver critérios de aceite RF-018 a RF-021 (Seção 3.9)                                                                                                                                           |
| **User Story vinculada** | —                                                                                                                                                                                               |

### 3.8 Comentários em Subtarefa, Tarefa e Projeto

> Os requisitos desta seção em diante (3.8 a 3.13) foram detalhados após o fechamento da
> Proposta Comercial Enxuta (06/08/2026), numa rodada de esclarecimento de escopo com a
> Talita. André decidiu conscientemente absorver esse detalhamento sem aditivo contratual —
> tratam-se de especificações mais precisas do sistema que já estava sendo construído, não
> de funcionalidades cobradas à parte.

#### RF-016 — Comentários em subtarefa, tarefa e projeto

| Campo                          | Valor                                                                                                                                                                              |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-016                                                                                                                                                                             |
| **Módulo**              | Projetos e Tarefas (extensão)                                                                                                                                                     |
| **Descrição**          | O sistema deve permitir adicionar comentários de texto em três níveis: subtarefa, tarefa e projeto                                                                              |
| **Prioridade**           | Must                                                                                                                                                                               |
| **Critério de aceite**  | Dado um projeto, tarefa ou subtarefa existente, quando o usuário adicionar um comentário, então ele deve ficar visível associado ao item correspondente, com autor e data/hora |
| **User Story vinculada** | —                                                                                                                                                                                 |

#### RF-017 — Anexo de imagem e link em comentário

| Campo                          | Valor                                                                                                                                           |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-017                                                                                                                                          |
| **Módulo**              | Projetos e Tarefas (extensão)                                                                                                                  |
| **Descrição**          | O sistema deve permitir anexar uma imagem e/ou um link a um comentário (não inclui upload de documento)                                       |
| **Prioridade**           | Must                                                                                                                                            |
| **Critério de aceite**  | Dado um comentário sendo criado, quando o usuário anexar uma imagem ou colar um link, então ambos devem ficar visíveis junto ao comentário |
| **User Story vinculada** | —                                                                                                                                              |
| **Nota técnica**        | Imagem armazenada como arquivo (MinIO), não como blob no banco — ver ADD, ADR-003                                                             |

### 3.9 Sistema de Perfis e Permissões (detalhamento do escopo original)

#### RF-018 — Perfil Colaborador Interno com escopo por projeto

| Campo                          | Valor                                                                                                                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-018                                                                                                                                                                                  |
| **Módulo**              | Autenticação / Permissões                                                                                                                                                            |
| **Descrição**          | O Colaborador Interno deve ser atribuído a um ou mais projetos específicos, visualizando todas as tarefas e subtarefas dentro desses projetos, sem acesso a projetos não atribuídos |
| **Prioridade**           | Must                                                                                                                                                                                    |
| **Critério de aceite**  | Dado um Colaborador Interno atribuído ao Projeto X, quando ele acessar o sistema, então deve ver apenas o Projeto X (e suas tarefas/subtarefas), não outros projetos                 |
| **User Story vinculada** | —                                                                                                                                                                                      |

#### RF-019 — Perfil Colaborador Externo com escopo por tarefa

| Campo                          | Valor                                                                                                                                                             |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-019                                                                                                                                                            |
| **Módulo**              | Autenticação / Permissões                                                                                                                                      |
| **Descrição**          | O Colaborador Externo deve ser atribuído a tarefas específicas (não ao projeto inteiro), podendo comentar e finalizar apenas essas tarefas                     |
| **Prioridade**           | Must                                                                                                                                                              |
| **Critério de aceite**  | Dado um Colaborador Externo atribuído à Tarefa Y, quando ele acessar o sistema, então deve ver apenas a Tarefa Y, podendo comentar e marcá-la como finalizada |
| **User Story vinculada** | —                                                                                                                                                                |

#### RF-020 — Restrição de dados sensíveis para Colaborador Interno e Externo

| Campo                          | Valor                                                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-020                                                                                                                                                        |
| **Módulo**              | Autenticação / Permissões                                                                                                                                  |
| **Descrição**          | O sistema deve ocultar campos de valor e telefone dos dados cadastrais do cliente para os perfis Colaborador Interno e Colaborador Externo                    |
| **Prioridade**           | Must                                                                                                                                                          |
| **Critério de aceite**  | Dado um Colaborador Interno/Externo visualizando um cliente, quando acessar os dados cadastrais, então os campos de valor e telefone não devem ser exibidos |
| **User Story vinculada** | —                                                                                                                                                            |

#### RF-021 — Conclusão de subtarefa restrita ao responsável ou à Talita

| Campo                             | Valor                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                      | RF-021                                                                                                                                                                                                                                                                                                                                                                                            |
| **Módulo**                 | Projetos e Tarefas (extensão)                                                                                                                                                                                                                                                                                                                                                                    |
| **Descrição**             | Apenas a pessoa atribuída a uma subtarefa específica, ou o Administrador (Talita), pode marcá-la como concluída — mesmo que outra pessoa tenha acesso à tarefa/projeto (incluindo o Colaborador Interno atribuído ao projeto inteiro). Isso é uma permissão**distinta** de gerir a subtarefa (criar/editar/reordenar itens), que é exclusiva do Administrador, conforme RN-007 |
| **Prioridade**              | Must                                                                                                                                                                                                                                                                                                                                                                                              |
| **Critério de aceite**     | Dado uma subtarefa atribuída à Pessoa A, quando a Pessoa B (com acesso à mesma tarefa/projeto, mas não atribuída àquela subtarefa) tentar marcar como concluída, então o sistema deve bloquear a ação, mesmo que a Pessoa B seja um Colaborador Interno com acesso ao projeto inteiro                                                                                                   |
| **User Story vinculada**    | —                                                                                                                                                                                                                                                                                                                                                                                                |
| **Nota de implementação** | Descoberto em teste de integração (Sprint 1): a primeira implementação permitia que o Colaborador Interno concluísse subtarefas de outras pessoas dentro do seu próprio projeto, violando esta regra. Corrigido separando a permissão de "gerir subtarefas" da permissão de "marcar concluída"                                                                                            |

### 3.10 Notificações Configuráveis (detalhamento do escopo original)

#### RF-022 — Configuração de notificações por perfil

| Campo                          | Valor                                                                                                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-022                                                                                                                                                                          |
| **Módulo**              | Notificações                                                                                                                                                                  |
| **Descrição**          | A Talita deve poder configurar quais eventos cada perfil recebe notificação (não configurável por pessoa individual)                                                        |
| **Prioridade**           | Must                                                                                                                                                                            |
| **Critério de aceite**  | Dado o painel de configuração de notificações, quando a Talita alterar a configuração de um perfil, então todos os usuários daquele perfil passam a seguir a nova regra |
| **User Story vinculada** | —                                                                                                                                                                              |

#### RF-023 — Notificação de conclusão de tarefa e projeto

| Campo                          | Valor                                                                                                                                                          |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-023                                                                                                                                                         |
| **Módulo**              | Notificações                                                                                                                                                 |
| **Descrição**          | O sistema deve notificar, por e-mail e dentro do sistema (in-app), quando uma tarefa ou projeto for concluído, conforme a configuração de perfil (RF-022)   |
| **Prioridade**           | Must                                                                                                                                                           |
| **Critério de aceite**  | Dado uma tarefa marcada como concluída, quando isso ocorrer, então os perfis configurados para receber esse evento devem ser notificados por e-mail e in-app |
| **User Story vinculada** | —                                                                                                                                                             |
| **Nota técnica**        | Notificação in-app é um componente novo, não previsto na proposta original — implica em nova tabela de notificações e indicador de "não lida"          |

### 3.11 Status e Etiquetas (detalhamento do escopo original)

#### RF-024 — Status de projeto e tarefa

| Campo                          | Valor                                                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-024                                                                                                                                                  |
| **Módulo**              | Projetos e Tarefas (extensão)                                                                                                                          |
| **Descrição**          | Projetos e tarefas devem ter um campo de status fixo (ex.: em andamento, concluído, atrasado), distinto do cálculo automático de "% em dia" (RF-009) |
| **Prioridade**           | Must                                                                                                                                                    |
| **Critério de aceite**  | Dado um projeto ou tarefa, quando o usuário alterar o status, então o novo valor deve ser exibido no painel correspondente                            |
| **User Story vinculada** | —                                                                                                                                                      |
| **Nota**                 | ⚠️ Lista de valores de status ainda não definida — a validar com a Talita                                                                           |

#### RF-025 — Etiquetas em subtarefa

| Campo                          | Valor                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-025                                                                                                                    |
| **Módulo**              | Projetos e Tarefas (extensão)                                                                                            |
| **Descrição**          | Subtarefas devem permitir etiquetas livres/customizáveis (tags), distintas do campo de status                            |
| **Prioridade**           | Must                                                                                                                      |
| **Critério de aceite**  | Dado uma subtarefa, quando o usuário adicionar uma etiqueta, então ela deve ficar visível e ser filtrável na listagem |
| **User Story vinculada** | —                                                                                                                        |

### 3.12 Cadastro de Pessoa Jurídica Expandido (detalhamento do escopo original)

#### RF-026 — Cadastro de Responsável Legal

| Campo                          | Valor                                                                                                                                                                         |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-026                                                                                                                                                                        |
| **Módulo**              | Cadastro de Clientes (extensão)                                                                                                                                              |
| **Descrição**          | O sistema deve permitir cadastrar o Responsável Legal da empresa: nome, endereço, RG, CPF, telefone, e-mail                                                                 |
| **Prioridade**           | Must                                                                                                                                                                          |
| **Critério de aceite**  | Dado um cliente cadastrado, quando o usuário preencher os dados do Responsável Legal, então devem ser salvos e vinculados ao cliente                                       |
| **User Story vinculada** | —                                                                                                                                                                            |
| **Nota**                 | Aplica-se apenas a Pessoa Jurídica. Para Pessoa Física, não existe Responsável Legal separado — a própria pessoa cadastrada (RF-035) já é quem responde pelo cadastro |

#### RF-027 — Cadastro de Ponto de Contato com herança de dados

| Campo                          | Valor                                                                                                                                                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-027                                                                                                                                                                                                                          |
| **Módulo**              | Cadastro de Clientes (extensão)                                                                                                                                                                                                |
| **Descrição**          | Quando o Ponto de Contato for a mesma pessoa que o Responsável Legal, o sistema deve copiar automaticamente os dados já cadastrados (nome, endereço, RG, CPF, telefone, e-mail) e solicitar apenas o campo adicional "cargo" |
| **Prioridade**           | Must                                                                                                                                                                                                                            |
| **Critério de aceite**  | Dado um Responsável Legal já cadastrado, quando o usuário marcar "mesmo que o Ponto de Contato", então os campos devem ser preenchidos automaticamente, restando apenas "cargo" a preencher                                 |
| **User Story vinculada** | —                                                                                                                                                                                                                              |
| **Nota**                 | Aplica-se apenas a Pessoa Jurídica, pelo mesmo motivo do RF-026                                                                                                                                                                |

#### RF-028 — Cadastro de Pessoas Envolvidas (revisado — substitui "Pessoas do Operacional")

| Campo                          | Valor                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ID**                   | RF-028                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Módulo**              | Cadastro de Clientes (extensão)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Descrição**          | O sistema deve permitir cadastrar múltiplas**Pessoas Envolvidas** vinculadas a um cliente (PF ou PJ). Cada Pessoa Envolvida tem um tipo — **Pessoa** (indivíduo) ou **Empresa/PJ envolvida** — que determina os campos exibidos no formulário: • **Pessoa**: nome, CPF, telefone, e-mail• **Empresa/PJ envolvida**: razão social (no lugar de nome), CNPJ, telefone, e-mailEm ambos os tipos, **nome/razão social, telefone e e-mail são obrigatórios**; CPF/CNPJ são opcionais. No final do formulário, um checkbox pergunta se essa pessoa **"é um colaborador"** (campo `tem_acesso`). Quando marcado, o sistema cria automaticamente um Usuário com perfil **Colaborador Externo**, vinculado a essa Pessoa Envolvida, disparando o e-mail de definição de senha (mesmo fluxo do RF-030). Quando não marcado, a pessoa fica registrada apenas como referência — sem login — podendo ainda assim ser definida como responsável de tarefa/subtarefa (RF-005) apenas para fins de controle e registro |
| **Prioridade**           | Must                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Critério de aceite**  | Dado um cliente cadastrado (PF ou PJ), quando o usuário adicionar uma Pessoa Envolvida, então ela deve ficar listada como vinculada a esse cliente, com os campos correspondentes ao tipo escolhido (Pessoa ou Empresa/PJ). Dado uma Pessoa Envolvida sendo cadastrada com o checkbox "é um colaborador" marcado, então um Usuário Colaborador Externo deve ser criado automaticamente, vinculado a essa pessoa, com e-mail de definição de senha enviado. Dado o checkbox não marcado, então nenhum Usuário é criado — a pessoa existe apenas como registro de referência                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **User Story vinculada** | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Nota**                 | Aplica-se a**ambos** os tipos de cliente — inclusive Pessoa Física. Substitui e generaliza o RF-028 anterior ("Pessoas do Operacional") — renomeado a pedido da Talita na reunião de aprovação da Sprint 2                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Nota técnica**        | Ver ADR-007 no ADD —`PessoaOperacional` renomeada para `PessoaEnvolvida`, com colunas `tipo` (pessoa/empresa) e `tem_acesso` (boolean)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

### 3.13 Controle de Acesso do Cliente (detalhamento do escopo original)

#### RF-029 — Bloqueio de acesso do cliente pela Talita

| Campo                          | Valor                                                                                                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-029                                                                                                                                                   |
| **Módulo**              | Área Exclusiva do Cliente (extensão)                                                                                                                   |
| **Descrição**          | A Talita deve poder bloquear o login de um cliente à Área Exclusiva, sem excluir os dados do cliente/projeto do sistema                                |
| **Prioridade**           | Must                                                                                                                                                     |
| **Critério de aceite**  | Dado um cliente com acesso bloqueado, quando ele tentar logar, então o acesso deve ser negado, mas seus dados continuam visíveis para a equipe interna |
| **User Story vinculada** | —                                                                                                                                                       |

### 3.14 Onboarding e Recuperação de Acesso

> Lacuna identificada no checklist de qualidade (tipo SaaS multi-perfil) — nenhum requisito
> anterior cobria como um usuário novo entra no sistema ou recupera acesso perdido. Adicionado
> antes da Sprint 1 porque afeta diretamente a modelagem de autenticação.

#### RF-030 — Criação de usuário interno pela Talita

| Campo                          | Valor                                                                                                                                                                                                                                                                  |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-030                                                                                                                                                                                                                                                                 |
| **Módulo**              | Autenticação (extensão)                                                                                                                                                                                                                                             |
| **Descrição**          | A Talita deve poder cadastrar um novo usuário interno (Colaborador Interno ou Externo), definindo seu e-mail e o(s) projeto(s)/tarefa(s) ao(s) qual(is) ele é atribuído. O sistema deve enviar um e-mail ao novo usuário com um link para definir a própria senha |
| **Prioridade**           | Must                                                                                                                                                                                                                                                                   |
| **Critério de aceite**  | Dado que a Talita cadastre um novo usuário, quando o cadastro for salvo, então o sistema deve enviar um e-mail com link de definição de senha, e o usuário não deve conseguir logar antes de defini-la                                                           |
| **User Story vinculada** | —                                                                                                                                                                                                                                                                     |

#### RF-031 — Criação de acesso do cliente

| Campo                          | Valor                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-031                                                                                                                                                                                                                                                                                                                                   |
| **Módulo**              | Autenticação (extensão)                                                                                                                                                                                                                                                                                                               |
| **Descrição**          | Ao cadastrar um cliente Pessoa Jurídica (RF-001), o sistema deve permitir gerar um acesso de login para o Ponto de Contato, com o mesmo fluxo de definição de senha por e-mail do RF-030. Para cliente Pessoa Física (RF-035), o acesso é gerado diretamente para a própria pessoa cadastrada, sem Ponto de Contato intermediário |
| **Prioridade**           | Must                                                                                                                                                                                                                                                                                                                                     |
| **Critério de aceite**  | Dado um cliente recém-cadastrado, quando a Talita optar por criar o acesso, então o destinatário do e-mail de definição de senha deve ser o Ponto de Contato (PJ) ou a própria pessoa (PF)                                                                                                                                         |
| **User Story vinculada** | —                                                                                                                                                                                                                                                                                                                                       |

#### RF-032 — Recuperação de senha

| Campo                          | Valor                                                                                                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-032                                                                                                                                                                                      |
| **Módulo**              | Autenticação (extensão)                                                                                                                                                                  |
| **Descrição**          | Todo usuário (interno ou cliente) deve poder solicitar redefinição de senha via "esqueci minha senha", recebendo um link por e-mail                                                      |
| **Prioridade**           | Must                                                                                                                                                                                        |
| **Critério de aceite**  | Dado um usuário na tela de login, quando ele clicar em "esqueci minha senha" e informar o e-mail cadastrado, então deve receber um link válido por tempo limitado para redefinir a senha |
| **User Story vinculada** | —                                                                                                                                                                                          |
| **Nota técnica**        | Auth.js (adapter Postgres) suporta esse fluxo nativamente — sem necessidade de biblioteca adicional                                                                                        |

#### RF-033 — Promoção posterior de Pessoa Envolvida a Colaborador Externo (revisado)

| Campo                          | Valor                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-033                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Módulo**              | Autenticação (extensão)                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Descrição**          | O sistema deve permitir "promover" uma Pessoa Envolvida (RF-028) cadastrada com`tem_acesso = não` a um login de Colaborador Externo a qualquer momento depois, sem precisar recadastrar a pessoa — reaproveitando o mesmo fluxo de convite por e-mail (padrão do RF-031). Esta é a via **posterior**: a criação de acesso no momento do cadastro já é coberta pelo checkbox "é um colaborador" do RF-028; este RF cobre o caso de decidir dar acesso depois |
| **Prioridade**           | Must                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Critério de aceite**  | Dado uma Pessoa Envolvida já cadastrada com`tem_acesso = não`, quando o usuário clicar em "Criar acesso" a partir dela, então um novo Usuário com perfil Colaborador Externo deve ser criado, vinculado a essa pessoa (`tem_acesso` passa a `sim`), com e-mail de definição de senha enviado, sem duplicar o cadastro da pessoa                                                                                                                                 |
| **User Story vinculada** | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Nota técnica**        | FK opcional e única (`pessoa_operacional_id`, renomeada para a entidade `PessoaEnvolvida` no ADR-007) na tabela `Usuario`, não fusão das duas entidades — evita conflito com o schema esperado pelo Auth.js (mesmo motivo do ADR-003/004). A tabela `Atribuicao` continua referenciando apenas `Usuario`, sem mudança                                                                                                                                         |
| **Origem**               | Identificado durante teste manual da Sprint 2 — registrado como ADR-005 no ADD. Revisado na reunião de aprovação da Sprint 2 pra refletir o novo fluxo inline do RF-028                                                                                                                                                                                                                                                                                                  |

### 3.15 Tipo de Cliente: Pessoa Física e Pessoa Jurídica (correção estrutural)

> Identificado durante o desenvolvimento da Sprint 2 — o modelo de Cliente foi construído
> assumindo apenas Pessoa Jurídica, mas a Múltiplus atende também Pessoa Física (ex.:
> proprietário rural individual). Esta seção corrige essa lacuna antes da aprovação da
> Sprint 2 com a Talita. Ver ADR-006 no ADD para a decisão de modelo de dados.

#### RF-034 — Seleção de tipo de cliente

| Campo                          | Valor                                                                                                                                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-034                                                                                                                                                                                               |
| **Módulo**              | Cadastro de Clientes (correção estrutural)                                                                                                                                                         |
| **Descrição**          | O cadastro de cliente deve começar pela escolha do tipo: Pessoa Física ou Pessoa Jurídica. Os campos e fluxos seguintes (RF-001 vs RF-035, RF-026/027 aplicáveis ou não) dependem dessa escolha |
| **Prioridade**           | Must                                                                                                                                                                                                 |
| **Critério de aceite**  | Dado o início de um novo cadastro, quando o usuário escolher o tipo, então o formulário deve exibir os campos correspondentes (PF ou PJ)                                                         |
| **User Story vinculada** | —                                                                                                                                                                                                   |

#### RF-035 — Cadastro de cliente Pessoa Física

| Campo                          | Valor                                                                                                                                                                                                                   |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-035                                                                                                                                                                                                                  |
| **Módulo**              | Cadastro de Clientes (correção estrutural)                                                                                                                                                                            |
| **Descrição**          | Quando o tipo de cliente for Pessoa Física (RF-034), o sistema deve permitir cadastrar: nome, CPF, RG, endereço, CEP, município — sem auto-preenchimento (não existe consulta pública por CPF, diferente do CNPJ) |
| **Prioridade**           | Must                                                                                                                                                                                                                    |
| **Critério de aceite**  | Dado o tipo Pessoa Física selecionado, quando o usuário preencher os campos obrigatórios, então o cliente deve ser salvo com esses dados, sem Responsável Legal ou Ponto de Contato associados                     |
| **User Story vinculada** | —                                                                                                                                                                                                                      |
| **Nota**                 | RF-026 e RF-027 não se aplicam a este tipo — a pessoa cadastrada aqui é, ela mesma, quem recebe o acesso (RF-031)                                                                                                    |

---

## 4. Requisitos Não-Funcionais

#### RNF-001 — Segurança de acesso

| Campo                 | Valor                                                                                        |
| --------------------- | -------------------------------------------------------------------------------------------- |
| **ID**          | RNF-001                                                                                      |
| **Categoria**   | Segurança                                                                                   |
| **Descrição** | O sistema deve garantir que cada cliente autenticado só acesse dados dos próprios projetos |
| **Métrica**    | 0 casos de acesso cruzado entre contas de clientes distintos em teste de QA                  |
| **Prioridade**  | Must                                                                                         |

#### RNF-002 — Conformidade com LGPD

| Campo                 | Valor                                                                                                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**          | RNF-002                                                                                                                                                                      |
| **Categoria**   | Conformidade                                                                                                                                                                 |
| **Descrição** | O sistema deve tratar dados pessoais e de CNPJ dos clientes em conformidade com a LGPD, incluindo controle de acesso e possibilidade de exclusão de dados sob solicitação |
| **Métrica**    | Checklist de conformidade LGPD validado antes da entrega                                                                                                                     |
| **Prioridade**  | Must                                                                                                                                                                         |

#### RNF-003 — Disponibilidade

| Campo                 | Valor                                                                                                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**          | RNF-003                                                                                                                                                               |
| **Categoria**   | Confiabilidade                                                                                                                                                        |
| **Descrição** | O sistema deve estar disponível para acesso da equipe e dos clientes durante o horário comercial, com hospedagem estável conforme plano de manutenção contratado |
| **Métrica**    | Uptime ≥ 99% mensal (melhor esforço, sem SLA formal conforme proposta)                                                                                              |
| **Prioridade**  | Should                                                                                                                                                                |

#### RNF-004 — Usabilidade para usuário leigo

| Campo                 | Valor                                                                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**          | RNF-004                                                                                                                                |
| **Categoria**   | Usabilidade                                                                                                                            |
| **Descrição** | A Área Exclusiva do Cliente deve ser utilizável por um usuário sem conhecimento técnico, sem necessidade de treinamento presencial |
| **Métrica**    | Cliente consegue localizar o status do próprio projeto em até 3 cliques a partir do login                                            |
| **Prioridade**  | Must                                                                                                                                   |

#### RNF-005 — Desempenho do painel

| Campo                 | Valor                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **ID**          | RNF-005                                                                                                                                    |
| **Categoria**   | Performance                                                                                                                                |
| **Descrição** | O painel central de clientes e o indicador de "% em dia" devem carregar rapidamente mesmo com o crescimento do volume de clientes/projetos |
| **Métrica**    | Tempo de carregamento do painel < 2s em condições normais de uso                                                                         |
| **Prioridade**  | Should                                                                                                                                     |

---

## 5. Regras de Negócio

| ID     | Regra                                                                                                                                                                                                                                                                                                      | Exemplo concreto                                                                                                                                                                    |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RN-001 | *(a validar)* Uma tarefa é considerada "atrasada" para fins do indicador de % em dia quando seu prazo vence sem que ela esteja marcada como concluída                                                                                                                                                  | Tarefa com prazo 10/09 não concluída até 11/09 conta como atrasada                                                                                                               |
| RN-002 | *(a validar)* A recorrência de uma tarefa é definida por tipo de condicionante/licença                                                                                                                                                                                                                | Renovação de LO pode ser anual; outros condicionantes podem ter periodicidade diferente                                                                                           |
| RN-003 | O cliente final tem acesso somente de leitura aos próprios dados, sem poder editar tarefas, prazos ou documentos                                                                                                                                                                                          | Cliente acessa o painel mas os botões de edição ficam ocultos/desabilitados                                                                                                      |
| RN-004 | A conclusão de uma subtarefa só pode ser feita por quem está atribuído a ela especificamente, ou pelo Administrador (Talita) — independente de outro perfil ter acesso à tarefa/projeto. Esta é uma permissão distinta de "gerir a subtarefa" (criar/editar itens), que é exclusiva do Administrador, conforme RN-007 | Um Colaborador Interno com acesso ao projeto inteiro não pode marcar uma subtarefa atribuída a outra pessoa como concluída, mas pode ver as subtarefas, sem poder editá-las                      |
| RN-005 | Colaborador Interno é atribuído por projeto inteiro; Colaborador Externo é atribuído por tarefa específica — granularidades diferentes de escopo                                                                                                                                                     | Colaborador Interno vê todas as tarefas do Projeto X; Colaborador Externo só vê a Tarefa Y dentro do Projeto X                                                                   |
| RN-006 | Definir uma Pessoa Envolvida com acesso (`tem_acesso = sim`) como responsável de uma tarefa implica atribuição automática de visualização daquela tarefa a ela — as duas ações (responsável + atribuição) deixam de ser independentes nesse caso específico                                 | A Talita marca José (Colaborador Externo) como responsável da Tarefa X; o sistema cria automaticamente o registro de`Atribuicao` da Tarefa X pra ele, sem passo manual separado |

---

## 6. Integrações e Interfaces Externas

### 6.1 APIs e Serviços Externos

| Sistema                                   | Tipo                                   | Propósito                                                                        | Auth                    | Criticidade |
| ----------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------- | ----------------------- | ----------- |
| Serviço de consulta CNPJ (ex. BrasilAPI) | REST API                               | Preenchimento automático de dados do cliente no cadastro                         | Sem auth / API pública | Média      |
| API de localidades (ex. IBGE)             | REST API                               | Seleção de Estado/Município no cadastro (RF-002c), em vez de digitação livre | Sem auth / API pública | Média      |
| Serviço de e-mail transacional           | API/SMTP                               | Envio de notificações de prazo                                                  | API Key                 | Alta        |
| Google Drive                              | Link externo (sem integração de API) | Repositório de documentos referenciado por link                                  | N/A                     | Baixa       |

### 6.2 Interfaces de Usuário

Três fluxos principais: (1) painel administrativo interno (Talita/estagiário) para cadastro e gestão
de clientes, projetos, tarefas e licenças; (2) área exclusiva do cliente, somente leitura; (3) fluxo
de notificação por e-mail para alertas de prazo. Wireframes ainda não produzidos — próxima etapa
natural após este SRS.

---

## 7. Restrições e Limitações

**Técnicas:**

- Nenhuma stack obrigatória definida neste momento — recomendação livre na Fase 3 (Arquitetura)
- Documentos não são armazenados no sistema, apenas referenciados via link do Google Drive

**Regulatórias:**

- LGPD: dado que o sistema trata CNPJ e dados de contato de clientes (pessoa jurídica, mas com dados de contato pessoal associados)

**De negócio:**

- Prazo: 30 a 45 dias úteis a partir do início do desenvolvimento (conforme proposta)
- Orçamento: R$ 5.000,00 (Opção Enxuta)
- Equipe: 2 usuários internos (Talita + estagiário) na Múltiplus; desenvolvimento por André/Somma

---

## 8. Critérios de Aceite Globais

- [ ] Todos os requisitos **Must** implementados e validados
- [ ] Talita consegue cadastrar um cliente via CNPJ e visualizá-lo no painel
- [ ] Um projeto com tarefas recorrentes gera notificação de prazo por e-mail
- [ ] O indicador de "% em dia" reflete corretamente tarefas atrasadas e em dia
- [ ] O cliente final consegue logar e visualizar o andamento do próprio projeto, sem acesso a dados de terceiros
- [ ] Migração assistida dos dados existentes (planilhas/Trello/Drive) realizada conforme proposta
- [ ] RN-001 e RN-002 validados com a Talita antes do início do desenvolvimento
- [ ] Lista de valores de status (RF-024) validada com a Talita

---

## Histórico de Revisõe

# Especificação de Requisitos — Múltiplus Software

**Versão:** 1.6
**Data:** 02/09/2026
**Autor:** André (Somma)
**Status:** Rascunho — correção estrutural: Cliente agora suporta Pessoa Física além de Pessoa Jurídica (RF-034, RF-035, e RF-002 atualizado), identificada durante a Sprint 2, antes da aprovação com a Talita
**Tipo de sistema:** SaaS com múltiplos perfis (equipe interna + portal do cliente)

---

## 1. Introdução

### 1.1 Propósito

O Múltiplus Software é um sistema web para centralizar o controle de clientes, projetos e prazos
ambientais da Múltiplus Ambiental, hoje espalhados entre planilhas, Trello e Google Drive. O sistema
substitui esse controle manual por uma ferramenta única, reduz o risco de perda de prazos de
condicionantes ambientais e oferece um canal direto para o cliente acompanhar o andamento do próprio
projeto sem depender de mensagens manuais via WhatsApp.

### 1.2 Escopo

**Dentro do escopo (Opção Enxuta — proposta de 06/08/2026):**

- Cadastro de clientes com preenchimento automático via CNPJ
- Controle de projetos e tarefas com prazos e recorrência
- Indicador de "% em dia"
- Subtarefas
- Controle de licenças ambientais (LP/LI/LO)
- Área exclusiva de acompanhamento para o cliente final
- Organização de documentos via links do Google Drive

**Fora do escopo (reservado para eventual Proposta Completa):**

- Funil de CRM para leads
- Módulo de Visitas Técnicas
- Cofre de Credenciais
- Treinamento presencial extenso
- Customizações de identidade visual além do já definido
- Integrações não mencionadas nesta proposta

### 1.3 Público-alvo deste documento

André (desenvolvedor/arquiteto do projeto) e Talita (validação de escopo antes da modelagem técnica).

### 1.4 Glossário

| Termo                   | Definição                                                                |
| ----------------------- | -------------------------------------------------------------------------- |
| Condicionante ambiental | Obrigação/prazo imposto por órgão ambiental como parte de uma licença |
| LP / LI / LO            | Licença Prévia / Licença de Instalação / Licença de Operação       |
| Subtarefa               | Registro subordinado a uma tarefa, com descrição, prazo opcional, responsável, etiquetas, status e comentários |
| Área Exclusiva         | Painel de acesso restrito onde o cliente final acompanha seus projetos     |

---

## 2. Visão Geral do Sistema

### 2.1 Contexto

Sistema web standalone. Substitui o uso combinado de planilhas, Trello e Google Drive para gestão
de clientes e prazos. Mantém o Google Drive apenas como repositório de arquivos, referenciado por
link — não há upload direto de arquivos dentro do sistema nesta fase.

### 2.2 Usuários e Personas

| Persona                             | Quem é                                                           | Necessidades principais                                                          | Nível técnico      |
| ----------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------- |
| Administrador (Talita)              | Responsável pela Múltiplus Ambiental                            | Controle total: todos os clientes, projetos, dados sensíveis                    | Intermediário       |
| Administrador Interno (Estagiário) | Apoio operacional interno                                         | Executar tarefas nos projetos aos quais foi atribuído, sem ver dados sensíveis | Leigo/Intermediário |
| Administrador Externo               | Colaborador (interno ou externo) designado a tarefas específicas | Comentar e finalizar as tarefas atribuídas, sem visão do restante do projeto   | Leigo/Intermediário |
| Cliente / Empresa                   | Empresa atendida pela Múltiplus                                  | Acompanhar o andamento do próprio projeto sem precisar perguntar por WhatsApp   | Leigo                |

> **Nota:** este modelo de 4 perfis (Seções 3.9-3.13) foi detalhado após o fechamento da
> Opção Enxuta, que previa apenas dois níveis de acesso (equipe interna x cliente). André
> optou por absorver esse detalhamento sem aditivo — ver Seção 3.9.

### 2.3 Premissas e Dependências

**Premissas:**

- O volume de clientes/projetos está dentro do porte atual da Múltiplus (baixo/médio)
- A equipe interna é pequena (2 pessoas) — não há necessidade de perfis granulares por enquanto

**Dependências externas:**

- Serviço de consulta de CNPJ (ex.: BrasilAPI, citada na proposta como serviço terceiro sujeito a instabilidade)
- Serviço de envio de e-mail para notificações de prazo
- Google Drive (apenas como destino de links, sem integração de API nesta fase)

---

## 3. Requisitos Funcionais

### 3.1 Cadastro de Clientes

#### RF-001 — Cadastro de cliente Pessoa Jurídica via CNPJ

| Campo                          | Valor                                                                                                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-001                                                                                                                                                                                                  |
| **Módulo**              | Cadastro de Clientes                                                                                                                                                                                    |
| **Descrição**          | Quando o tipo de cliente for Pessoa Jurídica (RF-034), o sistema deve permitir cadastrar informando o CNPJ, preenchendo automaticamente razão social, endereço e demais dados públicos disponíveis |
| **Prioridade**           | Must                                                                                                                                                                                                    |
| **Critério de aceite**  | Dado um CNPJ válido, quando o usuário o inserir no cadastro, então o sistema deve preencher automaticamente os campos disponíveis via consulta externa                                              |
| **User Story vinculada** | US-001                                                                                                                                                                                                  |
| **Nota**                 | Não se aplica a Pessoa Física — ver RF-035, que não tem auto-preenchimento (não existe consulta pública por CPF, ao contrário do CNPJ)                                                           |

#### RF-002 — Dados complementares do cliente (segmento e origem)

| Campo                          | Valor                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-002                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Módulo**              | Cadastro de Clientes                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Descrição**          | O sistema deve permitir registrar segmento e origem do contato, com listas de valores que dependem do tipo de cliente (RF-034):•**Origem** (comum aos dois tipos): Google, Instagram, LinkedIn, Evento, Indicação• **Segmento — Pessoa Física**: Proprietário rural, Parceiro, Outro• **Segmento — Pessoa Jurídica**: Indústria, Posto de combustível, Transportadora, Centro de distribuição, Área rural, Outros |
| **Prioridade**           | Must                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Critério de aceite**  | Dado um cliente cadastrado, quando o usuário selecionar segmento e origem, então a lista de segmento exibida deve corresponder ao tipo de cliente (PF ou PJ) selecionado                                                                                                                                                                                                                                                                         |
| **User Story vinculada** | US-002                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Nota**                 | Listas de valores definidas — resolve pendência anterior do PDD v1.0/v2.0 (Seção 6)                                                                                                                                                                                                                                                                                                                                                            |

#### RF-003 — Painel central de clientes

| Campo                          | Valor                                                                                                                                        |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-003                                                                                                                                       |
| **Módulo**              | Cadastro de Clientes                                                                                                                         |
| **Descrição**          | O sistema deve exibir uma listagem central de todos os clientes cadastrados, com busca e acesso rápido ao detalhe de cada um                |
| **Prioridade**           | Must                                                                                                                                         |
| **Critério de aceite**  | Dado que existam clientes cadastrados, quando o usuário acessar o painel, então deve visualizar a lista com opção de busca por nome/CNPJ |
| **User Story vinculada** | US-003                                                                                                                                       |

---

### 3.2 Controle de Projetos e Tarefas

#### RF-004 — Múltiplos projetos por cliente

| Campo                          | Valor                                                                                                                                     |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-004                                                                                                                                    |
| **Módulo**              | Projetos e Tarefas                                                                                                                        |
| **Descrição**          | O sistema deve permitir associar múltiplos projetos a um mesmo cliente                                                                   |
| **Prioridade**           | Must                                                                                                                                      |
| **Critério de aceite**  | Dado um cliente cadastrado, quando o usuário criar um novo projeto, então ele deve ser vinculado a esse cliente e listado no seu painel |
| **User Story vinculada** | US-004                                                                                                                                    |

#### RF-005 — Tarefas com prazo e responsável

| Campo                          | Valor                                                                                                                                                                   |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-005                                                                                                                                                                  |
| **Módulo**              | Projetos e Tarefas                                                                                                                                                      |
| **Descrição**          | O sistema deve permitir criar tarefas dentro de um projeto, cada uma com prazo ambiental e responsável designado                                                       |
| **Prioridade**           | Must                                                                                                                                                                    |
| **Critério de aceite**  | Dado um projeto existente, quando o usuário criar uma tarefa com prazo e responsável, então ela deve aparecer vinculada ao projeto com essas informações visíveis |
| **User Story vinculada** | US-005                                                                                                                                                                  |

#### RF-006 — Recorrência automática de tarefas

| Campo                          | Valor                                                                                                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-006                                                                                                                                                     |
| **Módulo**              | Projetos e Tarefas                                                                                                                                         |
| **Descrição**          | O sistema deve permitir configurar recorrência automática para tarefas com prazos ambientais periódicos                                                 |
| **Prioridade**           | Must                                                                                                                                                       |
| **Critério de aceite**  | Dado uma tarefa marcada como recorrente, quando o prazo atual for concluído ou vencer, então o sistema deve gerar automaticamente a próxima ocorrência |
| **User Story vinculada** | US-006                                                                                                                                                     |

> ⚠️ **A validar:** a regra exata de recorrência (ex.: mensal, anual, por tipo de licença) não está
> especificada na proposta. Ver RN-002.

#### RF-007 — Notificação por e-mail de prazos

| Campo                          | Valor                                                                                                                                                     |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-007                                                                                                                                                    |
| **Módulo**              | Projetos e Tarefas                                                                                                                                        |
| **Descrição**          | O sistema deve enviar notificação por e-mail ao responsável quando um prazo de tarefa estiver próximo do vencimento                                   |
| **Prioridade**           | Must                                                                                                                                                      |
| **Critério de aceite**  | Dado uma tarefa com prazo definido, quando faltar um número configurável de dias para o vencimento, então o sistema deve enviar e-mail ao responsável |
| **User Story vinculada** | US-007                                                                                                                                                    |

#### RF-008 — Subtarefas

| Campo                          | Valor                                                                                                                                           |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-008                                                                                                                                          |
| **Módulo**              | Projetos e Tarefas                                                                                                                              |
| **Descrição**          | O sistema deve permitir cadastrar subtarefas completas vinculadas a uma tarefa, com título, descrição, prazo opcional, responsável obrigatório, etiquetas e status próprio (Em andamento, Concluído ou Cancelado)                              |
| **Prioridade**           | Must                                                                                                                                          |
| **Critério de aceite**  | Dada uma tarefa, quando o Administrador cadastrar uma subtarefa, então poderá informar todos os campos em formulário dedicado; ao abrir a subtarefa, verá detalhes e comentários. O responsável atribuído pode concluí-la; somente o Administrador pode cancelar ou escolher livremente seu status |
| **User Story vinculada** | US-008                                                                                                                                          |

---

### 3.3 Indicador de Status

#### RF-009 — Indicador de "% em dia"

| Campo                          | Valor                                                                                                                                                                                               |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-009                                                                                                                                                                                              |
| **Módulo**              | Indicadores                                                                                                                                                                                         |
| **Descrição**          | O sistema deve calcular e exibir um indicador visual de percentual de tarefas/projetos em dia versus atrasados                                                                                      |
| **Prioridade**           | Must                                                                                                                                                                                                |
| **Critério de aceite**  | Dado um conjunto de tarefas com prazos, quando o usuário acessar o painel do cliente/projeto, então deve visualizar o percentual em dia calculado com base nos prazos vencidos e não concluídos |
| **User Story vinculada** | US-009                                                                                                                                                                                              |

> ⚠️ **A validar:** a regra de cálculo de "em dia" (ex.: o que conta como atrasado, se há tolerância)
> não está especificada. Ver RN-001.

---

### 3.4 Licenças Ambientais

#### RF-010 — Controle de licenças (LP/LI/LO)

| Campo                          | Valor                                                                                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ID**                   | RF-010                                                                                                                                                 |
| **Módulo**              | Licenças Ambientais                                                                                                                                   |
| **Descrição**          | O sistema deve permitir cadastrar e controlar licenças ambientais (LP, LI, LO) vinculadas a cliente e projeto, incluindo datas de emissão e validade |
| **Prioridade**           | Must                                                                                                                                                   |
| **Critério de aceite**  | Dado um projeto existente, quando o usuário cadastrar uma licença com tipo e validade, então ela deve ficar visível na aba de licenças do projeto |
| **User Story vinculada** | US-010                                                                                                                                                 |

---

### 3.5 Área Exclusiva do Cliente

#### RF-011 — Login do cliente final

| Campo                          | Valor                                                                                                                                        |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-011                                                                                                                                       |
| **Módulo**              | Área Exclusiva do Cliente                                                                                                                   |
| **Descrição**          | O sistema deve fornecer login seguro para o cliente final acessar exclusivamente os dados dos próprios projetos                             |
| **Prioridade**           | Must                                                                                                                                         |
| **Critério de aceite**  | Dado um cliente com credenciais válidas, quando ele fizer login, então deve visualizar apenas os projetos vinculados à sua própria conta |
| **User Story vinculada** | US-011                                                                                                                                       |

#### RF-012 — Painel de acompanhamento do cliente

| Campo                          | Valor                                                                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-012                                                                                                                                  |
| **Módulo**              | Área Exclusiva do Cliente                                                                                                              |
| **Descrição**          | O sistema deve exibir ao cliente final o andamento de seus projetos (status de tarefas e indicador de % em dia) em modo somente-leitura |
| **Prioridade**           | Must                                                                                                                                    |
| **Critério de aceite**  | Dado que o cliente esteja logado, quando acessar seu painel, então deve visualizar o andamento atualizado sem poder editar dados       |
| **User Story vinculada** | US-012                                                                                                                                  |

---

### 3.6 Documentos

#### RF-013 — Organização de links de documentos

| Campo                          | Valor                                                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-013                                                                                                                                      |
| **Módulo**              | Documentos                                                                                                                                  |
| **Descrição**          | O sistema deve permitir vincular links de documentos do Google Drive a um cliente ou projeto específico                                    |
| **Prioridade**           | Must                                                                                                                                        |
| **Critério de aceite**  | Dado um projeto existente, quando o usuário adicionar um link de documento, então ele deve ficar listado e acessível a partir do projeto |
| **User Story vinculada** | US-013                                                                                                                                      |

---

### 3.7 Autenticação e Perfis de Acesso

#### RF-014 — Autenticação de usuários internos

| Campo                          | Valor                                                                                                                                                                             |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-014                                                                                                                                                                            |
| **Módulo**              | Autenticação                                                                                                                                                                    |
| **Descrição**          | O sistema deve autenticar os usuários internos (Administrador, Administrador Interno, Administrador Externo) por login e senha antes de permitir acesso ao painel administrativo |
| **Prioridade**           | Must                                                                                                                                                                              |
| **Critério de aceite**  | Dado um usuário interno cadastrado, quando ele inserir credenciais válidas, então deve acessar o painel administrativo correspondente ao seu perfil                            |
| **User Story vinculada** | US-014                                                                                                                                                                            |

#### RF-015 — Diferenciação de permissões entre perfis internos

| Campo                          | Valor                                                                                                                                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-015                                                                                                                                                                                               |
| **Módulo**              | Autenticação                                                                                                                                                                                       |
| **Descrição**          | O sistema deve restringir o acesso do Administrador Interno e do Administrador Externo conforme o modelo de perfis da Seção 3.9 — escopo de atribuição, dados sensíveis e nível de permissão |
| **Prioridade**           | Must                                                                                                                                                                                                 |
| **Critério de aceite**  | Ver critérios de aceite RF-018 a RF-021 (Seção 3.9)                                                                                                                                               |
| **User Story vinculada** | —                                                                                                                                                                                                   |

### 3.8 Comentários em Subtarefa, Tarefa e Projeto

> Os requisitos desta seção em diante (3.8 a 3.13) foram detalhados após o fechamento da
> Proposta Comercial Enxuta (06/08/2026), numa rodada de esclarecimento de escopo com a
> Talita. André decidiu conscientemente absorver esse detalhamento sem aditivo contratual —
> tratam-se de especificações mais precisas do sistema que já estava sendo construído, não
> de funcionalidades cobradas à parte.

#### RF-016 — Comentários em subtarefa, tarefa e projeto

| Campo                          | Valor                                                                                                                                                                              |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-016                                                                                                                                                                             |
| **Módulo**              | Projetos e Tarefas (extensão)                                                                                                                                                     |
| **Descrição**          | O sistema deve permitir adicionar comentários de texto em três níveis: subtarefa, tarefa e projeto                                                                              |
| **Prioridade**           | Must                                                                                                                                                                               |
| **Critério de aceite**  | Dado um projeto, tarefa ou subtarefa existente, quando o usuário adicionar um comentário, então ele deve ficar visível associado ao item correspondente, com autor e data/hora |
| **User Story vinculada** | —                                                                                                                                                                                 |

#### RF-017 — Anexo de imagem e link em comentário

| Campo                          | Valor                                                                                                                                           |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-017                                                                                                                                          |
| **Módulo**              | Projetos e Tarefas (extensão)                                                                                                                  |
| **Descrição**          | O sistema deve permitir anexar uma imagem e/ou um link a um comentário (não inclui upload de documento)                                       |
| **Prioridade**           | Must                                                                                                                                            |
| **Critério de aceite**  | Dado um comentário sendo criado, quando o usuário anexar uma imagem ou colar um link, então ambos devem ficar visíveis junto ao comentário |
| **User Story vinculada** | —                                                                                                                                              |
| **Nota técnica**        | Imagem armazenada como arquivo (MinIO), não como blob no banco — ver ADD, ADR-003                                                             |

### 3.9 Sistema de Perfis e Permissões (detalhamento do escopo original)

#### RF-018 — Perfil Administrador Interno com escopo por projeto

| Campo                          | Valor                                                                                                                                                                                     |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-018                                                                                                                                                                                    |
| **Módulo**              | Autenticação / Permissões                                                                                                                                                              |
| **Descrição**          | O Administrador Interno deve ser atribuído a um ou mais projetos específicos, visualizando todas as tarefas e subtarefas dentro desses projetos, sem acesso a projetos não atribuídos |
| **Prioridade**           | Must                                                                                                                                                                                      |
| **Critério de aceite**  | Dado um Administrador Interno atribuído ao Projeto X, quando ele acessar o sistema, então deve ver apenas o Projeto X (e suas tarefas/subtarefas), não outros projetos                 |
| **User Story vinculada** | —                                                                                                                                                                                        |

#### RF-019 — Perfil Administrador Externo com escopo por tarefa

| Campo                          | Valor                                                                                                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-019                                                                                                                                                              |
| **Módulo**              | Autenticação / Permissões                                                                                                                                        |
| **Descrição**          | O Administrador Externo deve ser atribuído a tarefas específicas (não ao projeto inteiro), podendo comentar e finalizar apenas essas tarefas                     |
| **Prioridade**           | Must                                                                                                                                                                |
| **Critério de aceite**  | Dado um Administrador Externo atribuído à Tarefa Y, quando ele acessar o sistema, então deve ver apenas a Tarefa Y, podendo comentar e marcá-la como finalizada |
| **User Story vinculada** | —                                                                                                                                                                  |

#### RF-020 — Restrição de dados sensíveis para Administrador Interno e Externo

| Campo                          | Valor                                                                                                                                                           |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-020                                                                                                                                                          |
| **Módulo**              | Autenticação / Permissões                                                                                                                                    |
| **Descrição**          | O sistema deve ocultar campos de valor e telefone dos dados cadastrais do cliente para os perfis Administrador Interno e Administrador Externo                  |
| **Prioridade**           | Must                                                                                                                                                            |
| **Critério de aceite**  | Dado um Administrador Interno/Externo visualizando um cliente, quando acessar os dados cadastrais, então os campos de valor e telefone não devem ser exibidos |
| **User Story vinculada** | —                                                                                                                                                              |

#### RF-021 — Conclusão de subtarefa restrita ao responsável ou à Talita

| Campo                             | Valor                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                      | RF-021                                                                                                                                                                                                                                                                                                                                                                                              |
| **Módulo**                 | Projetos e Tarefas (extensão)                                                                                                                                                                                                                                                                                                                                                                      |
| **Descrição**             | Apenas a pessoa atribuída a uma subtarefa específica, ou o Administrador (Talita), pode marcá-la como concluída — mesmo que outra pessoa tenha acesso à tarefa/projeto (incluindo o Administrador Interno atribuído ao projeto inteiro). Isso é uma permissão**distinta** de gerir a subtarefa (criar/editar/reordenar itens), que é exclusiva do Administrador, conforme RN-007 |
| **Prioridade**              | Must                                                                                                                                                                                                                                                                                                                                                                                                |
| **Critério de aceite**     | Dado uma subtarefa atribuída à Pessoa A, quando a Pessoa B (com acesso à mesma tarefa/projeto, mas não atribuída àquela subtarefa) tentar marcar como concluída, então o sistema deve bloquear a ação, mesmo que a Pessoa B seja um Administrador Interno com acesso ao projeto inteiro                                                                                                   |
| **User Story vinculada**    | —                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Nota de implementação** | Descoberto em teste de integração (Sprint 1): a primeira implementação permitia que o Administrador Interno concluísse subtarefas de outras pessoas dentro do seu próprio projeto, violando esta regra. Corrigido separando a permissão de "gerir subtarefas" da permissão de "marcar concluída"                                                                                            |

### 3.10 Notificações Configuráveis (detalhamento do escopo original)

#### RF-022 — Configuração de notificações por perfil

| Campo                          | Valor                                                                                                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-022                                                                                                                                                                          |
| **Módulo**              | Notificações                                                                                                                                                                  |
| **Descrição**          | A Talita deve poder configurar quais eventos cada perfil recebe notificação (não configurável por pessoa individual)                                                        |
| **Prioridade**           | Must                                                                                                                                                                            |
| **Critério de aceite**  | Dado o painel de configuração de notificações, quando a Talita alterar a configuração de um perfil, então todos os usuários daquele perfil passam a seguir a nova regra |
| **User Story vinculada** | —                                                                                                                                                                              |

#### RF-023 — Notificação de conclusão de tarefa e projeto

| Campo                          | Valor                                                                                                                                                          |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-023                                                                                                                                                         |
| **Módulo**              | Notificações                                                                                                                                                 |
| **Descrição**          | O sistema deve notificar, por e-mail e dentro do sistema (in-app), quando uma tarefa ou projeto for concluído, conforme a configuração de perfil (RF-022)   |
| **Prioridade**           | Must                                                                                                                                                           |
| **Critério de aceite**  | Dado uma tarefa marcada como concluída, quando isso ocorrer, então os perfis configurados para receber esse evento devem ser notificados por e-mail e in-app |
| **User Story vinculada** | —                                                                                                                                                             |
| **Nota técnica**        | Notificação in-app é um componente novo, não previsto na proposta original — implica em nova tabela de notificações e indicador de "não lida"          |

### 3.11 Status e Etiquetas (detalhamento do escopo original)

#### RF-024 — Status de projeto e tarefa

| Campo                          | Valor                                                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-024                                                                                                                                                  |
| **Módulo**              | Projetos e Tarefas (extensão)                                                                                                                          |
| **Descrição**          | Projetos e tarefas devem ter um campo de status fixo (ex.: em andamento, concluído, atrasado), distinto do cálculo automático de "% em dia" (RF-009) |
| **Prioridade**           | Must                                                                                                                                                    |
| **Critério de aceite**  | Dado um projeto ou tarefa, quando o usuário alterar o status, então o novo valor deve ser exibido no painel correspondente                            |
| **User Story vinculada** | —                                                                                                                                                      |
| **Nota**                 | ⚠️ Lista de valores de status ainda não definida — a validar com a Talita                                                                           |

#### RF-025 — Etiquetas em subtarefa

| Campo                          | Valor                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-025                                                                                                                    |
| **Módulo**              | Projetos e Tarefas (extensão)                                                                                            |
| **Descrição**          | Subtarefas devem permitir etiquetas livres/customizáveis (tags), distintas do campo de status                            |
| **Prioridade**           | Must                                                                                                                      |
| **Critério de aceite**  | Dado uma subtarefa, quando o usuário adicionar uma etiqueta, então ela deve ficar visível e ser filtrável na listagem |
| **User Story vinculada** | —                                                                                                                        |

### 3.12 Cadastro de Pessoa Jurídica Expandido (detalhamento do escopo original)

#### RF-026 — Cadastro de Responsável Legal

| Campo                          | Valor                                                                                                                                                                         |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-026                                                                                                                                                                        |
| **Módulo**              | Cadastro de Clientes (extensão)                                                                                                                                              |
| **Descrição**          | O sistema deve permitir cadastrar o Responsável Legal da empresa: nome, endereço, RG, CPF, telefone, e-mail                                                                 |
| **Prioridade**           | Must                                                                                                                                                                          |
| **Critério de aceite**  | Dado um cliente cadastrado, quando o usuário preencher os dados do Responsável Legal, então devem ser salvos e vinculados ao cliente                                       |
| **User Story vinculada** | —                                                                                                                                                                            |
| **Nota**                 | Aplica-se apenas a Pessoa Jurídica. Para Pessoa Física, não existe Responsável Legal separado — a própria pessoa cadastrada (RF-035) já é quem responde pelo cadastro |

#### RF-027 — Cadastro de Ponto de Contato com herança de dados

| Campo                          | Valor                                                                                                                                                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-027                                                                                                                                                                                                                          |
| **Módulo**              | Cadastro de Clientes (extensão)                                                                                                                                                                                                |
| **Descrição**          | Quando o Ponto de Contato for a mesma pessoa que o Responsável Legal, o sistema deve copiar automaticamente os dados já cadastrados (nome, endereço, RG, CPF, telefone, e-mail) e solicitar apenas o campo adicional "cargo" |
| **Prioridade**           | Must                                                                                                                                                                                                                            |
| **Critério de aceite**  | Dado um Responsável Legal já cadastrado, quando o usuário marcar "mesmo que o Ponto de Contato", então os campos devem ser preenchidos automaticamente, restando apenas "cargo" a preencher                                 |
| **User Story vinculada** | —                                                                                                                                                                                                                              |
| **Nota**                 | Aplica-se apenas a Pessoa Jurídica, pelo mesmo motivo do RF-026                                                                                                                                                                |

#### RF-028 — Cadastro de pessoas do operacional

| Campo                          | Valor                                                                                                                                                     |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-028                                                                                                                                                    |
| **Módulo**              | Cadastro de Clientes (extensão)                                                                                                                          |
| **Descrição**          | O sistema deve permitir cadastrar múltiplas pessoas do time operacional do cliente, vinculadas ao cliente                                                |
| **Prioridade**           | Must                                                                                                                                                      |
| **Critério de aceite**  | Dado um cliente cadastrado (PF ou PJ), quando o usuário adicionar uma pessoa do operacional, então ela deve ficar listada como vinculada a esse cliente |
| **User Story vinculada** | —                                                                                                                                                        |
| **Nota**                 | Aplica-se a**ambos** os tipos de cliente — inclusive Pessoa Física (ex.: um cliente do segmento "Parceiro" pode ter equipe própria)              |

### 3.13 Controle de Acesso do Cliente (detalhamento do escopo original)

#### RF-029 — Bloqueio de acesso do cliente pela Talita

| Campo                          | Valor                                                                                                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-029                                                                                                                                                   |
| **Módulo**              | Área Exclusiva do Cliente (extensão)                                                                                                                   |
| **Descrição**          | A Talita deve poder bloquear o login de um cliente à Área Exclusiva, sem excluir os dados do cliente/projeto do sistema                                |
| **Prioridade**           | Must                                                                                                                                                     |
| **Critério de aceite**  | Dado um cliente com acesso bloqueado, quando ele tentar logar, então o acesso deve ser negado, mas seus dados continuam visíveis para a equipe interna |
| **User Story vinculada** | —                                                                                                                                                       |

### 3.14 Onboarding e Recuperação de Acesso

> Lacuna identificada no checklist de qualidade (tipo SaaS multi-perfil) — nenhum requisito
> anterior cobria como um usuário novo entra no sistema ou recupera acesso perdido. Adicionado
> antes da Sprint 1 porque afeta diretamente a modelagem de autenticação.

#### RF-030 — Criação de usuário interno pela Talita

| Campo                          | Valor                                                                                                                                                                                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ID**                   | RF-030                                                                                                                                                                                                                                                                   |
| **Módulo**              | Autenticação (extensão)                                                                                                                                                                                                                                               |
| **Descrição**          | A Talita deve poder cadastrar um novo usuário interno (Administrador Interno ou Externo), definindo seu e-mail e o(s) projeto(s)/tarefa(s) ao(s) qual(is) ele é atribuído. O sistema deve enviar um e-mail ao novo usuário com um link para definir a própria senha |
| **Prioridade**           | Must                                                                                                                                                                                                                                                                     |
| **Critério de aceite**  | Dado que a Talita cadastre um novo usuário, quando o cadastro for salvo, então o sistema deve enviar um e-mail com link de definição de senha, e o usuário não deve conseguir logar antes de defini-la                                                             |
| **User Story vinculada** | —                                                                                                                                                                                                                                                                       |

#### RF-031 — Criação de acesso do cliente

| Campo                          | Valor                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-031                                                                                                                                                                                                                                                                                                                                   |
| **Módulo**              | Autenticação (extensão)                                                                                                                                                                                                                                                                                                               |
| **Descrição**          | Ao cadastrar um cliente Pessoa Jurídica (RF-001), o sistema deve permitir gerar um acesso de login para o Ponto de Contato, com o mesmo fluxo de definição de senha por e-mail do RF-030. Para cliente Pessoa Física (RF-035), o acesso é gerado diretamente para a própria pessoa cadastrada, sem Ponto de Contato intermediário |
| **Prioridade**           | Must                                                                                                                                                                                                                                                                                                                                     |
| **Critério de aceite**  | Dado um cliente recém-cadastrado, quando a Talita optar por criar o acesso, então o destinatário do e-mail de definição de senha deve ser o Ponto de Contato (PJ) ou a própria pessoa (PF)                                                                                                                                         |
| **User Story vinculada** | —                                                                                                                                                                                                                                                                                                                                       |

#### RF-032 — Recuperação de senha

| Campo                          | Valor                                                                                                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-032                                                                                                                                                                                      |
| **Módulo**              | Autenticação (extensão)                                                                                                                                                                  |
| **Descrição**          | Todo usuário (interno ou cliente) deve poder solicitar redefinição de senha via "esqueci minha senha", recebendo um link por e-mail                                                      |
| **Prioridade**           | Must                                                                                                                                                                                        |
| **Critério de aceite**  | Dado um usuário na tela de login, quando ele clicar em "esqueci minha senha" e informar o e-mail cadastrado, então deve receber um link válido por tempo limitado para redefinir a senha |
| **User Story vinculada** | —                                                                                                                                                                                          |
| **Nota técnica**        | Auth.js (adapter Postgres) suporta esse fluxo nativamente — sem necessidade de biblioteca adicional                                                                                        |

#### RF-033 — Vínculo entre Pessoa do Operacional e Administrador Externo

| Campo                          | Valor                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ID**                   | RF-033                                                                                                                                                                                                                                                                                                                                                                                     |
| **Módulo**              | Autenticação (extensão)                                                                                                                                                                                                                                                                                                                                                                 |
| **Descrição**          | O sistema deve permitir "promover" uma Pessoa do Operacional (RF-028) a um login de Administrador Externo, reaproveitando o fluxo de convite por e-mail (mesmo padrão do RF-031), sem duplicar o cadastro da pessoa. O vínculo é opcional: um Administrador Externo pode não corresponder a nenhuma Pessoa do Operacional (colaborador externo genuíno)                               |
| **Prioridade**           | Must                                                                                                                                                                                                                                                                                                                                                                                       |
| **Critério de aceite**  | Dado uma Pessoa do Operacional já cadastrada, quando o usuário clicar em "Criar acesso" a partir dela, então um novo Usuário com perfil Administrador Externo deve ser criado, vinculado a essa pessoa, com nome/e-mail copiados uma única vez (não sincronizados ao vivo). Deve também ser possível criar um Administrador Externo sem vínculo com nenhuma Pessoa do Operacional |
| **User Story vinculada** | —                                                                                                                                                                                                                                                                                                                                                                                         |
| **Nota técnica**        | FK opcional e única (`pessoa_operacional_id`) na tabela `Usuario`, não fusão das duas entidades — evita conflito com o schema esperado pelo Auth.js (mesmo motivo do ADR-003/004). A tabela `Atribuicao` continua referenciando apenas `Usuario`, sem mudança                                                                                                                 |
| **Origem**               | Identificado durante teste manual da Sprint 2 — registrado como ADR-005 no ADD                                                                                                                                                                                                                                                                                                            |

### 3.15 Tipo de Cliente: Pessoa Física e Pessoa Jurídica (correção estrutural)

> Identificado durante o desenvolvimento da Sprint 2 — o modelo de Cliente foi construído
> assumindo apenas Pessoa Jurídica, mas a Múltiplus atende também Pessoa Física (ex.:
> proprietário rural individual). Esta seção corrige essa lacuna antes da aprovação da
> Sprint 2 com a Talita. Ver ADR-006 no ADD para a decisão de modelo de dados.

#### RF-034 — Seleção de tipo de cliente

| Campo                          | Valor                                                                                                                                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-034                                                                                                                                                                                               |
| **Módulo**              | Cadastro de Clientes (correção estrutural)                                                                                                                                                         |
| **Descrição**          | O cadastro de cliente deve começar pela escolha do tipo: Pessoa Física ou Pessoa Jurídica. Os campos e fluxos seguintes (RF-001 vs RF-035, RF-026/027 aplicáveis ou não) dependem dessa escolha |
| **Prioridade**           | Must                                                                                                                                                                                                 |
| **Critério de aceite**  | Dado o início de um novo cadastro, quando o usuário escolher o tipo, então o formulário deve exibir os campos correspondentes (PF ou PJ)                                                         |
| **User Story vinculada** | —                                                                                                                                                                                                   |

#### RF-035 — Cadastro de cliente Pessoa Física

| Campo                          | Valor                                                                                                                                                                                                                   |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-035                                                                                                                                                                                                                  |
| **Módulo**              | Cadastro de Clientes (correção estrutural)                                                                                                                                                                            |
| **Descrição**          | Quando o tipo de cliente for Pessoa Física (RF-034), o sistema deve permitir cadastrar: nome, CPF, RG, endereço, CEP, município — sem auto-preenchimento (não existe consulta pública por CPF, diferente do CNPJ) |
| **Prioridade**           | Must                                                                                                                                                                                                                    |
| **Critério de aceite**  | Dado o tipo Pessoa Física selecionado, quando o usuário preencher os campos obrigatórios, então o cliente deve ser salvo com esses dados, sem Responsável Legal ou Ponto de Contato associados                     |
| **User Story vinculada** | —                                                                                                                                                                                                                      |
| **Nota**                 | RF-026 e RF-027 não se aplicam a este tipo — a pessoa cadastrada aqui é, ela mesma, quem recebe o acesso (RF-031)                                                                                                    |

---

## 4. Requisitos Não-Funcionais

#### RNF-001 — Segurança de acesso

| Campo                 | Valor                                                                                        |
| --------------------- | -------------------------------------------------------------------------------------------- |
| **ID**          | RNF-001                                                                                      |
| **Categoria**   | Segurança                                                                                   |
| **Descrição** | O sistema deve garantir que cada cliente autenticado só acesse dados dos próprios projetos |
| **Métrica**    | 0 casos de acesso cruzado entre contas de clientes distintos em teste de QA                  |
| **Prioridade**  | Must                                                                                         |

#### RNF-002 — Conformidade com LGPD

| Campo                 | Valor                                                                                                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**          | RNF-002                                                                                                                                                                      |
| **Categoria**   | Conformidade                                                                                                                                                                 |
| **Descrição** | O sistema deve tratar dados pessoais e de CNPJ dos clientes em conformidade com a LGPD, incluindo controle de acesso e possibilidade de exclusão de dados sob solicitação |
| **Métrica**    | Checklist de conformidade LGPD validado antes da entrega                                                                                                                     |
| **Prioridade**  | Must                                                                                                                                                                         |

#### RNF-003 — Disponibilidade

| Campo                 | Valor                                                                                                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**          | RNF-003                                                                                                                                                               |
| **Categoria**   | Confiabilidade                                                                                                                                                        |
| **Descrição** | O sistema deve estar disponível para acesso da equipe e dos clientes durante o horário comercial, com hospedagem estável conforme plano de manutenção contratado |
| **Métrica**    | Uptime ≥ 99% mensal (melhor esforço, sem SLA formal conforme proposta)                                                                                              |
| **Prioridade**  | Should                                                                                                                                                                |

#### RNF-004 — Usabilidade para usuário leigo

| Campo                 | Valor                                                                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**          | RNF-004                                                                                                                                |
| **Categoria**   | Usabilidade                                                                                                                            |
| **Descrição** | A Área Exclusiva do Cliente deve ser utilizável por um usuário sem conhecimento técnico, sem necessidade de treinamento presencial |
| **Métrica**    | Cliente consegue localizar o status do próprio projeto em até 3 cliques a partir do login                                            |
| **Prioridade**  | Must                                                                                                                                   |

#### RNF-005 — Desempenho do painel

| Campo                 | Valor                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **ID**          | RNF-005                                                                                                                                    |
| **Categoria**   | Performance                                                                                                                                |
| **Descrição** | O painel central de clientes e o indicador de "% em dia" devem carregar rapidamente mesmo com o crescimento do volume de clientes/projetos |
| **Métrica**    | Tempo de carregamento do painel < 2s em condições normais de uso                                                                         |
| **Prioridade**  | Should                                                                                                                                     |

---

## 5. Regras de Negócio

| ID     | Regra                                                                                                                                                                                                                                                                                                      | Exemplo concreto                                                                                                                                                 |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RN-001 | *(a validar)* Uma tarefa é considerada "atrasada" para fins do indicador de % em dia quando seu prazo vence sem que ela esteja marcada como concluída                                                                                                                                                  | Tarefa com prazo 10/09 não concluída até 11/09 conta como atrasada                                                                                            |
| RN-002 | *(a validar)* A recorrência de uma tarefa é definida por tipo de condicionante/licença                                                                                                                                                                                                                | Renovação de LO pode ser anual; outros condicionantes podem ter periodicidade diferente                                                                        |
| RN-003 | O cliente final tem acesso somente de leitura aos próprios dados, sem poder editar tarefas, prazos ou documentos                                                                                                                                                                                          | Cliente acessa o painel mas os botões de edição ficam ocultos/desabilitados                                                                                   |
| RN-004 | A conclusão de uma subtarefa só pode ser feita por quem está atribuído a ela especificamente, ou pelo Administrador (Talita) — independente de outro perfil ter acesso à tarefa/projeto. Esta é uma permissão distinta de "gerir a subtarefa" (criar/editar itens), que é exclusiva do Administrador, conforme RN-007 | Um Administrador Interno com acesso ao projeto inteiro não pode marcar uma subtarefa atribuída a outra pessoa como concluída, mas pode ver as subtarefas, sem poder editá-las |
| RN-005 | Administrador Interno é atribuído por projeto inteiro; Administrador Externo é atribuído por tarefa específica — granularidades diferentes de escopo                                                                                                                                                 | Administrador Interno vê todas as tarefas do Projeto X; Administrador Externo só vê a Tarefa Y dentro do Projeto X                                            |

---

## 6. Integrações e Interfaces Externas

### 6.1 APIs e Serviços Externos

| Sistema                                   | Tipo                                   | Propósito                                                | Auth                    | Criticidade |
| ----------------------------------------- | -------------------------------------- | --------------------------------------------------------- | ----------------------- | ----------- |
| Serviço de consulta CNPJ (ex. BrasilAPI) | REST API                               | Preenchimento automático de dados do cliente no cadastro | Sem auth / API pública | Média      |
| Serviço de e-mail transacional           | API/SMTP                               | Envio de notificações de prazo                          | API Key                 | Alta        |
| Google Drive                              | Link externo (sem integração de API) | Repositório de documentos referenciado por link          | N/A                     | Baixa       |

### 6.2 Interfaces de Usuário

Três fluxos principais: (1) painel administrativo interno (Talita/estagiário) para cadastro e gestão
de clientes, projetos, tarefas e licenças; (2) área exclusiva do cliente, somente leitura; (3) fluxo
de notificação por e-mail para alertas de prazo. Wireframes ainda não produzidos — próxima etapa
natural após este SRS.

---

## 7. Restrições e Limitações

**Técnicas:**

- Nenhuma stack obrigatória definida neste momento — recomendação livre na Fase 3 (Arquitetura)
- Documentos não são armazenados no sistema, apenas referenciados via link do Google Drive

**Regulatórias:**

- LGPD: dado que o sistema trata CNPJ e dados de contato de clientes (pessoa jurídica, mas com dados de contato pessoal associados)

**De negócio:**

- Prazo: 30 a 45 dias úteis a partir do início do desenvolvimento (conforme proposta)
- Orçamento: R$ 5.000,00 (Opção Enxuta)
- Equipe: 2 usuários internos (Talita + estagiário) na Múltiplus; desenvolvimento por André/Somma

---

## 8. Critérios de Aceite Globais

- [ ] Todos os requisitos **Must** implementados e validados
- [ ] Talita consegue cadastrar um cliente via CNPJ e visualizá-lo no painel
- [ ] Um projeto com tarefas recorrentes gera notificação de prazo por e-mail
- [ ] O indicador de "% em dia" reflete corretamente tarefas atrasadas e em dia
- [ ] O cliente final consegue logar e visualizar o andamento do próprio projeto, sem acesso a dados de terceiros
- [ ] Migração assistida dos dados existentes (planilhas/Trello/Drive) realizada conforme proposta
- [ ] RN-001 e RN-002 validados com a Talita antes do início do desenvolvimento
- [ ] Lista de valores de status (RF-024) validada com a Talita

---

## Histórico de Revisões

| Versão | Data       | Autor  | Alterações                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.0     | 02/09/2026 | André | Versão inicial, com base na Proposta Comercial Enxuta (06/08/2026)                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 1.1     | 02/09/2026 | André | Detalhamento de escopo: sistema de perfis e permissões (RF-018 a RF-021), notificações configuráveis (RF-022, RF-023), status e etiquetas (RF-024, RF-025), cadastro de PJ expandido (RF-026 a RF-028), controle de acesso do cliente (RF-029), comentários expandidos para 3 níveis com imagem e link (RF-016, RF-017 revisados).                                                                                                                                             |
| 1.2     | 02/09/2026 | André | André decidiu absorver o detalhamento de escopo da v1.1 sem aditivo contratual — requisitos marcados como Must, sem pendência comercial.                                                                                                                                                                                                                                                                                                                                          |
| 1.3     | 02/09/2026 | André | Adicionada Seção 3.14 (Onboarding e Recuperação de Acesso — RF-030 a RF-032), identificada no checklist de qualidade SaaS multi-perfil antes da Sprint 1.                                                                                                                                                                                                                                                                                                                       |
| 1.4     | 02/09/2026 | André | RF-021/RN-004 clarificados: separação explícita entre "gerir subtarefas" e "marcar concluída", descoberta via teste de integração na Sprint 1 (bug real corrigido).                                                                                                                                                                                                                                                                                                             |
| 1.5     | 02/09/2026 | André | Adicionado RF-033 (vínculo opcional Pessoa do Operacional ↔ Administrador Externo), a partir de achado da Sprint 2, resolvido no ADR-005 do ADD. Nota: uma correção de duplicação de conteúdo feita diretamente no repositório pelo Claude Code também foi rotulada "v1.4" — esta v1.5 é a versão canônica a partir de agora.                                                                                                                                           |
| 1.6     | 02/09/2026 | André | Correção estrutural: Cliente agora suporta Pessoa Física (RF-034, RF-035) além de Pessoa Jurídica. RF-001 e RF-002 atualizados para deixar claro o que é específico de PJ; RF-026/027 marcados como exclusivos de PJ; RF-028 confirmado como aplicável aos dois tipos; RF-031 atualizado. Resolve pendência histórica de valores de segmento/origem (agora definidos em RF-002). Identificado durante a Sprint 2, antes da aprovação com a Talita — ver ADR-006 no ADD. |
| 1.7     | 25/09/2026 | André | Corrigida a definição de escopo: subtarefa deixa de ser item de checklist e passa a ser registro completo com descrição, prazo opcional, responsável, etiquetas e status próprio. Formulário de criação dedicado, detalhes e comentários na subtarefa; Painel de Prazos dedicado a subtarefas pendentes. Mantidas as permissões RN-004 e RN-007. |
