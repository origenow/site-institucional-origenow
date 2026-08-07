import express from 'express';
import { resolve } from 'node:path';

const DIST = resolve(import.meta.dirname, '..', 'dist');

export function criarApp() {
  const app = express();
  app.use(express.json({ limit: '32kb' }));
  app.use(express.static(DIST, { extensions: ['html'] }));
  return app;
}
