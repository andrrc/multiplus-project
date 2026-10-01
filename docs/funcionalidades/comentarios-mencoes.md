# Comentários e menções

- **Última revisão:** 2026-09-30, no commit ce3b73f do `staging`.
- **Requisitos:** RF-016, RF-017, RF-047.
- **Módulos relacionados:** Projetos, Tarefas, Subtarefas, Notificações.

## Visão geral

Projetos, tarefas e subtarefas têm uma área de **comentários**. Cada comentário pode ter
um link e uma imagem. Comentários **não podem ser editados nem apagados** (RF-047). Ao
escrever `@` é possível **mencionar** alguém que tenha acesso ao registro, e a pessoa
mencionada recebe aviso pelos canais configurados para o perfil dela.

## Quem pode fazer o quê

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Ler e publicar comentários | Em qualquer registro | Nos registros a que tem acesso | Nos registros a que tem acesso | Não |
| Editar ou apagar comentário | Não (ninguém) | Não | Não | Não |
| Mencionar | Pessoas com acesso ao registro | Idem | Idem | Não |

---

## Funcionalidades

### M1. Publicar comentário com link e imagem (RF-016, RF-017)

**Como funciona.**
- **Conteúdo:** texto obrigatório, com link e imagem opcionais. O link, quando informado, deve ser uma URL absoluta `http` ou `https`; a regra é validada no servidor.
- **Imagem:** WebP, JPEG ou PNG, até 10 MB. Aparece como prévia, pode ser ampliada e
  pode ser salva.
- **Links:** aparecem destacados.

**Detalhes técnicos.**
- **Componentes:** `src/app/(painel)/projetos/comentarios.tsx` e
  `formulario-comentario.tsx`.
- **Função:** `criarComentario` (`src/lib/comentarios.ts`).
- **Imagem:**
  - o tipo é conferido pelos bytes do arquivo, não pela extensão (`detectarTipoImagem`);
  - o arquivo fica em bucket MinIO **privado** (`src/lib/storage.ts`);
  - a imagem é servida por `GET /api/comentarios/imagem/[id]`, com checagem de acesso.
- **Imutabilidade:** garantida pelo RLS, que não tem policy de `UPDATE` nem de `DELETE`.

### M2. Menções (@)

**Como funciona.**
- **Sugestões:** ao digitar `@`, o sistema sugere as pessoas que podem ver aquele
  registro, e a menção aparece em azul.
- **Avisos:** a pessoa mencionada recebe o aviso pelos canais configurados em “Novo
  comentário” para o perfil dela. Quem mencionou também recebe a confirmação, seguindo os
  canais configurados para o próprio perfil.
- **Demais pessoas com acesso:** recebem o aviso de novo comentário se estiverem ativas e a preferência do perfil permitir. Isso inclui o cliente vinculado ao registro quando a preferência de CLIENTE estiver habilitada. O autor não recebe aviso geral duplicado.

**Detalhes técnicos.**
- **Funções:** `listarUsuariosMencionaveis` e `dispararNotificacoesMencaoComentario`.
- **Validações:** o servidor recusa mencionar quem não tem acesso ao registro, e exige
  que o nome `@Fulano` continue no texto.
- **Preferências:** a menção e a confirmação do autor usam as preferências de
  `NOVO_COMENTARIO`; cada canal (e-mail e App) é aplicado separadamente.

---

## Limitações e pendências conhecidas

| # | Situação | Efeito |
|---|---|---|
| L2 | A cobertura automatizada de comentários continua parcial. | Há integração cobrindo os canais das menções e a lista explícita de destinatários em `notificacoes-rf022.integration.test.ts`; imutabilidade, validação de acesso da menção e acesso à imagem ainda não têm cobertura. |

## Histórico de alterações

| Data | Commit | Alteração |
|---|---|---|
| 2026-10-01 | pendente | Links de comentário limitados a URLs HTTP/HTTPS no servidor ([análise](../analises/validacao-esquema-links.md)) |
| 2026-10-01 | 83f7524 | Avisos de comentário limitados a usuários ativos com acesso ao registro ([análise](../analises/notificacao-comentario-com-acesso.md)) |
| 2026-09-30 | ce3b73f | Menções e confirmação do autor respeitam as preferências de canal ([análise](../analises/controle-total-notificacoes.md)) |
| 2026-09-17 | `df1f2dc`, `c4d87e6` | Bucket privado e upload autenticado de imagens |
| 2026-09-17 | `e974425` | Comentários imutáveis em projeto, tarefa e subtarefa (Sprint 4B) |
| 2026-09-18 | `d57f65d`, `ac9eb34`, `92eaf1f` | Prévia, ampliação e download da imagem |
| 2026-09-18 | `76587cf` | Links destacados |
| 2026-09-28 | `5c69415`, `bf5f696`, `38c36e5` | Menções com `@`, sugestões e e-mail, com destaque em azul |
