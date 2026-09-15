import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { criarRotaLead } from '../lead-route.js';

function subir(notificadores) {
  const app = express();
  app.use(express.json());
  app.post('/api/lead', criarRotaLead(notificadores));
  return app.listen(0);
}

async function postar(servidor, corpo) {
  const { port } = servidor.address();
  return fetch(`http://127.0.0.1:${port}/api/lead`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(corpo),
  });
}

const VALIDO = { nome: 'Maria', email: 'maria@empresa.com.br' };

test('aceita lead valido e chama os dois notificadores', async () => {
  const chamados = [];
  const servidor = subir({
    enviarSlack: async () => chamados.push('slack'),
    enviarEmail: async () => chamados.push('email'),
  });

  const resposta = await postar(servidor, VALIDO);
  servidor.close();

  assert.equal(resposta.status, 200);
  assert.deepEqual(chamados.sort(), ['email', 'slack']);
});

test('recusa quando falta o nome', async () => {
  const servidor = subir({ enviarSlack: async () => {}, enviarEmail: async () => {} });
  const resposta = await postar(servidor, { email: 'maria@empresa.com.br' });
  const corpo = await resposta.json();
  servidor.close();

  assert.equal(resposta.status, 400);
  assert.match(corpo.erro, /nome/i);
});

test('recusa e-mail malformado', async () => {
  const servidor = subir({ enviarSlack: async () => {}, enviarEmail: async () => {} });
  const resposta = await postar(servidor, { nome: 'Maria', email: 'nao-e-email' });
  servidor.close();

  assert.equal(resposta.status, 400);
});

test('responde 200 se ao menos um notificador funcionar', async () => {
  const servidor = subir({
    enviarSlack: async () => { throw new Error('slack fora do ar'); },
    enviarEmail: async () => {},
  });

  const resposta = await postar(servidor, VALIDO);
  servidor.close();

  assert.equal(resposta.status, 200);
});

test('responde 502 se os dois notificadores falharem', async () => {
  const servidor = subir({
    enviarSlack: async () => { throw new Error('fora'); },
    enviarEmail: async () => { throw new Error('fora'); },
  });

  const resposta = await postar(servidor, VALIDO);
  servidor.close();

  assert.equal(resposta.status, 502);
});

test('repassa a origem da campanha so com chaves conhecidas e texto curto', async () => {
  let recebido;
  const servidor = subir({ enviarSlack: async (lead) => { recebido = lead; }, enviarEmail: async () => {} });

  await postar(servidor, {
    ...VALIDO,
    origem: { utm_source: 'google', gclid: 'abc', pagina: '/contato', intruso: 'x', utm_campaign: 'c'.repeat(1000) },
  });
  servidor.close();

  assert.deepEqual(Object.keys(recebido.origem).sort(), ['gclid', 'pagina', 'utm_campaign', 'utm_source']);
  assert.equal(recebido.origem.utm_campaign.length, 300);
});

test('responde se o lead e qualificado e descarta codigos de perfil invalidos', async () => {
  const recebidos = [];
  const servidor = subir({ enviarSlack: async (lead) => { recebidos.push(lead); }, enviarEmail: async () => {} });

  const bom = await postar(servidor, { ...VALIDO, tipo: 'industria', faturamento: '50-200' });
  const pequeno = await postar(servidor, { ...VALIDO, tipo: 'lojista', faturamento: 'ate-50' });
  const invalido = await postar(servidor, { ...VALIDO, tipo: '<script>', faturamento: 'muito' });
  const corpos = [await bom.json(), await pequeno.json(), await invalido.json()];
  servidor.close();

  assert.deepEqual(corpos.map((c) => c.qualificado), [true, false, false]);
  assert.equal(recebidos[0].tipo, 'industria');
  assert.equal(recebidos[2].tipo, '');
  assert.equal(recebidos[2].motivo, 'perfil não informado');
});

test('ignora origem que nao seja objeto', async () => {
  let recebido;
  const servidor = subir({ enviarSlack: async (lead) => { recebido = lead; }, enviarEmail: async () => {} });

  const resposta = await postar(servidor, { ...VALIDO, origem: ['google'] });
  servidor.close();

  assert.equal(resposta.status, 200);
  assert.equal(recebido.origem, undefined);
});

test('descarta silenciosamente quando o honeypot vem preenchido', async () => {
  const chamados = [];
  const servidor = subir({
    enviarSlack: async () => chamados.push('slack'),
    enviarEmail: async () => chamados.push('email'),
  });

  const resposta = await postar(servidor, { ...VALIDO, website: 'http://spam.com' });
  servidor.close();

  assert.equal(resposta.status, 200);
  assert.deepEqual(chamados, []);
});
