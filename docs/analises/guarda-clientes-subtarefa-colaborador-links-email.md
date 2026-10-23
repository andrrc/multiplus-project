# Análise: guarda das páginas de cliente, nova subtarefa do colaborador e links dos e-mails

- **Data:** 2026-10-15
- **Pedido original:** "Agora corrija os itens 1 a 3 da leitura" (itens da leitura completa do código feita em 2026-10-15)
- **Status:** aprovada em 2026-10-23

Os três itens são correções de bug fora da camada visual: os itens 1 e 3 envolvem permissão e
os itens 2 e 3 mexem em rotas. Por isso há uma seção para cada um dentro do modelo.

---

## 1. Escopo previsto

### Item 1 — Ficha e listagem de clientes abertas a colaboradores pela URL

**Problema.** `src/app/(painel)/clientes/page.tsx` e `clientes/[id]/page.tsx` chamam
`obterContexto()`, não `exigirAcessoARota("/clientes")`. O item de menu `/clientes` é só do
`ADMIN` (`src/lib/navegacao.ts`), mas um `ADMIN_INTERNO` ou `ADMIN_EXTERNO` que digitar
`/clientes/<id>` vê a ficha que a RLS liberar para ele:

- CNPJ/CPF, endereço, segmento e origem do contato;
- Responsável Legal e Ponto de Contato (telefone mascarado pela view);
- Pessoas Envolvidas **com telefone e e-mail** (a policy `pessoas_envolvidas_select` libera o
  `ADMIN_INTERNO` atribuído ao projeto);
- projetos e situação do acesso do cliente ao portal.

Isso contraria o RF-043 ("acesso direto por URL a rota fora do perfil é negado") e o desenho da
visão contextual de colaboradores (`listarClientesContextuais`/`buscarClienteContextual`, em
`/meus-clientes`), que usa consultas próprias e não expõe Pessoas Envolvidas, status de acesso
ao portal nem valores contratados. A visão contextual existente também mostra dados cadastrais
e documentos definidos por essas funções; esse conjunto não muda nesta correção.

As páginas `clientes/novo` e `clientes/[id]/editar` **já** redirecionam quem não é `ADMIN`. A
leitura anterior as incluiu por engano. Elas passam a usar a mesma guarda por padronização.

**Correção.**
1. As quatro páginas de `/clientes` passam a chamar `exigirAcessoARota("/clientes")`. Quem não é
   `ADMIN` é redirecionado para a tela inicial do perfil, igual às outras rotas do ADMIN.
2. Segunda camada em `src/lib/clientes.ts`: `listarClientes`, `listarCidadesComCliente`,
   `buscarClienteDetalheSeguro` e `buscarClienteParaEdicao` passam a exigir `ADMIN`, com a mesma
   mensagem das outras funções restritas ("Ação restrita ao Administrador."). Os ramos
   `ctx.perfil === "ADMIN" ? … : …` dentro de `buscarClienteDetalheSeguro` deixam de ter sentido e
   são simplificados.

### Item 2 — Colaborador não consegue abrir "Nova subtarefa"

**Problema.** Em `/minhas-tarefas/[id]`, o botão "+ Nova subtarefa" (exibido quando a tarefa
permite e o colaborador é o responsável direto) leva a `/tarefas/[id]/subtarefas/nova`. Essa página
chama `exigirAcessoARota("/tarefas")`, e `/tarefas` é só do `ADMIN`: o colaborador volta para
`/minhas-tarefas`. O ramo de colaborador da página (`buscarTarefaParaColaborador`) nunca é alcançado.
A regra no servidor (`criarSubtarefa`) e no banco funciona e tem teste
(`colaborador-cria-subtarefas.integration.test.ts`); só a tela é inacessível.

**Correção.**
1. Nova rota `/minhas-tarefas/[id]/subtarefas/nova`, protegida por
   `exigirAcessoARota("/minhas-tarefas")` (já liberada para `ADMIN_INTERNO` e `ADMIN_EXTERNO`). Ela
   exibe o formulário só se `buscarTarefaParaColaborador` devolver `podeCriarSubtarefas = true`; caso
   contrário, responde 404.
2. O formulário (título, descrição, prazo e etiquetas) sai da página atual para um componente
   compartilhado, usado pelas duas rotas. Na rota do colaborador não aparecem as escolhas de
   responsável ou status: ele fica como responsável e a subtarefa inicia em andamento, inclusive
   se a action receber campos forjados.
3. `/tarefas/[id]/subtarefas/nova` fica só para o `ADMIN`, e o ramo de colaborador sai dela.
4. O link em `minhas-tarefas/[id]/page.tsx` passa a apontar para a nova rota. Depois de salvar,
   `criarSubtarefaERedirecionarAction` já leva o colaborador para `/minhas-tarefas/[id]`.

### Item 3 — Links dos e-mails de notificação

**Problema A (link relativo).** `renderTemplateNotificacao` (`src/lib/email-templates.ts`) põe a
`url` do evento direto no botão "Abrir no Múltiplus": `href="/tarefas/<id>"`. Num cliente de e-mail
isso não abre o sistema. Afeta prazo próximo, atribuição recebida, novo comentário e tarefa/projeto
concluídos. Só o e-mail de menção (`renderTemplateMencaoComentario`) monta a URL completa com
`AUTH_URL`.

**Problema B (rota do perfil errado), achado nesta análise.** A mesma `url` vai para todos os
destinatários, exceto o `CLIENTE` (que recebe `urlCliente`):

- **Prazo próximo:** a URL é sempre `/tarefas/<id>`, mas o destinatário normalmente é o colaborador
  responsável, que não acessa `/tarefas` e cai em `/minhas-tarefas` sem abrir a tarefa.
- **Novo comentário e menção:** a rota é escolhida pelo perfil de **quem comentou**. Quando a
  Administradora comenta, o colaborador recebe `/tarefas/<id>`. Quando o colaborador comenta, a
  Administradora recebe `/minhas-tarefas/<id>`, que ela não acessa.

Nos dois casos o link leva à tela inicial em vez do registro, tanto no e-mail quanto na notificação
in-app.

**Correção.**
1. Função pura nova em `src/lib/notificacoes-rotas.ts`: `rotaDoRegistroParaPerfil(url, perfil)`.
   - Para o `ADMIN`, converte `/minhas-tarefas/<id>` em `/tarefas/<id>` e `/meus-projetos/<id>` em
     `/projetos/<id>`.
   - Para `ADMIN_INTERNO`/`ADMIN_EXTERNO`, faz o inverso. Ao converter uma tarefa com
     `?subtarefa=…#…`, remove query e fragmento, que só existem na tela do ADMIN, e mantém só
     `/minhas-tarefas/<tarefaId>`.
   - Qualquer outra rota volta sem mudança.
2. `dispararEventoNotificacao` e `dispararNotificacoesMencaoComentario` aplicam essa função para
   cada destinatário que não é `CLIENTE`, antes de gravar a notificação in-app e de montar o e-mail.
3. `renderLayoutEmail` resolve qualquer `acao.url` relativa com `new URL(url, AUTH_URL)`, como a
   menção já faz. Isso vale para todos os templates, e o de menção deixa de precisar do código
   próprio. URLs absolutas (convite) continuam como estão.
4. A notificação in-app continua gravando a rota relativa, porque o link interno funciona.

### O que fica de fora

- **RLS de `pessoas_envolvidas`:** continua liberando a leitura para o `ADMIN_INTERNO` atribuído
  ao projeto. Depois da correção, nenhuma tela de colaborador consulta essa tabela, mas o banco
  ainda permite (ver pergunta 1).
- Demais achados da leitura (itens 4 em diante).
- Central de notificações para quem não é `ADMIN` (item 5 da leitura).

## 2. Permissões

**Item 1** (rotas `/clientes`, `/clientes/[id]`, `/clientes/novo`, `/clientes/[id]/editar` e as
funções de leitura de `src/lib/clientes.ts`):

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Listar clientes (`/clientes`) | Sim | Não → `/minhas-tarefas` (hoje: sim, pela URL) | Não → `/minhas-tarefas` (hoje: sim, pela URL) | Não → `/portal` |
| Ver ficha completa (`/clientes/[id]`) | Sim | Não (hoje: sim, pela URL) | Não (hoje: sim, pela URL) | Não |
| Ver visão contextual (`/meus-clientes`) | — | Sim, sem mudança | Sim, sem mudança | — |
| Criar, editar, desativar | Sim | Não (sem mudança) | Não (sem mudança) | Não |

