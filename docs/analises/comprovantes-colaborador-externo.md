# Análise: comprovantes do colaborador externo

- **Data:** 2026-11-17
- **Pedido original:** "Vamos desenvolver essa funcionalidade nova", sobre o fluxo de comprovantes dos protótipos de `telas-novas/` (envio pelo colaborador externo, conferência pela administração e pelo colaborador interno, devolução com motivo, pedido de prazo e impedimento, página de instruções).
- **Status:** etapa 1 aprovada em 2026-11-17 (recomendações 3, 7 e 8 da seção 10 aceitas) e implementada no mesmo dia. As respostas da Talita às perguntas 1, 2, 4, 5 e 6 ainda não chegaram; as recomendações abaixo vêm da especificação dela (`telas-novas/sistema-gestao-multiplus-colaborador-externo/00-especificacao-colaborador-externo.md`) e devem ser confirmadas antes das etapas 2 a 4.

### Ajustes feitos ao implementar a etapa 1

- **Quem envia:** o colaborador responsável pelo item (externo por atribuição ou responsável; interno atribuído ao projeto, como já valia para pedir a conclusão). A administração não envia: confere e decide.
- **Quem configura:** só a administração, nos formulários de tarefa e subtarefa (hoje só ela cria e edita tarefa).
- **Arquivos como rascunho:** como cada requisição leva um arquivo (limite de 12 MB do proxy), o arquivo nasce em `arquivos_comprovante` ligado ao item e sem pedido (rascunho). `solicitar_conclusao` confere a quantidade e liga os rascunhos ao pedido na mesma operação. O rascunho do próprio autor pode ser removido; depois do envio o arquivo é imutável. Rascunhos parados há mais de um dia são descartados quando o autor anexa outro arquivo.
- **Decisão do interno por delegação:** a decisão do interno vale só para o pedido de um colaborador externo, em projeto a que ele está atribuído, habilitada por `habilitar_decisao_delegada` para aquele pedido e só dentro da transação.
- **Leitura mais ampla do interno:** o interno atribuído ao projeto passou a ler também os pedidos de subtarefa do projeto (antes só os das subtarefas atribuídas a ele).
- **Pedido com comprovantes** é conferido na página do item; a fila e o painel mostram "Conferir comprovantes" no lugar dos botões diretos.
- **Corrigido ao implementar:** o `CHECK` do banco aceitava "exige comprovante" sem quantidade (comparação com `NULL`); agora recusa. Os testes de integração pegaram isso antes do código seguir.

## 1. Escopo previsto

O módulo entra em **quatro etapas**, cada uma entregável sozinha. Esta análise detalha a **etapa 1**; as demais ficam descritas para que a modelagem da etapa 1 não precise ser refeita.

| Etapa | O que entrega | Mexe em regra existente? |
|---|---|---|
| **1. Enviar e conferir** | Campos do item (exige comprovante, quantidade, o que enviar), tela de envio do externo, arquivos guardados no storage privado, conferência (confirmar ou devolver com motivo), grupo "Devolvidas para correção" | Pouco: acrescenta dado e tela. A decisão passa a poder ser tomada também pelo interno do projeto (decisão 3) |
| **2. Prazo para de contar** | Item com comprovante aguardando conferência sai do atraso e mostra "Enviado em dd/mm" | **Sim, é a parte mais delicada** (seção 5) |
| **3. Pedido de prazo e impedimento** | Botão "Não consigo cumprir este prazo", aprovação pelo coordenador, histórico do prazo original | Muda o prazo da tarefa por aprovação |
| **4. Instruções e acabamento** | Página `/instrucoes`, foto de exemplo, avisos novos (comprovante confirmado ou devolvido, resposta a pedido de prazo) | Enum de eventos de notificação |

Fora do escopo: aviso por WhatsApp (a especificação deixa para fase futura), relatório de comprovantes para o cliente, cobrança de responsável.

## 2. O que existe hoje (levantado no código)

