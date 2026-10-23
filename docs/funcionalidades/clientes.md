# Clientes e pessoas envolvidas

- **Última revisão:** 2026-09-29, no commit `fe1b5b4` do `staging`.
- **Requisitos:** RF-001, RF-002 (a–d), RF-003, RF-013, RF-020, RF-026, RF-027, RF-028,
  RF-029, RF-031, RF-033, RF-034, RF-035, RF-039, RF-046, RF-051; ADR-006, ADR-007, ADR-008.
- **Módulos relacionados:** Projetos, Usuários, Autenticação e acesso.

## Visão geral

O **cliente** é a empresa (Pessoa Jurídica) ou a pessoa (Pessoa Física) atendida pela
Múltiplus. Cada cliente recebe um **número de identificação** sequencial.

Além dos dados cadastrais, um cliente PJ pode ter:
- um **Responsável Legal** e um **Ponto de Contato**;
- **Pessoas Envolvidas**, que podem ser pessoas ou empresas terceiras;
- **documentos**, que são links do Google Drive; novos links precisam ser URLs HTTP ou HTTPS válidas, validadas no servidor;
- **projetos**;
- um **acesso ao portal** para o próprio cliente.

## Quem pode fazer o quê

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Cadastrar, editar, desativar e reativar | Sim | Não | Não | Não |
| Ver todos os clientes (`/clientes`) | Sim | Não | Não | Não |
| Ver clientes relacionados ao próprio trabalho (`/meus-clientes`) | — | Clientes dos projetos atribuídos | Clientes das tarefas e subtarefas dele | Não |
| Ver o **telefone** do Responsável Legal e do Ponto de Contato | Sim | **Não** (mascarado no banco) | **Não** | Não |
| Ver dados financeiros (valor contratado) | Sim | Não | Não | Não |
| Criar e bloquear o acesso do cliente ao portal | Sim | Não | Não | Não |
| Consultar/gerir laudo, anotações, links e filtro de laudo | Sim | Não | Não | Não |

---

## Funcionalidades

### C1. Cadastrar cliente PJ ou PF (RF-001, RF-034, RF-035)

**Como funciona.**
- **Primeiro passo:** escolher o tipo de cliente.
- **Pessoa Jurídica:**
  - ao digitar o CNPJ, razão social e endereço são preenchidos automaticamente;
  - informam-se também segmento, origem do contato, atividade principal, porte, estado e
    município;
  - Responsável Legal e Ponto de Contato são opcionais. Se o Ponto de Contato for a
    mesma pessoa do Responsável Legal, basta marcar e informar o cargo, e os dados são
    copiados (RF-027).
- **Pessoa Física:** nome, CPF, RG, CEP, endereço, e-mail, segmento e origem.
- Campos de celular usam máscara `(DD) XXXXX-XXXX`, aceitam colagem com `+55` e verificam no servidor os 11 dígitos quando preenchidos. Essa regra também vale para Responsável Legal, Ponto de Contato e Pessoa Envolvida (pessoa ou empresa); todos esses telefones são opcionais.
- **Segmento:** vem de uma lista fechada por tipo. "Outros" (PJ) ou "Outro" (PF) abre um
  campo livre.
- **Duplicidade:** CNPJ e CPF não podem se repetir.

**Detalhes técnicos.**
- **Rota:** `/clientes/novo`.
- **Função:** `criarCliente` (`src/lib/clientes.ts`), com validação em
  `validarNovoCliente` (`src/lib/validacao-cliente.ts`).
- **Telefone:** `CampoTelefone` (`src/ui/campo-telefone.tsx`), `mascararTelefone`,
  `formatarTelefone` e `validarTelefoneCelular` (`src/lib/formatacao.ts`).
- **Integrações externas:**
  - consulta de CNPJ pela BrasilAPI (`src/lib/cnpj.ts`, exige header `User-Agent`);
  - estados e municípios pelo IBGE (`src/lib/localidades.ts`).
