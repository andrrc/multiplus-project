# Registro das decisões de desenvolvimento

## Listagem de projetos: exibir dias restantes

- **Data:** 2026-09-29
- **Objetivo:** tornar o prazo restante mais explícito na listagem de projetos, em vez de exibir o semáforo.
- **Decisão:** mostrar a quantidade de dias úteis até o prazo final na visualização de celular e na tabela para desktop. A contagem exclui sábados e domingos, conforme definido anteriormente.
- **Comportamentos:** prazos vencidos mostram o atraso em dias úteis; prazo para hoje e prazos que caem no fim de semana têm rótulos próprios. Projetos sem prazo, concluídos, cancelados ou desativados continuam identificados por texto.
- **Efeito na interface:** o rótulo da listagem passa de “Semáforo” para “Dias restantes” e os valores deixam de usar as cores do semáforo. O semáforo permanece nas demais telas.
