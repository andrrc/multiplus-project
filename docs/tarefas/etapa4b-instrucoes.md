# TAREFA etapa4b-instrucoes — Página de Instruções de uso do externo (etapa 4b)

> Campo sem resposta fica como **pendente de validação**, nunca como suposição. Escopo aprovado pelo usuário em 2026-11-24: a
> [análise da etapa 4](../analises/comprovantes-etapa4-instrucoes-foto-mensagens.md) foi aprovada com todas as recomendações. **A análise é a
> especificação**: em caso de dúvida, vale a análise; se ela não responde, pare e pergunte. Esta tarefa é a parte **4b**. **Só começa depois de
> `etapa4a-foto-exemplo` integrada** (as duas reservam o schema e as migrations).

| Campo | Valor |
|---|---|
| **ID** | `etapa4b-instrucoes` |
| **Agente responsável** | codex |
| **Branch** | `codex/etapa4b-instrucoes` (criada a partir de `origin/staging`, depois da integração da 4a) |
| **Worktree** | `~/multiplus-worktrees/codex-etapa4b-instrucoes` |
| **Estado** | aprovada (na fila: aguarda a `etapa4a-foto-exemplo`) |
| **Quem aprovou o escopo** | o usuário, em 2026-11-24 (análise aprovada com as recomendações) |
| **Revisor** | claude |
| **Criada em** | 2026-11-24 |

## 1. Objetivo

O colaborador externo tem uma página `/instrucoes` com as orientações num lugar só: vídeo, como funciona, como tirar uma boa foto, prazos e
avisos, modelos para baixar, privacidade, perguntas frequentes e contatos (cada coordenador dos itens dele, com botão de WhatsApp, e o contato
geral da Múltiplus). A administração cadastra o vídeo, os modelos e o contato geral.

## 2. Contexto da funcionalidade

- **Especificação:** [a análise](../analises/comprovantes-etapa4-instrucoes-foto-mensagens.md), parte **4b**, e as respostas 3, 4 e 5 da seção 10. Protótipo: `telas-novas/sistema-gestao-multiplus-colaborador-externo/03-instrucoes.html` e a seção 5.4 da especificação (`00-especificacao-colaborador-externo.md`). Os dados dos protótipos são ilustrativos. Os textos fixos entram como estão, **exceto** a frase "os atrasos aparecem para a diretoria da empresa", que está **pendente de validação** com a Talita: deixe-a de fora ou marque no código com um comentário e avise a pessoa responsável.
- **Padrão a seguir:** tabelas de uma linha (`ConfiguracaoNotificacao`, `ConfiguracaoSemaforo`, `id = 1`) editadas em `/configuracoes`; rota de arquivo com RLS como `api/comprovantes/[id]`; função `SECURITY DEFINER` como as da etapa 3 (`estado_pedido_prazo`).
- **Esta tarefa muda dado, permissão, storage e cabeçalho de segurança?** **Sim**, e a análise aprovada cobre os quatro: duas tabelas novas, o externo lendo nome e telefone dos coordenadores dos itens dele, objetos novos no bucket e `frame-src` no CSP.

**Decisões que valem aqui (resumo da análise):**

