import express from 'express';
import { resolve, sep } from 'node:path';
import { existsSync } from 'node:fs';
import { criarRotaLead } from './lead-route.js';
import { enviarSlack } from './notify-slack.js';
import { enviarEmail } from './notify-email.js';

const DIST = resolve(import.meta.dirname, '..', 'dist');

// Resolve URLs limpas para o .html correspondente ANTES do express.static.
// Necessário porque dist/cases.html e dist/cases/ (e servicos) coexistem: sem
// isto o static prioriza a pasta e devolve 301 para /cases/, que não tem índice.
function servirHtmlLimpo(req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  let rota = req.path;
  if (rota.endsWith('/')) rota += 'index';
  if (/\.[a-z0-9]+$/i.test(rota)) return next(); // deixa assets (.js/.css/.png…) com o static

  const arquivo = resolve(DIST, '.' + rota + '.html');
  // Barreira contra path traversal: o alvo tem de ficar dentro de dist/.
  if ((arquivo === DIST || arquivo.startsWith(DIST + sep)) && existsSync(arquivo)) {
    return res.sendFile(arquivo);
  }
  return next();
}

export function criarApp() {
  const app = express();
  app.use(express.json({ limit: '32kb' }));
  app.post('/api/lead', criarRotaLead({ enviarSlack, enviarEmail }));
  app.use(servirHtmlLimpo);
  app.use(express.static(DIST, { extensions: ['html'] }));
  return app;
}
