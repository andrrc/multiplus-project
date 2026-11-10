# Deploy de ambientes

- **Última revisão:** 2026-11-10.
- **Módulos relacionados:** Desenvolvimento local e autenticação.

## Visão geral

O CI valida o projeto antes de publicar a versão aprovada no ambiente correspondente.
O deploy verifica os serviços e a saúde da aplicação antes de concluir.

## Quem pode fazer o quê

| Ação | Responsável |
|---|---|
| Executar deploy automático | CI configurado para o ambiente |
| Fazer alterações manuais na VPS | Somente mediante pedido explícito |

## Funcionalidades

### D1. Deploy com proxy compartilhado

**Como funciona.** Quando configurado para usar proxy externo, o deploy verifica que a
rede compartilhada existe antes de iniciar os serviços. O proxy alcança a aplicação
pelo alias de rede configurado; se a rede faltar, o deploy para antes de substituir a
aplicação.

**Detalhes técnicos.** `ops/deploy.sh` valida `caddy_proxy`, a rede externa declarada
em `docker-compose.proxy.yml`, cujo alias da aplicação é `multiplus-app`. O modo
standalone não usa essa rede. A verificação do CI acompanha o deploy e `/api/health`.
O teste `tests/unit/deploy-proxy.unit.test.ts` verifica a correspondência da rede e a ordem da validação. A alteração foi aprovada na [análise](../analises/rede-proxy-deploy-staging.md).

## Limitações e pendências conhecidas

- A execução depende da existência do proxy e da rede externa configurados no host.

## Histórico de alterações

| Data | Commit | Alteração |
|---|---|---|
| 2026-11-10 | este commit | Alinhar a validação da rede externa ao Compose |
