# Plano de Execução — Sprint 3: Administração e Acesso

**Versão:** 1.0
**Data:** 14/09/2026
**Autor:** André (Somma)
**Baseado em:** PDD Projetos e Tarefas v1.0 (Parte I) + RFs novos RF-039 a RF-043
**Escopo:** RF-030, RF-032, RF-039, RF-040, RF-041, RF-042, RF-043 + RN-007

---

## 1. Objetivo da Sprint

Ao final desta sprint, a Talita deve conseguir **cadastrar um segundo usuário, atribuí-lo a
trabalho e vê-lo entrar no sistema com acesso restrito** — sem que ninguém precise abrir o
Postgres. É isso que destrava a Sprint 4, cujas telas de colaborador dependem de `Atribuicao`
populada.

**Demonstração de aceite da sprint (o que mostrar pra Talita):**
1. Talita cria um usuário Colaborador Interno e o atribui a um cliente/projeto
2. A pessoa recebe e-mail, define senha e entra
3. Ela vê o menu reduzido e apenas o que lhe foi atribuído
4. Talita desativa um cliente; ele some das listagens sem sumir do banco

---

## 2. O que já existe (verificar antes de codar)

A Sprint 1 entregou infra e autenticação; a Sprint 2 entregou o Cadastro de Clientes com RLS.
Parte desta sprint pode já estar parcialmente pronta. **Auditar o repositório antes de
escrever linha nova:**

| Item | O que verificar | Se existir |
|---|---|---|
| Tabela `Usuario` | Colunas, perfis, FK `pessoa_operacional_id` (ADR-005) | Só estender |
| Tabela `Atribuicao` | Estrutura polimórfica (`entidade_tipo` + `entidade_id`) | Reaproveitar |
| Auth.js | Adapter Postgres, fluxo de credenciais, tabela de tokens | Não reimplementar |
| Fluxo de convite por e-mail | Se o RF-031/RF-028 já disparam e-mail de definição de senha | **Provavelmente existe** — a Sprint 2 fechou o bug do checkbox "é um colaborador?", que dispara esse mesmo fluxo |
| Tela de definir senha (A4) | Se o e-mail da Sprint 2 leva a alguma tela real | Se existe, só padronizar |
| Resend | Se já está configurado e enviando | Reaproveitar config |
| RLS `usuarios_write` | Política ADMIN-only citada no PDD de Clientes | Base do RN-007 |

**Esta auditoria é a Tarefa 0** e não é formalidade — o risco real aqui é reconstruir o fluxo
de convite que a Sprint 2 já corrigiu.

---

## 3. Quebra em Tarefas

### Etapa A — Fundação de dados (bloqueia todo o resto)

**A0. Auditoria do repositório**
- Levantar o que da Seção 2 já existe
- Saída: lista do que é novo vs. o que é extensão
- *Sem esta tarefa, as estimativas seguintes não valem*

**A1. Migration — soft delete transversal (RF-039)**
- Colunas `ativo` (boolean, default `true`), `desativado_em`, `desativado_por` em: `Cliente`,
  `PessoaEnvolvida`, `Documento`, `Usuario`
- Migration **não-destrutiva**: todo registro existente recebe `ativo = true`
- Índice em `ativo` nas tabelas com listagem
- *Projeto, Tarefa e Subtarefa entram na Sprint 4, quando as tabelas existirem*

**A2. Retrofit de queries da Sprint 2 (RF-039, RN-009)**
- Toda listagem e toda política de RLS existente passa a filtrar `ativo = true`
- **Ponto de atenção:** é exatamente o tipo de mudança que quebra em silêncio. A suíte de 77
  testes da Sprint 2 precisa continuar passando sem alteração de comportamento esperado
- Cascata por herança: desativar Cliente torna suas Pessoas Envolvidas e Documentos
  inacessíveis, **sem** marcar cada filho (ADR-008)

**A3. Migration — campos de usuário**
- Confirmar/criar `nome`, `status_acesso` (Ativo / Pendente de ativação / Desativado)
- Garantir unicidade de `email`

---

