# Sistema de Gestão Múltiplus: melhorias de interface

Especificação para o desenvolvedor. Múltiplus Ambiental, versão de 07/11/2026.

Este documento acompanha 10 telas de referência em HTML. Elas mostram como o sistema deve ficar no **acesso da Administradora**. Os acessos de Colaborador externo e de Cliente serão especificados numa próxima etapa.

---

## 1. Como usar este material

- Mantenha todos os arquivos na mesma pasta e abra os `.html` no navegador. O menu lateral de cada tela leva às outras, como no sistema real.
- **Os dados são ilustrativos.** Clientes, projetos, nomes e valores são fictícios e servem só para mostrar o layout preenchido.
- As telas funcionam como protótipo: os filtros, as abas, os menus, os diálogos de confirmação e os formulários respondem ao clique. Nada é salvo.
- Cada arquivo tem um comentário no topo do código com as cores, a fonte e as regras daquela tela. O CSS pode ser reaproveitado.
- O objetivo é o padrão visual e o comportamento. A estrutura interna do sistema (Next.js, banco, rotas) fica a seu critério.

## 2. Telas

| # | Tela | Arquivo | O que mostra |
|---|---|---|---|
| 1 | Login | [01-login.html](01-login.html) | Nova tela de entrada. Com e-mail e senha preenchidos, abre o painel. Com os campos vazios, mostra o estado de erro |
| 2 | Painel (página inicial) | [02-painel.html](02-painel.html) | Novo menu lateral, barra superior e o painel que substitui a Visão gerencial como página inicial |
| 3 | Listas | [03-listas-projetos-tarefas.html](03-listas-projetos-tarefas.html) | Projetos, Tarefas e Subtarefas no mesmo padrão de lista. Alterne entre elas pelo menu |
| 4 | Página do projeto | [04-projeto.html](04-projeto.html) | Cabeçalho, resumo, tarefas, comentários e histórico, documentos e quem acessa |
| 5 | Página da tarefa | [05-tarefa.html](05-tarefa.html) | Subtarefas com comprovantes, confirmação e rejeição de conclusão, cobrança do responsável |
| 6 | Clientes | [06-clientes.html](06-clientes.html) | Lista com ID e a ficha do cliente (clique em qualquer linha) |
| 7 | Usuários | [07-usuarios.html](07-usuarios.html) | Lista de todos os acessos e o formulário de novo usuário |
| 8 | Configurações | [08-configuracoes.html](08-configuracoes.html) | Prazos e avisos, notificações por perfil e etiquetas, em abas |
| 9 | Agenda | [09-agenda.html](09-agenda.html) | Calendário mensal e lista de prazos, visitas e próximas ocorrências recorrentes |
| 10 | Avisos | [10-avisos.html](10-avisos.html) | Caixa de avisos com filtros, não lidos e ações diretas |

## 3. Padrão visual (vale para todo o sistema)

A sensação de sistema "bagunçado" vem principalmente da falta de padrão. Por isso, esta seção vale para todas as telas do sistema, inclusive as que ainda serão criadas.

### 3.1 Fonte

- **Uma fonte só: IBM Plex Sans** (Google Fonts), pesos 400, 500 e 600.
- **Remover a fonte serifada** usada hoje em números, valores, IDs e CNPJ (ex.: "R$ 0,00", "14%", "0/0", "123/2026"). A mistura de duas fontes é o principal motivo da aparência pouco profissional.
- **Números em tabelas e cartões** com `font-variant-numeric: tabular-nums`, para que fiquem alinhados.

### 3.2 Cores

| Uso | Cor |
|---|---|
| Menu lateral, botão principal, texto forte | `#0B2530` |
| Texto principal | `#0E3240` |
| Texto secundário | `#5B6F78` |
| Links | `#0776BA` |
| Destaque da marca (item ativo do menu) | `#1E9E4A` |
| Fundo das páginas | `#F4F7F8` |
| Bordas | `#E1E8EB` e `#CFD9DD` |

