# TAREFA <id> — <título curto>

> Copie este arquivo para `docs/tarefas/<id>.md`, preencha tudo e registre a tarefa em [README.md](README.md).
> Campo sem resposta fica como **pendente de validação**, nunca como suposição.

| Campo | Valor |
|---|---|
| **ID** | `<id, igual ao da branch>` |
| **Agente responsável** | claude / codex |
| **Branch** | `claude/<id>` ou `codex/<id>` (criada a partir de `origin/staging`) |
| **Worktree** | `~/multiplus-worktrees/<agente>-<id>` |
| **Estado** | proposta / aprovada / em andamento / em revisão / integrada / cancelada |
| **Quem aprovou o escopo** | nome e data |
| **Revisor** | o outro agente ou a pessoa responsável |

## 1. Objetivo

Uma ou duas frases: o que muda para quem usa o sistema.

## 2. Contexto da funcionalidade

- Módulo e página de referência em `docs/funcionalidades/`.
- Decisões já tomadas que valem aqui (links para `docs/decisoes-desenvolvimento.md` e para a análise aprovada, quando houver).
- Protótipo de referência em `telas-novas/` (lembrando que os dados dos protótipos são ilustrativos).
- Esta tarefa muda dado, permissão, RLS ou regra de prazo? Se sim, o link da **análise aprovada** é obrigatório: _<link>_.

## 3. Escopo

**Arquivos e módulos permitidos** (lista exata ou padrões):

- `src/...`

**Arquivos e módulos proibidos** (inclua o que o outro agente está fazendo):

- `src/...`

**Arquivos compartilhados reservados por esta tarefa** (seção 7 do protocolo; "nenhum" também é resposta):

- nenhum

## 4. Dependências

- Tarefas que precisam estar integradas antes: _nenhuma_.
- Tarefas que dependem desta: _nenhuma_.

## 5. Contratos e interfaces relevantes

Funções de `src/lib`, Server Actions, rotas `/api/...`, políticas de RLS e tipos que a tarefa usa ou que não podem mudar de assinatura.

## 6. Critérios de aceite

- [ ] Comportamento 1, verificável.
- [ ] Comportamento 2, verificável.
- [ ] Funciona em 375 px e no desktop, sem rolagem horizontal (se houver tela).
- [ ] Permissão checada no servidor e no RLS, com teste do perfil permitido e do negado (se houver permissão).

## 7. Testes obrigatórios

- Unitário em `tests/unit/`: _o quê_.
- Integração em `tests/integration/` (RLS e permissão): _o quê_.
- Jornada de navegador em `tests/browser/`: _o quê, ou "não se aplica"_.
- Verificação final: `bash scripts/agentes/verificar.sh --completo` sem falhas novas.

## 8. Notas para o planejamento e as decisões

Em modo multiagente, o agente **não** edita `planejamento-diferencas-prototipos.md` nem `decisoes-desenvolvimento.md` na branch.
Escreva aqui o que quem integra deve registrar neles.

## 9. Resumo da implementação (preenchido ao terminar)

- Commits e arquivos alterados (resumo):
- Decisões tomadas durante o trabalho:
- Verificações executadas e resultado (comando e saída resumida):
- Falhas preexistentes encontradas (com o comando que as reproduz em `origin/staging`):
- Pendências e riscos:
- Pergunta em aberto para a pessoa responsável:
