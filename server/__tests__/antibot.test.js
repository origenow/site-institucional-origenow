import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { criarAntibot } from '../antibot.js';
import { pareceBot } from '../bots.js';
import { headAntibot } from '../../build/antibot.js';

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

// --- Token ---

test('token so vale depois do tempo minimo e ate a validade', () => {
  const relogio = { t: 1_000_000 };
  const ab = criarAntibot({ segredo: 's', minimoMs: 2500, validadeMs: 10_000, agora: () => relogio.t });
  const token = ab.emitir();

  assert.equal(ab.verificar(token), 'rapido');
  relogio.t += 2500;
  assert.equal(ab.verificar(token), 'ok');
  relogio.t += 8001;
  assert.equal(ab.verificar(token), 'expirado');
});

test('token adulterado, de outro segredo ou malformado e invalido', () => {
  const ab = criarAntibot({ segredo: 's', minimoMs: 0 });
  const [ts, nonce, assinatura] = ab.emitir().split('.');

  assert.equal(ab.verificar(`${Number(ts) - 60_000}.${nonce}.${assinatura}`), 'invalido'); // "envelhecido" à mão
  assert.equal(criarAntibot({ segredo: 'outro', minimoMs: 0 }).verificar(ab.emitir()), 'invalido');
  assert.equal(ab.verificar(undefined), 'invalido');
  assert.equal(ab.verificar('a.b'), 'invalido');
});

// --- Middleware do POST ---

function subir(ab) {
  const app = express();
  app.use(express.json());
  app.get('/api/lead/token', ab.rotaToken);
  app.post('/api/lead', ab.verificarLead, (req, res) => res.status(201).json({ passou: true }));
  const servidor = app.listen(0);
  return { servidor, base: `http://127.0.0.1:${servidor.address().port}` };
}

async function postar(base, corpo, cabecalhos = {}) {
  const headers = Object.fromEntries(Object.entries({
    'content-type': 'application/json', origin: base, 'user-agent': CHROME, ...cabecalhos,
  }).filter(([, v]) => v !== undefined));
  const r = await fetch(`${base}/api/lead`, { method: 'POST', headers, body: JSON.stringify(corpo) });
  return { status: r.status, corpo: await r.json() };
}

test('navegador real, da pagina do site, com token maduro passa', async () => {
  const ab = criarAntibot({ segredo: 's', minimoMs: 0 });
  const { servidor, base } = subir(ab);
  const r = await postar(base, { nome: 'Maria', email: 'maria@empresa.com.br', token: ab.emitir() });
  servidor.close();

  assert.equal(r.status, 201);
});

test('POST sem Origin ou vindo de outro site e recusado', async () => {
  const ab = criarAntibot({ segredo: 's', minimoMs: 0 });
  const { servidor, base } = subir(ab);
  const semOrigin = await postar(base, { token: ab.emitir() }, { origin: undefined });
  const deFora = await postar(base, { token: ab.emitir() }, { origin: 'https://spam.example' });
  servidor.close();

  assert.equal(semOrigin.status, 403);
  assert.equal(deFora.status, 403);
});

test('user-agent de automacao e descartado em silencio', async () => {
  const ab = criarAntibot({ segredo: 's', minimoMs: 0 });
  const { servidor, base } = subir(ab);
  const r = await postar(base, { token: ab.emitir() }, { 'user-agent': 'python-requests/2.32' });
  servidor.close();

  assert.equal(r.status, 200); // parece sucesso para o bot…
  assert.deepEqual(r.corpo, { ok: true }); // …mas não chegou à rota do lead (201)
});

test('sem token pede renovacao com codigo token', async () => {
  const { servidor, base } = subir(criarAntibot({ segredo: 's', minimoMs: 0 }));
  const r = await postar(base, { nome: 'Maria', email: 'maria@empresa.com.br' });
  servidor.close();

  assert.equal(r.status, 400);
  assert.equal(r.corpo.codigo, 'token');
});

test('envio logo apos emitir o token e descartado em silencio', async () => {
  const ab = criarAntibot({ segredo: 's', minimoMs: 60_000 });
  const { servidor, base } = subir(ab);
  const r = await postar(base, { nome: 'Maria', email: 'maria@empresa.com.br', token: ab.emitir() });
  servidor.close();

  assert.deepEqual([r.status, r.corpo], [200, { ok: true }]);
});

test('link no nome ou mensagem cheia de links e descartado em silencio', async () => {
  const ab = criarAntibot({ segredo: 's', minimoMs: 0 });
  const { servidor, base } = subir(ab);
  const nome = await postar(base, { nome: 'Ganhe dinheiro www.spam.com', token: ab.emitir() });
  const links = await postar(base, {
    nome: 'Maria', mensagem: 'https://a.com https://b.com https://c.com', token: ab.emitir(),
  });
  const umLink = await postar(base, { nome: 'Maria', mensagem: 'Nossa loja: https://loja.com.br', token: ab.emitir() });
  servidor.close();

  assert.deepEqual([nome.status, nome.corpo], [200, { ok: true }]);
  assert.deepEqual([links.status, links.corpo], [200, { ok: true }]);
  assert.equal(umLink.status, 201); // um link na mensagem é normal
});

test('rota de token nao e cacheavel e informa os tempos', async () => {
  const { servidor, base } = subir(criarAntibot({ segredo: 's', minimoMs: 1234 }));
  const r = await fetch(`${base}/api/lead/token`);
  const corpo = await r.json();
  servidor.close();

  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.match(corpo.token, /^\d+\.[\w-]+\.[\w-]+$/);
  assert.equal(corpo.minimoMs, 1234);
});

// --- Assinaturas de robô ---

test('reconhece crawlers e automacao, sem pegar navegadores de gente', () => {
  const robos = [
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    'AdsBot-Google (+http://www.google.com/adsbot.html)',
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/128.0.0.0 Safari/537.36',
    'curl/8.7.1', 'python-requests/2.32.3', 'Go-http-client/2.0', '',
  ];
  const gente = [
    CHROME,
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/470.0.0]',
    'Mozilla/5.0 (Linux; Android 13; CUBOT KingKong 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  ];

  for (const ua of robos) assert.equal(pareceBot(ua), true, `deveria ser robô: ${ua}`);
  for (const ua of gente) assert.equal(pareceBot(ua), false, `deveria ser gente: ${ua}`);
});

test('script do navegador e um unico <script> valido', () => {
  const head = headAntibot();
  assert.match(head, /^<script id="om-antibot">/);
  assert.equal(head.match(/<\/script>/g).length, 1);
  const corpo = head.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
  assert.doesNotThrow(() => new Function(corpo));
});
