# Análise: fixture temporal do teste RF-022

- **Data:** 2026-10-08
- **Pedido original:** corrigir o cenário do teste de notificações que esperava HTTP 500, mas recebia 200, e retomar a publicação.
- **Status:** aprovada em 2026-10-08

## 1. Escopo previsto

Atualizar o cenário de integração do endpoint de notificações para usar uma tarefa com prazo futuro em relação ao relógio atual. Confirmar que o mock de envio de e-mail foi chamado e que a falha simulada resulta em HTTP 500. Não alterar o comportamento do endpoint nem outras regras de notificação.

## 2. Permissões

Não se aplica: a alteração é restrita a fixture e asserções de teste; não muda acesso em runtime.

## 3. Dados

Não se aplica: não há alteração de schema, campos ou dados persistentes da aplicação.

## 4. Impacto em telas e funções existentes

Não se aplica: nenhuma tela, rota ou função de produção será alterada. O teste cobre `GET /api/jobs/notificacoes-prazo`.

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| Data fixa no passado faz o job não selecionar a tarefa e deixa o mock de falha sem uso | Calcular prazo para o próximo dia no UTC e verificar que o envio ocorreu | `notificacoes-rf022.integration.test.ts`: mock chamado e HTTP 500 |

## 6. Casos-limite e estados

Sem mudança de comportamento. O fixture usa o dia seguinte em UTC para não depender de uma data histórica fixa; a tarefa continua dentro da antecedência padrão de sete dias.

## 7. Interface

Não se aplica: nenhuma interface é alterada.

## 8. Plano de testes

- Rodar o teste de integração RF-022 isoladamente.
- Rodar `npx prisma generate`, `npm run typecheck`, `npm run lint` e `npm test` antes de publicar.

## 9. Perguntas em aberto

Não há. A correção do fixture e a retomada da publicação foram aprovadas pelo usuário em 2026-10-08.