- **Pedido de conclusão** (`SolicitacaoConclusao`, migration `20261022111000_aprovacao_conclusao`): o colaborador pede, só a administração decide (`decidirSolicitacaoConclusao` chama `exigirAdministrador`). Rejeitar aceita comentário **opcional**. Há no máximo um pedido pendente por item (índice único parcial). Enquanto pendente, o status do item não muda, então **o prazo continua contando**.
- **Funções SQL** `solicitar_conclusao`, `cancelar_solicitacao_conclusao` e `concluir_tarefa`: validam vínculo e permissão no banco. A RLS de `solicitacoes_conclusao` já libera leitura ao solicitante, à administração e a quem está no escopo do item.
- **Storage** (`src/lib/storage.ts`): MinIO privado, só **imagens JPEG/PNG/WebP de até 10 MB**, usadas por comentários. Leitura só por rota autenticada (`api/comentarios/imagem/[id]`), com `Cache-Control: private, no-store`. Não há PDF, planilha nem redução de imagem (o pacote `sharp` não está instalado).
- **Limites de upload:** server actions aceitam 12 MB (`next.config.ts`) e o Caddy corta o corpo da requisição em 12 MB (`Caddyfile`). Uma foto de celular tem de 3 a 8 MB; três fotos juntas passam do limite.
- **Backup:** `ops/backup.sh` exporta o volume inteiro do MinIO e o envia ao destino remoto. Cresce com cada foto. A retenção das imagens consta como pendente em `docs/pendencias-antes-producao.md`.
- **Tela do externo:** `/minhas-tarefas` (lista) e `/minhas-tarefas/[id]` (detalhe com "Solicitar conclusão" e comentários por subtarefa). Não há envio de arquivo.
- **Recorrência** (`periodicidade` na tarefa): aprovar a conclusão cria a próxima ocorrência; "Todo mês" já funciona.

## 3. Permissões propostas

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Marcar que o item exige comprovante, quantidade e "o que enviar" | Sim | Não (só a administração cria e edita tarefa) | Não | Não |
| Enviar comprovante | Não | Sim, se for o responsável (atribuído ao projeto) | **Sim, só no item atribuído a ele** | Não |
| Ver os comprovantes de um item | Sim | Sim, no escopo dele | **Só os dele**, no item dele | **Não** |
| Baixar o arquivo | Quem pode ver o item (a rota consulta o banco com RLS, como a imagem de comentário) | Idem | Idem | Não |
| Confirmar ou devolver | Sim | **Sim, nos projetos dele (decisão 3)** | Não | Não |
| Excluir ou trocar o arquivo enviado | Não | Não | **Não** (se errou, o coordenador devolve) | Não |

Toda checagem fica no servidor e no banco (função SQL ou RLS), nunca só no botão. O cliente (CLIENTE) **nunca** vê comprovantes: as fotos podem conter pessoas, placas e documentos pessoais.

## 4. Dados

**Migration nova** (timestamp posterior a `20261116120000`), com RLS e `GRANT` para `multiplus_app`:

1. **Item** (`Tarefa` e `Subtarefa`): `comprovanteExigido Boolean @default(false)`, `comprovanteQuantidade Int?` (1 a 20, obrigatório quando exigido) e `comprovanteInstrucoes String[]` (a lista "o que enviar"). A foto de exemplo (`comprovanteExemploChave String?`) entra na etapa 4.
2. **`arquivos_comprovante`** (modelo `ArquivoComprovante`): `id`, `solicitacaoId` (FK para `SolicitacaoConclusao`, `ON DELETE CASCADE`), `chave` (caminho no storage), `nomeOriginal`, `tipo` (MIME conferido pelo servidor), `tamanhoBytes`, `enviadoPorId`, `enviadoEm` (padrão `now()` do banco, nunca a hora do celular). Imutável: sem `UPDATE` nem `DELETE` para a role da aplicação.
3. **`SolicitacaoConclusao`**: ganha `observacaoEnvio String?` (até 2000, texto simples). **Cada envio é uma solicitação** com seus arquivos, então o histórico "envios anteriores deste item" é a lista de solicitações do item e a devolução reaproveita `REJEITADA` e `comentarioDecisao`. Não se cria outro estado.
4. **"Devolvida para correção" é derivada, sem coluna nova:** item aberto cuja solicitação mais recente é `REJEITADA` e que não tem pedido pendente.
5. **Rejeição com motivo obrigatório** quando o item exige comprovante: `CHECK` no banco e validação no servidor (decisão 3 da seção 10). Itens sem comprovante mantêm o comentário opcional atual.
6. **Pedido de prazo e impedimento (etapa 3):** tabela `pedidos_prazo` (tipo, nova data, motivo obrigatório, estado, decisor, prazo original preservado). Detalhar na análise da etapa 3.

