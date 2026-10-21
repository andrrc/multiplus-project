# Análise: laudo técnico por cliente

- **Data:** 2026-10-21
- **Pedido original:** "Quero desenvolver uma nova funcionalidade. Se chama laudo técnico." No cadastro ou na edição do cliente, informar se possui laudo, nome, tipo e responsável; disponibilizar seção na ficha para anotações e laudos.
- **Status:** aprovada em 2026-10-21
- **Contexto:** requisitos esclarecidos nesta conversa e plano solicitado para implementação em 2026-10-21. O plano mantém uma aprovação específica deste arquivo antes do código.

## 1. Escopo previsto

Um único laudo técnico por cliente PF ou PJ, inclusive considerando registros desativados. A análise da Talita acontece fora do sistema; não há aprovação operacional de laudos dentro do produto.

- Cadastro e edição do cliente: opção "Possui laudo técnico"; quando marcada, nome, tipo e responsável obrigatórios. Os demais campos do cliente mantêm suas regras.
- Tipos fechados: Ambiental, Rural e Agroambiental.
- Responsável: usuário ativo ADMIN ou ADMIN_INTERNO. Não gera atribuição, convite, notificação nem acesso ao laudo.
- Ficha: seção "Laudo técnico" antes do bloco Drive, com dados, responsável e histórico de anotações.
- Anotações: texto, vários links ou ambos; conteúdo totalmente vazio é inválido. Links são documentos externos, usualmente do Drive, validados como HTTP/HTTPS pelo padrão atual, sem integração de API.
- Permitir editar os dados do laudo e as anotações; desativar e reativar laudo e anotações, sem exclusão definitiva. Desmarcar a opção desativa; marcar novamente recupera o mesmo laudo.
- Histórico com autor, criação, última edição, busca em texto/URLs, ordem mais recente primeiro e "Mostrar desativados". Paginação de 20 itens, com desempate por identificador.
- Lista de clientes: filtro Todos / Com laudo ativo / Sem laudo ativo, combinado com busca, cidade e clientes desativados. URL: ausência de `laudo`, `laudo=com` ou `laudo=sem`.
- Sem laudo ativo inclui clientes sem registro e clientes cujo laudo foi desativado. A situação do cliente continua governada pelo filtro de clientes desativados; o filtro de laudo considera o estado individual do laudo.

Fora desta versão: lista independente de laudos, upload, geração de PDF/documentos, prazos, status de elaboração, notificações, menções, análise/aprovação no produto e histórico completo de versões do texto. Nome do laudo não é único entre clientes.

## 2. Permissões

"Somente Talita" corresponde ao perfil ADMIN do sistema, não a um e-mail fixo. Aplicar as mesmas restrições nas funções de negócio, Server Actions e banco/RLS.

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Cadastrar laudo | Sim | Não | Não | Não |
| Listar/filtrar clientes por laudo | Sim | Não | Não | Não |
| Ver detalhe, responsável, anotações e links | Sim | Não | Não | Não |
| Editar laudo e anotações | Sim, quando ativos | Não | Não | Não |
| Desativar e reativar laudo/anotação | Sim, com ascendentes ativos | Não | Não | Não |
| Consultar registros desativados | Sim, somente leitura | Não | Não | Não |
| Selecionar integrantes da equipe como responsáveis | Sim | Não | Não | Não |

Nem a condição de responsável nem acesso a projetos/tarefas do cliente concede leitura. Não enviar dados, links ou indicador de existência às consultas contextuais de colaboradores ou ao portal. Links do laudo não entram na tabela/bloco de documentos compartilhados.

## 3. Dados

### Persistência prevista

- `LaudoTecnico`: identificador, cliente com restrição UNIQUE, nome, tipo enumerado, responsável vinculado a Usuario, ativo, versão de edição, criação, atualização e auditoria de desativação.
- `AnotacaoLaudoTecnico`: identificador, laudo, texto opcional, autor, ativo, versão de edição, criação, atualização e auditoria de desativação.
- `LinkAnotacaoLaudoTecnico`: identificador, anotação, URL e ordem de apresentação. A edição da anotação e de seus links é atômica; a desativação da anotação preserva os links.
- Chaves estrangeiras protegem os vínculos. Não oferecer DELETE ao runtime nessas entidades. Não alterar os comentários existentes, que são imutáveis e pertencem a projeto/tarefa/subtarefa.
- Evitar booleano paralelo em Cliente: "Possui laudo técnico" é derivado da existência de laudo ativo. Clientes existentes começam sem registro; sem backfill de conteúdo.
- Migration nova, posterior à última migration do origin/staging após sincronização; schema e migration no mesmo commit. Incluir índices de vínculo/paginação, RLS, GRANTs e proteções de escrita.

