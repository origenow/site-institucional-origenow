# Origenow Design System

A reusable kit for designing **decks, marketing pages and internal tools** for **Origenow** — a Brazilian e-commerce/marketplace consultancy that helps merchants start, scale or migrate online operations (Mercado Livre, Amazon, Shopee, Magalu, TikTok Shop, etc.).

This system was bootstrapped primarily for **slide presentations** (Beautiful.ai-style proposals) but the tokens and components scale to web/app surfaces.

---

## What Origenow does (context)

- Especialista em **e-commerce e marketplaces** — assessoria, terceirização de contratação, treinamento de colaboradores.
- Oficialmente certificada pelo **Mercado Livre** e parceira de plataformas como **Amazon, Shopee, Magalu, TikTok Shop, ERPs, Ads**.
- Atende vendedores brasileiros — toda a comunicação é em **português do Brasil**, profissional mas próxima.
- Marca jovem, otimista — construída em torno de um sorriso (a "smile" no logotipo).

### Sources used to build this system
- `uploads/logo-origenow-otimizada.webp` — official logo (white logotype + magenta accents on transparent bg).
- `uploads/Beautiful.ai - Proposta I Assessoria Allabard.pdf` — sample 16-slide commercial proposal; used as the canonical voice & layout reference.
- User-provided brand color: **`#6730be`** (roxo Origenow).
- GitHub org `github.com/origenow` was browsed; the public repos are **client products** (Robin Hood/lead-spark, etc.) using different palettes — no Origenow-branded codebase was found, so the system is rebuilt from the logo + deck.

---

## Index — what's in this folder

| Path | What it is |
|---|---|
| `README.md` | You are here. Brand context + content + visual foundations + iconography. |
| `SKILL.md` | Cross-compatible skill definition (works as Agent Skill in Claude Code). |
| `DESIGN_SYSTEM_APRESENTACOES.md` | The production deck system **as actually built** (Inter everywhere, Phosphor icons, reskin-by-client). Read this for any slide work. |
| `colors_and_type.css` | All color + typography + spacing + shadow + radius + motion tokens. Import this in every artifact. |
| `slides/` | Shared deck base imported by every deck: `slide-base.css` (slide layout + components) + `deck-stage.js` (the `<deck-stage>` shell). **Not** sample templates — this is load-bearing. |
| `assets/` | Brand logo (`logo-origenow-white.webp`) + `certifications/` (`cert-*` partner/consultoria badges) + `marketplaces/` (`logo-*` channel marks). The single source of truth for shared brand imagery. |
| `<cliente>/` | One folder per delivered deck (`ts2`, `riffel-*`, `rio-commerce`, `nativas-br`, `cirurgica-saude`, `casa-das-poltronas`, `tiktok-shop-ts2`). Each holds its HTML + a local `assets/` **only** for client-specific photos. |

---

## CONTENT FUNDAMENTALS — voice & copy

Origenow speaks **Portuguese (BR)** in a tone that's **professional, warm, plural-collective, action-oriented**. The brand always speaks for the team ("Nós", "Nossa equipe") and addresses the client as a partner ("Vocês", "te ajudar a…", "conte com a nossa equipe").

### Voice attributes
| Trait | How it shows up |
|---|---|
| **Profissional, fácil de entender** | Sem jargão técnico desnecessário. "Cadastro de produtos", não "onboarding de SKU". |
| **Coletivo (Nós/Vocês)** | "**Nós** faremos", "**Vocês** farão", "**Conte com a nossa equipe**". Quase nunca "eu". |
| **Acolhedor, parceiro** | "te ajudar a iniciar, expandir ou migrar", "**Muito obrigado!**", "Conte com a nossa estratégia". |
| **Concreto e numérico** | Sempre que possível, números: *"4 conferências mensais"*, *"suporte 6 dias via WhatsApp"*, *"média de 25 entrevistados"*, *"R$ 4.790,00"*. |
| **Estruturado** | Listas curtas, paralelas. Verbo no infinitivo ou tempo presente: *"Criação de relatórios", "Realização de Campanhas de Ads", "Análise de mercado via IA"*. |

