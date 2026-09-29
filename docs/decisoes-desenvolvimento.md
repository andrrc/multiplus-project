# Registro das decisões de desenvolvimento

## Listagem de projetos: exibir dias restantes

- **Data:** 2026-09-29
- **Objetivo:** tornar o prazo restante mais explícito na listagem de projetos, mantendo a leitura visual do semáforo.
- **Decisão:** alterar somente o rótulo da coluna e do campo para “Dias restantes”; manter o indicador colorido. Ele mostra a quantidade de dias úteis até o prazo final na visualização de celular e na tabela para desktop. A contagem exclui sábados e domingos, conforme definido anteriormente.
- **Comportamentos:** prazos vencidos mostram o atraso em dias úteis; prazo para hoje e prazos que caem no fim de semana têm rótulos próprios. Projetos sem prazo, concluídos, cancelados ou desativados continuam identificados por texto.
- **Efeito na interface:** o rótulo da listagem passa de “Semáforo” para “Dias restantes”; os valores preservam as cores existentes (vermelho até 5 dias úteis, amarelo de 6 a 10, verde acima de 10), além das cores para concluído e cancelado. O semáforo permanece nas demais telas.

## Identidade visual: cores inexistentes e tokens de fundo claro

- **Data:** 2026-09-29
- **Objetivo:** corrigir cores que não apareciam na tela. Classes com tokens inexistentes (`vermelho`, `vermelho-cl`, `azul-cl`, `fundo`) não geram estilo no Tailwind, por isso itens atrasados na agenda e no painel de subtarefas, botões de exclusão de etiqueta e blocos da ficha do cliente estavam sem cor.
- **Decisão:**
  - criar os tokens `critico-cl` (`#F8ECEA`, vermelho terra claro) e `azul-cl` (`#E8F4FC`), registrados também no documento de identidade visual;
  - trocar `vermelho` por `critico`, a cor de prazo vencido da marca;
  - trocar `fundo` por `papel` e `black` por `tinta`, nas mesmas opacidades;
  - manter sombra apenas em camadas flutuantes (modais e menus suspensos), exceção registrada no documento de identidade visual e no `AGENTS.md`.
- **Comportamentos:** o teste `tests/unit/identidade-visual-tokens.unit.test.ts` falha quando uma classe de cor em `src/` usa um token que não existe em `src/app/globals.css`. Cores da paleta padrão do Tailwind (`black`, `red-500`…) também são rejeitadas.
- **Efeito na interface:**
  - subtarefas atrasadas (painel e agenda) voltam a ter fundo claro e tarja em vermelho terra;
  - ocorrências projetadas na agenda ganham fundo azul claro;
  - o diálogo de exclusão de etiqueta e os avisos de erro ficam em vermelho terra;
  - blocos e o hover dos projetos na ficha do cliente passam a usar o fundo `papel`;
  - as bordas das etiquetas mudam de preto para tinta, com diferença quase imperceptível.
