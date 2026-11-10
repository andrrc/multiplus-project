# Análise: indicador do Next.js nas jornadas de navegador

- **Data:** 2026-11-10
- **Pedido original:** Tratar a falha existente no CI antes de publicar a renovação visual.
- **Status:** aprovada em 2026-11-10

## 1. Escopo previsto

Corrigir a falha da jornada de navegador causada pelo indicador de desenvolvimento do Next.js cobrindo o botão Sair. Configurar `devIndicators: false` somente quando `MULTIPLUS_TESTE_NAVEGADOR=1`, já usado para isolar o servidor Playwright. Não alterar a aplicação em produção, o indicador no desenvolvimento habitual, as permissões ou as regras de autenticação. A documentação do Next instalado informa que erros de compilação e execução continuam visíveis.

## 2. Permissões

Não se aplica: a alteração é exclusiva da configuração do servidor de teste e não muda as permissões de usuário.

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Acessos existentes | Sem alteração | Sem alteração | Sem alteração | Sem alteração |

## 3. Dados

Não se aplica: não há alteração de campos, validação, dados sensíveis, banco, migration ou backfill.

## 4. Impacto em telas e funções existentes

- `next.config.ts`: configuração condicional de testes de navegador.
- `playwright.config.ts`: define `MULTIPLUS_TESTE_NAVEGADOR=1` no servidor de teste em desenvolvimento.
- `tests/browser/jornadas.spec.ts`: jornada existente reproduz a falha no clique em Sair.
- Não altera rotas, links, dados ou funções de negócio.

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| Indicador continua interceptando cliques | Desligá-lo apenas no servidor de teste | Jornada real de convite, saída, login e navegação passa sem forçar clique |
| Configuração afeta desenvolvimento comum ou produção | Condicionar à variável exclusiva do servidor Playwright | Verificar configuração com e sem a variável e executar typecheck |
| Erros de compilação ficam ocultos | A documentação do Next assegura que continuam visíveis | Conferência da documentação instalada e execução da jornada |
| Autorização, RLS, mascaramento, IDOR, validação, unicidade, registros desativados, SQL, datas, links externos, uploads ou notificações | Não se aplica: nenhuma dessas camadas é alterada | Suíte completa permanece obrigatória |

## 6. Casos-limite e estados

Execução de desenvolvimento normal sem a variável preserva o indicador; build de produção não muda. Teste com `MULTIPLUS_BROWSER_PRODUCAO=1` continua usando a configuração de produção. A jornada não deve aumentar timeout nem forçar clique.

## 7. Interface

Não há alteração da interface entregue aos usuários. O indicador técnico fica oculto somente durante os testes automatizados. Não há nova tela ou mudança responsiva.

## 8. Plano de testes

Reproduzir primeiro a falha da jornada existente; executar `npm run test:browser` após a correção e a verificação completa (`npx prisma generate`, `npm run typecheck`, `npm run lint`, `npm test`). Após publicação, acompanhar CI e healthcheck. A reprodução local anterior mostrou `nextjs-portal` interceptando o clique no botão Sair.

## 9. Perguntas em aberto

Nenhuma decisão funcional identificada. **Resposta:** correção aprovada pelo usuário em 2026-11-10.
