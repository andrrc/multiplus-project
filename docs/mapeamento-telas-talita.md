# Mapeamento das telas de referência da Talita

- **Data:** 2026-11-10
- **Escopo:** adaptação visual de funcionalidades existentes. A referência é protótipo com dados fictícios; recursos, dados e permissões novos dependem de análise e aprovação próprias.
- **Situação:** mapeamento inicial; rotas propostas ou sem correspondência estão indicadas abaixo. Não pressupõe que o conteúdo dos protótipos já exista no servidor.

## Mapa corrigido e estado real (2026-11-13)

Conferência feita lendo cada protótipo e a página real correspondente. A meta passou a ser copiar
**100% do visual** dos protótipos; dados que o sistema não tem ficam como pendência, sem números
inventados. As tabelas por perfil abaixo continuam valendo como histórico; esta seção prevalece.

Situação: **Fiel** = igual ao protótipo; **Quase** = faltam detalhes; **Parcial** = estrutura
parecida, visual diferente; **Nada** = não existe ou está no design antigo.

| Protótipo | Página real | Situação |
|---|---|---|
| Admin 01 login | `/login` | Quase (suporte e política dependem de dado) |
| Admin 02 painel | não existe (`/` redireciona para `/subtarefas`) | Nada |
| Admin 03 listas | `/projetos`, `/tarefas`, `/subtarefas` | Parcial |
| Admin 04 projeto | `/projetos/[id]` | Parcial |
| Admin 05 tarefa | `/tarefas/[id]` | Parcial |
| Admin 06 clientes | `/clientes` (parcial), `/clientes/[id]` (nada) | Parcial / Nada |
| Admin 07 usuários | `/usuarios`, `/usuarios/novo` | Parcial |
| Admin 08 configurações | `/notificacoes` + `/etiquetas`; `/configuracoes` não existe | Nada |
| Admin 09 agenda | `/agenda` | Parcial |
| Admin 10 avisos | `/notificacoes` | Parcial |
| Interno 01 painel | não existe | Nada |
| Interno 02 minhas tarefas | `/minhas-tarefas` | Parcial |
| Interno 03 meus projetos | `/meus-projetos` | Parcial |
| Interno 04 projeto | `/meus-projetos/[id]` | Parcial |
| Interno 05 tarefa | `/minhas-tarefas/[id]` | Parcial |
| Interno 06 clientes | `/meus-clientes`, `/meus-clientes/[id]` | Parcial |
| Interno 07 agenda | `/agenda` (só ADMIN hoje) | Nada |
| Interno 08 avisos | `/minhas-notificacoes` | Parcial |
| Interno 09 perfil | `/meu-perfil` | Parcial |
| Externo 01 minhas tarefas | `/minhas-tarefas` (tela própria no protótipo) | Nada |
| Externo 02 avisos | `/minhas-notificacoes` | Parcial |
| Externo 03 instruções | não existe (`/instrucoes`) | Nada |
| Externo 04 perfil | `/meu-perfil` | Parcial |
| Cliente 01 painel | não existe (`/portal` é só a lista) | Nada |
| Cliente 02 projetos | `/portal`, `/portal/[id]` | Parcial |
| Cliente 03 relatórios | não existe (`/portal/relatorios`) | Nada |
| Cliente 04 perfil | `/meu-perfil` | Parcial |

Correções ao mapeamento anterior:

- O colaborador externo hoje usa o mesmo menu e as mesmas telas do interno, incluindo
  Meus projetos e Clientes; o protótipo dele é uma tela própria e restrita.
- `03-instrucoes` do externo exige rota nova (`/instrucoes`).
- O shell (menu lateral, rodapé do menu, barra superior com busca e "Novo", gaveta no celular)
  ainda não segue os protótipos em nenhum perfil. A barra superior não existe.
- `/esqueci-senha` e `/definir-senha` estão no design antigo (`src/app/auth-shell.tsx`).
- A fonte já é IBM Plex Sans. Raios, selo de prazo, status, modais e botões ainda divergem.

Decisões de 13/11/2026: telas sem página real recebem só a casca visual com dados existentes;
as regras de `AGENTS.md` §6 e da identidade visual passam a seguir os protótipos; a restrição de
dados e de permissão do colaborador externo exige análise e confirmação antes de aplicar.

