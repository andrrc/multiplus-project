# Análise: semáforo vermelho só quando o prazo vencer

- **Data:** 2026-10-15
- **Pedido original:** "Alterar configuração do semáforo, na parte de prazo ao invés de ficar em vermelho quando um projeto estiver com prazo de 5 dias pra baixo, so fica em vermelho se caso atrasar mesmo, ai o amarelo realmente fica em de 5 pra baixo."
- **Status:** aprovada em 2026-10-15

## 1. Escopo previsto

### Como é hoje

Semáforo global (RF-009), em dias corridos desde `035aa9a`, com dois limites configuráveis em
`/notificacoes` (padrão 5 e 10):

| Situação | Cor hoje |
|---|---|
| Atrasado | Caixa vermelha sólida, texto branco ("Atrasado N dias") |
| Vence hoje até 5 dias | Vermelho claro |
| 6 a 10 dias | Âmbar |
| Mais de 10 dias | Verde |

### Como fica

| Situação | Cor nova |
|---|---|
| Atrasado | Vermelho: a caixa sólida atual, a única situação de prazo em vermelho |
| Vence hoje até 5 dias | Âmbar |
| Mais de 5 dias | Verde |

Isso segue a regra da identidade visual: `critico` = prazo vencido, `ambar` = atenção.

**Configuração.** Com o vermelho fixo no atraso, sobra um único limite configurável, "Amarelo até
(dias)", com padrão 5. A tela `/notificacoes` perde o campo "Vermelho até".

### O que não muda

- Itens concluídos (verde), sem prazo e desativados. "Cancelado" passa de vermelho claro a
  cinza (pergunta 3).
- Contagem em dias corridos, fuso de São Paulo, textos ("Vence hoje", "N dias", "Atrasado N dias").
- "% em dia", avisos de prazo por e-mail e antecedência.

## 2. Permissões

Não muda. Todos os perfis que já veem o semáforo continuam vendo, e só o `ADMIN` altera o limite
(policy `configuracoes_semaforo_update`).

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Ver semáforo | Sim | Sim (itens atribuídos) | Sim (itens atribuídos) | Não usa o semáforo |
| Alterar o limite amarelo | Sim | Não | Não | Não |

## 3. Dados

Migration nova, com timestamp posterior a `20261008120000`:

1. Remover a restrição `configuracoes_semaforo_limites_check`.
2. Copiar o limite vermelho atual para o amarelo:
   `UPDATE configuracoes_semaforo SET "diasAmareloAte" = "diasVermelhoAte" WHERE id = 1`.
   Quem usava 5/10 passa a ter amarelo até 5, que é o pedido. Se a Talita tiver configurado outro
   valor de vermelho, ele vira o limite de atenção, sem perder a escolha dela.
3. Remover a coluna `diasVermelhoAte`. O padrão de `diasAmareloAte` passa a 5.
4. Nova restrição: `"diasAmareloAte" BETWEEN 0 AND 365`.

O `schema.prisma` vai no mesmo commit. Policies e `GRANT` não mudam.

Validação no servidor (`atualizarLimitesSemaforo`): inteiro de 0 a 365. Com 0, só "Vence hoje"
fica âmbar.

## 4. Impacto em telas e funções existentes

