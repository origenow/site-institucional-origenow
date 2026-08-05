# Revisão de design — Origenow (estado antes do Osmo)

Cópia de segurança em `v1/` (21 arquivos, renderizáveis, assets compartilhados).
Auditoria automatizada nas 17 páginas em viewport 1440.

---

## 1. Sobreposição e quebra de página — limpo

| Verificação | Resultado |
|---|---|
| `overflow-x` (scrollWidth > 1440) | 0 páginas |
| Largura fixa maior que a viewport | 0 elementos |
| Sobreposição real de texto | 0 |
| Texto cortado por `overflow:hidden` | 0 reais |

Candidatos investigados e descartados:

- **FAQ da Consultoria** — `361×27` entre a resposta e a pergunta seguinte. Falso positivo: o acordeão é `height:0; overflow:hidden`, então o `<p>` fechado ainda tem retângulo mas está clipado. Visualmente correto.
- **Cards "Com a Origenow" / abas dos cases / seção "A Origenow"** — `scrollHeight` maior que `clientHeight` por causa de orbs roxos e trilhas de carrossel posicionados fora do quadro, todos dentro de `overflow:hidden`. Intencional.

Alturas: Home 6744px · Cases 2368 · Case 01–05 4400–5124 · Serviços 3908 · páginas de serviço 4268–4404 · Sobre 3452 · Grupo 3160 · Contato 2736 · Insights 2156.
A Home a 6744px é ~7 viewports — longa, mas dentro do aceitável para home de agência.

---

## 2. Legibilidade — o problema nº 1

**Tamanhos abaixo do piso:**

| Tamanho | Ocorrências |
|---|---|
| 9px | 3 |
| 10px | 7 |
| 11px | **235** |
| 12px | 101 |

**Contraste:** `#a39ab2` sobre branco = **2,7:1**. WCAG AA exige 4,5:1 para texto pequeno.

Os dois defeitos se somam nos mesmos elementos — os rótulos `SETOR`, `CANAL`, `DURAÇÃO`, `TIME`, `INÍCIO`, `PARCEIROS OFICIAIS`, e os numeradores `01 / 02 / 03`: 11px, caixa-alta, tracking `.14em`, cinza claro. Em monitor calibrado passa; em notebook com brilho baixo, em tela fosca ou projetor, desaparece.

**Correção proposta**
- Piso de 12px. Rótulos de eyebrow a 12,5–13px.
- `#a39ab2` → `#6b6480` (≈4,6:1) em tudo abaixo de 15px. Manter `#a39ab2` só em 15px+ e sobre fundo escuro.
- Os 10 usos de 9–10px viram 12px ou saem.

---

## 3. Proporções — a escala está fraturada

**26 tamanhos de fonte distintos** no site. Pares imperceptíveis:

`13 / 13.5` · `14 / 14.5` · `15 / 15.5` · `16 / 16.5` · `26 / 28 / 30` · `44 / 46`

Custa consistência e não entrega diferença visual. Proposta de colapso para **9 degraus**:

```
12 · 13 · 15 · 16 · 21 · 26 · 34 · 44 · 56
```
(11→12, 13.5→13, 14/14.5→13 ou 15, 15.5→15, 16.5/17→16, 18→16 ou 21, 28/30→26, 46→44, 64/72 só no hero)

**11 paddings verticais de seção:** `26 · 44 · 56 · 72 · 88 · 96 · 100 · 112 · 144 · 148 · 172`.
O 96px domina (56 usos) e o 88px vem em seguida (13) — mas 88/96/100/112 são quatro sabores do mesmo respiro, e 144/148 são duas alturas de topo de hero que ninguém distingue.

Proposta: **5 degraus** — `48 · 72 · 96 · 144` + `172` só no hero da home.

**Raios:** 2px em 107 lugares + pill em 6. Consistente. O design system pede 16px em cards; o site foi para 2px de propósito (leitura editorial/premium). Funciona — só confirmar que é a direção.

---

## 4. Responsividade — inexistente

Todas as 17 páginas: `#om-site { width: 1440px }`. Zero `@media` no site.