1. Tabela `configuracoes_instrucoes` (linha única, `id = 1`): `videoUrl`, `contatoGeralNome`, `contatoGeralTelefone`, `contatoGeralEmail`, `politicaPrivacidadeUrl`, todos opcionais, e `atualizadoEm`. Tabela `modelos_instrucao` (`id`, `titulo` até 120, `chave`, `nomeOriginal`, `tipo`, `tamanhoBytes`, `ativo`, `criadoEm`, `criadoPorId`); sem exclusão, a administração **desativa**.
2. `videoUrl`: só `https` e só os hosts `youtube.com`, `youtu.be`, `youtube-nocookie.com` e `drive.google.com`; a URL de incorporação é montada **no servidor**. `frame-src` do CSP só para `youtube-nocookie.com` e `drive.google.com`. Sem vídeo, a seção não aparece.
3. Modelos: mesmos tipos de comprovante (imagem, PDF, planilha e documento do Office), até 10 MB cada, no máximo 10 ativos; baixados, nunca abertos no navegador (exceto imagem e PDF, como a rota de comprovante).
4. Função `contatos_do_externo()` (`SECURITY DEFINER`): devolve ao externo logado só `nome`, `telefone` e os itens (id e nome) de cada coordenador **dos itens dele**. Coordenador é o interno atribuído ao **projeto** (`atribuicoes` com `entidadeTipo = PROJETO`). Item sem interno atribuído cai no contato geral; sem contato geral, texto fixo e nenhum botão.
5. WhatsApp é só um link `https://wa.me/55<dígitos>`; telefone fora do padrão esconde o botão. **Pendente de validação** com a Talita: o número exibido é o telefone cadastrado do usuário interno (não há campo separado de WhatsApp).
6. `/instrucoes` abre **só para o externo**; administração, interno e cliente recebem "negado".

## 3. Escopo

**Arquivos e módulos permitidos:**

- `prisma/schema.prisma` e **uma** migration nova (**reservados**). O timestamp precisa ser posterior ao da última de `origin/staging` (confira antes de publicar).
- `src/lib/navegacao.ts` (**reservado**): rota `/instrucoes` e item de menu só para `ADMIN_EXTERNO`. A rota nova precisa entrar no `MENU`, senão responde "negado".
- `src/lib/csp.ts` (**reservado por esta tarefa**): acrescentar `frame-src` restrito aos dois hosts. Mexe em cabeçalho de segurança: nenhuma outra diretiva muda.
- `src/lib/storage.ts`: só **acrescentar** funções para modelos.
- Arquivos novos em `src/lib/` (por exemplo `instrucoes.ts` para o acesso a dados e `instrucoes-regras.ts` para as regras puras: hosts do vídeo, URL de incorporação, telefone do WhatsApp).
- Página nova `src/app/(painel)/instrucoes/**` e rota nova `src/app/api/instrucoes/modelos/[id]/route.ts`.
- `src/app/(painel)/configuracoes/page.tsx` (e arquivos novos da pasta): aba "Instruções do externo", só ADMIN, com Server Actions que montam os dados campo a campo.
- Testes novos: `tests/unit/instrucoes*.test.ts`, `tests/integration/instrucoes.integration.test.ts` e uma jornada nova em `tests/browser/`.
- Documentação: `docs/funcionalidades/interface.md` e uma página nova `docs/funcionalidades/instrucoes.md`, e a linha do módulo em `docs/funcionalidades/README.md`.

**Arquivos e módulos proibidos:**

- As regras de prazo: `src/lib/prazo-em-conferencia.ts`, `src/lib/situacao-prazo.ts`, `src/lib/semaforo.ts`, `src/lib/agenda-itens.ts` e `src/lib/regras-projetos-tarefas.ts`.
- `src/ui/**`, `src/app/globals.css`, `package.json`, `package-lock.json`, `src/lib/prisma-app.ts` e `src/server/auth/**`.
- Configuração de testes, CI, `ops/`, Docker.
- As partes 4a (foto de exemplo) e 4c (mensagens, comentários).
- `docs/analises/planejamento-diferencas-prototipos.md` e `docs/decisoes-desenvolvimento.md` (as notas vão na seção 8).
- Os arquivos de qualquer outra tarefa.

**Arquivos compartilhados reservados por esta tarefa:**

- `prisma/schema.prisma`
- `prisma/migrations/**`
- `src/lib/navegacao.ts`
- `src/lib/csp.ts`

## 4. Dependências

- Tarefas que precisam estar integradas antes: `etapa4a-foto-exemplo` (só para liberar a reserva do schema e das migrations; não há dependência de código).
- Tarefas que dependem desta: `etapa4c-mensagens` (reserva do schema e das migrations).

## 5. Contratos e interfaces relevantes

