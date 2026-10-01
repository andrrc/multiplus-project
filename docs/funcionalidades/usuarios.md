# Usuários e atribuições

- **Última revisão:** 2026-09-29, no commit `fe1b5b4` do `staging`.
- **Requisitos:** RF-015, RF-018, RF-019, RF-030, RF-040, RF-041, RF-042; RN-007;
  ADR-007.
- **Módulos relacionados:** Autenticação e acesso, Clientes, Projetos, Tarefas.

## Visão geral

**Usuários internos** são a Administradora e os colaboradores. Um colaborador só enxerga
o que lhe foi **atribuído**:
- o **Colaborador Interno** (`ADMIN_INTERNO`) é atribuído a **projetos**;
- o **Colaborador Externo** (`ADMIN_EXTERNO`) é atribuído a **tarefas**.

A Administradora vê tudo e não recebe atribuições. Usuários com perfil `CLIENTE` são
criados pela ficha do cliente (ver `clientes.md`) e não aparecem aqui.

## Quem pode fazer o quê

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Listar, criar, editar, desativar e reativar usuários | Sim | Não | Não | Não |
| Adicionar e remover atribuições | Sim | Não | Não | Não |
| Reenviar convite ou gerar link manual | Sim | Não | Não | Não |
| Editar o próprio nome e trocar a própria senha (Meu Perfil) | Sim | Sim | Sim | Sim |
| Desativar o próprio acesso | **Não** (bloqueado) | — | — | — |

---

## Funcionalidades

### U1. Listar usuários (RF-040)

**Como funciona.**
- **Colunas:** nome, perfil, situação do acesso e alcance.
- **Situação do acesso:** Ativo, Pendente de ativação ou Desativado.
- **Alcance:** "Acesso total" para a Administradora, ou as atribuições do colaborador.
- **Alertas:** colaborador sem nenhuma atribuição aparece com o aviso "não vê nada ao
  entrar". Falha no envio do convite também aparece na lista.

**Detalhes técnicos.**
- **Rota:** `/usuarios`.
- **Funções:** `listarUsuarios` e `statusAcesso` (`src/lib/usuarios.ts`).
- **Teste:** `administracao-acesso.unit.test.ts`, com os casos da situação do acesso.

### U2. Criar usuário e enviar convite (RF-030)

**Como funciona.**
- **Cadastro:** a Administradora informa nome, e-mail, perfil e dados complementares.
- O telefone opcional é tratado como celular brasileiro: máscara `(DD) XXXXX-XXXX`, com
  suporte a colagem com `+55` e validação de 11 dígitos no servidor.
- **Convite:** o usuário recebe um e-mail para definir a senha, com link válido por
  **7 dias**.
- **Se o e-mail falhar:** o usuário é criado mesmo assim, e o convite pode ser reenviado.
- **Link manual:** a Administradora pode gerar um link de uso único para enviar por outro
  canal.

**Detalhes técnicos.**
- **Rotas:** `/usuarios/novo` e `/usuarios/[id]/editar`.
- **Telefone:** usa `CampoTelefone` (`src/ui/campo-telefone.tsx`) e a validação
  `validarTelefoneCelular` (`src/lib/formatacao.ts`).
- **Funções:** `criarUsuarioInterno`, `reenviarConvite`, `gerarLinkConvite` e
  `enviarConviteDefinicaoSenha`.
- **Token:** o banco guarda só o hash. O link novo invalida o anterior.
- **Testes:** `administracao-acesso.smoke.test.ts`, que cobre o fluxo completo, a falha
  de envio, o reenvio e o link manual.

### U3. Atribuições (RF-041, RN-007)

**Como funciona.**
- **Onde:** na tela do usuário, a Administradora adiciona e remove projetos (para
  Colaborador Interno) ou tarefas (para Colaborador Externo).
- **Efeito:** o colaborador passa a ver o projeto ou a tarefa, e o cliente relacionado.
- **Atribuição automática:** ser responsável por uma tarefa ou subtarefa também dá acesso
  (ver RN-006 em `tarefas.md`).

**Detalhes técnicos.**
- **Rota:** `/usuarios/[id]`.
- **Funções:** `adicionarAtribuicao`, `removerAtribuicao`, `listarAtribuicoesDetalhadas`
  e `granularidadeDoPerfil`.
- **Regras:**
  - projeto só para `ADMIN_INTERNO` e tarefa só para `ADMIN_EXTERNO`;
  - nada para `ADMIN` ou `CLIENTE`.
- **Testes:**
  - `usuarios-rn007.integration.test.ts`, com 29 casos que cobrem serviço e RLS,
    granularidade e escrita direta recusada;
  - `autenticacao-permissoes.integration.test.ts`, que cobre a visibilidade por perfil.

### U4. Desativar e reativar usuário (RF-039)

**Como funciona.**
- **Desativar:** o usuário desativado não consegue mais entrar, e o histórico dele é
  mantido.
- **Sessão aberta:** a desativação bloqueia o próximo request autenticado e leva a pessoa
  de volta ao login. Se o perfil mudar, o novo perfil vale no request seguinte.
- **Proteção:** a Administradora não pode desativar a si mesma.

**Detalhes técnicos.**
- **Função:** `definirAtivo` com a entidade `usuario`. O caso `auto_desativacao` é
  recusado.
- **Revalidação:** `obterContexto` consulta `ativo` e `perfil` do banco; não confia nos
  claims antigos do JWT para autorização. Ver também `autenticacao-acesso.md`.
- **Testes:** `administracao-acesso.smoke.test.ts` e
  `revalidacao-sessao.integration.test.ts`.

### U5. Meu Perfil (RF-042)

**Como funciona.**
- **Para todos os perfis:** qualquer usuário vê os próprios dados e atribuições, altera o
  próprio nome e troca a senha, informando a senha atual.
- **Primeira senha:** quem ainda não ativou o acesso define a senha pelo link do convite.

**Detalhes técnicos.**
- **Rota:** `/meu-perfil`.
- **Funções:** `atualizarMeuNome` e `alterarMinhaSenha`, que aplicam a política de senha
  (ver `autenticacao-acesso.md`).
- **Teste:** `meu-perfil-rf042.integration.test.ts`, com 8 casos.

---

## Limitações e pendências conhecidas

| # | Situação | Efeito |
|---|---|---|
| — | Não há limitação conhecida para desativação ou atualização de perfil durante uma sessão aberta. | — |

## Histórico de alterações

| Data | Commit | Alteração |
|---|---|---|
| 2026-09-16 | `1169d46` | Sprint 3: usuários, atribuições, convites, desativação e Meu Perfil |
| 2026-09-16 | `363d7c2`, `ccb3962` | Campos extras no cadastro e alinhamento de ações na listagem |
| 2026-09-16 | `e8717c8` | Aviso de falha no envio do convite na listagem |
| 2026-09-16 | `41e4198` | Correção da edição do próprio nome, com testes do RF-042 |
| 2026-09-18 | `36bc769`, `29c71ee` | Link manual de convite, aberto em modal |
| 2026-09-18 | `6afd91d` | Organização das ações na lista de usuários |
| 2026-09-30 | `1d88b94` | Máscara e validação do telefone celular; ver [análise](../analises/formatacao-campos-telefone.md) |
| 2026-10-01 | `9bce2c0` | Sessões passam a respeitar a desativação e o perfil atual ([análise](../analises/revalidacao-sessao-usuarios.md)) |
