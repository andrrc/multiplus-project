# Análise: sino de notificações para ADMIN

- **Data:** 2026-11-03
- **Pedido original:** “Notificação dentro do app. Quando um colaborador interno solicitar a conclusão, deve cair uma notificação dentro do sistema para a talita. Poderiamos implementar a caixa de sininho também. Pop-up no dentro do sistema para notificação.”
- **Status:** aprovada em 2026-11-03; escopo revisto por orientação do usuário em 2026-11-03

## 1. Escopo previsto

- A solicitação de conclusão já é persistida como notificação in-app para contas ADMIN ativas, conforme as preferências atuais. Os avisos de solicitantes internos e externos continuam com o mesmo fluxo.
- Manter somente a adição do sino com contador de não lidas para ADMIN (Talita), apontando para a caixa existente em `/notificacoes`.
- ADMIN_INTERNO e ADMIN_EXTERNO mantêm o sino e a caixa existentes em `/minhas-notificacoes`. CLIENTE permanece fora.
- **Cancelado pelo usuário:** prévia suspensa, aviso deslizante/toast, polling, endpoint novo, push do navegador/sistema e mudança na audiência dos eventos.
- Sem mudança de schema, migration, preferências, listagem, leitura ou regras de aprovação de conclusão.

## 2. Permissões

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Ver o próprio sino e contador | Sim | Sim, comportamento existente | Sim, comportamento existente | Não |
| Abrir a própria caixa | `/notificacoes` | `/minhas-notificacoes` | `/minhas-notificacoes` | Não |
| Consultar ou marcar notificação de outra conta | Não | Não | Não | Não |
| Aprovar ou rejeitar solicitação de conclusão | Sim, regra existente | Não | Não | Não |

O contador reutiliza `contarNotificacoesNaoLidas(ctx)`, que deriva o usuário da sessão e consulta apenas a própria conta sob RLS.

## 3. Dados

- Reutilizar os registros e preferências existentes em `Notificacao` e `PreferenciaNotificacao`.
- Não há campos, tabelas, índices, migration ou backfill novos.
- Nenhum dado novo é exposto ao navegador além da contagem individual já usada no menu dos colaboradores.

## 4. Impacto em telas e funções existentes

- `src/app/(painel)/layout.tsx`: carregar a contagem individual também para ADMIN e passá-la ao menu desktop e mobile. Preservar a alteração local existente de largura do conteúdo.
- `src/app/(painel)/navegacao-painel.tsx`: mostrar o sino para ADMIN como link para `/notificacoes`; manter o link de sino existente dos colaboradores.
- `src/lib/notificacoes.ts`: reutilizar `contarNotificacoesNaoLidas`; não alterar os disparos.
- `src/app/(painel)/notificacoes/page.tsx` e `src/app/(painel)/minhas-notificacoes/page.tsx`: manter as caixas, limite de 50, links e ações atuais.
- Atualizar `docs/funcionalidades/notificacoes.md` e `docs/decisoes-desenvolvimento.md`.

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| Contador incluir avisos de outra pessoa | Reutilizar consulta com `ctx.usuarioId` e RLS | Integração existente de contagem individual; manter/regredir com ADMIN e colaborador |
| Link levar a rota não autorizada | Usar o destino já definido por perfil no menu e preservar a guarda server-side | Unitário: rota de cada perfil; CLIENTE continua sem item |
| Cores ou layout do sino não seguirem a identidade visual | Reutilizar tokens e ícone existente; não criar cor nova | Unitário de tokens e verificação no navegador |
| Tela mobile quebrar em 375 px | Manter o item dentro do menu mobile existente, sem camada suspensa | Navegador: largura da página e link operável a 375 px e desktop |
| Disparo de conclusão mudar sem intenção | Não alterar `CONCLUSAO_SOLICITADA`, destinatários nem preferências | Testes existentes de notificação e solicitação continuam passando |
| Views/RLS, SQL `NULL`, unicidade, uploads, links externos ou destinatários de e-mail | Não se aplica: esta entrega só apresenta a contagem já autorizada e um link interno | Não se aplica; regras existentes permanecem cobertas por seus testes |

## 6. Casos-limite e estados

- Zero não lidas: sino sem badge.
- Mais de 99: mostrar `99+`, como no menu de colaboradores.
- O contador é atualizado quando o painel é renderizado; marcar avisos como lidos mantém os fluxos atuais de revalidação.
- O menu mobile continua acessível em 375 px, sem rolagem horizontal.

## 7. Interface

- Sino e contador de não lidas no item ADMIN “Notificações”; clicar abre a central atual.
- Sem popover, toast, aviso deslizante ou notificação do navegador/sistema.
- Preservar o sino e destino existentes dos colaboradores.
- Seguir os tokens e padrões de `docs/Identidade_Visual_Multiplus.md` e conferir em desktop e 375 px.

## 8. Plano de testes

- Unitário: item ADMIN aponta para `/notificacoes`; ADMIN_INTERNO e ADMIN_EXTERNO continuam apontando para `/minhas-notificacoes`; CLIENTE não recebe o item.
- Integração: contador da sessão não inclui registros de outra conta.
- Navegador: ADMIN vê o sino com contador e abre a central; conferir também o menu mobile a 375 px e o desktop.
- Antes do push, executar `npx prisma generate`, `npm run typecheck`, `npm run lint` e `npm test`; depois acompanhar CI e healthcheck do `staging`.

## 9. Perguntas em aberto

1. **Pop-up/prévia automática:** **Resposta:** cancelados pelo usuário em 2026-11-03; manter somente o sino de ADMIN com contador e link direto à caixa.
2. **Solicitantes e eventos:** **Resposta:** manter os disparos e destinatários existentes sem mudanças.
3. **CLIENTE:** **Resposta:** permanece fora da interface da caixa/sino.
