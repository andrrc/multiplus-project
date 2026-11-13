# Interface e legibilidade

## Visão geral

Padrões visuais compartilhados pelo login, painel, telas dos colaboradores e portal.

## Quem pode fazer o quê

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Usar a interface nas telas acessíveis | Sim | Sim | Sim | Sim |

## Funcionalidades

### Meu perfil

**Como funciona.** Os dados pessoais, a troca de senha e as atribuições existentes
aparecem em seções separadas, seguindo o modelo visual de perfil. Os campos se
organizam em duas colunas no desktop e uma no celular. Os dados editáveis
e as atribuições continuam sujeitos às regras atuais de cada perfil.

**Detalhes técnicos.** A rota `/meu-perfil` reorganiza a apresentação de dados já
consultados e mantém os formulários e ações existentes. A jornada de navegador em
`tests/browser/jornadas.spec.ts` cobre a troca de senha.

### Navegação e identidade dos modelos

**Como funciona.** O menu organiza os acessos disponíveis em grupos e usa ícones,
com a caixa de avisos identificada como Avisos. No celular o menu é aberto pelo
botão superior; as mesmas opções continuam disponíveis conforme o perfil.

**Detalhes técnicos.** `navegacao-painel.tsx` organiza visualmente os itens retornados
por `menuDoPerfil`, sem alterar a matriz de permissões ou as rotas. O layout e
`nav-link.tsx` aplicam a estrutura compartilhada. A paleta de tokens e a tipografia
são descritas na [identidade visual](../Identidade_Visual_Multiplus.md); a adaptação
das telas individuais ainda está em andamento.

### Alinhamento do painel em telas largas

**Como funciona.** O conteúdo do painel começa junto à margem interna ao lado do menu, mesmo em monitores largos, mantendo a largura máxima de 1280 px.

**Detalhes técnicos.** O layout compartilhado em `src/app/(painel)/layout.tsx` alinha à esquerda o conteúdo das páginas do painel. Não altera permissões ou dados.

### Rolagem horizontal das tabelas

**Como funciona.** As tabelas largas mantêm rolagem interna e podem ser acessadas pelo teclado, sem exibir uma mensagem adicional instruindo o usuário a deslizar para ver outras colunas.

**Detalhes técnicos.** `src/ui/rolagem-horizontal.tsx` mantém a região com `overflow-auto`, rótulo acessível e foco por teclado. A medição do excesso de largura e a dica visual foram removidas. A mudança é apenas de interface e não altera dados ou permissões.

### I1. Escala de texto

**Como funciona.** A interface usa a escala dos modelos da Múltiplus, com texto-base de
14 px e controles que mantêm área mínima de toque. O zoom e o tamanho de texto
configurados no navegador continuam disponíveis.

**Detalhes técnicos.** `src/app/globals.css` define o texto-base em `rem`; as classes
utilitárias especificam os demais tamanhos. A escala ampliada anteriormente foi
substituída para acompanhar as referências aprovadas de 2026-11-10.

### I2. Tipografia compartilhada

**Como funciona.** As telas usam IBM Plex Sans em textos, campos, botões e números,
conforme os modelos de referência da Múltiplus. A migração visual das telas segue
por etapas; a escala de tamanhos existente permanece até cada tela ser adaptada.

**Detalhes técnicos.** `src/app/layout.tsx` carrega os arquivos locais com
`next/font/local`; os tokens de interface e leitura em `src/app/globals.css`
utilizam a mesma família. Arquivos e licença estão em `src/app/fonts/ibm-plex-sans`.
Não há mudança de dados ou permissões.

### I3. Dependência do framework atualizada por segurança

**Como funciona.** A aplicação usa uma versão corrigida do Next.js para atender a uma
recomendação de segurança do framework. Esta atualização não altera as telas nem as
permissões dos perfis.

**Detalhes técnicos.** `next` e `eslint-config-next` estão fixados em `16.4.1` em
`package.json`, com as dependências resolvidas em `package-lock.json`. A atualização
corrige o alerta [GHSA-673q-mjm6-r5xr](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr).
Verificação: Prisma Client, typecheck, lint e suíte completa. A auditoria de produção
continua apontando vulnerabilidades transitivas em MinIO e Prisma; a correção automática
exige mudanças incompatíveis e deve ser avaliada separadamente.

## Limitações e pendências conhecidas

- Telas internas precisam de conferência visual com sessão autenticada.
- As telas individuais ainda precisam ser conferidas após a mudança da escala compartilhada.
- E-mails e materiais impressos usam suas próprias escalas.
- **Migração para os protótipos de `telas-novas/` (iniciada em 13/11/2026).** A meta é copiar o
  visual por inteiro. O mapa de cada protótipo, a página real e a situação está em
  [mapeamento](../mapeamento-telas-talita.md). Ficam como pendência, por exigirem dado, regra ou
  permissão: comprovantes (envio, confirmação e rejeição), cobrança de responsável, histórico
  automático, régua de avisos, resumo mensal, PDF de relatório do cliente, unidades e Drive do
  cliente, vídeo e contatos das Instruções, "Ver como cliente", último acesso, duplicar e
  exportar projeto, pausa de prazo, status "A iniciar" de subtarefa e pedidos de prazo do
  colaborador externo.
- A restrição de menu e de dados do colaborador externo e a liberação da agenda ao colaborador
  interno mudam permissão e exigem análise aprovada antes de aplicar.

## Histórico de alterações

| Data | Commit | Alteração |
|---|---|---|
| 2026-11-13 | este commit | Aplicar a base visual dos protótipos: tokens `ink`, `faint`, `linha-forte` e `ambar-cl`, raios 8/6/5 px, selo de prazo claro ("Em N dias", "Amanhã"), selos e status sem borda, campos com foco em anel azul, fim do lilás em "A iniciar" e das bordas laterais coloridas decorativas |
| 2026-11-13 | este commit | Adotar os protótipos de `telas-novas/` como fonte da verdade visual: regras de `AGENTS.md` §6 e da [identidade visual](../Identidade_Visual_Multiplus.md) atualizadas (raios 8/6/5 px, sombras só em camadas flutuantes, botão azul-escuro, IBM Plex Sans) e [mapa das telas](../mapeamento-telas-talita.md) corrigido |
| 2026-11-10 | este commit | Adaptar a apresentação da tela compartilhada de perfil |
| 2026-11-10 | este commit | Iniciar adaptação da identidade visual pela tipografia compartilhada |
| 2026-11-03 | este commit | Remover a dica “Deslize para ver as demais colunas” das tabelas com rolagem horizontal |
| 2026-11-03 | este commit | Alinhar conteúdo do painel à margem interna em telas largas |
| 2026-10-29 | este commit | Carregar Raleway e Montserrat por arquivos locais para remover a dependência de fontes remotas no build ([análise](../analises/falha-build-fontes-nextjs.md)) |
| 2026-10-27 | este commit | Documentar fluxos e decisões do código em português do Brasil ([guia](../codigo/README.md), [análise](../analises/documentacao-codigo-portugues.md)) |
| 2026-10-23 | este commit | Atualizar Next.js e eslint-config-next para 16.4.1 por segurança ([análise](../analises/atualizacao-seguranca-nextjs.md)) |
| 2026-10-21 | este commit | Aplicar Raleway, Montserrat e Droid Serif por papel visual, mantendo os tamanhos atuais |
| 2026-10-21 | 0df5f7d | Ampliar novamente os textos, de 10% para 20% sobre a escala original, a pedido do usuário |
| 2026-10-21 | b7bb72e | Ampliar textos em 10% após relato da Talita; análise dispensada por ser exclusivamente visual |
