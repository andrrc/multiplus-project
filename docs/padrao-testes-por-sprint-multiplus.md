
# Padrão de Testes por Sprint — Múltiplus Software

**Versão:** 1.0
**Data:** 02/09/2026
**Contexto:** projeto solo dev (André/Somma), desenvolvimento via Claude Code (vibe coding),
hospedagem self-hosted na Contabo — sem rede de segurança de provedor gerenciado.

Este documento define a convenção de testes que se repete em **toda sprint futura**, não só
na primeira. Objetivo: pegar erro antes de ir pra produção, sem transformar um projeto de
R$5.000 num exercício de over-engineering de QA.

---

## 1. Princípio Geral

**Teste o que é caro de errar, não tudo que existe.**

Num sistema que controla prazos regulatórios de clientes reais, os erros caros são:

- Vazamento de dado entre clientes (RNF-001, RNF-002/LGPD)
- Prazo calculado errado (RN-001, RN-002) — pode gerar perda real de condicionante ambiental
- Login quebrado ou acesso indevido entre perfis (RF-014, RF-015)
- Deploy que sobe quebrado sem ninguém perceber

Esses quatro pontos são testados em **toda sprint**, independente do módulo. O resto é
avaliado caso a caso.

---

## 2. Categorias de Teste e Quando Aplicar

| Categoria                               | O que valida                                                      | Quando é obrigatória                                                                   |
| --------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Teste unitário**               | Lógica de negócio pura (cálculos, regras)                      | Sempre que a sprint envolver uma RN (ex.: cálculo de "% em dia", regra de recorrência) |
| **Teste de permissão/RLS**       | Um perfil não acessa dado de outro                               | Sempre que a sprint envolver dado sensível por cliente/perfil                           |
| **Smoke test / fluxo crítico**   | O caminho principal da funcionalidade nova funciona ponta a ponta | Sempre que a sprint entrega uma tela/fluxo novo do PDD                                   |
| **Teste de regressão**           | Sprints anteriores continuam funcionando                          | Sempre — rodar a suíte completa, não só os testes novos                              |
| **Healthcheck de infra**          | App sobe, conecta no banco, HTTPS válido                         | Apenas na sprint de infra (já coberto) e sempre que a sprint mexer em deploy/infra      |
| **Teste de integração externa** | Comportamento quando a API externa falha (ex. consulta CNPJ)      | Sempre que a sprint envolver uma dependência externa documentada no SRS (Seção 6.1)   |

**Ferramentas fixas do projeto:** Vitest + Testing Library (unitário/componente), scripts de
integração direto no Postgres (permissão/RLS), GitHub Actions (regressão + gate de CI).

---

## 3. Checklist de "Sprint Pronta" (Definition of Done)

Nenhuma sprint é considerada entregue para o checkpoint de revisão com a Talita sem passar
por este checklist:

- [ ] Toda RN (regra de negócio) nova da sprint tem teste unitário cobrindo o caso principal
  e pelo menos um caso-limite (ex.: prazo exatamente no dia, prazo já vencido)
- [ ] Todo dado sensível por perfil novo na sprint tem teste de permissão validando que um
  perfil não vê o que não deveria
- [ ] O fluxo principal do(s) RF(s) da sprint tem smoke test cobrindo o caminho feliz
- [ ] Suíte completa de testes (sprint atual + anteriores) passa antes do deploy
- [ ] Se a sprint tocou infra/deploy: healthcheck validado em produção após o deploy
- [ ] Se a sprint envolveu integração externa: comportamento de falha testado (ver RF-001,
  estado "serviço indisponível" já documentado no PDD)

Se algum item não se aplica à sprint, marcar como "N/A" explicitamente — não deixar em branco.

---

## 4. Convenção de Organização

```
/tests
  /unit          → regras de negócio puras (RN-XXX)
  /integration   → permissão/RLS, banco de dados
  /smoke         → fluxo crítico ponta a ponta por módulo
```

**Nomenclatura:** `[modulo].[categoria].test.ts` — ex.: `indicador-status.unit.test.ts`,
`cadastro-clientes.smoke.test.ts`, `permissoes-cliente.integration.test.ts`.

Cada arquivo de teste deve referenciar no comentário do topo qual RF/RN está cobrindo —
mesma lógica de rastreabilidade já usada no SRS e no PDD.

---

## 5. Gate de CI

O GitHub Actions configurado na Sprint 1 deve:

1. Rodar a suíte completa de testes a cada push
2. **Bloquear o deploy automático** se qualquer teste falhar
3. Rodar o healthcheck contra o ambiente após deploy bem-sucedido — se falhar, alertar
   (via UptimeRobot já configurado) mesmo que o deploy técnico tenha "funcionado"

Nenhum código vai pra produção com teste quebrado, mesmo em correção urgente — nesse caso,
corrige o teste junto, não pula ele.

---

## 6. Quando NÃO Testar (evitar over-engineering)

- Não escrever teste E2E completo de UI para cada tela — smoke test do fluxo crítico basta
  nesse porte de projeto
- Não testar biblioteca de terceiro (ex.: não testar se o Auth.js funciona — testar como
  *você* usa ele)
- Não perseguir 100% de cobertura — o alvo é cobrir os quatro pontos caros do princípio geral
  (Seção 1), não todas as linhas de código
- Ajustes visuais/UX (frontend-design) não precisam de teste automatizado — validação é visual

---

## 7. Template por Sprint

Copiar isso no planejamento de cada sprint nova:

```markdown
## Testes — Sprint [N]: [nome da sprint]

**RFs/RNs cobertos:** [lista]

- [ ] Teste unitário: [RN-XXX] — caso principal + caso-limite
- [ ] Teste de permissão: [se aplicável]
- [ ] Smoke test: [fluxo crítico do módulo]
- [ ] Regressão: suíte completa passando
- [ ] Healthcheck pós-deploy: [se a sprint mexeu em infra]
- [ ] Falha de integração externa testada: [se aplicável]
```

---

## Histórico de Revisões

| Versão | Data       | Autor  | Alterações    |
| ------- | ---------- | ------ | --------------- |
| 1.0     | 02/09/2026 | André | Versão inicial |
