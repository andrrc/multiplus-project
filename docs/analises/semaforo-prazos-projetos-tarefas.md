# Análise: configurar semáforo de prazos para projetos e tarefas

- **Data:** 2026-09-29
- **Pedido original:** remover da página de notificações o cartão “Antecedência de prazo”; depois, o usuário esclareceu que gostaria de editar ali o semáforo e perguntou se ele poderia ser aplicado às tarefas também.
- **Status:** aprovada em 2026-09-29

## 1. Escopo previsto

**Proposta:** substituir o cartão “Antecedência de prazo” em `/notificacoes` por um cartão “Semáforo de prazos” para editar os limites globais de cor. Usar a mesma configuração para projetos, tarefas e subtarefas.

Valores e regra já definidos para projetos e estendidos também para tarefas e subtarefas:
- vermelho até 5 dias úteis restantes, inclusive;
- amarelo de 6 a 10 dias úteis restantes, inclusive;
- verde acima de 10 dias úteis;
- sábados e domingos não contam; feriados contam como dias normais;
- projetos concluídos continuam verdes e cancelados vermelhos;
- tarefas concluídas ficam verdes e canceladas vermelhas;
- itens sem prazo ficam sem cor; itens desativados continuam identificados como desativados.

Os dois limites seriam editáveis, com defaults 5 e 10, em todas as telas existentes de semáforo de projetos e nas telas de tarefa e subtarefa descritas na seção 4.

O semáforo é visual. Não muda quando avisos automáticos de tarefas são disparados. A configuração global `diasAntecedenciaPadrao` é usada pelo disparador de avisos de tarefas; a página não poderá mais editá-la se o cartão for substituído. O valor salvo deve ser preservado e o disparador não deve ser alterado nesta mudança. Atualmente não há agendador configurado para esse disparador (L1 de `docs/funcionalidades/notificacoes.md`).

## 2. Permissões

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Editar limites globais em `/notificacoes` | Sim | Não | Não | Não |
| Ver semáforo na lista administrativa de tarefas `/tarefas` | Sim | Não | Não | Não |
| Ver semáforo em `/minhas-tarefas` e projetos atribuídos | — | Sim, itens atribuídos | Sim, itens atribuídos | Não |
| Ver semáforo de subtarefas | Sim no painel `/subtarefas` | Sim nas tarefas acessíveis | Sim nas tarefas acessíveis | Não |
| Ver semáforo na administração de projetos | Sim | Não | Não | Não |

A proposta não altera permissões atuais nem os filtros de acesso às tarefas e projetos.

## 3. Dados

- Criar uma configuração global persistida para os limites vermelho e amarelo, com defaults 5 e 10. Proposta técnica: modelo singleton separado da configuração de notificações, pois o semáforo é uma regra visual de projetos e tarefas.
- Migration necessária para criar e inicializar a configuração; nenhum registro de projeto ou tarefa exige backfill.
- Validar inteiros em dias úteis de 0 a 365, exigindo que o limite vermelho seja menor que o limite amarelo.
- Não há dado sensível.
- Preservar `ConfiguracaoNotificacao.diasAntecedenciaPadrao` e o comportamento do disparador de avisos, mesmo que a edição deixe de aparecer nessa página.

## 4. Impacto em telas e funções existentes

