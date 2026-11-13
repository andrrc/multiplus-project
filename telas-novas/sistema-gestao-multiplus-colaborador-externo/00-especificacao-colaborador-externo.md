# Sistema de Gestão Múltiplus: perfil Colaborador externo

Especificação para o desenvolvedor. Múltiplus Ambiental, versão de 08/11/2026.

Este documento complementa a especificação do acesso da Administradora, enviada à parte. O padrão visual daquele documento (seção 3: fonte, cores, semáforo, componentes e textos) vale também aqui. O resumo está na seção 8 deste documento.

O colaborador externo é a pessoa da empresa cliente que recebe demandas e envia comprovantes, por exemplo o responsável pela manutenção, que manda todo mês as fotos dos equipamentos. **É o perfil mais limitado do sistema** e o que usa o celular com mais frequência. Ele não tem tempo nem treinamento para aprender um sistema, por isso cada tela foi pensada para uma ação só.

---

## 1. Como usar este material

- As 4 telas estão nesta pasta. O menu leva de uma à outra.
- **Para começar:** abra o arquivo `01-minhas-tarefas.html` no navegador.
- **Tamanho de tela:** as telas foram feitas primeiro para o celular. Para ver como no celular, estreite a janela do navegador ou use o modo de dispositivo móvel das ferramentas do navegador.
- **Dados ilustrativos:** o usuário de exemplo é "Carlos Souza", do setor de manutenção da "Indústria Alfa Ltda". A data de referência é 07/11/2026.
- Cada arquivo traz no topo do código um comentário com as regras daquela tela.

## 2. Telas

| # | Tela | Arquivo | O que mostra |
|---|---|---|---|
| 1 | Minhas tarefas (página inicial) e envio | [01-minhas-tarefas.html](01-minhas-tarefas.html) | Itens agrupados por situação. Ao tocar num item, abre a tela de envio do comprovante |
| 2 | Avisos | [02-avisos.html](02-avisos.html) | Caixa de avisos dele |
| 3 | Instruções de uso | [03-instrucoes.html](03-instrucoes.html) | Orientações reunidas num só lugar, com vídeo e contatos dos coordenadores |
| 4 | Meu perfil | [04-meu-perfil.html](04-meu-perfil.html) | A mesma tela de todos os perfis, na visão do externo |

## 3. Regras do perfil

### 3.1 O que ele vê

- **Só os itens atribuídos diretamente a ele** (tarefa ou subtarefa). Se ele recebe uma subtarefa, não vê a tarefa inteira nem as outras subtarefas.
- **Só o nome do item:** não aparecem projeto, cliente, valores, outros responsáveis, comentários internos, agenda nem relatórios.
- **Mensagens:** só as dele e as respostas da Múltiplus para ele, naquele item. Os comentários internos nunca aparecem.
- **Histórico:** só os envios dele.
- **Coordenador do item:** nome e botão de WhatsApp de quem coordena cada item dele (o responsável interno pelo projeto ou pela tarefa).

> **Importante para a implementação:** a restrição precisa ser aplicada no servidor. As consultas do perfil externo devem devolver só os itens atribuídos a ele, sem nenhum campo do projeto, de valores ou de comentários internos.

### 3.2 O que ele pode fazer

| Ação | Colaborador externo |
|---|---|
| Enviar comprovante (fotos e arquivos) nos itens dele | Pode |
| Escrever mensagens e observações no item | Pode |
| Pedir mais prazo (nova data e motivo) | Pode. A administradora ou o colaborador interno aprova |
| Informar impedimento (motivo) | Pode. A administradora ou o colaborador interno decide |
| Alterar nome e telefone em Meu perfil | Pode |
| Criar subtarefas | **Nunca.** A opção "permitir que o colaborador responsável crie subtarefas" não vale para este perfil |
| Concluir, cancelar ou editar itens | Não. O envio do comprovante gera o pedido de conclusão |
| Excluir um envio | Não. Se enviou errado, avisa o coordenador, que devolve o item para correção |

### 3.3 Envio do comprovante

- **Duas formas de anexar:** "Tirar foto" (abre a câmera do celular, `capture="environment"`) e "Galeria ou arquivo" (fotos da galeria, PDF, planilhas e documentos).
- **Quantidade exigida:** cada item informa quantas fotos ou arquivos são exigidos. O botão "Enviar comprovante" só fica ativo quando a quantidade foi anexada.
- **Data e hora:** a data e a hora do envio são registradas pelo servidor, e não pelo celular.
- **Depois do envio:**
  - o item passa para "Aguardando conferência";
  - o prazo para de contar: o item mostra "Enviado em dd/mm" e não conta atraso. Se for confirmado, vale a data do envio; se for rejeitado, o prazo volta a contar;
  - a administradora e o colaborador interno do projeto recebem o pedido de conclusão.
