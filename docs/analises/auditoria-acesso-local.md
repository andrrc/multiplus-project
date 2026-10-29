# Análise: Auditoria local de acesso ao projeto

- **Data:** 2026-10-29
- **Pedido original:** “Percebi que ultimamente a gente tem tido muito problema para acessar o problema localmente, por mais que na produção tenha dado tudo certo, quero criar uma auditoria local, somente para visualizar problemas que estão fazendo com que a gente tenha problemas de acessar o projeto localmente para testar, um detalhe que eu percebi é que geralmente o docker está dando bastante trabalho.”
- **Status:** aprovada em 2026-10-29

### Adendo de resolução local — aprovado em 2026-10-29

Depois da auditoria, o usuário pediu “Quero resolver isso” e autorizou parar/reiniciar o servidor local para liberar o Prisma. A resolução aprovada é preencher somente o `.env` local com a senha já validada em `APP_DATABASE_URL`, iniciar apenas o MinIO e ajustar o override local para usar a mesma imagem MinIO por digest via Docker Hub quando o Quay respondeu HTTP 401. O digest permanece idêntico ao do Compose base; produção e volumes existentes não são alterados.

## 1. Escopo previsto

### Inclui

- Criar um comando local, por exemplo `npm run doctor:local`, que gera no terminal um relatório legível de condições que impedem ou dificultam abrir o Múltiplus para testes.
- Verificar pré-requisitos sem revelar valores: versão do Node/npm, dependências instaladas, existência do `.env` e presença das variáveis exigidas.
- Verificar se Docker e o daemon estão acessíveis, se o Compose consegue interpretar a configuração base junto com o override local e se Postgres e MinIO estão ativos/saudáveis.
- Verificar disponibilidade das portas locais esperadas (Postgres 5434, MinIO 9000/9001 e a faixa usada por `npm run dev`) e, quando possível, conectividade com Postgres, estado das migrations e resposta HTTP do app local.
- Mostrar para cada checagem um resultado claro (`OK`, atenção ou falha), uma explicação curta e um próximo passo manual quando conhecido. O comando termina com código diferente de zero se encontrar falha impeditiva.
- Preservar o fluxo atual de `npm run dev`, setup, produção e dados existentes.

### Fica explicitamente de fora do comando de auditoria

- Corrigir automaticamente configuração, instalar dependências, iniciar/parar/recriar contêineres, baixar imagens, executar migrations, seed, limpar volumes ou alterar `.env`.
- Alterar o Docker de produção, deploy, aplicação, autenticação, banco ou schema.
- Fazer auditoria de produção ou de segurança; a saída fica na máquina local e não envia dados para serviços externos.
- Criar uma tela web ou painel visual; “visualizar” será um relatório no terminal, acionado explicitamente pelo desenvolvedor.

## 2. Permissões

Não se aplica: o comando é uma ferramenta de desenvolvimento executada localmente, sem perfil de usuário ou mudança de autorização/RLS.

## 3. Dados

O comando de auditoria não escreve dados nem altera o `.env`. Na correção manual aprovada em adendo, só o `.env` local foi atualizado; nenhuma migration ou registro de negócio foi alterado. O comando pode ler nomes e presença de variáveis, sem imprimir valores, senhas ou URLs completas que contenham credenciais. Conexões só são testadas se as URLs apontarem para `localhost:5434/multiplus`; URLs externas ou do banco de testes são ignoradas.

## 4. Impacto em telas e funções existentes

