# Análise: falha de build ao carregar fontes do Google

- **Data:** 2026-10-29
- **Pedido original:** “A atualização não chegou para mim, precisamos resolver o que deu falha no deploy”
- **Status:** aprovada em 2026-10-29

## 1. Escopo previsto

Baixar os arquivos WOFF2 variáveis da faixa Latin de Raleway e Montserrat do CDN oficial Google Fonts, preservar a licença SIL Open Font License junto aos arquivos e carregá-los com `next/font/local` em `src/app/layout.tsx`. A faixa variável de pesos 400 a 700 mantém disponíveis os pesos usados (400, 500, 600 e 700). Manter `next` e `eslint-config-next` em `16.4.1` neste escopo.

O build falha porque `next/font/google` recebe ocasionalmente do Google Fonts uma URL sem extensão de arquivo ([issue oficial #99114](https://github.com/vercel/next.js/issues/99114)). Com os arquivos servidos localmente, o build deixa de buscar e interpretar URLs remotas dessas duas famílias. A atualização para Next.js 16.4.3, que também corrige o problema ([release oficial](https://github.com/vercel/next.js/releases/tag/v16.4.3)), fica como alternativa caso a conversão local não preserve a tipografia ou o build continue falhando.

Ficam fora do escopo: trocar a identidade tipográfica ou os pesos usados, atualizar outras dependências, mudar schema ou migrations, e publicar em `main`.

## 2. Permissões

Não se aplica: a alteração corrige a dependência de build e não muda ações, perfis ou acesso a dados.

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Usar as telas após o deploy | Sem mudança | Sem mudança | Sem mudança | Sem mudança |
| Ver dados ou funções novas | Não se aplica | Não se aplica | Não se aplica | Não se aplica |

## 3. Dados

Não se aplica: não há novos campos, validações, mudança de dados, migration ou backfill. A alteração fica no layout raiz e nos arquivos de fonte/licença; `package.json` e `package-lock.json` não mudam.

## 4. Impacto em telas e funções existentes

- O carregamento global das fontes em `src/app/layout.tsx` passará de `next/font/google` para `next/font/local` para Montserrat e Raleway.
- Os arquivos WOFF2 variáveis Latin e suas licenças ficarão em `src/app/fonts`; Droid Serif continuará local e sem alteração.
- `next` e `eslint-config-next` permanecerão em `16.4.1` neste escopo.
- As rotas e telas não têm mudança intencional de comportamento; todas dependem do build global do Next.js.

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| Arquivo ou peso incorreto muda a tipografia ou deixa caracteres sem fonte | Usar os WOFF2 oficiais para os pesos atualmente declarados; incluir a licença; conferir renderização e arquivos gerados | Build de produção e inspeção visual em desktop e 375 px |
| A falha de parsing de URL remota continua no ambiente do deploy | Remover os imports de `next/font/google` dessas famílias e confirmar que os arquivos são lidos localmente | `npm run build` local e job de deploy no CI |
| `next/font/local` é configurado incorretamente ou causa incompatibilidade de renderização | Consultar o guia da versão instalada e executar a verificação completa do repositório | Prisma generate, typecheck, lint, suíte completa, CI e healthcheck |

## 6. Casos-limite e estados

- Os pesos 400, 500, 600 e 700 devem continuar disponíveis nas duas famílias.
- Caracteres latinos e acentuados usados em português devem estar presentes.
- O build não deve depender da disponibilidade ou do formato de resposta do Google Fonts.
- Build completo e serviço implantado com `/api/health` respondendo 200.
- Sem mudança de estado de negócio, autenticação, permissões ou dados.

## 7. Interface

Sem redesign ou mudança de fluxo. A fonte e os pesos exibidos devem permanecer iguais; conferir o resultado visual em desktop e 375 px, pois os arquivos passam a ser carregados localmente.

## 8. Plano de testes

- Confirmar que os WOFF2 variáveis oficiais cobrem os pesos necessários e o alfabeto latino usado em português, e que as licenças foram incluídas.
- Confirmar que não há mais import de Raleway/Montserrat por `next/font/google` e que o build não busca essas fontes remotamente.
- Executar `npx prisma generate`, `npm run typecheck`, `npm run lint` e `npm test`.
- Conferir a interface em desktop e 375 px; confirmar no CI que o build de produção passa e acompanhar o deploy até `/api/health` retornar 200.
- Não criar teste de produto: a regressão está no carregador do framework; a correção oficial e o build de produção cobrem o caso.

## 9. Perguntas em aberto

1. Aprovar a conversão de Raleway e Montserrat para arquivos WOFF2 locais, mantendo Next.js `16.4.1`, executando a verificação completa e publicando em `origin/staging`? — **Resposta:** aprovado pelo usuário em 2026-10-29.