Regras de uso:
- **O verde vivo atual dos botões sai.** Ele não é o verde do logo. O botão principal passa a ser azul-escuro (`#0B2530`). O verde da marca fica só como detalhe.
- **Nada de bordas coloridas decorativas,** como as dos cartões da página do projeto e do indicador "Em dia". A cor só aparece quando tem significado.

### 3.3 Semáforo de prazos

| Situação | Texto | Fundo |
|---|---|---|
| Vencido | `#B42318` | `#FDEDEB` |
| Vence em até X dias (configuração) | `#8A5300` | `#FFF4DE` |
| No prazo | `#17733A` | `#E8F5EC` |
| Concluído ou cancelado | cinza neutro | cinza claro |

- **Sempre data e selo juntos.** A coluna de prazo mostra a data e, abaixo, o selo de situação (ex.: "26/10/2026" e "Atrasado 12 dias"). Hoje aparece só o selo.

### 3.4 Componentes

- **Botões:**
  - **Primário:** fundo `#0B2530` e texto branco. Uma única ação principal por área.
  - **Secundário:** fundo branco com borda.
  - **Discreto:** sem fundo, para ações como Editar e Rejeitar.
  - **Perigo:** vermelho, usado só dentro de diálogos de confirmação.
- **Status:** texto com um ponto colorido à esquerda. Na lista, o status não é um select. A troca de status fica na página do registro, num botão com menu.
- **Ações destrutivas** (Desativar, Excluir): ficam num menu "...", nunca ao lado de Editar, e **sempre abrem um diálogo de confirmação** que explica as consequências.
- **Campos vazios:** "Não informado" em âmbar, ou texto cinza ("Sem prazo", "Sem responsável"). Nunca selo vazio e nunca "—" solto.
- **Tabelas:**
  - devem caber na largura da tela, sem rolagem lateral;
  - a linha inteira é clicável;
  - sem coluna "Ações" e sem link "Ver detalhe";
  - em telas estreitas, cada linha vira um cartão.

### 3.5 Textos

- **Tirar o rótulo e o subtítulo genéricos** do topo das páginas ("VISÃO GERENCIAL / Subtarefas / Acompanhe os prazos..."). O título basta.
- **Status com concordância de gênero:**
  - projeto: Concluído, Cancelado;
  - tarefa e subtarefa: Concluída, Cancelada.
  
  Hoje "Concluído" e "Concluída" aparecem misturados na mesma entidade.
- **Mesmos nomes de perfil em todas as telas:** Administrador, Colaborador interno, Colaborador externo e Cliente. Hoje aparecem variações como "Equipe", "Equipe interna", "Equipe Múltiplus" e "Colab. Interno".

## 4. Mudanças por tela

### 4.1 Login ([01-login.html](01-login.html))

- **Título:** "Sistema de Gestão Múltiplus", em caixa alta via CSS (`text-transform`).
- **Topo:** logo oficial centralizado acima do título, na área clara.
- **Painel lateral:**
  - foto industrial com camada escura da marca;
  - frase voltada aos três públicos (equipe, clientes e responsáveis nas empresas);
  - bloco de suporte com e-mail, WhatsApp e horário. Os dados reais serão enviados pela Múltiplus.
- **Campo de senha:** botão Mostrar/Ocultar e aviso de Caps Lock ativado.
- **Mensagem de erro genérica:** "E-mail ou senha incorretos". O sistema não deve informar se o e-mail existe ou não.
- **Rodapé:** link "Política de privacidade". A página será criada pela Múltiplus, e o link só deve ir ao ar quando ela existir.
- **Foto:** de Declan Sun no Unsplash, sob a Licença Unsplash ([página da foto](https://unsplash.com/photos/a-row-of-pipes-on-a-building-with-a-sky-background-5OvIgxlLlxs)). Baixe e sirva pelo próprio sistema, sem carregar do Unsplash.
- **Logo:** usar o arquivo oficial, versão para fundo claro. Na referência ele está embutido no HTML.
- **Celular:** o painel da foto some e o suporte aparece abaixo do botão Entrar.

### 4.2 Menu lateral e barra superior ([02-painel.html](02-painel.html))

O menu passa a seguir a ordem de uso, e não a ordem de cadastro:

| Grupo | Itens |
|---|---|
| Dia a dia | Painel · Agenda · Avisos (com contador de não lidos) |
| Trabalho | Projetos · Tarefas · Subtarefas |
| Cadastros | Clientes · Usuários |
| Configurações | Etiquetas · Prazos e notificações |

- **Sem submenu** "Projetos e tarefas".
- **Rodapé do menu:** nome, perfil, Meu perfil e Sair.
- **Barra superior fixa:** busca geral (clientes, projetos e tarefas) e um único botão "Novo". O botão abre a escolha entre novo cliente, projeto ou tarefa e substitui os vários botões verdes espalhados.
- **Celular:** o menu vira uma gaveta, aberta pelo ícone ☰.

### 4.3 Painel, a nova página inicial ([02-painel.html](02-painel.html))

Substitui a Visão gerencial de subtarefas como página inicial (`/`).

- **Quatro números no topo,** cada um clicável e levando à lista correspondente:
  - atrasados;
  - vencem nos próximos X dias;
  - aguardando a confirmação da administradora;
  - % de itens em dia.
- **Blocos da coluna principal:**
  - **Aguardando sua confirmação:** pedidos de conclusão, com Confirmar e Rejeitar direto na lista. **O bloco some quando não há pedidos.**
  - **Atrasados:** ordenados pelo atraso.
  - **Vencem nos próximos X dias:** agrupados por dia.
- **Coluna lateral:** projetos em andamento, com o progresso.
- **Regras:**
  - **"Itens em dia"** passa a contar tarefas e subtarefas abertas. Hoje conta só subtarefas.
  - **"X dias"** é o mesmo número do amarelo do semáforo, configurado na tela de Configurações. As duas coisas nunca podem divergir.

### 4.4 Listas de Projetos, Tarefas e Subtarefas ([03-listas-projetos-tarefas.html](03-listas-projetos-tarefas.html))

- **Mesmo padrão nas três listas:**
  - busca e filtros na mesma posição;
  - **filtros aplicados na hora**, sem botão "Filtrar" (hoje Projetos tem o botão e Tarefas não);
  - botões de situação com contagem: Todos, Atrasados, Vencem em até X dias, No prazo, Sem prazo;
  - "Mostrar concluídas e canceladas" e "Limpar filtros".
- **Ordem padrão:** prazo mais próximo primeiro. Itens sem prazo e fechados vão para o fim. Ordenação por nome e por prazo ao clicar no cabeçalho.
- **Colunas:**
  - **Projetos:** projeto (nome e ID), cliente, proposta, valor, progresso, prazo, status.
  - **Tarefas:** tarefa (nome, ID, subtarefas concluídas e recorrência), projeto e cliente juntos, responsável com o papel, prazo, status.
  - **Subtarefas:** subtarefa (nome, ID e etiquetas), tarefa, projeto e cliente juntos, responsável, prazo, status.
- **Exportar PDF** exporta exatamente o que está filtrado na tela.

### 4.5 Página do projeto ([04-projeto.html](04-projeto.html))

- **Largura:** ocupa a tela toda. Hoje usa só a metade esquerda.
- **Cabeçalho:**
  - caminho clicável, nome, cliente, proposta e ID;
  - botão de status com menu;
  - Editar;
  - menu "..." com Exportar PDF do projeto, Duplicar projeto e Desativar projeto, este com confirmação.
- **Resumo em faixa única:** prazo (com a data de início), progresso, pendências do projeto e valor contratado.
- **Coluna principal:**
  - **Tarefas:** filtro Abertas / Concluídas / Todas. Cada tarefa mostra subtarefas, recorrência, responsável, status e prazo, e avisa quando tem subtarefa atrasada.
  - **Comentários e histórico juntos:** comentários digitados e eventos automáticos (mudança de status, conclusão confirmada, documento adicionado), do mais recente para o mais antigo.
- **Coluna lateral:**
  - descrição;
  - documentos, com o formulário aberto só ao clicar em "Adicionar";
  - quem acessa o projeto;
  - registro (criado por, criado em, última alteração).
- "Janela do projeto" deixa de ser um cartão separado.

### 4.6 Página da tarefa ([05-tarefa.html](05-tarefa.html))

- **Estrutura:** a mesma da página do projeto.
- **Periodicidade visível** no cabeçalho, no resumo (próxima ocorrência) e no quadro Configuração. Hoje ela só aparece na tela de edição.
- **Pedido de conclusão pendente:** aparece em destaque no topo, com Ver comprovantes, Rejeitar e Confirmar.
- **Rejeitar exige motivo.** O motivo vai para o responsável por e-mail e no sistema, e fica no histórico.
- **Subtarefas abrem na própria lista,** cada uma com:
  - descrição;
  - **comprovante exigido**;
  - **comprovantes enviados**, como arquivos com autor, data e hora;
  - comentários próprios;
  - ações.
- **Ícone de situação na subtarefa:** a não iniciada, em andamento, aguardando confirmação, concluída.
- **"Cobrar responsável"** envia um aviso manual e registra no histórico.
- **Quadro Configuração** mostra a opção "Responsável pode criar subtarefas". Hoje essa opção some na tela de edição.

### 4.7 Clientes ([06-clientes.html](06-clientes.html))

- **Lista:**
  - **primeira coluna com o ID do cliente**, com a lista ordenada por ele e o ID pesquisável;
  - demais colunas: cliente (nome e CNPJ/CPF), segmento, cidade, projetos ativos, pendências e situação do portal do cliente;
  - filtros por segmento, cidade e laudo técnico, mais as situações: com projeto ativo, com pendências, sem projeto ativo, cadastro incompleto.
- **Ficha do cliente:**
  - resumo com projetos ativos, pendências, próximo prazo e portal;
  - coluna principal: projetos do cliente, pessoas da empresa (com o acesso de cada uma ao sistema) e laudo técnico, com o selo "Só a administradora vê";
  - coluna lateral: dados da empresa, ponto de contato, portal do cliente ("Ver como o cliente" e "Bloquear acesso") e documentos.
- **Desativar cliente:** a confirmação inclui a opção, já marcada, de **bloquear também o portal e os acessos das pessoas da empresa**. Hoje a desativação não bloqueia o login do cliente.

### 4.8 Usuários ([07-usuarios.html](07-usuarios.html))

- **Lista:**
  - uma lista só com **todas** as pessoas que entram no sistema, inclusive clientes e colaboradores externos;
  - filtros por perfil (com contagem), empresa e situação (ativo, convite pendente, bloqueado);
  - colunas "O que acessa" e "Último acesso";
  - "Reenviar convite" direto na lista.
- **Novo usuário:**
  1. **Empresa primeiro.** Múltiplus Ambiental permite os perfis Administrador e Colaborador interno. Empresa cliente permite Colaborador externo e Cliente.
  2. **Perfil:** cada um com a descrição do que a pessoa enxerga.
  3. **Atribuições conforme o perfil:**
     - Colaborador interno recebe projetos;
     - **Colaborador externo recebe só tarefas da própria empresa**;
     - Cliente e Administrador não recebem atribuição.
  4. **Rodapé fixo com o resumo** antes de enviar ("Carlos Souza verá 1 tarefa de Indústria Alfa Ltda").
- **Unificar os dois caminhos** que hoje dão acesso a colaborador externo: a tela Usuários e a pessoa envolvida marcada como "é colaborador". O botão "Dar acesso" da ficha do cliente deve abrir este mesmo formulário, com a empresa preenchida, para não gerar cadastros duplicados.

### 4.9 Configurações ([08-configuracoes.html](08-configuracoes.html))

Reúne em três abas o que hoje está na tela de Notificações e em Etiquetas. A caixa de avisos continua em Avisos.

- **Prazos e avisos:**
  - semáforo com escala visual, que se atualiza ao mudar o número de dias;
  - régua de avisos: primeiro aviso (padrão 7 dias), lembrete na véspera, aviso de atraso recorrente, escalonamento para a administradora e escalonamento para o cliente;
  - envio diário com horário e situação da última execução.
- **Notificações por perfil:** uma tabela única, com os botões E-mail e Sistema por perfil e **um só botão Salvar**. Hoje há um botão por linha.
- **Etiquetas:** criação com escolha de cor, prévia, contagem de uso e exclusão com confirmação.

### 4.10 Agenda ([09-agenda.html](09-agenda.html))

- **Duas visualizações:** Mês (calendário) e Lista (agrupada por dia). **No celular, abre direto em Lista**, porque o calendário fica pequeno demais.
- **Filtros:** cliente, responsável e tipo (Todos, Prazos, Visitas e reuniões, Recorrentes). Hoje há cliente, projeto, "Só visitas/reuniões" e botão "Filtrar agenda". Os novos filtros são aplicados na hora.
- **No calendário:**
  - itens coloridos pelo semáforo (atrasado, vence em até X dias, no prazo);
  - visitas e reuniões em roxo, com horário;
  - prazos de projeto com ícone de bandeira;
  - tarefas recorrentes com ícone de repetição;
  - **próximas ocorrências de tarefas recorrentes com borda tracejada**;
  - itens concluídos riscados em cinza;
  - no máximo 3 itens por dia, com "+N mais".
- **Clicar no dia** mostra o detalhe ao lado: tipo, cliente, projeto, responsável, situação e recorrência. **Clicar no item** abre a tarefa ou o projeto.
- **Faixa vermelha no topo** quando há itens atrasados de meses anteriores, com o link "Ver atrasados". Hoje, um atraso do mês passado some da tela ao navegar para o mês atual.
- **Botão "Hoje"** e navegação por mês. **Exportar PDF** do mês filtrado.

### 4.11 Avisos ([10-avisos.html](10-avisos.html))

Substitui a parte "Avisos recentes" da tela de Notificações. As configurações dessa tela foram para Configurações (4.9).

- **Avisos agrupados** por Hoje, Ontem, Esta semana e Anteriores.
- **Filtros:** Todos / Não lidos (com contagem) e tipo de aviso (pedidos de conclusão, prazo vencido, prazo próximo, atribuições, comentários e menções, conclusões, acessos e sistema).
- **Cada aviso mostra:**
  - ícone do tipo;
  - título;
  - descrição ou trecho do comentário;
  - cliente e projeto;
  - hora;
  - **ponto azul quando não lido**.
- **Ações diretas no próprio aviso:**
  - "Ver comprovantes" em pedido de conclusão;
  - "Cobrar responsável" em prazo vencido;
  - "Marcar como lido" ou "não lido".
- **"Marcar todos como lidos"** e atalho "Preferências" para a aba de notificações das Configurações.
- **O contador do menu** mostra os não lidos e é atualizado ao ler.
- **Regra sugerida:** avisos com mais de 90 dias saem da caixa, mas o evento continua no histórico do registro.

## 5. Funções novas (preciso de estimativa de prazo e custo)

O que está acima é, na maior parte, ajuste visual e de organização. Os itens abaixo são funções que não existem hoje. Peço uma estimativa separada de cada um, para decidirmos a ordem.

| # | Função | Onde aparece | Prioridade sugerida |
|---|---|---|---|
| 1 | **Comprovante exigido e arquivos da subtarefa.** O administrador define o que deve ser enviado (ex.: "3 fotos"). O responsável só pede a conclusão depois de anexar. Os arquivos ficam guardados na subtarefa, separados dos comentários, com autor, data e hora | Tarefa | Alta |
| 2 | **Ocorrências recorrentes como registros próprios,** cada uma com as suas subtarefas e os seus comprovantes, e histórico de meses anteriores consultável | Tarefa, Agenda | Alta |
| 3 | **Histórico automático:** mudança de status, pedido, confirmação e rejeição de conclusão, avisos enviados, documento adicionado | Projeto, Tarefa | Alta |
| 4 | **Motivo obrigatório na rejeição** de conclusão, enviado ao responsável | Tarefa, Painel | Alta |
| 5 | **Painel** como página inicial, com os blocos descritos em 4.3 | Painel | Alta |
| 6 | **Régua de avisos:** véspera, atraso recorrente, escalonamento à administradora e ao cliente | Configurações | Média |
| 7 | **Cobrar responsável** (aviso manual) | Tarefa | Média |
| 8 | **Busca geral e botão "Novo"** na barra superior | Todas | Média |
| 9 | **Último acesso** dos usuários e lista única de acessos | Usuários | Média |
| 10 | **Exportar PDF do projeto** e **Duplicar projeto** | Projeto | Baixa |
| 11 | **Resumo mensal por e-mail** para o perfil Cliente | Configurações | Baixa |
| 12 | **"Ver como o cliente"** | Ficha do cliente | Baixa |
| 13 | **Avisos lidos e não lidos,** com contador no menu e ações diretas no aviso | Avisos | Média |
| 14 | **Agenda em Lista e com detalhe do dia,** mais a faixa de atrasados de meses anteriores | Agenda | Média |

## 6. Correções e inconsistências encontradas

1. **O envio diário de prazos aparece como "Ainda não executado".** Se for verdade, nenhum aviso de prazo está saindo. É o item mais urgente.
2. **Desativar cliente não bloqueia o login do cliente** (ver 4.7).
3. **"Desativar" projeto não tem confirmação.** Um clique errado desativa o projeto.
4. **Status inconsistentes:**
   - "Concluído" na criação e "Concluída" na edição da subtarefa;
   - **a subtarefa não tem o status "A iniciar"** e já nasce "Em andamento". Incluir.
5. **A periodicidade da tarefa** só aparece na tela de edição.
6. **O checkbox "Permitir que o colaborador responsável crie subtarefas"** existe na criação da tarefa e some na edição.
7. **Formato do ID do cliente:** dois dígitos na lista (01) e quatro nos códigos de projeto e tarefa (PROJ-**0001**-01). Padronizar com 4 dígitos em todo lugar.
8. **"Serviço de localidades indisponível"** no cadastro de cliente faz Estado e Município virarem texto livre. Há cliente com endereço preenchido e município vazio, que aparece com cidade "—" na lista.
9. **O popover de Filtros do laudo técnico** não fecha com Esc nem ao clicar fora.
10. **O menu de status da tarefa** abre cortado na lateral em telas estreitas.
11. **"Tarefas concluídas"** no card do projeto ignora tarefas desativadas, mas o contador "Tarefas (4)" as inclui. Os números precisam bater.
12. **Formulários de cliente** sem botão Cancelar (cadastro e edição).
13. **Agenda:** as ocorrências futuras de tarefas recorrentes aparecem sem link (relacionado ao item 2 da seção 5).

## 7. Dados de teste a limpar antes de mostrar a clientes

- Etiquetas "teste2", "teste3" e "teste4".
- Usuário "Andre Teste".
- Cliente 02, que parece ser o cadastro de um colaborador, marcado como "Indústria".
- Projetos "Teste" e "Projeto 30/10", se forem só de teste.
- Cliente com o segmento vazio (aparece um selo em branco na lista).

## 8. Perguntas para o desenvolvedor

1. **Arquivos:** onde os comprovantes (fotos e documentos) serão armazenados? Qual o limite de tamanho por arquivo e por cliente? Há cópia de segurança automática? Com que frequência e por quanto tempo?
2. **Hospedagem e domínio:**
   - Onde o sistema está hospedado, e em nome de quem está o contrato?
   - O ideal é mudar o endereço para um domínio da Múltiplus, como `sistema.multiplusambiental.com.br`, em nome da empresa.
3. **Criptografia e backup:** o que já está implantado hoje? A Múltiplus precisa saber exatamente o que pode prometer aos clientes em proposta.
4. **Envio diário:** por que aparece como não executado?
5. **Recorrência:** hoje as ocorrências futuras existem como registros no banco, ou são só calculadas para exibição na Agenda?
6. **Estimativa** de cada item da seção 5.

## 9. Próximas etapas

1. Acesso do **Colaborador externo**: tela "Minhas tarefas", pensada para o celular, com o envio dos comprovantes.
2. **Portal do Cliente**: painel resumido dos projetos e relatório em PDF.
3. Página de **Política de privacidade** (a cargo da Múltiplus).
