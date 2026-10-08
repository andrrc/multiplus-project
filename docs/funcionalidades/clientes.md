# Clientes e pessoas envolvidas

- **Última revisão:** 2026-09-29, no commit `fe1b5b4` do `staging`.
- **Requisitos:** RF-001, RF-002 (a–d), RF-003, RF-013, RF-020, RF-026, RF-027, RF-028,
  RF-029, RF-031, RF-033, RF-034, RF-035, RF-039, RF-046; ADR-006, ADR-007, ADR-008.
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
- Campos de celular usam máscara `(DD) XXXXX-XXXX`, aceitam colagem com `+55` e verificam no servidor os 11 dígitos quando preenchidos. Essa regra também vale para Responsável Legal, Ponto de Contato e Pessoa Envolvida (pessoa ou empresa); os dois primeiros seguem opcionais.
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
- **Filtros:** busca por texto e filtro por cidade. Só aparecem cidades que já têm
  cliente. Os filtros se aplicam automaticamente.
- **Desativados:** "Mostrar desativados" inclui os clientes desativados.

**Detalhes técnicos.**
- **Rota:** `/clientes`.
- **Funções:** `listarClientes` e `listarCidadesComCliente`, com o componente
  `filtros-clientes.tsx`.
- **Teste:** `cadastro-clientes-cidade.integration.test.ts`.

### C3. Ficha do cliente (Administradora)

**Como funciona.**
- **Blocos da tela:** Cadastro, Responsável Legal, Ponto de Contato, Pessoas Envolvidas,
  **Drive** (documentos), **Projetos** e Acesso ao portal.
- **Projetos:** o bloco mostra o total contratado em projetos ativos e tem o atalho para
  criar um projeto já com o cliente selecionado.

**Detalhes técnicos.**
- **Rotas:** `/clientes/[id]` e `/clientes/[id]/editar`.
- **Funções:** `buscarClienteDetalheSeguro`, `atualizarCliente` e `adicionarDocumento`.

### C4. Pessoas envolvidas (RF-028, RF-033, ADR-007)

**Como funciona.**
- **O que são:** pessoas ou empresas ligadas ao cliente que participam do trabalho. Elas
  podem ser responsáveis por tarefas e subtarefas.
- **Colaborador externo:** ao marcar "é um colaborador?", no cadastro ou depois, a pessoa
  recebe um usuário **Colaborador Externo** e um e-mail para definir a senha.

**Detalhes técnicos.**
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
- **Bloquear:** o acesso pode ser bloqueado e desbloqueado **sem desativar o cliente**.
  São controles separados na ficha.
- **Hoje:** o cliente, ao entrar, vê apenas **Meu Perfil** (ver limitações).

**Detalhes técnicos.**
- **Funções:** `criarAcessoCliente` (cria o `Usuario` com perfil `CLIENTE` e obtém o link
  junto ao status de envio), `enviarConviteDefinicaoSenha` (só devolve o link quando o
  chamador do acesso do cliente solicita explicitamente) e `definirAcessoClienteAtivo`.
- **Segurança:** o link só volta pela Server Action protegida para `ADMIN`; o banco guarda
  somente o hash do token. O link não aparece na consulta da ficha nem fica persistido.
- **Testes:** `cadastro-clientes.smoke.test.ts`, com o cliente PJ e o PF logando com a
  senha definida.

### C8. Desativar e reativar (RF-039, ADR-008)

**Como funciona.**
- **Desativar:** o cliente desativado vira somente leitura e some para todos, exceto a
  Administradora. Com ele somem as pessoas, os documentos, os projetos, as tarefas e as
  subtarefas.
- **Reativar:** devolve tudo como estava.

**Detalhes técnicos.**
- **Função:** `definirAtivo`.
- **Herança sem marcar os filhos:** os filhos não são marcados. A herança é feita pelo RLS
  e por funções `SECURITY DEFINER`.
- **Escrita bloqueada:** escrever em filhos de cliente desativado é recusado no banco,
  inclusive para o `ADMIN`.
- **Teste:** `soft-delete-rf039.integration.test.ts`, com 20 casos.

---

## Limitações e pendências conhecidas

| # | Situação | Efeito |
|---|---|---|
| L1 | O painel do cliente (RF-012) e o controle de licenças (RF-010) ainda não existem. | O cliente com acesso ao portal só vê Meu Perfil. |
| L2 | A migração assistida de dados (RF-044) e a exclusão por solicitação LGPD (RF-045) não foram implementadas. | — |
| L4 | Pasta vazia ``src/app/(painel)/meus-clientes/`[id`]``, resíduo de um comando do PowerShell. | Fora do git e sem efeito. Pode ser apagada. |

## Histórico de alterações

| Data | Commit | Alteração |
|---|---|---|
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
