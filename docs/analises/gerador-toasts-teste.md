# Análise: gerador local de toasts de demonstração

- **Data:** 2026-11-03
- **Pedido original:** “Consegue criar um botão para gerar toasts de teste, para eu validar juntamente com a talita quando eu for fazer reunião? ai quando o projeto for pra vps de produção mesmo, a gente remove isso.”
- **Status:** aprovada em 2026-11-03

## 1. Escopo previsto

- Acrescentar um botão “Gerar toasts de demonstração” na central `/notificacoes`, para uso da Talita durante a validação visual.
- O botão acrescenta exemplos de sucesso, atenção, informação e erro à fila de toasts existente. Como há no máximo três cartões visíveis, o restante aguarda na fila.
- Os cartões de demonstração são gerados somente no navegador: não criam notificações persistidas, não mudam o contador de não lidas, não disparam e-mail e não publicam eventos no PostgreSQL/SSE.
- Exibir o botão somente para ADMIN em execução local/desenvolvimento (`NODE_ENV !== "production"`). A interface recebe essa condição do servidor e não existe ação de escrita no backend para habilitar o gerador.
- A ferramenta fica fora do build de produção da VPS. O código poderá ser removido antes do lançamento conforme solicitado.
- Fora do escopo: habilitar a ferramenta em staging/produção, simular a criação de notificações no banco, testar o transporte SSE por meio do botão ou alterar destinatários/preferências de notificações.

## 2. Permissões

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Ver botão de demonstração em desenvolvimento | Sim | Não | Não | Não |
| Gerar cartões de demonstração | Sim, somente na aba atual | Não | Não | Não |
| Criar/alterar notificações persistidas | Não se aplica; o gerador não acessa o banco | Não se aplica | Não se aplica | Não se aplica |

## 3. Dados

- Não há novos campos, tabelas, migrations, backfill, chaves ou destinatários.
- Os cartões são objetos temporários no estado do componente e desaparecem pela mesma duração/fechamento dos toasts reais.
- Nomes e mensagens são textos fixos de demonstração, sem dados de clientes ou tarefas reais.
- Cartão de demonstração clicado apenas fecha/navega para a central; não tenta marcar um registro inexistente como lido.

## 4. Impacto em telas e funções existentes

- `src/app/(painel)/notificacoes/page.tsx`: incluir controle de demonstração para ADMIN somente quando a página está em desenvolvimento local.
- `src/app/(painel)/layout.tsx` e `src/app/(painel)/toast-notifications.tsx`: passar condição segura de ambiente/perfil e acrescentar exemplos à fila client-side existente.
- `src/lib/notificacoes-toasts.ts`: ampliar o tipo local de toast para identificar exemplos e permitir o estilo de erro sem associá-lo a evento persistido.
- `src/app/globals.css`: reaproveitar as classes/tokens dos toasts; nenhuma cor nova.
- PDD específico de notificações: não existe; usar `docs/funcionalidades/notificacoes.md` e a identidade visual como referências vigentes.
- Não há mudança nas rotas SSE, actions de leitura, modelos Prisma, destinatários ou central de ADMIN_INTERNO/ADMIN_EXTERNO.

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| Ferramenta aparecer na VPS de produção | Renderizar somente quando o servidor informa `NODE_ENV !== "production"` e perfil ADMIN; não criar endpoint ou action de geração | Unitário para a condição de disponibilidade; navegador confirma visibilidade em dev e ausência no build de produção quando disponível |
| Usuário não ADMIN acionar a ferramenta por URL/inspeção | Não enviar ação privilegiada ao servidor; renderização limitada a ADMIN e handler client-side sem acesso a dados | Teste do componente/integração visual para perfis permitidos e negados |
| Exemplos poluírem notificações, contador, e-mails ou canal realtime | Gerar apenas estado visual em memória; não chamar Prisma, Server Action ou endpoint | Navegador confere fila visual; integração confirma que a contagem do banco não muda |
| Cartão de erro usar enum/evento inexistente | Identificar a amostra como dado visual temporário, sem persistir valor de evento no banco | Unitário do mapeamento de amostras e navegação/fechamento sem chamada de leitura |
| Botão deslocar a central em celular | Controle responsivo com área de toque mínima de 44 px e quebra de linha | Conferência em 375 px e desktop |

## 6. Casos-limite e estados

- ADMIN em desenvolvimento: botão visível e gera quatro cartões de exemplo.
- ADMIN em produção, demais perfis e CLIENTE: botão ausente.
- Clique repetido: substituir a rodada de demonstração anterior para evitar sobrecarga da fila e permitir repetir a apresentação.
- Cartão fechado, clicado ou expirado: segue o ciclo normal de duração; leitura persistida não é alterada.
- Central sem dados ou com erro de carregamento: o botão não substitui nem interfere nos avisos reais.
- Mobile a 375 px: botão e conteúdo sem rolagem horizontal.

## 7. Interface

- Botão compacto “Gerar toasts de demonstração” no cabeçalho da central ADMIN, visível apenas localmente.
- Ao acionar, gerar amostras de sucesso, atenção, informação e erro no canto inferior direito, usando os ícones, animações, empilhamento, timer e fechamento existentes.
- Usar apenas tokens registrados em `src/app/globals.css` e manter a identidade visual institucional.
- O controle deve ter nome acessível, alvo de toque mínimo de 44 px e funcionar em 375 px e desktop.

## 8. Plano de testes

- Unitários: gerar as quatro amostras, respeitar deduplicação/limite da fila e identificar corretamente cartões temporários.
- Integração: confirmar que nenhuma linha, leitura, preferência ou sinal PostgreSQL é alterado pelo gerador.
- Navegador: ADMIN em desenvolvimento consegue gerar/fechar amostras; cartão de exemplo não marca notificação real; botão não aparece para outros perfis e não é incluído em produção.
- Executar verificações completas do repositório antes de commit/publicação, conforme `AGENTS.md`.

## 9. Perguntas em aberto

1. O escopo proposto — botão só para ADMIN em ambiente local/desenvolvimento, com amostras apenas visuais e sem gravar no banco — está aprovado? — **Resposta:** aprovado em 2026-11-03 (“Ok”). A rodada anterior de demonstração será substituída ao clicar novamente.
