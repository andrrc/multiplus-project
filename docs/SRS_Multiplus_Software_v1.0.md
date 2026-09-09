# Especificação de Requisitos — Múltiplus Software

**Versão:** 1.2
**Data:** 02/09/2026
**Autor:** André (Somma)
**Status:** Rascunho — escopo estendido (Seções 3.8 a 3.13) absorvido sem aditivo, por decisão consciente do André
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
- Checklist de subtarefas
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
| Subtarefa               | Item de checklist dentro de uma tarefa de um projeto                       |
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

#### RF-001 — Cadastro de cliente via CNPJ

| Campo                          | Valor                                                                                                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-001                                                                                                                                                     |
| **Módulo**              | Cadastro de Clientes                                                                                                                                       |
| **Descrição**          | O sistema deve permitir cadastrar um cliente informando o CNPJ, preenchendo automaticamente razão social, endereço e demais dados públicos disponíveis |
| **Prioridade**           | Must                                                                                                                                                       |
| **Critério de aceite**  | Dado um CNPJ válido, quando o usuário o inserir no cadastro, então o sistema deve preencher automaticamente os campos disponíveis via consulta externa |
| **User Story vinculada** | US-001                                                                                                                                                     |

#### RF-002 — Dados complementares do cliente

| Campo                          | Valor                                                                                                                                          |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-002                                                                                                                                         |
| **Módulo**              | Cadastro de Clientes                                                                                                                           |
| **Descrição**          | O sistema deve permitir registrar dados complementares do cliente não disponíveis via CNPJ: segmento de atuação e origem do contato        |
| **Prioridade**           | Must                                                                                                                                           |
| **Critério de aceite**  | Dado um cliente cadastrado, quando o usuário preencher segmento e origem, então esses dados devem ser salvos e exibidos no painel do cliente |
| **User Story vinculada** | US-002                                                                                                                                         |

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

#### RF-008 — Checklist de subtarefas

| Campo                          | Valor                                                                                                                                           |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-008                                                                                                                                          |
| **Módulo**              | Projetos e Tarefas                                                                                                                              |
| **Descrição**          | O sistema deve permitir dividir uma tarefa em itens de checklist (subtarefas) simples, marcáveis como concluídos                              |
| **Prioridade**           | Should                                                                                                                                          |
| **Critério de aceite**  | Dado uma tarefa criada, quando o usuário adicionar itens de checklist, então cada item deve poder ser marcado individualmente como concluído |
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

#### RF-021 — Check de subtarefa restrito ao atribuído ou à Talita

| Campo                             | Valor                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                      | RF-021                                                                                                                                                                                                                                                                                                                                                                                              |
| **Módulo**                 | Projetos e Tarefas (extensão)                                                                                                                                                                                                                                                                                                                                                                      |
| **Descrição**             | Apenas a pessoa atribuída a uma subtarefa específica, ou o Administrador (Talita), pode marcá-la como concluída — mesmo que outra pessoa tenha acesso à tarefa/projeto (incluindo o Administrador Interno atribuído ao projeto inteiro). Isso é uma permissão**distinta** de gerir o checklist (criar/editar/reordenar itens), que segue o escopo normal de acesso à tarefa/projeto |
| **Prioridade**              | Must                                                                                                                                                                                                                                                                                                                                                                                                |
| **Critério de aceite**     | Dado uma subtarefa atribuída à Pessoa A, quando a Pessoa B (com acesso à mesma tarefa/projeto, mas não atribuída àquela subtarefa) tentar marcar como concluída, então o sistema deve bloquear a ação, mesmo que a Pessoa B seja um Administrador Interno com acesso ao projeto inteiro                                                                                                   |
| **User Story vinculada**    | —                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Nota de implementação** | Descoberto em teste de integração (Sprint 1): a primeira implementação permitia que o Administrador Interno concluísse subtarefas de outras pessoas dentro do seu próprio projeto, violando esta regra. Corrigido separando a permissão de "gerir checklist" da permissão de "marcar concluída"                                                                                            |

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

