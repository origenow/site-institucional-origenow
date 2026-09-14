import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarApp } from '../app.js';

function subir() {
  const servidor = criarApp().listen(0);
  return { servidor, base: `http://127.0.0.1:${servidor.address().port}` };
}

test('serve a home em / com o title de SEO no HTML inicial (sem JS)', async () => {
  const { servidor, base } = subir();
  const resposta = await fetch(`${base}/`);
  const corpo = await resposta.text();
  servidor.close();

  assert.equal(resposta.status, 200);
  // O <title> foi injetado no <head> estático pelo build — crawler o vê sem executar JS.
  assert.match(corpo, /<title>Origenow · Consultoria data-driven para marketplaces<\/title>/);
  assert.match(corpo, /property="og:title"/);
  assert.match(corpo, /<script id="om-tracking">/); // tags do Google no <head>
  assert.match(corpo, /<script id="om-antibot">/);
  // Regras responsivas no <head>: valem antes de o Header (dc-import) carregar.
  assert.match(corpo, /<style id="om-responsivo">@media[^<]*\[data-om-grid/);
});

test('antibot protege o POST de lead e emite token', async () => {
  const { servidor, base } = subir();
  const semOrigem = await fetch(`${base}/api/lead`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ nome: 'Maria', email: 'maria@empresa.com.br' }),
  });
  const token = await fetch(`${base}/api/lead/token`);
  servidor.close();

  assert.equal(semOrigem.status, 403);
  assert.equal(token.status, 200);
  assert.ok((await token.json()).token);
});

test('toda versao anunciada no hreflang existe (sem 404 para o Google)', async () => {
  const { servidor, base } = subir();
  const home = await (await fetch(`${base}/`)).text();
  const alternativas = [...home.matchAll(/hreflang="([^"]+)" href="https?:\/\/[^/]+([^"]*)"/g)];
  const status = await Promise.all(alternativas.map(async ([, lang, caminho]) =>
    `${lang} ${(await fetch(`${base}${caminho}`)).status}`));
  servidor.close();

  assert.ok(alternativas.length >= 2);
  assert.deepEqual(status.filter((s) => !s.endsWith(' 200')), []);
});

test('referrer entre paginas do proprio site e preservado (atribuicao)', async () => {
  const { servidor, base } = subir();
  const r = await fetch(`${base}/`);
  servidor.close();
  assert.equal(r.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
});

test('serve uma pagina .dc.html com o seu title de SEO', async () => {
  const { servidor, base } = subir();
  const resposta = await fetch(`${base}/Origenow%20Cases.dc.html`);
  const corpo = await resposta.text();
  servidor.close();

  assert.equal(resposta.status, 200);
  assert.match(corpo, /<title>Cases de sucesso · Origenow<\/title>/);
  // A fonte interativa é preservada: <x-dc> continua no corpo para o support.js hidratar.
  assert.match(corpo, /<x-dc>/);
});

test('serve os componentes importados (Header/Footer) para o dc-import', async () => {
  const { servidor, base } = subir();
  const header = await fetch(`${base}/Header.dc.html`);
  servidor.close();

  assert.equal(header.status, 200);
});

test('rate limit bloqueia flood no /api/lead', async () => {
  const { servidor, base } = subir();
  let ultimo;
  for (let i = 0; i < 7; i++) {
    ultimo = await fetch(`${base}/api/lead`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nome: 'x', email: 'a@b.co' }),
    });
  }
  servidor.close();
  assert.equal(ultimo.status, 429); // após 5/min, bloqueia
});

test('nao expoe o header X-Powered-By', async () => {
  const { servidor, base } = subir();
  const r = await fetch(`${base}/`);
  servidor.close();
  assert.equal(r.headers.get('x-powered-by'), null);
  assert.ok(r.headers.get('x-content-type-options')); // helmet ativo
});

test('responde 404 em rota inexistente', async () => {
  const { servidor, base } = subir();
  const resposta = await fetch(`${base}/nao-existe`);
  servidor.close();

  assert.equal(resposta.status, 404);
});