## Administradora

| Referência em `telas-novas/sistema-gestao-multiplus/` | Área existente | Observação |
|---|---|---|
| `01-login.html` | `/login` | Login adaptado; contatos de suporte e destino da política ainda precisam ser fornecidos. |
| `02-painel.html` | `/subtarefas` é a página inicial atual | Painel proposto não equivale integralmente à visão atual; indicadores novos dependem de análise. |
| `03-listas-projetos-tarefas.html` | `/projetos`, `/tarefas`, `/subtarefas` | Um protótipo reúne três listas distintas. |
| `04-projeto.html` | `/projetos/[id]` | Preservar todas as ações e dados autorizados existentes. |
| `05-tarefa.html` | `/tarefas/[id]` | Comprovantes e outras ações propostas precisam ser avaliados. |
| `06-clientes.html` | `/clientes`, `/clientes/[id]` | Formulários de criação e edição não têm modelo próprio. |
| `07-usuarios.html` | `/usuarios`, `/usuarios/novo`, `/usuarios/[id]` | Edição existente deve ser preservada. |
| `08-configuracoes.html` | `/notificacoes`, `/etiquetas` | Protótipo reúne configurações hoje separadas; demais opções são propostas. |
| `09-agenda.html` | `/agenda` | Preservar eventos e regras atuais. |
| `10-avisos.html` | `/notificacoes` | Reúne avisos recebidos e configurações; separar os dois visualmente exige preservar as ações existentes. |

## Colaborador interno

| Referência em `telas-novas/colaborador-interno/` | Área existente | Observação |
|---|---|---|
| `01-painel.html` | `/minhas-tarefas` é a página inicial atual | Painel proposto não tem correspondência integral. |
| `02-minhas-tarefas.html` | `/minhas-tarefas`, `/minhas-tarefas/[id]` | Preserve vínculos e ações atuais. |
| `03-meus-projetos.html` | `/meus-projetos` | Lista existente. |
| `04-projeto.html` | `/meus-projetos/[id]` | Campos seguem as permissões atuais. |
| `05-tarefa.html` | `/minhas-tarefas/[id]` | Preservar fluxo existente. |
| `06-clientes.html` | `/meus-clientes`, `/meus-clientes/[id]` | Manter filtro de vínculo atual. |
| `07-agenda.html` | Sem rota autorizada no menu atual | Nova disponibilidade exige decisão e análise de permissão. |
| `08-avisos.html` | `/minhas-notificacoes` | Manter regras atuais. |
| `09-meu-perfil.html` | `/meu-perfil` | Tela compartilhada entre perfis. |

## Colaborador externo

| Referência em `telas-novas/sistema-gestao-multiplus-colaborador-externo/` | Área existente | Observação |
|---|---|---|
| `01-minhas-tarefas.html` | `/minhas-tarefas`, `/minhas-tarefas/[id]` | O protótipo descreve acesso mais restrito e envio de comprovantes; não mudar regras sem aprovação. |
| `02-avisos.html` | `/minhas-notificacoes` | Manter acesso e recursos atuais. |
| `03-instrucoes.html` | Sem correspondência identificada | Página e configuração de vídeo propostas; não criar ação fictícia. |
| `04-meu-perfil.html` | `/meu-perfil` | Tela compartilhada. |

## Cliente

| Referência em `telas-novas/cliente/` | Área existente | Observação |
|---|---|---|
| `01-painel.html` | `/portal` | Painel proposto inclui indicadores e conteúdos a verificar. |
| `02-projetos.html` | `/portal`, `/portal/[id]` | Não há lista separada com esta rota; mapear visual preservando vínculo. |
| `03-relatorios.html` | Sem correspondência identificada | Geração e histórico propostos dependem de decisão. |
| `04-meu-perfil.html` | `/meu-perfil` | Tela compartilhada. |

## Telas sem modelo específico

Recuperar e definir senha (`/esqueci-senha`, `/definir-senha`); formulários de cadastro e edição de clientes, projetos, tarefas, subtarefas e usuários; detalhe de usuário e etiquetas. Devem manter os fluxos atuais e receber a identidade compartilhada quando aplicável. `/prazos` é rota de compatibilidade, não uma tela independente.

## Diferenças para avaliação posterior

