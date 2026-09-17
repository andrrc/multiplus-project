# Auditoria de Conformidade — Sprint 3: Administração e Acesso

**Versão:** 1.0
**Data:** 16/09/2026
**Autor:** auditoria por Claude Code, a pedido do André (Somma)
**Base documental:** SRS v2.1, ADD v1.9 (ADR-008), `docs/plano-sprint3-administracao-acesso.md`,
`docs/product-design-multiplus-projetos-tarefas.md` (Telas A1–A6), `docs/padrao-testes-por-sprint-multiplus.md`
**Escopo:** RF-030, RF-032, RF-039, RF-040, RF-041, RF-042, RF-043 + RN-007, RN-009
**Natureza:** leitura e verificação. Nenhum arquivo de código, migration, teste ou documento
foi alterado. A evidência de cada item é o código, nunca a documentação.

**Verificações executadas:** leitura de código e migrations; consulta a `pg_policies` no banco
`multiplus_test`; reprodução de vazamento de RLS com fixtures em `BEGIN … ROLLBACK`
(nada persistido); `npm test` (suíte completa); `npm run lint`.

---

## 1. Resumo

**Conforme.** Os sete requisitos da sprint existem no código, não só no documento. A migration
de soft delete é de fato não-destrutiva (`ADD COLUMN ... NOT NULL DEFAULT true`, sem nenhum
`UPDATE` de dados). O fluxo de convite foi **consolidado**, não duplicado — os quatro pontos de
entrada chamam `src/lib/convites.ts`. A origem da atribuição é derivada (sem coluna nova) e o
status de acesso também. O retrofit das listagens da Sprint 2 foi feito. A suíte passa inteira:
**161 testes**, lint limpo.

**Divergiu.** Três coisas, em ordem de gravidade:

1. **A herança de desativação para em Pessoa Envolvida e Documento.** `projetos`, `tarefas` e
   `subtarefas` não consultam `cliente_esta_ativo`. **Verificado no banco:** com o cliente
   desativado, um Colaborador Interno atribuído deixa de ver o cliente e **continua vendo o
   projeto e a tarefa**. Hoje não vaza nada porque não há dado de Projeto em produção; vaza no
   dia em que a Sprint 4 criar.
2. **"Registro desativado é somente leitura" tem um furo alcançável pela interface:** o bloco
   "Acesso do cliente" não é condicionado a `cliente.ativo`, então dá para criar login de
   cliente e disparar e-mail de definição de senha para um cliente recém-desativado.
3. **A guarda de rota do RF-043 no servidor não existe nas páginas de `/clientes`.** O teste que
   "cobre" RF-043 testa a função pura `perfilPodeAcessar` — que essas páginas nunca chamam.

**Não foi feito (e está documentado como tal).** `ativo` em Projeto/Tarefa/Subtarefa (SRS RF-039,
campo **Status**, adiado para a Sprint 4); healthcheck pós-deploy; gate de CI (pendência herdada
da Sprint 1, registrada no `README.md:108-110`); passada manual no navegador.

**Não foi feito e não está documentado.** RF-042 não tem **nenhum** teste — `alterarMinhaSenha`,
`atualizarMeuNome` e as Server Actions não aparecem em teste nenhum. O `listarOpcoesDeAtribuicao`
(o seletor das Telas A2/A3) também não.

> **Nota à parte, fora do escopo da auditoria.** Foram encontradas duas alterações não commitadas
> na árvore de trabalho — `src/app/(painel)/usuarios/acoes-usuario.tsx` e
> `src/app/(painel)/usuarios/page.tsx`, ajustes apenas de alinhamento CSS. O snapshot de git no
> início da sessão de auditoria indicava árvore limpa. Não foram feitas pela auditoria, e foram
> deixadas intactas.

---

## 2. Tabela de conformidade

| RF/RN | Status | Evidência (código) |
|---|---|---|
| **RF-039** soft delete | **Existe** (escopo reduzido e documentado) | Colunas: `prisma/schema.prisma:46,71-72` (Usuario), `:127-129` (Cliente), `:212-214` (PessoaEnvolvida), `:238-240` (Documento). Migration não-destrutiva: `prisma/migrations/20260916110000_soft_delete_rf039/migration.sql:21-37` + índices `:40-49`. Serviço: `src/lib/desativacao.ts:23-58`. UI: `src/app/(painel)/clientes/[id]/page.tsx:115-131,213-219,250-256,269-292` |
| **RF-039** herança pai→filho | **Parcial** | Cobre 4 filhas: `20260916110500_rls_soft_delete_cascata/migration.sql:82,108,116,142,154,180,192,218`. **Não cobre** `projetos`/`tarefas`/`subtarefas` — `20260903191825_.../migration.sql:37-55` |
| **RF-039** somente leitura | **Parcial** | `src/lib/desativacao.ts:66-77` + `src/lib/clientes.ts:294`; políticas `*_write` com `cliente_esta_ativo`. **Furo:** `src/app/(painel)/clientes/[id]/page.tsx:298-312` |
| **RF-040** listagem / busca / filtro / toggle | **Existe** | `src/lib/usuarios.ts:77-133` (busca nome/e-mail/cargo `:95-103`; filtro `:86-88`; toggle `:94`). Tela: `src/app/(painel)/usuarios/page.tsx:141-173` |
| **RF-040** zero atribuições sinalizado | **Existe** | `src/app/(painel)/usuarios/page.tsx:29-50` (etiqueta "Sem atribuição — não vê nada ao entrar") |
| **RF-040** reenviar convite | **Existe** | `src/lib/usuarios.ts:357-369`; ação `src/app/(painel)/usuarios/actions.ts:35-52`; botão só se `PENDENTE` em `page.tsx:96` |
| **RF-040** desativar / reativar | **Existe** | `src/app/(painel)/usuarios/actions.ts:14-32`; auto-desativação bloqueada em `src/lib/desativacao.ts:33-35` |
| **RF-041** projeto (Interno) / tarefa (Externo) | **Existe** | `src/lib/usuarios.ts:39-43` (RN-005), `:549-572` (validação `:561`), `:498-539` (seletor) |
| **RF-041** origem automática identificada + remoção bloqueada | **Existe** | Derivação `src/lib/usuarios.ts:463-466`; bloqueio **no serviço** `:592`; UI `src/app/(painel)/usuarios/[id]/page.tsx:68-80` |
| **RF-042** senha exige a atual | **Existe** (sem teste) | `src/lib/usuarios.ts:626-644` (`verificarSenha` em `:634`); ação `src/app/(painel)/meu-perfil/actions.ts:28-55` |
| **RF-042** e-mail somente leitura p/ não-Admin | **Existe com divergência** | `src/app/(painel)/meu-perfil/formularios.tsx:45-52` — campo `readOnly disabled` para **todos**; `emailEditavel` só troca o texto de ajuda |
| **RF-043** itens ausentes por perfil | **Existe** | `src/lib/navegacao.ts:22-37`; render em `src/app/(painel)/layout.tsx:20-30` |
| **RF-043** guarda de rota no servidor | **Parcial** | `src/server/auth/contexto.ts:29-35`, usada em `/usuarios*`, `/meus-projetos`, `/minhas-tarefas`. **Ausente** em `/clientes` e `/clientes/[id]` (usam só `obterContexto`) |
| **RF-043** redirecionamento provisório | **Existe** | `src/lib/navegacao.ts:49-54` (`ADMIN: "/clientes"`); raiz em `src/app/(painel)/page.tsx:10-13` |
| **RF-030** convite por e-mail | **Existe** | `src/lib/convites.ts:29-47`; token `src/lib/tokens.ts:20-37` (TTL 7 dias em `:7`) |
| **RF-030/031** definição de senha | **Existe** | `src/app/definir-senha/page.tsx:43-58` (estados) + `actions.ts:24-75`; requisitos na tela em `definir-senha-form.tsx:18,36-73` |
| **RF-032** recuperação de senha | **Existe com ressalva** | `src/app/esqueci-senha/actions.ts:34-67`; rate limit `:46-54`; TTL 1h em `src/lib/tokens.ts:8`. Ressalva: tempo de resposta (ver § 3.3) |
| **RN-007** só Admin cria / edita / desativa / reativa | **Existe** (duas camadas, com exceção) | Ação: `src/server/auth/contexto.ts:18-22`. Serviço: `src/lib/usuarios.ts:249,304,361,554,583`, `src/lib/desativacao.ts:29`. Banco: `20260903155236_rls_policies/migration.sql:67-71,398-402`. **Exceção:** caminhos na role dona (ver § 3.4) |
| **RN-009** desativado fora de cálculo | **N/A nesta sprint** | Não há indicador nem agenda ainda (Sprint 4). A metade verificável (sair das listagens) existe: `src/lib/clientes.ts:177,201`, `src/lib/usuarios.ts:94` |

---

## 3. Respostas às sete perguntas específicas

### 3.1. Retrofit da Sprint 2 — alguma query ou política ainda retorna registro desativado?

**Sim, três: `projetos`, `tarefas` e `subtarefas`.** Não é hipótese — foi medido.

Consulta às políticas vivas no banco de teste:

```
documentos         | documentos_select          | usa_cliente_esta_ativo = t
pessoas_envolvidas | pessoas_envolvidas_select  | t
pontos_contato     | pontos_contato_select      | t
responsaveis_legais| responsaveis_legais_select | t
projetos           | projetos_select            | f   <- e nem menciona "ativo"
tarefas            | tarefas_select             | f
subtarefas         | subtarefas_select          | f
```

E o vazamento reproduzido (fixtures em `BEGIN … ROLLBACK`, nada persistido):

```
-- cliente 'audit-cli' desativado; colaborador ADMIN_INTERNO atribuído ao projeto
clientes visiveis: 0      <- correto
projetos visiveis: 1      <- vaza
tarefas  visiveis: 1      <- vaza
```

**Alteradas:** `clientes_select` (filtro próprio, `migration.sql:42-68`);
`responsaveis_legais_select`/`_write` e `pontos_contato_select`/`_write` (herança, sem `ativo`
próprio — o RF-039 não os lista); `pessoas_envolvidas_select`/`_write` e
`documentos_select`/`_write` (`ativo` próprio **e** herança).

**Não alteradas, com o motivo:**

- `usuarios_*` — decisão explícita e correta (`migration.sql:223-228`): usuário desativado nem
  chega a ter sessão, `credentials.ts:34` recusa antes de qualquer query com contexto.
- `projetos_*`, `tarefas_*`, `subtarefas_*` — **sem motivo registrado em lugar nenhum.** O plano
  (tarefa A2) só nomeou "Pessoas Envolvidas e Documentos", então a implementação seguiu o plano;
  mas o RF-039 pede que "um projeto desativado torne suas tarefas inacessíveis", a RN-009 diz que
  "a desativação de um pai torna os filhos inacessíveis" (e Cliente é pai de Projeto), e o próprio
  ADR-008 escreveu que a consequência a testar é "`ativo` subindo a cadeia inteira (subtarefa →
  tarefa → projeto → cliente)". O plano acertou em chamar o A2 de tarefa mais arriscada da sprint;
  esta é exatamente a falha silenciosa que ele previu.

