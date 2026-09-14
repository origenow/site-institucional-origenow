import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { resolve, sep } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { criarRotaLead } from './lead-route.js';
import { criarAntibot } from './antibot.js';
import { enviarSlack } from './notify-slack.js';
import { enviarEmail } from './notify-email.js';

const DIST = resolve(import.meta.dirname, '..', 'dist');

/** Redirects das URLs antigas (.dc.html) para as limpas, gerados no build. */
function carregarRotas() {
  const arq = resolve(DIST, '_rotas.json');
  if (!existsSync(arq)) return {};
  try { return JSON.parse(readFileSync(arq, 'utf8')); } catch { return {}; }
}

export function criarApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  const HOST_CANONICO = (process.env.SITE_URL || 'https://www.origenow.com.br')
    .replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();

  // O apex (origenow.com.br) redireciona para o domínio canônico. Servir o
  // mesmo conteúdo nos dois endereços dividiria sinal de SEO; o 301 concentra
  // tudo no www e ainda faz o endereço sem www funcionar para o visitante.
  const APEX = HOST_CANONICO.replace(/^www\./, '');
  app.use((req, res, next) => {
    const host = (req.hostname || '').toLowerCase();
    if (host === APEX && APEX !== HOST_CANONICO) {
      return res.redirect(301, `https://${HOST_CANONICO}${req.originalUrl}`);
    }
    // Só o domínio oficial deve ser indexado; a URL *.up.railway.app serve o
    // mesmo conteúdo e competiria como conteúdo duplicado.
    if (host && host !== HOST_CANONICO) res.set('X-Robots-Tag', 'noindex, nofollow');
    return next();
  });

  app.use(helmet({
    contentSecurityPolicy: false,
    hsts: { maxAge: 15552000, includeSubDomains: false },
    // O padrão do helmet (no-referrer) apaga o referrer até entre páginas do
    // próprio site; este é o padrão dos navegadores: caminho completo só na
    // mesma origem, e só o domínio para sites de fora.
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }));

  app.use(express.json({ limit: '32kb' }));

  const limiteLead = rateLimit({
    windowMs: 60_000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { erro: 'Muitas tentativas. Aguarde um minuto e tente novamente.' },
  });
  // Teto por hora para quem respeita o limite por minuto e insiste.
  const limiteLeadHora = rateLimit({
    windowMs: 60 * 60_000,
    max: 20,
    standardHeaders: false,
    legacyHeaders: false,
    message: { erro: 'Muitas tentativas. Tente novamente mais tarde.' },
  });
  const limiteToken = rateLimit({ windowMs: 60_000, max: 30, standardHeaders: true, legacyHeaders: false });

  const antibot = criarAntibot();
  app.get('/api/lead/token', limiteToken, antibot.rotaToken);
  app.post('/api/lead', limiteLead, limiteLeadHora, antibot.verificarLead, criarRotaLead({ enviarSlack, enviarEmail }));

  // Endereços de sitemap digitados errado no Search Console (sem .xml, com
  // barra ou ponto no fim) caíam no 404 em HTML, e o Google acusava "o sitemap
  // está em HTML". Comparação exata do caminho: rota com barra opcional do
  // Express casaria também /sitemap.xml e criaria um laço de redirect.
  const SITEMAP_ERRADO = new Set(['/sitemap', '/sitemap.', '/sitemap/', '/sitemap.xml/', '/sitemap_index.xml', '/sitemap.html']);
  app.use((req, res, next) => (
    (req.method === 'GET' || req.method === 'HEAD') && SITEMAP_ERRADO.has(req.path)
      ? res.redirect(301, '/sitemap.xml')
      : next()
  ));

  // URLs antigas (.dc.html, com ou sem query) -> URL limpa, com 301 para o
  // Google transferir o histórico caso alguma já tenha sido compartilhada.
  const rotas = carregarRotas();
  app.get(/\.dc\.html$/, (req, res, next) => {
    const chave = req.path + (req.originalUrl.includes('?') ? '?' + req.originalUrl.split('?')[1] : '');
    const destino = rotas[chave] || rotas[req.path];
    if (destino) return res.redirect(301, destino);
    return next(); // Header.dc.html / Footer.dc.html seguem para o static
  });

  // URL limpa -> dist/<caminho>/index.html, sem o 301 de barra final do static.
  app.get(/.*/, (req, res, next) => {
    if (/\.[a-z0-9]+$/i.test(req.path)) return next(); // ativos
    const limpo = req.path.replace(/^\/+|\/+$/g, '');
    const arquivo = resolve(DIST, limpo, 'index.html');
    if ((arquivo === DIST || arquivo.startsWith(DIST + sep)) && existsSync(arquivo)) {
      return res.sendFile(arquivo);
    }
    return next();
  });

  app.use(express.static(DIST, { dotfiles: 'allow' }));
  return app;
}