- Abaixo de 1440 → scroll horizontal.
- Acima de 1440 → duas faixas brancas laterais.
- Em celular de 390px a página é **3,7× mais larga que a tela**.

### O que o Osmo resolve — e o que não resolve

O sistema do Osmo é **escala fluida**, não reflow. Ele funciona porque tudo está em `em`, ancorado num `font-size` de `<body>` que segue a largura da tela. Nosso site é 100% px cravado.

**Resolve:** desktop de 992 a 1920 com um único design. Troca `width:1440px` por `max-width: var(--size-container)`, converte px→em, e o layout respira em qualquer monitor sem quebrar nada. Mecânico.

**Não resolve:** mobile. Se apenas escalarmos, a 390px o texto de 15px vira ~4px. O próprio Osmo reconhece isso — por breakpoint ele reseta `--size-container-ideal` (390 no mobile), o que pressupõe que exista **um design mobile de 390** para ancorar. Grid de 4 colunas virando 1, hero menor, nav em hamburger: isso é desenho, não conversão.

---

## Fase 0 — executada

Aplicada nas 17 páginas + `Header` + `Footer`. `v1/` permanece no estado anterior.

**Contraste**

| Antes | Depois | Onde |
|---|---|---|
| `#a39ab2` 2,69:1 | `#6b6480` **5,59:1** | 219 rótulos e legendas |
| `#cfc8d8` 1,63:1 | `#8b839e` **3,60:1** | 12 setas `→` / `↗` a 18px |

Verificado que `#a39ab2` não aparecia em nenhum fundo escuro nas 17 páginas — a troca foi segura em bloco. As demais cores de texto já passavam: `#14111e` 18,6:1 · `#56506a` 7,63:1 · `#6730be` 7,66:1.

O magenta `#e62c7c` fica em 4,19:1 no claro — abaixo de AA para texto pequeno. Não mexi: é cor de marca amostrada do logotipo. Hoje ele só aparece em filetes, dots e numeradores decorativos, não em texto corrido. Se algum dia virar texto pequeno, tratamos ali.

**Escala tipográfica — de 26 para 10 degraus**

`12 · 13 · 14 · 15 · 16 · 18 · 21 · 26 · 44 · 56` (+ `34 · 64 · 72` em heros)

| De | Para | Ocorrências |
|---|---|---|
| 9, 10, 11 | 12 | 250 |
| 12.5, 13.5 | 13 | 94 |
| 14.5 | 14 | 101 |
| 15.5 | 15 | 16 |
| 16.5, 17 | 16 | 51 |
| 22 | 21 | 1 |
| 28, 30 | 26 | 6 |
| 46 | 44 | 42 |

**561 valores normalizados. Zero texto abaixo de 12px em todo o site.**

**Ritmo vertical — de 11 para 5 degraus**

`48 · 72 · 96 · 144 · 172`

`88 → 96` (13) · `100 → 96` (10) · `112/116 → 96` (1) · `96/100 → 96` (3) · `148 → 144` (5) · `144/88 → 144/96` (6) · `44/56 → 48` (4) · `160 → 144` (1, rodapé do hero da home)

**Revalidação de layout após as mudanças**

17/17 páginas limpas: zero overflow-X, zero sobreposição, zero texto cortado. Variação de altura entre −88px (Home) e +40px (páginas de serviço), toda ela explicada pela normalização de padding — nenhuma quebra de linha nova nos rótulos que subiram de 11 para 12px.

---

## Fase 1 — executada

Sistema Osmo aplicado nas 17 páginas + `Header` + `Footer`.

**`rem`, não `em`.** O Osmo documenta `em`, que funciona no Webflow porque o `font-size` vem herdado de um wrapper. Aqui não serve: `em` num `padding` resolve contra o `font-size` **do próprio elemento**, então `padding:1em` num título de 44px daria 44px e num rótulo de 12px daria 12px. `rem` ancora no `html`, que é exatamente onde a escala do Osmo vive. Mesma matemática, resultado previsível.

