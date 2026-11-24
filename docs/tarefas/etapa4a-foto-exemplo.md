# TAREFA etapa4a-foto-exemplo — Foto de exemplo do comprovante (etapa 4a)

> Campo sem resposta fica como **pendente de validação**, nunca como suposição. Escopo aprovado pelo usuário em 2026-11-24: a
> [análise da etapa 4](../analises/comprovantes-etapa4-instrucoes-foto-mensagens.md) foi aprovada com todas as recomendações. **A análise é a
> especificação**: em caso de dúvida, vale a análise; se ela não responde, pare e pergunte. Esta tarefa é a parte **4a**; as partes 4b e 4c
> têm tarefa própria e **não** entram aqui.

| Campo | Valor |
|---|---|
| **ID** | `etapa4a-foto-exemplo` |
| **Agente responsável** | codex |
| **Branch** | `codex/etapa4a-foto-exemplo` (criada a partir de `origin/staging`) |
| **Worktree** | `~/multiplus-worktrees/codex-etapa4a-foto-exemplo` |
| **Estado** | aprovada (pode começar) |
| **Quem aprovou o escopo** | o usuário, em 2026-11-24 (análise aprovada com as recomendações) |
| **Revisor** | claude |
| **Criada em** | 2026-11-24 |

## 1. Objetivo

A administração anexa uma **foto de exemplo** ao item (tarefa ou subtarefa) que exige comprovante, e o colaborador externo a vê na tela de
envio, para enviar certo na primeira vez. A foto vai junto para a próxima ocorrência de uma tarefa recorrente, para as subtarefas copiadas e
para o projeto duplicado.

## 2. Contexto da funcionalidade

- **Especificação:** [a análise](../analises/comprovantes-etapa4-instrucoes-foto-mensagens.md), seções 1 a 9, parte **4a**, e as respostas 5 e 6 da seção 10.
- **Módulo:** [../funcionalidades/tarefas.md](../funcionalidades/tarefas.md) e `subtarefas.md`. Protótipo: `telas-novas/sistema-gestao-multiplus-colaborador-externo/01-minhas-tarefas.html` (a foto aparece no bloco "O que enviar"). Os dados dos protótipos são ilustrativos.
- **Padrão a seguir:** a etapa 1 (campos do item em `src/lib/comprovantes-arquivos.ts`, a rota `api/comprovantes/[id]`, `armazenarComprovante` em `src/lib/storage.ts` e `CamposComprovante`).
- **Esta tarefa muda dado, permissão e storage?** **Sim**, e a análise aprovada cobre os três: coluna nova no item, rota de leitura nova e objeto novo no bucket.

**Decisões que valem aqui (resumo da análise):**

1. Uma foto por item: JPEG, PNG ou WebP, até 10 MB, tipo conferido pelos bytes (`detectarTipoImagem`). Só a **administração** anexa, troca ou tira.
2. `comprovanteExemploChave String?` em `Tarefa` e `Subtarefa`. A chave é gerada no servidor (`exemplos/<uuid>.<ext>`), nunca montada a partir do nome enviado.
3. Trocar a foto grava um objeto novo e **não apaga o antigo** do bucket (sem exclusão definitiva, RF-039). Tirar a foto só zera a coluna.
4. A recorrência (`concluir_tarefa`, inclusive as subtarefas copiadas) e `src/lib/duplicar-projeto.ts` copiam a chave: a cópia **aponta para o mesmo objeto**.
5. Leitura: administração; interno atribuído ao projeto; externo **só nos itens dele**; **cliente nunca**. A rota consulta o item com RLS, responde 404 indistinto e usa `no-store` e `nosniff`.

## 3. Escopo

**Arquivos e módulos permitidos:**

