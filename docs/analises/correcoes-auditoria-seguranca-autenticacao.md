# Análise: correção dos achados de segurança de autenticação e infraestrutura

- **Data:** 2026-10-30
- **Pedido original:** “Quero resolver esses problemas.” — referente ao relatório `security_best_practices_report.md`.
- **Status:** aprovada em 2026-10-30

## 1. Escopo previsto

Corrigir os seis pontos do relatório, sem alterar as permissões funcionais dos perfis:

1. Tornar atômicos o uso único do token e a alteração de senha; impedir também que emissões concorrentes deixem mais de um link válido por usuário.
2. Invalidar sessões anteriores após definição, recuperação ou troca de senha. Proposta: ao trocar a senha no perfil, encerrar também a sessão atual e pedir novo login; após usar o link, manter o login automático já existente, criando uma sessão nova.
3. Fechar a janela de corrida no limite de login e migrar os limites de login e recuperação para armazenamento compartilhado e persistente no PostgreSQL, com controle de crescimento, expiração e proteção contra indisponibilidade. Preservar os limites e as respostas genéricas atuais, salvo ajuste explicitamente aprovado.
4. Estudar e aplicar CSP sem `unsafe-inline` em scripts, compatível com a versão de Next.js instalada; testar a aplicação, o Caddy e o proxy externo. Se uma CSP com nonce exigir renderização dinâmica, avaliar o impacto de desempenho e implantação antes de decidir a implementação.
5. Fazer a aplicação falhar com erro claro se `APP_DATABASE_URL` não estiver configurada; conferir a role e ausência de privilégios que contornem RLS nas configurações e testes, sem registrar credenciais.
6. Atualizar a documentação e cobrir os riscos com testes automatizados, de integração e de navegador.

Fora do escopo: mudar a matriz de acesso de negócio, trocar o provedor de autenticação, realizar pentest em produção, alterar senhas/segredos reais, fazer mudanças manuais na VPS ou ampliar o relatório para achados que ainda não foram auditados. Não há nova entidade de negócio ou ciclo CRUD de cadastro.

## 2. Permissões

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Login com conta ativa e senha válida, sujeito aos limites | Sim | Sim | Sim | Sim |
| Solicitar recuperação sem revelar existência da conta | Sim | Sim | Sim | Sim |
| Definir senha com token válido de uso único | Sim | Sim | Sim | Sim |
| Trocar a própria senha com senha atual | Sim | Sim | Sim | Sim |
| Continuar usando sessão anterior após troca ou recuperação de senha | Não | Não | Não | Não |
| Ver/alterar senha, contador ou sessão de outra pessoa diretamente | Não | Não | Não | Não |
| Acessar dados e operações do sistema | Conforme permissões atuais | Conforme permissões atuais | Conforme permissões atuais | Conforme permissões atuais |

Contadores e metadados de revogação são internos; não serão enviados ao navegador como dados sensíveis. A versão de sessão, se usada como claim, é apenas um número sem privilégio próprio; sua verificação ocorre no servidor.

## 3. Dados

- Token: guardar somente hash, manter prazos atuais (convite 7 dias; recuperação 1 hora), validar expiração e uso no servidor e consumir condicionalmente na mesma transação que grava o hash da senha e revoga sessões; preservar rollback em caso de falha. Emissões simultâneas devem serializar por usuário.
- Sessão: propor campo de versão de credencial por usuário, inicializado por migration para os registros existentes; incrementar de forma atômica na mudança de senha. Tokens legados sem versão devem ser recusados após a implantação, encerrando sessões abertas uma vez. Revalidar também usuário ativo e perfil atual. Não utilizar timestamp sujeito a colisão como única garantia.
- Limites: propor tabela dedicada no PostgreSQL com chave derivada, namespace, contador/estado e expiração; sem guardar senha, token ou e-mail em texto puro. Implementar reserva atômica antes de operações assíncronas, liberação/contabilização correta do sucesso e falha e limites de capacidade e limpeza seguros. Uma falha do banco deve negar autenticação/recuperação com resposta segura, sem contornar o limite; analisar indisponibilidade e uso de recursos.
- Migration nova com timestamp posterior à última de `origin/staging` (na consulta inicial: `20261029120000_ids_hierarquicos`); revisar políticas, grants, índices, backfill e papéis para as novas estruturas. Não alterar migrations publicadas.
- `APP_DATABASE_URL`: verificar ausência e permissões sem imprimir seu conteúdo. O compose existente já declara conexão restrita.