- **Número de identificação:** gerado por sequence do banco, seguro em cadastros
  simultâneos, e exibido com zero à esquerda.
- **Testes:**
  - `cadastro-clientes*.unit.test.ts`, com 39 casos de validação, CPF/CNPJ, máscaras,
    segmento e herança;
  - `numero-cliente.*.test.ts`;
  - `cadastro-clientes.smoke.test.ts`.

### C2. Listar clientes (Administradora)

**Como funciona.**
- **Colunas:** número, nome ou razão social, CNPJ/CPF, cidade e segmento.
- **Ordem:** número de identificação crescente, igual nos cartões de celular e na tabela desktop.
- **Filtros:** busca por texto e filtro por cidade. Só aparecem cidades que já têm
  cliente. Os filtros se aplicam automaticamente.
- **Desativados:** "Mostrar desativados" inclui os clientes desativados.

**Detalhes técnicos.**
- **Rota:** `/clientes`.
- **Funções:** `listarClientes` e `listarCidadesComCliente`, com o componente
  `filtros-clientes.tsx`.
- **Teste:** `cadastro-clientes-cidade.integration.test.ts` e cobertura da ordenação/filtros em
  `laudos-tecnicos.integration.test.ts`.

### C3. Ficha do cliente (Administradora)

**Como funciona.**
- **Blocos da tela:** Cadastro, Responsável Legal, Ponto de Contato, Pessoas Envolvidas,
  **Laudo técnico** (somente ADMIN), **Drive** (documentos), **Projetos** e Acesso ao portal.
- **Projetos:** o bloco mostra o total contratado em projetos ativos e tem o atalho para
  criar um projeto já com o cliente selecionado.

**Detalhes técnicos.**
- **Rotas:** `/clientes/[id]` e `/clientes/[id]/editar`.
- **Funções:** `buscarClienteDetalheSeguro`, `atualizarCliente` e `adicionarDocumento`.

### C4. Pessoas envolvidas (RF-028, RF-033, ADR-007)

**Como funciona.**
- **O que são:** pessoas ou empresas ligadas ao cliente que participam do trabalho. Elas
  podem ser responsáveis por tarefas e subtarefas.
- **Telefone opcional:** pode ficar vazio no cadastro inicial e na inclusão posterior pela ficha do cliente, tanto para Pessoa quanto para Empresa/PJ. Isso também permite adicionar outra pessoa à lista sem preencher telefone da anterior. Quando informado, deve ser um celular com DDD e nove dígitos; nome/razão social e e-mail continuam obrigatórios.
- **Colaborador externo:** ao marcar "é um colaborador?", no cadastro ou depois, a pessoa
  recebe um usuário **Colaborador Externo** e um e-mail para definir a senha.

**Detalhes técnicos.**
- **Validação (RF-028):** `validarPessoaEnvolvida` aceita telefone vazio/espaços e valida formato quando preenchido; `validarNovoCliente` reaproveita a regra. A coluna já é opcional, sem migration. Os dois formulários deixam de exigir o campo. Cobertura em `celular.unit.test.ts`, `cadastro-clientes-rf002.unit.test.ts` e `cadastro-clientes.smoke.test.ts`, incluindo persistência e convite por e-mail sem telefone nos dois caminhos e nos dois tipos.
- **Funções:** `adicionarPessoaEnvolvida` e `criarAcessoPessoaEnvolvida`
  (`src/lib/pessoas-envolvidas.ts`). A criação de acesso é recusada se o cliente estiver
  desativado ou se o e-mail já for de outro usuário.
- **Teste:** `cadastro-clientes.smoke.test.ts`, que cobre os três caminhos de criação do
  acesso.

### C5. Mascaramento de dados sensíveis (RF-020)

**Como funciona.** Colaboradores veem os dados cadastrais necessários para o trabalho, mas
**não** o telefone do Responsável Legal e do Ponto de Contato, nem valores financeiros.

**Detalhes técnicos.**
- **Onde é filtrado:** no banco, por views com `security_invoker` e RLS. Nada é
  escondido só na interface.
