# Mapeamento das telas de referência da Talita

- **Data:** 2026-11-10
- **Escopo:** adaptação visual de funcionalidades existentes. A referência é protótipo com dados fictícios; recursos, dados e permissões novos dependem de análise e aprovação próprias.
- **Situação:** mapeamento inicial; rotas propostas ou sem correspondência estão indicadas abaixo. Não pressupõe que o conteúdo dos protótipos já exista no servidor.

## Administradora

| Referência em `telas-novas/sistema-gestao-multiplus/` | Área existente | Observação |
|---|---|---|
| `01-login.html` | `/login` | Adaptação local em andamento; suporte e política são dados provisórios. |
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

A tipografia, os tokens e a navegação compartilhada estão em adaptação local, assim como o login, listas e detalhes administrativos, agenda, avisos, algumas telas de colaboradores e acompanhamento do cliente. A comparação ainda não está completa: há componentes, telas de formulário, estados, tabelas e propostas dos protótipos que precisam de adaptação e verificação. Este inventário não é uma confirmação de conclusão.
