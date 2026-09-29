# Registro das decisões de desenvolvimento

## Listagem de projetos: exibir dias restantes

- **Data:** 2026-09-29
- **Objetivo:** tornar o prazo restante mais explícito na listagem de projetos, mantendo a leitura visual do semáforo.
- **Decisão:** alterar somente o rótulo da coluna e do campo para “Dias restantes”; manter o indicador colorido. Ele mostra a quantidade de dias úteis até o prazo final na visualização de celular e na tabela para desktop. A contagem exclui sábados e domingos, conforme definido anteriormente.
- **Comportamentos:** prazos vencidos mostram o atraso em dias úteis; prazo para hoje e prazos que caem no fim de semana têm rótulos próprios. Projetos sem prazo, concluídos, cancelados ou desativados continuam identificados por texto.
- **Efeito na interface:** o rótulo da listagem passa de “Semáforo” para “Dias restantes”; os valores preservam as cores existentes (vermelho até 5 dias úteis, amarelo de 6 a 10, verde acima de 10), além das cores para concluído e cancelado. O semáforo permanece nas demais telas.
