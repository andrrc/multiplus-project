# Análise: etapa 4 dos comprovantes (Instruções, foto de exemplo e mensagens com a Múltiplus)

> Estado: **aprovada pelo usuário em 2026-11-24, com todas as recomendações da seção 10** (as pendências com a Talita, no fim da seção 8 e na pergunta 3, seguem como validação, sem bloquear). Tarefas: [4a](../tarefas/etapa4a-foto-exemplo.md), [4b](../tarefas/etapa4b-instrucoes.md) e [4c](../tarefas/etapa4c-mensagens.md). Mexe em dado (tabelas e colunas novas), em permissão (o externo passa a ler nome e telefone do coordenador, e a leitura de comentários por ele muda) e em storage (arquivos novos), então não começa sem aprovação. Campo sem resposta fica como **pendente de validação**.

- **Data:** 2026-11-24
- **Origem:** etapa 4 da [análise dos comprovantes](comprovantes-colaborador-externo.md) (seção 1) e a especificação do externo (`telas-novas/sistema-gestao-multiplus-colaborador-externo/00-especificacao-colaborador-externo.md`, seções 3.4, 3.5, 5.2 e 5.4, e `03-instrucoes.html`).
- **Depende de:** etapas 1, 2 e 3, já integradas em `staging`.

## 1. Escopo

A etapa 4 tem três entregas independentes. Cada uma pode ir sozinha, na ordem abaixo.

| Parte | O que entrega | Mexe em permissão? |
|---|---|---|
| **4a. Foto de exemplo** | A administração anexa uma imagem de exemplo ao item (tarefa ou subtarefa); o externo a vê na tela de envio. | Pouco: uma rota nova de leitura, com a mesma regra de quem vê o item. |
| **4b. Página de Instruções de uso** | `/instrucoes` para o externo, com textos fixos, vídeo, modelos para baixar, contatos dos coordenadores e contato geral. A administração cadastra o vídeo, os modelos e o contato geral. | **Sim:** o externo passa a ler nome e telefone do coordenador dos itens dele. |
| **4c. Mensagens com a Múltiplus** | Conversa por item entre o externo e a equipe, separada dos comentários internos, com aviso por e-mail e no sistema. | **Sim:** nova tabela com RLS própria e mudança na leitura de comentários pelo externo (seção 3). |

**Fora desta etapa** (cada um deve ser decidido à parte, perguntas 9 e 10):
- Aviso por WhatsApp (a especificação deixa para fase futura). O botão de WhatsApp dos contatos é só um link `wa.me`.
- Aviso de "prazo vencido a cada 3 dias" e o escalonamento: são da Fase 6 (régua de avisos).
- Menu em barra inferior no celular e "manter conectado" no login (itens 7 e 9 da seção 6 da especificação).
- Aviso de "comprovante confirmado ou devolvido" e "resposta a pedido de prazo": **já existem** (`avisarResultadoConclusao` e, na etapa 3, `PEDIDO_PRAZO_RESPONDIDO`). "Tarefa nova" também (`ATRIBUICAO_RECEBIDA`). O que falta da seção 3.5 da especificação é só a "mensagem do coordenador", que entra na 4c.

## 2. O que existe hoje (levantado no código)

- **Comentários** (`Comentario`, políticas em `20260917151000_fix_comentarios_rls`, função `comentario_alvo_acessivel`): uma conversa **única por tarefa ou subtarefa**, legível por quem tem acesso ao item. Para o externo, a regra é `atribuicoes` do tipo `TAREFA`. **Achado:** o externo atribuído à tarefa lê todos os comentários dela e das subtarefas, inclusive os escritos pela equipe, e a tela `/minhas-tarefas/[id]` mostra esse bloco em cada subtarefa. A especificação (seção 3.1) diz que comentário interno nunca aparece para o externo, e que ele só vê as mensagens dele e as respostas da Múltiplus para ele. Hoje isso **não** é cumprido (a conferir com teste de RLS na implementação).
- **Storage** (`src/lib/storage.ts`): bucket privado do MinIO, com `armazenarImagemComentario`, `armazenarComprovante`, `lerObjeto` e `removerObjeto`. A rota de leitura de comprovantes consulta o banco com RLS e responde 404 indistinto.
- **Configuração:** tabelas de uma linha só (`ConfiguracaoNotificacao`, `ConfiguracaoSemaforo`, `id = 1`), editadas em `/configuracoes` (só ADMIN).
- **Telefone:** `Usuario.telefone` existe. O externo hoje **não** lê outros usuários.
- **Menu:** `src/lib/navegacao.ts` não tem `/instrucoes`. Não há página de privacidade (consta como pendência de produção).
- **CSP** (`src/lib/csp.ts`): `default-src 'self'` e `img-src 'self' data: blob:`, **sem** `frame-src`. Incorporar vídeo exige abrir exceção.
- **Recorrência e duplicação:** `concluir_tarefa` copia os campos de comprovante para a próxima ocorrência e `src/lib/duplicar-projeto.ts` os copia ao duplicar o projeto (`comprovanteExigido`, `comprovanteQuantidade` e `comprovanteInstrucoes`). Um campo novo no item precisa entrar nos dois.