## 4. Impacto em telas e funções existentes

- `src/lib/tokens.ts`, `src/app/definir-senha/actions.ts` e `src/app/definir-senha/page.tsx`: emissão, pré-validação visual e consumo do convite/recuperação; consumidores em `src/lib/convites.ts`, `src/lib/usuarios.ts` e `src/app/esqueci-senha/actions.ts`.
- `src/server/auth/credentials.ts`, `src/server/auth/config.ts`, `src/server/auth/contexto.ts`, `src/types/next-auth.d.ts`, `src/proxy.ts`, `src/app/login/actions.ts`, `src/app/(painel)/meu-perfil/actions.ts` e `src/lib/usuarios.ts`: login, JWT, revalidação e troca de senha. Conferir layouts, páginas e `src/app/api/comentarios/imagem/[id]/route.ts` que usam o contexto para não deixar sessão revogada acessar dados.
- `src/lib/rate-limit.ts` e `src/app/esqueci-senha/actions.ts`: estado compartilhado, limpeza e uso por e-mail/IP. Revisar todos os testes que usam `limparRateLimit` e funções atuais.
- `src/lib/prisma-app.ts`, `src/lib/prisma.ts`, `prisma/schema.prisma`, `prisma/migrations/`, `docker-compose.yml`, `.env.example`, `tests/setup-env.ts` e configuração do CI: cliente restrito, schema, role e ambientes de execução. `comContextoDeUsuario` é usado por diversas funções em `src/lib/`; conferir os usos e executar a suíte completa.
- `Caddyfile`, `src/proxy.ts`, `next.config.ts` e eventuais configurações de proxy externo: conferir as políticas efetivamente enviadas e compatibilidade de scripts/hidratação; ler a documentação instalada do Next.js antes de implementar.
- Testes existentes: `tests/integration/recuperacao-senha.integration.test.ts`, `tests/integration/revalidacao-sessao.integration.test.ts`, `tests/integration/meu-perfil-rf042.integration.test.ts`, `tests/unit/administracao-acesso.unit.test.ts`, `tests/smoke/autenticacao.smoke.test.ts`, demais testes de convite/cliente e `tests/browser/jornadas.spec.ts`.
- Documentação: atualizar `docs/funcionalidades/autenticacao-acesso.md` e, se cabível, módulo de infraestrutura, `docs/decisoes-desenvolvimento.md` e o relatório de segurança com o estado final.

## 5. Riscos e segurança

