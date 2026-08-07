import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { enviarSlack } from '../notify-slack.js';

const LEAD = {
  nome: 'Maria Souza', email: 'maria@empresa.com.br', empresa: 'Empresa X',
  whatsapp: '(31) 99999-0000', canais: 'Mercado Livre', mensagem: 'Quero escalar.',
};

test('posta o lead no webhook', async () => {
  process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/TESTE';
  const chamadas = [];
  mock.method(globalThis, 'fetch', async (url, opcoes) => {
    chamadas.push({ url, corpo: JSON.parse(opcoes.body) });
    return new Response('ok', { status: 200 });
  });

  await enviarSlack(LEAD);
  mock.restoreAll();

  assert.equal(chamadas.length, 1);
  assert.equal(chamadas[0].url, 'https://hooks.slack.com/services/TESTE');
  assert.match(chamadas[0].corpo.text, /Maria Souza/);
  assert.match(chamadas[0].corpo.text, /maria@empresa\.com\.br/);
});

test('lanca quando o webhook recusa', async () => {
  process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/TESTE';
  mock.method(globalThis, 'fetch', async () => new Response('invalid_token', { status: 403 }));

  await assert.rejects(() => enviarSlack(LEAD), /Slack respondeu 403/);
  mock.restoreAll();
});

test('lanca quando a variavel nao esta configurada', async () => {
  delete process.env.SLACK_WEBHOOK_URL;
  await assert.rejects(() => enviarSlack(LEAD), /SLACK_WEBHOOK_URL/);
});
