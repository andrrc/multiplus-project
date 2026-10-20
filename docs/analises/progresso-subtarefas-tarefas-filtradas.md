# Análise: progresso de subtarefas nas tarefas filtradas por responsável

- **Data:** 2026-10-20
- **Pedido original:** "Quando a gente filtrar um responsável na página de /tarefas gostaria que incluísse uma coluna de quantas subtarefas, foram realizadas daquela tarefa. Por exemplo 2/6."
- **Status:** aprovada em 2026-10-20

## 1. Escopo previsto

- Em `/tarefas`, mostrar a coluna "Subtarefas" ao selecionar uma pessoa envolvida ou integrante da equipe no filtro Responsável. Exibir `concluídas/total`, por exemplo `2/6`, em cada tarefa encontrada.
- Proposta de contagem: todas as subtarefas ativas e não canceladas da tarefa, independentemente de quem seja responsável por cada subtarefa. O filtro continua selecionando pelo responsável direto da tarefa.
- Numerador: status `CONCLUIDO`; denominador: status `EM_ANDAMENTO` ou `CONCLUIDO`, sempre com `ativo = true`. Canceladas e desativadas ficam fora dos dois números. Sem subtarefas elegíveis, mostrar `0/0`.
- Exibir a mesma informação como "Subtarefas: 2/6 concluídas" nos cartões do celular, com descrição acessível do significado dos números.
- Proposta de visibilidade: coluna também disponível com a seleção "Sem responsável"; em "Todos os responsáveis", filtro ausente ou inválido, não exibir a coluna.
- A aprovação confirma as duas propostas acima (regra de contagem e visibilidade).
- Fora do escopo: alterar o CRUD, status, responsável, desativação/reativação e permissões; mudar `/subtarefas`, `/minhas-tarefas`, detalhe da tarefa, portal, agenda e indicadores de prazo. O ciclo de vida das entidades já existe; esta alteração é uma leitura agregada na listagem.

## 2. Permissões

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Listar/filtrar `/tarefas` e consultar a nova contagem | Sim | Não | Não | Não |
| Receber título, descrição ou dados pessoais de subtarefas pela nova consulta | Não: somente números necessários | Não | Não | Não |
| Criar, detalhar, editar, desativar ou reativar por meio da coluna | Não se aplica: somente leitura | Idem | Idem | Idem |

Preservar a guarda de rota, `exigirAdministrador` nas funções de domínio e o contexto/RLS existentes. A coluna não concede acesso novo aos outros perfis. As regras dos demais fluxos permanecem as documentadas nos módulos.

## 3. Dados

- Utilizar as relações Tarefa/Subtarefa, `ativo` e `status` existentes. Sem campos de formulário, unicidade, escrita, migration ou backfill.
- Retornar contagens por tarefa no servidor, sem enviar conteúdo das subtarefas para realizar o cálculo no navegador. Obter os dois números na mesma consulta agrupada ou transação, sem uma consulta por linha.
- Não reaproveitar `_count.subtarefas` como progresso: hoje ele conta subtarefas sem responsável para o aviso de atribuição. Esse aviso deve continuar funcionando.
- Não alterar os valores retornados para consumidores que não solicitarem o progresso, especialmente `listarItensAgenda`.
- Dados sensíveis: a nova informação é agregada e exclusiva da ADMIN; nenhum campo pessoal ou conteúdo interno adicional será selecionado.

## 4. Impacto em telas e funções existentes

