# TAREFA etapa4c-mensagens — Mensagens com a Múltiplus (etapa 4c)

> Campo sem resposta fica como **pendente de validação**, nunca como suposição. Escopo aprovado pelo usuário em 2026-11-24: a
> [análise da etapa 4](../analises/comprovantes-etapa4-instrucoes-foto-mensagens.md) foi aprovada com todas as recomendações. **A análise é a
> especificação**: em caso de dúvida, vale a análise; se ela não responde, pare e pergunte. Esta tarefa é a parte **4c**. **Só começa depois de
> `etapa4b-instrucoes` integrada** (as três reservam o schema e as migrations).

| Campo | Valor |
|---|---|
| **ID** | `etapa4c-mensagens` |
| **Agente responsável** | claude |
| **Branch** | `claude/etapa4c-mensagens` (criada a partir de `origin/staging`, depois da integração da 4b) |
| **Worktree** | `~/multiplus-worktrees/claude-etapa4c-mensagens` |
| **Estado** | aprovada (na fila: aguarda a `etapa4b-instrucoes`) |
| **Quem aprovou o escopo** | o usuário, em 2026-11-24 (análise aprovada com as recomendações) |
| **Revisor** | codex |
| **Criada em** | 2026-11-24 |

## 1. Objetivo

O colaborador externo conversa com a Múltiplus dentro do item dele, numa conversa **só dele**, separada dos comentários internos da equipe. A
equipe responde, e os dois lados recebem aviso por e-mail e no sistema. O externo deixa de ler os comentários internos.

## 2. Contexto da funcionalidade

- **Especificação:** [a análise](../analises/comprovantes-etapa4-instrucoes-foto-mensagens.md), parte **4c**, e as respostas 1, 2, 7 e 8 da seção 10. Protótipo: bloco "Mensagens com a Múltiplus" de `telas-novas/sistema-gestao-multiplus-colaborador-externo/01-minhas-tarefas.html` e a seção 3.1 da especificação. Os dados dos protótipos são ilustrativos.
- **Módulos:** [../funcionalidades/comentarios-mencoes.md](../funcionalidades/comentarios-mencoes.md) e `notificacoes.md`.
- **Esta tarefa muda dado, permissão e RLS?** **Sim**, e a análise aprovada cobre os três: tabela nova com RLS própria e **mudança na leitura de comentários pelo externo**.

**Decisões que valem aqui (resumo da análise):**

1. Tabela `mensagens_item`: `id`, `tarefaId` ou `subtarefaId` (exatamente um), `externoId` (de quem é a conversa), `autorId`, `autorNome`, `texto` (1 a 2000, texto simples), `criadoEm` (do banco). **Imutável** e escrita **só** pela função `enviar_mensagem_item(tipo, id, externoId, texto)`; a role da aplicação só tem `SELECT`. Sem anexo.
2. Leitura (RLS): ADMIN tudo; interno atribuído ao projeto as do projeto; externo as com `externoId` dele **e** enquanto for o responsável do item (`colaborador_responsavel_pelo_item`).
3. Escrita: o externo só no item dele, aberto, enquanto responsável; a equipe (administração e interno atribuído) responde ao externo responsável atual, inclusive em item fechado; o externo **não** escreve em item fechado.
4. Evento novo `MENSAGEM_ITEM` (enum + linhas em `preferencias_notificacao` para os quatro perfis, como na etapa 3): vai ao externo quando a equipe escreve, e à administração e aos internos atribuídos quando o externo escreve. O aviso leva o link e **não** o texto da mensagem. Chave de idempotência por mensagem e por destinatário.
5. **Fechar os comentários ao externo:** `comentarios_select` e `comentario_alvo_acessivel` deixam de abrir `ADMIN_EXTERNO`; a regra dos outros perfis fica igual. Some o bloco de comentários da tela do externo.
6. O cartão de pedido de prazo da etapa 3 **continua separado**; não repita o pedido na conversa.

## 3. Escopo

**Arquivos e módulos permitidos:**

- `prisma/schema.prisma` e migrations novas em `prisma/migrations/` (**reservados**). O timestamp precisa ser posterior ao da última de `origin/staging`. **Ao redefinir `comentario_alvo_acessivel`, parta do corpo mais recente:** `grep -l "FUNCTION comentario_alvo_acessivel" prisma/migrations/*/migration.sql` (hoje `20261008120000_restringir_execucao_funcoes_definer` e `20261002100000_area_exclusiva_cliente_sprint6` a citam); preserve as regras dos outros perfis e os `GRANT`.
- Arquivos novos em `src/lib/` (`mensagens-item.ts` para o acesso a dados e `mensagens-item-regras.ts` para as regras puras).
- Server Actions novas junto das telas, com os dados montados campo a campo.
- Telas: `src/app/(painel)/minhas-tarefas/[id]/page.tsx` (bloco de mensagens do externo, e o do interno quando houver), `src/app/(painel)/tarefas/[id]/page.tsx` (conversa na administração) e os componentes novos dentro das pastas das rotas.
- Notificações: `src/lib/notificacoes.ts`, `src/lib/email-templates.ts`, `src/lib/notificacoes-toasts.ts` e `src/app/(painel)/notificacoes/lista-avisos.tsx`, só para registrar o evento novo.
- Testes: `tests/unit/mensagens-item*.test.ts`, `tests/integration/mensagens-item.integration.test.ts`, uma jornada nova em `tests/browser/` e os ajustes estritamente necessários nos testes de comentários (`comentarios-mencoes`) e de notificações.
- Documentação: `docs/funcionalidades/comentarios-mencoes.md`, `notificacoes.md`, `tarefas.md` e `interface.md`.

