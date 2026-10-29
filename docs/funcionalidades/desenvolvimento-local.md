# Desenvolvimento local

- **Última revisão:** 2026-10-29.
- **Módulo:** ferramentas para preparar e diagnosticar o ambiente local de desenvolvimento.

## Visão geral

O ambiente local usa Node.js para o servidor Next.js e Docker Compose para PostgreSQL e MinIO. O comando `npm run doctor:local` apresenta condições que podem impedir o acesso ao sistema durante testes.

## Quem pode fazer o quê

| Ação | Desenvolvedor local |
|---|---|
| Executar a auditoria | Sim |
| Corrigir configurações ou iniciar serviços | Manualmente, fora da auditoria |

## Funcionalidades

### D1. Auditoria local somente de leitura

**Como funciona.** O desenvolvedor executa `npm run doctor:local` e recebe no terminal um resumo do estado do Node, dependências, `.env`, Docker e Compose, serviços locais, portas e conexões do banco. Cada item informa se está OK, requer atenção, falhou ou ainda precisa ser iniciado. Quando possível, o relatório sugere um próximo passo manual.

**Detalhes técnicos.** Implementada em `scripts/auditoria-local.mjs`. Lê a configuração sem imprimir seus valores, consulta o Docker/Compose somente quando o endpoint configurado é local, testa portas e conectividade com `SELECT 1`, consulta o endpoint `/api/health` nas portas locais e usa `prisma migrate status` para conferir migrations. Só testa URLs PostgreSQL locais em `localhost:5434/multiplus`; URLs externas ou do banco de testes são ignoradas. Não segue redirecionamentos HTTP para fora da máquina. Não executa `up`, `down`, build, instalação, seed, migrations ou limpeza. Testes unitários em `tests/unit/auditoria-local.unit.test.ts` cobrem leitura segura do `.env`, ocultação de segredos, bloqueio de URLs e endpoints não locais, estado saudável de containers, leitura do estado de serviços e relatório.

## Limitações e pendências conhecidas

- O diagnóstico indica correções manuais; não repara o ambiente automaticamente.
- O estado da aplicação é verificado somente nas portas 3001–3100, faixa escolhida por `npm run dev`.
- A auditoria depende dos CLIs e dependências já instalados para executar as checagens correspondentes.

## Histórico de alterações

| Data | Commit | Alteração |
|---|---|---|
| 2026-10-29 | este commit | Adicionar auditoria local de acesso e Docker, somente de leitura ([análise](../analises/auditoria-acesso-local.md)) |
