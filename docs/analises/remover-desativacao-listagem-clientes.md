# Análise: remover desativação da listagem de clientes

- **Data:** 2026-11-02
- **Pedido original:** “Na página de listagem de clientes, /clientes, gostaria de remover o botão de desativar cliente.”
- **Status:** aprovada em 2026-11-02

## 1. Escopo previsto
Remover o botão de desativar/reativar das apresentações móvel e desktop da listagem `/clientes`. Manter a ação na ficha `/clientes/[id]`, onde a documentação vigente descreve o controle principal. Não alterar regras de negócio, permissões, actions, RLS, nem os filtros para exibir clientes desativados.

## 2. Permissões
| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Desativar/reativar na listagem | Remover | Não se aplica: ação já não aparece | Não se aplica: ação já não aparece | Não se aplica: ação já não aparece |
| Desativar/reativar na ficha | Sim, permanece | Não | Não | Não |

A matriz deriva da permissão atual documentada em `docs/funcionalidades/clientes.md`; a mudança é apenas a localização do controle.

## 3. Dados
Não se aplica: nenhuma alteração de dados, validação, unicidade, campo sensível, migration ou backfill.

## 4. Impacto em telas e funções existentes
- `src/app/(painel)/clientes/page.tsx`: retirar `BotaoDesativarCliente` do cartão móvel e da tabela desktop e remover o import se não houver outro uso.
- `src/app/(painel)/clientes/[id]/page.tsx`: manter o controle de desativação/reativação na ficha.
- `src/app/(painel)/clientes/[id]/acoes-cliente.tsx`: manter componente e action; não há motivo para alterar a lógica compartilhada.
- `src/lib/clientes.ts` e RLS: sem alteração prevista.

## 5. Riscos e segurança
| Risco | Mitigação | Teste que cobre |
|---|---|---|
| A remoção visual também remover inadvertidamente a operação de desativar | Manter botão da ficha e action protegida para ADMIN | Regressão `soft-delete-rf039.integration.test.ts` e smoke de desativar/reativar cliente |
| Botão continuar disponível em uma das versões responsivas | Remover e revisar os dois usos na rota | Verificação da listagem em viewport móvel e desktop |
| Remoção reduzir acesso administrativo à operação | Confirmar que a ficha continua oferecendo desativar e reativar | Smoke do fluxo de cliente |

## 6. Casos-limite e estados
Cliente ativo e desativado na listagem; ambos continuam acessíveis por detalhe conforme regras vigentes. A listagem mantém o toggle de registros desativados para ADMIN. A ação permanece na ficha para cada estado.

## 7. Interface
A listagem móvel e a tabela desktop deixam de exibir a ação e sua coluna/área correspondente, ajustando o cabeçalho e layout sem espaço vazio. Manter tokens, tipografia e responsividade existentes; conferir em 375 px e desktop.

## 8. Plano de testes
- Executar regressões existentes de desativação/reativação (`soft-delete-rf039.integration.test.ts` e smoke de administração/acesso).
- Executar suíte completa exigida pelo repositório antes do push.
- Conferir visualmente a listagem em 375 px e desktop e verificar que a ficha ainda apresenta o controle.

## 9. Perguntas em aberto
1. Nenhuma. O pedido especifica retirar o botão da listagem; a ação continua acessível na ficha do cliente, conforme comportamento documentado. **Resposta:** aguardando aprovação desta análise.
