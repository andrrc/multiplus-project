# Sistema de Gestão Múltiplus: perfil Cliente

Especificação para o desenvolvedor. Múltiplus Ambiental, versão de 07/11/2026.

Este documento complementa a especificação do acesso da Administradora (`../00-especificacao.md`). **O padrão visual da seção 3 daquele documento vale também para o perfil Cliente:** fonte, cores, semáforo, componentes e textos. Aqui estão as regras e as telas do portal do cliente, usado pela diretoria e pelos contatos da empresa contratante.

**O portal do cliente é a imagem da Múltiplus diante da diretoria.** Toda informação que aparece nele precisa estar correta e explicar a situação, sem dar margem a interpretação errada.

---

## 1. Como usar este material

- As 4 telas estão nesta pasta. O menu lateral de cada tela leva às outras.
- **Para entrar pela tela de login:** abra `../01-login.html` e use um e-mail que comece com "marcos" e qualquer senha.
- **Dados ilustrativos:** o usuário de exemplo é "Marcos Lima", diretor industrial da "Indústria Alfa Ltda", empresa com duas unidades (Itapetininga e Tatuí). A data de referência é 07/11/2026.
- Cada arquivo traz no topo do código um comentário com as regras daquela tela.

## 2. Telas

| # | Tela | Arquivo | O que mostra |
|---|---|---|---|
| 1 | Painel (página inicial) | [01-painel.html](01-painel.html) | Situação geral, pendências por responsável, "Precisa de vocês", projetos com trilha de etapas, próximos 90 dias, feito nos últimos 30 dias, consultores e documentos |
| 2 | Projetos | [02-projetos.html](02-projetos.html) | Todos os projetos, com etapas, datas e atualizações publicadas para o cliente |
| 3 | Relatórios | [03-relatorios.html](03-relatorios.html) | Montagem do relatório em PDF, com prévia em folha A4, e histórico dos resumos mensais |
| 4 | Meu perfil | [04-meu-perfil.html](04-meu-perfil.html) | A mesma tela de todos os perfis, na visão do cliente |

## 3. Regras do perfil

### 3.1 O que o cliente vê

- **Só os dados da própria empresa,** de todas as unidades a que tem acesso.
- **Mais de uma unidade:** quando a empresa tem mais de uma unidade (ou CNPJ), o mesmo login vê todas, com um **seletor de unidade** na barra superior que filtra todas as telas.
- **Situação de cada pendência, com o responsável.** Toda pendência informa com quem está:
  - **com a sua empresa:** inclui colaboradores externos e a própria diretoria;
  - **com a Múltiplus**;
  - **com o órgão ambiental.**
- **Nomes dos responsáveis da empresa:** o cliente vê o nome e o setor do colaborador externo que está com o item atrasado (exemplo: "Carlos Souza, Manutenção, 12 dias de atraso").
- **Responsável da Múltiplus por projeto,** com botões de e-mail e WhatsApp.
- **Atualizações marcadas como "visíveis ao cliente"** (ver 3.3).

### 3.2 O que o cliente não vê

- Valores (valor contratado, parcelas, proposta comercial).
- Comentários internos e histórico interno.
- Laudo técnico.
- Projetos e dados de outras empresas.
- Documentos dentro do sistema (ver 3.4).

> **Importante para a implementação:** como nos outros perfis, a restrição precisa ser aplicada no servidor. Valores, comentários internos, laudos e dados de outras empresas não podem chegar ao navegador do cliente.

### 3.3 Regras novas

1. **Projeto "A iniciar", ou sem tarefas, nunca aparece como atrasado para o cliente.** Hoje aparece "A iniciar", "Sem tarefas ativas" e "Atrasado 6 dias" no mesmo cartão.
2. **Atualização visível ao cliente.** No formulário de comentário do projeto e da tarefa, entra a opção **"Visível ao cliente"**:
   - só a administradora e o colaborador interno podem marcar;
   - o colaborador externo não tem essa opção;
   - os comentários sem a marcação continuam internos.