| Arquivo | Mudança |
|---|---|
| `prisma/schema.prisma` + migration nova | Coluna, padrão e restrição (seção 3) |
| `src/lib/semaforo.ts` | `LimitesSemaforo = { diasAmareloAte }`, padrão 5, validação |
| `src/app/(painel)/notificacoes/actions.ts` | Lê só `diasAmareloAte` |
| `src/app/(painel)/notificacoes/page.tsx` | Um campo, "Amarelo até (dias)"; texto explicativo: "Vermelho só para prazo vencido" |
| `src/ui/indicador-dias-restantes.tsx` | Cores: `< 0` vermelho, `<= limite` âmbar, senão verde |
| Telas que usam o indicador, sem mudança de código | `projetos`, `projetos/[id]`, `tarefas`, `tarefas/[id]`, `subtarefas`, `meus-projetos`, `meus-projetos/[id]`, `minhas-tarefas`, `minhas-tarefas/[id]` |
| Testes | `tests/unit/indicador-dias-restantes.unit.test.ts`, `tests/integration/semaforo-rf009.integration.test.ts` |
| Documentação | `docs/funcionalidades/projetos.md` (P3), `tarefas.md` (T11), `subtarefas.md` (S5), `notificacoes.md` (N5), SRS RF-009, `docs/architecture-multiplus-software.md`, `docs/decisoes-desenvolvimento.md` |

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| Migration perder a configuração atual | Copiar o valor de vermelho para amarelo antes de remover a coluna | Integração: após migrar, a leitura devolve `diasAmareloAte` = 5 no banco de teste |
| Perfil não ADMIN alterar o limite | Checagem em `atualizarLimitesSemaforo` + policy (sem mudança) | `semaforo-rf009`: `ADMIN_INTERNO` recebe `/Ação restrita ao Administrador/` e o `UPDATE` direto afeta 0 linhas |
| Valor inválido pelo formulário | Validação no servidor + `CHECK` no banco | `semaforo-rf009`: -1 e 366 recusados com a mensagem esperada |
| Código antigo enviando `diasVermelhoAte` durante o deploy | Action e lib deixam de ler o campo; deploy aplica a migration antes de subir a nova versão (`ops/deploy.sh`) | Typecheck + suíte |
| Algum teste ou tela ainda usando o limite vermelho | `grep -rn "diasVermelhoAte" src tests prisma` vazio, exceto a migration antiga | Busca antes do commit |
| Autorização, IDOR, dado sensível, e-mail | Não se aplica: nenhuma consulta ou destinatário muda | — |

## 6. Casos-limite e estados

- Atrasado 1 dia: vermelho sólido.
- Vence hoje: âmbar ("Vence hoje").
- 5 dias: âmbar. 6 dias: verde (com limite 5).
- Limite 0: só "Vence hoje" fica âmbar; amanhã já é verde.
- Concluído, cancelado, sem prazo, desativado: sem mudança.

## 7. Interface

- `/notificacoes`: o bloco do semáforo fica com um campo em vez de dois, em uma coluna no celular.
- O indicador mantém tamanho e textos; só a cor muda.
- Vou conferir em 375 px e no desktop, se houver acesso de login (ver pendência da entrega anterior).

## 8. Plano de testes

- **Unitário** (`indicador-dias-restantes.unit.test.ts`):
  - atrasado → `bg-critico text-branco`;
  - "Vence hoje" e 5 dias → `bg-ambar/8`;
  - 6 dias → `bg-verde-cl`;
  - nenhum prazo futuro ou de hoje gera `bg-critico/8`;
  - limite configurado (ex.: 2) e limite 0.
- **Integração** (`semaforo-rf009.integration.test.ts`): leitura e atualização só com
  `diasAmareloAte`; valor padrão 5 após a migration; recusa de valores fora de 0 a 365; RLS
  (ADMIN altera, `ADMIN_INTERNO` não).
- **Verificação completa:** `npx prisma generate`, `npm run typecheck`, `npm run lint`, `npm test`.

## 9. Perguntas em aberto

1. **Abrangência:** o pedido cita "projeto", mas o semáforo é um só para projetos, tarefas e
   subtarefas. A regra nova vale para os três (proposta) ou só para projetos? — **Resposta
   (2026-10-15):** vale para os três.
2. **"Vence hoje":** fica âmbar (proposta, porque ainda não atrasou) ou vermelho? — **Resposta
   (2026-10-15):** âmbar.
3. **"Cancelado"** continua em vermelho claro, como hoje, ou passa a cinza para que o vermelho
   signifique só atraso? — **Resposta (2026-10-15):** cinza (`border-linha bg-papel text-cinza`,
   igual a "Desativado"; o texto "Cancelado" diferencia os dois). Com isso, o semáforo não usa
   mais vermelho claro em nenhuma situação.
4. **Configuração:** fica um único limite configurável, "Amarelo até (dias)", com padrão 5
   (proposta, com migration), ou o 5 fica fixo e o campo some da tela? — **Resposta
   (2026-10-15):** configurável, com a migration.