- **Tabelas de uma linha:** o padrão de leitura e gravação de `ConfiguracaoSemaforo`; a administração é a única que grava (RLS e `GRANT` só de `SELECT` para a role da aplicação se a gravação passar por função, ou política de `UPDATE` só ADMIN).
- **Funções `SECURITY DEFINER`** com `SET search_path = public`, `REVOKE ALL ... FROM PUBLIC` e `GRANT EXECUTE` à role `multiplus_app`; `contatos_do_externo()` devolve **vazio** para qualquer perfil que não seja `ADMIN_EXTERNO`.
- **Leitura de arquivo:** `lerObjeto` de `src/lib/storage.ts`; modelo de resposta em `api/comprovantes/[id]` (404 indistinto, `no-store`, `nosniff`). A rota de modelo recusa o perfil CLIENTE e o interno explicitamente.
- **Telefone:** `Usuario.telefone`; normalize para dígitos, acrescente `55` quando tiver 10 ou 11 dígitos e esconda o botão em qualquer outro caso.
- **Acesso:** `comContextoDeUsuario`; `exigirAdministrador` e o padrão de `src/app/(painel)/configuracoes/page.tsx`.

## 6. Critérios de aceite

- [ ] `/instrucoes` abre só para o externo (e aparece no menu dele); administração, interno, cliente e sem sessão são recusados.
- [ ] Vídeo: URL de host fora da lista ou sem `https` é recusada ao salvar; o vídeo é incorporado com o CSP novo; sem vídeo, a seção não aparece.
- [ ] Modelos: só a administração cadastra e desativa; o externo baixa os ativos; tipo pelos bytes, 10 MB, no máximo 10 ativos; cliente e interno não baixam.
- [ ] Contatos: cada coordenador dos itens do externo aparece com a lista dos itens e o botão de WhatsApp; o externo não vê coordenador de item de outro; sem interno atribuído, o contato geral; sem nada, o texto fixo.
- [ ] Nenhuma outra diretiva do CSP muda (teste unitário compara com a política anterior).
- [ ] Funciona em 375 px e no desktop, sem rolagem horizontal, só com tokens de `globals.css`.

## 7. Testes obrigatórios

- **Unitário em `tests/unit/`:** hosts e esquemas do vídeo e a URL de incorporação, normalização do telefone, o CSP (só `frame-src` muda) e as regras de modelo.
- **Integração em `tests/integration/instrucoes.integration.test.ts` (perfil permitido e negado, pela role RLS-restrita):** gravação da configuração e dos modelos só pela administração; `contatos_do_externo()` (externo com itens, sem itens, de outro projeto, e os outros perfis recebendo vazio); download de modelo por perfil; modelo desativado não baixa.
- **Jornada em `tests/browser/` (arquivo novo):** a administração cadastra vídeo, modelo e contato geral; o externo abre `/instrucoes`, vê o vídeo, baixa o modelo e vê o coordenador; a 375 px e no desktop, sem rolagem lateral.
- **Verificação final:** `bash scripts/agentes/verificar.sh --completo` (Git Bash) sem falhas novas; avise antes, porque só uma suíte de banco roda por vez.
- **Ordem sugerida, um commit por etapa:** (1) migration, funções e testes de RLS; (2) regras puras, storage e rotas; (3) página do externo e CSP; (4) aba da administração; (5) jornada e documentação.

## 8. Notas para o planejamento e as decisões

Para quem integra, após a entrega, registrar a conclusão da parte 4b no planejamento e consolidar as decisões tomadas aqui, incluindo o destino da frase pendente de validação.

## 9. Resumo da implementação (preenchido ao terminar)

- Commits e arquivos alterados (resumo):
- Decisões tomadas durante o trabalho:
- Verificações executadas e resultado (comando e saída resumida):
- Falhas preexistentes encontradas (com o comando que as reproduz em `origin/staging`):
- Pendências e riscos:
- Pergunta em aberto para a pessoa responsável:
