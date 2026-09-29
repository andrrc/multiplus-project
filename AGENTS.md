<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Registro das decisões de desenvolvimento

Para cada funcionalidade, correção ou outra alteração de código desenvolvida neste repositório, crie ou atualize `docs/decisoes-desenvolvimento.md` com um registro claro das decisões tomadas com o usuário. Inclua o objetivo e o contexto, as regras ou comportamentos acordados, as principais escolhas de implementação e seus efeitos visíveis no sistema. Registre também mudanças de decisão posteriores para manter o documento alinhado com o comportamento atual. Não invente decisões que não foram discutidas; quando faltar uma decisão necessária, esclareça-a com o usuário antes de implementá-la.

## Testes de desenvolvimento

Para cada funcionalidade, correção ou outra alteração de código, crie ou atualize testes automatizados que cubram o comportamento alterado e execute os testes pertinentes antes de concluir o trabalho. Na resposta final, informe quais testes foram executados e seus resultados. Se não for possível criar ou executar algum teste, explique o motivo e identifique o que ficou sem verificação.

## Branch e publicação

Durante a fase de desenvolvimento e testes, use sempre a branch `staging` e publique as alterações diretamente em `origin/staging`, para que sejam disponibilizadas no ambiente de teste da VPS. Não crie branches `codex/*`, de funcionalidade ou outras branches para este fluxo. Não envie alterações para `main` sem solicitação explícita. Preserve alterações locais existentes; se não houver um checkout seguro da branch `staging`, não descarte mudanças nem crie outra branch: informe o impedimento e peça orientação.
