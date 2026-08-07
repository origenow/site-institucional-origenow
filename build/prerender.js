import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const RAIZ = resolve(import.meta.dirname, '..');

/** Renderiza uma página .dc.html e devolve o HTML final. */
export async function prerenderPage(browser, arquivoEntrada, saida, query = '') {
  const pagina = await browser.newPage();
  const url = pathToFileURL(resolve(RAIZ, arquivoEntrada)).href + query;

  await pagina.goto(url, { waitUntil: 'networkidle' });
  // O runtime remove o <x-dc> fonte e injeta o <title> ao concluir.
  await pagina.waitForFunction(() => document.title.length > 0, { timeout: 15000 });

  const html = await pagina.content();
  await mkdir(dirname(resolve(RAIZ, saida)), { recursive: true });
  await writeFile(resolve(RAIZ, saida), html, 'utf8');
  await pagina.close();

  return { html, bytes: Buffer.byteLength(html, 'utf8') };
}

/** Mede se o HTML pré-renderizado sofre flash ao ser reaberto pelo runtime. */
export async function medirFlash(browser, arquivoGerado) {
  const pagina = await browser.newPage();
  const url = pathToFileURL(resolve(RAIZ, arquivoGerado)).href;

  await pagina.goto(url, { waitUntil: 'commit' });
  const amostras = [];
  const inicio = Date.now();
  while (Date.now() - inicio < 4000) {
    amostras.push(await pagina.evaluate(() => {
      const site = document.getElementById('om-site');
      return site ? site.getBoundingClientRect().height : 0;
    }));
    await pagina.waitForTimeout(50);
  }
  await pagina.close();

  const primeiraAltura = amostras.find((h) => h > 0) ?? 0;
  const zerouDepois = amostras.some((h, i) => h === 0 && amostras.slice(0, i).some((a) => a > 0));
  return { primeiraAltura, zerouDepois, amostras };
}
