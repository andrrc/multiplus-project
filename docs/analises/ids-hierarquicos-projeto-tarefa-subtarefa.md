# Análise: identificadores hierárquicos de projeto, tarefa e subtarefa

- **Data:** 2026-10-29
- **Pedido original:** “Quero executar essa ideia.” (referindo-se a IDs de projeto, tarefa e subtarefa relacionados, como no exemplo apresentado na conversa)
- **Status:** aprovada em 2026-10-29

## 1. Escopo previsto

Adicionar identificadores legíveis e sequenciais para projetos, tarefas e subtarefas, mantendo as chaves primárias CUID existentes para relações internas. A proposta é que o identificador de cada nível inclua o caminho até o cliente:

| Registro | Exemplo |
|---|---|
| Cliente existente | `CLI-0042` |
| Projeto 3 desse cliente | `PROJ-0042-03` |
| Tarefa 17 desse projeto | `TAR-0042-03-017` |
| Subtarefa 2 dessa tarefa | `SUB-0042-03-017-02` |

Os números de projeto seriam sequenciais dentro do cliente; os de tarefa, dentro do projeto; e os de subtarefa, dentro da tarefa. Cada novo nível herda o trecho do identificador do pai. A proposta é exibir esses códigos nas telas em que o respectivo registro já é acessível, sem alterar permissões existentes. CLIENTE continuaria sem acesso a subtarefas, conforme as regras atuais.

O pedido também especifica que as listagens administrativas `/projetos`, `/tarefas` e `/subtarefas` terão uma coluna **ID** com o código do respectivo registro. Nos cartões de celular, o ID será exibido junto ao nome, mantendo a mesma informação da coluna desktop.

Inclui migration e backfill dos registros existentes, geração segura em cadastros concorrentes, apresentação consistente nos contextos administrativos, de colaboradores e de cliente, e atualização de testes e documentação dos módulos Projetos, Tarefas e Subtarefas.

Fica fora: substituir CUIDs usados por rotas, chaves estrangeiras ou integrações; mudar permissões; e alterar o identificador já atribuído aos clientes.

## 2. Permissões

Os códigos não contêm dados pessoais ou financeiros. A proposta preserva a autorização já aplicada ao registro pai: somente quem já pode ver um projeto/tarefa verá seu identificador. O portal exibe projeto e tarefa conforme a autorização atual e não passa a exibir subtarefas.

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Criar/gerar identificador de projeto | Sim | Não | Não | Não |
| Ver identificador de projeto | Todos | Projetos no escopo atribuído | Projetos no escopo das tarefas/subtarefas atribuídas | Projetos próprios ativos no portal |
| Criar/gerar identificador de tarefa | Sim | Não | Não | Não |
| Ver identificador de tarefa | Todas | Tarefas no escopo atribuído | Tarefas no escopo atribuído | Tarefas dos projetos próprios ativos no portal |
| Criar/gerar identificador de subtarefa | Sim; colaborador responsável pode criar quando habilitado | Regra atual da tarefa | Regra atual da tarefa | Não |
| Ver identificador de subtarefa | Todas | Conforme acesso atual à tarefa | Conforme acesso atual à tarefa | Não; subtarefas não são expostas no portal |
| Ver dados sensíveis | Sem mudança | Sem mudança | Sem mudança | Sem mudança |

## 3. Dados

- Manter `id` CUID e os relacionamentos existentes: `Projeto.clienteId`, `Tarefa.projetoId`, `Subtarefa.tarefaId`.
- Adicionar um número local sequencial em cada tabela (projeto por cliente, tarefa por projeto, subtarefa por tarefa), com restrições de unicidade no banco por pai. O código legível é composto a partir desses números e do número de identificação do cliente.
- Backfill dos dados existentes em ordem determinística de criação; em empates, usar o CUID como critério secundário. Os registros atuais mantêm suas relações e recebem códigos.
- Próximas criações precisam alocar o número sem colisão em concorrência. A implementação deve impor a unicidade no banco e alocar dentro da transação de criação.
- Não há dado sensível novo. O identificador pode revelar a posição/quantidade aproximada de registros dentro de um pai; confirmar se essa informação pode ser vista por todos os perfis que já acessam o respectivo registro.
- Migration necessária; sem perda de dados. A sequência começa depois do maior número local já atribuído em cada pai após o backfill.

## 4. Impacto em telas e funções existentes

