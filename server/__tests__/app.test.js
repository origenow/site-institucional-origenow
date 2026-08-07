import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarApp } from '../app.js';

test('serve a home em /', async () => {
  const servidor = criarApp().listen(0);
  const { port } = servidor.address();
  const resposta = await fetch(`http://127.0.0.1:${port}/`);
  const corpo = await resposta.text();
  servidor.close();

  assert.equal(resposta.status, 200);
  // O pre-render emite <title data-dc-tpl="1">Origenow…>; regex tolera o atributo.
  assert.match(corpo, /<title[^>]*>Origenow/);
});

test('responde 404 em rota inexistente', async () => {
  const servidor = criarApp().listen(0);
  const { port } = servidor.address();
  const resposta = await fetch(`http://127.0.0.1:${port}/nao-existe`);
  servidor.close();

  assert.equal(resposta.status, 404);
});
