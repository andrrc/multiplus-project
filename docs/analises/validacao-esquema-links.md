# Análise: validação de esquema em links

- **Data:** 2026-10-01
- **Pedido original:** “Agora vamos para a etapa D”, referente ao Prompt — Etapas C e D das correções pré-Sprint 5. A Etapa D pede validar links de comentário, documentos de cliente e documentos de projeto para aceitar apenas URLs `http` ou `https`.
- **Status:** aprovada em 2026-10-01

## 1. Escopo previsto

- Criar uma validação compartilhada no servidor que aceite URLs absolutas com esquema `http:` ou `https:` e recuse outros esquemas, incluindo `javascript:`, além de valores malformados.
- Aplicar a validação em `criarComentario`, `adicionarDocumento` e `criarDocumentoProjeto`, preservando as validações e mensagens existentes onde possível.
- Cobrir em integração a recusa de `javascript:` nos três pontos; também cobrir links HTTP/HTTPS válidos para proteger o caminho permitido.
- Atualizar as limitações L1 em `comentarios-mencoes.md`, L3 em `clientes.md` e L3 em `projetos.md`, a limitação prioritária em `funcionalidades/README.md`, os históricos dos três módulos e o índice cronológico de decisões.
- Fora do escopo: alterar permissões, formatos de link apresentados na interface, política de links já salvos, navegação/abertura dos links, migrations ou schema do banco. Não será feita migração dos registros existentes; a validação incide sobre novas gravações.

## 2. Permissões

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Criar comentário com link HTTP/HTTPS | Conforme permissão atual de comentário | Conforme acesso atual ao registro | Conforme acesso atual ao registro | Não muda |
| Vincular documento ao cliente | Sim, conforme fluxo atual | Não muda | Não muda | Não muda |
| Vincular documento ao projeto | Sim, conforme fluxo atual | Não muda | Não muda | Não muda |
| Definir esquema/valor aceito pelo servidor | Somente passa `http` ou `https` válido | Idem | Idem | Idem |

Nenhuma permissão existente será ampliada ou reduzida. A validação deve ocorrer na função de domínio/servidor, sem confiar no `type="url"` do navegador ou em validação de formulário.

## 3. Dados

- Nenhum campo ou tabela muda; não há migration nem backfill.
- O valor continua armazenado como string URL. O servidor deve fazer parse com `URL`, exigir protocolo `http:` ou `https:` e recusar entradas inválidas.
- Strings vazias continuam seguindo o comportamento atual de cada fluxo: link opcional no comentário vira `null`; documentos exigem link.
- Não há tratamento retroativo dos links já existentes. A exibição e a política para registros antigos ficam fora deste escopo.

## 4. Impacto em telas e funções existentes

- `src/lib/comentarios.ts`: `criarComentario` atualmente apenas tenta `new URL(url)` e aceita protocolos diferentes de HTTP(S). A action que o chama é `src/app/(painel)/projetos/actions.ts`; o formulário é `src/app/(painel)/projetos/formulario-comentario.tsx`.
- `src/lib/clientes.ts`: `adicionarDocumento` grava o link sem validação; action em `src/app/(painel)/clientes/[id]/actions.ts`; formulário na ficha do cliente.
- `src/lib/projetos-tarefas.ts`: `criarDocumentoProjeto` atualmente apenas exige string não vazia; action e formulário em `src/app/(painel)/projetos/actions.ts` e tela do projeto.
- Testes: `tests/integration/projetos-tarefas-a4.integration.test.ts` já cobre criação de documento de projeto. Será necessário localizar/estender cobertura de comentários e documentos de cliente, mantendo os testes de integração organizados conforme o módulo e helpers atuais.
- A camada visual pode continuar com `type="url"`, mas a segurança não depende dela. Não há mudança visual ou responsiva.

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| `javascript:` ou esquema executável salvo por chamada direta à função | Validador compartilhado aplicado nas três funções de domínio | Integração: cada uma das três funções recusa `javascript:` com erro esperado |
| Validar apenas no navegador | Aplicar parse e checagem de protocolo no servidor | Integração chamando diretamente as funções de domínio, sem depender do formulário |
| Rejeitar URLs legítimas HTTP/HTTPS ou aceitar URL relativa | Exigir URL absoluta válida e permitir exatamente `http:` e `https:` | Integração: aceitar HTTP e HTTPS válidos e rejeitar URL inválida/relativa |
| Um dos três caminhos ficar sem validação | Busca de todos os call sites e teste específico para comentário, documento de cliente e documento de projeto | Teste de integração por caminho e revisão de `rg` nos três nomes de função |
| Falha de validação deixar gravação parcial | Validar antes de executar o `create` no banco | Integração: erro esperado e confirmar ausência de registro criado |

## 6. Casos-limite e estados

- Comentário sem link permanece permitido e salva `null`.
- `http://` e `https://` com host válido são aceitos.
- `javascript:`, `data:`, esquemas desconhecidos, URL relativa e string malformada são recusados.
- Espaços periféricos são removidos conforme o comportamento atual antes da validação.
- Falha retorna erro de domínio claro e não persiste documento/comentário.
- Nenhuma interface muda; estados visuais atuais de erro continuam sendo usados pelas actions/forms.

## 7. Interface

Sem alteração de interface, identidade visual ou responsividade. Os formulários podem manter `type="url"`; a validação autoritativa fica no servidor.

## 8. Plano de testes

- Integração de `criarComentario`: `javascript:` recusado, HTTP/HTTPS válidos aceitos, link vazio opcional permitido e nenhum comentário persistido após rejeição.
- Integração de `adicionarDocumento`: `javascript:` recusado e ausência de documento persistido; HTTP/HTTPS válidos aceitos.
- Integração de `criarDocumentoProjeto`: mesmos casos, preservando a verificação de vínculo projeto-cliente.
- Executar os testes do módulo durante desenvolvimento e a verificação completa definida em `AGENTS.md` antes de publicar: `npx prisma generate`, `npm run typecheck`, `npm run lint` e `npm test`.

## 9. Perguntas em aberto

1. Não há perguntas de regra identificadas. A decisão proposta é permitir somente URLs absolutas `http`/`https` em novas gravações; links antigos não serão alterados nesta etapa. A análise aguarda aprovação antes da implementação.