- **Devolução:** se o envio for rejeitado, o item volta em "Devolvidas para correção", com o motivo escrito por quem conferiu.
- **Tamanho das imagens:** o sistema deve reduzir as fotos no envio (fotos de celular têm de 3 a 8 MB cada). Confirmar onde os arquivos ficam guardados e se há cópia de segurança.

### 3.4 Instruções no cadastro do item

Para o externo enviar certo na primeira vez, a tela de criação e edição da tarefa e da subtarefa (visão da administradora e do colaborador interno) ganha três campos:

1. **O que enviar:** lista de itens que precisam aparecer (exemplo: "plaqueta do equipamento visível").
2. **Foto de exemplo:** uma imagem anexada pela Múltiplus.
3. **Quantidade e tipo exigidos:** número de fotos ou arquivos.

O **aviso de privacidade** aparece fixo em toda tela de envio: "Evite fotografar pessoas, placas de veículos e documentos pessoais. Se aparecerem, refaça a foto com outro enquadramento."

### 3.5 Avisos

- **Canais:** e-mail e aviso no sistema. O WhatsApp fica para uma fase futura.
- **Tipos:**
  - tarefa nova;
  - prazo próximo (7 dias antes e na véspera);
  - prazo vencido (a cada 3 dias);
  - comprovante confirmado ou devolvido;
  - resposta a pedido de prazo;
  - mensagem do coordenador.
- **Todo e-mail traz um botão que leva direto ao item,** depois do login.
- **Entrada no sistema:** e-mail e senha, com a opção "manter conectado" no celular.

## 4. Menu do perfil

| Item | Destino |
|---|---|
| Minhas tarefas | Página inicial, com contador do que há para enviar |
| Avisos | Caixa de avisos, com contador de não lidos |
| Instruções de uso | Orientações e contatos |
| Meu perfil | No rodapé do menu, no computador, e na barra de baixo, no celular |

- **No celular,** o menu vira uma **barra fixa na parte de baixo da tela** (Tarefas, Avisos, Instruções, Perfil), no lugar do menu lateral.
- **A barra superior** mostra só a logo e o nome da empresa, sem busca e sem botão "Novo".

## 5. Telas

### 5.1 Minhas tarefas ([01-minhas-tarefas.html](01-minhas-tarefas.html))

- **Saudação** com setor e empresa, e um resumo: "2 atrasados · 3 para enviar · 1 devolvido para correção".
- **Grupos, nesta ordem:**
  1. **Devolvidas para correção,** com o motivo em destaque.
  2. **Para enviar,** com os atrasados no topo.
  3. **Aguardando conferência.**
  4. **Concluídas** (os últimos envios, mais "Ver todo o histórico").
- **Cada item mostra:** nome, data e selo do prazo, o que é exigido ("2 fotos", "1 arquivo") e se é recorrente ("Todo mês"). O item inteiro abre a tela de envio.

### 5.2 Tela de envio (dentro de [01-minhas-tarefas.html](01-minhas-tarefas.html))

1. Nome do item, prazo, quantidade exigida e recorrência.
2. Motivo da devolução, quando houver.
3. **O que enviar:** lista, foto de exemplo e aviso de privacidade.
4. **Enviar comprovante:**
   - botões "Tirar foto" e "Galeria ou arquivo";
   - miniaturas, com a opção de remover;
   - contador "1 de 2 fotos exigidas";
   - observação;
   - botão "Enviar comprovante";
   - link **"Não consigo cumprir este prazo"**.
5. **Confirmação após o envio,** com data, hora e número de arquivos.
6. **Mensagens com a Múltiplus.**
7. **Dúvidas sobre esta tarefa:** coordenador com o botão de WhatsApp.
8. **Envios anteriores deste item.**

**"Não consigo cumprir este prazo"** abre um diálogo com duas opções:
- **Pedir mais prazo:** nova data e motivo obrigatório;
- **Informar impedimento:** motivo obrigatório.

O pedido aparece nas mensagens do item e gera um aviso para o coordenador. **Quando o pedido de prazo é aprovado, o prazo do item muda e o histórico registra o prazo original.**

### 5.3 Avisos ([02-avisos.html](02-avisos.html))

- A mesma tela de avisos dos outros perfis, com os tipos da seção 3.5.
- **Devolução** mostra o motivo.
- **Cada aviso tem o botão "Abrir",** que leva ao item.
- "Preferências" leva a Meu perfil.

