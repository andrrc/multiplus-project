# Identidade visual — Múltiplus Ambiental

Referência das cores, tipografia e padrões usados na apresentação comercial da Proposta 185/2026. Serve como base para replicar o mesmo visual em outras propostas, relatórios e materiais.

---

## 1 · Paleta de cores

### Cores da marca

Extraídas do gradiente da logomarca.

| Nome | Hex | RGB | Uso |
|---|---|---|---|
| Azul Múltiplus | `#0499F3` | 4, 153, 243 | Cor institucional primária. Detalhes, bordas superiores de cartões, marcadores de informação. |
| Verde Múltiplus | `#1EBD1F` | 30, 189, 31 | Cor institucional secundária. Indicador de seção ativa, círculos numerados, selos. |
| Verde escuro | `#0E7A3C` | 14, 122, 60 | Verde para texto sobre fundo claro, onde o verde puro perde legibilidade. Rótulos de seção, valores em destaque. |
| Azul escuro | `#0B6FB0` | 11, 111, 176 | Azul para links e texto sobre fundo claro. |

### Cores de base

| Nome | Hex | RGB | Uso |
|---|---|---|---|
| Tinta | `#0B2530` | 11, 37, 48 | Cor principal de texto e fundo dos blocos escuros. Petróleo profundo, com deslocamento para o azul-esverdeado — não é preto neutro. |
| Tinta 2 | `#12394A` | 18, 57, 74 | Variação mais clara da tinta. Etiquetas e fundos secundários escuros. |
| Papel | `#F4F8F9` | 244, 248, 249 | Fundo geral das páginas. Branco levemente esverdeado e frio. |
| Branco | `#FFFFFF` | 255, 255, 255 | Fundo de cartões, tabelas e caixas de conteúdo. |
| Cinza | `#5D7079` | 93, 112, 121 | Texto secundário, descrições, legendas. |
| Linha | `#DCE6E9` | 220, 230, 233 | Bordas de cartões, divisórias e linhas de tabela. |

### Cores de sinalização

| Nome | Hex | RGB | Uso |
|---|---|---|---|
| Âmbar | `#B45309` | 180, 83, 9 | Pendência ou ponto de atenção. Tarja lateral de achados de risco médio. |
| Vermelho terra | `#9A2A1E` | 154, 42, 30 | Criticidade alta. Tarja lateral de prazos vencidos. |
| Verde claro (fundo) | `#EEF7F0` | 238, 247, 240 | Fundo das caixas de solução e das linhas de destaque em tabelas. |
| Verde borda | `#BFE3C6` | 191, 227, 198 | Borda de etiquetas de segmento em destaque. |

### Gradientes

**Gradiente institucional** — capa e blocos de destaque:

```css
background: linear-gradient(112deg, #0B2530 0%, #14485C 58%, #12703F 130%);
```

Reproduz o percurso do azul ao verde da logomarca. O ponto final em 130% mantém o verde discreto na borda inferior direita, sem competir com o texto.

**Gradiente de painel** — blocos internos escuros:

```css
background: linear-gradient(118deg, #0B2530, #134C61);
```

### Cores de apoio sobre fundo escuro

| Nome | Hex | Uso |
|---|---|---|
| Texto sobre escuro | `#C4DCE4` | Parágrafos em blocos com gradiente. |
| Rótulo sobre escuro | `#7FA9B7` | Legendas e etiquetas pequenas em blocos escuros. |
| Menu inativo | `#A9C4CD` | Itens não selecionados da navegação lateral. |
| Menu hover | `#0E2E3C` | Fundo do item de menu sob o cursor. |
| Menu ativo | `#103647` | Fundo do item de menu selecionado. |
| Divisória escura | `#16404F` | Linhas sobre fundo tinta. |
| Fundo de célula escura | `#0F3646` | Células do painel interno. |

---

## 2 · Tipografia

Duas famílias, ambas do Google Fonts, com papéis bem separados.

### Archivo — títulos, dados e interface

Grotesca de proporções largas e alta legibilidade em corpo pequeno. Carrega toda a estrutura da página: títulos, tabelas, valores monetários, navegação e etiquetas.

```
Pesos usados: 400, 500, 600, 700
```

### Source Serif 4 — texto corrido

Serifa de leitura, com boa cor de página em corpo 17 px. Usada em parágrafos, descrições e listas. O contraste com a grotesca cria hierarquia sem precisar de peso ou cor.

```
Pesos usados: 400, 600
```

### Importação

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap" rel="stylesheet">
```

### Escala tipográfica

| Elemento | Família | Tamanho | Peso | Entrelinha | Espaçamento |
|---|---|---|---|---|---|
| Título da capa | Archivo | 40 px | 600 | 1,14 | −0,021 em |
| Título de seção | Archivo | 41 px | 600 | 1,14 | −0,021 em |
| Subtítulo interno | Archivo | 21 px | 600 | 1,14 | −0,021 em |
| Título de cartão | Archivo | 16–19 px | 600 | 1,14 | −0,021 em |
| Valor monetário | Archivo | 33 px | 700 | — | −0,02 em |
| Linha de apoio | Source Serif 4 | 19 px | 400 | 1,62 | — |
| Texto corrido | Source Serif 4 | 17–17,5 px | 400 | 1,62 | — |
| Texto de cartão | Source Serif 4 | 15–16 px | 400 | 1,55 | — |
| Rótulo de seção | Archivo | 12 px | 600 | — | 0,06 em |
| Etiqueta e legenda | Archivo | 11–12,5 px | 500–600 | — | 0,03 em |

### Regras tipográficas

- Títulos sempre com espaçamento negativo de −0,021 em. Sem isso, a Archivo fica solta em corpo grande.
- Números monetários e colunas numéricas usam `font-variant-numeric: tabular-nums`, para alinhar casas decimais.
- Caixa alta apenas em rótulos curtíssimos de seção, nunca em títulos.
- Títulos e texto corrido alinhados à esquerda. Sem justificação.

---

## 3 · Estrutura e espaçamento

| Propriedade | Valor |
|---|---|
| Largura da barra lateral | 250 px |
| Largura máxima do conteúdo | 1420 px |
| Recuo interno das páginas | 52 px no topo, 64 px nas laterais |
| Raio de borda dos cartões | 3 px |
| Raio de borda dos blocos com gradiente | 4 px |
| Raio das etiquetas e selos | 2 px |
| Espaço entre cartões em grade | 18 px |
| Espessura da tarja lateral de achados | 4 px |
| Espessura da borda superior de cartões de preço | 4 px |

O raio de borda é deliberadamente pequeno. Cantos muito arredondados puxam o material para a estética de aplicativo; o documento precisa parecer técnico.

---

## 4 · Padrões de componente

### Cartão de conteúdo
Fundo branco, borda de 1 px em `#DCE6E9`, raio de 3 px, recuo de 22 px por 24 px. Título em Archivo 16 px e texto em Source Serif 4 15,5 px na cor cinza.

### Achado com tarja lateral
Cartão branco com borda esquerda de 4 px codificando a criticidade: vermelho terra para prazo vencido, âmbar para pendência e azul para questão estrutural. Título à esquerda, referência normativa à direita em Archivo 11,5 px.

### Caixa de solução
Fundo `#EEF7F0`, borda esquerda de 3 px em verde Múltiplus, recuo de 11 px por 16 px. Rótulo em Archivo 12 px verde escuro, sobre o texto.

### Bloco de destaque escuro
Gradiente institucional, raio de 4 px, recuo de 42 px por 48 px. Texto em `#C6DDE5`. Selo em verde Múltiplus com texto na cor tinta.

### Tabela
Cabeçalho com fundo tinta e texto branco em Archivo 12 px. Corpo em Source Serif 4 16 px, com linha superior de 1 px em cada célula. Linha de destaque com fundo verde claro e borda superior de 2 px em verde Múltiplus.

### Nota lateral
Fundo branco, borda esquerda de 3 px em azul Múltiplus, texto em cinza 16 px. Usada para observações e ressalvas ao fim de cada seção.

### Passo numerado
Círculo de 27 px em verde Múltiplus com número em Archivo 13 px branco, alinhado ao topo do texto. Separação entre passos por linha de 1 px em `#EDF2F3`.

### Etiqueta de segmento
Fundo branco, borda em `#DCE6E9`, raio de 2 px, texto em Archivo 13,5 px. Variante de destaque com fundo `#EEF7F0`, borda `#BFE3C6` e texto em verde escuro.

---

## 5 · Bloco de variáveis CSS

```css
:root{
  /* marca */
  --azul:      #0499F3;
  --azul-esc:  #0B6FB0;
  --verde:     #1EBD1F;
  --verde-esc: #0E7A3C;

  /* base */
  --tinta:  #0B2530;
  --tinta2: #12394A;
  --papel:  #F4F8F9;
  --branco: #FFFFFF;
  --cinza:  #5D7079;
  --linha:  #DCE6E9;

  /* sinalização */
  --ambar:   #B45309;
  --critico: #9A2A1E;
  --verde-cl:#EEF7F0;

  /* estrutura */
  --rail: 250px;
}

body{
  background: var(--papel);
  color: var(--tinta);
  font-family: "Source Serif 4", Georgia, serif;
  font-size: 17px;
  line-height: 1.62;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4{
  font-family: Archivo, "Helvetica Neue", sans-serif;
  font-weight: 600;
  line-height: 1.14;
  letter-spacing: -.021em;
  margin: 0;
}
```

---

## 6 · Princípios de aplicação

**A cor codifica informação, não decora.** Vermelho terra significa prazo vencido. Âmbar significa pendência. Azul significa questão estrutural. Verde significa solução ou entrega. Quem lê aprende o código na primeira seção e o usa nas seguintes.

**A boldness fica concentrada.** O gradiente institucional aparece em dois lugares por documento, no máximo — capa e um bloco de destaque. Todo o resto é branco sobre papel, com borda fina. Se o gradiente aparecer em toda seção, ele deixa de significar destaque.

**Serifa para ler, grotesca para consultar.** Parágrafo é para ler em sequência, por isso serifa. Tabela, valor, prazo e etiqueta são para localizar rapidamente, por isso grotesca.

**Sem sombras.** A separação vem de borda de 1 px, não de sombra difusa. Sombra suave sob cada cartão é o padrão que faz um documento técnico parecer interface de aplicativo.

**Texto ocupa a largura disponível.** Nada de coluna estreita no meio da página. Em apresentação projetada, linha curta obriga o olho a saltar demais.

---

## 7 · Logomarca

Arquivo PNG com fundo transparente, 1080 × 295 px.

| Aplicação | Largura | Fundo |
|---|---|---|
| Barra lateral | 186 px | Tinta `#0B2530` |
| Capa | 298 px | Gradiente institucional |
| Documentos impressos | 200 a 260 px | Branco |

A logomarca tem contraste suficiente sobre fundo escuro e sobre fundo claro, sem necessidade de versão monocromática. Manter área livre ao redor equivalente à altura do símbolo circular. Não aplicar sobre fundo verde ou azul saturado, onde o gradiente do símbolo se perde.
