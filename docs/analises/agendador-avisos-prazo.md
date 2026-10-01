# Análise: agendador e observabilidade de avisos de prazo (Etapa C)

- **Data:** 2026-10-01
- **Pedido original:** “Executar as Etapas C e D das correções pré-Sprint 5”, começando pela Etapa C: agendador diário para `/api/jobs/notificacoes-prazo`, antecedência por tarefa, exclusão de canceladas e observabilidade.
- **Status:** aprovada em 2026-10-01

## 1. Escopo previsto

- Fazer `dispararPrazoProximo` aplicar a antecedência da tarefa quando preenchida e a antecedência global quando nula, usando dias corridos e limites de data UTC.
- Manter a exclusão de tarefas concluídas, canceladas, desativadas e de projetos/clientes inativos. A exclusão de canceladas já foi implementada na Etapa B (`83f7524`) e será preservada e coberta na seleção do job; não requer nova alteração de regra.
- Instrumentar a execução com resultado e contagem verificável de avisos entregues por canal. Proposta: persistir última execução, estado, e-mails enviados e notificações in-app novas; registrar também um log estruturado para diagnóstico.
- Exibir a última execução e as contagens na página `/notificacoes`, que já é exclusiva do ADMIN.
- Preparar a linha e o procedimento de cron para execução diária às **08:00 no fuso `America/Sao_Paulo`**. O acesso permitido à VPS nesta tarefa é somente leitura; a ativação do crontab será uma etapa manual do usuário depois do deploy.
- Garantir que `CRON_SECRET` seja exigido no deploy e enviado ao container; hoje a rota valida o segredo, mas o Compose não o disponibiliza.
- Tornar a deduplicação efetiva também para e-mail (inclusive quando o canal in-app está desligado), com registro privado de idempotência por destinatário/tarefa/dia.
- Fora do escopo: criar um serviço de agendamento externo, alterar preferências/canais ou conteúdo dos avisos, e implementar a Etapa D (validação de links), que terá análise e aprovação próprias depois da conclusão de C.

## 2. Permissões

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Executar job de prazo | Não diretamente; somente chamada com `CRON_SECRET` | Não | Não | Não |
| Consultar data/resultado da última execução na página `/notificacoes` | Sim | Não | Não | Não |
| Receber aviso de prazo | Conforme preferência atual e regra do responsável/admin | Conforme responsável e preferência | Conforme responsável e preferência | Sem mudança |
| Alterar preferências e antecedência global | Sim | Não | Não | Não |

## 3. Dados

- O campo `Tarefa.diasAntecedencia` já existe; nenhum campo de tarefa ou backfill necessário.
- A antecedência da tarefa sobrescreve `ConfiguracaoNotificacao.diasAntecedenciaPadrao`; quando nula, usar o padrão global (fallback atual de 7 dias se a configuração não existir).
- Para observabilidade, proposta de adicionar à singleton `ConfiguracaoNotificacao`: data/hora da última execução, estado (`SUCESSO`/`FALHA`), contagem de e-mails enviados e contagem de notificações in-app novas. A migração preencherá histórico desconhecido como nulo/zero sem alterar preferências existentes.
- O número de e-mails só conta envios cujo provedor retorna sucesso; a contagem in-app só considera registros criados, não deduplicações. O retorno do endpoint informa também tarefas elegíveis/processadas.
- Sem dados pessoais novos. Erro detalhado permanece no log do servidor; a página exibe estado resumido, data e contagens.

## 4. Impacto em telas e funções existentes