3. **O cliente não envia arquivos pelo sistema.** Quem envia comprovantes são os colaboradores externos, pelo próprio acesso. Documentos pedidos à diretoria são enviados ao consultor por e-mail ou WhatsApp.
4. **Escalonamento por e-mail para a diretoria: desligado por padrão.** A opção continua em Configurações para uso futuro. A diretoria acompanha os atrasos pelo painel e pelo resumo mensal.
5. **Conformidade por frente de gestão: fica para uma fase futura.** Não entra agora.

### 3.4 Documentos

- Os documentos do cliente (licenças, protocolos, relatórios, laudos entregues) ficam numa **pasta do Google Drive** organizada manualmente pela Múltiplus.
- O sistema mostra só o **link para essa pasta**: no menu ("Documentos ↗") e num bloco do painel. O link é cadastrado na ficha do cliente.
- **O sistema não controla o acesso à pasta.** O compartilhamento é feito no Drive com os e-mails da diretoria, nunca com "qualquer pessoa com o link". Quando um usuário cliente é bloqueado no sistema, o acesso à pasta deve ser retirado no Drive.

### 3.5 Trilha de etapas

- **As etapas são as tarefas do projeto, na ordem.**
- **Etapa atual:** a primeira tarefa não concluída. Mostra com quem está, a partir do status da tarefa:

  | Status da tarefa | Com quem |
  |---|---|
  | Aguardando documento do cliente | Sua empresa |
  | Sob análise do órgão | Órgão ambiental |
  | Demais status | Múltiplus |

  Se a etapa depender de um colaborador externo da empresa, ela também aparece como "Sua empresa".
- **Projeto com mais de 6 tarefas**, como a gestão continuada: no lugar da trilha, mostra "X de Y entregas concluídas", com barra, e o item em andamento.
- **Modelos de etapas por tipo de projeto** ficam para uma fase futura.

## 4. Menu do perfil

| Item | Destino |
|---|---|
| Painel | Página inicial |
| Projetos | Lista de projetos |
| Relatórios | Montagem e histórico de relatórios |
| Documentos ↗ | Abre a pasta do cliente no Google Drive, em nova aba |
| Rodapé | Nome, "Cliente", Meu perfil, Sair |

- **Barra superior:** seletor de unidade e botão **Gerar relatório**.
- **Página inicial:** o Painel. Hoje o cliente entra em Meu perfil.

## 5. Telas

### 5.1 Painel ([01-painel.html](01-painel.html))

1. **Saudação** com o nome da empresa, a unidade selecionada e o horário da última atualização.
2. **Situação geral:**
   - anel com "X de Y obrigações em dia";
   - **pendências em aberto por responsável**, em três quadros: com a sua empresa, com a Múltiplus e com o órgão ambiental.
3. **Precisa de vocês:** pendências da empresa, com nome e setor do responsável, unidade, prazo e atraso. Inclui o que foi pedido à própria diretoria (aparece como "Você"). No rodapé, uma nota explica como enviar.
4. **Projetos em andamento:**
   - trilha de etapas;
   - etapa atual, com o selo de com quem está;
   - responsável da Múltiplus e prazo;
   - **a última atualização visível ao cliente**.
5. **Próximos 90 dias:** linha do tempo com os prazos e visitas, cada um com o responsável.
6. **Feito nos últimos 30 dias:** linha do tempo com as entregas concluídas.
7. **Seus consultores:** nome, função, e-mail e WhatsApp.
8. **Documentos:** botão "Abrir pasta no Google Drive".

**Base do cálculo de "obrigações em dia":**
- conta tarefas e subtarefas abertas da empresa;
- conta como em dia o que está no prazo, enviado para confirmação (prazo pausado) ou em análise no órgão;
- os atrasados são separados pelo responsável.

### 5.2 Projetos ([02-projetos.html](02-projetos.html))

