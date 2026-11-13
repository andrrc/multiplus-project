# Interface e legibilidade

## Visão geral

Padrões visuais compartilhados pelo login, painel, telas dos colaboradores e portal.

## Quem pode fazer o quê

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Usar a interface nas telas acessíveis | Sim | Sim | Sim | Sim |

## Funcionalidades

### Meu perfil

**Como funciona.** Os dados pessoais, a troca de senha e as atribuições existentes
aparecem em seções separadas, seguindo o modelo visual de perfil. Os campos se
organizam em duas colunas no desktop e uma no celular. Os dados editáveis
e as atribuições continuam sujeitos às regras atuais de cada perfil.

**Detalhes técnicos.** A rota `/meu-perfil` reorganiza a apresentação de dados já
consultados e mantém os formulários e ações existentes. A jornada de navegador em
`tests/browser/jornadas.spec.ts` cobre a troca de senha.

### Navegação e identidade dos modelos

**Como funciona.** O menu lateral organiza os acessos do perfil em grupos, com os ícones e
as cores dos modelos. A rota atual ganha uma barra verde. No rodapé do menu ficam o avatar
com a inicial, o nome, o perfil e os ícones de Meu perfil e Sair. Há uma barra superior de
64 px: no desktop ela aparece só para a Administradora, com o botão "Novo", que abre atalhos
para Novo projeto, Novo cliente e Novo usuário; no celular ela traz o botão que abre o menu.
No celular o menu abre como gaveta lateral sobre um fundo escurecido, fecha ao navegar, ao
tocar fora ou com Esc. A caixa de avisos aparece como Avisos, com o contador de não lidos.

**Detalhes técnicos.** `casca-painel.tsx` guarda o estado da gaveta e monta menu, barra e
conteúdo; `layout.tsx` (servidor) entrega o menu, o rodapé e as ações. `navegacao-painel.tsx`
organiza visualmente os itens de `menuDoPerfil`, sem alterar a matriz de permissões nem as
rotas; Meu perfil continua no `MENU` (para a guarda de rota) mas sai da lista, pois fica no
rodapé. `botao-novo.tsx` usa só rotas já existentes. Os ícones estão em `icones-shell.tsx`.
Os rótulos passaram a usar minúsculas ("Colaborador interno", "Meus projetos", "Minhas
tarefas", "Meu perfil"). A paleta de tokens e a tipografia estão na
[identidade visual](../Identidade_Visual_Multiplus.md).

**Pendências desta área.** A busca geral da barra superior, o seletor de unidade e o botão
"Gerar relatório" do cliente e a barra do colaborador externo dependem de dados e regras
ainda não decididos e não foram criados. O item Painel e a página de Configurações dependem
de rotas novas.

### Listas de projetos, tarefas e subtarefas

**Como funciona.** As três listas seguem o mesmo padrão dos modelos. No desktop, cada uma é
uma tabela dentro de um cartão e a linha inteira abre o registro. No celular cada linha vira
um cartão, sem rolagem lateral. O status aparece como texto com um ponto colorido e o prazo
mostra a data com o selo de situação ("Atrasado N dias", "Vence hoje", "Amanhã", "Em N dias").
Acima da tabela há os filtros, os botões de situação do prazo com contagem (Todos, Atrasados,
Vencem em até N dias, No prazo, Sem prazo), a linha com o total de resultados e o link
"Limpar filtros". As contagens dos botões consideram os demais filtros e não o botão de
situação. Em Projetos a busca é aplicada enquanto se digita, sem botão "Filtrar". Em
Subtarefas continuam o indicador "Em dia", as conclusões aguardando confirmação e o filtro
"Mostrar concluídas e canceladas". Itens abertos aparecem antes dos concluídos e cancelados.

**Detalhes técnicos.** `src/ui/lista.tsx` reúne as peças da tabela responsiva (`TabelaLista`,
`LinhaLista`, `CelulaLista`, `TituloLinha` com link esticado, `StatusPonto`, `CelulaPrazo`,
`ProgressoBarra`). A situação do prazo é decidida por `src/lib/situacao-prazo.ts`, com o mesmo
limite de dias do semáforo, e vai na URL como `situacao`. `filtros-listagens.tsx` (tarefas e
subtarefas) e `projetos/filtros-projetos.tsx` atualizam a URL e a página refaz a consulta no
servidor. O PDF de tarefas e subtarefas ignora o filtro de situação. As classes de botão
ficam em `src/ui/botoes.ts` e `calcularDiasRestantes` passou para `src/lib/datas.ts`
(reexportado por `indicador-dias-restantes.tsx`). Testes: `tests/unit/situacao-prazo.unit.test.ts`,
`tests/unit/filtro-responsavel.unit.test.ts` e a jornada de `tests/browser/jornadas.spec.ts`.

**Pendências desta área.** Busca por texto em Tarefas e Subtarefas, ordenação clicável nas
colunas, a coluna de etiquetas nas subtarefas e o texto do responsável com seu papel dependem
de consultas novas e não foram criados. O PDF não aplica a situação do prazo.

### Lista e ficha de clientes

**Como funciona.** A lista de clientes usa a mesma tabela das outras listas (ID em coluna própria, cliente
com o CNPJ/CPF logo abaixo, segmento, cidade e situação) e vira cartões no celular. Segmento ou cidade vazios
aparecem como "Não informado" em âmbar. A ficha tem trilha de navegação, cabeçalho com ID, documento, segmento,
cidade e "Cliente desde", e um resumo (projetos ativos, próxima conclusão prevista, portal do cliente e data de
cadastro). Abaixo, projetos, pessoas envolvidas e laudo técnico ocupam a coluna principal; dados da empresa,
responsável legal, ponto de contato, portal do cliente e documentos ficam na coluna lateral, que no celular vem
depois. O laudo mostra o selo "Só a administradora vê".

**Detalhes técnicos.** `clientes/page.tsx`, `clientes/filtros-clientes.tsx` e `clientes/[id]/page.tsx`, com
`src/ui/cartao.tsx` (`Cartao`, `CartaoLateral`, `BlocoLateral`, `ListaChaveValor`, `NaoInformado`) e `src/ui/lista.tsx`.
As permissões e o mascaramento não mudaram: o telefone continua vindo mascarado da consulta e o resumo do portal,
o laudo e os valores só aparecem para a Administradora. A jornada de `tests/browser/jornadas.spec.ts` abre a ficha
no desktop e a 375 px e confere que não há rolagem lateral.

### Detalhe de projeto e de tarefa

**Como funciona.** As duas páginas seguem o mesmo desenho: trilha de navegação, cabeçalho com o status em botão com
menu, "Editar" e "Desativar", uma faixa de resumo e duas colunas. No projeto, o resumo mostra prazo, progresso com
barra, pendências (itens atrasados e tarefas que vencem dentro do limite do semáforo) e valor contratado; as tarefas
abrem filtradas em "Abertas", com "Todas" a um clique. Na tarefa, o resumo mostra prazo, responsável, subtarefas e
recorrência, e as subtarefas são linhas expansíveis dentro de um cartão. Os comentários ficam em um cartão com
avatar, e a coluna lateral reúne descrição, documentos, configuração e registro. Desativar o projeto ou a tarefa
agora abre uma janela de confirmação; a tarefa deixou de ter o botão "Excluir tarefa" (a ação sempre foi a
desativação, que é reversível).

**Detalhes técnicos.** `projetos/[id]/page.tsx`, `tarefas/[id]/page.tsx`, `projetos/comentarios.tsx`,
`src/ui/cartao.tsx` (`Trilha`, `FaixaResumo`, `CelulaResumo`, `Avatar`), `src/ui/botao-confirmacao.tsx` (janela
`<dialog>` com a ação do servidor) e `src/ui/status-inline.tsx`. `StatusPonto` ficou em `src/ui/status-ponto.tsx`, sem
importar código de servidor, porque o menu de status é um componente de cliente. As ações, permissões e dados não
mudaram. A jornada de `tests/browser/jornadas.spec.ts` abre as duas páginas, cancela a confirmação e confere a
tarefa a 375 px.

**Pendências desta área.** "Quem acessa este projeto", histórico automático junto dos comentários, comprovantes das
subtarefas, "Cobrar responsável", rejeição com motivo, duplicar e exportar PDF do projeto, "Próxima ocorrência" da
tarefa e o texto de "Atribuição pendente" no cabeçalho dependem de dados ou regras novas.

### Lista, cadastro e detalhe de usuários

**Como funciona.** A lista de usuários usa a mesma tabela das outras listas (nome com e-mail e cargo, perfil, o que acessa,
situação com ponto colorido e as ações de cada pessoa) e vira cartões no celular. Acima dela há a busca, a situação do
acesso e botões de perfil com contagem. O cadastro tem etapas em cartões numerados (identificação, perfil de acesso,
atribuições), perfis como cartões selecionáveis e um rodapé fixo que resume o que a pessoa vai ver, com Cancelar e o envio
do convite. O detalhe tem trilha, avatar e a situação em texto com ponto. As etapas numeradas dos formulários de cliente,
projeto e tarefa passaram a usar o mesmo cartão.

**Detalhes técnicos.** `usuarios/page.tsx`, `usuarios/filtros-usuarios.tsx`, `usuarios/usuario-form.tsx`, `usuarios/[id]/page.tsx`
e `SecaoNumerada` em `src/ui/campo.tsx`. As permissões e as ações não mudaram. A jornada de `tests/browser/jornadas.spec.ts`
abre a lista e o cadastro no desktop e a 375 px.

**Pendências desta área.** Lista única com clientes e externos, filtro por empresa, "Último acesso" e escolha da empresa antes
do perfil no cadastro.

### Avisos e agenda

**Como funciona.** Os avisos aparecem agrupados por período (Hoje, Ontem, Esta semana e Anteriores), cada um com ícone do tipo,
título, mensagem e horário; os não lidos ganham fundo azul claro e um ponto. Há os botões "Todos" e "Não lidos", com contagem,
e um seletor de tipo. A mesma lista serve à Administradora e aos colaboradores. A agenda mostra o mês com os prazos coloridos
pelo semáforo (atrasado, vence em breve e no prazo), visitas e reuniões em roxo e a próxima ocorrência de tarefa recorrente
tracejada. Clicar no número do dia abre os prazos dele no painel ao lado; é possível alternar entre Mês e Lista, e os filtros de
cliente, projeto e tipo valem na hora. No celular a agenda mostra a lista de prazos por dia.

**Detalhes técnicos.** `notificacoes/lista-avisos.tsx`, `notificacoes/filtros-avisos.tsx`, `notificacoes/page.tsx`,
`minhas-notificacoes/page.tsx`, `src/lib/avisos-agrupamento.ts` (período pelo dia civil em Brasília),
`agenda/page.tsx`, `agenda/filtros-agenda.tsx` e `src/lib/agenda-itens.ts` (classe de cor de cada item, com o limite do semáforo).
Testes: `tests/unit/avisos-agrupamento.unit.test.ts`, `tests/unit/agenda-itens.unit.test.ts` e a jornada de
`tests/browser/jornadas.spec.ts`. Na caixa da Administradora, o status do envio de prazos, o semáforo e as preferências por perfil
continuam ao lado da lista até existir a página de Configurações.

**Pendências desta área.** "Marcar como não lido", ações diretas nos avisos (ver comprovantes, cobrar responsável), contexto de
cada aviso, faixa de atrasados de meses anteriores, "Exportar PDF" da agenda e filtro por responsável.

### Telas do colaborador interno

**Como funciona.** Minhas tarefas é uma tabela (tarefa com código e andamento das subtarefas, projeto e cliente, prazo com selo e
status com ponto) com botões de situação do prazo e contagem. Meus projetos são cartões com o cliente, o status, o anel de progresso,
o prazo com selo, as contagens de tarefas abertas, atrasadas e concluídas e a próxima entrega. O detalhe do projeto e o da tarefa seguem
o mesmo desenho da administradora (trilha, resumo em faixa, cartões e coluna lateral); na tarefa continuam o pedido e a retirada de
conclusão, com o aviso de que a Talita confirma. Os clientes viram uma tabela e uma ficha com projetos acessíveis, dados e documentos.
O que cada colaborador pode ver e fazer não mudou.

**Detalhes técnicos.** `minhas-tarefas/page.tsx`, `minhas-tarefas/[id]/page.tsx`, `meus-projetos/page.tsx`, `meus-projetos/[id]/page.tsx`,
`meus-clientes/page.tsx` e `meus-clientes/[id]/page.tsx`, com `src/ui/botoes-situacao.tsx` (filtro de situação por URL) e `AnelProgresso`
em `src/ui/lista.tsx`. O rodapé do menu deixou de cortar o nome do perfil. O teste `tests/browser/colaborador.spec.ts` entra como
colaborador interno, abre as seis telas e confere que cabem em 1024 e 375 px.

**Pendências desta área.** Painel, agenda, abas "Minhas" e "Da equipe", busca, subtarefas na lista de tarefas, "Concluir" direto na linha,
as contagens "minhas pendências" por pessoa em Meus projetos, comentários no nível da tarefa e "Quem acessa" dependem de dados, regras
ou permissão novos.

### Tela de tarefas do colaborador externo

**Como funciona.** Quem entra como colaborador externo vê, em Minhas tarefas, uma tela própria feita para o celular: saudação com o
primeiro nome, pílulas de resumo (atrasadas, vencem em breve e para fazer) e as tarefas em cartões grandes, agrupadas em "Para fazer" e
"Concluídas". Cada cartão tem uma barra lateral na cor do prazo (vermelho vencido, âmbar próximo, verde no prazo, roxo visita), o nome
da tarefa e do projeto, a data com o selo de prazo, o andamento das subtarefas e a recorrência. Tocar no cartão abre o detalhe da tarefa.

**Detalhes técnicos.** `minhas-tarefas/page.tsx` escolhe a tela pelo perfil e `minhas-tarefas/tela-externo.tsx` a monta, com os mesmos
dados de antes. Esta tela é só visual: **o menu e os dados do externo continuam os mesmos do interno** (Meus projetos e Clientes seguem
no menu, e cliente e projeto aparecem nas tarefas). O teste `tests/browser/colaborador.spec.ts` entra como externo, confere a saudação,
o grupo e a ausência de rolagem lateral a 375 px.

**Pendências desta área.** A restrição do menu e dos dados do externo (só Minhas tarefas, Avisos e Instruções, sem cliente nem projeto)
muda permissão e exige análise aprovada antes. Também dependem de dados novos: grupos "Devolvidas para correção" e "Aguardando conferência",
envio de comprovantes, pedido de prazo, mensagens e a página de Instruções.

### Recuperar e definir senha

**Como funciona.** As telas de "Esqueci minha senha" e "Definir senha" seguem o visual do
login: painel com foto ao lado, formulário centralizado, aviso de erro e de sucesso no
padrão dos modelos. Ao definir a senha, há o botão Mostrar/Ocultar e os requisitos da senha
são marcados enquanto se digita.

**Detalhes técnicos.** `src/app/auth-shell.tsx` reaproveita o CSS do login
(`src/app/login/login-reference.css`, escopo `.login-reference`). Os formulários usam as
classes desse CSS (`.field`, `.btn`, `.alert`, `.notice`, `.reqs`), pois o reset do escopo
anula utilitários de espaçamento do Tailwind dentro dele. As regras de senha e os fluxos não
mudaram. A jornada de navegador em `tests/browser/jornadas.spec.ts` cobre a definição de senha.

### Alinhamento do painel em telas largas

**Como funciona.** O conteúdo do painel começa junto à margem interna ao lado do menu, mesmo em monitores largos, mantendo a largura máxima de 1280 px.

**Detalhes técnicos.** O layout compartilhado em `src/app/(painel)/layout.tsx` alinha à esquerda o conteúdo das páginas do painel. Não altera permissões ou dados.

### Rolagem horizontal das tabelas

**Como funciona.** As tabelas largas mantêm rolagem interna e podem ser acessadas pelo teclado, sem exibir uma mensagem adicional instruindo o usuário a deslizar para ver outras colunas.

**Detalhes técnicos.** `src/ui/rolagem-horizontal.tsx` mantém a região com `overflow-auto`, rótulo acessível e foco por teclado. A medição do excesso de largura e a dica visual foram removidas. A mudança é apenas de interface e não altera dados ou permissões.

### I1. Escala de texto

**Como funciona.** A interface usa a escala dos modelos da Múltiplus, com texto-base de
14 px e controles que mantêm área mínima de toque. O zoom e o tamanho de texto
configurados no navegador continuam disponíveis.

**Detalhes técnicos.** `src/app/globals.css` define o texto-base em `rem`; as classes
utilitárias especificam os demais tamanhos. A escala ampliada anteriormente foi
substituída para acompanhar as referências aprovadas de 2026-11-10.

### I2. Tipografia compartilhada

**Como funciona.** As telas usam IBM Plex Sans em textos, campos, botões e números,
conforme os modelos de referência da Múltiplus. A migração visual das telas segue
por etapas; a escala de tamanhos existente permanece até cada tela ser adaptada.

**Detalhes técnicos.** `src/app/layout.tsx` carrega os arquivos locais com
`next/font/local`; os tokens de interface e leitura em `src/app/globals.css`
utilizam a mesma família. Arquivos e licença estão em `src/app/fonts/ibm-plex-sans`.
Não há mudança de dados ou permissões.

### I3. Dependência do framework atualizada por segurança

**Como funciona.** A aplicação usa uma versão corrigida do Next.js para atender a uma
recomendação de segurança do framework. Esta atualização não altera as telas nem as
permissões dos perfis.

**Detalhes técnicos.** `next` e `eslint-config-next` estão fixados em `16.4.1` em
`package.json`, com as dependências resolvidas em `package-lock.json`. A atualização
corrige o alerta [GHSA-673q-mjm6-r5xr](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr).
Verificação: Prisma Client, typecheck, lint e suíte completa. A auditoria de produção
continua apontando vulnerabilidades transitivas em MinIO e Prisma; a correção automática
exige mudanças incompatíveis e deve ser avaliada separadamente.

## Limitações e pendências conhecidas

- Telas internas precisam de conferência visual com sessão autenticada.
- As telas individuais ainda precisam ser conferidas após a mudança da escala compartilhada.
- E-mails e materiais impressos usam suas próprias escalas.
- **Migração para os protótipos de `telas-novas/` (iniciada em 13/11/2026).** A meta é copiar o
  visual por inteiro. O mapa de cada protótipo, a página real e a situação está em
  [mapeamento](../mapeamento-telas-talita.md). Ficam como pendência, por exigirem dado, regra ou
  permissão: comprovantes (envio, confirmação e rejeição), cobrança de responsável, histórico
  automático, régua de avisos, resumo mensal, PDF de relatório do cliente, unidades e Drive do
  cliente, vídeo e contatos das Instruções, "Ver como cliente", último acesso, duplicar e
  exportar projeto, pausa de prazo, status "A iniciar" de subtarefa e pedidos de prazo do
  colaborador externo.
- A restrição de menu e de dados do colaborador externo e a liberação da agenda ao colaborador
  interno mudam permissão e exigem análise aprovada antes de aplicar.

## Histórico de alterações

| Data | Commit | Alteração |
|---|---|---|
| 2026-11-13 | este commit | Tela própria de tarefas do colaborador externo, só visual e sem restringir menu nem dados |
| 2026-11-13 | este commit | Refazer as telas do colaborador interno no padrão dos protótipos (ver [Tarefas](tarefas.md), [Projetos](projetos.md) e [Clientes](clientes.md)) |
| 2026-11-13 | este commit | Ajustes da conferência visual contra os protótipos: seta pequena nos seletores, botões de 32 px nos cabeçalhos de cartão e nas ações dos avisos, colunas alinhadas nas linhas de tarefa e subtarefa (só em telas largas), ID em negrito na lista de clientes, resumo da ficha sem data repetida, formulário de usuário em duas colunas e correção de um erro de serialização na agenda |
| 2026-11-13 | este commit | Refazer a caixa de avisos e a agenda no padrão dos protótipos (ver [Notificações](notificacoes.md) e [Agenda](agenda.md)) |
| 2026-11-13 | este commit | Refazer lista, cadastro e detalhe de usuários no padrão do protótipo (ver [Usuários](usuarios.md)) |
| 2026-11-13 | este commit | Refazer o detalhe de projeto e de tarefa no padrão dos protótipos, com confirmação ao desativar (ver [Projetos](projetos.md) e [Tarefas](tarefas.md)) |
| 2026-11-13 | este commit | Refazer a lista e a ficha de clientes no padrão do protótipo (ver [Clientes](clientes.md)) |
| 2026-11-13 | este commit | Refazer as listas de projetos, tarefas e subtarefas no padrão dos modelos: tabela que vira cartões no celular, status com ponto, selo de prazo com data e filtro de situação com contagem |
| 2026-11-13 | este commit | Refazer o shell: menu com rodapé de avatar, barra superior com "Novo" (Administradora), gaveta no celular e telas de senha no padrão do login |
| 2026-11-13 | este commit | Aplicar a base visual dos protótipos: tokens `ink`, `faint`, `linha-forte` e `ambar-cl`, raios 8/6/5 px, selo de prazo claro ("Em N dias", "Amanhã"), selos e status sem borda, campos com foco em anel azul, fim do lilás em "A iniciar" e das bordas laterais coloridas decorativas |
| 2026-11-13 | este commit | Adotar os protótipos de `telas-novas/` como fonte da verdade visual: regras de `AGENTS.md` §6 e da [identidade visual](../Identidade_Visual_Multiplus.md) atualizadas (raios 8/6/5 px, sombras só em camadas flutuantes, botão azul-escuro, IBM Plex Sans) e [mapa das telas](../mapeamento-telas-talita.md) corrigido |
| 2026-11-10 | este commit | Adaptar a apresentação da tela compartilhada de perfil |
| 2026-11-10 | este commit | Iniciar adaptação da identidade visual pela tipografia compartilhada |
| 2026-11-03 | este commit | Remover a dica “Deslize para ver as demais colunas” das tabelas com rolagem horizontal |
| 2026-11-03 | este commit | Alinhar conteúdo do painel à margem interna em telas largas |
| 2026-10-29 | este commit | Carregar Raleway e Montserrat por arquivos locais para remover a dependência de fontes remotas no build ([análise](../analises/falha-build-fontes-nextjs.md)) |
| 2026-10-27 | este commit | Documentar fluxos e decisões do código em português do Brasil ([guia](../codigo/README.md), [análise](../analises/documentacao-codigo-portugues.md)) |
| 2026-10-23 | este commit | Atualizar Next.js e eslint-config-next para 16.4.1 por segurança ([análise](../analises/atualizacao-seguranca-nextjs.md)) |
| 2026-10-21 | este commit | Aplicar Raleway, Montserrat e Droid Serif por papel visual, mantendo os tamanhos atuais |
| 2026-10-21 | 0df5f7d | Ampliar novamente os textos, de 10% para 20% sobre a escala original, a pedido do usuário |
| 2026-10-21 | b7bb72e | Ampliar textos em 10% após relato da Talita; análise dispensada por ser exclusivamente visual |
