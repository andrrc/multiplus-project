# Análise: segurança e cobertura dos testes

- **Data:** 2026-10-29
- **Pedido original:** “Quero resolver todos esses problemas”, referindo-se à proteção do banco de teste, às jornadas críticas no navegador e às asserções genéricas de permissão.
- **Status:** aprovada em 2026-10-29

## 1. Escopo previsto

1. Proteger a preparação e os acessos destrutivos da suíte: validar os dois endereços de teste antes de conectar, criar banco, migrar ou executar limpeza; exigir um banco descartável explicitamente identificado e bloquear destinos de desenvolvimento e produção, inclusive quando aliases apontem ao mesmo banco. Falhar fechado com orientação sem exibir credenciais. A proteção deve cobrir comandos e testes que executam `deleteMany` diretamente, não apenas `limparFixtures`.
2. Acrescentar testes reais de navegador para login, definição de senha por convite e a listagem de subtarefas em desktop e 375 px. Na tabela com excesso horizontal, verificar que o aviso permanece e a posição vertical não muda ao rolar; verificar cartões móveis e ausência de rolagem horizontal da página. Reutilizar o fluxo real de autenticação e os dados fictícios de teste.
3. Inventariar e corrigir asserções genéricas de rejeição relativas a autorização, RLS e regras de acesso; conferir mensagem, código ou estado persistido esperado conforme o contrato de cada camada. Não tornar testes dependentes de texto instável do driver quando um código/estado específico estiver disponível.
4. Integrar a execução e suas dependências ao CI e à verificação local; manter as suítes atuais e a execução sequencial até haver isolamento para concorrência.

Fora do escopo: mudar regras ou permissões do produto, dados reais, schema de produção, configurar produção para testes ou ampliar cobertura de navegador a todas as telas.

## 2. Permissões

Não se aplica alteração de permissões. Os testes devem verificar as regras existentes de ADMIN, ADMIN_INTERNO, ADMIN_EXTERNO e CLIENTE, tanto no caso autorizado quanto no negado. O login no navegador usa somente contas fictícias no banco de teste.

## 3. Dados

Sem novos dados de negócio, schema, migration ou backfill. As fixtures e credenciais são artificiais e descartáveis. Os testes de navegador devem iniciar aplicação apontada exclusivamente ao banco isolado, nunca à VPS ou ao banco de desenvolvimento. O setup valida `TEST_DATABASE_URL` e `TEST_APP_DATABASE_URL` e deve verificar a identidade efetiva do banco antes de operações destrutivas; divergências entre endereços, nomes ou roles interrompem a execução. Rejeitar URLs inválidas, vazias, externas não autorizadas, bancos de sistema e a identidade do banco de desenvolvimento mesmo quando um alias de host for usado. Não imprimir senhas, tokens ou URLs completas.

## 4. Impacto em telas e funções existentes

