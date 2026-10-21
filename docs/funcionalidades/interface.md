# Interface e legibilidade

## Visão geral

Padrões visuais compartilhados pelo login, painel, telas dos colaboradores e portal.

## Quem pode fazer o quê

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Usar a escala ampliada nas telas acessíveis | Sim | Sim | Sim | Sim |

## Funcionalidades

### I1. Textos maiores em todo o sistema

**Como funciona.** Os textos ficam 10% maiores para facilitar a leitura, conforme
relato da Talita. Inclui menus, títulos, campos, botões, tabelas, legendas e mensagens.
As fontes e a hierarquia visual são preservadas.

**Detalhes técnicos.** Ajuste exclusivamente visual, sem novo RF, regra ou permissão.
A escala em `src/app/globals.css` cobre os tamanhos explícitos usados em `src/app`
e `src/ui`, incluindo títulos com variante `sm:`. Os valores usam `rem`, respeitando
a preferência de fonte do navegador. O texto herdado do body passa de 17 para
18,7 px na configuração padrão. Espaçamentos e breakpoints são preservados.
Referência: [identidade visual](../Identidade_Visual_Multiplus.md).
Verificação: suíte existente e inspeção do login no navegador em desktop e
em uma área de renderização de 375 px. Nenhum teste automatizado foi criado
ou alterado para esta mudança de estilo.

## Limitações e pendências conhecidas

- Telas internas precisam de conferência visual com sessão autenticada.
- Novos tamanhos explícitos ou variantes responsivas precisam entrar na escala global.
- E-mails e materiais impressos usam suas próprias escalas.

## Histórico de alterações

| Data | Commit | Alteração |
|---|---|---|
| 2026-10-21 | este commit | Ampliar textos em 10% após relato da Talita; análise dispensada por ser exclusivamente visual |
