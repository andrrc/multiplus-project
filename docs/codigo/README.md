# Guia de leitura do código

Este guia explica como as partes do SGA Múltiplus Ambiental se conectam. Os arquivos próprios de `src/`, `tests/`, `scripts/`, `ops/` e `prisma/` recebem comentários em português do Brasil junto ao módulo, às funções e aos blocos com regras ou efeitos relevantes. As explicações agrupam declarações que formam uma única etapa; pontuação e sintaxe trivial não são repetidas em texto.

As migrations SQL publicadas são imutáveis neste repositório. A finalidade de cada migration está resumida em [migrations.md](migrations.md), e os detalhes SQL permanecem nos comentários originais de cada arquivo.

## Caminho de uma requisição

1. `src/proxy.ts` faz uma verificação rápida de sessão e redireciona para o login quando necessário. Ele não substitui a autorização da página ou da action.
2. As páginas em `src/app/` recebem parâmetros de rota, validam o contexto autenticado com `src/server/auth/contexto.ts`, buscam os dados necessários e montam os componentes da interface.
3. Formulários e controles interativos em arquivos marcados com `"use client"` mantêm estado do navegador e enviam os dados às Server Actions.
4. As Server Actions validam os valores recebidos e chamam as funções de domínio em `src/lib/`. O servidor não confia na validação feita pelo navegador.
5. Operações de domínio que já têm sessão usam `comContextoDeUsuario`, em `src/lib/prisma-app.ts`. A função abre uma transação, configura `app.usuario_id` e `app.perfil`, e deixa as políticas RLS do Postgres decidirem o acesso permitido.
6. Operações anteriores ao login, como autenticação e tokens de acesso, usam a conexão proprietária em `src/lib/prisma.ts`. Esse cliente não deve ser usado como atalho para operações normais do domínio, pois ignora RLS.
7. O resultado retorna à página; notificações e efeitos posteriores usam os serviços de `src/lib/notificacoes.ts`, `src/lib/email.ts` e `src/lib/storage.ts` conforme o fluxo.

## Responsabilidade das pastas

| Caminho | Conteúdo | Como ler |
|---|---|---|
| `src/app/` | Rotas, páginas, layouts, Server Actions e Route Handlers | Comece pelo `page.tsx` da rota e siga os imports para actions e componentes. |
| `src/ui/` | Controles compartilhados e componentes de apresentação | Veja as props para entender dados recebidos e callbacks que devolvem alterações. |
| `src/lib/` | Regras de negócio, validações, consultas, integrações e utilitários | Identifique primeiro a regra/RF/RN no comentário da função e acompanhe a chamada até o banco. |
| `src/server/auth/` | Configuração do Auth.js, credenciais e construção do contexto | Diferencie a sessão assinada da autorização atual consultada no banco. |
| `src/types/` | Extensões de tipos de dependências | Declarações não executam lógica; informam ao TypeScript os campos do usuário/sessão. |
| `prisma/schema.prisma` | Modelo de dados usado pelo cliente Prisma | Relacione modelos e enums às regras documentadas em `docs/funcionalidades/`. |
| `prisma/migrations/` | Histórico SQL de mudanças persistidas | Migrations já publicadas são imutáveis; suas intenções são explicadas nos comentários originais e em `migrations.md`. |
| `tests/` | Testes unitários, de integração e smoke | O comentário inicial de cada arquivo deve indicar os RFs/RNs cobertos. |
| `scripts/` e `ops/` | Ferramentas de desenvolvimento, manutenção e operação | Confira argumentos, variáveis de ambiente e efeitos externos antes de executar. |

Para diagnosticar o ambiente de desenvolvimento sem alterar serviços ou dados, use
`npm run doctor:local`. A auditoria está em `scripts/auditoria-local.mjs`; ela verifica
pré-requisitos, Docker Compose, serviços, portas e conexões com consultas de leitura.

## Convenção dos comentários

- Comentários em português do Brasil explicam propósito, decisões, regras, efeitos colaterais e motivos de uma validação.
- Uma sequência de linhas pode compartilhar uma explicação quando todas implementam a mesma etapa.
- Nomes autoexplicativos e sintaxe rotineira não recebem comentário que apenas traduza o código.
- Um comentário precisa ser atualizado quando a regra que descreve mudar; comentários não são fonte de autorização, validação ou comportamento.
- Comentários não devem copiar segredos, dados reais de clientes ou conteúdo privado de fixtures.

## Leitura por tipo de arquivo

- Em uma página de `src/app/`, acompanhe primeiro os parâmetros e a autorização, depois as consultas e por fim os componentes que recebem o resultado.
- Em `actions.ts`, siga a leitura do contexto autenticado, a validação no servidor, a operação de domínio e a revalidação/redirecionamento.
- Em componentes client-side, os comentários explicam a relação entre props, estado local e callbacks; o componente não substitui validações e permissões do servidor.
- Em `src/lib/`, as regras compartilhadas documentam seus requisitos, entradas, saídas, persistência e notificações relacionadas.
- Nos testes, o cabeçalho identifica os RFs/RNs cobertos; os nomes dos cenários descrevem o comportamento que cada asserção protege.

## Referências relacionadas

- Comportamento atual de cada módulo: `docs/funcionalidades/`.
- Requisitos funcionais e não funcionais: `docs/SRS_Multiplus_Software_v1.0.md`.
- Identidade das telas e tokens visuais: `docs/Identidade_Visual_Multiplus.md`.
- Decisões arquiteturais e de banco: `docs/architecture-multiplus-software.md`.
- Explicação do histórico SQL: [`migrations.md`](migrations.md).