Nenhum dado novo de cliente. Os arquivos ficam no bucket privado atual, sob a chave `comprovantes/<solicitacaoId>/<uuid>.<ext>`.

## 5. Impacto em telas e funções existentes

| Arquivo/área | Impacto |
|---|---|
| `prisma/schema.prisma` e nova migration | Colunas do item, `ArquivoComprovante`, `observacaoEnvio`, RLS e `GRANT`. Função SQL de envio que parte do corpo mais recente de `solicitar_conclusao` (`grep -l "FUNCTION solicitar_conclusao" prisma/migrations/*/migration.sql`) e exige a quantidade de arquivos quando o item exige comprovante |
| `src/lib/storage.ts` | Funções novas para comprovante: valida tipo pelo conteúdo (JPEG, PNG, WebP, PDF, XLSX/DOCX, XLS/DOC, CSV), tamanho e quantidade. A função de imagem de comentário não muda |
| **Rota de envio** `api/comprovantes` (route handler) | **Um arquivo por requisição**, para caber nos 12 MB do Caddy e da aplicação. A solicitação só é criada quando todos os arquivos chegaram. A foto é reduzida no navegador (canvas) antes do envio, já que o `sharp` não existe no projeto |
| **Rota de leitura** `api/comprovantes/[id]` | Mesma regra da imagem de comentário: consulta com RLS, 404 indistinto, `no-store` |
| `src/lib/projetos-tarefas.ts` | `solicitarConclusao` passa a aceitar os arquivos; `decidirSolicitacaoConclusao` abre a decisão ao interno do projeto e exige motivo na devolução; `listarTarefasAtribuidas` devolve o grupo (devolvida, para enviar, aguardando, concluída) |
| `src/app/(painel)/minhas-tarefas/tela-externo.tsx` e `[id]/page.tsx` | Lista em grupos e tela de envio (protótipo `01-minhas-tarefas.html`); some o botão "Solicitar conclusão" simples nos itens que exigem comprovante |
| `src/app/(painel)/tarefas/[id]` e `minhas-tarefas/[id]` (administração e interno) | Cartão "Ver comprovantes" e diálogo de devolução com motivo |
| Formulários de tarefa e subtarefa | Três campos novos (só administração e interno) |
| `src/lib/navegacao.ts` | Rota `/instrucoes` (etapa 4) |
| `tests/` | Ver seção 9. Os testes de `decidirSolicitacaoConclusao` que afirmam "interno não decide" precisam mudar junto com a decisão 3 |
| Docs | `tarefas.md`, `subtarefas.md`, `notificacoes.md`, `autenticacao-acesso.md`, `interface.md`, SRS e `decisoes-desenvolvimento.md` |

