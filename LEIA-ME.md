# Qual arquivo é o atual

**Regra: o que está na raiz é o site atual. Nada mais.**

Pastas com `_` na frente não são o site: `_ds/` (design system) e `_test-visual.html` (bancada de teste).

| Onde | O que é | Usar? |
|---|---|---|
| Raiz (`Origenow *.dc.html`) | **Site atual** — 17 páginas + Header + Footer | Sim |
| `_test-visual.html` | Mesma página em 1440 / 980 / 768 / 390 lado a lado | Para conferir mobile |
| `_ds/` | Design system da Origenow | Referência de cor e tipo |
| `assets/` | Logos, selos de certificação, imagens do site | Sim |
| `assets/logo-logt.png` | Logo da LOGT (ex-Log-O), fundo removido | Sim |
| `uploads/` | Originais que você enviou | Matéria-prima |

Para navegar o site: abra `Origenow Site.dc.html` e use o menu. Os links entre páginas funcionam.

---

## Mapa das páginas (raiz)

`Origenow Site` (home) · `Origenow Servicos` (índice) · `Origenow Servico Consultoria` / `Mix` / `Pesquisa` / `Representacao` / `Logistica` · `Origenow Cases` + `Case 01–05` · `Origenow Grupo` (empresas) · `Origenow Sobre` · `Origenow Insights` · `Origenow Contato`

`Header.dc.html` e `Footer.dc.html` são importados por todas — mexer neles muda o site inteiro.

Todo arquivo `.dc.html` na raiz é uma página publicável. Não há estudos nem rascunhos soltos.

---

## Último estado — 31/07/2026

**Imagens de hero — já aplicadas (01/08).** As cinco páginas de serviço e a de Empresas têm foto de fundo real, geradas e instaladas. A montagem preserva a identidade sozinha: a foto entra em `luminosity` sob véu roxo a 72%, então qualquer imagem vira Origenow e o texto branco continua legível. Para trocar uma delas, substitua o arquivo em `assets/`:

| Arquivo | Página | Cena |
|---|---|---|
| `hero-consultoria.png` | Serviço Consultoria | Time diante do painel de vendas |
| `hero-mix.png` | Serviço Mix | Prateleiras com variedade de SKUs |
| `hero-pesquisa.png` | Serviço Pesquisa | Dois monitores com análise de mercado |
| `hero-representacao.png` | Serviço Representação | Set de foto de produto |
| `hero-logistica.png` | Serviço Logística | Esteira e docas em CD |
| `hero-grupo.png` | Grupo | Escritório aberto |

**Ainda esperando foto:** `depo-1` a `depo-4` na home — fotos de Diego, Bianca, Débora e Bruna nos depoimentos.

**Hero da home:** `hero-caixas-alpha-crop.png` — foto original das caixas violeta/magenta, maior definição. A versão com logos dos marketplaces impressos (`hero-caixas-marketplaces.png`) segue em `assets/` como reserva, caso queiram retomar essa direção depois.

**Aberto:** os números dos cases (`+186%`, `+212%`, `+134%`, `+9/+6/+11 p.p.`) seguem sem fonte — ver item 1 do `COPY.md`.

**Higienização (31/07):** removidos a cópia antiga `v1/` (21 arquivos), duas páginas de estudo de hero, 23 imagens de exploração e duplicatas, e os conceitos de logo descartados. Sobraram 27 imagens, todas em uso — conferido, zero referência quebrada. Mantidos de propósito os selos `cert-contminas`, `cert-dreng`, `cert-nuvemshop` e `selo-jornada-startups`: estão sem uso hoje, mas são credenciais reais que podem entrar nas homologações.

Detalhe do que mudou e por quê: `REVISAO.md` (layout) e `COPY.md` (texto).