```css
:root{
  --size-unit:16;
  --size-container-ideal:1440;
  --size-container-min:1280px;
  --size-container-max:1920px;
  --size-container:clamp(var(--size-container-min),100vw,var(--size-container-max));
  --size-font:calc(var(--size-container) / (var(--size-container-ideal) / var(--size-unit)))
}
html{font-size:var(--size-font)}
```

Raiz do site: `width:1440px` → **`width:var(--size-container)`**.

Não `width:100%` com `max-width`. A diferença importa: com `width:100%` o layout acompanha a viewport e só a *fonte* trava no piso, então as duas coisas se desacoplam abaixo do mínimo — a página encolhe até o texto virar 8px, sem nunca mostrar scroll. Com `width:var(--size-container)` o container inteiro trava junto com a escala, e abaixo do piso aparece scroll horizontal com o texto intacto. É o trade-off correto: rolar de lado é recuperável, texto de 8px não.

**2.763 atributos de estilo convertidos** de px para rem.

**Piso de legibilidade — por que o mínimo é 1280 e não 992**

Escala fluida multiplica tudo, inclusive o piso de 12px que a Fase 0 estabeleceu. Com o mínimo do Osmo em 992 o `html` cai para 11,02px e o menor rótulo vai a **8,27px** — a Fase 1 desfaria a Fase 0 em todo laptop abaixo de 1440. Duas correções:

1. `--size-container-min` de 992 para **1280px**.
2. O menor degrau de tipo sobe de 12px para **13px** (351 rótulos), dando folga antes de encostar no piso conforme a escala reduz. A escala fica em **9 degraus**: `13 · 14 · 15 · 16 · 18 · 21 · 26 · 44 · 56`.

| viewport | `html` | menor texto | scroll-x |
|---|---|---|---|
| 1920 | 21,33px | 17,33px | não |
| 1600 | 17,78px | 14,44px | não |
| 1440 | 16,00px | 13,00px | não |
| 1280 | 14,22px | 11,56px | não |
| 1024 | 14,22px | 11,56px | 256px |

**O que ficou em px de propósito**

| Caso | Por quê |
|---|---|
| `border`, `border-top/right/bottom/left`, `outline` | Filete de 1px deve continuar 1px. Escalado para 1,33px em 1920 ele borra. |
| Qualquer valor ≤ 2px | Pega o raio de 2px (107 usos), os divisores de 1px e os micro-deslocamentos de hover (`translateY(-2px)`). Devem permanecer constantes. |
| `translateX(6px)`, `translateY(16px)` no JS de movimento | Deslocamento transitório de animação, não geometria de layout. |

**Constantes de pixel no JS também tratadas** — padding do header no scroll (`22px`/`15px`), o mega-menu mobile (`gap`, `padding`, três tamanhos de fonte, um deles um `13.5px` que a Fase 0 não alcançava por estar em JS) e o indicador de aba da home, que agora escala a constante de 30px pelo `font-size` da raiz.

**Verificação**

*Fidelidade em 1440* — comparação lado a lado contra uma cópia de controle com a conversão revertida: **6656px vs 6656px**, e os 12 filhos diretos do container com diferença de **+0px** cada. Conversão sem perda (toda divisão por 16 termina exata em binário).

*Tipografia* — as 17 páginas em 1440: menor texto renderizado **13,00px** em todas, zero overflow, zero sobreposição.

*Escala* — de 1280 a 1920 o container preenche a viewport, o `font-size` da raiz acerta a fórmula na casa decimal e não há scroll horizontal em nenhuma largura. Em 1024 o container trava em 1280 e aparecem 256px de scroll-x, com o texto preservado em 11,56px — comportamento pretendido.

**Faixa coberta: 1280 a 1920.** Abaixo de 1280 o container trava e volta o scroll horizontal — é o que a Fase 2 resolve.

Os blocos de tablet e mobile do Osmo **não** entraram agora, e não é economia de esforço: sem reflow eles pioram o resultado. Reancorar `--size-container-ideal` em 1024 devolveria o `html` para ~20px numa viewport de 1279 — texto maior que no desktop, dentro de um container menor, com as grades de 4 colunas estourando por dentro. O `--size-container-ideal` por breakpoint pressupõe que exista um layout desenhado naquela largura. Enquanto não existir, o piso travado é a opção honesta.

