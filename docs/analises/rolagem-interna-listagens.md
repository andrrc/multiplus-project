# Análise: rolagem interna nas listagens

- **Data:** 2026-10-30
- **Pedido original:** “dentro dos containers de listagem de /clientes, /projetos, /tarefas, /subtarefas. Deveriamos ter uma altura fixa porque se tivermos muito itens na lista vamos ter que descer tudo a página somente para utilizar o scroll horizontal.”
- **Status:** aprovada em 2026-10-30

## 1. Escopo previsto
Definir uma altura máxima adaptável à janela para tabelas em desktop, habilitar rolagem vertical e horizontal no mesmo contêiner e fixar o cabeçalho. Listas curtas usam apenas a altura necessária. Cartões móveis preservam rolagem normal da página. Sem paginação, mudança de dados ou regra de negócio.

## 2. Permissões
Não se aplica: não muda dados, queries ou permissões; controles e resultados existentes permanecem iguais.

## 3. Dados
Não se aplica: sem alteração de schema, validação, dados sensíveis, migration ou backfill.

## 4. Impacto em telas e funções existentes
- `/clientes`: tabela própria em `src/app/(painel)/clientes/page.tsx`, será envolvida no contêiner compartilhado.
- `/projetos`, `/tarefas`, `/subtarefas`: já usam `src/ui/rolagem-horizontal.tsx`; tabela e cabeçalho receberão limites de altura e posicionamento fixo.
- `docs/funcionalidades/clientes.md`, `projetos.md`, `tarefas.md`, `subtarefas.md` e índice `docs/decisoes-desenvolvimento.md` serão atualizados.

## 5. Riscos e segurança
| Risco | Mitigação | Teste que cobre |
|---|---|---|
| Cabeçalho fixo perde fundo ou fica atrás das linhas | Fundo tinta e z-index no cabeçalho | Inspeção nas quatro tabelas com rolagem vertical e horizontal |
| Listas curtas ganham espaço vazio ou rolagem desnecessária | Aplicar max-height, sem altura mínima fixa | Verificar lista curta e longa |
| Dispositivo estreito fica com dupla rolagem | Aplicar contêiner somente à tabela desktop; manter cartões móveis | Verificar 375 px e ausência de overflow da página |
| Rolagem horizontal anterior deixa de funcionar | Preservar overflow-x e aviso acessível compartilhado | Verificar foco de teclado, aviso e scroll horizontal |

## 6. Casos-limite e estados
Uma linha, lista acima da altura máxima, nenhum resultado, viewport baixo, conteúdo largo e tabela sem overflow horizontal. Em mobile, cartões continuam no fluxo da página.

## 7. Interface
Usar altura máxima calculada a partir da viewport com margem para título e filtros; testar em desktop e largura de 375 px. Cabeçalho permanece visível enquanto as linhas rolam.

## 8. Plano de testes
Conferir build/typecheck e lint, além de verificar visualmente as quatro listagens em viewport desktop, viewport baixo e 375 px; verificar os eixos de rolagem e cabeçalho fixo.

## 9. Perguntas em aberto
1. Aprovar altura máxima adaptável, rolagem vertical dentro da tabela e cabeçalho fixo, preservando cartões móveis? — **Resposta:** aprovado em 2026-10-30.