**Item 2:**

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| `/tarefas/[id]/subtarefas/nova` | Sim | Não | Não | Não |
| `/minhas-tarefas/[id]/subtarefas/nova` | Não (rota de colaborador) | Sim, se a tarefa permite e ele é o responsável direto | Idem | Não |

**Item 3:** nenhuma permissão muda. Os destinatários continuam os mesmos; só o link muda.

## 3. Dados

Não se aplica: sem migration, sem campo novo e sem backfill. As notificações in-app já gravadas
continuam com a URL antiga. Não vou corrigir as linhas antigas, porque são avisos já lidos ou
antigos e corrigi-los exigiria migration de dados (pergunta 3).

## 4. Impacto em telas e funções existentes

| Arquivo | Mudança |
|---|---|
| `src/app/(painel)/clientes/page.tsx`, `clientes/[id]/page.tsx`, `clientes/novo/page.tsx`, `clientes/[id]/editar/page.tsx` | `exigirAcessoARota("/clientes")` |
| `src/lib/clientes.ts` | `exigirAdministrador` nas quatro funções de leitura; simplificação de `buscarClienteDetalheSeguro` |
| `src/app/(painel)/tarefas/[id]/subtarefas/nova/page.tsx` | Só ADMIN; usa o formulário compartilhado |
| `src/app/(painel)/minhas-tarefas/[id]/subtarefas/nova/page.tsx` | **Nova** rota do colaborador |
| `src/app/(painel)/tarefas/[id]/subtarefas/form-nova-subtarefa.tsx` | **Novo** componente de formulário compartilhado |
| `src/app/(painel)/minhas-tarefas/[id]/page.tsx` | Link "+ Nova subtarefa" |
| `src/lib/notificacoes-rotas.ts` | **Novo**: `rotaDoRegistroParaPerfil` |
| `src/lib/notificacoes.ts` | Rota por destinatário em `dispararEventoNotificacao` e `dispararNotificacoesMencaoComentario` |
| `src/lib/email-templates.ts` | `renderLayoutEmail` resolve URL relativa; menção usa o mesmo caminho |
| Testes afetados | `tests/smoke/administracao-acesso.smoke.test.ts` (usa `listarClientes` como colaboradora; passa a usar `listarClientesContextuais`, que é a visão real dela); `tests/unit/notificacoes-email.unit.test.ts` (passa a esperar URL absoluta) |
| Documentação | `docs/funcionalidades/clientes.md`, `subtarefas.md`, `tarefas.md` (T10), `notificacoes.md`, `autenticacao-acesso.md` (RF-043), `docs/decisoes-desenvolvimento.md` |

`grep` conferido: só telas do ADMIN apontam para `/clientes/...` (`projetos`, `tarefas`,
`subtarefas`), então nenhum link de colaborador quebra.

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| Autorização só na interface | Guarda na página **e** na função de `src/lib/clientes.ts` | Integração: `listarClientes`/`buscarClienteDetalheSeguro` com `ADMIN_INTERNO` e `ADMIN_EXTERNO` lançam `/Ação restrita ao Administrador/`; com `ADMIN` continuam funcionando. Unitário: `perfilPodeAcessar` nega `/clientes/<id>` aos três perfis não ADMIN |
| Dado sensível no navegador | A página nem chega a consultar; a função lança antes da query | Mesmo teste acima |
| IDOR na nova rota de subtarefa (colaborador troca o id da tarefa) | A página usa `buscarTarefaParaColaborador` (RLS) + `podeCriarSubtarefas`; a action continua validando em `criarSubtarefa` | Integração existente (`colaborador-cria-subtarefas`) + novo caso: tarefa sem permissão ou de outro responsável → `buscarTarefaParaColaborador` não libera `podeCriarSubtarefas` |
| Colaborador definir outro responsável pelo formulário | `criarSubtarefa` já ignora o responsável enviado e usa o próprio usuário | Teste existente; novo caso enviando `atribuidoAUsuarioId` alheio |
| Link de e-mail apontando para host errado | Base vem de `AUTH_URL` (`https://${APP_DOMAIN}` em produção) | Unitário: `href="http://localhost:3000/tarefas/t-1?a=1&amp;b=2"` com `AUTH_URL` definido |
| Mudar a rota levar a uma tela onde o destinatário não tem acesso | Conversão só entre as rotas equivalentes de cada perfil; o `CLIENTE` continua com `urlCliente` | Unitário de `rotaDoRegistroParaPerfil` com os 3 perfis e rotas de projeto, tarefa e subtarefa |
| E-mail revelando dado a quem não tem acesso | Destinatários não mudam | Integração existente (`portal-cliente-sprint6`, `notificacoes-rf022`) |
| Teste dependente do comportamento antigo | `grep` de `listarClientes(`, `url:` e `/tarefas/` em `tests/` | Suíte completa |

