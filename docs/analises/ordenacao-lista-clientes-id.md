# Análise: ordenação crescente da lista de clientes por ID

- **Data:** 2026-10-21
- **Pedido original:** “Na página de listagem de clientes quero que você ordene os clientes pelo id, da ordem crescente”
- **Status:** aprovada em 2026-10-21

## 1. Escopo previsto

Na rota `/clientes`, ordenar os clientes pelo número de identificação exibido na coluna **ID**, em ordem numérica crescente. A mesma sequência será usada pela tabela desktop e pelos cartões móveis, pois ambos consomem a mesma lista. Busca, cidade, situação ativa/inativa e filtro de laudo continuarão sendo aplicados normalmente; a ordenação ocorrerá sobre o resultado filtrado.

Interpretação proposta: “ID” significa `numeroIdentificacao`, inteiro único e visível na lista, e não a chave primária técnica `id` (CUID opaco). O pedido não altera outras listas, como a visão contextual de clientes dos colaboradores, nem adiciona controles de ordenação, parâmetros de URL ou paginação.

## 2. Permissões

A mudança altera somente a sequência de resultados; nenhuma permissão existente muda.

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Criar cliente | Sim | Não | Não | Não |
| Listar clientes em `/clientes` | Sim | Não; usa visão contextual própria | Não; usa visão contextual própria | Não |
| Ver detalhe | Sim | Somente por vínculo contextual | Somente por vínculo contextual | Não; usa o próprio portal |
| Editar cliente | Sim | Não | Não | Não |
| Desativar/reativar cliente | Sim | Não | Não | Não |
| Ver dados sensíveis | Sim | Conforme mascaramento existente | Conforme mascaramento existente | Não se aplica à listagem central |

## 3. Dados

Não há campos, validações de entrada, migration, backfill, mudança de unicidade ou dado sensível novo. `Cliente.numeroIdentificacao` já é inteiro e único no banco, portanto a ordenação é numérica e determinística. Os registros existentes serão apenas apresentados em outra sequência.

## 4. Impacto em telas e funções existentes

- `src/lib/clientes.ts`: `listarClientes` usa atualmente `orderBy: { razaoSocial: "asc" }`; mudar para o número de identificação crescente. Busca e filtros permanecem na mesma query.
- `src/app/(painel)/clientes/page.tsx`: renderiza o resultado em cartões para telas menores e tabela no desktop; ambas as visões herdarão a ordem da função.
- `src/app/(painel)/clientes/filtros-clientes.tsx`: filtros existentes serão preservados; não se prevê mudança de interface.
- `src/lib/clientes.ts#listarClientesContextuais`: lista separada para colaboradores, fora do pedido.
- Testes existentes: `tests/integration/cadastro-clientes-cidade.integration.test.ts`, `tests/smoke/administracao-acesso.smoke.test.ts` e `tests/integration/laudos-tecnicos.integration.test.ts` usam ou espelham `listarClientes`; revisar expectativas afetadas.
- Não há impacto em detalhe, projetos, notificações, agenda, indicadores, contratos de API ou rotas.

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| Ordenar pelo CUID em vez do ID visível | Usar `numeroIdentificacao`, que é o valor mostrado na coluna ID e nos cartões | Integração comprova sequência pelos inteiros retornados |
| Ordenação textual produzir `1, 10, 2` | Ordenar o campo inteiro no banco | Integração com IDs em que ordem numérica difere da textual |
| Algum filtro perder efeito ou mudar indevidamente a ordem | Alterar apenas `orderBy` da consulta central | Integração combina busca/cidade, desativados e filtro de laudo com sequência esperada |
| Resposta ou acesso de perfil mudar | Manter seleção, função de autorização e RLS atuais | Testes existentes de permissão continuam passando; nenhuma nova superfície de dados é criada |
| Registros desativados aparecerem sem o filtro correspondente | Preservar `where` de ativos e testar a opção existente de incluir desativados | Integração cobre lista padrão e consulta incluindo desativados |
| Corrida ou duplicidade afetar a ordem | Campo já possui restrição `UNIQUE` e sequence no banco | Restrição existente; sem nova escrita ou teste de concorrência necessário |
| IDOR, campos controláveis pelo formulário, validação de input | Não há rota de detalhe/ação nova nem dados de formulário envolvidos | Não se aplica; sem novo endpoint ou entrada do usuário |
| View/RLS, funções SQL, comparação com NULL ou regra de autorização SQL | Nenhuma view, policy, função ou SQL customizado será modificada | Não se aplica; a consulta Prisma usa a política existente |
| Datas/fuso, links externos, upload, e-mail/notificações | Nenhum desses dados ou fluxos é alterado | Não se aplica; fora do escopo |

## 6. Casos-limite e estados

- Lista vazia mantém o estado vazio existente.
- Filtros sem correspondência mantêm a mensagem existente.
- Um único cliente é retornado sem efeito visível na sequência.
- Números com mais dígitos permanecem em ordem numérica, não lexicográfica.
- Clientes ativos e, quando solicitados, desativados compartilham a mesma sequência crescente.
- Volume e paginação não mudam; a listagem atual não pagina os resultados.
- Não há edição concorrente, pois nenhuma escrita é introduzida.
- Desktop e celular mostram os mesmos clientes na mesma ordem.

## 7. Interface

Não há alteração visual ou de controles. A tabela desktop e os cartões em celular continuam como estão; ambos passam a refletir a ordem da consulta. Não se aplica uma nova conferência visual, pois layout, estilo, texto e responsividade não mudam.

## 8. Plano de testes

- Integração com números de identificação em sequência incompatível com a ordem alfabética dos nomes e com a ordem textual, verificando a sequência numérica crescente.
- Integração da sequência ao combinar busca/cidade e filtro de laudo; verificar também a inclusão de clientes desativados quando pedida e sua exclusão padrão.
- Executar testes de módulo e, antes do commit/push, `npx prisma generate`, `npm run typecheck`, `npm run lint` e `npm test` com Postgres real, conforme `AGENTS.md`.

## 9. Perguntas em aberto

1. A interpretação de **ID** como número de identificação exibido (`numeroIdentificacao`) está correta? — **Resposta:** sim, aprovada em 2026-10-21.
2. Aprova a ordenação crescente por esse número na listagem central `/clientes`, tanto desktop quanto celular, preservando os filtros atuais? — **Resposta:** sim, aprovada em 2026-10-21.
