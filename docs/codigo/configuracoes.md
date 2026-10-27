# Explicação dos arquivos de configuração

Arquivos JSON não aceitam comentários sem deixar de ser JSON válido. As configurações declarativas são explicadas aqui; os arquivos TypeScript, MJS e YAML também recebem comentários inline onde a intenção precisa ficar junto ao valor.

## `package.json`

- `scripts.dev` inicia `scripts/dev-local.ts`, que escolhe uma porta livre e define `AUTH_URL` para a origem local.
- `scripts.build` cria a aplicação de produção com o builder webpack do Next.
- `scripts.start` serve o build já criado.
- `scripts.lint` executa ESLint; `scripts.typecheck` executa TypeScript sem emitir arquivos.
- `scripts.db:migrate`, `db:seed` e `db:studio` expõem comandos Prisma para desenvolvimento local.
- `scripts.test` executa primeiro integração/smoke e depois unitários; os atalhos por categoria permitem rodar cada conjunto isoladamente.
- O bloco `prisma.seed` aponta para `prisma/seed.ts`, que prepara a conta administrativa inicial.
- `dependencies` contém bibliotecas necessárias ao runtime; `devDependencies` contém ferramentas de build e validação. Versões fixas de Next e Prisma ficam alinhadas entre execução e geração do cliente.

## `tsconfig.json`

- `target`, `lib`, `module` e `moduleResolution` definem o JavaScript e a resolução de módulos que o TypeScript entende para este build.
- `strict` ativa as verificações estritas de tipos; `noEmit` deixa o Next responsável por produzir os artefatos.
- `allowJs`, `resolveJsonModule` e `isolatedModules` permitem os formatos usados pelos compiladores da aplicação.
- `jsx: react-jsx` seleciona a transformação JSX automática do React.
- `incremental` guarda informação de compilação para acelerar verificações locais.
- `plugins: [{ name: "next" }]` habilita as verificações de tipos específicas do framework.
- `paths` mapeia `@/` para `src/`, alinhando imports do TypeScript aos aliases do Next/Vitest.
- `include` abrange tipos gerados do Next e arquivos TS/TSX/MTS; `exclude` evita analisar dependências instaladas.

## Compose

O arquivo `docker-compose.yml` descreve a topologia de produção. Postgres e MinIO ficam na rede interna; o app depende dos healthchecks deles; Caddy publica HTTP/HTTPS. Serviços de migration, role, seed e bucket usam o perfil `ops` e são executados explicitamente durante `ops/deploy.sh`, não junto ao `up` normal. Volumes nomeados preservam banco, objetos e certificados entre recriações.

`docker-compose.local.yml` é um override de desenvolvimento que publica Postgres e MinIO somente em `127.0.0.1`. As portas não ficam acessíveis externamente. `docker-compose.proxy.yml` permite usar um proxy já existente; o modo selecionado em `.env` define qual conjunto é carregado no deploy.

## Testes e lint

- `vitest.config.mts` seleciona integração e smoke, prepara o Postgres de teste e serializa arquivos que disputam estado no banco/RLS.
- `vitest.unit.config.mts` seleciona unitários sem criar ou migrar banco; `tests/setup-env.ts` fornece URLs de teste para módulos que inicializam Prisma.
- `eslint.config.mjs` combina as regras Web Vitals e TypeScript do Next e ignora saídas geradas; comentários inline explicam a composição e as exclusões.
- `postcss.config.mjs` registra o plugin Tailwind usado para processar o CSS da aplicação.
- `next.config.ts` usa build standalone e define o limite de corpo das Server Actions.