## 3. Permissões propostas

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Anexar, trocar ou tirar a foto de exemplo de um item | Sim | Não (só a administração cria e edita tarefa) | Não | Não |
| Ver a foto de exemplo | Sim | Sim, nos projetos dele | **Só nos itens dele** | **Não** |
| Cadastrar vídeo, modelos e contato geral das Instruções | Sim | Não | Não | Não |
| Abrir `/instrucoes` | Não (nada a fazer lá) | Não | **Sim** | Não |
| Baixar um modelo | Sim | Não | Sim | Não |
| Ver nome e telefone dos coordenadores dos itens dele | Sim | Sim | **Só dos coordenadores dos itens dele** | Não |
| Escrever mensagem no item | Sim | Sim, nos projetos dele | **Só no item dele, enquanto for o responsável e o item estiver aberto** | Não |
| Ler as mensagens do item | Todas | As dos projetos dele | **Só a conversa dele, enquanto for o responsável** | Não |
| Ler os comentários internos do item | Sim | Sim | **Não** (muda, pergunta 2) | Não |

Toda checagem fica no servidor e no banco (função SQL ou RLS), nunca só no botão. O cliente continua sem ver foto de exemplo, mensagens, modelos e contatos.

## 4. Dados

Uma migration por parte, com RLS e `GRANT` para `multiplus_app`, e timestamp posterior ao da última de `origin/staging`.

**4a. Foto de exemplo**
- `Tarefa.comprovanteExemploChave String?` e `Subtarefa.comprovanteExemploChave String?`. Só a chave do objeto no bucket (`exemplos/<uuid>.<ext>`); o tipo é conferido pelos bytes na leitura.
- `concluir_tarefa` (a partir do corpo de `20261124150000_concluir_tarefa_data_da_serie`) e `duplicarProjeto` copiam a chave: a cópia **aponta para o mesmo objeto**. Trocar a foto grava um objeto novo e o antigo continua no bucket (sem exclusão definitiva, RF-039).

**4b. Instruções**
- `configuracoes_instrucoes` (uma linha, `id = 1`): `videoUrl`, `contatoGeralNome`, `contatoGeralTelefone`, `contatoGeralEmail`, `politicaPrivacidadeUrl` (todos opcionais) e `atualizadoEm`.
- `modelos_instrucao`: `id`, `titulo` (até 120), `chave`, `nomeOriginal`, `tipo`, `tamanhoBytes`, `ativo`, `criadoEm`, `criadoPorId`. Sem exclusão: a administração desativa.
- Função `contatos_do_externo()` (`SECURITY DEFINER`): devolve, para o externo logado, só `nome`, `telefone` e a lista de itens (id e nome) de cada coordenador dos itens dele. **Coordenador** é o interno atribuído ao **projeto** (`atribuicoes` com `entidadeTipo = PROJETO`), o mesmo critério da etapa 3; item sem interno atribuído cai no contato geral.
- Validação do `videoUrl` no servidor: só `https` e só hosts da lista (`youtube.com`, `youtu.be`, `youtube-nocookie.com` e `drive.google.com`); o endereço vira o de incorporação no servidor, nunca texto cru do banco no HTML.

**4c. Mensagens**
- `mensagens_item`: `id`, `tarefaId` ou `subtarefaId` (um dos dois), `externoId` (de quem é a conversa), `autorId`, `autorNome`, `texto` (1 a 2000, texto simples), `criadoEm` (do banco). Imutável: sem `UPDATE` nem `DELETE` para a role da aplicação. Escrita só pela função `enviar_mensagem_item(tipo, id, externoId, texto)`, que confere quem pode escrever e o estado do item.
- Leitura (RLS): ADMIN lê tudo; interno, as do projeto a que está atribuído; externo, as com `externoId` igual ao dele **e** enquanto `colaborador_responsavel_pelo_item` for verdadeiro.
- Enum `EventoNotificacao` ganha `MENSAGEM_ITEM`, com linhas em `preferencias_notificacao` para os quatro perfis, como na etapa 3. Vai ao externo quando a equipe escreve, e à administração e aos internos atribuídos quando o externo escreve; chave de idempotência por mensagem e por destinatário.
- Comentários: a política `comentarios_select` e a função `comentario_alvo_acessivel` deixam de abrir `ADMIN_EXTERNO` (a regra de ADMIN, interno e cliente fica igual). Os dados existentes não mudam.