**Etapa 2, o que o "prazo para de contar" atinge.** Um item cujo pedido pendente tem arquivos passa a ser tratado como "aguardando conferência": sai do atraso e mostra "Enviado em dd/mm". Atinge `situacao-prazo.ts` e `indicador-dias-restantes.tsx`, o semáforo, as contagens de "Atrasados" e "Com atraso" (`idsDeClientesComAtraso`), a agenda, o painel, os dias restantes do portal do cliente (`dias-restantes-portal-cliente`) e o agendador de avisos de prazo vencido (`agendador-avisos-prazo`). Se for confirmado, vale a data do envio; se for devolvido, o prazo volta a contar a partir do prazo original. **Só vale para pedido com comprovante**: pedido de conclusão sem arquivo continua contando (regra atual). A regra será centralizada numa função única, usada por todos esses pontos, e coberta por testes de cada ponto.

## 6. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| Outro externo ou o cliente abrir o comprovante de alguém pelo ID | A rota de leitura consulta o arquivo com RLS; sem acesso, 404 igual ao de arquivo inexistente | Integração: externo A não lê arquivo do externo B; CLIENTE e sem sessão recebem 404 |
| Arquivo malicioso ou de outro tipo disfarçado de imagem | Tipo conferido pelo conteúdo (bytes iniciais), nunca pela extensão ou pelo `Content-Type` enviado; lista fechada de tipos; `X-Content-Type-Options: nosniff`; PDF, planilha e documento são baixados, não abertos no navegador | Unitário: arquivo `.jpg` com conteúdo de executável e tipo fora da lista são recusados |
| Estouro de tamanho, quantidade ou disco | Limite por arquivo (10 MB), por envio (até 20 arquivos) e conferência da quantidade exigida no servidor; a foto é reduzida no navegador | Unitário e integração: acima do limite, quantidade menor que a exigida e maior que o limite são recusadas |
| Envio fora do item do externo ou em item já concluído | Função SQL e RLS conferem atribuição direta, item ativo e aberto; um pedido pendente por item (índice único já existente) | Integração: item de outro externo, item concluído e segundo pedido pendente recebem o erro esperado |
| Arquivo gravado sem solicitação (falha no meio do envio) | Solicitação criada só depois do último arquivo, numa transação; arquivos órfãos removidos por rotina e por limpeza no erro | Integração: falha simulada no storage não deixa solicitação nem arquivo |
| Interno decidir pedido de projeto que não é dele | A função de decisão confere a atribuição ao projeto no servidor e no banco | Integração: interno do projeto decide; interno de outro projeto, externo e cliente recebem erro |
| Foto com pessoa, placa de veículo ou documento pessoal (LGPD) | Aviso fixo na tela de envio; acesso restrito (tabela acima); prazo de guarda definido pela Talita (pergunta 5); nada de comprovante no portal do cliente | Navegador: aviso visível; integração: cliente não acessa |
| Perda do arquivo (storage fora do ar, backup incompleto) | O envio falha com mensagem clara e **não** cria solicitação; confirmar o backup do volume do MinIO antes da produção | Integração: storage indisponível devolve erro sem criar pedido |
| Data do envio falsificada pelo celular | `enviadoEm` vem do banco | Integração: valor enviado pelo cliente é ignorado |
| Regra do prazo divergir entre telas (etapa 2) | Função única de "aguardando conferência", com teste em cada consumidor | Unitário e integração por ponto da lista da seção 5 |

## 7. Casos-limite e estados

- Item exige 3 arquivos e chegam 2: o botão "Enviar comprovante" fica desativado e o servidor recusa o envio.
- Conexão cai no meio do envio de várias fotos: nada é criado; o externo reenvia. Os arquivos já enviados sem solicitação são descartados.
- Item devolvido: o externo envia de novo; o novo envio é outra solicitação e o anterior fica no histórico com o motivo.
- Pedido pendente e o item é desativado: sai das listas operacionais e não pode ser decidido (regra atual). Os arquivos ficam preservados (RF-039).
- Tarefa recorrente: o comprovante pertence à ocorrência. Ao confirmar, nasce a próxima; os arquivos anteriores continuam em "Ver histórico".
- Item sem `comprovanteExigido`: o fluxo atual de "Solicitar conclusão" continua igual, sem arquivos.
- Externo tem só uma subtarefa atribuída: vê a subtarefa e envia nela, sem ver a tarefa nem as outras subtarefas (regra do perfil já aplicada pelo RLS).
- Arquivo com nome longo ou caracteres especiais: o nome original só é exibido (texto escapado); a chave no storage é sempre um UUID.

