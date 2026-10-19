# Análise: filtro por responsável em tarefas e subtarefas

- **Data:** 2026-10-19
- **Pedido original:** "Gostaria de poder filtrar por responsavel nas páginas de /tarefas e /subtarefas."
- **Status:** aprovada em 2026-10-19

## 1. Escopo previsto

- Adicionar um seletor de responsável nas duas páginas, com aplicação automática e persistência na URL, combinado por interseção com cliente, projeto e tarefa.
- Em `/tarefas`, filtrar pelo responsável direto da tarefa; em `/subtarefas`, pelo responsável direto da subtarefa, independentemente do responsável da tarefa pai.
- Contemplar pessoas envolvidas (inclusive sem login) e usuários da equipe, distinguindo as duas origens. Oferecer "Todos os responsáveis" e "Sem responsável".
- Proposta para as opções: listar somente responsáveis vinculados a registros elegíveis da respectiva página, considerando cliente/projeto/tarefa e o toggle de concluídas, mas sem aplicar o próprio filtro de responsável. Não consultar o cadastro completo de usuários nem expor e-mail, CPF ou telefone. Manter responsáveis inativos que ainda estejam vinculados a registros elegíveis, para permitir localizar essas pendências históricas.
- Preservar a seleção de responsável ao trocar os outros filtros; uma combinação sem correspondência mostra o estado vazio e permite voltar a "Todos os responsáveis". Preservar a opção selecionada no seletor, mesmo sem resultado na combinação atual.
- Manter a ordenação e o toggle "Mostrar concluídas e canceladas". O indicador "Em dia" de subtarefas acompanha o resultado filtrado, como já ocorre com os demais filtros.
- Corrigir a coluna/cartão de responsável de `/tarefas` para também mostrar o usuário da equipe: a consulta já carrega `responsavelUsuario.nome`, mas a página só renderiza `responsavel.nome`.
- Fora do escopo: alterar responsáveis, CRUD, desativação/reativação, permissões, `/minhas-tarefas`, agenda, notificações, novos filtros de status, paginação e migrations. O ciclo das entidades já existe e não será ampliado por este filtro.

## 2. Permissões

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Listar e filtrar `/tarefas` e `/subtarefas` | Sim | Não | Não | Não |
| Consultar as opções de responsável desses painéis | Sim | Não | Não | Não |
| Ver nome e identificador necessários ao filtro | Sim | Não nesses painéis | Não nesses painéis | Não nesses painéis |
| Receber outros campos pessoais nas opções | Não | Não | Não | Não |
| Criar, detalhar, editar, desativar e reativar por meio do filtro | Não se aplica: filtro somente de leitura; fluxos e permissões existentes preservados | Idem | Idem | Idem |

Base: SRS RF-005, RF-037, RF-039 e RN-007/RN-009; tabelas atuais em `docs/funcionalidades/tarefas.md` e `subtarefas.md`. Ambas as funções de listagem exigem Administrador antes da consulta e usam `comContextoDeUsuario`.

## 3. Dados

- Novo parâmetro opcional de URL `responsavel`, com valor tipado por origem (por exemplo `pessoa:<id>` ou `usuario:<id>`), ou `sem`. Ausente/vazio significa todos.
- Validar o parâmetro no servidor, incluindo origem, identificador e parâmetros repetidos. Valor malformado não deve retirar silenciosamente o filtro e devolver toda a lista; prever estado de filtro inválido. Identificador válido mas inexistente retorna vazio.
- Tarefa usa `responsavelId`/`responsavelUsuarioId`; subtarefa usa `atribuidoAId`/`atribuidoAUsuarioId`. "Sem responsável" exige ambos os campos nulos.
- Identidade baseada em origem e id, nunca no nome: homônimos continuam distintos. Rótulos distinguem equipe/pessoa envolvida e, quando necessário, cliente para homônimos de pessoas envolvidas.
- Opções retornam somente identificador, nome e contexto mínimo para distinguir as pessoas. Sem novos dados sensíveis ou alterações em campos cadastrais.
- Sem schema, migration, backfill ou novas restrições de unicidade: são relações existentes e uma consulta de leitura.

