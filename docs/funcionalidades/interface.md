# Interface e legibilidade

## Visão geral

Padrões visuais compartilhados pelo login, painel, telas dos colaboradores e portal.

## Quem pode fazer o quê

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Usar a escala ampliada nas telas acessíveis | Sim | Sim | Sim | Sim |

## Funcionalidades

### I1. Textos maiores em todo o sistema

**Como funciona.** Os textos ficam 20% maiores em relação à escala original para facilitar a leitura, conforme
relato da Talita. Inclui menus, títulos, campos, botões, tabelas, legendas e mensagens.
As fontes e a hierarquia visual são preservadas.

**Detalhes técnicos.** Ajuste exclusivamente visual, sem novo RF, regra ou permissão.
A escala em `src/app/globals.css` cobre os tamanhos explícitos usados em `src/app`
e `src/ui`, incluindo títulos com variante `sm:`. Os valores usam `rem`, respeitando
a preferência de fonte do navegador. O texto herdado do body passa de 17 para
20,4 px na configuração padrão. Espaçamentos e breakpoints são preservados.
Referência: [identidade visual](../Identidade_Visual_Multiplus.md).
Verificação: suíte existente e inspeção do login no navegador em desktop e
em uma área de renderização de 375 px. Nenhum teste automatizado foi criado
ou alterado para esta mudança de estilo.

### I2. Fontes por papel visual

**Como funciona.** Raleway nos títulos, menus, botões, tabelas, campos e etiquetas;
Montserrat nos parágrafos, descrições e textos de apoio; Droid Serif nos dígitos
de 0 a 9. Isso também vale para números dentro de textos, identificadores,
telefones, datas, valores monetários e percentuais. Letras e pontuação mantêm
a família do contexto. Os tamanhos ampliados em 20% continuam valendo.

**Detalhes técnicos.** Configuração compartilhada em src/app/layout.tsx e
src/app/globals.css. Os tokens de interface e leitura combinam Droid Serif
antes de Raleway ou Montserrat. A faixa unicode-range U+0030-0039 restringe
Droid Serif aos algarismos, sem alterar textos, dados ou elementos do DOM.
Raleway e Montserrat usam next/font/local com arquivos WOFF2 variáveis Latin e
licenças SIL Open Font em src/app/fonts; isso evita buscar as fontes no Google
durante o build, preservando os pesos 400, 500, 600 e 700. Droid Serif usa
next/font/local, com arquivos originais e licença em src/app/fonts/droid-serif.
A fonte numérica não cria fallback próprio que possa capturar letras. Controles,
rótulos e tabelas usam a fonte de interface na camada base do CSS; componentes
preservam seus papéis explícitos. Não há mudança de permissão, dados, máscara ou regra.

Verificação: login em desktop e 375 px; amostra em 375 px com título, parágrafo,
valor, percentual, data, campo e botão, usando o CSS real do sistema. Metadados
das fontes confirmam largura igual para os dez dígitos em ambos os pesos.
O build de produção confirma a faixa Unicode numérica nos pesos 400 e 700.
Nenhum teste automatizado foi criado ou alterado para esta mudança visual.

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
- Novos tamanhos explícitos ou variantes responsivas precisam entrar na escala global.
- E-mails e materiais impressos usam suas próprias escalas.

## Histórico de alterações

| Data | Commit | Alteração |
|---|---|---|
| 2026-10-29 | este commit | Carregar Raleway e Montserrat por arquivos locais para remover a dependência de fontes remotas no build ([análise](../analises/falha-build-fontes-nextjs.md)) |
| 2026-10-27 | este commit | Documentar fluxos e decisões do código em português do Brasil ([guia](../codigo/README.md), [análise](../analises/documentacao-codigo-portugues.md)) |
| 2026-10-23 | este commit | Atualizar Next.js e eslint-config-next para 16.4.1 por segurança ([análise](../analises/atualizacao-seguranca-nextjs.md)) |
| 2026-10-21 | este commit | Aplicar Raleway, Montserrat e Droid Serif por papel visual, mantendo os tamanhos atuais |
| 2026-10-21 | 0df5f7d | Ampliar novamente os textos, de 10% para 20% sobre a escala original, a pedido do usuário |
| 2026-10-21 | b7bb72e | Ampliar textos em 10% após relato da Talita; análise dispensada por ser exclusivamente visual |