### Validação e contratos

- Validar nome não vazio após trim, enum e responsável ativo da equipe no servidor. Conferir também no banco a integridade do responsável ao criar ou trocar o vínculo.
- Responsável depois desativado/trocado de perfil permanece identificado no registro, sem conceder acesso; pode ser mantido em edições que não troquem o responsável, com aviso na interface. Novas escolhas exigem elegibilidade atual.
- Anotação exige texto não vazio ou pelo menos uma URL válida; remover linhas vazias de links antes da validação. Reutilizar `validarUrlHttp`, recusar outros protocolos e renderizar texto sem HTML arbitrário.
- Acrescentar dados opcionais de laudo aos inputs de criação/edição do cliente. Omissão na edição preserva o laudo; desativação exige intenção explícita. Formulários novos enviarão a intenção marcada/desmarcada.
- Criar/editar cliente e criar/editar/desativar/reativar seu laudo em uma única transação com `comContextoDeUsuario`. Não aninhar outra transação dentro dessa operação.
- A ausência de versão só é válida ao criar o primeiro laudo. Atualizações e mudanças de ativo comparam a versão recebida e incrementam-na atomicamente. Aplicar o mesmo controle a anotações, incluindo os links.
- Conflito devolve erro específico, preserva o conteúdo digitado e orienta recarregar; não sobrescrever alterações de outra aba silenciosamente.
- Autor e auditoria são obtidos da sessão, nunca de campos livres enviados pelo navegador. Construir os dados persistidos campo a campo.
- Instantes são armazenados em UTC e exibidos pelos helpers atuais em Brasília, conforme análise aprovada `padronizacao-horarios-brasilia.md`. Não alterar datas civis de prazo.

## 4. Impacto em telas e funções existentes

Mapeamento por leitura e busca de usos no código e testes:

- `prisma/schema.prisma` e nova migration: entidades, relações com Cliente/Usuario e proteção das novas tabelas.
- `src/lib/clientes.ts`: inputs `NovoClienteInput`/`AtualizarClienteInput`, `criarCliente`, `atualizarCliente`, `buscarClienteParaEdicao`, `listarClientes`; preservar compatibilidade dos consumidores atuais. Consulta de laudo na ficha ficará exclusiva de ADMIN, sem ampliar dados de `buscarClienteContextual`/`listarClientesContextuais`.
- Novo módulo `src/lib/laudos-tecnicos.ts`: autorização, validação, seleção de responsáveis, persistência transacional, consulta, histórico, concorrência e mudanças de estado.
- `src/lib/validacao-cliente.ts`: preservar as regras atuais. A validação condicional do laudo fica em `src/lib/validacao-laudo.ts`, chamada pelos serviços de criação/edição de clientes e sem depender da interface.
- `src/app/(painel)/clientes/novo/`: page, formulário e action, incluindo carregamento das opções de responsáveis.
- `src/app/(painel)/clientes/[id]/editar/`: page, formulário e action; preencher valores e versão, inclusive laudo desativado recuperável.
- `src/app/(painel)/clientes/[id]/page.tsx` e componentes/actions próprios da seção de laudo: dados, histórico, busca/paginação e estados. Sem expor a seção nos componentes de colaboradores.
- `src/app/(painel)/clientes/page.tsx` e `filtros-clientes.tsx`: filtro adicional, URL, preservação de filtros e mensagem de resultado vazio.
- `src/lib/desativacao.ts`: respeitar o padrão de herança de inatividade. Preferir operações próprias para laudo/anotação para não permitir que a função genérica contorne vínculo e versão.
- `tests/integration/setup/helpers.ts` e demais limpezas/fixtures encontradas: remover links/anotações/laudos antes de Usuario/Cliente no banco de teste.
- Consumidores existentes a conferir: cadastro-clientes e administracao-acesso smoke; cadastro-clientes-cidade, soft-delete-rf039, projetos-tarefas-a4 e reenviar-convite-cliente integração; consultas contextuais e portal.
- Documentação: SRS, PDD de clientes, `docs/funcionalidades/clientes.md` e `docs/decisoes-desenvolvimento.md`. Atribuir IDs de requisitos sem colisão após reler a versão sincronizada.