### Etapa B — Backend de acesso

**B1. Serviço de convite e definição de senha (RF-030, RF-031, RF-032)**
- Geração de token com validade limitada, uso único
- Envio via Resend (reaproveitar config da Sprint 2)
- Um único serviço atende aos quatro pontos de entrada: RF-028 (checkbox "é um colaborador"),
  RF-030 (usuário interno), RF-031 (acesso do cliente) e RF-033 (promoção posterior)
- *Se a Sprint 2 já implementou parte disso, esta tarefa vira consolidação, não construção*

**B2. Recuperação de senha (RF-032)**
- Endpoint de solicitação com **resposta idêntica** para e-mail existente e inexistente
- Rate limit por e-mail e por IP — sem isso o endpoint vira enumerador de cadastro

**B3. Política de senha**
- Definir requisitos mínimos e exibi-los na tela com marcação do que já foi atendido
- Validação no servidor, não só no cliente

**B4. RLS de usuários e atribuições (RN-007)**
- Leitura da listagem de usuários: só Administrador
- Escrita em `Usuario` e `Atribuicao`: só Administrador
- **Bloqueio no endpoint, não só na UI** — esconder botão não é permissão

---

### Etapa C — Telas de acesso (públicas)

**C1. Tela A4 — Definir Senha**
- Estados: token válido / expirado / já usado / senha fraca
- Ao concluir: login automático e redirecionamento à tela inicial do perfil (RF-043)

**C2. Tela A5 — Esqueci Minha Senha**
- Mensagem neutra sempre
- Link a partir da tela de login

---

### Etapa D — Telas de administração

**D1. Tela A1 — Listagem de Usuários (RF-040)**
- Busca, filtro por perfil, toggle "Mostrar desativados"
- Sinalização visual de usuário com zero atribuições
- Ações: editar, reenviar convite, desativar/reativar

**D2. Tela A2 — Formulário de Usuário (RF-030, RF-040, RF-041)**
- Seção de atribuições muda conforme o perfil escolhido (projetos x tarefas x nenhuma)
- **Dependência da Sprint 4:** na Sprint 3 ainda não existem Projeto e Tarefa. A seção de
  atribuição fica estruturalmente pronta, mas sem dado pra selecionar
- **Decisão necessária** — ver Seção 5

**D3. Tela A3 — Gestão de Atribuições (RF-041)**
- Origem "Manual" x "Automática (RN-006)"; remoção bloqueada nas automáticas
- Mesma restrição de dependência da D2

**D4. Tela A6 — Meu Perfil (RF-042)**
- Acessível a todos os perfis
- E-mail somente leitura para não-Administrador
- Alterar senha exige senha atual

---

### Etapa E — Transversais

**E1. Navegação e menu por perfil (RF-043)**
- Itens ausentes, não desabilitados
- Guarda de rota no servidor, não só no menu

**E2. Tela inicial por perfil (RF-043)**
- Administrador → Painel de Prazos (**não existe até a Sprint 4**)
- **Decisão necessária** — ver Seção 5

**E3. UI de desativação nas telas da Sprint 2 (RF-039)**
- Ação "Desativar"/"Reativar" com confirmação explicando o efeito
- Toggle "Mostrar desativados" nas listagens de Cliente e nas listas de Pessoa Envolvida e
  Documento
- Só Administrador

---

### Etapa F — Qualidade e entrega

**F1. Testes** (detalhados na Seção 4)
**F2. Regressão** — suíte completa das Sprints 1 e 2 verde
**F3. Deploy + healthcheck** — a sprint mexe em schema, então o healthcheck pós-deploy é
obrigatório pelo Padrão de Testes
**F4. Atualização de documentação** — SRS v2.1, ADD v1.9 (ADR-008), PDD, e histórico de
revisões

---

## 4. Testes — Sprint 3: Administração e Acesso

**RFs/RNs cobertos:** RF-030, 032, 039, 040, 041, 042, 043; RN-007, RN-009

- [ ] **Teste unitário (RN-009):** registro desativado é excluído das listagens e queries —
      caso principal + caso-limite (pai desativado com filhos ativos)