- **Filtros:** Em andamento, Concluídos e Todos, além do seletor de unidade.
- **Cada projeto:** trilha de etapas, etapa atual com quem está, responsável e prazo.
- **"Ver etapas e atualizações":**
  - tabela de etapas, com situação (Concluída, Com a sua empresa, No órgão, Em andamento, A seguir) e data (de conclusão ou prevista);
  - **todas as atualizações visíveis ao cliente**, da mais recente para a mais antiga.
- **Gestão continuada:** a tabela lista as entregas do ano.

### 5.3 Relatórios ([03-relatorios.html](03-relatorios.html))

- **Montagem:**
  - período: mês atual, mês anterior, último trimestre ou ano;
  - unidade;
  - seções a incluir.
- **Prévia em folha A4,** que muda na hora, com a logo da Múltiplus e as seções:
  1. situação geral;
  2. projetos e etapas;
  3. pendências da empresa, com os responsáveis;
  4. entregas do período;
  5. próximos vencimentos.
- **Rodapé do relatório:** quem gerou, data e hora, e a observação de que os documentos oficiais estão na pasta do Drive.
- **Baixar PDF e Imprimir** saem só com a folha. **O PDF deve ser gerado pelo servidor,** com o mesmo conteúdo da prévia.
- **Resumos mensais por e-mail:** lista dos resumos enviados todo 1º dia útil, para baixar de novo.

### 5.4 Meu perfil ([04-meu-perfil.html](04-meu-perfil.html))

- A mesma tela de todos os perfis (ver a especificação do colaborador interno, seção 5.9).
- **"O que você acessa":** painel da empresa com as unidades, projetos e relatórios, e a pasta do Drive.
- **"Avisos que você recebe":** projeto concluído e resumo mensal, por e-mail. O escalonamento aparece desligado.

## 6. Problemas encontrados nas telas atuais do perfil

| Tela | Problema |
|---|---|
| Acompanhamento | Projeto "A iniciar", "Sem tarefas ativas" e "Atrasado 6 dias" no mesmo cartão |
| | O atraso não diz com quem está a pendência |
| | Rótulo "Nome do projeto" repetido em cada cartão e rótulo "ÁREA EXCLUSIVA" |
| | Faixa vermelha forte, roxo no status "A iniciar" e borda azul decorativa |
| Menu | O cliente entra em Meu perfil, e não num painel |
| Meu perfil | Botão verde fora do padrão |
| | Nome cortado no rodapé do menu |
| Dados | O usuário "André Cassimiro Vieira Filho" aparece também como cliente, com projetos "Teste" e "TESTE 131231". Limpar antes de criar acessos para clientes reais |

## 7. Funções novas deste perfil (preciso de estimativa)

| # | Função | Prioridade sugerida |
|---|---|---|
| 1 | **Permissões no servidor** (seção 3.2) | Alta |
| 2 | **Comentário "visível ao cliente"** no projeto e na tarefa | Alta |
| 3 | **Painel do cliente** (seção 5.1), com o cálculo de obrigações em dia e a separação por responsável | Alta |
| 4 | **Trilha de etapas** a partir das tarefas (seção 3.5) | Alta |
| 5 | **Unidades:** cadastro de unidades por cliente e seletor no portal | Alta, se houver cliente com mais de uma unidade |
| 6 | **Relatório em PDF** gerado pelo servidor, com período, unidade e seções | Média |
| 7 | **Link da pasta do Drive** na ficha do cliente, exibido no portal | Média |
| 8 | **Resumo mensal por e-mail** e o histórico dos resumos | Baixa |

## 8. Perguntas para o desenvolvedor

1. O cadastro hoje permite mais de uma unidade (ou CNPJ) para o mesmo cliente? Se não, qual a melhor forma de criar: unidades dentro do cliente, ou clientes ligados a um grupo?
2. Hoje o login do cliente acessa os dados pelo servidor com filtro por empresa, ou o filtro é feito na tela?
3. A geração de PDF que já existe (listas de tarefas e subtarefas) pode ser reaproveitada para o relatório do cliente?