- **Teste:** `cadastro-clientes-rls.integration.test.ts`, que confere que o telefone não
  vem na resposta, que o cliente de outro projeto fica invisível e que a escrita é
  exclusiva do `ADMIN`.

### C6. Clientes do colaborador (RF-046)

**Como funciona.**
- **Onde:** o colaborador vê em "Clientes" apenas os clientes ligados ao trabalho dele.
- **Na ficha:** dados cadastrais não financeiros, links do Drive e os projetos a que tem
  acesso.

**Detalhes técnicos.**
- **Rotas:** `/meus-clientes` e `/meus-clientes/[id]`.
- **Funções:** `listarClientesContextuais` e `buscarClienteContextual`. O RLS limita os
  clientes visíveis.

### C7. Acesso do cliente ao portal (RF-029, RF-031)

**Como funciona.**
- **Criar o acesso:** a Administradora cria o acesso, e o convite vai para o e-mail do
  Ponto de Contato (PJ) ou da própria pessoa (PF).
- Após criar, a Administradora recebe um link copiável na ficha mesmo quando o e-mail foi
  enviado. Se o Resend não estiver configurado ou falhar, pode compartilhar esse link
  manualmente. O link vale 7 dias, só pode ser usado uma vez e desaparece ao sair da tela;
  quem o receber pode definir a senha da conta.
- **Reenviar convite pendente:** enquanto o acesso estiver pendente, a ADMIN pode reenviar
  o convite para o e-mail atualmente associado ao login. Cada reenvio invalida o link
  anterior e cria outro com validade de 7 dias; a ficha exibe o novo link copiável mesmo
  quando o Resend falha. O reenvio não aparece para conta bloqueada, cliente desativado ou
  conta que já definiu senha; neste último caso, a pessoa usa “Esqueci minha senha”.
- **Login do cliente no portal:** bloquear a conta impede o login sem desativar a empresa.
  O controle fica separado da situação do cadastro.
- **Hoje:** o cliente, ao entrar, vê apenas **Meu Perfil** (ver limitações).

**Detalhes técnicos.**
- **Funções:** `criarAcessoCliente` (cria o `Usuario` com perfil `CLIENTE` e obtém o link
  junto ao status de envio), `reenviarConviteAcessoCliente` (resolve a conta pelo vínculo
  cliente/perfil e reemite convite pendente), `enviarConviteDefinicaoSenha` (reutilizado
  pelos dois fluxos) e `definirAcessoClienteAtivo`.
- **Segurança:** o link só volta pela Server Action protegida para `ADMIN`; o banco guarda
  somente o hash do token. O link não aparece na consulta da ficha nem fica persistido.
- **Testes:** `reenviar-convite-cliente.integration.test.ts` cobre autorização, vínculo,
  estados, e-mail, invalidação e falha do Resend; `cadastro-clientes.smoke.test.ts` cobre
  reenvio e uso do novo link, além dos fluxos de criação para PJ e PF.

### C8. Desativar e reativar (RF-039, ADR-008)

**Como funciona.**
- **Desativar o cadastro:** a empresa sai das listagens ativas e fica somente para consulta.
  Pessoas, documentos, projetos, tarefas e subtarefas vinculados ficam indisponíveis até a
  reativação; o histórico é preservado. Isso **não bloqueia o login do portal**: para impedir
  a entrada do cliente, é preciso bloquear a conta em C7, “Login do cliente no portal”.
- **Ação na ficha:** um único botão “Desativar cliente”/“Reativar cliente” fica no topo da
  página de detalhes. A seção “Cadastro da empresa” foi removida para evitar controles
  duplicados; o botão de login do portal continua separado.
- **Filtro de registros vinculados:** antes da seção de projetos, a Administradora pode
  mostrar ou ocultar projetos, pessoas envolvidas e links do Drive desativados. O texto de
  apoio informa o escopo desse filtro.
- **Reativar:** devolve tudo como estava.