## 5. Impacto em telas e funções existentes

| Arquivo/área | Impacto |
|---|---|
| `prisma/schema.prisma` e três migrations novas | Seção 4. Reservar o schema e as migrations no registro de tarefas antes de editar. |
| `src/lib/storage.ts` | Funções novas para foto de exemplo e modelo (tipo pelo conteúdo, tamanho). As de comentário e comprovante não mudam. |
| Rotas `api/comprovantes/exemplo/[tipo]/[id]` e `api/instrucoes/modelos/[id]` | Consulta com RLS, 404 indistinto, `no-store` e `nosniff`, como a de comprovante. |
| Formulários de tarefa e subtarefa (administração) | Campo "Foto de exemplo" no bloco de comprovante. |
| Tela de envio do externo (`minhas-tarefas/[id]`) | Mostra a foto de exemplo e o bloco "Mensagens com a Múltiplus". Sai o bloco de comentários internos. |
| `src/app/(painel)/instrucoes/page.tsx` e `src/lib/navegacao.ts` | Página nova e item de menu só do externo. Rota nova entra no `MENU` junto, senão responde "negado". |
| `src/app/(painel)/configuracoes/page.tsx` | Aba "Instruções do externo" (só ADMIN). |
| `src/lib/csp.ts` | `frame-src` restrito aos hosts de vídeo (pergunta 4). Muda cabeçalho de segurança: revisar com cuidado. |
| `src/lib/notificacoes.ts`, `email-templates.ts`, `notificacoes-toasts.ts`, `lista-avisos.tsx` | Evento novo, como na etapa 3. |
| `concluir_tarefa` (SQL) e `src/lib/duplicar-projeto.ts` | Copiar `comprovanteExemploChave`, como já fazem com os outros campos de comprovante. Nada de prazo muda. |
| Docs | `tarefas.md`, `subtarefas.md`, `notificacoes.md`, `comentarios-mencoes.md`, `interface.md` e `decisoes-desenvolvimento.md`. |

## 6. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| Externo ler comentário interno ou mensagem de outro externo | RLS de `mensagens_item` por `externoId` e por responsável atual; `comentarios` deixa de abrir o perfil externo | Integração: externo A não lê a conversa do B nem o comentário da equipe; cliente não lê nada |
| Telefone de funcionário exposto a quem não deve | Só a função `contatos_do_externo()`, que devolve nome e telefone dos coordenadores **dos itens dele**; nenhuma leitura geral de `usuarios` | Integração: externo sem itens recebe lista vazia; externo B não vê o coordenador do item de A |
| Arquivo disfarçado (foto de exemplo e modelo) | Tipo pelos bytes, lista fechada, 10 MB, `nosniff`; modelos que não são imagem ou PDF são baixados, nunca abertos | Unitário e integração, como nos comprovantes |
| Vídeo de domínio inesperado ou script injetado | Lista de hosts no servidor, `https` obrigatório, URL de incorporação montada pelo servidor; `frame-src` só para esses hosts | Unitário: hosts e esquemas recusados; navegador: página carrega com o CSP novo |
| Mensagem usada para anexar ou injetar HTML | Só texto simples, escapado na tela; sem anexo | Unitário: tamanho e texto vazio; integração: mensagem imutável |
| Mensagem em item fechado ou de outro externo | `enviar_mensagem_item` confere responsável, item aberto e `externoId` | Integração: item concluído, externo alheio e cliente são recusados; a equipe responde |
| Aviso com dado sensível no e-mail | O aviso leva só o aviso de que há mensagem e o link; o texto fica no sistema | Integração: e-mail e aviso sem o corpo da mensagem |
| Número de WhatsApp inválido gerando link quebrado | Normaliza para dígitos e `55`; telefone fora do padrão esconde o botão | Unitário |

## 7. Casos-limite e estados

- **Troca de responsável:** o novo responsável não vê a conversa do anterior; o anterior perde o acesso ao item e, com ele, à conversa. A equipe continua vendo tudo.
- **Item concluído, cancelado ou desativado:** o externo lê, mas não escreve; a equipe pode escrever.
- **Item sem interno atribuído ao projeto:** o contato mostrado é o geral. Sem contato geral cadastrado, a seção mostra "Fale com a Múltiplus pelo e-mail do seu aviso" (texto fixo) e nenhum botão.
- **Vários internos no projeto:** todos aparecem como coordenadores, cada um com a lista dos itens.
- **Sem vídeo ou sem modelos cadastrados:** a seção some, sem selo vazio (regra do padrão visual).
- **Recorrência e duplicação:** a ocorrência nova e a cópia usam a mesma foto de exemplo. Trocar a foto da ocorrência atual não muda a de ocorrências já criadas.
- **Pedido de prazo e impedimento (etapa 3):** continuam no cartão próprio do item. A especificação os mostra "nas mensagens"; não duplicamos, para não termos dois lugares com a mesma resposta (pergunta 8).

