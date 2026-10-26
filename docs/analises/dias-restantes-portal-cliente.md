# Análise: dias restantes no portal do cliente

- **Data:** 2026-10-26
- **Pedido original:** “Adicionar um campo na visualização do cliente, Adicionar \"dias restantes\"”
- **Status:** aprovada em 2026-10-26

## 1. Escopo previsto

Adicionar a informação derivada **Dias restantes** para o prazo de conclusão previsto do projeto no portal do cliente, sem alterar o prazo, o progresso ou as regras de negócio do projeto.

Proposta de exibição:

- No cartão de cada projeto em `/portal`, junto à conclusão prevista e ao progresso.
- No resumo do projeto em `/portal/[id]`, junto à conclusão prevista.
- Reaproveitar `IndicadorSemaforoProjeto` e `calcularDiasRestantes`, já usados nas telas internas, preservando os estados existentes: “N dias”, “Vence hoje”, “Atrasado N dias”, “Sem prazo”, “Concluído” e “Cancelado”. A contagem segue o dia civil de São Paulo e os limites de semáforo já configurados.
- Continuar exibindo apenas projetos que o cliente autenticado já pode consultar. Não incluir outras informações nem ampliar o acesso aos dados.

Ficam fora: edição do prazo, mudança no cálculo de progresso, alteração de permissões, novos campos no banco ou mudanças nas telas internas.

## 2. Permissões

Não há mudança nas permissões. A informação só será calculada a partir do prazo e do status do projeto já disponibilizados ao usuário autorizado pelo portal.

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Ver dias restantes no portal | Não se aplica ao portal do cliente | Não se aplica ao portal do cliente | Não se aplica ao portal do cliente | Sim, somente nos próprios projetos ativos já visíveis no portal |

## 3. Dados

- **Dados usados:** `dataPrevistaConclusao` e `status` do projeto, já selecionados para as telas do portal.
- **Campo apresentado:** valor derivado de calendário; nenhum novo dado persistido.
- **Validação/unicidade:** não se aplica, pois não há entrada ou gravação de dados.
- **Dados sensíveis:** não se aplica; nenhum campo adicional será consultado ou enviado.
- **Migration e backfill:** não se aplicam.
- **Datas:** reutilizar `calcularDiasRestantes`, que considera o dia atual em São Paulo, evitando divergência de fuso.

## 4. Impacto em telas e funções existentes

- `src/app/(painel)/portal/page.tsx`: cartões dos projetos do cliente, com progresso e conclusão prevista.
- `src/app/(painel)/portal/[id]/page.tsx`: resumo do projeto do cliente, com progresso, início e conclusão prevista.
- `src/ui/indicador-dias-restantes.tsx`: componente e cálculo já existentes a reaproveitar.
- `src/lib/portal-cliente.ts`: funções existentes já incluem o prazo e o status do projeto; confirmar os campos consumidos pelas duas telas durante a implementação.
- `tests/unit/indicador-dias-restantes.unit.test.ts`: testes existentes do cálculo e dos estados do indicador.
- `tests/integration/portal-cliente-sprint6.integration.test.ts`: testes existentes do acesso restrito aos projetos vinculados ao cliente.

Referências de produto: `docs/SRS_Multiplus_Software_v1.0.md` (RF-012 e RF-050), `docs/funcionalidades/area-exclusiva-cliente.md` e `docs/analises/area-exclusiva-cliente-sprint-6.md`. Não foi localizado um PDD dedicado ao portal do cliente.

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| Contagem incorreta perto da virada do dia ou por fuso | Reutilizar cálculo com data de hoje em São Paulo e cobrir limites de data | Testes unitários de `calcularDiasRestantes` para prazo futuro, hoje e passado |
| Prazo nulo ou projeto concluído/cancelado mostrar contagem enganosa | Reutilizar os estados atuais do indicador para sem prazo e status final | Testes unitários dos estados sem prazo, concluído e cancelado |
| Cliente acessar prazo de projeto de outro cliente | Preservar a busca vinculada à identidade do usuário e a proteção atual da rota | Teste de integração do portal para projeto sem vínculo/IDOR |
| Adicionar informação a um cartão sem dados necessários na consulta | Usar somente prazo e status já retornados pelo portal; confirmar o payload e não incluir campos adicionais | Testes de integração existentes e verificação de payload do portal |

## 6. Casos-limite e estados

- Projeto sem conclusão prevista: mostrar “Sem prazo”.
- Prazo no dia atual: mostrar “Vence hoje”.
- Prazo passado em projeto ainda ativo: mostrar “Atrasado N dias”.
- Projeto concluído ou cancelado: preservar os rótulos de estado atuais do indicador.
- Projeto desativado ou não vinculado ao cliente: permanece fora do portal conforme o comportamento atual.
- Celular: manter os cartões e o resumo em uma coluna, sem criar rolagem horizontal.
- Concorrência e paginação: não se aplicam; não há edição ou nova listagem nesta mudança.

## 7. Interface

Exibir o rótulo “Dias restantes” próximo à conclusão prevista, tanto no cartão da lista quanto no resumo detalhado, caso essa proposta seja aprovada. Reaproveitar o indicador e as cores semafóricas existentes, sem criar tokens ou estilos novos. Conferir a tela em 375 px e em desktop após a implementação. A documentação de identidade visual e a análise Sprint 6 do portal são as referências, pois não há PDD específico do portal.

## 8. Plano de testes

- Unitários: reutilizar e, se necessário, complementar `tests/unit/indicador-dias-restantes.unit.test.ts` para estados e limites de data relevantes.
- Integração: validar que o portal continua limitado aos projetos ativos vinculados ao cliente e que prazo/status necessários são retornados sem expor dados adicionais; complementar `tests/integration/portal-cliente-sprint6.integration.test.ts` se necessário.
- Smoke: não se aplica; não há alteração em autenticação ou fluxo crítico de acesso.
- Verificação completa antes da publicação: `npx prisma generate`, `npm run typecheck`, `npm run lint` e `npm test`.

## 9. Perguntas em aberto

1. Aprova mostrar “Dias restantes” tanto na lista `/portal` quanto no detalhe `/portal/[id]`, usando os estados e a contagem civil de São Paulo descritos acima? — **Resposta:** sim, aprovada em 2026-10-26.
