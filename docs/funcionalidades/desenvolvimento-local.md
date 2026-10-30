# Desenvolvimento local

- **Última revisão:** 2026-10-29.
- **Módulo:** ferramentas para preparar e diagnosticar o ambiente local de desenvolvimento.

## Visão geral

O ambiente local usa Node.js para o servidor Next.js e Docker Compose para PostgreSQL e MinIO. O comando `npm run doctor:local` apresenta condições que podem impedir o acesso ao sistema durante testes. O override local publica as portas de desenvolvimento e usa MinIO pelo mesmo digest via Docker Hub, sem alterar a imagem de produção.

## Quem pode fazer o quê

| Ação | Desenvolvedor local |
|---|---|
| Executar a auditoria | Sim |
| Corrigir configurações ou iniciar serviços | Manualmente, fora da auditoria |

## Funcionalidades

### D1. Auditoria local somente de leitura

**Como funciona.** O desenvolvedor executa `npm run doctor:local` e recebe no terminal um resumo do estado do Node, dependências, `.env`, Docker e Compose, serviços locais, portas e conexões do banco. Cada item informa se está OK, requer atenção, falhou ou ainda precisa ser iniciado. Quando possível, o relatório sugere um próximo passo manual.

**Detalhes técnicos.** Implementada em `scripts/auditoria-local.mjs`. Lê a configuração sem imprimir seus valores, consulta o Docker/Compose somente quando o endpoint configurado é local, testa portas e conectividade com `SELECT 1`, consulta o endpoint `/api/health` nas portas locais e usa `prisma migrate status` para conferir migrations. Só testa URLs PostgreSQL locais em `localhost:5434/multiplus`; URLs externas ou do banco de testes são ignoradas. Não segue redirecionamentos HTTP para fora da máquina. Não executa `up`, `down`, build, instalação, seed, migrations ou limpeza. O Compose local espelha a imagem MinIO do digest de produção via Docker Hub, mantendo o arquivo base de produção inalterado. Testes unitários em `tests/unit/auditoria-local.unit.test.ts` cobrem leitura segura do `.env`, ocultação de segredos, bloqueio de URLs e endpoints não locais, estado saudável de containers, leitura do estado de serviços e relatório.

### D2. Proteção e jornadas de teste

**Como funciona.** Os testes usam bancos locais separados para integração e navegador. Antes de preparar ou limpar dados, a execução recusa configurações inseguras. As jornadas no navegador usam contas fictícias e verificam convite, login e listagem responsiva.

**Detalhes técnicos.** `tests/integration/setup/banco-teste-seguro.ts` valida URLs locais, nomes e roles; o setup confirma banco, servidor e roles efetivos. `npm run test:browser` usa `multiplus_test_e2e`, Chromium e trava no PostgreSQL para impedir execuções simultâneas no mesmo banco. O servidor e a compilação são separados do desenvolvimento. `tests/unit/banco-teste-seguro.unit.test.ts`, `banco-teste-setup.unit.test.ts` e `tests/browser/jornadas.spec.ts` cobrem as proteções e jornadas. Instalar com `npx playwright install chromium`; o CI também executa os testes de navegador.

## Limitações e pendências conhecidas

- O diagnóstico indica correções manuais; não repara o ambiente automaticamente.
- O estado da aplicação é verificado somente nas portas 3001–3100, faixa escolhida por `npm run dev`.
- A auditoria depende dos CLIs e dependências já instalados para executar as checagens correspondentes.

## Histórico de alterações

| Data | Commit | Alteração |
|---|---|---|
| 2026-10-29 | este commit | Proteger bancos de teste e ampliar verificações de acesso e navegador ([análise](../analises/seguranca-e-cobertura-de-testes.md)) |
| 2026-10-29 | este commit | Apontar o MinIO local para o mesmo digest acessível no Docker Hub e documentar sincronização da senha local ([análise](../analises/auditoria-acesso-local.md)) |
| 2026-10-29 | cecf416 | Adicionar auditoria local de acesso e Docker, somente de leitura ([análise](../analises/auditoria-acesso-local.md)) |