## 8. Interface

Seguir `telas-novas/sistema-gestao-multiplus-colaborador-externo/01-minhas-tarefas.html` (lista em grupos e tela de envio) e a conferência de `sistema-gestao-multiplus/05-tarefa.html` e `colaborador-interno/05-tarefa.html`. Mobile primeiro, alvos de toque grandes, tokens de `globals.css`, sem rolagem horizontal a 375 px. O aviso de privacidade fica fixo na tela de envio. Textos dos protótipos entram como estão. Dados de exemplo dos protótipos (Carlos Souza, Indústria Alfa, "3 fotos") não viram dado real.

## 9. Plano de testes (etapa 1)

- **Unitário:** validação de tipo por conteúdo, limites, estado derivado (devolvida, para enviar, aguardando, concluída), montagem de nome e chave.
- **Integração (Postgres, role RLS-restrita):** envio permitido ao externo atribuído e negado a interno, cliente, externo alheio e sem sessão; leitura do arquivo pelos perfis permitidos e negados; decisão pelo interno do projeto e negada a interno de outro projeto; devolução sem motivo recusada; quantidade exigida; falha de storage; um pedido pendente por item; arquivo imutável; recorrência sem duplicar a próxima ocorrência.
- **Navegador (Playwright):** externo envia, vê "Aguardando conferência", é devolvido com motivo e reenvia; a administração confere. A 375 px e no desktop.
- **Regressão:** a suíte de aprovação de conclusão (`decidirSolicitacaoConclusao`, fila, notificações) continua verde, ajustada só no que a decisão 3 muda.

## 10. Perguntas em aberto

Perguntas 1 a 6 foram enviadas à Talita em 2026-11-16 e aguardam resposta; a recomendação vale até lá.

1. **Quais tipos de arquivo?** Recomendação: fotos (JPEG, PNG, WebP), PDF, planilhas e documentos do Office, como na especificação. — **Resposta:** pendente (Talita).
2. **Quantos arquivos por envio e de que tamanho?** Recomendação: até 20 por envio, 10 MB cada, com a foto reduzida no navegador. — **Resposta:** pendente (Talita).
3. **Quem confere e a devolução exige motivo?** Recomendação: administração e interno do projeto, com motivo obrigatório quando o item exige comprovante. Muda a regra aprovada em 2026-10-22, em que só a administração decide. — **Resposta:** em 2026-11-17, aprovada a recomendação (você); a confirmação da Talita segue pendente. Implementado: o motivo é obrigatório quando o pedido tem comprovantes.
4. **O prazo para de contar durante a conferência?** Recomendação: sim, só quando o pedido tem comprovante (etapa 2). — **Resposta:** pendente (Talita).
5. **Por quanto tempo guardar as fotos?** Recomendação: decidir antes da produção; até lá, guardar sem apagar. A limpeza automática, se houver, entra como etapa à parte. — **Resposta:** pendente (Talita).
6. **Quem decide pedido de prazo e impedimento?** Recomendação: o coordenador do item (administração ou interno do projeto), como na especificação (etapa 3). — **Resposta:** pendente (Talita).
7. **Começar pela etapa 1 e deixar o prazo (etapa 2) para depois?** Recomendação: sim. A etapa 1 não altera nenhuma regra de prazo e já resolve o envio e a conferência. — **Resposta:** em 2026-11-17, aprovada a recomendação.
8. **Foto de exemplo e "o que enviar" na etapa 1 ou 4?** Recomendação: a lista "o que enviar" na etapa 1 (a tela de envio a usa); a foto de exemplo na etapa 4. — **Resposta:** em 2026-11-17, aprovada a recomendação.
