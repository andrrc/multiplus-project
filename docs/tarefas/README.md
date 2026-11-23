# Tarefas dos agentes

Esta pasta guarda o que Claude Code e Codex precisam para trabalhar em paralelo sem se atrapalhar: o registro das tarefas em andamento,
o modelo de tarefa e o modelo de relatório de revisão. O protocolo completo está em
[../colaboracao-multiagente.md](../colaboracao-multiagente.md).

## Como usar

1. Copie [MODELO-DE-TAREFA.md](MODELO-DE-TAREFA.md) para `docs/tarefas/<id>.md` (o id é o mesmo da branch: `claude/<id>` ou `codex/<id>`).
2. Preencha escopo, arquivos permitidos e proibidos, dependências e critérios de aceite. Uma tarefa sem isso não começa.
3. Registre a tarefa na tabela abaixo, **inclusive os arquivos compartilhados que ela reserva** (lista na seção 7 do protocolo).
4. Crie o ambiente: `bash scripts/agentes/novo-worktree.sh <claude|codex> <id>`.
5. Ao terminar, o agente preenche o "Resumo da implementação" no arquivo da tarefa e a pessoa atualiza o estado aqui.

O registro é de propósito simples: uma linha por tarefa. Quem integra o atualiza no merge para a `staging`, e quem cria uma tarefa nova
confere antes, em `origin/staging`, se o arquivo compartilhado que precisa já não foi reservado por outra tarefa.

## Estados

`proposta` (escrita, ainda sem aprovação) → `aprovada` → `em andamento` → `em revisão` → `integrada` ou `cancelada`.

## Tarefas em andamento

| ID | Título | Agente | Branch | Estado | Arquivos compartilhados reservados | Revisor | Atualizado em |
|---|---|---|---|---|---|---|---|
| [etapa2-analise](etapa2-analise.md) | Análise da etapa 2 dos comprovantes (o prazo para durante a conferência) | claude | `claude/etapa2-analise` | proposta | nenhum | codex | 2026-11-23 |
| [duplicar-projeto](duplicar-projeto.md) | Duplicar projeto | codex | `codex/duplicar-projeto` | proposta | nenhum | claude | 2026-11-23 |

## Tarefas encerradas

Depois do merge, a linha sai da tabela acima e vai para esta, só com ID, título, agente, data e número do Pull Request.

| ID | Título | Agente | Integrada em | Pull Request |
|---|---|---|---|---|
| — | — | — | — | — |
