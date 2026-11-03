# Análise: exportação PDF de tarefas e subtarefas

- **Data:** 2026-10-23
- **Pedido original:** "Outra coisa que a Talita, solicitou foi a exportação de pdf, das tarefas e subtarefas, por exemplo, eu abro o painel de listagens das /tarefas e /subtarefas, ai eu exportar as listas do que aparecer ali, do mesmo formato que está e com as mesmas colunas, antes de construir quero certificar do modelo de pdf que vai ser gerado, e certificar que as informações..."
- **Status:** aprovada em 2026-11-03
- **Preferências já confirmadas:** exportar somente a lista filtrada de `/subtarefas` (sem a fila de pedidos de conclusão), mostrar no PDF os filtros ativos, exibir na coluna `Prazo` tanto o indicador relativo quanto a data exata e incluir o ID sequencial visível do cliente.

## 1. Escopo previsto

- Adicionar exportação em PDF das listas de `/tarefas` e `/subtarefas`, disponível somente para `ADMIN`, o mesmo perfil que já pode acessar esses painéis.
- Exportar todas as linhas resultantes dos filtros ativos no momento da solicitação. As páginas atuais não têm paginação; a ordenação existente será mantida e o PDF terá quantas páginas forem necessárias.
- Reproduzir as colunas e a ordem da tabela atual. Em `/tarefas`, a coluna `Subtarefas` continua condicional: aparece somente quando há um filtro específico de responsável ativo, como na interface.
- Preservar os valores que a lista apresenta, inclusive o texto do semáforo em `Prazo` (por exemplo, `Atrasado 2 dias`, `Vence hoje`, `3 dias`, `Sem prazo` ou `Concluído`) e o aviso de subtarefas sem atribuição dentro da coluna `Tarefa`. Para prazos com data, acrescentar também a data civil exata (por exemplo, `3 dias · 10/11/2026`); itens sem prazo ou sem data continuam sem data exata.
- Incluir a coluna `ID do cliente` ao lado do nome do cliente, com o identificador sequencial já mostrado nas telas de clientes (`numeroIdentificacao`, formatado por `numeroCliente`, como `07`). Não exportar o ID técnico interno (`Cliente.id`/CUID).
- Em `/subtarefas`, respeitar o padrão de mostrar pendentes e o controle `Mostrar concluídas e canceladas`; a lista do PDF não inclui a fila `Conclusões aguardando confirmação`, conforme preferência do usuário.
- Identificar o nome da lista, a data/hora de geração em Brasília e os filtros ativos. Usar página A4 em paisagem, cabeçalho de tabela repetido nas páginas seguintes, número de página e identidade visual do sistema. Nomes longos quebram linha.
- Não incluir links de navegação ou ações interativas do painel. Sem exportação CSV/Excel, detalhes da tarefa, novos campos, seleção manual de colunas ou edição de registros.
- Gerar uma prévia visual com dados fictícios para aprovação antes de implementar a exportação real.

## 2. Permissões

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Exportar `/tarefas` | Sim | Não | Não | Não |
| Exportar `/subtarefas` | Sim | Não | Não | Não |
| Ver os campos exportados | Sim; inclui também o ID sequencial visível do cliente | Não por estas rotas | Não por estas rotas | Não por estas rotas |

A rota de download deve exigir o perfil `ADMIN` no servidor, além de manter `exigirAdministrador` nas funções de consulta. Ocultar o botão na interface não basta.

## 3. Dados

- **Tarefas:** `Tarefa`, `Projeto`, `Cliente`, `ID do cliente`, `Responsável`, `Prazo`, `Status`; `Subtarefas` (concluídas/total) aparece quando o filtro de responsável está ativo, seguindo a regra atual. A coluna `Tarefa` também preserva o aviso de subtarefas que aguardam atribuição.
- **Subtarefas:** `Subtarefa`, `Tarefa`, `Projeto`, `Cliente`, `ID do cliente`, `Responsável`, `Prazo`, `Status`.
- Filtros exibidos como rótulos legíveis: Cliente, Projeto, Tarefa e Responsável; em `/subtarefas`, informar também se concluídas e canceladas foram incluídas. Filtros não selecionados aparecem como `Todos`/`Todos os responsáveis` ou são resumidos sem listar nomes de todas as opções.
- Reutilizar os filtros e a elegibilidade já aplicados por `listarPrazos` e `listarSubtarefasPrazos`. Incluir apenas o identificador sequencial público do cliente além dos campos exibidos na tabela; não incluir o ID técnico interno, e-mail, CPF, telefone ou outros campos.
- Sem migration, schema, backfill ou alteração de registro. Nenhuma dependência de PDF está presente atualmente; a biblioteca/runtime de geração será definida na implementação após a aprovação.
- Valores relativos do semáforo são calculados na geração, no fuso `America/Sao_Paulo`, como na tela. A data exata será apresentada junto do indicador quando houver prazo. O PDF registra a hora de geração para contextualizar esses valores.

## 4. Impacto em telas e funções existentes

| Arquivo/área | Impacto previsto |
|---|---|
| `src/app/(painel)/tarefas/page.tsx` | Incluir ação de exportar, preservando os filtros atuais e a variante condicional da coluna `Subtarefas` |
| `src/app/(painel)/subtarefas/page.tsx` | Incluir ação de exportar a lista filtrada; não exportar a fila de pedidos pendentes |
| `src/app/(painel)/filtros-listagens.tsx` | Reaproveitar estado/parâmetros já presentes na URL; avaliar passagem dos filtros à ação de download |
| `src/lib/projetos-tarefas.ts` | Reaproveitar `listarPrazos` e `listarSubtarefasPrazos`; selecionar `cliente.numeroIdentificacao` para a nova coluna e verificar rótulos de filtros sem consultas excessivas |
| Novas rotas de download e utilitário PDF | Validar sessão, perfil e parâmetros no servidor; responder com `application/pdf`, nome de arquivo seguro e `Cache-Control: private, no-store` |
| `docs/funcionalidades/tarefas.md`, `docs/funcionalidades/subtarefas.md`, `docs/decisoes-desenvolvimento.md` | Documentar comportamento, permissões, limitações e testes após aprovação/implementação |

Base funcional consultada: RF-005 e RF-037 do SRS; PDD `docs/product-design-multiplus-projetos-tarefas.md`; `docs/funcionalidades/tarefas.md` e `subtarefas.md`; análises anteriores de filtros/responsáveis, progresso de subtarefas, conclusão e horários de Brasília. As páginas atuais ordenam tarefas por prazo e nome e subtarefas por prazo (nulos por último) e título.

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| Acesso direto à rota ou troca de parâmetros por perfil sem permissão | Exigir `ADMIN` na rota de download e reutilizar funções que já exigem administrador | Integração: ADMIN autorizado; ADMIN_INTERNO, ADMIN_EXTERNO e CLIENTE recebem erro esperado |
| IDOR ou filtros forjados ampliarem a seleção | Validar parâmetros no servidor e consultar pelo contexto atual; não confiar em dados enviados pelo botão | Integração: ids inválidos/inexistentes, combinações e parâmetros repetidos não ampliam resultados |
| PDF expor campos que não aparecem na tabela ou confundir os dois IDs do cliente | Selecionar explicitamente `numeroIdentificacao`; nunca incluir `Cliente.id`/CUID na linha do PDF | Integração/texto PDF: confirmar ID sequencial formatado e ausência do ID técnico, e-mail, CPF e telefone |
| Consulta de exportação divergir da lista visível ou incluir inativos | Compartilhar as mesmas funções e predicados de seleção; manter ativo e status conforme filtros existentes | Integração: filtros, responsável, sem responsável, projeto/cliente/tarefa desativados, status e ordem |
| Filtros exibidos no cabeçalho não refletirem o resultado | Derivar rótulos no servidor dos mesmos parâmetros validados | Integração: correspondência entre parâmetros, resumo e linhas exportadas |
| Nome longo, acento, conteúdo inesperado ou quebra de página danificar o PDF | Usar codificação/fonte com português, escapar texto, quebrar linhas e repetir cabeçalhos | Unitário/integração de texto e revisão visual com dados longos, acentuados e em várias páginas |
| Texto relativo do semáforo ou data exata não corresponder à data/hora local | Gerar na referência de Brasília e incluir data/hora de geração | Unitário com prazo vencido, hoje, próximo, sem prazo e concluído; verificar a data civil junto ao rótulo relativo e o limite de meia-noite de Brasília |
| Exportação de muitas linhas consumir memória ou travar | Gerar em runtime Node; medir volume e memória com muitos registros antes de definir estratégia/limite | Teste de volume documentado com conjunto grande e PDF multipágina |
| PDF ficar acessível por cache ou nome de arquivo inseguro | `private, no-store`; nome neutro construído apenas com rota/data, sem nomes de clientes | Integração: cabeçalhos, tipo de conteúdo e nome do arquivo |

Não se aplicam views, funções SQL, upload, links externos, alteração de dados, notificações ou corrida de gravação: a proposta é somente leitura e não persiste o PDF no servidor.

