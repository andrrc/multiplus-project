# TAREFA etapa2-analise — Análise da etapa 2 dos comprovantes (o prazo para durante a conferência)

> Tarefa só de **análise escrita**: não altera código, banco nem testes. Campo sem resposta fica como **pendente de validação**.

| Campo | Valor |
|---|---|
| **ID** | `etapa2-analise` |
| **Agente responsável** | claude |
| **Branch** | `claude/etapa2-analise` (criada a partir de `origin/staging`) |
| **Worktree** | `~/multiplus-worktrees/claude-etapa2-analise` |
| **Estado** | aprovada |
| **Quem aprovou o escopo** | o usuário, em 2026-11-23, ao pedir o início da tarefa |
| **Revisor** | codex (revisão do texto e da cobertura do levantamento) |
| **Criada em** | 2026-11-23 |

## 1. Objetivo

Descrever, em uma análise aprovável, como o sistema deve **parar de contar o prazo** de uma tarefa ou subtarefa enquanto um envio de comprovante
aguarda conferência, e o que isso muda em semáforo, atrasos, agenda, portal e avisos. Nada de código nesta tarefa: o resultado é o texto que o usuário aprova antes de
a etapa 2 virar implementação.

## 2. Contexto da funcionalidade

- Respostas da cliente de 2026-11-23: o prazo **para de contar** durante a conferência, **só quando o pedido tem comprovante**; a pausa de prazo do colaborador interno é a mesma regra
  (ver `docs/decisoes-desenvolvimento.md`, linha de 2026-11-23, e a seção 10 de [../analises/comprovantes-colaborador-externo.md](../analises/comprovantes-colaborador-externo.md)).
- A etapa 1 já está pronta: envio, conferência e devolução com motivo. O prazo hoje **continua contando** durante a conferência (limitação L7 em [../funcionalidades/tarefas.md](../funcionalidades/tarefas.md)).
- Protótipo de referência: `telas-novas/cliente/00-especificacao-cliente.md` conta como em dia o item "enviado para confirmação (prazo pausado)"; as demais
  especificações em `telas-novas/` (colaborador externo e interno) devem ser lidas para achar outras menções. Os dados dos protótipos são ilustrativos.
- Esta tarefa muda dado, permissão, RLS ou regra de prazo? **Sim, a regra de prazo, mas só em texto**: a análise é justamente o passo que a aprovação exige antes do código.

## 3. Escopo

**Arquivos e módulos permitidos:**

- `docs/analises/comprovantes-etapa2-prazo.md` (novo: o entregável).
- `docs/tarefas/etapa2-analise.md` (este arquivo, para o resumo ao final).
- Leitura, sem alteração, de todo o código e das migrations.

**Arquivos e módulos proibidos:**

- Qualquer arquivo de `src/`, `prisma/`, `tests/`, `scripts/`, `ops/`, `.github/`.
- `docs/analises/planejamento-diferencas-prototipos.md` e `docs/decisoes-desenvolvimento.md` (as notas vão na seção 8 abaixo; quem integra consolida).
- Os arquivos da tarefa `duplicar-projeto`.

**Arquivos compartilhados reservados por esta tarefa:** nenhum.

## 4. Dependências

- Tarefas que precisam estar integradas antes: nenhuma.
- Tarefas que dependem desta: a implementação da etapa 2 dos comprovantes e a "pausa de prazo" do colaborador interno (ainda não criadas). Elas **só começam depois que esta análise for aprovada**.

## 5. Contratos e interfaces relevantes (para o levantamento)

O levantamento precisa achar, com `grep` e leitura, **todo lugar** onde o prazo, o atraso ou a situação do prazo são calculados ou exibidos, para a análise não esquecer nenhum. Ponto de partida (não é lista fechada):