**Arquivos e módulos proibidos:**

- As regras de prazo: `src/lib/prazo-em-conferencia.ts`, `src/lib/situacao-prazo.ts`, `src/lib/semaforo.ts`, `src/lib/agenda-itens.ts` e `src/lib/regras-projetos-tarefas.ts`.
- `src/ui/**`, `src/lib/navegacao.ts`, `src/app/globals.css`, `package.json`, `package-lock.json`, `src/lib/csp.ts`, `src/lib/prisma-app.ts` e `src/server/auth/**`.
- Configuração de testes, CI, `ops/`, Docker.
- As partes 4a (foto de exemplo) e 4b (Instruções).
- `docs/analises/planejamento-diferencas-prototipos.md` e `docs/decisoes-desenvolvimento.md` (as notas vão na seção 8).
- Os arquivos de qualquer outra tarefa.

**Arquivos compartilhados reservados por esta tarefa:**

- `prisma/schema.prisma`
- `prisma/migrations/**`

## 4. Dependências

- Tarefas que precisam estar integradas antes: `etapa4a-foto-exemplo` e `etapa4b-instrucoes` (só para liberar a reserva do schema e das migrations; não há dependência de código).
- Tarefas que dependem desta: nenhuma.

## 5. Contratos e interfaces relevantes

- **Padrão a seguir (etapa 3):** `pedidos_prazo`, `solicitar_pedido_prazo`, `estado_pedido_prazo` e a RLS por `colaborador_responsavel_pelo_item` e `interno_atribuido_ao_item_do_comprovante`; funções `SECURITY DEFINER` com `SET search_path = public`, `REVOKE ALL ... FROM PUBLIC` e `GRANT EXECUTE` à role `multiplus_app`; avisos disparados **depois** da transação (`after`), com chave de idempotência por destinatário em `RegistroEnvioPrazo` (veja `notificacoes.ts`).
- **Comentários:** `listarComentarios`, `Comentarios` (`src/app/(painel)/projetos/comentarios.tsx`) e as menções não podem mudar de comportamento para ADMIN, interno e cliente.
- **Dado sensível:** o corpo da mensagem não vai no e-mail nem no aviso.
- **Acesso:** `comContextoDeUsuario`; nunca o cliente "dono" (`src/lib/prisma.ts`) para o que já tem sessão.

## 6. Critérios de aceite

- [ ] O externo escreve e lê a conversa dele no item dele; a equipe responde; o externo de **outro** item, o interno de outro projeto e o cliente não leem nada.
- [ ] O externo **não** lê mais os comentários da equipe, no banco e na tela; ADMIN, interno e cliente leem como antes.
- [ ] Troca de responsável: o novo responsável não vê a conversa do anterior; o anterior perde o acesso; a equipe vê tudo.
- [ ] Item fechado: o externo lê e não escreve; a equipe escreve.
- [ ] Mensagem imutável (sem edição nem exclusão); texto vazio ou acima de 2000 caracteres é recusado.
- [ ] Aviso por e-mail e no sistema para os dois lados, respeitando as preferências por perfil, sem o corpo da mensagem e sem duplicar.
- [ ] Funciona em 375 px e no desktop, sem rolagem horizontal, só com tokens de `globals.css`.

## 7. Testes obrigatórios

- **Unitário em `tests/unit/`:** regras do texto (vazio, 2000, espaços) e o rótulo do evento.
- **Integração em `tests/integration/mensagens-item.integration.test.ts` (perfil permitido e negado, pela role RLS-restrita):** escrita e leitura por perfil; externo alheio; interno de outro projeto; cliente; item fechado; troca de responsável; imutabilidade; `comentarios` fechado ao externo sem mudar o acesso dos outros perfis; os dois sentidos do aviso, as preferências por perfil e a idempotência.
- **Jornada em `tests/browser/` (arquivo novo):** o externo escreve, a administração responde, o externo vê a resposta; a 375 px e no desktop, sem rolagem lateral. Teste que apaga usuário precisa apagar `mensagens_item` antes, se a chave estrangeira pedir.
- **Regressão:** `comentarios-mencoes` e as suítes de notificações continuam verdes, ajustadas só no que a decisão 5 muda.
- **Verificação final:** `bash scripts/agentes/verificar.sh --completo` (Git Bash) sem falhas novas.
- **Ordem sugerida, um commit por etapa:** (1) migration, funções, RLS e testes; (2) regras e acesso a dados; (3) Server Actions e telas; (4) avisos; (5) jornada e documentação.

## 8. Notas para o planejamento e as decisões

Para quem integra, após a entrega, registrar a conclusão da etapa 4 no planejamento da Fase 2 e consolidar as decisões tomadas aqui.

## 9. Resumo da implementação (preenchido ao terminar)

- Commits e arquivos alterados (resumo):
- Decisões tomadas durante o trabalho:
- Verificações executadas e resultado (comando e saída resumida):
- Falhas preexistentes encontradas (com o comando que as reproduz em `origin/staging`):
- Pendências e riscos:
- Pergunta em aberto para a pessoa responsável:
