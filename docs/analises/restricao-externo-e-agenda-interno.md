# Análise: restrição do colaborador externo e agenda do colaborador interno

- **Data:** 2026-11-13
- **Pedido original:** concluir os itens que a migração visual deixou pendentes por dependerem de decisão de permissão: (1) o protótipo do colaborador externo mostra só Minhas tarefas, Avisos, Instruções e Perfil, mas o sistema entrega a ele o mesmo menu do colaborador interno; (2) o protótipo do colaborador interno traz uma Agenda (`telas-novas/colaborador-interno/07-agenda.html`), que hoje só a administração acessa.
- **Status:** aguardando aprovação. Nenhum código, menu, rota ou política de banco foi alterado.

## 1. Escopo previsto

**Parte A, colaborador externo.** Hoje `menuDoPerfil("ADMIN_EXTERNO")` devolve Notificações, Clientes, Meus projetos, Minhas tarefas e Meu perfil (`src/lib/navegacao.ts`). O protótipo mostra só tarefas, avisos, instruções e perfil. Restringir o menu, sozinho, não restringe nada: `/meus-clientes` e `/meus-projetos` continuam respondendo a quem digitar a URL, porque a guarda de rota deriva do mesmo `MENU`. Por isso a proposta tira as duas rotas do perfil no `MENU` (menu e guarda caem juntos) e confere o que o banco já entrega.

**Parte B, agenda do interno.** `/agenda` é só `ADMIN`, e `listarPrazos` (base de `listarItensAgenda`) recusa os demais perfis com "Ação restrita ao Administrador". Para o interno, seria preciso uma consulta própria, limitada ao escopo dele.

Fora do escopo: criar Instruções (descreve envio de comprovante, que não existe), envio de comprovantes, pedido de prazo e impedimento do externo.

## 2. O que existe hoje (levantado no código)

- **Escopo do externo, por tarefa.** A RLS libera tarefa por atribuição direta, e projeto, cliente, documentos, responsáveis e pessoas do cliente por herança dessa tarefa (`20260916190000_rls_heranca_projetos_tarefas`, `20260909135654_cadastro_clientes_rls_masking`). O telefone do responsável legal e do ponto de contato é mascarado (RF-020).
- **Escopo do interno, por projeto.** Atribuição ao projeto libera o projeto e suas tarefas.
- **Cadastro do cliente para colaboradores.** `buscarClienteContextual` (`src/lib/clientes.ts`) seleciona CNPJ/CPF, RG, endereço, CEP, atividade, porte, origem do contato e documentos, e `/meus-clientes/[id]` exibe RG, endereço e documentos. O comentário da própria função diz "expõe somente o nome do cliente... não selecione CNPJ/CPF, endereço, e-mail, telefone, pessoas envolvidas, documentos". **O código contradiz a regra escrita**, para o interno e para o externo.
- **Tarefa do externo.** `minhas-tarefas/page.tsx` já tem tela própria para `ADMIN_EXTERNO`; `listarTarefasAtribuidas` filtra por atribuição, responsabilidade ou subtarefa atribuída.
- **Avisos.** `/minhas-notificacoes` é por `ctx.usuarioId`; isolada por pessoa.

## 3. Permissões propostas

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Menu: Minhas tarefas, Avisos, Meu perfil | Não se aplica | Sim | Sim | Não |
| Menu e rota `/meus-projetos` | Não se aplica | Sim | **Não (proposta)** | Não |
| Menu e rota `/meus-clientes` | Não se aplica | Sim | **Não (proposta)** | Não |
| Ver a tarefa atribuída e seus dados | Sim | Sim | Sim | Não |
| Ver nome do cliente e do projeto dentro da tarefa | Sim | Sim | Sim (decisão 2) | Não |
| Ver CPF/RG/endereço/documentos do cliente | Sim | **Decisão 3** | **Não (proposta)** | Não |
| Agenda com prazos do próprio escopo | Sim (já existe) | **Sim (proposta)** | Não (decisão 4) | Não |

Toda checagem continua no servidor (função de `src/lib` ou server action) e no RLS; esconder o item de menu nunca é a barreira.

## 4. Dados

- **Sem migration** para a parte A: a RLS por tarefa já limita o que o externo lê; a mudança é de rota e de colunas selecionadas.
- **Parte B:** nova função `listarItensAgendaColaborador` com `comContextoDeUsuario`, reaproveitando `listarTarefasAtribuidas`/`listarProjetosAtribuidos` (que já respeitam o escopo) e a projeção de recorrências de `listarItensAgenda`. Só tarefa, prazo, status, projeto e nome do cliente; sem valores, laudo nem dados cadastrais. Não exige migration.
- Corrigir `buscarClienteContextual`/`listarClientesContextuais` para a regra escrita no comentário exige tirar colunas do `select` e do componente, sem alterar o banco.

## 5. Impacto em telas e funções existentes

- `src/lib/navegacao.ts`: `/meus-projetos` e `/meus-clientes` passam a `["ADMIN_INTERNO"]`; `/agenda` ganha `ADMIN_INTERNO` (ou rota própria `/minha-agenda`, ver decisão 5).
- Redirecionamentos de avisos antigos: `notificacoes-rotas.ts` e links de e-mail/avisos que apontem para `/meus-projetos/...` ou `/meus-clientes/...` para o externo precisam cair em `/minhas-tarefas/...`.
- `minhas-tarefas/[id]`: confere se a tarefa do externo ainda mostra o nome do projeto e do cliente sem link para as rotas retiradas.
- Testes a ajustar: `tests/unit/administracao-acesso.unit.test.ts` (matriz de menu e guarda por perfil), `tests/browser/colaborador.spec.ts` (o externo não abre mais as duas rotas), integração de RLS do externo.
- Docs: `autenticacao-acesso.md`, `interface.md`, `decisoes-desenvolvimento.md`.

## 6. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| Externo seguir acessando `/meus-clientes` e `/meus-projetos` por URL | Tirar o perfil do `MENU`: menu e guarda saem juntos | Unitário: `perfilPodeAcessar("ADMIN_EXTERNO", rota)` é falso; navegador: redireciona |
| Dado cadastral do cliente (CPF, RG, endereço, documentos) chegar ao navegador do externo | Reduzir o `select` na consulta, não esconder o campo na tela | Integração: a consulta contextual não devolve esses campos |
| Aviso antigo com link para rota retirada | Mapear para a rota da tarefa no `notificacoes-rotas.ts` | Unitário de rotas de aviso por perfil |
| Agenda do interno vazar tarefa de projeto fora do escopo | Consulta nova com `comContextoDeUsuario` e RLS, nunca `listarPrazos` | Integração: interno A não vê item do projeto de B; perfil não permitido recebe erro |
| Recorrência projetada mostrar prazo de tarefa sem acesso | Projetar só a partir das tarefas já filtradas | Integração com tarefa recorrente |

## 7. Casos-limite e estados

- Externo sem nenhuma atribuição: Minhas tarefas mostra o estado vazio atual.
- Externo com tarefa de um projeto cujo cliente foi desativado: sai da lista (RF-039), sem erro.
- Interno com projeto atribuído e nenhuma tarefa com prazo no mês: agenda vazia, sem item fantasma.
- Tarefa sem prazo não aparece na agenda; recorrência segue a regra atual.
- Link de e-mail antigo para as rotas retiradas: redireciona, não responde 404.

## 8. Interface

Menu do externo segue o protótipo: Minhas tarefas, Avisos, Meu perfil (Instruções só quando existir o conteúdo real). Agenda do interno reaproveita a agenda da administração em modo somente leitura, sem "Novo" e sem filtro de cliente. Cores e componentes pelos tokens atuais; conferir 375 px e desktop.

## 9. Plano de testes

- Unitário: matriz de menu e de guarda por perfil, mapeamento de aviso para o externo.
- Integração: consulta contextual sem campos cadastrais (decisão 3); agenda do interno isolada por projeto; negação para externo, cliente e sem sessão.
- Navegador: externo não acessa as rotas retiradas; interno abre a agenda; ambos sem rolagem lateral a 375 px.

## 10. Perguntas em aberto

1. **Restringir o externo às rotas?** Recomendação: sim, tirar `/meus-projetos` e `/meus-clientes` do perfil dele, como no protótipo. — **Resposta:** pendente.
2. **Nome do projeto e do cliente dentro da tarefa do externo:** manter (ele precisa saber de qual cliente é o trabalho) ou mostrar só o nome da tarefa? Recomendação: manter só os nomes, sem link. — **Resposta:** pendente.
3. **Cadastro do cliente para o interno** (`/meus-clientes/[id]`): cumprir o comentário original (só nome e projetos) ou manter CPF/RG/endereço/documentos, que ele vê hoje? Recomendação: tirar RG, endereço e CEP e manter o que o trabalho exige; confirmar o que a Talita quer que o interno veja. — **Resposta:** pendente.
4. **Agenda do externo:** o protótipo não tem. Recomendação: não incluir. — **Resposta:** pendente.
5. **Rota da agenda do interno:** abrir `/agenda` também ao interno ou criar `/minha-agenda`? Recomendação: `/minha-agenda`, para a guarda de `/agenda` continuar só de ADMIN e a consulta ser separada. — **Resposta:** pendente.