## 6. Casos-limite e estados

- **Colaborador com link salvo para `/clientes/<id>`:** redirecionado para `/minhas-tarefas`.
- **Cliente desativado:** comportamento do ADMIN não muda (toggle "Mostrar desativados").
- **Nova subtarefa, tarefa desativada ou sem permissão:** 404 na rota do colaborador.
- **Colaborador perde a responsabilidade com o formulário aberto:** a action recusa com "Você não
  tem permissão para criar subtarefas nesta tarefa." (comportamento atual).
- **E-mail sem URL:** sem botão, como hoje.
- **`AUTH_URL` ausente em desenvolvimento:** usa `http://localhost:3000`, como o resto do código.
- **Rota que não é de projeto ou tarefa (ex.: `/portal/<id>`):** volta sem conversão.

## 7. Interface

- **Item 1:** nenhuma tela muda para o ADMIN.
- **Item 2:** a tela do colaborador é a mesma que o ADMIN já tem, com os mesmos componentes
  (`inputClass`, `SeletorEtiquetas`), sem o campo de responsável e com o "voltar" para
  `/minhas-tarefas/[id]`. Vou conferir em 375 px e no desktop.
- **Item 3:** o botão do e-mail continua igual; só o endereço muda.

## 8. Plano de testes

- **Unitário:**
  - `tests/unit/notificacoes-email.unit.test.ts`: URL absoluta no botão; URL absoluta de entrada
    (convite) preservada.
  - Novo `tests/unit/notificacoes-rotas.unit.test.ts`: conversão para cada perfil.
  - `tests/unit/navegacao` existente: `/clientes/<id>` negado a `ADMIN_INTERNO`, `ADMIN_EXTERNO` e
    `CLIENTE` (se ainda não estiver coberto).
- **Integração:**
  - Novo caso em teste de clientes: leitura restrita ao ADMIN nas quatro funções.
  - `notificacoes-rf022`: aviso de prazo para colaborador grava `/minhas-tarefas/<id>`.
  - Comentário do ADMIN avisa o colaborador com `/minhas-tarefas/<id>`; comentário do colaborador
    avisa o ADMIN com `/tarefas/<id>`.
  - Nova subtarefa do colaborador: casos de IDOR acima.
- **Smoke:** `administracao-acesso.smoke.test.ts` passa a verificar a visão real da colaboradora
  (`listarClientesContextuais`), com a mesma precisão (ids esperados).
- **Verificação completa:** `npx prisma generate`, `npm run typecheck`, `npm run lint`, `npm test`.

## 9. Perguntas em aberto

1. **RLS de `pessoas_envolvidas`:** depois desta correção, nenhuma tela de colaborador lê Pessoas
   Envolvidas. Quer que eu também restrinja a policy ao `ADMIN` (exige migration e talvez ajuste em
   outras consultas), ou fica para depois e eu registro como limitação? Minha sugestão: registrar
   como limitação agora e tratar numa análise própria. — **Resposta:** aprovada pelo usuário em
   2026-10-23; registrar como limitação e tratar em análise própria.
2. **Problema B do item 3** (link da rota do perfil errado): incluo nesta correção, como proposto,
   ou corrijo só o link relativo? Sem o problema B, o link do e-mail passa a abrir o sistema, mas
   o colaborador que recebe aviso de prazo continua caindo em `/minhas-tarefas` em vez da
   tarefa. — **Resposta:** incluir a correção B nesta alteração, aprovada pelo usuário em
   2026-10-23.
3. **Notificações in-app antigas** com a rota errada: deixo como estão (proposta) ou corrijo por
   migration de dados? — **Resposta:** deixar os registros antigos como estão, sem migration,
   aprovado pelo usuário em 2026-10-23.
4. **Commits:** proponho três commits, um por item (`fix(clientes)`, `fix(subtarefas)`,
   `fix(notificacoes)`), cada um com seu teste e a documentação do módulo. — **Resposta:** separar
   em três commits por tema, aprovado pelo usuário em 2026-10-23.