- `tests/integration/setup/global-setup.ts`: validação anterior a criação do banco e `prisma migrate deploy`.
- `tests/setup-env.ts`, `tests/integration/setup/helpers.ts`: impedir uso de conexões inseguras antes de importar clientes ou executar limpeza. Inventariar também clientes e operações diretas em todos os arquivos de integração/smoke.
- `tests/integration/subtarefas-rn004.integration.test.ts`, `cadastro-clientes-rls.integration.test.ts`, `projetos-tarefas-a4.integration.test.ts`, `soft-delete-rf039.integration.test.ts`, `usuarios-rn007.integration.test.ts` e demais resultados da busca por `toThrow()`: revisar asserções de rejeição.
- `src/app/definir-senha/`, autenticação e `/subtarefas`: exercitar as interfaces públicas reais sem mudar suas regras. `src/ui/rolagem-horizontal.tsx` é o componente verificado.
- `package.json`, configuração e arquivos novos dos testes de navegador, `.github/workflows/ci.yml`: instalar e executar navegador no ambiente de testes e CI com servidor próprio, banco isolado e encerramento confiável.
- `docs/padrao-testes-por-sprint-multiplus.md`, `docs/funcionalidades/desenvolvimento-local.md`, `autenticacao-acesso.md`, `subtarefas.md` e `docs/decisoes-desenvolvimento.md`: documentar execução e cobertura efetiva.

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| Limpeza ou migration no banco errado | Validar destino antes de conectar e novamente antes de destruir dados; confirmar identidade efetiva e isolar o banco de teste | Casos com URLs de desenvolvimento, produção, aliases, bancos de sistema, URLs ausentes/malformadas e nomes divergentes falham antes de qualquer operação; destino de teste válido passa |
| Banco de teste de aplicação aponta para outra instância | Verificar que as duas conexões chegam ao mesmo destino autorizado, com roles esperadas | URLs divergentes rejeitadas e conexões válidas aceitas |
| Identificação apenas pelo nome permite destino remoto inseguro | Definir destinos permitidos de forma restritiva para local e CI; validar host/identidade efetiva, sem aceitar aliases inseguros por suposição | Destino remoto e alias inesperado são recusados sem conectar ou limpar |
| Browser acessa dados reais, envia e-mail ou grava no ambiente errado | Processo e banco de teste dedicados, credenciais fictícias, provedor de e-mail desabilitado e proteção antes do seed ou servidor | Teste de isolamento e falha fechada com configuração inválida; conferir que o fluxo não chama serviço real |
| Duas suítes limpam os mesmos dados simultaneamente | Serializar ou usar banco independente para o navegador; não ativar paralelismo global sem isolamento | Execução concorrente é impedida ou usa bancos separados; fluxo completo permanece estável |
| Erro genérico passa por motivo não relacionado à permissão | Verificar código/mensagem específica e efeito no banco, preservando o caso autorizado | Cada asserção alterada rejeita erro diferente e confirma ausência de alteração |
| Teste visual frágil ou sem excesso horizontal | Usar dimensões e dados controlados; verificar estados observáveis e geometria, sem depender de captura pixel a pixel | Aviso permanece e topo da tabela permanece estável antes e depois da rolagem; sem degradê sobre os dados |
| Porta ocupada, navegador ausente ou servidor órfão | Porta e processo controlados; instalar navegador no CI; finalizar e emitir diagnóstico claro | Inicialização, indisponibilidade e encerramento verificáveis |
| Segredos ou tokens no log, artefatos e capturas | Credenciais descartáveis, dados fictícios e sanitização; não registrar URL de conexão ou token | Inspeção de logs e falhas sem dados sensíveis |
| Enfraquecer cobertura ou mascarar falhas | Não remover asserções, pular testes, aumentar timeout ou desligar paralelismo como remédio para falhas | Suíte completa e testes alterados mantêm verificações específicas |
| Fluxos de segurança existentes, RLS, dados sensíveis, links, fuso e inatividade | Preservar código de produto e executar suíte existente; navegador verifica apenas os fluxos selecionados | Integração/smoke existentes de permissão, RLS, mascaramento, links, datas e registros inativos |

Não se aplica: novo upload, nova regra de notificação, mudança de destinatário ou nova migration do produto.

## 6. Casos-limite e estados

- Bancos de teste inexistentes, roles ou senha ausentes, servidor PostgreSQL indisponível e navegador ausente devem resultar em erro claro antes de operações inseguras.
- Endereços `localhost` e `127.0.0.1` podem se referir à mesma instância; não confiar apenas na comparação textual de URLs.
- Token de convite válido, expirado e já usado; login válido e negado; erro de autenticação visível. Cobrir jornada real principal sem duplicar desnecessariamente os casos de integração existentes.
- Listagem vazia e com dados artificiais suficientes para produzir excesso horizontal; desktop e 375 px. Nenhum envio externo de notificações.
- Testes isolados e suíte completa devem usar o mesmo mecanismo de proteção. Evitar colisão com servidor local ou outra execução de testes.

## 7. Interface

Não altera telas do produto. Os testes de navegador observam o login, a definição de senha e a listagem em desktop e celular; o layout continua sujeito à identidade visual e aos requisitos de acessibilidade existentes.

## 8. Plano de testes

- TDD na validação do destino: casos com configurações falsas, sem atingir banco real; depois prova de integração com banco descartável e verificação de que destinos proibidos não recebem conexão, migration ou limpeza.
- Permissões: revisar todos os usos pertinentes de `toThrow()` encontrados por busca; verificar efeito de operação negada e o acesso permitido correspondente, sem relaxar asserções.
- Navegador: convite → definir senha → login; login negado e válido; subtarefas com rolagem horizontal e versão móvel. Dados exclusivamente artificiais e cleanup controlado.
- Rodar os testes das alterações durante o desenvolvimento; antes da publicação, `npx prisma generate`, `npm run typecheck`, `npm run lint`, `npm test` e a suíte de navegador, localmente e no CI. Acompanhar deploy e healthcheck.
- Não usar URLs reais de banco de desenvolvimento ou produção para testar a trava; utilizar valores sintéticos e monitorar que a operação foi bloqueada antes da conexão.

## 9. Perguntas em aberto

1. Aprovar este escopo e as interfaces de teste propostas (validador antes de operações de banco, APIs/RLS de permissão e jornadas reais no navegador)? — **Resposta:** aprovado pelo usuário em 2026-10-29.
2. Para execução de navegador, adotar Playwright como nova dependência de desenvolvimento e preparar o navegador também no CI? — **Resposta:** aprovado pelo usuário em 2026-10-29.