## 6. Casos-limite e estados

- Nenhum resultado após filtro; filtro inválido; todos os filtros vazios; responsável sem resultado.
- Em `/tarefas`, coluna `Subtarefas` aparece somente quando a tela também a exibe; progresso `0/0`; indicação de itens sem responsável. A data exata deve acompanhar prazos vencidos, de hoje e futuros; o ID do cliente deve ser o sequencial formatado, nunca o CUID.
- Em `/subtarefas`, padrão só pendentes ou inclusão de concluídas/canceladas; subtarefas sem prazo; prazos vencidos; status concluído/cancelado.
- Nome de tarefa, projeto, cliente ou responsável longo; acentos e caracteres portugueses; linha que precisa continuar na página seguinte; lista com várias páginas.
- Tarefa/subtarefa, projeto ou cliente desativado fica fora segundo as consultas atuais.
- Duas mudanças de filtros em sequência: o download deve refletir a URL/seleção efetiva do momento do clique.
- Lista vazia: decisão pendente entre gerar PDF com cabeçalho/filtros e a mensagem `Nenhum item encontrado`, ou deixar a ação indisponível.

## 7. Interface

- Botão `Exportar PDF` próximo ao título ou aos filtros das listas, sem modificar a apresentação/ordem das colunas atuais.
- Reutilizar a identidade visual aprovada da Agenda: logo sobre faixa tinta com filete verde, títulos em Raleway, texto de apoio em Montserrat, algarismos em Droid Serif, bloco azul-claro para filtros, fundo branco e divisórias leves. As tabelas usam A4 paisagem; a sinalização em cores fica restrita aos prazos vencidos e próximos, sem realce do ID e do status.
- Botão com alvo de toque mínimo 44 px e quebra responsiva a 375 px; no celular pode ocupar uma linha própria sem rolagem horizontal.
- Modelo do PDF: cabeçalho com a logomarca e a faixa institucional da Agenda, título e contagem, bloco azul-claro de filtros, tabela com cabeçalho repetido e rodapé com data de geração e paginação. A prévia aprovada demonstra 12 tarefas e 12 subtarefas em duas páginas por lista, repetindo contexto e cabeçalho.
- O PDF não tenta reproduzir cartões móveis; preserva os mesmos campos e a estrutura de tabela em uma página adequada à impressão.

## 8. Plano de testes

- Unitários: montagem de cabeçalho/filtros, rótulos de semáforo/status, regra condicional da coluna de progresso, wrapping de conteúdo, nome seguro de arquivo.
- Integração: rota e perfil, filtros validados, mesmo conjunto/ordem da lista, status incluídos, campos estritamente permitidos, corpo `application/pdf`, cabeçalhos privados e resultado vazio.
- Revisão visual do PDF: dados fictícios, acentos, nomes extensos, uma e várias páginas, cabeçalho repetido e paginação; inspeção do PDF renderizado.
- UI/smoke: `/tarefas` e `/subtarefas` em desktop e 375 px, botão, preservação de filtros e download; `/subtarefas` exclui a fila de pedidos.
- Antes de commit/push: `npx prisma generate`, `npm run typecheck`, `npm run lint`, `npm test`; acompanhar CI, deploy e `/api/health` 200.

## 9. Perguntas em aberto

1. Aprovar o escopo e a prévia de layout antes da implementação? — **Resposta:** escopo e modelo visual aprovados em 2026-11-03; a identidade visual da Agenda também foi aprovada para as exportações de tarefas e subtarefas.
2. Quando a seleção não tiver linhas, gerar um PDF com mensagem de lista vazia ou desabilitar/ocultar o botão? — **Resposta:** gerar o PDF com a mensagem `Nenhum item encontrado` (confirmado em 2026-11-03).
3. A coluna `Prazo` deve manter o indicador relativo visível hoje (por exemplo, `3 dias`) ou incluir também a data civil exata? — **Resposta:** incluir também a data exata, junto ao indicador relativo (confirmado em 2026-10-23). Prévia atualizada para mostrar ambos.
4. O restante da frase original sobre "certificar que as informações..." veio incompleto. — **Resposta:** manter o escopo de colunas, filtros, ordem e estados descrito nesta análise, aprovado em 2026-11-03.
5. Qual identificador deve ser chamado de ID do cliente: o ID sequencial mostrado nas telas ou o identificador técnico interno? — **Resposta:** usar o ID sequencial mostrado no sistema (confirmado em 2026-10-23), formatado como nas telas; não incluir o ID técnico interno. Prévia atualizada com a coluna `ID do cliente` junto da coluna `Cliente`.
