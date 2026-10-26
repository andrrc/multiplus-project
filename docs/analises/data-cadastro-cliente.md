# Análise: exibir data de cadastro na ficha do cliente

- **Data:** 2026-10-26
- **Pedido original:** “A Talita solicitou gostaria que data de quando cliente foi cadastrado fosse mostrado na ficha do cliente.”
- **Status:** aprovada em 2026-10-26

## 1. Escopo previsto

Exibir na ficha administrativa `/clientes/[id]` a data em que o cliente foi cadastrado, usando o campo existente `Cliente.criadoEm`. A data ficará no bloco “Dados da empresa” ou “Dados pessoais”, junto aos demais dados cadastrais, no formato `dd/MM/aaaa`.

Não haverá alteração no cadastro, edição, listagem, regra de desativação ou acesso ao portal. Não se aplica o ciclo completo de entidade: a solicitação altera somente uma informação apresentada na ficha existente; criar, listar, editar e desativar clientes permanecem como estão.

Escopo proposto: mostrar a data apenas para `ADMIN`, na ficha administrativa. As visões contextuais de colaboradores (`/meus-clientes/[id]`) e o portal do cliente ficam sem a data, preservando suas seleções atuais. Essa interpretação precisa de aprovação.

## 2. Permissões

Nenhuma permissão de escrita muda. A matriz descreve acesso às ações existentes e a proposta para a nova informação.

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Criar cliente | Sim | Não | Não | Não |
| Listar clientes em `/clientes` | Sim | Não; visão contextual própria | Não; visão contextual própria | Não |
| Ver detalhe administrativo e data de cadastro | Sim | Não | Não | Não |
| Ver detalhe contextual e data de cadastro | Não se aplica | Vê detalhe vinculado; **data não incluída na proposta** | Vê detalhe vinculado; **data não incluída na proposta** | Não se aplica |
| Editar cliente | Sim | Não | Não | Não |
| Desativar e reativar | Sim | Não | Não | Não |
| Ver campos sensíveis existentes | Conforme regra atual: valores financeiros e telefones completos | Conforme mascaramento/RLS existentes | Conforme mascaramento/RLS existentes | Não se aplica à ficha administrativa |

## 3. Dados

- O modelo `Cliente` já possui `criadoEm DateTime @default(now())` em `prisma/schema.prisma`.
- O campo é preenchido pelo banco no cadastro, portanto não há validação de entrada, mudança de unicidade, migration ou backfill previstos.
- `buscarClienteDetalheSeguro` retorna o cliente à rota administrativa; não é necessário buscar o dado por uma fonte nova.
- A apresentação deve usar uma data civil consistente com o padrão do projeto (`timeZone: "UTC"`) para evitar deslocamento de dia por fuso. Exibir somente a data, sem horário.
- A data de cadastro não é considerada dado sensível no escopo atual. A seleção explícita das visões contextuais continua sem incluir `criadoEm`, salvo decisão diferente da Talita.

## 4. Impacto em telas e funções existentes

- `src/app/(painel)/clientes/[id]/page.tsx`: incluir o campo na seção “Dados da empresa” ou “Dados pessoais”; manter layout adaptável em uma coluna no celular.
- `src/lib/clientes.ts#buscarClienteDetalheSeguro`: já retorna o registro `Cliente` completo à rota administrativa, incluindo `criadoEm`; confirmar esse contrato e manter a autorização atual.
- `src/lib/clientes.ts#buscarClienteContextual` e `src/app/(painel)/meus-clientes/[id]/page.tsx`: fora da proposta; a seleção contextual explícita não inclui `criadoEm`.
- A rota de edição `src/app/(painel)/clientes/[id]/editar` não muda; a data é de auditoria e não pode ser editada pelo formulário.
- Não há impacto previsto em listagens, projetos, notificações, agenda, indicadores, links ou contratos de API.

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| Usar `atualizadoEm` em vez da data original de cadastro | Usar o campo persistente `Cliente.criadoEm`; editar o cliente não deve alterar a data apresentada | Integração cria o cliente, altera outro dado e confirma que `criadoEm` permanece o exibido |
| Data aparecer deslocada por fuso | Formatar apenas a data com `timeZone: "UTC"` | Teste unitário cobre instante próximo à meia-noite UTC |
| Expor a data em outra visão sem decisão | Incluir apenas na ficha administrativa; manter allowlist da consulta contextual e das telas de portal | Integração confirma `criadoEm` ausente na resposta contextual; teste da ficha administrativa confirma a data |
| Registro inexistente ou desativado causar erro na ficha | Reutilizar fluxo atual de `notFound` e consulta administrativa, que também permite a consulta de desativados com a regra existente | Testes de detalhe cobrem inexistente e cliente desativado |
| IDOR ou autorização apenas na interface | Não criar rota nem endpoint; preservar `exigirAcessoARota` e `exigirAdministradorClientes`/RLS usados pela leitura | Testes de permissão atuais permanecem; integração confirma recusa para perfis não autorizados |
| Ação de edição aceitar `criadoEm` do formulário | Não incluir o campo em formulário, input ou ação de atualização | Teste de integração verifica que atualização não altera `criadoEm` |
| Validação, duplicidade, view, SQL, registro inativo em listas, links externos, upload ou e-mail | Não se aplica: não há nova entrada, consulta em lista, view, migration ou integração desses tipos | Não se aplica; nenhuma dessas superfícies muda |

## 6. Casos-limite e estados

- Cliente com data disponível: mostrar a data formatada.
- `criadoEm` é obrigatório no schema; não se prevê estado sem data. A ficha não precisa de um estado vazio específico.
- Cliente desativado continua exibindo a data original na consulta permitida ao ADMIN.
- A data permanece igual após edição e reativação.
- Sem mudança em paginação, concorrência de edição ou cálculos.
- No celular, o campo deve caber na coluna única e manter números legíveis; no desktop fica alinhado aos demais campos.

## 7. Interface

Adicionar o rótulo “Cadastrado em” na seção dos dados principais da ficha administrativa, com data em `dd/MM/aaaa`, fonte e tokens já usados pelos campos dessa ficha e algarismos tabulares. Usar a grade existente, sem nova cor ou componente. Conferir a ficha em 375 px e no desktop.

## 8. Plano de testes

- Integração da leitura administrativa: data original retornada e estável após uma edição de outro campo.
- Integração contextual: confirmar que `criadoEm` não passa a ser retornado para colaboradores; manter testes de autorização/RLS.
- Teste unitário de formatação cobrindo data que poderia mudar de dia com fuso local.
- `cadastro-clientes.smoke.test.ts` confirma que a leitura administrativa recebe o timestamp; a conferência do rótulo e do layout é visual.
- Depois da aprovação, rodar os testes do módulo e, antes do push, `npx prisma generate`, `npm run typecheck`, `npm run lint` e `npm test` com Postgres real, conforme `AGENTS.md`.

## 9. Perguntas em aberto

1. A data deve aparecer somente na ficha administrativa `/clientes/[id]` (proposta), ou também nas fichas contextuais de colaboradores e/ou do portal do cliente? — **Resposta:** somente na ficha administrativa, conforme proposta; confirmada em 2026-10-26.
2. Aprova o campo “Cadastrado em” dentro dos dados principais, exibindo somente `dd/MM/aaaa` a partir de `Cliente.criadoEm`? — **Resposta:** sim; confirmado em 2026-10-26.
