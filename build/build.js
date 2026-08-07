// Build do site (estratégia "servir a fonte + <head> pré-computado").
//
// Cada página .dc.html é renderizada no cliente pelo support.js (runtime com
// estado: header, menus, formulário). Crawlers e Google, porém, precisam do
// <title>, do Open Graph e do canonical no HTML inicial — que na fonte vivem
// dentro de <x-dc><helmet> e só entram no <head> quando o JavaScript roda.
//
// Este build lê cada fonte, extrai as tags de SEO do <helmet>, reescreve os
// links internos para URLs limpas e grava em dist/<caminho>/index.html,
// preservando o <x-dc> no corpo para a hidratação no cliente.

import { mkdir, writeFile, readFile, cp, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { TODAS, IMPORTS, PASTAS, ARQUIVOS, mapaDeLinks } from './pages.js';
import { jsonLd, llmsTxt, tipoDaPagina } from './structured-data.js';
import { IDIOMAS, traduzir, tagsHreflang } from './i18n.js';
import { existsSync } from 'node:fs';

const RAIZ = resolve(import.meta.dirname, '..');
const DIST = resolve(RAIZ, 'dist');

export const SITE_URL = (process.env.SITE_URL || 'https://www.origenow.com.br').replace(/\/$/, '');

/** Extrai do <helmet> as tags que um crawler precisa ver sem executar JS. */
export function extrairHeadSeo(html) {
  const helmet = /<helmet>([\s\S]*?)<\/helmet>/i.exec(html)?.[1] ?? html;
  const tags = [];

  const title = /<title>[\s\S]*?<\/title>/i.exec(helmet);
  if (title) tags.push(title[0]);

  for (const m of helmet.matchAll(/<meta\s+[^>]*>/gi)) {
    const tag = m[0];
    const nome = /\sname="([^"]*)"/i.exec(tag)?.[1] ?? '';
    const prop = /\sproperty="([^"]*)"/i.exec(tag)?.[1] ?? '';
    if (/^(description|robots|keywords|author)$/i.test(nome) ||
        /^twitter:/i.test(nome) || /^og:/i.test(prop)) {
      tags.push(tag);
    }
  }
  for (const m of helmet.matchAll(/<link\s+[^>]*>/gi)) {
    if (/rel="(icon|canonical)"/i.test(m[0])) tags.push(m[0]);
  }
  return tags.join('\n');
}