- [ ] **Teste unitário:** token de definição de senha — válido / expirado / já usado
- [ ] **Teste de permissão/RLS (RN-007):** apenas Administrador lê e escreve em `Usuario` e
      `Atribuicao` — testado no endpoint, não na UI
- [ ] **Teste de permissão/RLS:** usuário sem atribuição não enxerga nada ao logar
- [ ] **Teste de permissão/RLS (RF-039):** registro desativado não retorna para nenhum perfil
- [ ] **Teste de permissão/RLS (RF-043):** acesso direto por URL a rota fora do perfil é negado
- [ ] **Smoke test:** criar usuário → convite → definir senha → login → tela inicial correta
- [ ] **Smoke test:** desativar cliente → some da listagem → reativar → volta íntegro
- [ ] **Teste de integração:** recuperação de senha devolve resposta idêntica para e-mail
      existente e inexistente
- [ ] **Regressão:** suíte completa das Sprints 1 e 2 passando (atenção especial ao retrofit A2)
- [ ] **Healthcheck pós-deploy:** sim — a sprint altera schema
- [ ] **Falha de integração externa:** Resend indisponível no envio de convite — o usuário é
      criado mesmo assim, com ação de reenviar convite disponível

---

## 5. Decisões necessárias antes de começar

Duas dependências circulares entre Sprint 3 e Sprint 4 precisam de escolha:

**1. Atribuições sem Projeto e Tarefa (tarefas D2 e D3)**
As telas de atribuição só têm o que atribuir depois da Sprint 4. Opções:
- **(a)** Construir a estrutura completa agora; a seção fica vazia até a Sprint 4 criar dados
- **(b)** Construir só a atribuição a **cliente** agora (que já existe) e completar na Sprint 4
- **(c)** Adiar D2/D3 para o começo da Sprint 4

**2. Tela inicial do Administrador (tarefa E2)**
O Painel de Prazos só nasce na Sprint 4. Até lá, o Administrador cai onde?
- **(a)** Painel de Clientes provisoriamente, trocando na Sprint 4
- **(b)** Construir a rota de Prazos já na Sprint 3, com estado vazio

---

## 6. Ordem de Execução

```
A0 auditoria
   ↓
A1 → A2 → A3        (fundação de dados; A2 é a mais arriscada da sprint)
   ↓
B1 → B2 → B3 → B4   (backend de acesso)
   ↓
C1 → C2             (telas públicas — já demonstráveis)
   ↓
D1 → D2 → D3 → D4   (administração)
   ↓
E1 → E2 → E3        (transversais)
   ↓
F1 → F2 → F3 → F4   (qualidade e entrega)
```

**Por que esta ordem:** a fundação de dados bloqueia tudo; o backend de acesso é pré-requisito
das telas; as telas públicas (C) vêm antes das administrativas porque fecham o ciclo mínimo
demonstrável (convite → senha → login) sem depender de nenhuma tela de gestão.

**Ponto de maior risco:** a tarefa **A2** (retrofit de queries da Sprint 2). É mudança
transversal em código já testado e em produção, do tipo que falha em silêncio — um `ativo =
true` esquecido numa política de RLS não quebra nada visivelmente, só deixa vazar registro
desativado. Vale rodar a suíte completa logo após A2, antes de seguir para B.

---

## 7. Checklist de "Sprint Pronta"

- [ ] Toda RN nova tem teste unitário com caso principal e caso-limite (RN-009)
- [ ] Todo dado sensível por perfil novo tem teste de permissão (RN-007)
- [ ] Fluxo principal tem smoke test do caminho feliz
- [ ] Suíte completa (Sprints 1, 2 e 3) passa antes do deploy
- [ ] Healthcheck validado em produção após o deploy
- [ ] Comportamento de falha da integração externa testado (Resend)
- [ ] Documentação atualizada: SRS v2.1, ADD v1.9, PDD, histórico de revisões
- [ ] Demonstração de aceite (Seção 1) executada ponta a ponta antes do checkpoint com a Talita
