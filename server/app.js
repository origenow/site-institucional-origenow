import express from 'express';
import { resolve } from 'node:path';
import { criarRotaLead } from './lead-route.js';
import { enviarSlack } from './notify-slack.js';
import { enviarEmail } from './notify-email.js';

const DIST = resolve(import.meta.dirname, '..', 'dist');

export function criarApp() {
  const app = express();
  app.use(express.json({ limit: '32kb' }));
  app.post('/api/lead', criarRotaLead({ enviarSlack, enviarEmail }));
  // Serve as páginas .dc.html (fonte interativa + <head> de SEO) e os ativos.
  // A home responde em "/" via dist/index.html. dotfiles:'allow' porque o
  // image-slot.js busca o sidecar .image-slots.state.json; dist/ é saída de
  // build e não contém segredos (.env fica fora, no ambiente da Railway).
  app.use(express.static(DIST, { dotfiles: 'allow' }));
  return app;
}
