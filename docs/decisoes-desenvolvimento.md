# Índice cronológico de alterações

Uma linha por alteração, da mais recente para a mais antiga. O **detalhe** (o que foi
decidido, as regras e o efeito na interface) fica no arquivo do módulo em
[`docs/funcionalidades/`](funcionalidades/README.md), na seção da funcionalidade e no
"Histórico de alterações".

Como registrar: ver a seção 7 do `AGENTS.md`.

| Data | Módulo | Alteração | Commit |
|---|---|---|---|
| 2026-10-29 | [Projetos](funcionalidades/projetos.md), [Tarefas](funcionalidades/tarefas.md), [Subtarefas](funcionalidades/subtarefas.md) | Manter os IDs em uma linha nas tabelas e cartões, reservando largura para a coluna e isolando a rolagem horizontal | este commit |
| 2026-10-29 | [Projetos](funcionalidades/projetos.md), [Tarefas](funcionalidades/tarefas.md), [Subtarefas](funcionalidades/subtarefas.md) | IDs hierárquicos com coluna própria nas três listagens; CUIDs seguem como chaves técnicas ([análise](analises/ids-hierarquicos-projeto-tarefa-subtarefa.md)) | este commit |
| 2026-10-28 | [Notificações](funcionalidades/notificacoes.md) | Alinhar os controles de cada preferência numa única linha e adaptar a composição à largura disponível no cartão | este commit |
| 2026-10-28 | [Notificações](funcionalidades/notificacoes.md) | Reorganizar lista e preferências em telas estreitas e permitir quebra de textos longos | este commit |
| 2026-10-27 | [Notificações](funcionalidades/notificacoes.md) | Dar destaque à caixa dos colaboradores com sino e contador individual de avisos não lidos ([análise](analises/central-notificacoes-colaboradores.md)) | este commit |
| 2026-10-27 | [Usuários](funcionalidades/usuarios.md) | Ocultar “Minhas atribuições” do perfil CLIENTE; o acesso do cliente continua pelo portal | este commit |
| 2026-10-27 | [Código e manutenção](codigo/README.md) | Explicar em português do Brasil os fluxos, regras e decisões do código, preservando migrations publicadas ([análise](analises/documentacao-codigo-portugues.md)) | este commit |
| 2026-10-26 | [Área Exclusiva do Cliente](funcionalidades/area-exclusiva-cliente.md) | Exibir dias restantes para a conclusão prevista nos cartões e no detalhe do portal ([análise](analises/dias-restantes-portal-cliente.md)) | este commit |
| 2026-10-26 | [Área Exclusiva do Cliente](funcionalidades/area-exclusiva-cliente.md) | Trocar o rótulo do indicador agregado do projeto de “Conclusão” para “Progresso” no portal, mantendo os cálculos | este commit |
| 2026-10-26 | [Clientes](funcionalidades/clientes.md) | Exibir na ficha administrativa a data original de cadastro, sem incluí-la nas visões contextuais ([análise](analises/data-cadastro-cliente.md)) | este commit |
| 2026-10-23 | [Interface](funcionalidades/interface.md) | Atualizar Next.js e eslint-config-next para 16.4.1 para corrigir alerta de segurança ([análise](analises/atualizacao-seguranca-nextjs.md)) | este commit |
| 2026-10-23 | [Autenticação](funcionalidades/autenticacao-acesso.md) | Padronizar como “SGA Múltiplus Ambiental” o nome da tela de login, dos convites e dos fluxos de senha | este commit |
| 2026-10-23 | [Área Exclusiva do Cliente](funcionalidades/area-exclusiva-cliente.md) | Separar e alinhar os cartões de tarefa no portal; identificar o tipo de progresso visualizado | este commit |
| 2026-10-23 | [Área Exclusiva do Cliente](funcionalidades/area-exclusiva-cliente.md) | Identificar explicitamente os nomes de projeto e tarefa no portal | este commit |
| 2026-10-23 | [Clientes](funcionalidades/clientes.md), [Subtarefas](funcionalidades/subtarefas.md), [Notificações](funcionalidades/notificacoes.md) | Restringir rotas administrativas, separar criação de subtarefa por perfil e corrigir links de e-mail; notificações antigas ficam sem migration ([análise](analises/guarda-clientes-subtarefa-colaborador-links-email.md)) | este commit |
| 2026-10-22 | [Área Exclusiva do Cliente](funcionalidades/area-exclusiva-cliente.md) | Colorir os status de projetos e tarefas no portal com a identidade visual | este commit |
| 2026-10-22 | [Autenticação](funcionalidades/autenticacao-acesso.md), [Notificações](funcionalidades/notificacoes.md) | Identificar e-mails como “SGA Múltiplus Ambiental”, mantendo o endereço configurado ([análise](analises/nome-remetente-email.md)) | este commit |
| 2026-10-22 | [Tarefas](funcionalidades/tarefas.md), [Subtarefas](funcionalidades/subtarefas.md), [Notificações](funcionalidades/notificacoes.md) | Colaboradores solicitam conclusão; ADMIN confirma ou rejeita, com fila, histórico e recorrência somente após aprovação ([análise](analises/aprovacao-conclusao-tarefas-subtarefas.md)) | este commit |
| 2026-10-21 | [Interface](funcionalidades/interface.md) | Aplicar Raleway na interface, Montserrat na leitura e Droid Serif nos algarismos, mantendo a escala ampliada | este commit |
| 2026-10-21 | [Interface](funcionalidades/interface.md) | Aumentar novamente os textos para 20% sobre a escala original | este commit |
| 2026-10-21 | [Interface](funcionalidades/interface.md) | Aumentar em 10% os textos do sistema após relato da Talita sobre legibilidade | este commit |
| 2026-10-21 | [Clientes](funcionalidades/clientes.md) | Visual do laudo escolhido pelo usuário: resumo, linha do tempo e formulário em diálogo | este commit |
| 2026-10-21 | [Clientes](funcionalidades/clientes.md) | Laudo técnico único e privado do ADMIN, responsável interno sem acesso automático, histórico com links e edição concorrente, filtro e desativação preservada ([análise](analises/laudo-tecnico.md)) | este commit |
| 2026-10-21 | [Clientes](funcionalidades/clientes.md) | Lista central ordenada pelo número de identificação crescente, com filtros existentes preservados ([análise](analises/ordenacao-lista-clientes-id.md)) | este commit |
| 2026-10-20 | [Agenda](funcionalidades/agenda.md), [Notificações](funcionalidades/notificacoes.md), [Comentários](funcionalidades/comentarios-mencoes.md), [Portal](funcionalidades/area-exclusiva-cliente.md), [Tarefas](funcionalidades/tarefas.md), [Subtarefas](funcionalidades/subtarefas.md) | Padronizar horários e dia de referência em Brasília, preservando datas civis e gravação UTC ([análise](analises/padronizacao-horarios-brasilia.md)) | este commit |
| 2026-10-20 | [Agenda](funcionalidades/agenda.md) | Mostrar nome completo ao passar o mouse sobre os itens, incluindo recorrências e lista "+N mais" | este commit |
| 2026-10-20 | [Tarefas](funcionalidades/tarefas.md) | Exibir subtarefas concluídas/total ao filtrar responsável, incluindo sem responsável e excluindo canceladas/desativadas ([análise](analises/progresso-subtarefas-tarefas-filtradas.md)) | este commit |
| 2026-10-20 | [Clientes](funcionalidades/clientes.md) | Telefone opcional para Pessoa Envolvida no cadastro inicial e na ficha, com validação de celular quando preenchido ([análise](analises/telefone-opcional-pessoa-envolvida.md)) | este commit |
| 2026-10-19 | [Tarefas](funcionalidades/tarefas.md), [Subtarefas](funcionalidades/subtarefas.md) | Filtrar por responsável direto (pessoa envolvida ou equipe), incluindo sem responsável, combinado com os filtros existentes ([análise](analises/filtro-responsavel-tarefas-subtarefas.md)) | este commit |
| 2026-10-16 | [Subtarefas](funcionalidades/subtarefas.md) | Painel "Adicionar etiqueta" fecha ao clicar fora ou ao apertar Esc | este commit |
| 2026-10-16 | [Tarefas](funcionalidades/tarefas.md), [Projetos](funcionalidades/projetos.md), [Subtarefas](funcionalidades/subtarefas.md) | Menus de status fecham ao escolher uma opção, ao clicar fora ou ao apertar Esc | `fc53ae2` |
| 2026-10-16 | [Tarefas](funcionalidades/tarefas.md) | Coluna "Responsável" própria na listagem de `/tarefas` | `348405d` |
| 2026-10-15 | [Subtarefas](funcionalidades/subtarefas.md) | Botão "Editar" na linha de cada subtarefa ativa, no detalhe da tarefa | este commit |
| 2026-10-15 | [Projetos](funcionalidades/projetos.md), [Tarefas](funcionalidades/tarefas.md), [Subtarefas](funcionalidades/subtarefas.md) | Linhas das tabelas brancas, com cinza-papel ao passar o mouse; continuam sem cor de fundo por situação ([análise](analises/atraso-fuso-e-lista-subtarefas-sem-fundo.md)) | `9b5195d` |
| 2026-10-15 | [Projetos](funcionalidades/projetos.md) | Botão "Editar" em cada tarefa ativa da lista do detalhe do projeto, alinhado à etiqueta de status | `dff749e`, `8e1304b` |
| 2026-10-15 | [Subtarefas](funcionalidades/subtarefas.md), [Tarefas](funcionalidades/tarefas.md), [Projetos](funcionalidades/projetos.md), [Agenda](funcionalidades/agenda.md) | Atraso vira à meia-noite de Brasília, como o semáforo (inclui "% em dia" e agenda); listas de subtarefas, projetos e tarefas sem cor de fundo nas linhas ([análise](analises/atraso-fuso-e-lista-subtarefas-sem-fundo.md)) | `75498a1` |
| 2026-10-15 | [Projetos](funcionalidades/projetos.md), [Tarefas](funcionalidades/tarefas.md), [Subtarefas](funcionalidades/subtarefas.md), [Notificações](funcionalidades/notificacoes.md) | Semáforo: vermelho só para prazo vencido, âmbar até um único limite configurável (padrão 5 dias), cancelado em cinza ([análise](analises/semaforo-vermelho-so-atrasado.md)) | `9f3a725` |
| 2026-10-14 | [Agenda](funcionalidades/agenda.md) | Identificar ocorrências projetadas na interface como "Tarefa recorrente" | `48dd05d` |
| 2026-10-15 | [Projetos](funcionalidades/projetos.md), [Tarefas](funcionalidades/tarefas.md), [Subtarefas](funcionalidades/subtarefas.md), [Notificações](funcionalidades/notificacoes.md) | Semáforo de prazo passa a contar dias corridos, mantendo os limites 5/10 ([análise](analises/semaforo-dias-corridos.md)) | `035aa9a` |
| 2026-10-14 | [Projetos](funcionalidades/projetos.md), [Tarefas](funcionalidades/tarefas.md), [Subtarefas](funcionalidades/subtarefas.md) | Prazo vencido passa a usar caixa vermelha sólida e texto branco | `035aa9a` |
| 2026-10-14 | [Projetos](funcionalidades/projetos.md) | Menu de status das tarefas não é mais cortado pelo contêiner da lista | `1f63d75` |
| 2026-10-08 | [Autenticação](funcionalidades/autenticacao-acesso.md) | Hardening do login, cabeçalhos CSP e execução restrita de funções SECURITY DEFINER ([análise](analises/remediacao-auditoria-seguranca.md)) | `900b406` |
| 2026-10-08 | [Autenticação](funcionalidades/autenticacao-acesso.md), [Notificações](funcionalidades/notificacoes.md) | Unificar o corpo visual dos e-mails de notificação e menção ao padrão de convite; conclusão de subtarefa continua sem evento de e-mail | `fd8d21f` |
| 2026-10-08 | [Clientes](funcionalidades/clientes.md), [Autenticação](funcionalidades/autenticacao-acesso.md) | Reenvio do convite de acesso para conta CLIENTE pendente: e-mail associado, token anterior invalidado e novo link copiável por 7 dias ([análise](analises/reenviar-convite-cliente-pendente.md)) | `ee7db52` |
| 2026-10-08 | [Clientes](funcionalidades/clientes.md) | Reposicionar e explicitar o escopo do filtro de registros desativados | `a5191c8` |
| 2026-10-08 | [Clientes](funcionalidades/clientes.md) | Ação única para desativar/reativar no topo da ficha | `aeb2288` |
| 2026-10-08 | [Clientes](funcionalidades/clientes.md) | Diferenciar visualmente login do portal da situação do cadastro e remover botão duplicado de desativação | `d27e273` |
| 2026-10-08 | [Notificações](funcionalidades/notificacoes.md) | Corrigir fixture temporal do teste RF-022 para validar falha real de envio e HTTP 500 ([análise](analises/fixture-temporal-notificacoes-rf022.md)) | `20dd992` |
| 2026-10-05 | [Clientes](funcionalidades/clientes.md), [Autenticação](funcionalidades/autenticacao-acesso.md) | Link temporário de definição de senha aparece para ADMIN ao criar acesso do cliente; token continua de uso único e armazenado apenas como hash ([análise](analises/link-manual-convite-cliente.md)) | `1339997` |
| 2026-10-02 | [Setup local](../README.md) | `npm run dev` escolhe porta livre e alinha `AUTH_URL` para impedir redirecionamento a outro projeto local ([análise](analises/ambiente-local-projeto-correto.md)) | `212f84a` |
| 2026-10-02 | [Área Exclusiva do Cliente](funcionalidades/area-exclusiva-cliente.md), [Projetos](funcionalidades/projetos.md), [Tarefas](funcionalidades/tarefas.md), [Notificações](funcionalidades/notificacoes.md) | Portal `/portal`; conclusão por agregação; última atividade agregada na consulta; CLIENTE sem SELECT de subtarefas/comentários/valor e avisos limitados ao projeto próprio ([análise](analises/area-exclusiva-cliente-sprint-6.md)) | `b81feaf` |
| 2026-10-01 | [Clientes](funcionalidades/clientes.md), [Projetos](funcionalidades/projetos.md), [Comentários](funcionalidades/comentarios-mencoes.md) | Links gravados no servidor aceitam somente URLs HTTP/HTTPS ([análise](analises/validacao-esquema-links.md)) | `9e20f9c` |
| 2026-10-01 | [Tarefas e Notificações](funcionalidades/tarefas.md) | Antecedência por tarefa, métricas de execução e preparação do cron diário; ativação na VPS pendente | `2154bb3` |
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