- `package.json`: adicionar um script explícito para a auditoria local.
- `scripts/`: adicionar a lógica de diagnóstico somente de leitura, sem alterar o comportamento existente de `scripts/dev-local.ts`.
- `.env.example`, `docker-compose.yml` e `docker-compose.local.yml`: usar como fontes para definir variáveis e serviços verificados, sem mudar esses arquivos nesta proposta.
- `README.md`: documentar o comando, o significado do relatório e os limites de não remediação.
- `docs/decisoes-desenvolvimento.md`: registrar a decisão de oferecer diagnóstico local somente de leitura.
- `docs/analises/auditoria-acesso-local.md`: registrar a análise aprovada e eventuais ajustes.
- Não há alteração em rotas, componentes, telas, autenticação do produto ou funções de domínio.

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| A auditoria alterar o ambiente por engano ou consultar Docker/banco remoto | O comando de auditoria usa apenas consultas de estado, verificações de porta e conexões de leitura; exige endpoint Docker e URLs de banco locais. A correção manual foi feita separadamente e só no ambiente local | Teste de classificação de endpoints e URLs locais/remotos; teste da auditoria com executor simulado |
| Senhas/URLs do `.env` aparecerem no relatório ou em erro | Informar somente nomes e estado de presença; remover credenciais de URLs e mensagens técnicas antes de imprimir | Teste com valores sentinela de senha e URL e asserção de que não aparecem na saída |
| Falha de uma dependência encerrar cedo e esconder outros problemas | Executar checagens independentes e acumular resultados; distinguir falha impeditiva de checagem inconclusiva | Teste da auditoria com comandos e portas simulados, verificando múltiplas falhas no mesmo relatório |
| O Compose falhar por variável ausente e não revelar a origem | Capturar saída com proteção para segredos e explicar a variável ausente sem imprimir outros valores | Teste com erro representativo de interpolação e verificação da saída sanitizada |
| Porta ocupada por outro projeto ser apresentada como falha do Múltiplus | Rotular a porta e explicar que o servidor local escolhe porta livre de 3001 a 3100; não encerrar processos | Teste com a faixa ocupada e healthcheck simulado, confirmando que nenhum processo é encerrado |
| Serviço parado ser tratado como algo que deve ser corrigido automaticamente | Apenas reportar estado e sugerir comando manual; nunca iniciar/parar serviço | Teste que confirma retorno de falha informativa e nenhuma chamada mutável |
| Imagem MinIO local inacessível pelo Quay | O override local aponta para o mesmo digest publicado no Docker Hub; o Compose base de produção continua sem alteração | `docker compose ... config --images`, imagem inspecionada pelo digest e healthcheck MinIO local |

## 6. Casos-limite e estados

- Docker CLI ausente, daemon desligado, Compose ausente ou incompatível.
- `.env` ausente; variável não definida ou definida como vazia; dependências Node ausentes.
- Compose inválido por interpolação ou configuração local não combinada.
- Serviços ausentes, parados, ainda iniciando, sem healthcheck ou não saudáveis.
- Postgres e MinIO não alcançáveis nas portas locais; porta ocupada por processo externo.
- Postgres disponível, mas conexão/credencial ou migrations não estão prontas.
- Quay responder erro de autorização ao baixar a imagem do MinIO usada pelo Compose base.
- Aplicação não iniciada, porta padrão ocupada por outro projeto ou servidor respondendo com falha.
- Execução em Windows/PowerShell e em shells usados pelo projeto; erros devem continuar legíveis mesmo quando um comando externo não existe.
- O diagnóstico precisa continuar e mostrar os demais resultados quando uma checagem não puder rodar.

## 7. Interface

Não se aplica à interface do produto: a proposta é um relatório de terminal, sem tela web ou comportamento responsivo. A saída deve ser curta, agrupada por dependência e legível no terminal do Windows.

## 8. Plano de testes

- Unitários para classificar resultados de checagens, variáveis ausentes, saída do Compose, serviços, portas e sumarização, sempre com execução externa simulada.
- Testar que senhas, tokens e URLs com credenciais nunca são impressos.
- Testar acumulação de falhas e código de saída diferente de zero quando há impedimento.
- Smoke manual do comando no computador local; validação separada do Compose local e healthcheck do MinIO após a correção.
- Após aprovação, ler as skills técnicas pertinentes às tecnologias efetivamente escolhidas e seguir a verificação completa exigida pelo repositório antes de publicar.

## 9. Perguntas em aberto

1. Aprovar o escopo proposto: comando `npm run doctor:local`, relatório no terminal, somente leitura e sem correções automáticas? — **Resposta:** aprovado em 2026-10-29. A saída deve indicar próximos passos manuais, sem executar reparos.
2. Autorizar resolver as falhas detectadas no ambiente local? — **Resposta:** “Quero resolver isso”, aprovado em 2026-10-29. O usuário também autorizou parar e reiniciar o servidor local para liberar a DLL.