**Queries da aplicação:** todas retrofitadas. `listarClientes` (`clientes.ts:177`),
`listarCidadesComCliente` (`:201`), `buscarClienteDetalheSeguro` filhos (`:231-238`),
`listarUsuarios` (`usuarios.ts:94`), `listarOpcoesDeAtribuicao` (`:510,523` — filtra
`cliente: { ativo: true }`). Curiosamente o seletor filtra por cliente ativo na aplicação
enquanto a RLS não filtra — a camada de cima está mais correta que o banco, o inverso do desenho
de duas camadas do ADR-008.

### 3.2. Fluxo de convite — reaproveitado ou reconstruído?

**Reaproveitado e consolidado.** `src/lib/convites.ts` é o único lugar que emite token e envia
e-mail de definição de senha, e os quatro pontos de entrada chamam ele:

| Ponto de entrada | Chamada |
|---|---|
| RF-028 / RF-033 (checkbox "é um colaborador?" / promoção posterior) | `src/lib/pessoas-envolvidas.ts:87` |
| RF-030 (usuário interno) | `src/lib/usuarios.ts:276` |
| RF-031 (acesso do cliente) | `src/lib/clientes.ts:405` |
| RF-040 (reenviar convite) | `src/lib/usuarios.ts:367` |

**Não existem dois caminhos fazendo a mesma coisa.** A tarefa A0 (auditoria antes de codar) valeu
— o risco que o plano apontou ("reconstruir o fluxo de convite que a Sprint 2 já corrigiu") não
se materializou.

A única duplicação remanescente é pequena e de outra natureza: `src/app/esqueci-senha/actions.ts:59-64`
monta token e e-mail inline em vez de passar por um serviço, porque é o fluxo de *recuperação*
(TTL de 1 hora, outro assunto e outro corpo). Aceitável, mas se um dia mudar o remetente ou o
layout, são dois lugares.

### 3.3. Recuperação de senha — resposta idêntica, inclusive no tempo? Rate limit por e-mail e por IP?

**Conteúdo: idêntico, e testado.** Mesma string em todos os caminhos — e-mail inexistente,
usuário desativado, e limite estourado (`actions.ts:52-54`, com o raciocínio comentado no
código). Testes: `tests/integration/recuperacao-senha.integration.test.ts:104-113`
(`expect(comCadastro).toEqual(semCadastro)`), `:128-137` (desativado), `:147-163` (o limite não
muda a resposta).

**Tempo: não.** Este é o achado desta pergunta. O caminho do e-mail **existente e ativo** faz, em
sequência (`actions.ts:58-65`): `criarTokenAcesso` (32 bytes aleatórios + SHA-256 + `INSERT` em
`tokens_acesso`) e `enviarEmail` — que em produção é um POST HTTP ao Resend, aguardado
(`src/lib/email.ts:24`). O caminho do e-mail **inexistente** retorna imediatamente após um único
`SELECT`. A diferença é dominada pela chamada de rede: tipicamente 100–500 ms contra poucos
milissegundos. É um oráculo de existência de conta medível com um cronômetro, e ele devolve pela
porta de trás justamente o que a mensagem neutra protege.

Ressalva de método: isso não foi medido contra produção — a análise é do fluxo de código. O teste
de integração não mede tempo, e nele o `enviarEmail` está mockado, o que zera a diferença.

**Rate limit: existe nos dois eixos.** Por e-mail (3) e por IP (10), janela de 15 minutos
(`actions.ts:19-21,46-47`). Os dois são contados **antes** de qualquer decisão, então nem a
contagem revela nada. Implementação em memória, com a limitação assumida e explicada em
`src/lib/rate-limit.ts:1-10` (reiniciar o container zera a contagem; uma segunda réplica teria a
própria). Coerente com o deploy de processo único.

### 3.4. Permissão no endpoint — servidor e banco, ou só botão escondido?

**Servidor: sim, sempre.** Não há rota REST: tudo é Server Action, que é um `POST` para a própria
rota. A recusa acontece em dois pontos antes de qualquer escrita.

Onde um `POST`/`PATCH` de colaborador é recusado, concretamente:

- **Criar colaborador** → `src/app/(painel)/usuarios/novo/actions.ts:29` chama `exigirAdmin()`,
  que **lança** (`src/server/auth/contexto.ts:20`). Se escapasse, `src/lib/usuarios.ts:249`
  devolve `sem_permissao`. Teste: `tests/integration/usuarios-rn007.integration.test.ts:114-124`
  — e verifica que o usuário **não foi criado** no banco.
- **Editar colaborador** → `.../[id]/editar/actions.ts:17` → `src/lib/usuarios.ts:304` → e a RLS
  `usuarios_write` (`20260903155236_rls_policies/migration.sql:67-71`) recusa por último, porque
  `atualizarUsuario` escreve pela role de aplicação. Testes: `:126-134` (serviço) e `:136-142`
  (**RLS direta, sem passar pelo serviço** — `updateMany` devolve `count: 0`).
- **Atribuição** → `.../[id]/actions.ts:15` → `src/lib/usuarios.ts:554` → RLS `atribuicoes_write`
  (`migration.sql:398-402`). Teste `:144-152` (`rejects.toThrow()`).