### Casing rules
- **Títulos de slide**: `Title Case` em PT-BR — primeiras letras maiúsculas das palavras principais (`Pontos da Apresentação`, `Modelagem de Negócio`, `Visão Geral do Projeto`, `Tudo para Ecommerce`).
- **Eyebrows / sections** (rótulos pequenos acima do título): TODAS MAIÚSCULAS com letter-spacing largo (`SOBRE O PROJETO`, `PRECIFICAÇÃO`, `A ORIGENOW`).
- **Body copy**: sentence case normal.
- **Logotype**: sempre `origenow` em minúsculas — **nunca** "OrigeNow", "Origenow" no logo. No corpo do texto pode-se escrever `Origenow` ou `ORIGENOW` (como visto no rodapé das colunas da apresentação).

### Specific examples (extracted from proposal)
- *"Somos uma consultoria especialista em ecommerce e marketplaces, com um conjunto de soluções para te ajudar a iniciar, expandir ou migrar sua operação de vendas pela internet."*
- *"Conte com a Nossa Equipe"* / *"Conte com a nossa Estratégia"* — fórmula consagrada para sub-headers de seção.
- *"O que Nós Faremos"* vs *"O Que Vocês Farão"* — split de responsabilidades em duas colunas.
- *"Nossa Sugestão"* — cabeçalho recorrente para recomendações.
- *"Muito obrigado!"* — slide de fechamento, sempre acompanhado de endereço, telefones, e-mail e @origenow.

### Emoji?
**Não.** Não use emoji em decks ou comunicação institucional. Use ícones (Lucide / placeholders) quando precisar de pictogramas. O único "emoji-like" da marca é o **smile** no logotipo, e isso é parte da identidade visual, não da copy.

---

## VISUAL FOUNDATIONS

### Colors
- **Primary**: `#6730be` Origenow purple. Usado em backgrounds de slide hero, headers, botões primários, faixas de destaque.
- **Accent**: `#e62c7c` magenta (cor da bolinha do "i" e do sorriso no logo). Usado para destaques pontuais, sublinhados, dots de timeline, número de seção, CTA secundário.
- **Neutros**: branco (`#ffffff`) é o segundo background dominante; cinzas warm-cool da escala `--gray-*`.
- Apoios: âmbar `#f5b22e`, mint `#2ecf9a`, sky `#2ea7f5` — use **com moderação** em diagramas, infográficos, badges de status.
- **Não use** gradientes roxo→azul ("AI gradient"). Quando precisar de profundidade, use `purple` → `purple-900` ou roxo plano com um único orb magenta como acento.

### Type
- **Display arredondado**: `Quicksand` (500/600/**700**) — headlines padrão, eyebrows, mantém o ar amigável do logotipo.
- **Display poster / números**: `Bebas Neue` — para grandes números (preços, %, anos), eyebrows ALL CAPS muito condensados, capas com palavra única gigante. Use sparingly.
- **Body**: `Inter` (default) ou `Roboto` (alternativa, mais geométrica) — corpo de texto, tabelas, UI. `Source Sans 3` como fallback humanist.
- **Mono**: stack de sistema (`ui-monospace`).
- Tracking: títulos `-0.02em`, eyebrows `+0.12em` UPPERCASE, Bebas `+0.02em` por padrão.

### Backgrounds & motifs
- **Slides hero / capa**: roxo cheio (`--brand-purple`) com o logotipo branco grande, ou foto com overlay roxo a 70% de opacidade.
- **Slides de conteúdo**: branco ou `--brand-purple-50` (whisper). Sem padrões repetitivos. Sem texturas grosseiras. Sem gradientes coloridos amplos.
- Permitido: **um orb magenta blurrado** flutuando no canto de slides hero (referência ao logo).
- Permitido: **forma decorativa do sorriso** (a curva magenta) como motif secundário em divisórias.
- Imagens são **fotográficas, coloridas, vibrantes** (e-commerce: produtos, packshots, varejo). Quando colocadas sobre roxo, recebem `mix-blend-mode: luminosity` ou tint roxo a 25%.

### Animation
- **Curtas e direcionais.** `--dur-base: 220ms`, `--dur-slow: 420ms`.
- **Easing**: `cubic-bezier(.2,.7,.2,1)` para entrada (out), `cubic-bezier(.6,.05,.3,1)` para in-out.
- Padrões: fade + slide-up de 8–16px, scale-in 0.96→1, accordion-down. **Nunca** bounces exagerados nem rotações 360°.

### Hover & press
- **Hover** em superfícies claras: escurecer 6–10% (`--brand-purple` → `--brand-purple-700`) **e** elevar shadow (`--shadow-sm` → `--shadow-md`).
- **Hover** em superfícies escuras: clarear 10% via `rgba(255,255,255,.08)` overlay.
- **Press**: shrink `scale(.98)` + remover shadow.
- **Focus**: `box-shadow: var(--shadow-glow)` — anel roxo 4px translúcido. Para CTAs magenta, `--shadow-magenta-glow`.

### Borders & radii
- **Radii**: `4 / 8 / 12 / 16 / 24 / 999`. Cards usam `--radius-lg` (16). Botões `--radius-pill` ou `--radius-md`.
- **Borders**: 1px `--border-1` (`#e6e2ec`) em superfícies claras; `rgba(255,255,255,.16)` em superfícies escuras.
- Origenow é uma marca **rounded-friendly** (vide o logotipo). Evite cantos retos em qualquer card primário.

### Shadows / elevation
- Três níveis: `--shadow-sm` (cards de lista), `--shadow-md` (cards primários, dialogs), `--shadow-lg` (modals, hero cards).
- Todas as shadows têm um traço **roxo** sutil (`rgba(103,48,190,…)`) — isso amarra a UI à marca.

### Layout rules
- **Slides**: 1920×1080 (16:9). Margens internas mínimas de 96px. Headline nunca abaixo de `--fz-48`.
- **Web**: container max 1200px, padding lateral 32px desktop / 20px mobile.
- **Eyebrow → Title → Body**: padrão de seção. Sempre nessa ordem.

### Transparency & blur
- **Glassmorphism leve** apenas em chrome de slide (numerador do slide, mini-nav). `rgba(255,255,255,.08)` + `backdrop-filter: blur(12px)`.
- Não use blur como decoração. Use para hierarquia.

### Card anatomy
- Background: `--white` ou `--bg-soft`.
- Border: 1px `--border-1` **OU** shadow `--shadow-md` (não as duas).
- Radius: `--radius-lg` (16px).
- Padding: `--space-6` (24px) ou `--space-8` (32px).
- Quando precisar destacar, **uma faixa magenta de 3–4px no topo OU um eyebrow magenta**, nunca borda colorida só na esquerda.

---

## ICONOGRAPHY

Origenow não tem icon font próprio. A recomendação é:

1. **Lucide Icons** (`lucide.dev`) — stroke 1.75–2px, rounded — combinam com o ar arredondado do logotipo. Importe via CDN:
   ```html
   <script src="https://unpkg.com/lucide@latest"></script>
   <i data-lucide="check"></i>
   <script>lucide.createIcons();</script>
   ```
2. **Logos de marketplaces parceiros** (Mercado Livre, Amazon, Shopee, Magalu, TikTok, Renner, Riffel, etc.) — sempre em **colorido oficial**. Não monocromar. Centralizados em `assets/marketplaces/` (`logo-*`). Selos de certificação/parceria (Mercado Livre, Amazon SPN, Shopee, TikTok Shop, Tiny, Nuvemshop, Cont Minas, Dreng, Web Continental, Google Partner, RD Station) ficam em `assets/certifications/` (`cert-*`). Referencie ambos a partir do `assets/` compartilhado da raiz.
3. **Pictogramas customizados** (ex.: "smile" da marca) — SVG inline com `currentColor` para herdar.
4. **Emoji**: ❌ não usar.
5. **Unicode** (→ • ★): apenas setas (`→`, `↗`) em microcopy e bullets pontuais (`•`).

Stroke weight padrão: `1.75px`. Tamanhos: 16 / 20 / 24 / 32 / 48 px.

⚠️ **Substituições sinalizadas:**
- **Fontes** — Quicksand, Bebas Neue, Roboto, Inter (e Source Sans 3 como humanist fallback) são todas via Google Fonts CDN. Se a Origenow tiver pesos/arquivos oficiais distintos (ex.: Inter Display, Quicksand variable), favor enviar para `fonts/` e atualizar `colors_and_type.css`.
- **Cor magenta `#e62c7c`** — extraída por amostragem dos pixels do logo. Se a paleta oficial tiver código exato diferente, substituir o token `--brand-magenta`.
- **Logos de marketplaces parceiros e selos de certificação** — centralizados em `assets/marketplaces/` e `assets/certifications/`. Referencie-os de lá (ex.: `../assets/marketplaces/logo-shopee.png`, `../assets/certifications/cert-amazon-spn.png`), nunca duplique dentro da pasta de um cliente.