- `src/lib/notificacoes.ts`: `dispararPrazoProximo` hoje calcula um único intervalo global; fará seleção por antecedência individual e agregará métricas. Os limites consideram o dia UTC completo, até 23:59:59.999Z. O despachante genérico precisará informar entregas por canal ao job.
- `src/app/api/jobs/notificacoes-prazo/route.ts`: manter `Authorization: Bearer $CRON_SECRET`, responder com resumo de execução e registrar estado de sucesso/falha.
- `prisma/schema.prisma` e nova migration Prisma/SQL: acrescentar os campos de observabilidade à configuração singleton e registro privado de idempotência do envio. Conferir o timestamp posterior à última migration do `origin/staging`; RLS habilitado sem acesso para `multiplus_app`, pois só o serviço usa a conexão proprietária.
- `src/app/(painel)/notificacoes/page.tsx`: apresentar estado/data/contagens em uma seção de observabilidade, sem expor dados fora da rota ADMIN.
- `tests/integration/notificacoes-rf022.integration.test.ts`: preferências/deduplicação existentes, antecedência própria/global e filtros de status/atividade.
- `ops/README.md`, `ops/disparar-notificacoes-prazo.sh`, `.env.example`, `ops/deploy.sh` e `docker-compose.yml`: gerar e persistir um segredo privado se ausente, validar pelo menos 32 caracteres, repassar ao container e documentar procedimento/linha de crontab. Não executar comando de escrita na VPS.
- `docs/funcionalidades/tarefas.md`, `notificacoes.md`, índice `docs/funcionalidades/README.md` e `docs/decisoes-desenvolvimento.md`: documentar o comportamento. Enquanto cron não estiver ativo na VPS, manter L1 em tarefas/notificações e registrar “código pronto; ativação manual pendente”.
- Requisitos: RF-007 do SRS e detalhe de sobrescrita por tarefa em `docs/rfs-novos-srs-multiplus.md` e no PDD de Projetos/Tarefas.

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| Cron chama URL ou método sem autorização | Manter bearer token em variável protegida do `.env`; não colocar segredo na linha de crontab nem em logs | Integração da rota: sem token/token incorreto recebe 401; token correto executa |
| Segredo configurado na VPS não chega ao container | Validar presença e tamanho mínimo no deploy e declarar `CRON_SECRET` no ambiente do serviço | Verificação de configuração do Compose/deploy e integração com segredo válido |
| Ligar o cron antes de corrigir o filtro gera avisos incorretos | Antecedência por tarefa e filtros de status concluído/cancelado/inativo são pré-requisitos do procedimento de ativação | Integração verifica cancelada fora da seleção e antecedência individual |
| Antecedência individual usa limite de data diferente do global | Aplicar os mesmos limites de dia UTC para o job e usar `diasAntecedencia ?? diasAntecedenciaPadrao` por tarefa | Integração: própria menor/maior que global, nula usa global e prazo no limite do dia |
| Job diário repete mensagens | Registro de idempotência privado por tarefa/dia/destinatário; contar somente canais efetivamente entregues | Integração: duas chamadas no mesmo dia não duplicam in-app/e-mail nem métricas; role de aplicação não acessa o registro |
| Erro passa despercebido novamente | Registrar sucesso/falha e contagens; exibir última execução; manter log estruturado | Integração do endpoint/serviço comprova timestamp, estado e contagens após sucesso e falha |
| Alterar configuração de prazo afeta outras preferências | Acrescentar somente campos de telemetria e preservar linha singleton, policies e canais | Migration/teste de integração confirma preferências permanecem intactas |

## 6. Casos-limite e estados

- `diasAntecedencia` nulo: usar o padrão global; zero/negativo permanece inválido pela validação existente.
- Valor individual maior ou menor que o global; prazo exatamente no limite inicial/final; tarefa sem prazo.
- Tarefas concluídas, canceladas, desativadas e pertencentes a projeto/cliente inativo não entram.
- Responsável inativo ou sem acesso continua seguindo a regra atual de fallback para ADMIN.
- Sem destinatário com canal ativo ou se os dois canais estiverem desligados: zero entregas; job ainda registra sua execução.
- Duplicação do mesmo job no dia: não criar segunda notificação e não contar dedupe como entrega nova.
- Falha de banco/job: registrar falha e horário, responder erro HTTP apropriado; não substituir a última contagem de sucesso por uma contagem enganosa.
- Não houve execução ainda: exibir “Ainda não executado”.
- O cron não será ativado por este agente; a tela só indica sucesso real quando a execução vier do agendamento/chamada válida.

## 7. Interface

- Na página `/notificacoes`, acrescentar uma seção compacta “Último envio de prazos”, com estado, data/hora formatada em UTC conforme padrão do repositório, e-mails enviados e avisos in-app criados; incluir estado vazio e falha resumida. O horário de agenda permanece 08:00 em `America/Sao_Paulo`.
- Reaproveitar os tokens, tipografia e bordas existentes conforme `docs/Identidade_Visual_Multiplus.md` e o PDD de Projetos/Tarefas. Sem cores fixas ou sombra nova.
- A seção deve funcionar em 375 px e no desktop; conferir ambos após a implementação.

## 8. Plano de testes

- Integração: antecedência própria menor/maior que a global, fallback global, prazo no limite do dia, cancelada e repetição do job não duplica canais nem contagens.
- Integração da role `multiplus_app`: não lê registros internos de idempotência.
- Integração: sucesso/falha registra estado, horário e métricas; preferências e canais desligados não contam como entrega.
- Integração da rota: 401 sem bearer válido; chamada autorizada retorna resumo do job.
- Verificação final completa conforme AGENTS.md (`npx prisma generate`, typecheck, lint e `npm test`).
- Verificação visual da página em 375 px e desktop.

## 9. Perguntas em aberto

1. **Observabilidade:** **Aprovada em 2026-10-01** — persistir e exibir em `/notificacoes` última execução, estado e contagens por canal, além do log estruturado.
2. **Horário do cron:** **Aprovado em 2026-10-01** — diário às 08:00 em `America/Sao_Paulo`.
3. **Ativação na VPS:** conforme AGENTS.md, o agente não pode escrever no crontab via SSH. Após deploy, o usuário aplicará a linha de cron documentada; confirmação de ativação será necessária para remover L1 da documentação.