- `src/app/(painel)/notificacoes/page.tsx`: substituir o cartão atual pelo formulário do semáforo; manter central de avisos e preferências por perfil.
- `src/app/(painel)/notificacoes/actions.ts`: adicionar action de atualização dos limites, protegida para `ADMIN`.
- `src/ui/indicador-dias-restantes.tsx`: generalizar o indicador para aceitar a configuração e status de projeto ou tarefa; manter cálculo de dias úteis.
- Projetos: atualizar `/projetos`, `/projetos/[id]`, `/meus-projetos` e `/meus-projetos/[id]`, que já exibem o semáforo.
- Tarefas: exibir o semáforo em `/tarefas` (tabela e cartão no celular), `/tarefas/[id]`, `/minhas-tarefas`, `/minhas-tarefas/[id]` e nas listas de tarefas que aparecem dentro dos detalhes de projeto.
- Subtarefas: exibir o semáforo em `/subtarefas` (tabela e cartão no celular) e nas listas de subtarefas dos detalhes de tarefa, respeitando as permissões e filtros de acesso atuais.
- Documentação após aprovação: atualizar `docs/funcionalidades/projetos.md`, `docs/funcionalidades/tarefas.md` e `docs/funcionalidades/notificacoes.md`; registrar a decisão em `docs/decisoes-desenvolvimento.md`.
- Requisitos: RF-007 trata dos avisos de tarefa e não deve ser alterado por uma regra apenas visual. O PDD de Projetos e Tarefas é o documento de design relacionado; não foi encontrado PDD separado para Notificações.

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| Misturar limite visual com antecedência de e-mail | Usar configuração e action próprias para o semáforo; preservar `dispararPrazoProximo` | Teste de regressão do disparador e teste do cálculo/cores |
| Limites inválidos ou invertidos | Validar no servidor: inteiros de 0 a 365 e vermelho menor que amarelo | Testes unitários dos limites válidos e inválidos |
| Aplicar o limite só em parte das telas | Conferir cada uso do componente compartilhado e usar a mesma configuração global | Cobertura unitária das faixas e renderização das telas afetadas |
| Perfil sem permissão alterar configuração por chamada direta | Validar `ADMIN` na action e na função de domínio | Teste de integração de acesso permitido e negado |
| Mudança de cor esconder estados especiais | Preservar regras de concluído, cancelado, desativado e sem prazo fora dos limites numéricos | Testes unitários para cada estado |
| Extensão a subtarefas sem respeitar acesso contextual | Reusar consultas e permissões existentes; apenas renderizar o indicador nas subtarefas já visíveis | Testes de acesso existentes e testes unitários de status/cor |

## 6. Casos-limite e estados

- Prazo vencido: permanece vermelho independentemente do limite; projeto/tarefa concluído fica verde e cancelado fica vermelho.
- Prazo hoje ou em fim de semana: preservar os textos atuais e calcular as cores usando dias úteis.
- Sem prazo: manter identificação neutra, sem cor de faixa.
- Sem configuração no banco: usar defaults 5 e 10.
- Limites iguais, invertidos, não inteiros ou acima do máximo: rejeitar no servidor.
- Tarefa cancelada/concluída: a cor especial do status prevalece sobre o prazo.
- Avisos de prazo: não mudar o valor global já salvo nem o agendamento atual.
- Subtarefas atribuídas: mostrar semáforo apenas nos contextos em que a pessoa já pode ver a subtarefa.
- Responsividade: incluir indicador sem estourar tabela/card a 375 px.

## 7. Interface

- Substituir “Antecedência de prazo” por “Semáforo de prazos”.
- Exibir dois campos numéricos: “Vermelho até (dias úteis)” e “Amarelo até (dias úteis)”. Mostrar que verde começa acima do limite amarelo.
- Manter central e preferências por perfil sem alteração.
- Usar tokens de cor existentes e conferir as telas em 375 px e desktop.

## 8. Plano de testes

- Unitário: regras de faixas com defaults e limites alterados, dias úteis, atraso e estados de tarefa/projeto.
- Integração: Administrador edita; perfis sem permissão não editam.
- Regressão: avisos de prazo continuam usando `diasAntecedenciaPadrao` sem mudança.
- Renderização: cartão de configuração aparece; central e preferências continuam presentes; tarefas mostram as faixas corretas.
- Cobrir as faixas e estados de subtarefas, além de testar todas as telas e os contextos já filtrados por atribuição.
- Antes de publicar, executar `npx prisma generate`, `npm run typecheck`, `npm run lint` e `npm test` conforme a seção 5.4 do `AGENTS.md`.

## 9. Perguntas em aberto

1. Incluir subtarefas também. — **Resposta:** sim, confirmado em 2026-09-29.
2. Preservar a antecedência global já salva dos avisos de tarefas, sem edição no cartão substituto. — **Resposta:** “Acho que sim”, confirmado como premissa de implementação em 2026-09-29; nenhuma alteração será feita à lógica de avisos.
3. Editor global 5/10 dias úteis, compartilhado por projetos, tarefas e subtarefas. — **Aprovado em 2026-09-29.**
