# Sistema de Gestão Múltiplus: perfil Colaborador interno

Especificação para o desenvolvedor. Múltiplus Ambiental, versão de 07/11/2026.

Este documento complementa a especificação do acesso da Administradora (`../00-especificacao.md`). **O padrão visual da seção 3 daquele documento vale igualmente aqui:** fonte, cores, semáforo, componentes e textos. Abaixo estão só as regras e as telas próprias do perfil Colaborador interno, que é a equipe da Múltiplus.

---

## 1. Como usar este material

- As 9 telas estão nesta pasta. O menu lateral de cada tela leva às outras.
- **Para entrar pela tela de login:** abra `../01-login.html` e use um e-mail que comece com "andre" e qualquer senha. Isso abre a visão do colaborador interno. Outro e-mail abre a visão da administradora.
- **Dados ilustrativos:** o usuário de exemplo é "André Vieira", colaborador interno responsável por 5 projetos. A data de referência é 07/11/2026.
- Cada arquivo traz no topo do código um comentário com as regras daquela tela.

## 2. Telas

| # | Tela | Arquivo | O que mostra |
|---|---|---|---|
| 1 | Painel (página inicial) | [01-painel.html](01-painel.html) | Semana, quatro cartões de resumo, comprovantes para conferir, "Fazer agora", itens aguardando outras pessoas, projetos e menções |
| 2 | Minhas tarefas | [02-minhas-tarefas.html](02-minhas-tarefas.html) | Abas "Minhas" e "Da equipe", com tarefas e subtarefas juntas e ação na linha |
| 3 | Meus projetos | [03-meus-projetos.html](03-meus-projetos.html) | Cartões com progresso, prazo e pendências, sem valores |
| 4 | Página do projeto | [04-projeto.html](04-projeto.html) | A mesma página da administradora, sem valores e sem ações de gestão do projeto |
| 5 | Página da tarefa | [05-tarefa.html](05-tarefa.html) | Edição, conferência de comprovantes, conclusão com envio para confirmação e cancelamento com motivo |
| 6 | Clientes | [06-clientes.html](06-clientes.html) | Lista e ficha em modo consulta (clique em um cliente) |
| 7 | Agenda | [07-agenda.html](07-agenda.html) | A agenda só com os projetos dele, mais o filtro "Só os meus" |
| 8 | Avisos | [08-avisos.html](08-avisos.html) | Caixa de avisos dele, com o botão "Conferir" nos comprovantes |
| 9 | Meu perfil | [09-meu-perfil.html](09-meu-perfil.html) | Dados, senha, o que ele acessa e quais avisos recebe. Esta tela vale para todos os perfis |

## 3. Regras de acesso do perfil

### 3.1 O que ele enxerga

- **Todos os itens dos projetos atribuídos a ele** (atribuição por projeto, como já está no cadastro de usuário). Isso inclui as tarefas e subtarefas de outras pessoas nesses projetos.
- **Corrigir o texto da tela atual "Meus projetos".** Hoje ela diz "Projetos em que você possui uma tarefa ou subtarefa atribuída", que é outra regra. O certo é "Projetos atribuídos a você".
- **Nenhum valor financeiro:** valor contratado, parcelas, número da proposta comercial, documento da proposta e "Total contratado em projetos ativos" da ficha do cliente.
- **Clientes:** só os clientes dos projetos dele, sem laudo técnico e sem a situação do portal do cliente.
- **Não vê** Usuários nem Configurações.

> **Importante para a implementação:** a restrição precisa ser aplicada no servidor, e não só escondida na tela. Os valores, os laudos e os projetos que não são dele não podem chegar ao navegador do colaborador interno, nem na resposta das rotas e das ações. Caso contrário, qualquer pessoa consegue ver esses dados pelas ferramentas do navegador.

### 3.2 O que ele pode fazer

