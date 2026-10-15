# Análise: semáforo de prazo em dias corridos

- **Data:** 2026-10-15
- **Pedido original:** "Hoje o projeto contabiliza alguns prazos, baseado em dias úteis, mas a Talita pediu dias corridos"
- **Status:** aprovada em 2026-10-15

## 1. Escopo previsto

### O que conta em dias úteis hoje

Busca por `úteis`, `getUTCDay`, `calcularDias*` e `IndicadorSemaforoProjeto` em `src/`, `tests/` e
`prisma/`. **O único cálculo em dias úteis do sistema é o semáforo de prazo** (RF-009):

- `calcularDiasUteisRestantes` em `src/ui/indicador-dias-restantes.tsx` pula sábados e domingos;
- `IndicadorSemaforoProjeto` usa esse número para a cor (limites globais de `/notificacoes`) e para
  o texto ("4 dias úteis", "Atrasado 2 dias úteis", "Prazo no fim de semana").

O semáforo aparece em projetos, tarefas e subtarefas, nas telas de ADMIN e de colaborador.

### O que já está em dias corridos e não muda

| Regra | Onde | Situação |
|---|---|---|
| Antecedência do aviso de prazo por e-mail/in-app | `src/lib/notificacoes.ts` (`setUTCDate(+dias)`) | Já em dias corridos |
| Recorrência (diária, semanal, mensal…) | `src/lib/regras-projetos-tarefas.ts` | Calendário, sem relação com dias úteis |
| "% em dia" e "atrasada" | prazo `<` hoje | Não conta dias |
| Agenda | calendário mensal | Não conta dias |

### O que entra

1. O semáforo passa a contar **dias corridos** entre hoje (fuso `America/Sao_Paulo`) e o prazo,
   usando a função `calcularDiasRestantes`, que já existe no mesmo arquivo.
2. Textos do indicador: "4 dias", "1 dia", "Vence hoje", "Atrasado 3 dias".
3. O rótulo "Prazo no fim de semana" deixa de existir: um prazo no sábado passa a mostrar "1 dia"
   ou "2 dias", como qualquer outro dia.
4. A tela `/notificacoes` passa a dizer "Vermelho até (dias)" e "Amarelo até (dias)", e o texto
   explicativo passa a dizer "dias corridos".
5. Remoção de `calcularDiasUteisRestantes`, que fica sem uso.
6. Atualização do SRS (RF-009) e da documentação dos módulos.

### O que fica de fora

- Feriados: continuam sem tratamento, e em dias corridos isso deixa de importar.
- Notificação de prazo, recorrência, agenda e "% em dia": já são em dias corridos ou não contam dias.
- `IndicadorDiasRestantes`, que já calcula dias corridos mas não é usado em nenhuma tela. Ele pode ser
  removido junto, se o usuário preferir (pergunta 4).

## 2. Permissões

Não muda. Quem vê o semáforo continua vendo, e só o ADMIN altera os limites.

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Ver semáforo | Sim | Sim (projetos/tarefas atribuídos) | Sim (tarefas atribuídas) | Não (o portal mostra outros indicadores) |
| Alterar limites | Sim | Não | Não | Não |

## 3. Dados

- Tabela `configuracoes_semaforo` (singleton, `diasVermelhoAte`/`diasAmareloAte`, padrão 5 e 10).
- **Sem migration se os números forem mantidos.** Eles passam apenas a ser lidos como dias corridos.
- **Efeito nos números atuais:** 5 dias corridos é menos tempo que 5 dias úteis (cerca de 7 corridos).
  Mantendo 5/10, a faixa vermelha e a amarela ficam mais curtas e mais itens aparecem verdes. Para
  manter a mesma sensação de urgência, os equivalentes aproximados seriam **7/14**. Mudar o padrão
  exige migration nova (`@default` no schema e `UPDATE` da linha `id = 1`, só se ela ainda estiver em
  5/10), e a decisão é da Talita (pergunta 1).
- Validação (0 a 365, vermelho < amarelo) continua igual.

## 4. Impacto em telas e funções existentes

| Arquivo | Mudança |
|---|---|
| `src/ui/indicador-dias-restantes.tsx` | Cálculo e textos do `IndicadorSemaforoProjeto`; remover `calcularDiasUteisRestantes` |
| `src/app/(painel)/notificacoes/page.tsx` | Rótulos "(dias úteis)" → "(dias)" e texto explicativo |
| Telas que usam o indicador (sem mudança de código) | `projetos/page.tsx`, `projetos/[id]/page.tsx`, `tarefas/page.tsx`, `tarefas/[id]/page.tsx`, `subtarefas/page.tsx`, `meus-projetos/page.tsx`, `meus-projetos/[id]/page.tsx`, `minhas-tarefas/page.tsx`, `minhas-tarefas/[id]/page.tsx` |
| `tests/unit/indicador-dias-restantes.unit.test.ts` | Expectativas reescritas para dias corridos |
| Documentação | SRS RF-009/critério de aceite; `docs/funcionalidades/projetos.md` (seção do semáforo e limitação L1), `tarefas.md` (T11), `subtarefas.md` (S5), `notificacoes.md`; `docs/architecture-multiplus-software.md` (linha 763); `docs/decisoes-desenvolvimento.md` |

**Alteração local em andamento no mesmo arquivo.** `src/ui/indicador-dias-restantes.tsx` e os
quatro documentos acima já têm uma mudança não commitada, que não é desta tarefa: o prazo vencido
passa a usar caixa vermelha sólida com texto branco ("pendente de commit"). As duas mudanças mexem
nas mesmas linhas (pergunta 3).

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| Datas deslocadas por fuso (prazo salvo em UTC à meia-noite; "hoje" no Brasil) | Reaproveitar `calcularDiasRestantes`, que compara a data do prazo em UTC com a data de hoje em `America/Sao_Paulo` | Unitário com horário perto da meia-noite (ex.: 23h30 em São Paulo = 02h30 UTC do dia seguinte) |
| Prazo no fim de semana com contagem errada | Sem tratamento especial: sábado e domingo contam como dias | Unitário: sexta para sábado = "1 dia" |
| Mudança de cor surpreender a equipe (mais itens verdes com 5/10) | Decisão explícita sobre os limites (pergunta 1) e registro na documentação | Unitário dos limites |
| Texto "dias úteis" esquecido em alguma tela ou e-mail | `grep -rn "úte" src` deve voltar vazio | Busca antes do commit |
| Teste de outro arquivo dependente do texto antigo | `grep -rn "dias úteis\|fim de semana" tests` | Suíte completa |
| Autorização, IDOR, dado sensível, upload, e-mail | Não se aplica: nenhuma consulta, permissão ou destinatário muda | — |

## 6. Casos-limite e estados

- Prazo hoje: "Vence hoje" (vermelho).
- Prazo amanhã: "1 dia". Prazo no sábado, visto na sexta: "1 dia".
- Prazo ontem: "Atrasado 1 dia", com o destaque de atraso.
- Sem prazo, concluído, cancelado e desativado: rótulos atuais, sem mudança.
- Limite vermelho 0: só "Vence hoje" e atrasados ficam vermelhos (comportamento atual mantido).

## 7. Interface

Nenhuma tela nova. Só textos mudam. O indicador mantém o mesmo tamanho, então o layout em 375 px
não muda. Mesmo assim, as listas de projetos, tarefas e subtarefas e a página `/notificacoes` serão
conferidas em 375 px e no desktop.

## 8. Plano de testes

- **Unitário** (`tests/unit/indicador-dias-restantes.unit.test.ts`), reescrito para dias corridos:
  - segunda 28/09 → sexta 02/10 = "4 dias", vermelho;
  - faixas amarela e verde com os limites padrão e com limites configurados;
  - "Vence hoje"; prazo no sábado = "1 dia" (o rótulo "Prazo no fim de semana" não aparece mais);
  - atraso: terça 29/09 com prazo sexta 25/09 = "Atrasado 4 dias" (hoje seriam 2 dias úteis);
  - fuso: 23h30 em São Paulo ainda conta como o dia local;
  - rótulos de sem prazo, concluído, cancelado e desativado inalterados.
- **Integração** (`semaforo-rf009.integration.test.ts`): sem mudança, a menos que o padrão mude
  (pergunta 1). Nesse caso, passa a esperar os novos padrões.
- **Verificação completa:** `npx prisma generate`, `npm run typecheck`, `npm run lint`, `npm test`.

## 9. Perguntas em aberto

1. **Limites padrão:** mantemos 5 e 10 (agora em dias corridos, faixas mais curtas) ou passamos para
   7 e 14, que equivalem aproximadamente aos 5 e 10 dias úteis de hoje? Se mudar, o valor já salvo
   em produção também deve ser atualizado (só se ainda estiver em 5/10)? — **Resposta (2026-10-15):**
   manter 5 e 10. Sem migration.
2. **Abrangência:** o pedido da Talita é só o semáforo (único lugar em dias úteis) ou existe outro
   prazo que ela vê como "em dias úteis"? Nenhuma outra regra do sistema conta dias úteis. — **Resposta
   (2026-10-15):** somente o semáforo.
3. **Alteração local não commitada** (caixa vermelha sólida para atraso), no mesmo arquivo e nos
   mesmos documentos: ela deve ser publicada antes, em commit próprio, ou eu espero quem a fez? Não
   vou commitá-la nem descartá-la sem autorização. — **Resposta (2026-10-15):** commitar tudo junto,
   no mesmo commit desta alteração. O teste unitário passa a cobrir também a caixa vermelha sólida.
4. **`IndicadorDiasRestantes`** (sem uso, limites 5/10 fixos): removo junto ou deixo? — **Resposta
   (2026-10-15):** remover.