| Campo                          | Valor                                                                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-026                                                                                                                                  |
| **Módulo**              | Cadastro de Clientes (extensão)                                                                                                        |
| **Descrição**          | O sistema deve permitir cadastrar o Responsável Legal da empresa: nome, endereço, RG, CPF, telefone, e-mail                           |
| **Prioridade**           | Must                                                                                                                                    |
| **Critério de aceite**  | Dado um cliente cadastrado, quando o usuário preencher os dados do Responsável Legal, então devem ser salvos e vinculados ao cliente |
| **User Story vinculada** | —                                                                                                                                      |

#### RF-027 — Cadastro de Ponto de Contato com herança de dados

| Campo                          | Valor                                                                                                                                                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-027                                                                                                                                                                                                                          |
| **Módulo**              | Cadastro de Clientes (extensão)                                                                                                                                                                                                |
| **Descrição**          | Quando o Ponto de Contato for a mesma pessoa que o Responsável Legal, o sistema deve copiar automaticamente os dados já cadastrados (nome, endereço, RG, CPF, telefone, e-mail) e solicitar apenas o campo adicional "cargo" |
| **Prioridade**           | Must                                                                                                                                                                                                                            |
| **Critério de aceite**  | Dado um Responsável Legal já cadastrado, quando o usuário marcar "mesmo que o Ponto de Contato", então os campos devem ser preenchidos automaticamente, restando apenas "cargo" a preencher                                 |
| **User Story vinculada** | —                                                                                                                                                                                                                              |

#### RF-028 — Cadastro de pessoas do operacional

| Campo                          | Valor                                                                                                                                          |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-028                                                                                                                                         |
| **Módulo**              | Cadastro de Clientes (extensão)                                                                                                               |
| **Descrição**          | O sistema deve permitir cadastrar múltiplas pessoas do time operacional do cliente, vinculadas à empresa                                     |
| **Prioridade**           | Must                                                                                                                                           |
| **Critério de aceite**  | Dado um cliente cadastrado, quando o usuário adicionar uma pessoa do operacional, então ela deve ficar listada como vinculada a esse cliente |
| **User Story vinculada** | —                                                                                                                                             |

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

| Campo                          | Valor                                                                                                                                                                      |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-031                                                                                                                                                                     |
| **Módulo**              | Autenticação (extensão)                                                                                                                                                 |
| **Descrição**          | Ao cadastrar um cliente (RF-001), o sistema deve permitir gerar um acesso de login para o Ponto de Contato, com o mesmo fluxo de definição de senha por e-mail do RF-030 |
| **Prioridade**           | Must                                                                                                                                                                       |
| **Critério de aceite**  | Dado um cliente recém-cadastrado, quando a Talita optar por criar o acesso, então o Ponto de Contato deve receber e-mail para definir senha e acessar a Área Exclusiva  |
| **User Story vinculada** | —                                                                                                                                                                         |

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
| RN-004 | O check de uma subtarefa só pode ser feito por quem está atribuído a ela especificamente, ou pelo Administrador (Talita) — independente de outro perfil ter acesso à tarefa/projeto. Esta é uma permissão distinta de "gerir o checklist" (criar/editar itens), que segue o escopo normal de acesso | Um Administrador Interno com acesso ao projeto inteiro não pode marcar uma subtarefa atribuída a outra pessoa como concluída, mas pode ver/editar o checklist |
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

## Histórico de Revisõe

# Especificação de Requisitos — Múltiplus Software

**Versão:** 1.2
**Data:** 02/09/2026
**Autor:** André (Somma)
**Status:** Rascunho — escopo estendido (Seções 3.8 a 3.13) absorvido sem aditivo, por decisão consciente do André
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
- Checklist de subtarefas
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
| Subtarefa               | Item de checklist dentro de uma tarefa de um projeto                       |
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

#### RF-001 — Cadastro de cliente via CNPJ

| Campo                          | Valor                                                                                                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-001                                                                                                                                                     |
| **Módulo**              | Cadastro de Clientes                                                                                                                                       |
| **Descrição**          | O sistema deve permitir cadastrar um cliente informando o CNPJ, preenchendo automaticamente razão social, endereço e demais dados públicos disponíveis |
| **Prioridade**           | Must                                                                                                                                                       |
| **Critério de aceite**  | Dado um CNPJ válido, quando o usuário o inserir no cadastro, então o sistema deve preencher automaticamente os campos disponíveis via consulta externa |
| **User Story vinculada** | US-001                                                                                                                                                     |

#### RF-002 — Dados complementares do cliente

| Campo                          | Valor                                                                                                                                          |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-002                                                                                                                                         |
| **Módulo**              | Cadastro de Clientes                                                                                                                           |
| **Descrição**          | O sistema deve permitir registrar dados complementares do cliente não disponíveis via CNPJ: segmento de atuação e origem do contato        |
| **Prioridade**           | Must                                                                                                                                           |
| **Critério de aceite**  | Dado um cliente cadastrado, quando o usuário preencher segmento e origem, então esses dados devem ser salvos e exibidos no painel do cliente |
| **User Story vinculada** | US-002                                                                                                                                         |

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

#### RF-008 — Checklist de subtarefas

| Campo                          | Valor                                                                                                                                           |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-008                                                                                                                                          |
| **Módulo**              | Projetos e Tarefas                                                                                                                              |
| **Descrição**          | O sistema deve permitir dividir uma tarefa em itens de checklist (subtarefas) simples, marcáveis como concluídos                              |
| **Prioridade**           | Should                                                                                                                                          |
| **Critério de aceite**  | Dado uma tarefa criada, quando o usuário adicionar itens de checklist, então cada item deve poder ser marcado individualmente como concluído |
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

#### RF-021 — Check de subtarefa restrito ao atribuído ou à Talita

| Campo                          | Valor                                                                                                                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-021                                                                                                                                                                                  |
| **Módulo**              | Projetos e Tarefas (extensão)                                                                                                                                                          |
| **Descrição**          | Apenas a pessoa atribuída a uma subtarefa específica, ou o Administrador (Talita), pode marcá-la como concluída — mesmo que outra pessoa tenha acesso à tarefa/projeto            |
| **Prioridade**           | Must                                                                                                                                                                                    |
| **Critério de aceite**  | Dado uma subtarefa atribuída à Pessoa A, quando a Pessoa B (com acesso à mesma tarefa, mas não à subtarefa) tentar marcar como concluída, então o sistema deve bloquear a ação |
| **User Story vinculada** | —                                                                                                                                                                                      |

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

| Campo                          | Valor                                                                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-026                                                                                                                                  |
| **Módulo**              | Cadastro de Clientes (extensão)                                                                                                        |
| **Descrição**          | O sistema deve permitir cadastrar o Responsável Legal da empresa: nome, endereço, RG, CPF, telefone, e-mail                           |
| **Prioridade**           | Must                                                                                                                                    |
| **Critério de aceite**  | Dado um cliente cadastrado, quando o usuário preencher os dados do Responsável Legal, então devem ser salvos e vinculados ao cliente |
| **User Story vinculada** | —                                                                                                                                      |

#### RF-027 — Cadastro de Ponto de Contato com herança de dados

| Campo                          | Valor                                                                                                                                                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-027                                                                                                                                                                                                                          |
| **Módulo**              | Cadastro de Clientes (extensão)                                                                                                                                                                                                |
| **Descrição**          | Quando o Ponto de Contato for a mesma pessoa que o Responsável Legal, o sistema deve copiar automaticamente os dados já cadastrados (nome, endereço, RG, CPF, telefone, e-mail) e solicitar apenas o campo adicional "cargo" |
| **Prioridade**           | Must                                                                                                                                                                                                                            |
| **Critério de aceite**  | Dado um Responsável Legal já cadastrado, quando o usuário marcar "mesmo que o Ponto de Contato", então os campos devem ser preenchidos automaticamente, restando apenas "cargo" a preencher                                 |
| **User Story vinculada** | —                                                                                                                                                                                                                              |

#### RF-028 — Cadastro de pessoas do operacional

| Campo                          | Valor                                                                                                                                          |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-028                                                                                                                                         |
| **Módulo**              | Cadastro de Clientes (extensão)                                                                                                               |
| **Descrição**          | O sistema deve permitir cadastrar múltiplas pessoas do time operacional do cliente, vinculadas à empresa                                     |
| **Prioridade**           | Must                                                                                                                                           |
| **Critério de aceite**  | Dado um cliente cadastrado, quando o usuário adicionar uma pessoa do operacional, então ela deve ficar listada como vinculada a esse cliente |
| **User Story vinculada** | —                                                                                                                                             |

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

| Campo                          | Valor                                                                                                                                                                      |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                   | RF-031                                                                                                                                                                     |
| **Módulo**              | Autenticação (extensão)                                                                                                                                                 |
| **Descrição**          | Ao cadastrar um cliente (RF-001), o sistema deve permitir gerar um acesso de login para o Ponto de Contato, com o mesmo fluxo de definição de senha por e-mail do RF-030 |
| **Prioridade**           | Must                                                                                                                                                                       |
| **Critério de aceite**  | Dado um cliente recém-cadastrado, quando a Talita optar por criar o acesso, então o Ponto de Contato deve receber e-mail para definir senha e acessar a Área Exclusiva  |
| **User Story vinculada** | —                                                                                                                                                                         |

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

| ID     | Regra                                                                                                                                                                                    | Exemplo concreto                                                                                                      |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| RN-001 | *(a validar)* Uma tarefa é considerada "atrasada" para fins do indicador de % em dia quando seu prazo vence sem que ela esteja marcada como concluída                                | Tarefa com prazo 10/09 não concluída até 11/09 conta como atrasada                                                 |
| RN-002 | *(a validar)* A recorrência de uma tarefa é definida por tipo de condicionante/licença                                                                                              | Renovação de LO pode ser anual; outros condicionantes podem ter periodicidade diferente                             |
| RN-003 | O cliente final tem acesso somente de leitura aos próprios dados, sem poder editar tarefas, prazos ou documentos                                                                        | Cliente acessa o painel mas os botões de edição ficam ocultos/desabilitados                                        |
| RN-004 | O check de uma subtarefa só pode ser feito por quem está atribuído a ela especificamente, ou pelo Administrador (Talita) — independente de outro perfil ter acesso à tarefa/projeto | Um Administrador Interno com acesso ao projeto não pode marcar uma subtarefa atribuída a outra pessoa               |
| RN-005 | Administrador Interno é atribuído por projeto inteiro; Administrador Externo é atribuído por tarefa específica — granularidades diferentes de escopo                               | Administrador Interno vê todas as tarefas do Projeto X; Administrador Externo só vê a Tarefa Y dentro do Projeto X |

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

| Versão | Data       | Autor  | Alterações                                                                                                                                                                                                                                                                                                                             |
| ------- | ---------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | 02/09/2026 | André | Versão inicial, com base na Proposta Comercial Enxuta (06/08/2026)                                                                                                                                                                                                                                                                      |
| 1.1     | 02/09/2026 | André | Detalhamento de escopo: sistema de perfis e permissões (RF-018 a RF-021), notificações configuráveis (RF-022, RF-023), status e etiquetas (RF-024, RF-025), cadastro de PJ expandido (RF-026 a RF-028), controle de acesso do cliente (RF-029), comentários expandidos para 3 níveis com imagem e link (RF-016, RF-017 revisados). |
| 1.2     | 02/09/2026 | André | André decidiu absorver o detalhamento de escopo da v1.1 sem aditivo contratual — requisitos marcados como Must, sem pendência comercial.                                                                                                                                                                                              |
| 1.3     | 02/09/2026 | André | Adicionada Seção 3.14 (Onboarding e Recuperação de Acesso — RF-030 a RF-032), identificada no checklist de qualidade SaaS multi-perfil antes da Sprint 1.                                                                                                                                                                           |
