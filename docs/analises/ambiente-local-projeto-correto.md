# Análise: Inicialização local do Múltiplus na porta correta

- **Data:** 2026-10-02
- **Pedido original:** “Já é a terceira vez que acontece isso, consegue arrumar isso definitivamente? de ficar abrindo o projeto errado”
- **Status:** aprovada em 2026-10-02

## 1. Escopo previsto

### Inclui

- Alterar `npm run dev` para escolher uma porta local livre a partir de 3001 e iniciar o Next.js nessa porta.
- Definir `AUTH_URL` no processo filho com a mesma origem/porta escolhida, evitando que o fluxo de autenticação redirecione para um projeto diferente que esteja usando `localhost:3000`.
- Imprimir a URL exata do Múltiplus no terminal, para orientar abertura e verificação visual.
- Documentar o comando local e validar o caso em que a porta 3000 pertence a outro projeto.

### Fica de fora

- Alterar a porta, URL ou processo do outro projeto.
- Alterar `.env`, credenciais, banco de desenvolvimento, deploy ou configuração de produção.
- Publicar esta correção em ambiente remoto; é uma proteção apenas para desenvolvimento local.

## 2. Permissões

Não se aplica: a mudança afeta somente o comando de inicialização local e não altera autorização do produto.

## 3. Dados

Não se aplica: nenhuma alteração de schema, dado persistido ou migration.

## 4. Impacto em telas e funções existentes

- `package.json`: script `dev` passa a chamar um inicializador local que fixa a origem de autenticação na porta escolhida.
- Novo `scripts/dev-local.mjs`: busca uma porta livre, define `AUTH_URL`, inicia `next dev` e repassa encerramento/sinais ao processo filho.
- Documentação local do repositório: registrar o comportamento e o comando.
- As rotas de produto não mudam; os callbacks permanecem na origem da requisição.

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| Escolher porta já ocupada | Tentar portas sequenciais até obter uma livre; falhar com mensagem clara se o intervalo acabar | Inicializador com 3000 e portas iniciais ocupadas escolhe outra porta livre |
| `AUTH_URL` continuar apontando para `localhost:3000` via `.env` | Definir a variável no processo filho antes de iniciar Next.js | Inspecionar ambiente efetivo e seguir `/portal` até `/login` mantendo a mesma porta |
| Encerrar o servidor deixar processo Next órfão | Repassar sinais ao processo filho e aguardar seu encerramento | Encerrar o inicializador e confirmar que a porta escolhida foi liberada |
| Variável local interferir em produção | Aplicar override somente no script `dev`; `build` e `start` permanecem inalterados | Verificação do `package.json` e execução de typecheck/lint |

## 6. Casos-limite e estados

- Porta 3000 usada por outro projeto: iniciar Múltiplus numa porta livre e exibir essa URL.
- Portas candidatas ocupadas: avançar até a primeira disponível.
- Nenhuma porta no intervalo disponível: encerrar com erro e explicar a faixa examinada.
- Encerramento por Ctrl+C: finalizar o processo Next iniciado.
- Celular: não se aplica, pois esta alteração não muda interface.

## 7. Interface

Não se aplica: sem alteração visual do produto.

## 8. Plano de testes

- Unitário do seletor de porta com portas ocupadas e disponíveis.
- Smoke local sem navegador: iniciar com a porta 3000 ocupada, consultar por HTTP a URL impressa, confirmar que o login pertence ao Múltiplus e que o redirecionamento de `/portal` conserva a porta escolhida.
- `npm run typecheck`, `npm run lint` e `npm test`, conforme o padrão do repositório.

## 9. Perguntas em aberto

1. Aprovar a análise e a alteração do inicializador local descrita acima? — **Resposta:** aprovada pelo usuário em 2026-10-02. O teste local confirmou que, com as portas 3000 e 3001 ocupadas, `npm run dev` selecionou 3002; `/portal` redirecionou para `/login` em 3002 e o título retornado foi “Entrar | Múltiplus Ambiental”.
