# Análise: atraso no fuso de São Paulo e lista de subtarefas sem cor de fundo

- **Data:** 2026-10-15
- **Pedido original:** "Alinha o horário do estaAtrasada com o do semáforo. E a Talita solicitou que não tivesse nenhuma cor de fundo para o container independete da ocasião"
- **Status:** aprovada em 2026-10-15

## 1. Escopo previsto

### Parte A — `estaAtrasada` no mesmo "hoje" do semáforo

**Problema.** `estaAtrasada` (`src/lib/regras-projetos-tarefas.ts`) compara a data do prazo com a
data de hoje **em UTC**. O semáforo (`calcularDiasRestantes`, em `src/ui/indicador-dias-restantes.tsx`)
usa a data de hoje **em `America/Sao_Paulo`**. Das 21h à meia-noite de Brasília, o UTC já está no dia
seguinte. Nesse intervalo, um item que vence hoje:

- tem a linha marcada como atrasada em `/subtarefas` e na agenda;
- sai do "% em dia";
- tem o semáforo em âmbar, "Vence hoje".

**Correção.**
1. A função que calcula "hoje em São Paulo" (`dataLocalHoje`, hoje privada no indicador) vai para
   `src/lib/datas.ts`, exportada como `dataDeHojeEmSaoPaulo(agora)`. O indicador passa a importá-la,
   sem mudança de comportamento.
2. `estaAtrasada(prazo, concluida, agora)` passa a comparar a data do prazo (em UTC, como hoje,
   porque o prazo é gravado à meia-noite UTC) com `dataDeHojeEmSaoPaulo(agora)`.
3. A regra RN-001 continua a mesma: o dia do prazo ainda está em dia, e o atraso começa no dia
   seguinte, agora no horário de Brasília.

**Quem usa `estaAtrasada`** (tudo passa a seguir o horário de Brasília):

| Uso | Arquivo |
|---|---|
| Destaque de linha atrasada na lista de subtarefas | `src/app/(painel)/subtarefas/page.tsx` |
| Itens atrasados na agenda | `src/app/(painel)/agenda/page.tsx` |
| "% em dia" de projetos e tarefas (RF-009) | `calcularPercentualEmDia`, usado em `src/lib/projetos-tarefas.ts` |

**Fora desta parte:** o job de aviso de prazo (`dispararPrazoProximo`) também calcula o "hoje" em
UTC. Ele roda uma vez por dia pelo cron; o efeito depende do horário do cron na VPS. Fica registrado
como limitação, para tratar à parte se for o caso.

### Parte B — Lista de subtarefas sem cor de fundo

**Como é hoje** (`src/app/(painel)/subtarefas/page.tsx`):

| Onde | Situação | Estilo atual |
|---|---|---|
| Tabela (desktop) | Atrasada | Fundo `bg-critico-cl` + borda esquerda vermelha de 3 px |
| Tabela (desktop) | Demais, ao passar o mouse | Fundo `hover:bg-verde-cl` |
| Cartão (celular) | Qualquer | Fundo branco (`bg-branco`) + borda esquerda vermelha (atrasada) ou azul |

**Correção aprovada** (ver respostas na seção 9). Nenhuma cor de fundo nas linhas das tabelas de
`/subtarefas`, `/projetos` e `/tarefas`, em nenhuma situação:

- `/subtarefas`: a linha perde `bg-critico-cl`, a borda esquerda vermelha e `hover:bg-verde-cl`; o
  cartão do celular continua branco, com a borda esquerda azul também quando atrasado;
- `/projetos`: a linha perde `hover:bg-verde-cl`, `bg-branco` e `bg-papel` (desativado);
- `/tarefas`: a linha perde `hover:bg-verde-cl`.

O atraso continua visível pelo semáforo (caixa vermelha sólida "Atrasado N dias") e pela etiqueta
de status.

## 2. Permissões

Não se aplica: nenhuma consulta, regra de acesso ou dado exibido muda.

## 3. Dados

Não se aplica: sem migration. Os prazos continuam gravados como data à meia-noite UTC.

## 4. Impacto em telas e funções existentes