| Ação | Colaborador interno |
|---|---|
| Criar e editar tarefas e subtarefas nos projetos dele | Pode |
| Duplicar tarefa | Pode |
| Trocar o status de tarefa para os status intermediários (Em andamento, Protocolado, Sob análise do órgão etc.) | Pode |
| Marcar tarefa ou subtarefa como **Concluída** | **Não.** Usa "Concluir e enviar para confirmação", e a administradora confirma |
| **Cancelar tarefa** | Pode, **com motivo obrigatório**. A administradora é avisada e o motivo fica no histórico |
| Desativar tarefa | Não |
| **Confirmar ou rejeitar comprovantes de colaborador externo** nos projetos dele | Pode. A rejeição exige motivo |
| Concluir itens de outras pessoas | Não |
| Comentar, mencionar, adicionar documentos e cobrar responsáveis | Pode |
| Editar, desativar ou duplicar projeto, ou alterar o status do projeto | Não. O status aparece só para leitura |
| Criar ou editar cliente | Não |
| Exportar PDF (listas e projeto) | Pode, só com os dados que ele enxerga |

### 3.3 Regras novas que valem para todos os perfis

1. **O prazo para quando a conclusão é enviada.**
   - Ao enviar para confirmação, o item mostra "Enviado em dd/mm" e não conta atraso.
   - Se for confirmado, a conclusão vale com a data do envio.
   - Se for rejeitado, o prazo volta a contar.
   
   Vale também para colaborador externo e deve entrar no semáforo, no painel e nos relatórios.
2. **Status de espera.** "Aguardando documento do cliente", "Sob análise do órgão" e "Aguardando confirmação" são tratados como **aguardando outras pessoas**. Esses itens saem da lista de trabalho imediato do responsável e aparecem num grupo próprio.
3. **Prestador sem acesso ao sistema** aparece nos itens, mas sem o botão "Cobrar".

## 4. Menu do perfil

| Grupo | Itens |
|---|---|
| Dia a dia | Painel · Agenda · Avisos (com contador de não lidos) |
| Trabalho | Meus projetos · Minhas tarefas |
| Consulta | Clientes |
| Rodapé | Nome, perfil, Meu perfil, Sair |

- **Barra superior:** busca geral e botão "Novo" com as opções **Nova tarefa** e **Nova subtarefa**.
- **Página inicial:** o Painel. Hoje ele entra direto em Notificações.

## 5. Telas

### 5.1 Painel ([01-painel.html](01-painel.html))

1. **Saudação com resumo do dia:** "Bom dia, André. 2 itens atrasados e 2 comprovantes para conferir."
2. **Faixa da semana:** 7 dias a partir de hoje, cada um com o número de entregas dele e uma barra colorida. **Clicar no dia filtra a lista "Fazer agora".**
3. **Quatro cartões clicáveis.** Cada um leva ao bloco correspondente:
   - Atrasados comigo;
   - Vencem esta semana;
   - Para conferir;
   - Aguardando outras pessoas.
4. **Comprovantes para conferir:** envios de colaboradores externos nos projetos dele, com Ver, Rejeitar (motivo obrigatório) e Confirmar. **O bloco some quando não há envios.**
5. **Fazer agora:** tarefas e subtarefas dele, abertas e sem status de espera, em ordem de prazo.
   - Filtros: Todos, Atrasados, Hoje e amanhã, Esta semana.
   - Ações: Comentar e **Concluir**. Concluir abre o diálogo com comentário e anexo e envia para a administradora.
6. **Aguardando outras pessoas:** o que está parado com colaborador externo, prestador, cliente, órgão ambiental ou na confirmação da administradora, com "Cobrar" quando o responsável tem acesso.
7. **Meus projetos:** anel de progresso (cor pelo semáforo), prazo e quantos itens dele estão abertos.
8. **Menções e comentários** ainda não lidos.

### 5.2 Minhas tarefas ([02-minhas-tarefas.html](02-minhas-tarefas.html))

- **Abas:**
  - **Minhas:** itens em que ele é o responsável.
  - **Da equipe:** tudo o que está aberto nos projetos dele, de todos os responsáveis. Nessa aba aparece o filtro por responsável, e os itens dele aparecem como "Você".
- **Tarefas e subtarefas juntas.** A subtarefa mostra a tarefa de origem ("em Inventário trimestral de resíduos"). Isso resolve o caso de tarefas com o mesmo nome no mesmo projeto.
- **Filtros:** busca, cliente, projeto, tipo (tarefas e/ou subtarefas) e situação (Todos, Atrasados, Vencem em até X dias, No prazo, Aguardando outras pessoas). "Mostrar concluídas e canceladas" e "Limpar filtros".
- **Ordem:** atrasados, depois próximos, no prazo e aguardando. Dentro de cada grupo, por data.
- **Ação na linha:**
  - **Concluir:** nos itens dele.
  - **Conferir:** em comprovantes de externos.
  - **Cobrar:** em itens de externos atrasados.
  - Item já enviado mostra "Aguardando a Talita".
- **Concluir direto na lista** é permitido, porque tudo passa pela confirmação da administradora.

### 5.3 Meus projetos ([03-meus-projetos.html](03-meus-projetos.html))

- **Cartões.** Cada um mostra:
  - cliente, status, nome e ID;
  - **anel de progresso**;
  - prazo com data e selo;
  - selos "X para conferir" e "X aguardando terceiros", quando houver;
  - três números: **minhas pendências**, **minhas atrasadas** e **abertas na equipe**;
  - a **próxima entrega** do projeto.
- **Filtros:** Ativos, Com pendências minhas, Com atraso, Concluídos e Todos. Busca, cliente e ordenação (prazo, minhas pendências, nome).
- O cartão inteiro abre a página do projeto. **Sem valores.**

### 5.4 Página do projeto ([04-projeto.html](04-projeto.html))

A mesma estrutura da página da administradora, com estas diferenças:
- **Valores e proposta:** não aparecem o valor contratado nem as parcelas. A proposta comercial sai do cabeçalho e da lista de documentos.
- **Resumo:** "Minhas pendências" ocupa o lugar do valor contratado.
- **Status do projeto:** só leitura.
- **Ações no topo:** só **Exportar PDF**. Editar, Desativar e Duplicar não aparecem.
- **Continua com:** Nova tarefa, comentários, adicionar documento e "Quem acessa".
- **Na lista de tarefas,** os itens dele aparecem como "Você".

### 5.5 Página da tarefa ([05-tarefa.html](05-tarefa.html))

- A mesma estrutura da página da administradora.
- **Pode editar** a tarefa, criar subtarefas e trocar os status intermediários.
- **Menu de status:** "Concluída" e "Cancelada" foram substituídas por **"Concluir e enviar para confirmação"**. O diálogo informa que o prazo para de contar.
- **Comprovantes de colaborador externo:** ele confirma ou rejeita. No histórico fica registrado quem confirmou.
- **Menu "...":**
  - Duplicar tarefa;
  - **Cancelar tarefa**, com motivo obrigatório. O cancelamento também cancela as subtarefas abertas, para os avisos e as próximas ocorrências e avisa a administradora.

### 5.6 Clientes ([06-clientes.html](06-clientes.html))

- **Só consulta:** sem Novo cliente, Editar e Desativar.
- **Lista:** ID, cliente, segmento, cidade, **Projetos comigo** e **Pendências**. Filtros: Todos, Com pendências minhas, Com atraso.
- **Ficha:**
  - **Fica:** dados da empresa, ponto de contato, projetos dele com aquele cliente, pessoas da empresa (com o tipo de acesso de cada uma, sem ações) e documentos (só leitura).
  - **Sai:** valor contratado, laudo técnico e quadro do portal do cliente.

### 5.7 Agenda ([07-agenda.html](07-agenda.html))

- A mesma agenda da administradora, só com os itens dos projetos dele.
- Filtro extra **"Só os meus"**.
- No detalhe do dia, os itens dele aparecem como "Você".

### 5.8 Avisos ([08-avisos.html](08-avisos.html))