Os documentos propõem, entre outras mudanças, envio e aprovação de comprovantes, novas regras para colaborador externo, relatórios e resumos do cliente, painel inicial por perfil, configurações consolidadas e instruções em vídeo. A presença no protótipo não autoriza alterar dados, regras, RLS ou permissões nesta etapa. Conferir cada requisito com a implementação vigente antes de estimar ou decidir; as descrições dos protótipos podem estar desatualizadas.

## Itens dos modelos para discutir após a etapa visual

A lista abaixo descreve pedidos dos protótipos, não afirma que estejam ausentes ou implementados. Verificar no código e nas regras atuais antes de estimar.

| Área ou tela | Pedidos que podem exigir dados, regras, integração ou nova permissão |
|---|---|
| Administradora — painel | Nova página inicial, indicadores e ações em pedidos pendentes. |
| Administradora — projeto e tarefa | Arquivos e comprovantes exigidos, ocorrências recorrentes independentes, histórico automático, motivo obrigatório de rejeição, cobrança manual, duplicação e exportação de projeto. |
| Administradora — clientes e usuários | Ver como cliente, unificação de acessos e atribuições, último acesso e efeitos da desativação sobre contas. |
| Administradora — configurações e avisos | Régua de avisos, escalonamento, resumo mensal, ações e filtros de avisos; conferir quais opções já existem. |
| Administradora — agenda e barra superior | Lista e detalhe de dia, atrasos anteriores, busca geral e criação pela barra. |
| Colaborador interno — painel e tarefas | Painel semanal, subtarefas atribuídas, visão da equipe, pausa de prazo, confirmação e rejeição de comprovantes, cancelamento com motivo. |
| Colaborador interno — projetos, clientes, agenda e perfil | Restrições de dados, contagens por responsável, agenda do perfil e informações editáveis e de acesso. |
| Colaborador externo — tarefas | Restrições de acesso, envio e requisitos de comprovantes, instruções e imagem de exemplo, pedidos de prazo e impedimento, mensagens restritas. |
| Colaborador externo — avisos e instruções | Configuração de vídeo e modelos, links diretos, manter conectado e avisos por WhatsApp. |
| Cliente — painel e projetos | Permissões, comentários visíveis, indicadores, trilha de etapas, unidades e pasta do Drive. |
| Cliente — relatórios | Geração de PDF por período e unidade, histórico de resumos mensais. |
| Todos — perfil | Telefone, acessos e avisos exibidos conforme as permissões e dados atualmente disponíveis. |

## Estado da adaptação

A adaptação começou pelos tokens, tipografia, login e navegação. As etapas abaixo alteram a apresentação das capacidades existentes; não representam implementação integral dos protótipos nem aprovação visual da Talita.

| Área | Etapa realizada | Ainda falta |
|---|---|---|
| Perfil compartilhado | Dados, senha e atribuições organizados em seções responsivas; e-mail longo legível. | Conteúdo adicional proposto nos modelos depende de dados e regras a avaliar. |
| Administradora — usuários | Tabela no desktop e cartões no celular, com ações existentes. | Recursos de empresa, último acesso e unificação dos acessos exigem análise. |
| Administradora — detalhe de projeto | Indicadores em faixa; tarefas e comentários na área principal; documentos ao lado no desktop. | Histórico, documentos e ações adicionais dos protótipos exigem avaliação; o restante do fluxo precisa de revisão. |
| Administradora — detalhe de tarefa | Subtarefas expansíveis e descrição em coluna no desktop, com ações existentes. | Comprovantes e demais ações propostas exigem análise. |
| Colaboradores — tarefas, projetos e clientes | Listas responsivas com dados e permissões atuais. | Painéis e restrições propostas por perfil precisam de análise própria. |
| Cliente — acompanhamento | Cartões com dados do portal existente reorganizados. | Painel, relatórios, unidades e outros recursos propostos precisam de análise. |
| Avisos e agenda | Indicação de não lido e agrupamento diário da lista móvel da agenda. | Filtros, ações e configurações propostas precisam ser comparados às capacidades existentes. |

Permanecem telas de cadastro e edição, estados, acessibilidade e correspondências que precisam ser conferidos. As alterações locais anteriores em clientes e projetos devem ser preservadas até que sua autoria e destino sejam conhecidos.
