# Agenda

- **Última revisão:** 2026-09-29, no commit `fe1b5b4` do `staging`.
- **Requisitos:** RF-036; ADR-009.
- **Módulos relacionados:** Tarefas.

## Visão geral

A **Agenda** é um calendário mensal com os prazos de todas as tarefas. Ela mostra também
as **próximas ocorrências** de tarefas recorrentes que ainda não existem, calculadas na
hora, para a Administradora planejar o mês.

## Quem pode fazer o quê

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Ver a agenda | Sim | Não | Não | Não |

---

## Funcionalidades

### G1. Calendário mensal de prazos (RF-036)

**Como funciona.**
- **Navegação:** mês anterior e próximo mês, com o dia de hoje destacado.
- **Tipos de item:** prazo normal, atrasado (vermelho terra), visita/reunião e ocorrência
  projetada (fundo azul claro com borda tracejada).
- **Filtros:** por cliente, por projeto e "Só visitas/reuniões".
- **Mês vazio:** a tela avisa que não há prazos no mês.

**Detalhes técnicos.**
- **Rota:** `/agenda?mes=&cliente=&projeto=&visitas=1`.
- **Função:** `listarItensAgenda` (`src/lib/projetos-tarefas.ts`), que reaproveita
  `listarPrazos`: tarefas ativas de projetos ativos, em todos os status.

### G2. Ocorrências projetadas (ADR-009)

**Como funciona.**
- **O que é:** para tarefas recorrentes, a agenda mostra as ocorrências futuras que ainda
  não foram criadas.
- **Quando vira real:** a ocorrência só é criada de fato quando a anterior é concluída
  (ver T5 em `tarefas.md`).

**Detalhes técnicos.**
- **Função:** `projetarOcorrenciasFuturas` (`src/lib/regras-projetos-tarefas.ts`). Calcula
  em memória, sem gravar, e não duplica ocorrências que já existem.
- **O que não é projetado:** série cancelada, desativada ou encerrada.
- **Teste:** `projetos-tarefas.unit.test.ts`, no bloco "ADR-009 — projeção da Agenda",
  com 4 casos.

---

## Limitações e pendências conhecidas

| # | Situação | Efeito |
|---|---|---|
| L1 | Itens com o mesmo projeto, nome e data são unificados na tela. | Duas tarefas distintas com o mesmo nome e prazo no mesmo projeto aparecem como uma só. |
| L2 | A agenda mostra só tarefas. | Prazos de subtarefas não aparecem. |

## Histórico de alterações

| Data | Commit | Alteração |
|---|---|---|
| 2026-09-17 | `ddec7eb` | Agenda mensal com ocorrências projetadas (Sprint 4B) |
| 2026-09-28 | `9969bff` | Projeção semanal respeita o dia da semana escolhido |
| 2026-09-29 | `d731f79` | Atrasados e ocorrências projetadas voltam a ter cor (tokens inexistentes corrigidos) |
| 2026-09-30 | `8aa5ba1` | RF-036 formalizado no SRS v2.5; escopo atual mantém a Agenda limitada a tarefas |
