# Análise: as subtarefas da próxima ocorrência quando o prazo da tarefa foi prorrogado

> Estado: **aprovada pelo usuário em 2026-11-24 e implementada** (a recomendação da pergunta 1, manter a herança da prorrogação da própria subtarefa, vale). Mexe em regra de prazo da recorrência (função SQL `concluir_tarefa`). Origem: achado 2 da [revisão da etapa 3](../tarefas/revisao-etapa3-pedido-prazo.md); a decisão de seguir a recomendação foi tomada em 2026-11-24.

## 1. O problema

Ao concluir uma tarefa recorrente, `concluir_tarefa` cria a próxima ocorrência e **copia as subtarefas**. O prazo de cada cópia é:

    próximo prazo da tarefa + (prazo da subtarefa − prazo atual da tarefa)

Ou seja, mede a distância da subtarefa até o **prazo atual** da tarefa. Isso só dá o resultado esperado quando o prazo atual é a data da série. Com a prorrogação aprovada (etapa 3), ou com o prazo editado pela administração, o prazo atual se afasta da série e a distância cresce.

**Exemplo.** Tarefa mensal, prazo 10/01, subtarefa em 05/01 (cinco dias antes). O prazo é prorrogado para 20/01 e a tarefa é concluída. A próxima ocorrência é 10/02 (a série não muda). A subtarefa copiada vai para 10/02 − 15 dias = **26/01**, antes de a ocorrência de fevereiro começar. O esperado é **05/02**.

Já acontecia quando a administração editava o prazo da tarefa; a etapa 3 passa a provocar o caso no fluxo normal.

## 2. Proposta (recomendação já escolhida pelo usuário)

Medir a distância da subtarefa até a **data da série** da ocorrência atual, e não até o prazo vigente.

- **Data da série da ocorrência atual:** a maior data da série (âncora `prazoOriginal`, periodicidade e dia da semana) que não passa do prazo atual. É a mesma ideia já usada em `calcularProximaOcorrencia` depois da correção de 2026-11-24, então nasce uma função irmã no mesmo arquivo (`src/lib/regras-projetos-tarefas.ts`).
- **Quem calcula:** o TypeScript, como já faz com o próximo prazo, e passa o resultado a `concluir_tarefa` num parâmetro novo (`p_prazo_serie`, opcional). Sem o parâmetro, a função mantém a conta atual (prazo atual), então nenhuma chamada antiga muda de resultado.
- **Onde a conta muda:** só no cálculo do prazo das subtarefas copiadas. O prazo da próxima ocorrência da tarefa, a âncora, o dia da semana e o restante da cópia ficam como estão.
- **Resultado quando o prazo atual é a data da série** (o caso comum): idêntico ao de hoje.
- **Semanal sem dia fixo** (só dado antigo): não há série para medir; continua usando o prazo atual.

## 3. Impacto

| Item | Muda? |
|---|---|
| Migration | Uma, nova: redefine `concluir_tarefa` a partir do corpo de `20261117120000_comprovantes_etapa1` (a mais recente que a define), com o parâmetro opcional. RLS e `GRANT` iguais; a assinatura ganha um argumento com valor padrão, então o `GRANT` precisa ser refeito para a assinatura nova. |
| Código | `regras-projetos-tarefas.ts` (função nova) e as duas chamadas de `concluir_tarefa` em `projetos-tarefas.ts` (`decidirSolicitacaoConclusao` e `concluirTarefa`). |
| Permissão | Nenhuma. |
| Dados existentes | Nenhum é alterado; vale só para conclusões futuras. |
| Testes | Unitário da função nova (todas as âncoras, como na grade de `calcularProximaOcorrencia`) e integração: tarefa prorrogada e concluída gera a subtarefa em 05/02, e sem prorrogação o resultado é o de hoje. |

## 4. Fora desta proposta

- **O prazo da própria subtarefa prorrogado.** Se a subtarefa foi prorrogada (ou editada) nesta ocorrência, a cópia continua herdando essa distância. Não dá para saber se a edição era pontual ou permanente. **Pendente de validação** (pergunta única abaixo); a recomendação é manter como está.
- O pedido de prazo da subtarefa não muda a série da tarefa, e isso continua assim.

## 5. Pergunta em aberto

1. **A subtarefa prorrogada passa a prorrogação para a próxima ocorrência?** **Recomendação:** sim, mantém como está hoje (a cópia herda a distância atual da subtarefa), porque o sistema não distingue edição pontual de permanente; se a Talita quiser que a prorrogação valha só para a ocorrência atual, vira uma tarefa própria.

## 6. Aprovação

Aprovar este texto libera a tarefa (um commit de migration, um de código e um de testes, com a documentação em `docs/funcionalidades/tarefas.md` e `subtarefas.md`).