- **Desativar** → `src/app/(painel)/usuarios/actions.ts:18` → `src/lib/desativacao.ts:29` → RLS.
  Teste `tests/integration/soft-delete-rf039.integration.test.ts:232-240`.

**Banco: sim, exceto onde a escrita roda na role dona.** `criarUsuarioInterno` usa
`prisma.usuario.create` (`src/lib/usuarios.ts:258`, role dona, sem RLS) porque `tokens_acesso`
não é alcançável pela role de aplicação. Nesses caminhos a RLS **não é uma segunda barreira** —
são as duas checagens em TypeScript. O código não esconde isso, diz com todas as letras
(`:241-243`: "a checagem de perfil aqui não é redundância decorativa, é a única barreira neste
caminho"). Mesma situação em `criarAcessoCliente`, `criarAcessoPessoaEnvolvida`,
`definirAcessoClienteAtivo`, `reenviarConvite` e `alterarMinhaSenha`.

Uma nuance sobre os testes: eles exercitam o **serviço** e a **RLS**, nunca a Server Action.
`exigirAdmin()` em si não tem teste. Como a action é um invólucro fino, a cobertura é equivalente
na prática — mas não é literalmente "no endpoint", como o plano afirma.

### 3.5. `cliente_esta_ativo` cobre todos os filhos?

**Não.** A função está correta (`20260916110500_.../migration.sql:26-29`), inclusive no cuidado de
devolver `false` e nunca `NULL` — lição direta do bug de `NULL = NULL` da Sprint 2, e há teste
para isso (`soft-delete-rf039.integration.test.ts`, "devolve false (nunca NULL) para cliente
inexistente").

Filhos de `Cliente` e quem usa a função:

| Tabela filha | `_select` | `_write` |
|---|---|---|
| `responsaveis_legais` | usa | usa |
| `pontos_contato` | usa | usa |
| `pessoas_envolvidas` | usa | usa |
| `documentos` | usa | usa |
| **`projetos`** (`clienteId`) | **não usa** | **não usa** |
| `tarefas` / `subtarefas` (netos) | **não usa** | **não usa** |
| `usuarios` (`clienteId`, perfil CLIENTE) | não usa — por decisão | não usa |

Sobre `usuarios`: desativar o cliente **não** revoga o login do usuário CLIENTE dele. Ele entra e
cai em `/meu-perfil` sem enxergar nada (a RLS de `clientes` o barra), então não é vazamento — mas
também não é o que a Talita provavelmente espera de "desativei este cliente". O RF-029 (bloquear
acesso) continua sendo uma ação separada, e isso não está escrito em lugar nenhum.

### 3.6. Status de acesso é derivado, sem coluna nova?

**Sim, e é limpo.** `src/lib/usuarios.ts:19-25`: `!ativo → DESATIVADO`, senão
`senhaHash ? ATIVO : PENDENTE`. Nenhuma coluna `status_acesso` no schema (a tarefa A3 do plano
cogitava criar uma). A `usuarios.ativo` foi reaproveitada da Sprint 1 em vez de duplicada, com o
motivo registrado na própria migration (`20260916110000_.../migration.sql:11-14`) e no ADR-008.

**Os três estados aparecem corretamente.** Teste unitário com os quatro casos, incluindo o
caso-limite `ativo: false, senhaHash: "hash"` → `DESATIVADO`
(`tests/unit/administracao-acesso.unit.test.ts:24-33`). Na listagem: etiqueta com três tons
(`src/app/(painel)/usuarios/page.tsx:18-22`), e o smoke test verifica a transição
`PENDENTE → ATIVO` percorrendo o fluxo real (`tests/smoke/administracao-acesso.smoke.test.ts:92,127`).

### 3.7. Telas de atribuição com banco vazio — o caminho rodou com dado de verdade?

**A estrutura está completa** e corresponde ao wireframe A2/A3: agrupamento por cliente › projeto
› tarefa (`src/lib/usuarios.ts:480-488`, `usuario-form.tsx:39-45`), seção que troca conforme o
perfil (`usuario-form.tsx:283-298`), estado vazio como texto explicativo
(`adicionar-atribuicao.tsx:23-25`), origem Manual/Automática com remoção bloqueada
(`[id]/page.tsx:68-80`).

**Sim, uma atribuição real foi exercitada ponta a ponta** — este era o risco maior da decisão
"opção (a)" da Seção 5 do plano, e ele não se materializou. O smoke test cria um `Projeto` de
verdade, cria o Colaborador Interno já atribuído a ele, a pessoa define senha, autentica, e o
teste verifica que ela enxerga **exatamente** aquele cliente e cai em `/meus-projetos`
(`tests/smoke/administracao-acesso.smoke.test.ts:60-128`). O caminho de atribuir depois também
roda com dado real (`usuarios-rn007.integration.test.ts:500-520`).

**Mas uma peça nunca rodou: `listarOpcoesDeAtribuicao`.** É a query que popula o seletor, e ela
não aparece em teste nenhum — só em páginas que hoje devolvem lista vazia. A **forma** da consulta
foi validada reproduzindo o SQL equivalente com fixtures em transação revertida, e está certa
(traz o projeto/tarefa do cliente ativo e exclui os do desativado). Mas a função TypeScript em si
— com os filtros aninhados do Prisma `where: { projeto: { cliente: { ativo: true } } }` — nunca
foi executada. A tentativa de executá-la diretamente foi bloqueada pelo ambiente (limpeza de
fixtures em massa); isso fica registrado explicitamente em vez de suposto.

---

## 4. Situação dos testes

```
vitest run                              -> 11 arquivos,  99 testes,  99 passando
vitest run --config vitest.unit.config   ->  4 arquivos,  62 testes,  62 passando
                                            TOTAL: 161 testes, 0 falhas
npm run lint                             -> limpo
17 migrations aplicadas, nenhuma pendente
```

O plano e o checklist dizem **152 testes (92 + 60)**. O número real é **161 (99 + 62)** — a
diferença veio do commit `363d7c2`, posterior, que somou 152 linhas de teste ao `usuarios-rn007`.
Documento desatualizado, nada mais.

### Confronto com o checklist de "Sprint Pronta"

| Item | Veredito |
|---|---|
| Unitário de RN nova (RN-009), principal + limite | **Parcial, e na categoria errada.** Não existe teste *unitário* de RN-009 — e não faz sentido existir, porque a regra mora na RLS, não em lógica pura. Está coberta por integração: caso principal `soft-delete-rf039:105-110`, caso-limite "pai desativado com filhos ativos" `:157-168`. **Mas o caso-limite verifica só `responsavelLegalSeguro` e `pontoContatoSeguro`.** Se tivesse incluído projeto/tarefa, teria pegado o vazamento do § 3.1. É o caso exato de teste que passa sem cobrir o caso. |
| Permissão para **RN-007** | **Coberto.** 9 testes (`usuarios-rn007:113-161` e `:78-111`), nas duas camadas — serviço e RLS direta. Ressalva: a Server Action (`exigirAdmin`) não é exercitada. |
| Permissão para **RF-039** | **Coberto.** 15 testes em `soft-delete-rf039`, todos passando pela role `multiplus_app` com contexto — é a RLS de verdade, não a query da aplicação. |
| Permissão para **RF-043** | **Não coberto de fato.** Os 8 testes (`administracao-acesso.unit.test.ts:45-…`) exercitam a função pura `perfilPodeAcessar`. Nenhum teste passa pelo proxy nem por `exigirAcessoARota`, e as duas páginas de `/clientes` não chamam a guarda. O critério de aceite do RF-043 ("acesso direto por URL a rota fora do perfil é negado") não está verificado ponta a ponta. |
| Smoke: criar usuário → convite → senha → login | **Coberto em substância, com um trecho pulado.** `administracao-acesso.smoke.test.ts:60-128` cobre criação, convite, extração do token do corpo do e-mail, validação, autenticação e tela inicial. Mas grava `senhaHash` direto (`:104-108`) em vez de chamar `definirSenhaAction` — então a política de senha no servidor, o consumo do token pela action e o login automático nunca são executados por teste. |
| Smoke: desativar → sumir da listagem → reativar | **Coberto.** `:229-…`, verificando que nenhum dado do cadastro se perde no ciclo, mais usuário desativado sem login e histórico preservado. |
| Regressão Sprints 1 e 2 | **Coberto.** As 6 suítes anteriores passam sem alteração de expectativa. O retrofit A2 não quebrou nada. |
| Healthcheck pós-deploy | **Não coberto.** A sprint alterou schema, então é obrigatório pelo Padrão de Testes. Não existe endpoint de health na aplicação (só os do `docker-compose.yml:18,38`, de container) nem diretório `.github` — o gate de CI do Padrão § 5 nunca foi criado. Pendência herdada da Sprint 1 e assumida no `README.md:108-110`. |
| Falha de integração externa (Resend) | **Coberto.** `:163-186` — `mockRejectedValueOnce`, usuário criado mesmo assim, `convite === "falha_no_envio"`, e o reenvio funciona depois. Ver, porém, a divergência § 5.6: o aviso dessa falha não chega à tela. |

**Sem cobertura nenhuma:** RF-042 inteiro (`alterarMinhaSenha`, `atualizarMeuNome`),
`listarOpcoesDeAtribuicao`, `exigirClienteAtivo`, `buscarUsuario` e todas as 12 Server Actions.

---

## 5. Divergências e lacunas

Ordenadas por gravidade.

### 5.1. RLS de `projetos`/`tarefas`/`subtarefas` ignora a desativação do cliente

**Problema.** `projetos_select` (`20260903191825_.../migration.sql:37-55`) não consulta
`cliente_esta_ativo`; `tarefas_select` e `subtarefas_select` tampouco. Reproduzido: cliente
desativado → `clientes: 0`, `projetos: 1`, `tarefas: 1` para o colaborador atribuído.

**Risco.** Nenhum hoje (não há dado de Projeto). Alto a partir da Sprint 4: a Talita desativa um
cliente, ele desaparece do painel, e os colaboradores continuam vendo projetos e tarefas dele —
inclusive, via RF-046, o nome do cliente. Contraria o critério de aceite do RF-039, a RN-009 e a
consequência que o próprio ADR-008 mandou testar.

**Correção proposta.** Migration nova que recrie as três políticas de `SELECT` acrescentando o
filtro de herança, no mesmo padrão das filhas — em `projetos`,
`(app_current_perfil() = 'ADMIN' OR cliente_esta_ativo("clienteId"))` em conjunção com o corpo
atual. Para `tarefas` e `subtarefas`, que não têm `clienteId`, criar uma segunda função
`SECURITY DEFINER` (`cliente_do_projeto_esta_ativo(projetoId)`) pelo mesmo motivo de sempre: um
subselect reabre o caminho da recursão corrigida em 03/09/2026. Junto, estender o caso-limite de
`soft-delete-rf039` para afirmar `projetos: 0` e `tarefas: 0`. Fazer isso **agora**, não na
Sprint 4 — enquanto não há dado, a migration é trivialmente segura; depois, é correção em
produção.

### 5.2. Cliente desativado ainda aceita criação de acesso

**Problema.** O bloco "Acesso do cliente" (`src/app/(painel)/clientes/[id]/page.tsx:298-312`) é
condicionado só a `ctx.perfil === "ADMIN"`, sem `&& cliente.ativo` — diferente de todos os blocos
vizinhos (`:103,213,250,279`). E `criarAcessoCliente` roda na role dona
(`src/lib/clientes.ts:380-408`), então a RLS também não barra.

**Risco.** A Talita desativa um cliente e, na mesma tela, consegue clicar "Criar acesso": nasce um
`Usuario` de perfil CLIENTE e sai um e-mail de definição de senha para alguém de um cadastro que
acabou de sair do ar. Viola "registro desativado é somente leitura" e é alcançável sem nenhum
truque de URL.

**Correção proposta.** Duas camadas, como no resto da sprint: `&& cliente.ativo` na condição do
bloco, e `exigirClienteAtivo(ctx, clienteId)` no começo de `criarAcessoAction` e
`criarAcessoPessoaEnvolvidaAction` (`src/app/(painel)/clientes/[id]/actions.ts:65,120`). Mais um
teste de integração para o serviço.

### 5.3. Guarda de rota do RF-043 ausente nas páginas de `/clientes`

**Problema.** `/clientes` e `/clientes/[id]` chamam `obterContexto()` (`page.tsx:13` e
`[id]/page.tsx:70`), não `exigirAcessoARota`. O comentário do `src/proxy.ts:22-25` afirma que
"cada página protegida repete a verificação no servidor via `exigirAcessoARota`" — para essas
duas, não.

**Agravante.** As duas páginas têm ramos escritos para não-Administrador
(`ctx.perfil === "ADMIN" && …` em toda parte), como se fossem acessíveis a colaboradores. Mas
`MENU` declara `/clientes` como `perfis: ["ADMIN"]` (`navegacao.ts:23`), e o proxy redireciona. Ou
o `MENU` está errado, ou esses ramos são código morto — hoje são duas afirmações contraditórias
sobre quem entra em `/clientes`.

**Risco.** Médio. O proxy cobre também os pedidos de RSC (o `matcher` é por caminho), então na
prática não há acesso indevido. O que falta é a camada que a própria documentação do Next chama de
obrigatória, e o teste de RF-043 não cobre nenhuma das duas. Se amanhã alguém mexer no `matcher`
ou em `ROTAS_PUBLICAS`, a única barreira dessas telas cai sem nenhum teste vermelho.

**Correção proposta.** Trocar por `exigirAcessoARota("/clientes")` nas quatro páginas de
`/clientes` e decidir o `MENU`: se `/clientes` é ADMIN-only, remover os ramos de
não-Administrador; se colaborador deve entrar, declarar os perfis. Depois, um teste de integração
que chame as guardas de verdade em vez de só a função pura.

### 5.4. RF-042 sem nenhum teste

**Problema.** `alterarMinhaSenha` (`src/lib/usuarios.ts:626-644`) e `atualizarMeuNome`
(`:609-619`) não aparecem em teste algum. A regra central do requisito — "alterar a própria senha
**informando a senha atual**" — não é verificada.

**Risco.** Médio-alto. É a única escrita liberada a todo perfil autenticado, e ela toca
`senhaHash` pela role dona. A lógica está correta na leitura do código (`verificarSenha` em
`:634`, política em `:637`, e a conferência acontece antes da escrita) — mas uma inversão de
condição aqui passa pela suíte inteira sem alarme, e o checklist da sprint está marcado como se
isso estivesse coberto.

**Correção proposta.** Três testes de integração: senha atual correta troca; senha atual errada
recusa **e não altera o hash**; nova senha fraca recusa. Mais um para `sem_senha` (usuário que
nunca ativou).

### 5.5. Oráculo de tempo no endpoint de recuperação de senha

**Problema.** Detalhado no § 3.3: o caminho do e-mail cadastrado faz um `INSERT` e aguarda o POST
ao Resend; o do não cadastrado retorna após um `SELECT`.

**Risco.** Médio. Anula, na prática, a proteção que a mensagem neutra e o rate limit por IP foram
construídos para dar — com a diferença de que enumerar por tempo ainda respeita os 10 por 15 min
por IP, o que encarece mas não impede. Em sistema que guarda dado de cliente sob LGPD, saber quais
e-mails têm conta já é informação.

**Correção proposta.** Não aguardar o envio na resposta (disparar e deixar o erro no log, como
`convites.ts:43` já faz) **ou** dar um piso fixo de tempo à action — medir o início e esperar até
completar, digamos, 400 ms nos dois caminhos. A primeira é mais simples e resolve; a segunda é
mais robusta se um dia entrar bcrypt nesse fluxo. Vale um teste que compare as duas durações com
margem.

### 5.6. O aviso de falha no envio do convite nunca aparece

**Problema.** `criarUsuarioAction` redireciona para `/usuarios?convite=falhou`
(`novo/actions.ts:75-79`), mas `UsuariosPage` não lê esse parâmetro — o tipo de `searchParams` é
`{ busca, perfil, desativados }` (`page.tsx:110`) e nada renderiza `convite`. Confirmado por
`grep`: as duas únicas ocorrências de `convite=` no `src/` são as que **escrevem** a URL.

**Risco.** Médio, e justamente no cenário que o teste de falha do Resend existe para proteger. A
Talita cadastra alguém, o Resend está fora, ela é redirecionada para uma listagem que parece
normal e conclui que o convite foi enviado. A pessoa nunca recebe o e-mail, e o único sinal é a
etiqueta "Pendente de ativação" — que é o estado esperado de qualquer convite recém-enviado. O
teste passa porque testa o serviço, não a tela.

**Correção proposta.** Ler `convite` em `searchParams` e renderizar uma faixa: sucesso discreto
para `enviado`, e para `falhou` um alerta que nomeie a ação ("O usuário foi criado, mas o e-mail
de convite não saiu. Use 'Reenviar convite'.").

### 5.7. Dois caminhos escrevem `usuarios.ativo` com auditoria diferente

**Problema.** `definirAtivo` grava `desativadoEm`/`desativadoPor` (`src/lib/desativacao.ts:37-39`).
`definirAcessoClienteAtivo` (`src/lib/clientes.ts:411-413`), usada pelo RF-029, grava só `ativo` —
na role dona, sem checagem de perfil própria (só o `exigirAdmin()` da action em
`[id]/actions.ts:87`).

**Risco.** Baixo, mas é dívida de auditoria: metade dos bloqueios de acesso fica sem registro de
quem e quando. O ADR-008 justifica reaproveitar a coluna `ativo`, e está certo — mas reaproveitar
a coluna e não as de auditoria é meio caminho.

**Correção proposta.** Fazer `definirAcessoClienteAtivo` delegar a
`definirAtivo(ctx, "usuario", id, ativo)`. Isso unifica a auditoria e traz de graça a barreira da
RLS e a proteção contra auto-desativação. Exige passar `ctx` para ela.

### 5.8. `definirSenhaAction` não verifica se o usuário está ativo

**Problema.** `src/app/definir-senha/actions.ts:43-72`: valida o token, grava `senhaHash`, consome
o token e chama `signIn`. Em nenhum ponto consulta `usuario.ativo`. Um convite emitido antes da
desativação continua valendo.

**Risco.** Baixo (não concede acesso — `credentials.ts:34` recusa o login), mas o resultado é
feio: a senha é gravada, o token é queimado, e `signIn` lança um `AuthError` que ninguém captura —
diferente de `loginAction`, que trata (`login/actions.ts:16-21`). A pessoa recebe uma tela de erro
do Next em vez de "seu acesso foi desativado".

**Correção proposta.** Após validar o token, carregar o usuário e recusar com mensagem própria se
`!ativo`. E envolver o `signIn` em `try/catch` que reconheça `AuthError` (cuidando de repropagar o
`NEXT_REDIRECT`, que é como o caminho felizes funciona).

### 5.9. Seletor de atribuições sem teste

**Problema.** `listarOpcoesDeAtribuicao` (`src/lib/usuarios.ts:498-539`) não tem cobertura. É a
função que a Sprint 4 vai encontrar já "pronta".

**Risco.** Médio no tempo. A forma da consulta está correta (validada em SQL), mas os filtros
aninhados do Prisma nunca executaram. Um erro aqui aparece só quando existir projeto — e vai
parecer bug da Sprint 4.

**Correção proposta.** Dois testes de integração com `Projeto`/`Tarefa` reais: o seletor de
Interno traz projetos e exclui os de cliente desativado; o de Externo traz tarefas agrupadas por
cliente › projeto e exclui as de cliente desativado. Em cima da fixture que `usuarios-rn007` já
monta.

### 5.10. Meu Perfil: e-mail bloqueado inclusive para o Administrador

**Problema.** `formularios.tsx:46` — `readOnly disabled` sem condição; `emailEditavel` (`:48`) só
decide se o texto de ajuda aparece. E `atualizarNomeAction` só grava o nome.

**Risco.** Baixo. O RF-042 é atendido no essencial (não-Administrador não altera), e o
Administrador altera e-mail pelo formulário de usuário (`atualizarUsuario` aceita `email`,
`usuarios.ts:321`) — inclusive o próprio. Mas a prop sugere um comportamento que não existe, e a
próxima pessoa a ler vai achar que o Administrador edita o e-mail ali.

**Correção proposta.** Escolher um dos dois: ou usar `emailEditavel` de verdade (campo liberado e
a action gravando o e-mail, com checagem de unicidade), ou remover a prop e deixar só o texto
explicativo, apontando a Tela A2. A segunda é preferível — um caminho só para alterar e-mail, e é
o que o PDD da Tela A6 descreve.

### 5.11. Afirmações de documento que o código não sustenta

- O ADR-008 diz que a guarda `exigirClienteAtivo` é "coberta por teste"
  (`architecture-multiplus-software.md:637-641`). Não é: os testes de "somente leitura"
  (`soft-delete-rf039:195-219`) exercitam a **RLS** das tabelas filhas, não `atualizarCliente`.
  **Correção:** ou escrever o teste, ou corrigir a frase.
- O plano registra 152 testes; são 161. **Correção:** atualizar a linha do checklist.
- O plano marca "Teste de permissão/RLS (RF-043): acesso direto por URL a rota fora do perfil é
  negado" como feito. É teste de função pura, e duas rotas não chamam a função.
  **Correção:** desmarcar até fechar a divergência § 5.3.

### 5.12. A página de edição de cliente desativado abre

**Problema.** `/clientes/[id]/editar` checa perfil (`editar/page.tsx:10`) mas não `cliente.ativo`;
a proteção é só no salvar, via `exigirClienteAtivo`, que lança um `Error` cru
(`desativacao.ts:75`) sem tratamento na action (`editar/actions.ts:26`).

**Risco.** Baixo — o link é escondido (`[id]/page.tsx:103`) e nada é gravado. Mas quem chegar por
URL preenche o formulário e leva uma tela de erro do Next em vez de um aviso.

**Correção proposta.** `redirect` para o detalhe quando `!cliente.ativo` na página, e converter o
`throw` em retorno de `{ erro }` na action.

---

## 6. Achados de implementação ainda não registrados no SRS ou no ADD

Nenhum bug foi *encontrado e corrigido durante* a Sprint 3 no sentido das duas anteriores — as
mensagens de commit não registram nenhum, e não há migration de correção. O que a sprint produziu
foram quatro decisões e armadilhas que vivem só em comentário de código. Dado o valor que o
`NULL = NULL` e o checkbox tiveram por estarem escritos, estas merecem o mesmo tratamento.

### A. O inverso do `NULL = NULL`: em JavaScript, `null === null` é `true`

`src/lib/usuarios.ts:458-466`. A origem da atribuição é decidida comparando
`usuario.pessoaEnvolvidaId` com `tarefa.responsavelId` — dois campos nulos com frequência. Em SQL,
dois nulos não são iguais (foi o bug da trigger da RN-004); em JS, são. Sem as duas checagens
`!= null`, **todo** usuário sem Pessoa Envolvida atribuído a uma tarefa sem responsável viraria
"automática" — e portanto não removível. A mesma categoria de erro da Sprint 2, com o sinal trocado
ao atravessar a fronteira entre PL/pgSQL e TypeScript. Tem caso-limite testado
(`usuarios-rn007:439-454`) e está comentado no código, mas não aparece no ADD.

**É o achado da sprint.** Sugestão: registrar no ADR-008 ou como nota no ADR-007, ao lado do
original. A lição não é "cuidado com NULL em SQL", é "a semântica de nulo muda de lado a lado".

### B. `config.matcher` do proxy tem que ser literal — constante importada quebra em produção

`src/proxy.ts:32-37` e `src/lib/navegacao.ts:67-80`. O Next extrai o objeto `config` em tempo de
build sem executar os imports do módulo, então importar `PADRAO_ROTAS_DO_PROXY` ali gera
`ReferenceError` em toda requisição. A solução foi duplicar o valor e criar um teste unitário que
falha se os dois divergirem (`administracao-acesso.unit.test.ts`, "o matcher escrito em
src/proxy.ts é o mesmo que os testes acima exercitam").

É restrição do framework, descoberta na implementação, do tipo que a próxima pessoa vai reencontrar
do jeito difícil. Pertence ao ADD — e é justamente o tipo de coisa que o `AGENTS.md` deste
repositório avisa que difere das versões anteriores do Next.

### C. A origem "Automática" é derivada, e o efeito colateral foi aceito sem registro

`src/lib/usuarios.ts:387-398`. Não há coluna `origem`: uma atribuição de tarefa é automática
quando o responsável daquela tarefa é a Pessoa Envolvida daquele usuário. A consequência é que
**uma atribuição criada à mão** para uma tarefa cuja responsável já é aquela pessoa aparece como
automática e fica **não removível** — o RF-041 diz que as automáticas "devem ser identificadas
como tais", e aqui uma manual é identificada errado.

O código argumenta, com razão, que o resultado prático é o correto (remover sem trocar o
responsável faria a RN-006 recriar a linha no próximo `definirResponsavelTarefa`). É uma decisão
defensável, mas é uma decisão — o ADD só menciona a derivação de passagem no PDD
(`product-design-multiplus-projetos-tarefas.md:1083`), sem a contrapartida.

### D. Trocar o perfil de um usuário apaga atribuições, e isso não estava especificado

`src/lib/usuarios.ts:317-343`. Mudar de Colaborador Interno para Externo muda a granularidade
(RN-005), então as atribuições da granularidade antiga são deletadas — mantê-las deixaria linhas
que a RLS nunca honra, e a Tela A1 contaria acesso inexistente. A implementação devolve quantas
saíram e a tela avisa (`[id]/page.tsx:178-184`), o que é o cuidado certo.

Mas é **perda de dado** disparada por uma edição de campo, e nem o SRS nem o PDD nem o plano
previram isso. Merece uma linha no RF-040 ou na RN-005, porque é o tipo de comportamento que gera
um "mas eu só mudei o perfil dela" três meses depois.

### E. Decisões de escopo tomadas na implementação, corretas mas só nos comentários

Duas:

- O perfil CLIENTE foi deliberadamente excluído da Tela A1 (`usuarios.ts:45-50`) para não haver
  dois caminhos gerindo o mesmo acesso — e pedir `perfil: "CLIENTE"` no filtro devolve vazio em
  vez de listar (`:88`).
- A Tela A6 não usa `exigirAcessoARota` por ser a única tela de administração que não é do
  Administrador (`meu-perfil/page.tsx:15-19`).

Ambas são boas decisões; nenhuma está no SRS.

---

## Histórico de Revisões

| Versão | Data | Autor | Alterações |
| ------- | ---- | ----- | ---------- |
| 1.0 | 16/09/2026 | auditoria por Claude Code, a pedido do André (Somma) | Auditoria de conformidade da Sprint 3 (Administração e Acesso) entre SRS v2.1 / ADD v1.9 / plano da sprint e o código efetivamente entregue. 12 divergências e 5 achados de implementação não registrados. Nenhum arquivo do projeto alterado. |
