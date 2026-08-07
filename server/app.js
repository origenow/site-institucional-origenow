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
  app.use(express.static(DIST, { extensions: ['html'] }));
  return app;
}