**Detalhes técnicos.**
- **Função:** `definirAtivo`.
- **Herança sem marcar os filhos:** os filhos não são marcados. A herança é feita pelo RLS
  e por funções `SECURITY DEFINER`.
- **Escrita bloqueada:** escrever em filhos de cliente desativado é recusado no banco,
  inclusive para o `ADMIN`.
- **Teste:** `soft-delete-rf039.integration.test.ts`, com 20 casos.

---

### C9. Laudo técnico por cliente (RF-051)

**Como funciona.** Cada cliente PF ou PJ pode ter um único laudo técnico. No cadastro ou
na edição, marcar "Possui laudo técnico" exige nome, tipo (Ambiental, Rural ou
Agroambiental) e responsável. O responsável é a Talita ou um usuário interno ativo;
ser responsável não concede acesso. Somente a Administradora visualiza e altera o laudo.

Na ficha, a seção fica antes do Drive. O nome do laudo aparece em destaque, seguido do tipo
e do responsável. O histórico é uma linha do tempo; **Nova anotação** abre um diálogo
com texto e links. Cada registro reúne data, autor e documentos, com edição/desativação
no botão **Ações da anotação**. A busca fica junto de **Filtros**, que contém **Mostrar
desativados**. Seu histórico aceita texto, vários links ou ambos,
com autor e data. As anotações podem ser editadas, desativadas e reativadas; o histórico
guarda o texto atual e a última atualização, sem guardar todas as versões anteriores.
Há busca no texto/URLs, paginação de 20 e opção de mostrar desativados. Os links privados
não entram nos documentos compartilhados do cliente. Não há upload nem envio de notificações.

Desmarcar desativa e preserva o laudo; remarcar recupera o mesmo registro. Cliente ou
laudo desativado é somente leitura, e reativar não reativa anotações desativadas
individualmente. Responsável que saiu da equipe permanece identificado; novas escolhas
exigem integrante ativo. Edições concorrentes geram erro sem sobrescrever outra sessão.

A lista de clientes permite filtrar Todos / Com laudo ativo / Sem laudo ativo junto de
busca, cidade e clientes desativados. Sem laudo ativo inclui laudo desativado e ausência
de cadastro. A situação do cliente continua controlada pelo filtro de clientes desativados.

**Detalhes técnicos.**
- Entidades privadas `LaudoTecnico`, `AnotacaoLaudoTecnico` e `LinkAnotacaoLaudoTecnico`;
  clienteId único no banco, RLS ADMIN-only e triggers para vínculos, inatividade e versão.
- Serviço: `src/lib/laudos-tecnicos.ts`; validação: `src/lib/validacao-laudo.ts`.
- Rotas: `/clientes`, `/clientes/novo`, `/clientes/[id]` e `/clientes/[id]/editar`.
- Inputs de cliente aceitam `laudoTecnico` opcional; omissão preserva o existente.
  Cliente e laudo são gravados na mesma transação. Links aceitam HTTP/HTTPS.
- Filtro de URL: `laudo=com|sem`; histórico: `laudoBusca`, `laudoDesativados=1`, `laudoPagina`.
- Interface: `laudo/secao.tsx` e `laudo/anotacoes.tsx`; diálogo nativo com foco contido,
  fechamento por Esc e retorno de foco. Ícones Tabler, tokens existentes e layout em
  coluna no celular. Conferência visual registrada em [design-qa](../../design-qa.md).
- Controle otimista por versão; instantes em UTC, apresentação em Brasília.
- Testes: `laudos-tecnicos.unit.test.ts`, `laudos-tecnicos.integration.test.ts` e
  `laudos-tecnicos.smoke.test.ts` (validação, RLS, atomicidade, concorrência e ciclo PF/PJ).
- Análise: [laudo técnico](../analises/laudo-tecnico.md).

## Limitações e pendências conhecidas

| # | Situação | Efeito |
|---|---|---|
| L1 | O painel do cliente (RF-012) e o controle de licenças (RF-010) ainda não existem. | O cliente com acesso ao portal só vê Meu Perfil. |
| L2 | A migração assistida de dados (RF-044) e a exclusão por solicitação LGPD (RF-045) não foram implementadas. | — |
| L4 | Pasta vazia ``src/app/(painel)/meus-clientes/`[id`]``, resíduo de um comando do PowerShell. | Fora do git e sem efeito. Pode ser apagada. |

## Histórico de alterações

| Data | Commit | Alteração |
|---|---|---|
| 2026-10-21 | este commit | Visual do laudo aprovado: resumo em destaque, histórico em linha do tempo, documentos com ação de abrir e formulário em diálogo. |
| 2026-10-21 | este commit | Laudo técnico privado por cliente, histórico editável, links, filtro e desativação preservada; ver [análise](../analises/laudo-tecnico.md). |
| 2026-10-21 | este commit | Ordenar a lista central de clientes pelo número de identificação crescente, mantendo filtros e visão contextual de colaboradores ([análise](../analises/ordenacao-lista-clientes-id.md)). |
| 2026-10-20 | este commit | Telefone opcional de Pessoa Envolvida nos dois caminhos e tipos; manter validação se preenchido e acesso por e-mail. Ver [análise](../analises/telefone-opcional-pessoa-envolvida.md). |
| 2026-10-08 | `ee7db52` | Reenviar convite de acesso para cliente pendente, com link copiável e invalidação do anterior ([análise](../analises/reenviar-convite-cliente-pendente.md)) |
| 2026-10-08 | `a5191c8` | Reposicionar e esclarecer o filtro de registros desativados na ficha |
| 2026-10-08 | `aeb2288` | Manter um único botão de desativar/reativar cliente no topo da ficha |
| 2026-10-08 | `d27e273` | Separar na ficha o controle de login do portal da situação do cadastro e remover ação duplicada de desativação |
| 2026-10-05 | `1339997` | Link manual de definição de senha mostrado após criar acesso, com cópia e estado do envio ([análise](../analises/link-manual-convite-cliente.md)) |
| 2026-10-01 | `9e20f9c` | Links de documentos limitados a URLs HTTP/HTTPS no servidor ([análise](../analises/validacao-esquema-links.md)) |
| 2026-09-09 | `d84bd34` | Sprint 2: cadastro de clientes PJ com Responsável Legal, Ponto de Contato, pessoas e documentos |
| 2026-09-10 | `334d49e` | Cliente Pessoa Física (ADR-006) |
| 2026-09-10 | `4818298` | Correções pós-aprovação: Pessoas Envolvidas substituem "Pessoas do Operacional" (ADR-007) |
| 2026-09-16 | `3e21143` | Layout responsivo e acessibilidade |
| 2026-09-16 | `1169d46`, `f672ec7` | Desativação de clientes. Cliente desativado não aceita criar acesso |
| 2026-09-18 | `192c7ec` | Máscaras de CPF e CNPJ |
| 2026-09-18 | `fa3035c` | Colaboradores passam a ver os clientes relacionados |
| 2026-09-25 | `65bf329`, `9f53772` | Ficha do cliente para colaboradores |
| 2026-09-25 | `d26ab9d`, `7f3d748`, `28537e0` | Projetos na ficha do cliente e atalho para criar projeto |
| 2026-09-28 | `f005c46` | Número de identificação sequencial |
| 2026-09-28 | `2af30bc` | Filtros aplicados automaticamente |
| 2026-09-28 | `edac240`, `e2292d8`, `566b48a` | Desativação do cliente separada do acesso ao portal |
| 2026-09-29 | `95589d2` | Controles de acesso exibidos na ficha |
| 2026-09-29 | `d731f79` | Blocos da ficha voltam a ter o fundo `papel` (cor `fundo` não existia) |
| 2026-09-30 | `1d88b94` | Máscara e validação de celular para dados de cliente e Pessoas Envolvidas; ver [análise](../analises/formatacao-campos-telefone.md) |
