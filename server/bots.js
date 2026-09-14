// Assinaturas de crawlers e ferramentas de automação no User-Agent.
//
// Fonte única para os dois lados: o servidor descarta leads desses clientes
// (antibot.js) e o build injeta os padrões no script de tracking, que não
// mede esses visitantes no Google.
//
// Prévias de link (WhatsApp, Slack, LinkedIn…) ficam de fora de propósito: não
// executam JavaScript nem enviam formulário, e o nome desses apps aparece no
// User-Agent de navegadores embutidos usados por gente de verdade.

export const PADRAO_BOT =
  'bot|crawl|spider|slurp|mediapartners|feedfetcher|facebookexternalhit|google-inspectiontool|' +
  'headless|phantomjs|puppeteer|playwright|selenium|webdriver|lighthouse|pagespeed|gtmetrix|' +
  'pingdom|uptime|prerender|curl|wget|python|go-http|java/|okhttp|axios|node-fetch|undici|' +
  'libwww|scrapy|httpclient|postman';

// Aparelhos reais cujo nome contém uma das palavras acima.
export const EXCECOES_BOT = 'cubot';

const RE_BOT = new RegExp(PADRAO_BOT, 'i');
const RE_EXCECOES = new RegExp(EXCECOES_BOT, 'i');

/** User-Agent ausente também conta: todo navegador envia um. */
export function pareceBot(ua) {
  if (!ua) return true;
  return RE_BOT.test(ua) && !RE_EXCECOES.test(ua);
}