/** Sobrescreve título e descrição — usado nas variantes (cases e artigos). */
function aplicarTituloEDescricao(seo, title, desc) {
  let out = seo;
  if (title) {
    out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`)
             .replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/i, `$1${title}$2`)
             .replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/i, `$1${title}$2`);
  }
  if (desc) {
    out = out.replace(/(<meta\s+name="description"\s+content=")[^"]*(")/i, `$1${desc}$2`)
             .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/i, `$1${desc}$2`);
  }
  return out;
}

/** Acrescenta canonical + og:url e torna absolutos og:image / twitter:image. */
export function seoAbsoluto(seo, urlPagina) {
  let out = seo.replace(
    /(<meta\s+(?:property|name)="(?:og:image|twitter:image)"\s+content=")([^"]+)(")/gi,
    (m, a, valor, z) => (/^https?:\/\//i.test(valor) ? m : `${a}${SITE_URL}/${valor.replace(/^\.?\//, '')}${z}`),
  );
  if (!/rel="canonical"/i.test(out)) out += `\n<link rel="canonical" href="${urlPagina}">`;
  if (!/property="og:url"/i.test(out)) out += `\n<meta property="og:url" content="${urlPagina}">`;
  return out;
}

const CSS_MOBILE = `<style id="om-tap">@media (max-width:767px){` +
  `header a{min-height:44px}` +
  `footer a{min-height:44px;display:flex;align-items:center}` +
  `#lead-form input,#lead-form textarea{min-height:44px;box-sizing:border-box}` +
  `}</style>`;

/**
 * Injeta <base href="/">, o SEO e o CSS de toque no <head> estático.
 * O <base> é o que permite servir a mesma fonte em caminhos aninhados
 * (/servicos/consultoria) sem quebrar os ativos relativos (assets/…).
 */
export function injetarHead(html, seo, extra = '') {
  const bloco = `<base href="/">\n${seo}\n${CSS_MOBILE}${extra ? '\n' + extra : ''}`;
  const alvo = /(<meta\s+charset="[^"]*">)/i;
  if (alvo.test(html)) return html.replace(alvo, `$1\n${bloco}`);
  return html.replace(/(<head[^>]*>)/i, `$1\n${bloco}`);
}

// Imagens do template com src de binding ({{ ... }}) são pré-carregadas pelo
// navegador com a URL literal antes do runtime resolver, gerando 404.
export function adiarPreloadDeBinding(html) {
  return html.replace(/<img\b(?![^>]*\sloading=)([^>]*\ssrc="\{\{[^"]*"[^>]*)>/gi, '<img loading="lazy"$1>');
}

/** Reescreve os hrefs do fonte (Origenow%20X.dc.html) para as URLs limpas. */
export function reescreverLinks(html, mapa) {
  let out = html;
  // Chaves mais longas primeiro: com query string antes da versão sem.
  const chaves = [...mapa.keys()].sort((a, b) => b.length - a.length);
  for (const chave of chaves) {
    out = out.split(`href="${chave}"`).join(`href="${mapa.get(chave)}"`);
  }
  // Sobras sem variante mapeada caem no índice da seção.
  out = out.split('href="Origenow%20Case%20Novo.dc.html"').join('href="/cases"');
  out = out.split('href="Origenow%20Artigo.dc.html"').join('href="/insights"');
  return out;
}

/** Caminho em disco para uma URL limpa: /cases -> dist/cases/index.html */
function arquivoDaUrl(url) {
  const limpo = url.replace(/^\/+|\/+$/g, '');
  return limpo ? `${limpo}/index.html` : 'index.html';
}

async function gravar(saidaRel, conteudo) {
  const saida = resolve(DIST, saidaRel);
  await mkdir(dirname(saida), { recursive: true });
  await writeFile(saida, conteudo, 'utf8');
}

export async function buildAll() {
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  const mapa = mapaDeLinks();
  const urls = [];
  const fichas = [];

  // Dicionário por idioma. Ausente ou incompleto, o texto cai no português —
  // a tradução pode entrar em partes sem nunca quebrar a página.
  const dicts = {};
  for (const idioma of IDIOMAS) {
    const arq = resolve(RAIZ, 'i18n', `${idioma.code}.json`);
    dicts[idioma.code] = !idioma.padrao && existsSync(arq)
      ? JSON.parse(await readFile(arq, 'utf8'))
      : null;
  }

  for (const idioma of IDIOMAS) {
    const dict = dicts[idioma.code];
    if (!idioma.padrao && !dict) { console.log(`--  ${idioma.code}: sem dicionário, pulando`); continue; }

    for (const p of TODAS) {
      const bruto = await readFile(resolve(RAIZ, p.src), 'utf8');
      const fonte = idioma.padrao ? bruto : traduzir(bruto, dict);
      const urlLocal = `${idioma.prefixo}${p.url}`;
      const urlAbs = `${SITE_URL}${urlLocal}`;

      let seo = extrairHeadSeo(fonte);
      if (p.title || p.desc) {
        // Nas variantes o título vem do mapa (português); traduz se houver.
        seo = aplicarTituloEDescricao(seo, dict?.[p.title] || p.title, dict?.[p.desc] || p.desc);
      }
      seo = seoAbsoluto(seo, urlAbs);
      seo += `\n${tagsHreflang(SITE_URL, p.url)}`;

      const varScript = p.param
        ? `<script>window.__OM_VAR__={${p.param}:${JSON.stringify(p.valor)}};</script>`
        : '';

      const titulo = /<title>([\s\S]*?)<\/title>/i.exec(seo)?.[1] || '';
      const descricao = /name="description"\s+content="([^"]*)"/i.exec(seo)?.[1] || '';
      const ld = jsonLd({ site: SITE_URL, url: urlLocal, titulo, descricao, tipo: tipoDaPagina(p.url) });

      // O prefixo de idioma entra ANTES do <base href="/"> ser injetado —
      // senão a própria tag <base> vira /en/ e os ativos passam a ser
      // procurados dentro do idioma, quebrando a página inteira.
      let corpo = reescreverLinks(fonte, mapa);
      if (idioma.prefixo) corpo = corpo.replace(/href="\//g, `href="${idioma.prefixo}/`);
      let html = adiarPreloadDeBinding(injetarHead(corpo, seo, `${ld}${varScript}`));
      // Cada idioma tem o seu Header/Footer; os ativos seguem na raiz por causa
      // do <base href="/">, então o import é que muda de nome.
      if (idioma.prefixo) html = html.replace(/(<dc-import\s+name=")(Header|Footer)(")/g, `$1$2-${idioma.code}$3`);
      html = html.replace(/<html(?![^>]*\slang=)/i, `<html lang="${idioma.hreflang}"`);

      await gravar(arquivoDaUrl(urlLocal), html);
      urls.push(urlAbs);
      if (idioma.padrao) fichas.push({ url: p.url, titulo, descricao });
    }
    console.log(`ok  ${idioma.code}: ${TODAS.length} páginas`);
  }

  // Header/Footer: um por idioma, na raiz (o <base href="/"> resolve os ativos).
  for (const imp of IMPORTS) {
    const bruto = await readFile(resolve(RAIZ, imp), 'utf8');
    for (const idioma of IDIOMAS) {
      const dict = dicts[idioma.code];
      if (!idioma.padrao && !dict) continue;
      let saida = reescreverLinks(idioma.padrao ? bruto : traduzir(bruto, dict), mapa);
      if (idioma.prefixo) saida = saida.replace(/href="\//g, `href="${idioma.prefixo}/`);
      const nome = idioma.padrao ? imp : imp.replace('.dc.html', `-${idioma.code}.dc.html`);
      await gravar(nome, saida);
    }
  }
  for (const pasta of PASTAS) await cp(resolve(RAIZ, pasta), resolve(DIST, pasta), { recursive: true });
  for (const arq of ARQUIVOS) await cp(resolve(RAIZ, arq), resolve(DIST, arq));

  // Mapa de redirect das URLs antigas (.dc.html, com ou sem query) para as
  // limpas. O servidor lê daqui — dist/ é o que vai para a imagem, build/ não.
  const redirects = {};
  for (const [chave, destino] of mapa) redirects[`/${chave}`] = destino;
  await gravar('_rotas.json', JSON.stringify(redirects, null, 2));

  await gravar('llms.txt', llmsTxt(SITE_URL, fichas));
  await gravar('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
  await gravar(
    'sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n') +
      `\n</urlset>\n`,
  );

  console.log(`\n${TODAS.length} páginas geradas · sitemap com ${urls.length} URLs.`);
}

if (import.meta.filename === process.argv[1]) await buildAll();
