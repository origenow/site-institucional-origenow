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

test('serve /cases e /servicos sem colidir com as pastas de mesmo nome', async () => {
  const servidor = criarApp().listen(0);
  const { port } = servidor.address();
  const cases = await fetch(`http://127.0.0.1:${port}/cases`);
  const casesCorpo = await cases.text();
  const servicos = await fetch(`http://127.0.0.1:${port}/servicos`);
  servidor.close();

  assert.equal(cases.status, 200);
  assert.match(casesCorpo, /<title[^>]*>Cases/);
  assert.equal(servicos.status, 200);
});

test('serve um case dentro da pasta cases/', async () => {
  const servidor = criarApp().listen(0);
  const { port } = servidor.address();
  const resposta = await fetch(`http://127.0.0.1:${port}/cases/01`);
  servidor.close();

  assert.equal(resposta.status, 200);
});

test('responde 404 em rota inexistente', async () => {
  const servidor = criarApp().listen(0);
  const { port } = servidor.address();
  const resposta = await fetch(`http://127.0.0.1:${port}/nao-existe`);
  servidor.close();

  assert.equal(resposta.status, 404);
});
