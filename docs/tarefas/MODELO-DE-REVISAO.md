# REVISÃO da tarefa <id> — <título>

> O revisor **não edita** a branch revisada. Trabalhe em um worktree de leitura dela, entregue este relatório à pessoa responsável
> e deixe a correção para o autor. Veja a seção 9 de [../colaboracao-multiagente.md](../colaboracao-multiagente.md).

| Campo | Valor |
|---|---|
| **Tarefa** | `<id>` (arquivo `docs/tarefas/<id>.md`) |
| **Branch revisada** | `claude/<id>` ou `codex/<id>`, no commit `<hash>` |
| **Revisor** | claude / codex |
| **Data** | AAAA-MM-DD |
| **Veredito** | aprovar / aprovar com ressalvas / pedir mudanças |

## 1. O que foi conferido

Marque o que de fato foi verificado e deixe em branco o que não foi:

- [ ] O escopo da tarefa foi respeitado: nenhum arquivo proibido ou compartilhado não reservado foi alterado (`git diff --stat origin/staging...<branch>`).
- [ ] Aderência ao `AGENTS.md` e à arquitetura (regra no `src/lib`, tela em `src/app`, componente em `src/ui`).
- [ ] Padrões de código, nomenclatura em português e comentários.
- [ ] Segurança: permissão no servidor **e** no RLS; dado sensível mascarado; validação no servidor; Server Action sem repassar o formulário inteiro.
- [ ] Tratamento de erros e mensagens.
- [ ] Possíveis regressões: outros usos da função ou do componente alterado (`grep -rn "Nome" src`).
- [ ] Contratos e integrações (rotas, Server Actions, consultas, migrations).
- [ ] Testes: cobrem o perfil permitido **e** o negado; não afrouxam asserção; não usam `skip`, `only` ou `todo`.
- [ ] Complexidade desnecessária, duplicação, dependência nova.
- [ ] Verificações rodadas: `bash scripts/agentes/verificar.sh` (e `--completo`, quando o escopo pede). Resultado:

## 2. Achados

Um por linha, do mais grave ao mais leve.

| # | Severidade | Arquivo:linha | O que está errado | Cenário em que falha | Sugestão |
|---|---|---|---|---|---|
| 1 | crítica / alta / média / baixa | `src/...:123` | | | |

**Severidade:** _crítica_ = vaza dado, fura permissão ou quebra regra de negócio; _alta_ = falha provável em uso normal; _média_ = falha em caso de borda ou teste faltando; _baixa_ = estilo, clareza ou melhoria.

## 3. O que está bom

Pontos que merecem ser mantidos (ajuda o autor a saber o que repetir).

## 4. Falhas preexistentes encontradas

Falha que também ocorre em `origin/staging`, com o comando que a reproduz. Não conta contra a tarefa.

## 5. Perguntas para a pessoa responsável

Qualquer decisão de regra de negócio, permissão, dado ou arquitetura que o revisor identificou e não cabe a ele decidir.