### 5.4 Instruções de uso ([03-instrucoes.html](03-instrucoes.html))

**Conteúdo igual para todos os colaboradores externos,** com atalhos no topo para cada seção:

1. **Vídeo:** como enviar um comprovante pelo celular. O vídeo é hospedado fora do sistema (YouTube "não listado" ou Google Drive), e a página exibe o vídeo. A administradora precisa de um lugar para cadastrar ou trocar esse link.
2. **Como funciona:** 5 passos, do aviso até a confirmação ou a devolução.
3. **Como tirar uma boa foto.**
4. **Prazos e avisos,** incluindo a informação de que os atrasos aparecem para a diretoria da empresa.
5. **Modelos para baixar:** arquivos cadastrados pela administradora.
6. **Privacidade:** o que é guardado, para quê, quem vê e os cuidados nas fotos, com link para a política de privacidade.
7. **Perguntas frequentes.**
8. **Contatos:**
   - **cada coordenador dos itens daquela pessoa,** com a lista dos itens que acompanha e o botão de WhatsApp;
   - o contato geral da Múltiplus.

**Os textos são fixos nesta primeira versão.** O vídeo e os modelos para baixar são cadastrados pela administradora.

### 5.5 Meu perfil ([04-meu-perfil.html](04-meu-perfil.html))

- A mesma tela de todos os perfis.
- Altera nome e telefone. E-mail e setor aparecem com "só a Múltiplus altera".
- **"Itens atribuídos a você":** lista dos itens, com a frequência de cada um.
- **"Avisos que você recebe":** só leitura.

## 6. Funções novas deste perfil (preciso de estimativa)

| # | Função | Prioridade sugerida |
|---|---|---|
| 1 | **Permissões no servidor** (seção 3.1) | Alta |
| 2 | **Envio de comprovante pelo celular:** câmera e galeria, quantidade exigida, registro de data e hora pelo servidor, redução das imagens | Alta |
| 3 | **Campos de instrução no item:** o que enviar, foto de exemplo, quantidade exigida (seção 3.4) | Alta |
| 4 | **Grupos da página inicial:** devolvidas, para enviar, aguardando, concluídas | Alta |
| 5 | **Pedido de prazo e informe de impedimento,** com aprovação pelo coordenador | Média |
| 6 | **Mensagens restritas ao externo** no item | Média |
| 7 | **Menu em barra inferior no celular** | Média |
| 8 | **Página de instruções,** com o cadastro do link do vídeo e dos modelos pela administradora | Média |
| 9 | **Botão do e-mail levando direto ao item** e "manter conectado" | Média |
| 10 | **Avisos por WhatsApp** | Fase futura |

## 7. Perguntas para o desenvolvedor

1. Hoje existem dois caminhos para criar o acesso do colaborador externo: a tela Usuários e a pessoa envolvida marcada como "é colaborador". A proposta é unificar. Os dois caminhos geram o mesmo tipo de usuário no banco?
2. Hoje o colaborador externo consegue concluir um item sem confirmação, ou criar subtarefas, se a opção estiver marcada na tarefa?
3. Qual o limite de tamanho por arquivo, e as imagens já são reduzidas no envio?
4. O sistema funciona bem nos navegadores de celular (Chrome no Android e Safari no iPhone), inclusive com a câmera?

## 8. Resumo do padrão visual

- **Fonte única:** IBM Plex Sans (Google Fonts), pesos 400, 500 e 600. Números com `font-variant-numeric: tabular-nums`. Sem fonte serifada.
- **Cores principais:**

  | Uso | Cor |
  |---|---|
  | Menu, botão principal e texto forte | `#0B2530` |
  | Texto principal | `#0E3240` |
  | Texto secundário | `#5B6F78` |
  | Links | `#0776BA` |
  | Fundo | `#F4F7F8` |

- **Semáforo de prazo:**
  - vermelho (`#B42318` sobre `#FDEDEB`) só para vencido;
  - âmbar (`#8A5300` sobre `#FFF4DE`) para os próximos dias;
  - verde (`#17733A` sobre `#E8F5EC`) no prazo.
  
  O prazo aparece sempre com a data e o selo juntos.
- **Cor só onde tem significado,** sem bordas decorativas.
- **Ações destrutivas** sempre com diálogo de confirmação.
- **Campos vazios** com texto ("Sem prazo", "Não informado"), nunca selo vazio ou traço.
- O CSS completo está no topo de cada arquivo HTML.