Não renomear rotas ou alterar menus. Não incluir laudos na agenda, indicadores, última movimentação do portal ou destinatários de e-mails.

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| Autorização apenas visual | ADMIN nas funções/actions e RLS com sessão válida; proteger todas as tabelas novas | Integração permitindo ADMIN e negando cada outro perfil em leitura e escrita, inclusive responsável interno |
| Dados privados em respostas ou no bloco Drive | Consultas exclusivas e entidades separadas; não ampliar seleções contextuais/portal | Integração das respostas contextuais/portal, inclusive sem links e sem indicador de laudo |
| View ignorar RLS | Não criar view; se necessária durante implementação, exigir security_invoker | Integração com role de runtime e perfis negados, sem bypass por joins |
| Comparação NULL deixar escrita passar | Conferir existência, sessão e vínculos explicitamente; SQL com verificações de NULL | Integração com contexto ausente, IDs inexistentes e referências nulas inválidas |
| Troca de ID alterar anotação de outro laudo | Consultar/update por cliente, laudo e anotação juntos | Integração de IDs cruzados entre dois clientes, incluindo links de outra anotação |
| Mass assignment de autor, ativo ou vínculo | Construção explícita e ações específicas; auditoria da sessão | Integração com campos extras e tentativa de mudar autor/vínculo |
| Validação apenas no navegador | Validar nas funções e integridade no banco | Unitários e integração de chamadas diretas com nome/tipo/responsável inválidos e anotação vazia |
| Dois laudos para um cliente ou edição perdida | UNIQUE de cliente, transação e comparação atômica de versão | Integração concorrente de criação, edição, troca de links e desativação |
| Cliente salvo sem laudo quando há erro | Salvar os dois na mesma transação | Integração/smoke de rollback em PF/PJ e edição de cliente existente |
| Inativos receberem escrita ou reaparecerem ativos | Estado efetivo herdado; triggers/guards bloqueiam conteúdo; mudança de ativo é operação restrita | Integração de escrita direta e funções com cliente/laudo/anotação desativados; reativação preserva estados individuais |
| Responsável inválido ou criação involuntária de acesso | Elegibilidade validada; não usar atribuição automática de tarefas | Integração de externo/cliente/inexistente/inativo, troca posterior e ausência de Atribuicao/notificação |
| Função SQL antiga apagar comportamento | Não redefinir funções existentes sem necessidade; partir da migration mais recente se necessário | Integração de regressão de soft delete e suíte completa |
| Horário depender do servidor | UTC na persistência e helpers explícitos de Brasília | Unitário com instante conhecido para criação/edição na apresentação |
| Links perigosos, HTML e texto longo | HTTP/HTTPS, escaping do React, abertura protegida e quebra de linha | Unitários de protocolos; smoke/inspeção de texto e URLs longas, sem execução de HTML |
| Upload sem limite | Não se aplica: nenhuma operação de upload será criada | Verificação de interface/contrato sem campo de arquivo |
| Notificação/e-mail expor laudo | Nenhum disparo para laudo ou anotações | Integração/smoke conferindo ausência de notificações e chamadas de envio |
| Paginação omitir/repetir registros ou misturar filtros | Ordenação estável, 20 itens e busca/filtros no servidor | Integração com mais de 20 registros, datas iguais, busca, inativos e páginas |
| Regressão nos filtros de clientes | Preservar parâmetros e tratamento de resultado vazio | Integração com busca/cidade/laudo/desativados combinados e regressão da listagem existente |
| Alterações locais anteriores entrarem no commit | Preservar estado inicial e revisar diff/índice por tema e arquivo | Revisão de git status/diff antes de cada commit, sem stage abrangente |

## 6. Casos-limite e estados

- Sem laudo: ficha orienta usar edição para cadastrar; cadastro desmarcado não exige dados escondidos.
- Sem anotações ou sem resultado da busca: mensagens distintas; ações só quando ascendentes ativos.
- Laudo desativado: consultável ao mostrar desativados, somente leitura; reativação recupera dados sem recriar o registro. Reativação de anotação depende de cliente e laudo ativos.
- Cliente desativado: toda seção somente leitura, inclusive reativação do laudo/anotações bloqueada até reativar cliente.
- Remarcar antes de salvar não perde valores preenchidos. Desativar laudo existente não apaga conteúdo nem valida campos de edição ocultos.
- Autor/responsável com nome longo e usuário desativado: preservar identificação e evitar quebra do layout.
- Nenhuma anotação sofre exclusão definitiva; editar guarda última versão e última edição, sem auditoria textual completa das versões anteriores.
- Paginação reinicia na primeira página ao mudar busca ou filtro; páginas inválidas são normalizadas e página sem itens mantém navegação de retorno.
- Conflito de versão, erro de rede/servidor, validação e tentativa sem permissão recebem tratamento sem perder texto digitado.
- O controle de versão cobre laudo e anotações. Não ampliar o escopo para introduzir versionamento de todo o cadastro do cliente.