- A mesma tela de avisos da administradora.
- Comprovantes de externos chegam com o botão **"Conferir"**.
- Confirmações e rejeições das conclusões dele aparecem com o **motivo** escrito pela administradora.
- "Preferências" leva a Meu perfil.

### 5.9 Meu perfil ([09-meu-perfil.html](09-meu-perfil.html))

**Esta tela vale para todos os perfis, inclusive a administradora.** Só o conteúdo de "O que você acessa" muda.

- **Meus dados:**
  - pode alterar **nome e telefone**;
  - e-mail, cargo e perfil aparecem bloqueados ("só a administradora altera");
  - o botão Salvar só habilita quando algo muda.
- **Senha:** senha atual, nova e confirmação, com as regras visíveis e marcadas enquanto a pessoa digita (8 caracteres, uma letra, um número e as duas iguais).
- **O que você acessa:** lista dos projetos atribuídos, para o interno; das tarefas, para o externo.
- **Avisos que você recebe:** o que a administradora configurou para o perfil, só para leitura. A escolha individual de avisos fica para uma fase futura.

## 6. Problemas encontrados nas telas atuais do perfil

| Tela | Problema |
|---|---|
| Notificações | Categoria e título não batem ("Solicitação de conclusão" com o título "Conclusão confirmada") |
| | Texto repetido: "A conclusão de tarefa Tarefa dia 30/10..." |
| | Aviso duplicado ("Nova atribuição: Teste", duas vezes no mesmo horário) |
| | Sem marcação de lido e não lido |
| Clientes | ID abaixo do nome, enquanto na visão da administradora ele tem coluna própria |
| | Selo de segmento vazio, cidade "—" e "Ver detalhe" quebrando em duas linhas |
| Meus projetos | Regra exibida diferente da regra real (ver 3.1) |
| | Selo de status quebrando em duas linhas |
| | "Semáforo: 347 dias" sem data |
| Minhas tarefas | Erros de texto: "0 de 2 concluídas subtarefas" e "0 de 1 concluídas" |
| | Duas tarefas com o mesmo nome no mesmo projeto, impossíveis de diferenciar |
| | Prazo sem data |
| | Selos repetidos ("Concluído" e "Concluída") |
| | Subtarefas atribuídas a ele não aparecem |
| Meu perfil | Botão verde fora do padrão |
| | Nome cortado no rodapé do menu |
| Dados | O usuário "André Cassimiro Vieira Filho" (cargo "Engenheiro de Software") está cadastrado também como cliente (ID 02) e é responsável por projetos "Teste". Separar os cadastros de teste dos dados reais antes de liberar o acesso à equipe |

## 7. Funções novas deste perfil (preciso de estimativa)

| # | Função | Prioridade sugerida |
|---|---|---|
| 1 | **Permissões no servidor** conforme a seção 3 (projetos atribuídos, sem valores, sem laudo, sem portal) | Alta |
| 2 | **Conclusão com envio para confirmação** e **prazo pausado no envio** (seção 3.3) | Alta |
| 3 | **Confirmação e rejeição de comprovantes de externos** pelo colaborador interno | Alta |
| 4 | **Painel do colaborador interno** (seção 5.1), com a faixa da semana e o agrupamento "Aguardando outras pessoas" | Alta |
| 5 | **Minhas tarefas com subtarefas** e aba **Da equipe** | Alta |
| 6 | **Cancelar tarefa com motivo** e aviso à administradora | Média |
| 7 | **Meus projetos em cartões** com as contagens por pessoa | Média |
| 8 | **Agenda** para o perfil, com "Só os meus" | Média |
| 9 | **Meu perfil** com telefone editável, lista de acessos e avisos recebidos | Baixa |

## 8. Perguntas para o desenvolvedor

1. Hoje a regra de visibilidade do interno é aplicada no servidor (consultas e ações), ou só na interface?
2. As consultas que alimentam as telas dele já deixam de devolver valor contratado, proposta e laudo?
3. Existe hoje algum caminho em que o colaborador interno consiga concluir um item sem confirmação, por exemplo pelo menu de status da subtarefa?