| Risco | Mitigação prevista | Teste que cobre |
|---|---|---|
| Reuso de token ou nova emissão concorrente | Consumir com condição e transação; serializar emissões por usuário | Integração com solicitações concorrentes; só um consumo e um link ativo |
| Falha parcial após consumo ou alteração da senha | Gravação, consumo e revogação na mesma transação | Integração força erro e verifica rollback |
| JWT anterior continua acessando dados ou perfil muda | Comparar versão de sessão e revalidar usuário/perfil em cada fronteira protegida | Integração e smoke de sessão antiga/nova, API, perfis e conta desativada |
| Corrida no limite ou limpar estado de outro pedido | Reservar tentativas atomicamente e finalizar cada reserva sem apagar falhas concorrentes | Integração paralela entre processos e teste de sucesso/falha concorrente |
| Crescimento excessivo de chaves ou queda do banco | Capacidade limitada, expiração, limpeza concorrente segura e falha fechada | Testes de volume, expiração, saturação e indisponibilidade |
| Bloqueio indevido de usuário legítimo ou enumeração | Preservar comportamento de limites, resposta genérica e recuperação; avaliar abuso por IP/e-mail | Testes de limites, sucesso, e-mails inexistentes e indisponibilidade temporária |
| RLS ignorado por role privilegiada ou configuração incorreta | Exigir conexão restrita e verificar role/grants; manter checagem em actions | Integração de perfis autorizado/negado, role e configuração ausente |
| `security_invoker` em views ou função SQL perde regra existente | Não alterar views/funções sem necessidade; partir sempre da definição mais recente e revisar grants | Testes RLS existentes e testes específicos caso haja alteração |
| Comparação de `NULL` ou troca de ID leva a IDOR | Validar vínculos e negar dados ausentes; não confiar em claims ou ID do cliente | Integração com perfil sem vínculo, ID alheio e valores nulos |
| Formulário altera campos privilegiados ou validação só no navegador | Montar dados explicitamente e validar no servidor | Testes de campos indevidos e entradas inválidas |
| Duplicidade sob concorrência | Constraint e/ou bloqueio transacional conforme a entidade | Integração concorrente, inclusive criação de tokens e contadores |
| Desativado permanece em fluxo ou lista | Revalidar estado ativo ao autenticar, consumir token e usar sessão | Teste de conta desativada em cada fluxo |
| Datas e expiração divergirem por fuso | Comparar instantes no banco e manter padrão UTC | Testes de limite de expiração, incluindo fronteira |
| CSP bloqueia login, scripts ou navegação; nonce deixa cache compartilhar conteúdo | Seguir documentação local, nonce por resposta quando aplicável, política única e cache seguro; validar proxy externo | Jornadas em navegador nas rotas públicas e protegidas, headers e console; verificar cache |
| Links externos inseguros, uploads sem limites e notificações expondo dados | Não se aplica: não há alteração desses fluxos; a rota privada de imagem será testada quanto à revogação | Teste da rota de imagem com sessão revogada |

## 6. Casos-limite e estados

- Token inválido, expirado, já usado, substituído, de usuário inativo e consumido simultaneamente; erros de transação não devem queimar o token sem mudar a senha.
- Emissões simultâneas e pedido de recuperação durante emissão de convite; sessão antiga, nova, legada sem versão, expirada e de usuário desativado ou com perfil alterado.
- Login válido e inválido em paralelo; múltiplos processos; reinício; ausência de IP confiável; limites excedidos; saturação da tabela e banco indisponível. Não revelar se a conta existe.
- Comportamento atual do fluxo de redefinição automática e da tela de troca de senha será coberto. Paginação e edição concorrente de entidade de negócio: não se aplicam.
- Verificar que a troca e a mensagem de nova autenticação funcionam em celular e desktop, se houver mudança de interface.

## 7. Interface

Nenhum redesign planejado. Reaproveitar telas de login, recuperação e perfil, com mensagem clara se a sessão for encerrada. Caso a mudança afete tela, ler `docs/Identidade_Visual_Multiplus.md`, verificar os componentes e tokens existentes e testar em 375 px e desktop. Não foi identificado PDD específico de autenticação; verificar o PDD de usuários se necessário.

## 8. Plano de testes

- Primeiro reproduzir cada bug com testes que falham; depois implementar e manter as asserções específicas.
- Unitários: validação, estado da sessão, expiração, limites e configuração; cobrir tratamento seguro de erros.
- Integração com PostgreSQL real: concorrência de emissão/consumo, rollback, revogação, limites compartilhados, saturação, RLS e roles autorizadas e negadas.
- Smoke/browser: convite, recuperação, troca de senha, login e proteção de sessão; testar CSP e recursos de login, painel, portal e imagem.
- Verificação completa: `npx prisma generate`, `npm run typecheck`, `npm run lint`, `npm test` e testes de navegador aplicáveis; CI e deploy verdes com healthcheck. Se PostgreSQL ou proxy externo não estiverem disponíveis, registrar a limitação e não publicar com testes obrigatórios pendentes.

## 9. Perguntas em aberto

1. Aprova encerrar também a sessão atual após a troca de senha em Meu Perfil, exigindo novo login, e invalidar todas as sessões legadas uma vez no deploy? **Resposta:** aprovado por André em 2026-10-30.
2. Aprova substituir o limitador em memória pelo PostgreSQL e avaliar uma CSP com nonce, incluindo possível custo de renderização dinâmica? **Resposta:** aprovado por André em 2026-10-30; impacto e compatibilidade serão medidos antes da implementação final.
