# Análise: telefone opcional de Pessoa Envolvida

- **Data:** 2026-10-20
- **Pedido original:** “Quando a gente vai cadastrar uma pessoa envolvida na empresa, tem um campo de telefone, mas aquele campo é obrigatório o de telefone, e eu gostaria que fosse opcional.”
- **Status:** aprovada em 2026-10-20

## 1. Escopo previsto

Permitir cadastrar Pessoa Envolvida sem telefone, tanto na criação do cliente quanto na inclusão pela ficha de cliente existente. Aplicar aos tipos Pessoa e Empresa/PJ, que compartilham a regra. Permitir adicionar outra pessoa à lista mesmo que a anterior não tenha telefone.

Quando preenchido, o telefone continua sujeito à máscara e à validação de celular com DDD e nove dígitos. Nome/razão social e e-mail continuam obrigatórios. Não há criação de entidade ou mudança no ciclo de listagem, detalhe, edição, desativação e reativação: permanecem os fluxos existentes. Novos fluxos de edição, busca e paginação ficam fora desta alteração pontual.

Referências consultadas: SRS (RF-028/RF-033 e nota de RF-002d), PDD de cadastro de clientes, `docs/funcionalidades/clientes.md`, identidade visual e análise anterior `formatacao-campos-telefone.md`. O pedido altera a obrigatoriedade anterior de RF-028; registrar a nova decisão na documentação do módulo e ajustar as referências normativas diretamente conflitantes após aprovação.

## 2. Permissões

| Ação afetada | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Cadastrar pessoa sem telefone na criação de cliente | Sim | Não | Não | Não |
| Adicionar pessoa sem telefone à ficha de cliente | Sim | Não | Não | Não |
| Criar acesso de colaborador externo com e-mail e sem telefone | Sim | Não | Não | Não |

Listagem, detalhe, edição, desativação, reativação e acesso a campos sensíveis não recebem novas permissões. Preservar autorização nas actions e policies existentes, inclusive restrição a cliente ativo.

## 3. Dados

`PessoaEnvolvida.telefone` já é `String?` no Prisma: não precisa de migration, backfill ou alteração de unicidade. O contrato atual dos formulários envia string vazia para ausência; mantê-lo compatível com a persistência e com os consumidores. Aceitar vazio/espaços como ausência na validação; número informado continua validado no servidor. Preservar números existentes e regras de CPF/CNPJ/e-mail. Sem novos campos sensíveis ou mudança de mascaramento.

## 4. Impacto em telas e funções existentes

- `src/lib/pessoas-envolvidas.ts`: `validarPessoaEnvolvida` exige telefone hoje; atualizar condição e comentário.
- `src/lib/validacao-cliente.ts`: `validarNovoCliente` reutiliza essa validação.
- `src/app/(painel)/clientes/novo/novo-cliente-form.tsx`: `podeAdicionarPessoa` exige telefone da última pessoa; remover essa dependência e revisar a ajuda de preenchimento.
- `src/app/(painel)/clientes/[id]/acoes-cliente.tsx`: remover `required` do telefone em `FormularioPessoaEnvolvida`.
- `src/app/(painel)/clientes/[id]/actions.ts`: `adicionarPessoaEnvolvidaAction` já converte campo ausente em string vazia e chama a validação; verificar fluxo completo.
- `src/lib/clientes.ts`: `PessoaEnvolvidaInput`, `normalizarPessoaEnvolvida` e `criarCliente` persistem o telefone; confirmar cadastro sem telefone nos testes.
- `src/app/(painel)/clientes/[id]/page.tsx` e `src/lib/formatacao.ts`: verificar apresentação de telefone ausente sem mudar o componente compartilhado de máscara.
- `tests/unit/celular.unit.test.ts`, testes unitários de cadastro, `tests/smoke/cadastro-clientes.smoke.test.ts` e `tests/integration/cadastro-clientes-rls.integration.test.ts`: validação, persistência, acesso e regressão.
- `docs/funcionalidades/clientes.md`, `docs/decisoes-desenvolvimento.md` e referências conflitantes de RF-028 no SRS/PDD: documentar regra aprovada.

Nenhuma rota, menu, vínculo de responsabilidade, indicador, agenda ou destinatário de notificação muda. Convites já utilizam e-mail.

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| Um dos formulários continuar exigindo telefone | Revisar `required`, condição de adicionar outra pessoa e validação compartilhada | Verificação dos dois formulários e teste de cadastro com múltiplas pessoas sem telefone |
| Liberar telefone inválido junto com vazio | Validar formato sempre que houver conteúdo | Unitários com vazio, espaços, válido e inválido para Pessoa e Empresa |
| Cadastro não persistir ausência ou perder pessoa da lista | Preservar contrato e filtros atuais da lista | Integração/smoke de criação de cliente e inclusão posterior sem telefone |
| Alteração interferir no convite | Manter e-mail obrigatório e fluxo atual | Smoke de criação de acesso de pessoa sem telefone |
| Acesso indevido ou escrita em cliente desativado | Preservar autorização e RLS | Integração de cadastro/RLS e soft delete existentes, com caso sem telefone quando pertinente |

Checklist restante da seção 2.3: sem novas queries/views (preservar mascaramento e `security_invoker`); sem SQL/triggers ou comparações com NULL alteradas; sem mudança de vínculos/IDs, campos aceitos, unicidade ou concorrência; sem novas consultas de registros desativados; sem alteração de datas/fuso, links externos, uploads ou conteúdo/destinatários de e-mails. Esses itens não exigem novas regras nesta mudança. Executar a suíte existente de regressão.

## 6. Casos-limite e estados

Telefone vazio, só espaços, válido ou incompleto; Pessoa e Empresa/PJ; uma ou várias pessoas no cadastro; inclusão posterior; com ou sem criação de acesso; leitura de registros com telefone nulo ou vazio. Nome/e-mail continuam validados. Estados de erro, sem permissão e cliente desativado mantêm tratamento existente. Não se aplica nova paginação nem controle de edição concorrente, pois a mudança apenas flexibiliza um campo de criação.

## 7. Interface

Reaproveitar `CampoTelefone` e os estilos existentes. Retirar a obrigatoriedade e ajustar eventual ajuda que exija telefone, sem alterar a máscara. Conferir cadastro inicial e inclusão na ficha em 375 px e desktop, inclusive botão de adicionar outra pessoa. Sem novos tokens, cores ou componentes compartilhados.

## 8. Plano de testes

- Unitários de `validarPessoaEnvolvida` e `validarNovoCliente`: telefone ausente permitido; formato inválido rejeitado quando informado; demais campos obrigatórios preservados.
- Integração/smoke: persistir pessoa sem telefone nos dois caminhos, contemplar Pessoa e Empresa e confirmar criação de acesso por e-mail sem telefone.
- Regressão de RLS e cliente desativado, preservando permissões atuais.
- Verificação real dos dois formulários em celular e desktop e do botão de adicionar outra pessoa sem telefone.
- Antes de commit/push: `npx prisma generate`, `npm run typecheck`, `npm run lint`, `npm test`; publicar somente com todos passando e acompanhar CI/deploy e healthcheck.

## 9. Perguntas em aberto

1. Aprovar o escopo de telefone opcional nos dois caminhos de cadastro e nos tipos Pessoa e Empresa/PJ, mantendo a validação quando preenchido? — **Resposta:** aprovado pelo usuário em 2026-10-20: “Ok, aprovado pode implementar.”