| Arquivo/função | Impacto previsto |
|---|---|
| `src/app/(painel)/tarefas/page.tsx` | Coluna condicional na tabela, linha equivalente no cartão e solicitação dos agregados |
| `src/lib/projetos-tarefas.ts` — `listarPrazos` | Agregar concluídas/total somente quando solicitado, com proteção administrativa e RLS |
| `src/lib/projetos-tarefas.ts` — `listarItensAgenda` | Consumidor de `listarPrazos`; conferir regressão e preservar retorno/comportamento atual |
| `src/lib/filtro-responsavel.ts` | Reutilizar `interpretarResponsavel` para decidir quando o filtro está válido/ativo |
| `tests/integration/filtro-responsavel.integration.test.ts` | Cobertura existente dos filtros e permissões; acrescentar ou complementar com casos da contagem |
| `tests/unit/filtro-responsavel.unit.test.ts` | Atualizar fixture da página se necessário e testar exibição condicional/tabela/cartão |
| `docs/funcionalidades/tarefas.md` | Documentar coluna, regras de contagem, testes e histórico no mesmo commit do código |
| `docs/decisoes-desenvolvimento.md` | Linha cronológica apontando para o módulo |

Referências lidas: SRS (RF-005, RF-008, RF-039, RN-007/RN-009), PDD de projetos/tarefas (inclusive exemplo de progresso `3/5`), documentação de tarefas/subtarefas, identidade visual e análise aprovada do filtro por responsável. Consultados os usos de `listarPrazos` em `src`/`tests`, o detalhe `buscarTarefa` e a contagem do portal. O detalhe hoje conta todas as subtarefas ativas, inclusive canceladas; a proposta desta coluna exclui canceladas e precisa de confirmação, sem mudar o detalhe nesta entrega. Guia local do Next.js: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`.

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| Contagem acessível por perfil não autorizado ou IDOR | ADMIN no servidor e contexto/RLS; agregar apenas ids das tarefas autorizadas/selecionadas | Integração: ADMIN consegue; ADMIN_INTERNO, ADMIN_EXTERNO e CLIENTE recebem a mensagem específica de acesso negado, inclusive com ids conhecidos |
| Conteúdo de subtarefa chegar ao navegador além dos agregados | Selecionar somente ids de agrupamento e números | Integração: formato da nova resposta sem títulos, descrições, responsáveis ou campos pessoais de subtarefas |
| Contar só as subtarefas do responsável filtrado em vez do progresso da tarefa | Separar filtro da tarefa da agregação de seus filhos | Integração: tarefa com subtarefas de vários responsáveis, incluindo sem responsável, soma o conjunto elegível |
| Canceladas/desativadas distorcerem progresso | Aplicar a regra aprovada nos dois números | Integração: mistura de concluídas, em andamento, canceladas e desativadas; nenhuma, todas e somente canceladas |
| Confundir progresso com aviso de atribuição ou alterar a agenda | Manter a contagem atual separada; agregação adicional explícita | Integração: aviso preservado e agenda sem alteração |
| Custo de consultas crescer por tarefa ou números inconsistentes | Agregação em lote no servidor e consulta/transação coerente | Integração: várias tarefas com contagens distintas, sem mistura entre clientes; revisão da consulta em lote |
| Coluna aparecer sem seleção ou estado de URL inválido | Derivar visibilidade de `interpretarResponsavel` | Teste de renderização: pessoa, usuário, sem responsável, todos, parâmetro inválido/repetido e recarga da seleção |
| Tabela/cartões perderem legibilidade no celular | Rótulo curto, números tabulares, coluna no desktop e linha no cartão | Smoke visual em 375 px e desktop, com valores de vários dígitos e nomes longos |

Checklist de segurança percorrido: não se aplicam novas views ou funções SQL, triggers/comparações com NULL, campos enviados para gravação, validação de formulário, concorrência de cadastros/UNIQUE, redefinição de funções SQL, alteração de datas/fuso, links externos, uploads e envio de e-mails/notificações. Não há esses fluxos nesta entrega; preservar as proteções existentes. Desativação e autorização são cobertas acima.

## 6. Casos-limite e estados

- Nenhuma subtarefa: `0/0`; nenhuma concluída: `0/6`; todas concluídas: `6/6`.
- Subtarefas sem prazo contam normalmente; canceladas/desativadas seguem a regra que for aprovada.
- Nomes iguais e origens diferentes de responsável mantêm a identidade por origem/id.
- Lista vazia, filtro inválido, sem permissão e tarefas/projetos desativados mantêm o tratamento existente.
- Reabrir, concluir, cancelar ou desativar uma subtarefa reflete na próxima consulta, sem novo estado persistente ou alteração no fluxo de escrita.
- Listagem mantém a paginação/ordenação atuais; contagem em lote evita consultas por registro. Falhas de consulta não devem ser apresentadas como `0/0` fictício.

## 7. Interface

- Nova coluna "Subtarefas" entre Responsável e Prazo, somente nos estados de filtro propostos.
- Valor `2/6` com texto acessível "2 de 6 subtarefas concluídas". Usar Archivo, `tabular-nums`, tokens existentes e bordas/raios da identidade visual, sem cores novas.
- No celular, linha "Subtarefas: 2/6 concluídas"; preservar alvos de toque de pelo menos 44 px e ausência de rolagem horizontal da página.
- Reutilizar estrutura atual de tabela `hidden md:block` e cartões `md:hidden`; o seletor de responsável permanece o mesmo.

## 8. Plano de testes

- Integração de agregação, mistura de responsáveis, exclusão de inativas/canceladas conforme aprovação, zero, várias tarefas/clientes, preservação do aviso, agenda e acesso permitido/negado.
- Testes de renderização da coluna e dos cartões com e sem filtro, incluindo "Sem responsável" e parâmetro inválido/repetido. Cabeçalhos de testes com RF/RN correspondentes.
- Smoke no navegador em 375 px e desktop, aplicação/limpeza do filtro, recarga e atualização da contagem após mudança de status em dados de teste.
- Antes de commit/push: `npx prisma generate`, `npm run typecheck`, `npm run lint`, `npm test` com Postgres real separado. Sem Postgres, não publicar.
- Atualizar documentação do módulo e índice, publicar somente os arquivos desta tarefa em `staging`, acompanhar CI/deploy e `/api/health` 200.
- Há arquivos de outra tarefa já preparados no índice, inclusive `docs/decisoes-desenvolvimento.md`. Preservar integralmente esse conteúdo e isolar somente o trecho desta entrega no futuro commit, sem incluir nem descartar alterações alheias.

## 9. Perguntas em aberto

1. Confirmar que `2/6` representa todas as subtarefas elegíveis da tarefa, inclusive as atribuídas a outras pessoas, e que canceladas/desativadas ficam fora? — **Resposta:** aprovado pelo usuário em 2026-10-20 ("Aprovo pode executar.").
2. Confirmar coluna apenas ao filtrar, incluindo "Sem responsável", e oculta em "Todos os responsáveis"? — **Resposta:** aprovado pelo usuário em 2026-10-20 ("Aprovo pode executar.").

## Verificação da implementação

- 2026-10-20: `npx prisma generate`, `npm run typecheck` e `npm run lint` passaram. `npm test` no estado local: 213 testes de integração/smoke e 142 unitários aprovados, incluindo testes das alterações de clientes que já estavam locais e não fazem parte deste commit.
- Esta entrega acrescenta 8 testes de integração em `progresso-subtarefas.integration.test.ts` e 7 casos de renderização em `filtro-responsavel.unit.test.ts`.
- Conferência visual em desktop (1280 px) e 375 px: coluna `2/6`, cartão equivalente, nome longo, `0/0`, sem responsável, coluna oculta ao limpar o filtro, recarga e atualização para `3/6` após concluir uma subtarefa temporária. A largura do conteúdo no celular permaneceu em 375 px.
- Teste visual usou somente `multiplus_test`. O timeout local inicial de conexão foi resolvido no servidor temporário usando `127.0.0.1` para conectar ao banco; nenhuma alteração no código de autenticação ou nas configurações versionadas. Conta e registros temporários removidos ao terminar.