---

## Fase 2 — executada

Reflow aplicado nas 17 páginas + `Header` + `Footer`. **Faixa coberta: 390 a 1920.**

### A decisão que destrava tudo: escala fluida é técnica de desktop

A Fase 1 deixou o site numa escala fluida ancorada em 1440. Estender essa escala para baixo não funciona, e a Fase 1 já havia diagnosticado por quê: com o mínimo em 992 o menor rótulo cai para 8,27px. Tentar salvar com um `--size-container-ideal` por breakpoint (o padrão do Osmo) troca um defeito por outro — reancorar em 834 devolve `html` a 19px numa viewport de 991, ou seja **texto maior no tablet do que no desktop**, dentro de um container menor.

A saída é abandonar o modelo fluido abaixo do desktop:

```css
@media (max-width:1279px){
  html{font-size:16px}
  #om-site{width:100%!important;max-width:none!important}
}
```

Acima de 1280 nada mudou — a Fase 1 continua intacta. Abaixo de 1280 o tipo trava em 16px e o container acompanha a viewport. O efeito é o desejado: **todo valor em `rem` volta a valer exatamente o pixel desenhado em 1440**, então o piso de 13px se mantém em qualquer largura, inclusive 390.

### O erro que eu cometi: seletor por substring de estilo inline

A primeira versão mirava `[style*="grid-template-columns:repeat(3,"]` e similares. **Não funciona.** O runtime re-serializa `style` via React, com espaço depois dos dois-pontos e da vírgula:

| autorado | renderizado |
|---|---|
| `justify-content:space-between` | `justify-content: space-between` |
| `grid-template-columns:repeat(3,1fr)` | `grid-template-columns: repeat(3, 1fr)` |
| `font:700 4.5rem/1.02 Manrope,sans-serif` | `font: 700 4.5rem / 1.02 Manrope, sans-serif` |

Todo seletor com dois-pontos era letra morta. Sobreviveu só `[style*="rem 5rem"]` — que não tem dois-pontos — e o padding lateral funcionando **disfarçou o fato de que o resto do bloco não fazia nada**: um `h1` de 72px numa viewport de 390.

Correção: **estampar `data-*` no passe em massa e mirar nos atributos.** Atributos `data-*` não sofrem re-serialização. Estampados: 107 `data-om-pad`, 10 `data-om-mar`, 72 `data-om-grid`, 9 `data-om-gridkeep`, 269 `data-om-flex`, 158 `data-om-fz`.

### Regras por breakpoint

| | ≤991 | ≤767 | ≤479 |
|---|---|---|---|
| Padding/margem lateral de seção | 2,5rem | 1,75rem | 1,25rem |
| `grid="multi"` (3+ colunas) | `repeat(2,1fr)` | `1fr` | — |
| `grid="rows"` (linhas do grupo) | `8.125rem 1fr` | `1fr` | — |
| `grid="pair"` (2 colunas) | mantém | `1fr` | — |
| `gridkeep` (`auto 1fr`, `2.125rem 1fr`) | mantém | mantém | `1fr` |
| Linhas flex | `wrap` + `flex-shrink:1` + `min-width:0` | — | — |
| Hero 4/4,5rem · 3,5rem · 2,75rem | 3 · 2,625 · 2,25rem | 2,375 · 2,125 · 1,875rem | 2 · 1,875 · 1,625rem |

**`gridkeep` só empilha em 479.** São linhas de ícone/numerador + texto: empilhar joga o marcador para uma linha própria, então elas resistem até o portrait, onde não há alternativa.

**Tabela comparativa 3P/1P** (`data-om-cmp`) tem tratamento próprio: em ≤767 vai para `1fr 1fr` com o rótulo atravessando as duas colunas, para o par de valores continuar lado a lado. Colapsar em `1fr` destruiria a comparação.

### Seis causas distintas de overflow, todas diferentes

Nenhuma era "faltou media query". Cada uma exigiu um mecanismo próprio:

1. **Seletor morto** (acima) — a causa da maioria.
2. **Formas de seletor divergentes entre breakpoints.** `[data-om-grid]` em ≤767 contra `[data-om-grid="multi"]` em ≤991: mesma especificidade, e com **três cópias do stylesheet** no documento (página + Header + Footer, cada DC injeta seu `<helmet>`) a ordem deixa de ser confiável. Passei a usar a mesma forma nos dois breakpoints, aí a ordem dentro de cada cópia decide.
3. **`grid-column:span 2` cria coluna implícita.** Com o template em `1fr`, o card 05 que ocupa duas colunas no desktop **forçava uma segunda coluna implícita** — o grid continuava com 2 trilhas e a página estourava. Resolvido com `[data-om-grid]>*{grid-column:auto!important}`.
4. **`1fr` é `minmax(auto,1fr)`.** O mínimo automático impede a trilha de encolher abaixo do min-content do conteúdo: duas trilhas de 316px dentro de uma caixa de 350px. Resolvido com `min-width:0` nos filhos.
5. **`margin` lateral, não `padding`.** Um bloco com `margin:5.5rem 5rem` ficava com 160px de margem em 390px de tela. A regra de padding não o alcançava — daí `data-om-mar`.
6. **Regra certa no breakpoint errado.** A quebra de linha flex estava só em ≤767, mas a faixa "Parceiros oficiais" precisa dela **a partir de ~960px**: no estado ≤991 os cinco logos têm altura fixa e `min-width:auto`, então não encolhem, e sem `wrap` o mínimo do container é a soma dos logos (639px). Resultado: **+116px de overflow em 768 — iPad portrait — e +24px em 860**. As três declarações subiram para o bloco ≤991. `flex-wrap:wrap` só age quando o conteúdo não cabe, então promover é seguro.

### Nav mobile

Em ≤991 o `<nav>` central, o link de Contato, os divisores e o seletor de idioma saem; entra um hambúrguer de 44×44px. O botão do Assistente IA fica — é o único atalho que vale preservar no header estreito.

O drawer é `position:fixed` de tela cheia, alimentado pelas **mesmas constantes `SERVICOS`/`EMPRESAS` do mega-menu de desktop** (uma fonte, dois layouts — serviço novo aparece nos dois sem edição dupla). Escape fecha. Alvos de toque em 2,75rem.

O mega-menu de desktop não recebeu tratamento mobile de propósito: em ≤991 o gatilho está escondido, logo ele é inalcançável.

### Verificação — 17 páginas × 11 larguras

`1440 · 1100 · 980 · 900 · 860 · 800 · 768 · 740 · 600 · 480 · 390`

| | overflow | grids fora do esperado | menor texto |
|---|---|---|---|
| todas as larguras | 0 | 0 | 13px |

**187 medições, zero falha.** `768` entra como ponto fixo — é uma das viewports de tablet mais comuns que existem.

⚠️ **Evitar o boundary não é pular a banda.** A primeira suíte mediu 1440/980/740/390 e cantou "zero falha" — mas entre **768 e 979 não havia um único ponto**, e era exatamente ali que o defeito nº 6 vivia. Pior: o +116px que aparecia em 767 foi descartado como artefato de boundary quando era o comportamento real do estado ≤991, persistindo até ~900px. Sair de cima de 991/767 é necessário; **medir dentro de cada banda, não só perto dos extremos, é o que fecha a conta**.

⚠️ **Não medir em cima do boundary.** Com fração de pixel, `max-width:991px` não casa numa viewport de 991. Use 980 para o estado ≤991 e 740 para o ≤767. A suíte deriva a asserção de `matchMedia` dentro do iframe, em vez de assumir o estado pela largura nominal.

⚠️ **Asserção por tipo de grid, não genérica.** Contar "trilhas > 2" como defeito reprovava os `pair` de gutter (`1fr 1.375rem 1fr`), que corretamente mantêm 3 trilhas em ≤991.

**Superfície de revisão visual:** `_test-visual.html`, colunas em **980 / 768 / 740 / 390**. A primeira versão usava 991/767 — os próprios boundaries — e por isso duas das três colunas mostravam o estado do breakpoint de cima, não o que anunciavam.