## 4. Impacto em telas e funções existentes

| Arquivo | Impacto |
|---|---|
| `src/app/(painel)/tarefas/page.tsx` | Ler parâmetro, consultar opções, aplicar filtro e exibir nome de responsável de ambas as origens em tabela/cartão |
| `src/app/(painel)/subtarefas/page.tsx` | Ler parâmetro, consultar opções e aplicar filtro antes de calcular o indicador |
| `src/app/(painel)/filtros-listagens.tsx` | Novo seletor, estado e URL; seus únicos consumidores são as duas páginas acima |
| `src/lib/projetos-tarefas.ts` | Estender `listarPrazos` e `listarSubtarefasPrazos`; obter opções com acesso administrativo e seleção mínima |
| `src/lib/projetos-tarefas.ts`, `listarItensAgenda` | Chama `listarPrazos`; parâmetro novo opcional precisa preservar a agenda sem filtro de responsável |
| `docs/funcionalidades/tarefas.md`, `subtarefas.md` | Atualizar filtros, detalhes técnicos, testes e histórico junto da implementação |
| `docs/decisoes-desenvolvimento.md` | Acrescentar referência cronológica aos módulos |

Referências consultadas: SRS, PDD `docs/product-design-multiplus-projetos-tarefas.md` (telas de tarefas/subtarefas), identidade visual, documentação dos dois módulos, análises anteriores de semáforo/atraso e área exclusiva do cliente. A análise local de guarda de clientes/links de e-mail pertence a outra tarefa e será preservada. Guia local do Next.js consultado: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md` (`searchParams` assíncrono).

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| Autorização só na interface ou IDOR por parâmetro | Exigir ADMIN também nas funções de dados/opções; manter contexto e RLS | Integração: ADMIN permitido, demais três perfis negados com mensagem específica, inclusive com ids de outro cliente |
| Opções vazarem dados pessoais | `select` mínimo, sem objeto completo de usuário/pessoa | Integração: formato exato das opções e ausência de e-mail/CPF/telefone |
| Misturar usuário e pessoa, homônimos ou responsabilidade da tarefa pai | Identidade tipada e filtros separados por entidade | Integração: ambas as origens, homônimos e responsáveis distintos entre tarefa e subtarefa |
| Nulos interpretados incorretamente | "Sem responsável" exige os dois vínculos nulos | Integração: nenhum vínculo, somente pessoa e somente usuário |
| Parâmetro inválido ampliar resultados ou filtros se perderem | Validação no servidor e composição explícita dos filtros/URL | Unitário da validação/composição e integração de interseção e id inexistente |
| Registros desativados entrarem nas opções/resultados | Aplicar elegibilidade de cada lista também às opções, preservando regra atual de cliente/RLS | Integração: subtarefa, tarefa e projeto desativados; regressão do comportamento atual para cliente desativado |
| Toggle ou "% em dia" desconsiderar responsável | Calcular sobre a mesma seleção filtrada | Integração: pendentes, concluídas/canceladas e indicador com seleção |
| Responsável da equipe aparecer como ausente na tarefa | Usar nome da pessoa ou do usuário também na renderização | Verificação de componente/fluxo em tabela e cartão com tarefa atribuída à equipe |
| Componente compartilhado perder filtros ou estourar no celular | Atualizar os dois consumidores; controles com largura limitada e quebra de nomes | Teste de interação e smoke visual em 375 px e desktop, incluindo voltar/avançar e recarregar URL |
| Mudança opcional afetar a agenda | Manter comportamento quando parâmetro não é fornecido | Integração de regressão de `listarAgendaMensal`/`listarPrazos` sem responsável |

Lista de segurança do AGENTS.md percorrida integralmente. Não se aplicam: novas views/funções SQL ou comparações em triggers, mass assignment, corrida em gravação/UNICIDADE, alteração de datas/fuso, links externos, upload e envio de e-mails/notificações, pois esta entrega não cria nem altera esses fluxos. Mantêm-se as proteções existentes.

## 6. Casos-limite e estados

- Lista sem registros/opções, seleção sem correspondência, id inexistente, parâmetro inválido e acesso negado.
- Pessoas sem login, responsáveis inativos ainda vinculados, nomes longos, homônimos, vínculos nulos e subtarefa com responsável diferente do pai.
- Mudança de cliente/projeto/tarefa preserva responsável e pode gerar resultado vazio; limpar responsável recupera os demais filtros.
- Opções sem duplicatas, ordenadas por nome; volume limitado aos responsáveis dos registros elegíveis. Paginação nova fica fora desta entrega, preservando o comportamento das listas atuais.
- Nenhuma escrita concorrente nova. Se a atribuição mudar durante a navegação, a próxima consulta reflete os dados atuais; não usar snapshot persistente no navegador.
- Erros de consulta seguem o tratamento existente da rota, sem ampliar resultados como fallback.

## 7. Interface

- Reaproveitar `FiltrosListagens` e `inputClass`, com seletor "Responsável" e rótulos "Todos os responsáveis"/"Sem responsável".
- Aplicação automática, preservando os filtros na URL e estados de carregamento; recarregar/voltar/avançar restaura a seleção.
- Usar somente tokens existentes, Archivo nos controles, bordas/raios da identidade e alvos de toque de ao menos 44 px.
- Em 375 px, filtros em uma coluna, largura limitada ao contêiner e nomes sem provocar rolagem horizontal. Desktop mantém disposição adaptável. Tabela/cartões existentes preservados.
- Mensagem de ausência de tarefas precisa distinguir filtro sem resultado de inexistência de cadastro, evitando orientar a criar tarefa quando há apenas um filtro restritivo.

## 8. Plano de testes

- Integração em `tests/integration/filtro-responsavel.integration.test.ts`: consultas/opções, ambas as origens, nulos, interseções, status, ativos, perfis, seleção mínima e regressão da agenda. Cabeçalho referencia RF-005/RF-037/RF-039 e RN-007/RN-009.
- Unitários de validação e composição de parâmetros; teste de interação do seletor com os demais filtros, conforme suporte atual de testes de componentes.
- Smoke manual autenticado das duas páginas em desktop e 375 px, persistência de URL, navegação e indicador.
- Verificação completa antes de commit/push: `npx prisma generate`, `npm run typecheck`, `npm run lint`, `npm test`, com Postgres real de teste. Se indisponível, não publicar.
- Depois do push em `staging`: acompanhar CI, deploy e `/api/health` 200. Nenhuma implementação ou publicação antes da aprovação desta análise.

## 9. Perguntas em aberto

1. Aprovar o escopo acima: responsável direto de cada entidade, pessoas envolvidas e equipe, "Sem responsável", opções vinculadas à seleção e preservação do responsável ao mudar outros filtros? — **Resposta:** escopo aprovado pelo usuário em 2026-10-19 ("Ok aprovado").

## Verificação da implementação

- 2026-10-19: `npx prisma generate`, `npm run typecheck` e `npm run lint` concluídos sem erro. `npm test`: 203 testes de integração/smoke e 132 unitários aprovados.
- Novos testes: 16 casos de integração e 14 unitários. A regressão do nome da equipe foi reproduzida com teste falhando antes da correção da tela.
- Navegador: `/tarefas` e `/subtarefas` conferidos em desktop (1280 px) e 375 px, incluindo nome longo, seleção de equipe/pessoa, sem responsável, combinação de cliente/projeto/tarefa, toggle, indicador, recarga e voltar no histórico. Sem rolagem horizontal da página.
- Verificação visual usou conta e registros temporários apenas em `multiplus_test`, removidos ao terminar. O primeiro carregamento frio do servidor de desenvolvimento apresentou timeout transitório na transação de autenticação já existente; a recarga e as navegações seguintes funcionaram, sem mudança nesse fluxo.