- Regras puras: `src/lib/situacao-prazo.ts`, `src/lib/regras-projetos-tarefas.ts` (`estaAtrasada`, percentual em dia), `src/lib/datas.ts` (`calcularDiasRestantes`), `src/lib/semaforo.ts`, `src/lib/agenda-itens.ts`.
- Telas e listas: listas de Tarefas, Subtarefas, Minhas tarefas (inclusive a tela do externo), painéis (`src/lib/painel.ts`), agenda, portal (`src/lib/portal-cliente.ts`), PDFs (`src/lib/exportacao-pdf-tarefas.ts`).
- Consultas de atraso por cliente (`idsDeClientesComAtraso`, em `src/lib/clientes.ts`) e as contagens de "Com atraso".
- Avisos de prazo: o job diário (`src/app/api/jobs`, `src/lib/notificacoes.ts`, `ops/disparar-notificacoes-prazo.sh`) e as migrations que o suportam.
- Banco: funções, triggers e políticas que mencionam prazo ou atraso; o estado do pedido (`solicitacoes_conclusao`, status PENDENTE, REJEITADA, APROVADA) e o `comprovanteExigido`.
- Documentos: [../analises/semaforo-prazos-projetos-tarefas.md](../analises/semaforo-prazos-projetos-tarefas.md), [../analises/semaforo-dias-corridos.md](../analises/semaforo-dias-corridos.md), [../analises/semaforo-vermelho-so-atrasado.md](../analises/semaforo-vermelho-so-atrasado.md) e [../analises/aprovacao-conclusao-tarefas-subtarefas.md](../analises/aprovacao-conclusao-tarefas-subtarefas.md).

## 6. Critérios de aceite

- [ ] A análise enumera **cada ponto** do sistema que calcula ou mostra prazo, atraso ou situação do prazo, com arquivo e função, e diz o que muda em cada um.
- [ ] Define a regra com precisão: quando começa a pausa (envio com comprovante), quando termina (confirmação ou devolução), o que acontece com o prazo restante na devolução, e o caso do pedido **sem** comprovante (continua contando).
- [ ] Compara pelo menos duas formas de guardar a pausa (por exemplo, derivar do estado do pedido pendente versus gravar o instante e os dias pausados) com vantagens, riscos e necessidade de migration e de RLS.
- [ ] Diz como cada perfil enxerga a pausa (administração, interno, externo e cliente) sem expor dado novo ao cliente.
- [ ] Trata a recorrência (a próxima ocorrência parte do prazo original?), a agenda e o job de avisos (o aviso de véspera e o de atraso param durante a conferência?).
- [ ] Lista os testes que a implementação precisará (unitário da regra, integração com RLS por perfil, jornada) e os casos de borda (devolvido, retirado, concluído no mesmo dia, pedido de subtarefa).
- [ ] Termina com **perguntas objetivas** ao usuário e uma recomendação, no mesmo formato das outras análises de `docs/analises/`.
- [ ] Nenhum arquivo fora do escopo foi alterado (`git diff --stat origin/staging...HEAD` mostra só os dois arquivos acima).

## 7. Testes obrigatórios

- Não há código novo nem teste novo.
- Verificação final: `bash scripts/agentes/verificar.sh` (sem `--completo`) sem falhas novas, para confirmar que nada foi tocado por engano.
- Confirme que o texto não afirma comportamento que o código não tem: cada afirmação sobre o estado atual vem de um arquivo lido.

## 8. Notas para o planejamento e as decisões

(Preencher ao terminar.) Registrar em `planejamento-diferencas-prototipos.md`, Fase 2: análise da etapa 2 escrita e aguardando aprovação.

## 9. Resumo da implementação (preenchido ao terminar)

- Commits e arquivos alterados (resumo):
- Decisões tomadas durante o trabalho:
- Verificações executadas e resultado (comando e saída resumida):
- Falhas preexistentes encontradas (com o comando que as reproduz em `origin/staging`):
- Pendências e riscos:
- Pergunta em aberto para a pessoa responsável:
