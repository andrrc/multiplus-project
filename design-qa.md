# Revisão visual — Laudo técnico

**Resultado final: aprovado.**

- **Referência:** `C:/Users/andre/.codex/generated_images/01a15f19-6d57-7253-ba61-c3423a291f57/exec-d17e2b7a-bcb4-44cc-8ff7-1741a4ac3cab.png` — primeira proposta escolhida pelo usuário.
- **Implementação:** `src/app/(painel)/clientes/[id]/laudo/secao.tsx` e `src/app/(painel)/clientes/[id]/laudo/anotacoes.tsx`.
- **Evidências renderizadas:** `report/laudo-redesign/desktop.png` (seção, 880 × 955 px), `report/laudo-redesign/celular.png` (seção, 335 × 1224 px), `report/laudo-redesign/comparacao.png` (referência e implementação lado a lado).
- **Dimensões:** referência original 1487 × 1058 px, densidade 1×; desktop do navegador 1440 × 1024 CSS px, DPR 1; celular 375 × 812 CSS px, DPR 1. Capturas da seção foram recortadas do screenshot de página inteira com os limites do elemento medidos no DOM. A área útil da ficha no celular mede 335 px; `document.documentElement.scrollWidth` permaneceu em 375 px.
- **Estado comparado:** ficha de cliente autenticada como ADMIN, laudo Ambiental com nome e responsável, dois registros cronológicos; o primeiro inclui texto e dois links. O mesmo estado de página foi comparado em desktop e celular.

## Comparação visual e revisão

A imagem comparativa reúne diretamente a proposta escolhida e a implementação. A hierarquia prevista aparece no produto: identificação e nome do laudo no cabeçalho, tipo e responsável em sequência, histórico com marcador temporal, busca/filtros e chamada para nova anotação. Cada registro apresenta autoria e data na margem, conteúdo no corpo e documentos em linhas com endereço e ação de abertura.

| Superfície | Evidência e avaliação |
|---|---|
| Tipografia | Títulos e controles usam Archivo, e anotações usam Source Serif 4 conforme a identidade Múltiplus. A referência traz serifa no título do laudo; foi mantido Archivo institucional. Hierarquia e quebras estão legíveis nas duas larguras. |
| Espaçamento e composição | A ficha limita a seção ao contêiner existente de 880 px. A timeline mantém alinhamento temporal no desktop e reduz-se a uma coluna no celular. A referência tinha largura maior; o contêiner herdado da ficha é uma restrição contextual intencional. |
| Cores | Fundo branco, divisórias `linha`, link `azul-esc`, ponto temporal `azul` e ação `verde` usam os tokens oficiais. Não foram acrescentadas sombras permanentes ou gradientes. |
| Imagens e ícones | A marca e a navegação reais do produto permanecem intactas. Ícones de interface usam Tabler; o documento recebe o ícone de Drive do mesmo conjunto, em azul institucional. |
| Texto | Os nomes são claros e as ações nomeiam seu efeito. URLs são secundárias, mas continuam disponíveis no rótulo acessível, no endereço visível e no destino externo protegido. |
| Interação e acessibilidade | Diálogo nativo contém o foco, fecha com Esc e preserva o formulário quando a validação ou gravação falha. Busca, filtro de registros inativos, menu de edição/desativação e paginação seguem as operações existentes. Controles têm área mínima de 44 px. |
| Responsividade | Conferido em 375 px e em desktop. Não houve rolagem horizontal da página; título, autor e URLs longas quebram/truncam no espaço da coluna. |

## Interações verificadas no navegador

- Abrir o diálogo de anotação e impedir envio vazio com a mensagem de validação existente.
- Salvar texto com dois links, editar a nota e confirmar a data de atualização.
- Desativar e reativar uma nota pelo menu de ações.
- Mostrar registros desativados e pesquisar uma URL, preservando os filtros na URL.
- Conferir visual e árvore de acessibilidade em desktop e celular.

Não restaram diferenças visuais P0/P1/P2 que justifiquem outra iteração. A diferença de fonte do título e o uso dos tokens/ícones institucionais são adaptações deliberadas à identidade do produto.