| Arquivo | Mudança |
|---|---|
| `src/lib/datas.ts` | **Novo**: `dataDeHojeEmSaoPaulo` |
| `src/ui/indicador-dias-restantes.tsx` | Importa a função em vez de ter a própria cópia |
| `src/lib/regras-projetos-tarefas.ts` | `estaAtrasada` usa a data de São Paulo |
| `src/app/(painel)/subtarefas/page.tsx` | Classes de fundo da linha e do cartão |
| Telas afetadas sem mudança de código | `/agenda`; telas que mostram "% em dia" (`projetos/[id]`, `meus-projetos`, `tarefas/[id]`) |
| Testes | `tests/unit/projetos-tarefas.unit.test.ts`: os casos de `estaAtrasada` e `calcularPercentualEmDia` passam "hoje" como meia-noite UTC, que em Brasília ainda é o dia anterior. Eles serão ajustados para um horário do meio do dia, mantendo as mesmas expectativas. |
| Documentação | `docs/funcionalidades/subtarefas.md`, `tarefas.md` (indicador "% em dia"), `agenda.md`, `docs/decisoes-desenvolvimento.md` |

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| Datas deslocadas por fuso | Uma única função de "hoje em São Paulo", usada pelo semáforo e pelo atraso | Unitário: às 23h30 de Brasília (02h30 UTC do dia seguinte), o item que vence hoje **não** está atrasado; à 00h30 de Brasília do dia seguinte, está |
| Semáforo e linha discordarem | Mesma função nos dois | Unitário: para o mesmo instante, `estaAtrasada` é verdadeiro exatamente quando `calcularDiasRestantes < 0` |
| "% em dia" mudar perto da meia-noite | É o comportamento desejado; o dia do prazo ainda conta em dia | Unitário de `calcularPercentualEmDia` com instante noturno |
| Teste antigo dependente de meia-noite UTC | Ajustar o horário de "hoje" nos testes, sem afrouxar as asserções | Suíte completa |
| Atraso deixar de ser percebido sem o fundo | O semáforo vermelho sólido continua na linha | Conferência visual |
| Autorização, IDOR, dado sensível, e-mail | Não se aplica | — |

## 6. Casos-limite e estados

- Prazo hoje às 23h59 de Brasília: em dia (âmbar, "Vence hoje"), sem destaque de atraso.
- Prazo ontem: atrasado nas duas regras.
- Sem prazo, concluída ou cancelada: nunca atrasada (sem mudança).
- Lista vazia e filtros: sem mudança.

## 7. Interface

- `/subtarefas` em desktop e em 375 px: sem fundo colorido nas linhas e nos cartões.
- Vou conferir em 375 px e no desktop, se houver acesso de login.

## 8. Plano de testes

- **Unitário:**
  - `tests/unit/projetos-tarefas.unit.test.ts`: casos de fuso de `estaAtrasada` e de
    `calcularPercentualEmDia`; ajuste do "hoje" nos casos existentes.
  - Novo `tests/unit/datas.unit.test.ts`: `dataDeHojeEmSaoPaulo` perto da meia-noite.
  - `tests/unit/indicador-dias-restantes.unit.test.ts`: continua passando sem mudança.
- **Integração:** não se aplica (nenhuma consulta muda).
- **Verificação completa:** `npx prisma generate`, `npm run typecheck`, `npm run lint`, `npm test`.

## 9. Perguntas em aberto

1. **Borda esquerda vermelha** da subtarefa atrasada (3 px na tabela e no cartão): ela não é
   fundo. Mantenho (proposta) ou tiro também? — **Resposta (2026-10-15):** remover. A linha da
   tabela fica só com a divisória superior; o cartão do celular fica com a borda esquerda azul,
   igual aos demais.
2. **Abrangência do "sem fundo":** só a lista de `/subtarefas` (proposta, onde a Talita pediu) ou
   também as outras listas que mudam de fundo ao passar o mouse (`/projetos`, `/tarefas`,
   `/clientes`, `/minhas-tarefas`, `/meus-clientes`, `/meus-projetos/[id]`) e os dias atrasados da
   agenda? — **Resposta (2026-10-15):** `/subtarefas`, `/projetos` e `/tarefas`. Em `/projetos`
   saem também o branco das linhas e o cinza (`bg-papel`) das linhas de projeto desativado; o
   estado continua indicado pelo texto "Desativado" no semáforo. As demais listas e a agenda ficam
   como estão.
3. **Cartão no celular:** hoje é branco sobre o fundo da página. Fica transparente (proposta,
   seguindo o "nenhuma cor de fundo") ou o branco do cartão é aceitável? — **Resposta
   (2026-10-15):** branco, sem mudança.

**Ajuste posterior (2026-10-15):** a Talita aceita destaque **ao passar o mouse**, sem verde.
As linhas das tabelas de `/subtarefas`, `/projetos` e `/tarefas` ficam brancas (`bg-branco`) e
passam a cinza-papel (`hover:bg-papel`) ao passar o mouse. Como o fundo da página já é papel, a
linha precisa ser branca para o hover aparecer. Continua não havendo cor de fundo por situação
(atrasada, desativada).