### Fase 2b — composição mobile

O reflow da Fase 2 garantia "não estoura". Isso não é o mesmo que boa composição: colapsar colunas resolve a largura e **não toca no ritmo vertical**, que continuava em escala de desktop.

**Ritmo vertical por bucket.** O padding de seção era `6rem 5rem 0` (96px no topo) — desenhado para 1440, absurdo em 390. Comprimi por par (topo|base) preservando a assimetria: são 10 pares distintos de padding e 2 de margem, estampados como `data-om-pv="6rem-0"` etc., com uma regra por par em cada breakpoint (×0,65 em ≤991, ×0,5 em ≤767, ×0,42 em ≤479, arredondado a 0,25rem).

Não dá para comprimir com uma regra só: `6rem 5rem 0` tem base zero de propósito e `padding-block` uniforme destruiria isso. O bucket preserva a intenção de cada bloco.

Resultado na home a 390px: hero 172px → 72px de topo, seções 96px → 40px, **página 925px mais curta** (13.409 → 12.484).

Também: `data-om-pull` (18 blocos com `margin-top` negativo — sobreposição de faixa escura, device de desktop) zera em ≤767; `data-om-cta` (12 linhas de botão) empilha em largura cheia em ≤479; `data-om-logos` reflui em 2 linhas a 390 e 1 linha a 740.

**Bug que eu introduzi e a medição pegou:** `[data-om-cta]>a{width:100%}` produzia âncoras de **410px dentro de uma linha de 350px** — o projeto usa `box-sizing:content-box`, então `width:100%` soma o padding por cima. Não aparecia como overflow porque o pai clipava. Corrigido com `box-sizing:border-box`.

### Dois artefatos de medição que quase me fizeram "consertar" o que estava certo

**Captura de tela re-renderiza o DOM e inventa colisões.** Nos screenshots os títulos das linhas numeradas apareciam sobrepostos ao corpo, e o header sticky virava um slab cinza com o texto vazando por trás. Nenhum dos dois existe no browser: o primeiro é erro de reposicionamento de texto com `align-items:baseline` + quebra de linha, o segundo é `backdrop-filter` não renderizado. **Diagnóstico de layout tem de sair de `getBoundingClientRect`, não de pixel.** O detector de sobreposição sobre geometria real acusou **0** nas 12 páginas.

**Contar linhas por `top` distinto está errado quando as alturas variam.** A faixa de parceiros parecia ter "5 logos em 5 linhas"; os logos têm alturas diferentes (30/24/28/21/24px) e `align-items:center`, então cada um tem `top` próprio **na mesma linha**. Bucket por centro vertical com tolerância de 14px: são 2 linhas a 390 e 1 a 740, como se espera.

⚠️ **Não colocar query string no `src` de um iframe do preview.** `?t=${Date.now()}` como cache-buster faz o servidor de preview recusar o arquivo — os quatro painéis do harness voltaram `<pre>invalid preview token</pre>`. E o buster nem era necessário: `draw()` recria os iframes a cada troca de aba. O que eu tinha diagnosticado como cache HTTP era outra coisa — eu media iframes **criados antes** de reescrever o arquivo.

**Vazios grandes na tela não eram padding.** As faixas brancas dos primeiros screenshots eram conteúdo ainda não revelado — `om-motion.js` arma `opacity:0` e revela num laço geométrico que scroll programático com 450ms não alcança. Na auditoria eu forço `opacity:1` antes de medir.

---

## Ordem recomendada — o que falta

**Fase 3 — animação de entrada dos cases** (loader Osmo/GSAP).
Encaixa bem: o loader é uma tomada de tela cheia que resolve em imagem, e a imagem de topo do case já existe. Depende de GSAP + SplitText.

**Revisão visual do reflow.** Os números estão limpos, mas número não vê layout. Vale passar o olho em `_test-visual.html` nas seis páginas mais densas — o que pode ter escapado é grade de 2 colunas que ficou estreita demais em 767, não overflow.