## 7. Interface

- Reutilizar campos, botões, blocos e mensagens existentes; cores exclusivamente dos tokens reais de globals.css, Archivo para interface e Source Serif 4 para texto corrido.
- Sem sombras em blocos; bordas e raios conforme identidade visual. Não refatorar visual antigo fora dos trechos necessários.
- Compartilhar o campo condicional de laudo entre cadastro e edição, com rótulos, obrigatoriedade e mensagens acessíveis.
- Seção antes do Drive: dados do laudo, estado, histórico, busca, toggle de desativados e paginação; formulário de anotação com linhas de links adicionáveis/removíveis.
- Em 375 px, uma coluna, textos/URLs quebrados, sem rolagem horizontal e controles com pelo menos 44 px. Exibir pendência de salvamento e impedir envio duplicado na interface.
- Conferir visualmente cadastro, edição, ficha, erros e filtros em 375 px e desktop. Se o ambiente impedir, informar explicitamente no relatório final.

## 8. Plano de testes

Arquivos previstos: `tests/unit/laudos-tecnicos.unit.test.ts`, `tests/integration/laudos-tecnicos.integration.test.ts` e `tests/smoke/laudos-tecnicos.smoke.test.ts`; criar arquivos adicionais apenas se a organização exigir. Todos com cabeçalho citando os requisitos atribuídos no SRS.

- Unitários: validação condicional, três tipos, espaços/vazio, links múltiplos e protocolos, formatação de horários e normalização de filtros/paginação.
- Integração real: cada risco funcional/de segurança da seção 5; exercitar tanto funções reais quanto RLS/triggers pela role multiplus_app, com mensagens de erro específicas.
- Smoke: cliente novo PF e PJ com laudo, cliente existente, alteração de nome/tipo/responsável, anotação textual/só links/mista, edição e conflito, desativação/reativação, busca e filtro de clientes. Não confundir smoke de serviços com verificação visual; conferir também o navegador.
- Regressão: consumidores existentes de clientes, fluxo de convite, documentos compartilhados, comentários, usuários, soft delete e portal. Não relaxar asserções nem pular testes.
- Antes do commit/push: `npx prisma generate`, `npm run typecheck`, `npm run lint`, `npm test` completos, com Postgres de teste e suas duas URLs. Postgres indisponível impede publicação.
- Após aprovação e implementação: documentar no mesmo commit do código, revisar staged diff, integrar commits remotos sem descartar mudanças, repetir verificação se houver conflito, publicar somente staging e acompanhar CI/deploy/healthcheck 200. Sem alterações manuais na VPS.

## 9. Perguntas em aberto

Não há perguntas de produto pendentes. Respostas dadas pelo usuário em 2026-10-21:

1. Quantidade — **Resposta:** um único laudo por cliente.
2. Conteúdo — **Resposta:** anotações e links do Drive.
3. Responsável — **Resposta:** somente equipe interna, incluindo Talita.
4. Análise da Talita — **Resposta:** acontece fora do sistema.
5. Acesso — **Resposta:** somente Talita (ADMIN); responsável não ganha acesso.
6. Anotações — **Resposta:** histórico com autor/data; permitir editar e desativar.
7. Desmarcar laudo — **Resposta:** desativar e preservar, permitindo reativar.
8. Campos — **Resposta:** nome, tipo e responsável obrigatórios.
9. Registro do histórico — **Resposta:** texto, vários links ou ambos; impedir vazio.
10. Consulta — **Resposta:** ficha do cliente e filtro adicional na lista de clientes.

O usuário solicitou executar o plano completo, que inclui paginação de 20, controle de versão, reativação das anotações e preservação de compatibilidade. Análise formal aprovada pelo usuário em 2026-10-21, com a resposta "Sim"; implementação autorizada conforme etapa 2 do plano e seção 2.2 do AGENTS.md.

Situação inicial: staging sincronizado com origin/staging em 2026-10-21; existem alterações locais anteriores, inclusive staged, em SRS, documentação, formulários e testes de clientes. Elas devem ser preservadas e separadas dos commits desta funcionalidade. Nenhuma implementação ou migration foi feita nesta etapa.
