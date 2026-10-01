# Índice cronológico de alterações

Uma linha por alteração, da mais recente para a mais antiga. O **detalhe** (o que foi
decidido, as regras e o efeito na interface) fica no arquivo do módulo em
[`docs/funcionalidades/`](funcionalidades/README.md), na seção da funcionalidade e no
"Histórico de alterações".

Como registrar: ver a seção 7 do `AGENTS.md`.

| Data | Módulo | Alteração | Commit |
|---|---|---|---|
| 2026-10-01 | [Notificações](funcionalidades/notificacoes.md), [Comentários](funcionalidades/comentarios-mencoes.md), [Tarefas](funcionalidades/tarefas.md) | Destinatários de comentário e conclusão limitados; tarefas canceladas fora dos avisos de prazo | 83f7524 |
| 2026-10-01 | [Autenticação](funcionalidades/autenticacao-acesso.md), [Usuários](funcionalidades/usuarios.md) | Sessões revalidam status ativo e perfil atual do usuário em cada request autenticado | `9bce2c0` |
| 2026-09-30 | [Agenda](funcionalidades/agenda.md), [Subtarefas](funcionalidades/subtarefas.md) | RF-036 e RF-037 formalizados no SRS v2.5 e alinhados ao ADD v1.12 | 8aa5ba1 |
| 2026-09-30 | [Notificações](funcionalidades/notificacoes.md), [Comentários](funcionalidades/comentarios-mencoes.md) | Preferências de canal também controlam menções e atribuições recebidas | ce3b73f |
| 2026-09-30 | [Clientes](funcionalidades/clientes.md), [Usuários](funcionalidades/usuarios.md) | Máscara `(DD) XXXXX-XXXX` e validação de celulares nos formulários | `1d88b94` |
| 2026-09-29 | [Subtarefas](funcionalidades/subtarefas.md) | O semáforo no campo Prazo já indica atraso; remover o texto de atraso redundante | `86bb070` |
| 2026-09-29 | [Projetos](funcionalidades/projetos.md), [Tarefas](funcionalidades/tarefas.md), [Subtarefas](funcionalidades/subtarefas.md), [Notificações](funcionalidades/notificacoes.md) | Semáforo global configurável: vermelho até 5 e amarelo até 10 dias úteis por padrão, aplicado a projetos, tarefas e subtarefas; antecedência de e-mail preservada | `f2ebb80` |
| 2026-09-29 | Todos | Documentação por módulo em `docs/funcionalidades/` | `fe1b5b4` |
| 2026-09-29 | [Identidade visual](Identidade_Visual_Multiplus.md) | Tokens `critico-cl` e `azul-cl`, e troca das cores inexistentes (`vermelho`, `fundo`, `black`). Sombra só em camadas flutuantes. Teste que barra token inexistente | `d731f79` |
| 2026-09-29 | [Projetos](funcionalidades/projetos.md) | Listagem mostra "Dias restantes" em dias úteis, mantendo as cores do semáforo | `82cfccf`, `c229dfc` |
| 2026-09-29 | [Projetos](funcionalidades/projetos.md) | Semáforo de prazo em dias úteis | `8b66162` |
| 2026-09-29 | [Clientes](funcionalidades/clientes.md) | Controles de acesso exibidos na ficha | `95589d2` |
| 2026-09-28 | [Comentários](funcionalidades/comentarios-mencoes.md) | Menções com `@`, com e-mail e destaque em azul | `5c69415`, `bf5f696`, `38c36e5` |
| 2026-09-28 | [Subtarefas](funcionalidades/subtarefas.md) | Etiquetas coloridas, catálogo global e paleta de 12 cores | `321a4e8` a `d65f10e` |
| 2026-09-28 | [Tarefas](funcionalidades/tarefas.md) | Dia da semana na recorrência semanal | `9969bff` |
| 2026-09-28 | [Tarefas](funcionalidades/tarefas.md) | Recorrência copia as subtarefas | `e894321` |
| 2026-09-28 | [Tarefas](funcionalidades/tarefas.md) | Conclusão recusa corretamente com comparação `NULL` | `57942e8` |
| 2026-09-28 | [Tarefas](funcionalidades/tarefas.md) | Responsável pode criar subtarefas, com permissão | `9066c72`, `5f6a3b4` |
| 2026-09-28 | [Projetos](funcionalidades/projetos.md) | Número da proposta comercial | `a976715` |
| 2026-09-28 | [Clientes](funcionalidades/clientes.md) | Número de identificação sequencial, filtros automáticos e desativação separada do acesso ao portal | `f005c46`, `2af30bc`, `edac240` |
| 2026-09-25 | [Subtarefas](funcionalidades/subtarefas.md) | Subtarefas completas. O Painel de Prazos vira painel de Subtarefas | `c907c9d`, `0956cdf` |
| 2026-09-25 | [Tarefas](funcionalidades/tarefas.md) | Filtros dependentes por cliente e projeto | `3b4a259`, `06bdbfc` |
| 2026-09-25 | [Clientes](funcionalidades/clientes.md) | Ficha do cliente para colaboradores, projetos na ficha e atalho para criar projeto | `65bf329`, `d26ab9d`, `28537e0` |
| 2026-09-18 | [Tarefas](funcionalidades/tarefas.md) | Equipe como responsável, desativação de tarefas e acesso contextual | `13bb3ba`, `347065c`, `a6fe875` |
| 2026-09-18 | [Projetos](funcionalidades/projetos.md) | Valor contratado | `305c823`, `f6c2bc4` |
| 2026-09-18 | [Comentários](funcionalidades/comentarios-mencoes.md) | Prévia, ampliação e download de imagem, e links destacados | `d57f65d`, `76587cf` |
| 2026-09-18 | [Usuários](funcionalidades/usuarios.md) | Link manual de convite | `36bc769` |
| 2026-09-17 | [Tarefas](funcionalidades/tarefas.md), [Projetos](funcionalidades/projetos.md) | Sprint 4A: núcleo de projetos e tarefas, RLS e recorrência | `6342b73` a `5522d07` |
| 2026-09-17 | [Comentários](funcionalidades/comentarios-mencoes.md), [Agenda](funcionalidades/agenda.md), [Notificações](funcionalidades/notificacoes.md) | Sprint 4B | `e974425`, `ddec7eb`, `dc16183` |
| 2026-09-16 | [Usuários](funcionalidades/usuarios.md), [Autenticação](funcionalidades/autenticacao-acesso.md) | Sprint 3: administração, atribuições, menu por perfil e desativação | `1169d46` |
| 2026-09-10 | [Clientes](funcionalidades/clientes.md) | Pessoa Física (ADR-006) e Pessoas Envolvidas (ADR-007) | `334d49e`, `4818298` |
| 2026-09-09 | [Clientes](funcionalidades/clientes.md) | Sprint 2: cadastro de clientes | `d84bd34` |
| 2026-09-09 | [Autenticação](funcionalidades/autenticacao-acesso.md) | Sprint 1: infraestrutura, login e RLS base | `c016fe4` |
