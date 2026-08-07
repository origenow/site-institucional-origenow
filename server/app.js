import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { resolve } from 'node:path';
import { criarRotaLead } from './lead-route.js';
import { enviarSlack } from './notify-slack.js';
import { enviarEmail } from './notify-email.js';

const DIST = resolve(import.meta.dirname, '..', 'dist');

export function criarApp() {
  const app = express();
  app.disable('x-powered-by');            // sem fingerprint do Express
  app.set('trust proxy', 1);              // atrás do proxy da Railway (X-Forwarded-For)

  // Headers de segurança (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy…).
  // CSP desligada de propósito: as páginas .dc.html usam script/estilo inline e o runtime
  // React; uma CSP estrita quebraria o site. HSTS sem includeSubDomains para não forçar
  // HTTPS nos outros subdomínios de origenow.com.br.
  app.use(helmet({
    contentSecurityPolicy: false,
    hsts: { maxAge: 15552000, includeSubDomains: false },
  }));

  // Só o domínio oficial deve ser indexado. A URL *.up.railway.app serve o mesmo
  // conteúdo e, sem isto, competiria com o domínio como conteúdo duplicado.
  const HOST_CANONICO = (process.env.SITE_URL || 'https://www.origenow.com.br')
    .replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
  app.use((req, res, next) => {
    const host = (req.hostname || '').toLowerCase();
    if (host && host !== HOST_CANONICO) res.set('X-Robots-Tag', 'noindex, nofollow');
    next();
  });

  app.use(express.json({ limit: '32kb' }));

  // Rate limit só na captação de lead: barra flood no #comercial e no e-mail.
  const limiteLead = rateLimit({
    windowMs: 60_000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { erro: 'Muitas tentativas. Aguarde um minuto e tente novamente.' },
  });
  app.post('/api/lead', limiteLead, criarRotaLead({ enviarSlack, enviarEmail }));

  // Serve as páginas .dc.html (fonte interativa + <head> de SEO) e os ativos.
  app.use(express.static(DIST, { dotfiles: 'allow' }));
  return app;
}