## 8. Interface

Seguir `03-instrucoes.html` (página) e `01-minhas-tarefas.html` (tela de envio, com foto de exemplo e mensagens), com os textos dos protótipos como estão. Os dados de exemplo (Carlos Souza, Indústria Alfa, nomes e telefones de coordenadores) são ilustrativos e não viram dado real. A 375 px e no desktop, sem rolagem lateral, só com tokens de `globals.css`. O texto "os atrasos aparecem para a diretoria da empresa" é afirmação do protótipo: **pendente de validação** com a Talita antes de entrar (o portal do cliente mostra atrasos, mas a regra de quem os vê é da Fase 5).

## 9. Plano de testes

- **Unitário:** validação do `videoUrl` (hosts, esquema, URL de incorporação), normalização do telefone do WhatsApp, tipo e tamanho do arquivo, regras de texto da mensagem.
- **Integração (role RLS-restrita, perfil permitido e negado):** foto de exemplo (administração grava; externo lê só nos itens dele; interno de outro projeto e cliente recebem 404); modelos (cadastro só ADMIN, download pelo externo, cliente negado); `contatos_do_externo()`; mensagens (escrita e leitura por perfil, item fechado, troca de responsável, imutabilidade, aviso sem o corpo); `comentarios` fechado ao externo sem mudar o acesso dos outros perfis; cópia da foto na recorrência e na duplicação.
- **Navegador (Playwright):** externo vê a foto de exemplo, escreve uma mensagem, a administração responde e o externo vê a resposta; `/instrucoes` abre com e sem vídeo e modelos; a 375 px e no desktop, sem rolagem lateral.
- **Regressão:** a suíte de comentários e menções (`comentarios-mencoes`) e a de notificações continuam verdes, ajustadas só no que a pergunta 2 muda.

## 10. Perguntas em aberto

1. **Mensagens numa tabela própria, e não nos comentários?** A conversa do externo tem de ser separada do que a equipe escreve, e os comentários não têm "para quem". **Recomendação:** sim, `mensagens_item`, texto simples, sem anexo (arquivo vai pelo envio de comprovante).
2. **Fechar a leitura de comentários ao externo?** Hoje ele lê os comentários da equipe nas tarefas dele (seção 2). **Recomendação:** sim, fechar, porque a especificação proíbe e as mensagens passam a ser o canal dele. Some o bloco de comentários da tela do externo.
3. **O externo vê nome e telefone do coordenador?** A especificação pede o botão de WhatsApp de cada coordenador. **Recomendação:** sim, só dos coordenadores dos itens dele, pela função da seção 4b. **Pendente de validação** com a Talita: que o número exibido seja o telefone cadastrado do usuário interno (não há campo separado de "WhatsApp").
4. **Vídeo incorporado ou só link?** Incorporar exige `frame-src` no CSP. **Recomendação:** incorporar, com `frame-src` só para `youtube-nocookie.com` e `drive.google.com`; sem vídeo cadastrado, a seção não aparece.
5. **Quais arquivos aceitos como modelo e quantos?** **Recomendação:** os mesmos tipos de comprovante (imagem, PDF, planilha e documento do Office), até 10 MB cada, até 10 modelos ativos.
6. **Foto de exemplo:** uma por item, JPEG, PNG ou WebP, até 10 MB, copiada na recorrência e na duplicação. **Recomendação:** sim.
7. **Quais avisos para a mensagem?** **Recomendação:** um evento só (`MENSAGEM_ITEM`), e-mail e aviso no sistema ligados para os quatro perfis; o aviso não leva o texto da mensagem, só o link para o item.
8. **Pedido de prazo "nas mensagens"?** A especificação mostra o pedido e a resposta dentro das mensagens. **Recomendação:** manter o cartão da etapa 3 e não repetir na conversa.
9. **"Manter conectado" e a barra inferior no celular entram na etapa 4?** **Recomendação:** não. A barra inferior é só visual e pode ir numa tarefa de interface; "manter conectado" muda a duração da sessão (decisão de segurança) e pede análise própria.
10. **Como entregar?** **Recomendação:** três tarefas em sequência (4a, 4b, 4c), porque cada uma tem migration e as três reservam `schema.prisma` e `migrations/**`. A 4a e a 4b são pequenas e boas para o Codex; a 4c, por mexer em RLS e em permissão de leitura, fica comigo e passa por revisão cruzada.

## 11. Aprovação

Aprovada em 2026-11-24 com as recomendações. As três tarefas foram criadas, na ordem 4a, 4b e 4c; só uma reserva o schema e as migrations por vez.
