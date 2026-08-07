import { chromium } from 'playwright';
import { prerenderPage, medirFlash } from './prerender.js';

const browser = await chromium.launch();

const { bytes } = await prerenderPage(browser, 'Origenow Contato.dc.html', 'dist/_piloto.html');
console.log(`HTML gerado: ${bytes} bytes`);

const { primeiraAltura, zerouDepois } = await medirFlash(browser, 'dist/_piloto.html');
console.log(`Altura no primeiro frame: ${primeiraAltura}px`);
console.log(`DOM zerou depois de renderizado: ${zerouDepois}`);

await browser.close();

if (primeiraAltura === 0) { console.error('REPROVADO: nada visível antes do runtime.'); process.exit(1); }
if (zerouDepois)         { console.error('REPROVADO: hidratação destrutiva.'); process.exit(1); }
console.log('APROVADO');