- `prisma/schema.prisma` e nova migration: números locais e índices únicos por pai, com backfill.
- `src/lib/projetos-tarefas.ts`: criação de projetos, tarefas, recorrências e subtarefas; gerar número em cada criação, incluindo próxima ocorrência recorrente e cópia de subtarefas.
- Rotas e páginas de projeto, tarefa e subtarefa (`src/app/(painel)/projetos`, `src/app/(painel)/tarefas`, `src/app/(painel)/subtarefas`): adicionar a coluna **ID** às tabelas desktop; nos layouts móveis em cartões/listas, mostrar o mesmo ID junto ao nome. Conferir também áreas contextuais `meus-projetos`, `minhas-tarefas` e `portal`, exibindo os códigos nos registros que essas telas já apresentam, sem ampliar as permissões.
- Testes de criação, recorrência, portal, listagens, filtros e RLS que validem os selects tipados serão revistos para refletir os novos campos.
- Arquivos a atualizar: `docs/funcionalidades/projetos.md`, `tarefas.md`, `subtarefas.md`, o índice `docs/funcionalidades/README.md` se necessário, e `docs/decisoes-desenvolvimento.md`.
- Não se prevê renomear rotas: CUIDs e URLs existentes permanecem inalterados.

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| Colisão de números em criações simultâneas | Restrição única por pai e alocação transacional | Integração concorrente de dois registros no mesmo pai; ambos recebem números distintos |
| Backfill inconsistente ou não determinístico | Ordenar por `criadoEm` e CUID, e validar unicidade/contagem antes e depois | Teste de integração/migration com vários registros, incluindo timestamps iguais |
| Código de tarefa/subtarefa aponta para ancestral incorreto | Compor o código pelos relacionamentos efetivos e não aceitar código enviado pelo formulário | Integração confere a cadeia do código e que campos derivados não podem ser forjados |
| Campo novo vaza dado de projeto/tarefa fora do escopo | Reusar consultas e autorização existentes; não buscar por CUID sem vínculo | Testes de RLS/acesso permitido e negado, incluindo troca de ID em URL |
| Código aparenta ser chave técnica e quebra URLs ou integrações | Manter CUID como chave e documentar o novo código como identificador de exibição | Testes existentes de rotas e vínculos continuam usando CUID |
| Tarefa recorrente ou subtarefas clonadas recebem número duplicado | Todos os fluxos de criação passam pela mesma alocação por pai | Integração cobre próxima ocorrência e cópia de subtarefas |
| Desativação/reativação altera indevidamente a identidade | Número não é reutilizado nem recalculado ao desativar/reativar | Integração verifica estabilidade antes/depois da desativação |
| Mudança de cliente/projeto pai invalida o prefixo | Resolver no escopo: código derivado reflete o novo caminho ou vínculo pai é imutável; registrar decisão antes da implementação | Teste de transferência/edição do vínculo conforme decisão aprovada |
| Portal passa a mostrar informação além do escopo existente | Mostrar só projeto e tarefa já autorizados; cliente não recebe subtarefas | Integração do portal verifica payload limitado aos campos e entidades permitidos |
| Links externos, datas, uploads, notificações ou campos sensíveis | Não se aplica: esses fluxos não serão alterados | Não se aplica, pois não há impacto nesses dados ou canais |

## 6. Casos-limite e estados

- Cliente, projeto, tarefa ou subtarefa sem filhos continua exibindo o código próprio normalmente.
- Sequências acima de dois ou três dígitos não podem truncar nem colidir; o zero à esquerda é apenas formatação mínima, não limite de tamanho.
- Desativação não apaga nem libera números para reutilização; reativação preserva os códigos.
- Recorrências são novas tarefas e recebem novo número dentro do projeto; subtarefas copiadas recebem novos números dentro da nova tarefa.
- O código exibido deve refletir a hierarquia atual. Se for permitido transferir projeto entre clientes, tarefa entre projetos ou subtarefa entre tarefas, o identificador hierárquico poderá mudar; esse comportamento precisa ser definido antes de implementar.
- Volume: sem mudança na paginação atual; índices únicos apoiam a busca por pai.
- Celular: códigos devem quebrar sem provocar rolagem horizontal.
- Concorrência: duas criações sob o mesmo pai devem receber números distintos; criações sob pais diferentes não devem bloquear desnecessariamente umas às outras.

## 7. Interface

Nas tabelas desktop de `/projetos`, `/tarefas` e `/subtarefas`, adicionar uma coluna **ID** e listar o identificador correspondente em cada linha. Nos cartões/listas móveis, exibir o ID junto ao nome do registro. Exibir também o código nos detalhes e nas visões de projeto/tarefa no portal, sempre respeitando as permissões atuais. Reaproveitar a identidade visual e a estrutura já descritas em `docs/product-design-multiplus-projetos-tarefas.md` e `docs/product-design-multiplus-cadastro-clientes.md`. Não criar paleta ou token de cor novo. Em 375 px, o código deve quebrar ou truncar de forma legível sem rolagem horizontal; desktop mantém a leitura alinhada.

## 8. Plano de testes

- Unitários para formatar códigos e montar corretamente cada nível da cadeia, inclusive valores maiores que a largura mínima.
- Integração para backfill e unicidade por pai; sequência concorrente; escopo por perfil/RLS; estabilidade ao desativar/reativar; criação de recorrência e cópia de subtarefas.
- Smoke do fluxo administrativo de criar projeto, tarefa e subtarefa e consultar seus códigos, além da visão permitida no portal.
- Verificação completa antes de commit/push: `npx prisma generate`, `npm run typecheck`, `npm run lint` e `npm test`, conforme o padrão do repositório.
- Conferir visualmente as telas afetadas em 375 px e desktop.

## 9. Perguntas em aberto

1. Aprova o formato hierárquico proposto (`PROJ-0042-03`, `TAR-0042-03-017`, `SUB-0042-03-017-02`), com contadores reiniciados em cada pai? — **Resposta:** sim, aprovado em 2026-10-29.
2. Se um registro puder mudar de pai (por exemplo, projeto para outro cliente), o código deve mudar para refletir a nova hierarquia? — **Resposta:** sim; atualizar o código para refletir a hierarquia atual, aprovado em 2026-10-29. Os formulários atuais não permitem transferência de pai.
3. Exibição nas três listagens principais: coluna **ID** em `/projetos`, `/tarefas` e `/subtarefas`, com o mesmo dado nos cartões de celular. — **Resposta:** sim, solicitado em 2026-10-29. Nas telas contextuais e no portal, exibir o código apenas para registros que já são mostrados, mantendo as permissões atuais; cliente não vê subtarefas.
