# Análise: central de notificações dos colaboradores

- **Data:** 2026-10-27
- **Pedido original:** “Hoje só a Talita, recebe notificação in-app, os outros tipos de usuarios, tipo colaborador interno e externo, não recebem notificação. Gostaria de criar uma funcionalidade de notificação in-app para os colaboradores também, a ideia seria criar um botão dentro do menu lateral, com um icone de um sino simbolizando notificação, ali irá listar todas as notificações que aquele usuario receber. Antes de executar quero estruturar a ideia.”
- **Status:** aprovada em 2026-10-27

## 1. Escopo previsto

O pedido combina acesso visual à caixa de entrada e expectativa de recebimento de notificações. A inspeção inicial encontrou uma caixa existente em `/minhas-notificacoes`, já disponível a `ADMIN_INTERNO` e `ADMIN_EXTERNO`, com lista individual, estado de leitura, ações para marcar como lida e limite atual de 50 registros. O menu lateral já tem um item de texto “Notificações” que abre essa rota para os colaboradores.

Também já há disparos in-app possíveis para colaboradores, conforme a preferência por perfil/evento e o acesso ao registro. Os eventos documentados incluem prazo próximo, solicitação/decisão de conclusão, comentário em registro acessível e atribuição recebida. Avisos de conclusão de tarefa/projeto são direcionados à conta ADMIN da Talita (e, conforme configuração, ao cliente vinculado), não aos colaboradores.

**Proposta para esta etapa, sujeita às respostas abaixo:**
- Tornar a entrada da caixa de notificações mais visível no menu lateral com ícone de sino, mantendo o destino e a autorização existentes.
- Exibir um indicador das notificações não lidas ao lado do sino, se aprovado; ele deve refletir apenas os avisos do usuário autenticado.
- Preservar a lista e as ações existentes. A ampliação dos eventos destinatários para colaboradores só deve ocorrer se o usuário indicar quais eventos hoje faltam; não ampliar a audiência de conclusão por inferência.
- Fora do escopo inicial proposto: notificações push, e-mail, preferências individuais, clientes no portal e mudanças nos eventos de negócio, salvo respostas às perguntas desta análise.

## 2. Permissões

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Ver a própria caixa e o próprio contador de não lidas | Sim, pela central administrativa existente | Sim | Sim | Não atualmente; confirmar se permanece fora |
| Abrir o registro relacionado | Conforme autorização do registro | Conforme vínculo/acesso ao registro | Conforme vínculo/acesso ao registro | Não se aplica ao escopo proposto |
| Marcar aviso próprio como lido / marcar todos como lidos | Sim | Sim | Sim | Não atualmente |
| Ver notificações de outro usuário | Não | Não | Não | Não |
| Configurar preferências globais por perfil/evento | Sim | Não | Não | Não |

O caminho existente restringe as consultas a `ctx.usuarioId`; as atualizações também filtram pelo ID da notificação e pelo usuário da sessão. A nova apresentação no menu deve preservar essas verificações de servidor e a guarda da rota.

## 3. Dados

- A tabela existente `Notificacao` guarda usuário destinatário, evento, título, mensagem, URL, entidade, estado de leitura e data de criação. A preferência de in-app permanece em `PreferenciaNotificacao`, por perfil e evento.
- Se a entrega ficar limitada ao sino/indicador e à caixa atual, não se prevê nova tabela nem migration.
- A listagem atual retorna no máximo 50 avisos mais recentes e conta todas as não lidas. É necessário confirmar se “todas” significa manter esse histórico recente ou permitir consultar/paginar o histórico completo.
- Não há novos campos sensíveis; o principal requisito de privacidade é não incluir notificações ou contagens de outras contas.
- Nenhum backfill é esperado para a proposta visual. Notificações já persistidas continuam pertencendo ao usuário indicado em `usuarioId`.

## 4. Impacto em telas e funções existentes

- `src/lib/navegacao.ts`: declara `/minhas-notificacoes` para `ADMIN_INTERNO` e `ADMIN_EXTERNO`, e `/notificacoes` para `ADMIN`; também deriva a guarda da rota do mesmo menu.
- `src/app/(painel)/navegacao-painel.tsx`: renderiza o menu lateral dos perfis e hoje apresenta os itens como links de texto.
- `src/app/(painel)/menu-mobile.tsx`: verificar a navegação responsiva e reaproveitar o mesmo acesso visual no celular.
- `src/app/(painel)/minhas-notificacoes/page.tsx`: lista até 50 notificações próprias e oferece ações de leitura; estados vazios e mensagens já existem.
- `src/lib/notificacoes.ts`: `listarNotificacoes` retorna itens e contagem de não lidas no escopo do usuário; as funções de marcar lida protegem a titularidade.
- `src/app/(painel)/notificacoes/actions.ts`: actions usadas pela caixa e pela configuração ADMIN; não ampliar os poderes dos colaboradores.
- `src/lib/notificacoes-rotas.ts` e `src/lib/notificacoes.ts`: determinam links e audiências; só alterar se a resposta confirmar mudança nos eventos recebidos.
- Testes a conferir/estender: `tests/unit/navegacao.unit.test.ts` (ou teste equivalente do menu), `tests/integration/notificacoes-rf022.integration.test.ts` e testes da caixa/listagem por usuário.
- Não foi encontrado PDD específico de Notificações; a referência funcional está em `docs/funcionalidades/notificacoes.md` e no SRS, RF-022/RF-023. A identidade visual deverá ser consultada antes de qualquer alteração visual.

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| Contador ou lista revelar aviso de outra pessoa | Derivar usuário exclusivamente da sessão e manter filtros de `usuarioId` no servidor | Integração: criar avisos para dois usuários; cada um recebe somente os próprios itens e contador |
| Acesso direto à rota fora do perfil | Manter a rota declarada na matriz de menu/guarda e validação server-side | Integração/unitário: colaborador autorizado entra; perfil CLIENTE e usuário sem sessão são negados conforme regras atuais |
| Marcar como lida uma notificação alheia alterando o ID | Preservar atualização composta por ID e usuário da sessão | Integração: tentativa cruzada não altera o aviso de outra conta |
| Sino sugerir que todos os tipos de aviso são enviados a todos os colaboradores | Distinguir indicador de acesso da regra de audiência; respeitar preferências e vínculos | Integração por evento/perfil: conferir eventos autorizados e os eventos que devem continuar sem envio |
| Indicador desatualizado após leitura ou ao navegar entre telas | Atualizar/revalidar o estado após marcar uma ou todas como lidas, conforme arquitetura de UI escolhida | Teste do fluxo: número de não lidas acompanha a caixa e chega a zero após marcar todas |
| Menu quebrar ou estourar em telas estreitas | Reusar tokens e componentes; verificar desktop e 375 px, inclusive navegação mobile | Verificação visual em 375 px e desktop |

## 6. Casos-limite e estados

- Nenhuma notificação: sino sem contador e caixa com o estado vazio existente.
- Nenhuma notificação não lida: não exibir número ou exibir um estado neutro, conforme definição visual aprovada.
- Quantidade alta: definir se o contador mostra número exato ou um limite visual (por exemplo, “99+”); não alterar o total calculado sem decisão.
- Marcar uma ou todas como lidas: o contador deve refletir a mudança e a caixa mantém a ordenação atual.
- Avisos antigos acima do limite atual de 50: confirmar se devem continuar fora da caixa ou se será necessária paginação/histórico completo.
- URLs de registros: manter abertura somente para rotas compatíveis com o perfil e com o acesso real da pessoa.
- Usuário inativo: continua sem autenticação/acesso e não recebe novos avisos conforme regra atual.
- Celular: sino deve permanecer alcançável pelo menu lateral/mobile e não provocar rolagem horizontal.

## 7. Interface

Proposta visual: manter o rótulo “Notificações” e adicionar um sino como affordance; se houver contador, mostrar somente não lidas, com alternativa textual acessível para leitor de tela. O sino pode levar diretamente à caixa existente. A posição exata (junto ao rótulo no menu, item próprio ou área superior fixa) depende do padrão do menu e será definida após consultar a identidade visual e inspecionar a navegação desktop/mobile.

Não foi encontrado PDD dedicado ao módulo. A proposta não exige nova tela se a caixa atual for considerada suficiente; se o usuário espera uma página diferente ou um painel suspenso aberto pelo sino, isso precisa ser decidido antes da implementação.

## 8. Plano de testes

- Unitário: item de menu/ícone e permissões de rota para ADMIN, ADMIN_INTERNO e ADMIN_EXTERNO; CLIENTE permanece conforme decisão.
- Integração: lista e contador nunca incluem notificações de outra conta; autorização das ações de marcar lida permanece individual.
- Integração de eventos somente se o escopo de recebimento mudar: combinações de preferências, usuário ativo e vínculo/acesso ao registro, incluindo ausência do evento para perfis não elegíveis.
- Interface: estados sem avisos, sem não lidas, contador preenchido, navegação para caixa e atualização após leitura.
- Responsividade: conferir de verdade em 375 px e desktop.
- Antes de publicar código, executar a verificação completa exigida pelo AGENTS.md e atualizar a documentação funcional; esta análise, por enquanto, não altera código nem executa testes.

## 9. Perguntas em aberto

1. **Eventos para colaboradores:** a intenção é dar acesso mais visível à caixa atual, que já pode receber avisos de prazo, comentários acessíveis, atribuições e decisões de conclusão; ou algum evento específico deveria passar a notificar colaboradores? Quais? — **Resposta:** em 2026-10-27, aprovado o escopo de acesso visual à caixa existente; não alterar a audiência dos eventos nesta entrega.
2. **Indicador do sino:** deseja um contador de não lidas ao lado do ícone? — **Resposta:** em 2026-10-27, sim; mostrar as não lidas do usuário autenticado.
3. **Histórico:** “todas as notificações” significa manter a lista recente atual (até 50) ou oferecer paginação/histórico completo? — **Resposta:** em 2026-10-27, manter a caixa atual e seu limite de até 50 notificações recentes.
4. **CLIENTE:** a caixa e o sino devem continuar restritos a ADMIN, ADMIN_INTERNO e ADMIN_EXTERNO, ou também devem aparecer no portal do cliente? — **Resposta:** em 2026-10-27, manter o escopo em ADMIN, ADMIN_INTERNO e ADMIN_EXTERNO; CLIENTE fica fora.
5. **Forma de abertura:** o sino deve abrir a página de caixa já existente ou um painel suspenso/preview, além de manter acesso à página completa? — **Resposta:** em 2026-10-27, o sino abre a página existente `/minhas-notificacoes` para colaboradores; não criar painel suspenso.
