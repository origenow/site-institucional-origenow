// Build do site (estratégia "servir a fonte + <head> pré-computado").
//
// Cada página .dc.html é renderizada no cliente pelo support.js (runtime com
// estado: header, menus, formulário). Crawlers e Google, porém, precisam do
// <title> e do Open Graph no HTML inicial — que hoje vivem dentro de
// <x-dc><helmet> e só entram no <head> quando o JavaScript roda.
//
// Este build lê cada fonte, extrai as tags de SEO do <helmet> e as injeta no
// <head> estático, preservando o <body> (com <x-dc> intacto) para a hidratação
// no cliente. Não reescreve conteúdo; a fonte segue sendo a verdade.

import { mkdir, writeFile, readFile, cp, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const RAIZ = resolve(import.meta.dirname, '..');
const DIST = resolve(RAIZ, 'dist');

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

/** Injeta as tags de SEO no <head> estático, logo após o viewport. */
export function injetarHead(html, seo) {
  if (!seo) return html;
  const alvo = /(<meta\s+name="viewport"[^>]*>)/i;
  if (alvo.test(html)) return html.replace(alvo, `$1\n${seo}`);
  return html.replace(/(<head[^>]*>)/i, `$1\n${seo}`); // fallback
}

async function gravar(saidaRel, conteudo) {
  const saida = resolve(DIST, saidaRel);
  await mkdir(dirname(saida), { recursive: true });
  await writeFile(saida, conteudo, 'utf8');
}

export async function buildAll() {
  const { PAGINAS, IMPORTS, PASTAS, ARQUIVOS } = await import('./pages.js');

  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  const semTitulo = [];
  for (const { src, home } of PAGINAS) {
    const html = await readFile(resolve(RAIZ, src), 'utf8');
    const seo = extrairHeadSeo(html);
    if (!/<title>/i.test(seo)) semTitulo.push(src);
    const saidaHtml = injetarHead(html, seo);
    await gravar(src, saidaHtml);
    if (home) await gravar('index.html', saidaHtml);
    console.log(`ok  dist/${src}`);
  }

  // Header/Footer verbatim — buscados crus pelo dc-import em runtime.
  for (const imp of IMPORTS) await cp(resolve(RAIZ, imp), resolve(DIST, imp));
  for (const pasta of PASTAS) await cp(resolve(RAIZ, pasta), resolve(DIST, pasta), { recursive: true });
  for (const arq of ARQUIVOS) await cp(resolve(RAIZ, arq), resolve(DIST, arq));

  if (semTitulo.length) console.warn(`AVISO: sem <title> no helmet: ${semTitulo.join(', ')}`);
  console.log(`${PAGINAS.length} páginas + ${IMPORTS.length} componentes gerados em dist/.`);
}

if (import.meta.filename === process.argv[1]) await buildAll();
