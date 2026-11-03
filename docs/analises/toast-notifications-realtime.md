# Análise: toasts de notificações em tempo real

- **Data:** 2026-11-03
- **Pedido original:** “Preciso implementar um sistema de toast notifications (cards de notificação que aparecem no canto inferior direito da tela) no meu sistema web”, com entrada/saída animada, resumo no acesso, fila limitada e atualização em tempo real.
- **Status:** aprovada em 2026-11-03

## 1. Escopo previsto

- Exibir toast no canto inferior direito para notificações in-app novas da conta autenticada, sem recarregar a página.
- No primeiro carregamento do painel após autenticação, consultar a quantidade de notificações não lidas e mostrar apenas um resumo quando houver pendências. O resumo abre a central adequada ao perfil.
- Exibir no máximo três toasts ao mesmo tempo; os demais aguardam em fila. Cada toast mostra ícone, título, mensagem, horário, botão de fechar e duração de seis segundos. Pausar a duração durante hover; progresso visual opcional.
- Entrada com slide e fade; saída automática ou manual. Clique no toast individual navega ao `url` interno gravado e marca somente aquela notificação como lida.
- Abrir a central marca todas as notificações não lidas como lidas, conforme pedido, mesmo quando a pessoa apenas consulta a lista.
- Usar os eventos e notificações persistidos existentes. Não alterar destinatários, preferências ou gatilhos dos eventos.
- O projeto usa Next.js 16, Prisma e PostgreSQL próprio, sem Supabase ou infraestrutura de realtime instalada. Usar PostgreSQL `LISTEN/NOTIFY` após inserção confirmada, encaminhado por um endpoint SSE autenticado. O endpoint identifica a sessão no servidor e filtra pelo `usuarioId`; nenhum evento de outra conta pode chegar ao navegador. Implementar reconexão e limpeza de conexões.
- Sem push do navegador/sistema, som, preferências individuais de toast ou novos eventos de negócio, salvo decisão abaixo.

## 2. Permissões

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Receber toast da própria notificação | Sim | Sim | Sim | Não |
| Ver resumo de não lidas próprias | Sim | Sim | Sim | Não |
| Abrir a central e marcar todas como lidas | `/notificacoes` | `/minhas-notificacoes` | `/minhas-notificacoes` | Sem rota de central atualmente |
| Abrir notificação e marcá-la como lida | Somente própria | Somente própria | Somente própria | Não |
| Ler notificação de outra conta | Não | Não | Não | Não |

As operações devem continuar usando `ContextoUsuario`, `comContextoDeUsuario` e o RLS existente. O canal SSE deve autenticar cada conexão e jamais confiar em um `usuarioId` enviado pelo cliente.

## 3. Dados

- Modelo existente `Notificacao`: `id`, `usuarioId`, `evento`, `titulo`, `mensagem`, `url`, `entidadeId`, `lida`, `criadaEm` e `dedupeKey`.
- Não há tabela, tipo de severidade nem campo de tipo visual hoje. Derivar ícone/cor do `EventoNotificacao` no cliente, sem migration: prazo próximo e solicitação de conclusão usam aviso; tarefa/projeto concluído usam sucesso; comentário e atribuição usam informação. O estilo erro fica disponível para eventos futuros, sem evento atual associado e sem campo novo.
- Horário apresentado em Brasília, reutilizando `formatarDataHoraBrasilia`.
- Não expor payloads de notificações de terceiros. SSE publica apenas sinal/identificador da conta e a notificação é obtida por leitura autenticada, ou transmite somente os campos da própria notificação após checagem no servidor.
- Se for necessário novo campo ou trigger PostgreSQL, criar migration posterior à mais recente em `origin/staging`, com grants/policies pertinentes; sem backfill se o campo for opcional e derivado para registros antigos.

## 4. Impacto em telas e funções existentes

- `src/app/(painel)/layout.tsx`: inserir provedor/contêiner client-side para o ciclo de vida do toast e consulta inicial sem repetir o resumo em cada navegação interna. `src/app/login/login-form.tsx` reinicia a chave de resumo ao iniciar uma nova autenticação.
- `src/lib/notificacoes.ts`: reutilizar listagem/contagem e leitura restritas à própria conta; revisar todos os locais de criação, inclusive `dispararEventoNotificacao` e criação direta de comentário.
- `src/app/(painel)/notificacoes/page.tsx` e `src/app/(painel)/minhas-notificacoes/page.tsx`: central de cada perfil; abrir marca todas as notificações próprias como lidas.
- `src/app/(painel)/notificacoes/actions.ts`: ação autenticada para marcar item como lido já existe; preservar o filtro composto por id e usuário.
- Nova rota SSE em `src/app/api/notificacoes/stream/route.ts` (runtime Node) e migration `20261103110000_realtime_notificacoes` com gatilhos de inclusão e leitura. Verificar limites de conexões no `ops/deploy.sh`, `docker-compose.yml` e proxy Caddy.
- `src/app/globals.css`: animações e classes só com tokens existentes; conferir acessibilidade com `prefers-reduced-motion`.
- Atualizar `docs/funcionalidades/notificacoes.md` e `docs/decisoes-desenvolvimento.md` após aprovação/implementação.

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| SSE permitir observar notificações de outra pessoa | Derivar identidade da sessão no servidor; filtrar por usuário; não aceitar id arbitrário do navegador | Integração: usuário A recebe evento próprio, usuário B não recebe; endpoint sem sessão retorna não autorizado |
| SSE deixar conexão PostgreSQL aberta ou escapar cleanup | Cancelar `LISTEN`, liberar conexão ao abortar/reconectar e tratar erro/timeouts | Integração/unitário do ciclo de conexão, desconexão e reconexão |
| Resumo de entrada reaparecer a cada navegação ou em múltiplas abas | Controlar a execução uma vez por sessão de login e deduplicar no cliente | Teste de navegador: navegar, recarregar e abrir outra aba durante a sessão |
| Resumo ou abertura da central marcar avisos indevidamente | Só alterar `lida` nas ações explicitamente aprovadas; filtrar pela conta atual | Integração: marca apenas avisos próprios e a regra de abertura confirmada |
| Clique aceitar URL externa ou `javascript:` | Permitir apenas destinos internos conhecidos; validar URL no servidor e usar navegação local | Unitário para URL permitida/rejeitada e navegador para clique |
| Preferência in-app desligada e toast ainda aparecer | Só eventos persistidos conforme preferência in-app vigente podem publicar sinal | Integração: com in-app desligado não há registro nem toast; ligado cria o evento |
| Várias mensagens sobrecarregarem tela/leitor de tela | Limite 3, fila ordenada, região `aria-live` moderada e controles com 44 px | Unitário da fila e verificação de navegador/acessibilidade |
| Animação/timer falhar com hover ou movimento reduzido | Timer cancelável/reiniciável e suporte a `prefers-reduced-motion` | Teste de componente/navegador para pause/resume, fechamento e movimento reduzido |
| Interface estourar em telas estreitas | Posicionar container dentro da viewport, limitar largura e validar em 375 px | Navegador em 375 px e desktop |

## 6. Casos-limite e estados

- Nenhuma notificação não lida no início: nenhum toast-resumo.
- Muitas notificações não lidas no início: um único resumo com contagem total, sem inserir cada item na fila.
- Mais de três eventos simultâneos: manter apenas três visíveis e exibir os próximos conforme houver espaço.
- Notificação sem `url`: clique abre a central do perfil.
- Notificação já lida em outra aba: evitar manter toast pendente e contador desatualizado; avaliar evento de atualização ou sincronização ao focar a janela.
- Perda de conexão SSE: reconectar com atraso progressivo e recuperar notificações não lidas criadas na janela de até 24 horas, sem duplicar toasts.
- Sessão expirada/usuário desativado: encerrar a conexão e não continuar emitindo dados.
- Várias abas abertas: cada aba ativa pode mostrar os próprios toasts; a deduplicação é por id dentro de cada aba.
- Mobile: toast ocupa largura disponível sem bloquear a navegação nem criar rolagem horizontal.

## 7. Interface

- Cards empilhados no canto inferior direito no desktop; no celular, largura limitada à viewport e posicionamento seguro acima da área inferior do navegador.
- Ícone, título, mensagem curta e hora; botão “X” com nome acessível; clique em área restante leva à notificação.
- Seis segundos por toast, pausa no hover e barra de progresso opcional.
- Cor de fundo/ícone derivada dos tokens `verde`, `ambar`, `critico` e `azul` com fundos claros existentes. Não usar cor fixa nem acrescentar tokens sem aprovação.
- Entrada slide + fade e saída curta; respeitar redução de movimento.
- Mensagem longa é truncada visualmente, mantendo o texto completo acessível.
- Conferir em 375 px e desktop, navegação por teclado, foco e leitor de tela.

## 8. Plano de testes

- Unitários: mapeamento evento → estilo, fila com limite de três, temporizador pause/resume, resumo único, URL interna e filtro de sinais por usuário.
- Integração com PostgreSQL real: publicação de inclusão/leitura após commit, payload sem conteúdo da notificação, autorização da rota, leitura própria, abertura da central e preferências in-app.
- Navegador: sessão entra com várias não lidas e vê resumo único; chegada em tempo real; clique navega e marca lida; fechar, timeout, hover, fila e central; múltiplas abas e reconexão.
- Regressão: preservar testes atuais de `notificacoes-rf022`, central e preferências.
- Rodar `npx prisma generate`, `npm run typecheck`, `npm run lint` e `npm test` antes de publicar; CI, healthcheck e deploy de `staging` após push.

## 9. Decisões aprovadas

1. **Perfis:** toasts/resumo para ADMIN, ADMIN_INTERNO e ADMIN_EXTERNO; CLIENTE fica fora por não possuir central própria. — **Resposta:** aprovado em 2026-11-03 (escopo proposto aprovado).
2. **Abrir a central:** toda abertura marca as notificações não lidas da própria conta como lidas. — **Resposta:** aprovado em 2026-11-03 (comportamento solicitado).
3. **Realtime:** PostgreSQL `LISTEN/NOTIFY` encaminhado por SSE autenticado, sem serviço externo. — **Resposta:** aprovado em 2026-11-03 (proposta aprovada).
4. **Cores/tipos:** estilos derivados dos eventos existentes; erro fica disponível sem evento atual ou campo novo. — **Resposta:** aprovado em 2026-11-03 (proposta aprovada).
5. **Evento sem URL:** clique abre a central do perfil. — **Resposta:** aprovado em 2026-11-03 (proposta aprovada).
6. **Múltiplas abas:** cada aba ativa pode mostrar seus toasts; deduplicação por id em cada aba e recuperação após reconexão. — **Resposta:** aprovado em 2026-11-03 (proposta aprovada).