- `prisma/schema.prisma` e **uma** migration nova em `prisma/migrations/` (**reservados**, seção abaixo). O timestamp precisa ser posterior ao da última de `origin/staging` (hoje `20261124150000_concluir_tarefa_data_da_serie`): confira antes de publicar. A migration redefine `concluir_tarefa` **a partir do corpo de `20261124150000`** (a mais recente que a define; confira com `grep -l "FUNCTION concluir_tarefa" prisma/migrations/*/migration.sql`) só para copiar a chave; a assinatura **não muda** (três argumentos, com os `GRANT`).
- `src/lib/projetos-tarefas.ts` (**reservado**): gravar e ler a chave na criação e edição de tarefa e subtarefa, sem mudar assinaturas nem comportamento existente.
- `src/lib/duplicar-projeto.ts`: copiar a chave.
- `src/lib/storage.ts`: só **acrescentar** funções (guardar e ler a foto de exemplo); as de comentário e comprovante não mudam.
- Arquivos novos em `src/lib/` (por exemplo `foto-exemplo.ts`, com as regras puras para teste unitário).
- `src/ui/campos-comprovante.tsx` (**reservado**, é de `src/ui/**`): o campo "Foto de exemplo" e "Remover foto". Mantenha o contrato do componente (o campo oculto `comprovanteCampos` continua mandando).
- Server Actions: `src/app/(painel)/projetos/actions.ts` (montar os dados campo a campo, sem repassar o formulário inteiro) e, se preciso, arquivos novos junto das rotas.
- Formulários que usam `CamposComprovante`: `src/app/(painel)/projetos/[id]/tarefas/nova/page.tsx`, `src/app/(painel)/tarefas/[id]/editar/page.tsx`, `src/app/(painel)/tarefas/[id]/subtarefas/[subtarefaId]/editar/page.tsx` e `src/app/(painel)/tarefas/[id]/subtarefas/form-nova-subtarefa.tsx`.
- Rota nova `src/app/api/comprovantes/exemplo/[tipo]/[id]/route.ts` (`tipo` é `tarefa` ou `subtarefa`).
- Tela do externo e do interno: `src/app/(painel)/minhas-tarefas/[id]/page.tsx` e o componente de envio da pasta, para mostrar a foto; e `src/app/(painel)/tarefas/[id]/page.tsx` para a administração ver a foto atual.
- Testes novos: `tests/unit/foto-exemplo*.test.ts`, `tests/integration/foto-exemplo.integration.test.ts` e uma jornada nova em `tests/browser/`.
- Documentação: `docs/funcionalidades/tarefas.md`, `subtarefas.md` e `interface.md`.

**Arquivos e módulos proibidos:**

- As regras de prazo: `src/lib/prazo-em-conferencia.ts`, `src/lib/situacao-prazo.ts`, `src/lib/semaforo.ts`, `src/lib/agenda-itens.ts` e `src/lib/regras-projetos-tarefas.ts`.
- `src/ui/**` **exceto** `campos-comprovante.tsx`, `src/lib/navegacao.ts`, `src/app/globals.css`, `package.json`, `package-lock.json`, `src/lib/prisma-app.ts`, `src/lib/csp.ts` e `src/server/auth/**`.
- Configuração de testes (`vitest*.mts`, `playwright.config.ts`, `tests/setup-env.ts`, `tests/integration/setup/**`), CI, `ops/`, Docker.
- As partes 4b (Instruções) e 4c (mensagens): tabelas, rotas, avisos e permissões de comentário.
- `docs/analises/planejamento-diferencas-prototipos.md` e `docs/decisoes-desenvolvimento.md` (as notas vão na seção 8).
- Os arquivos de qualquer outra tarefa.

**Arquivos compartilhados reservados por esta tarefa:**

- `prisma/schema.prisma`
- `prisma/migrations/**`
- `src/lib/projetos-tarefas.ts`
- `src/ui/campos-comprovante.tsx`

## 4. Dependências

- Tarefas que precisam estar integradas antes: nenhuma.
- Tarefas que dependem desta: `etapa4b-instrucoes` e `etapa4c-mensagens` (só para liberar a reserva do schema e das migrations; não há dependência de código). **Enquanto esta tarefa correr, nenhuma outra pode reservar** os arquivos acima.

## 5. Contratos e interfaces relevantes

- **Validação do campo do item:** `src/lib/comprovantes-arquivos.ts` (`lerExigenciaDoComprovante`); a foto de exemplo só faz sentido com `comprovanteExigido` ligado. Sem a exigência, o campo é ignorado e a chave existente é zerada? **Decida e registre na seção 9** (a análise não diz; recomendação: ignora o envio novo e mantém a chave, para não perder a foto ao desmarcar e remarcar por engano).
- **Leitura de imagem:** `lerObjeto` e `detectarTipoImagem` de `src/lib/storage.ts`; a rota de comprovante `api/comprovantes/[id]` é o modelo de resposta (404 indistinto, `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`).
- **A RLS de `tarefas` deixa o CLIENTE ler tarefas da própria empresa** (portal). A rota **precisa recusar o perfil CLIENTE explicitamente**, além de consultar com RLS: o cliente nunca vê a foto.
- **Recorrência:** `concluir_tarefa(p_tarefa_id, p_proximo_prazo, p_prazo_serie)`; não mude a conta do prazo das subtarefas nem a assinatura.
- **Acesso:** `comContextoDeUsuario` (`src/lib/prisma-app.ts`); nunca o cliente "dono" (`src/lib/prisma.ts`) para o que já tem sessão. `exigirAdministrador` e o padrão das Server Actions de `projetos/actions.ts`.

## 6. Critérios de aceite

- [ ] A administração anexa a foto no formulário de tarefa e de subtarefa (criação e edição), troca e remove; as outras permissões são recusadas no servidor.
- [ ] Arquivo que não é JPEG, PNG ou WebP (conferido pelos bytes) ou acima de 10 MB é recusado com mensagem clara.
- [ ] O externo vê a foto na tela de envio do item dele; o externo de **outro** item, o interno de outro projeto e o cliente recebem 404; sem sessão, 404.
- [ ] A próxima ocorrência, as subtarefas copiadas e o projeto duplicado apontam para a **mesma** foto; trocar a foto da ocorrência atual não muda a das já criadas.
- [ ] Trocar ou tirar a foto não apaga o objeto antigo do bucket.
- [ ] Nenhuma regra de prazo muda; `concluir_tarefa` mantém a assinatura e a conta das subtarefas (testes de `pedidos-prazo` e `projetos-tarefas-a4` continuam verdes).
- [ ] Funciona em 375 px e no desktop, sem rolagem horizontal, só com tokens de `globals.css`.

## 7. Testes obrigatórios

- **Unitário em `tests/unit/`:** tipo pelos bytes, limite de tamanho, geração da chave (nunca a partir do nome enviado) e a decisão da seção 5 sobre desmarcar o comprovante.
- **Integração em `tests/integration/foto-exemplo.integration.test.ts` (perfil permitido e negado, pela role RLS-restrita):**
  - só a administração grava, troca e remove; interno, externo e cliente recusados, no servidor **e** no banco quando aplicável;
  - a rota de leitura: administração, interno do projeto e externo do item leem; externo alheio, interno de outro projeto, cliente e sem sessão recebem 404;
  - cópia da chave na recorrência (tarefa e subtarefas copiadas) e na duplicação do projeto, apontando para o mesmo objeto;
  - o objeto antigo continua no bucket depois da troca.
- **Jornada em `tests/browser/` (arquivo novo):** a administração anexa a foto em uma tarefa que exige comprovante; o externo a vê na tela de envio; a 375 px e no desktop, sem rolagem lateral.
- **Verificação final:** `bash scripts/agentes/verificar.sh --completo` (pelo **Git Bash**, não pelo PowerShell) sem falhas novas. Avise a pessoa responsável antes de rodar `--completo`, porque só uma suíte de banco roda por vez.
- **Ordem sugerida, um commit por etapa:** (1) migration, schema e testes de integração da cópia; (2) regras puras, storage e rota de leitura; (3) formulários e Server Actions; (4) telas; (5) jornada e documentação.

## 8. Notas para o planejamento e as decisões

Para quem integra, após a entrega, registrar a conclusão da parte 4a no planejamento da Fase 2 e consolidar as decisões tomadas aqui (principalmente a da seção 5 sobre desmarcar o comprovante).

## 9. Resumo da implementação (preenchido ao terminar)

- Commits e arquivos alterados (resumo):
- Decisões tomadas durante o trabalho:
- Verificações executadas e resultado (comando e saída resumida):
- Falhas preexistentes encontradas (com o comando que as reproduz em `origin/staging`):
- Pendências e riscos:
- Pergunta em aberto para a pessoa responsável:
