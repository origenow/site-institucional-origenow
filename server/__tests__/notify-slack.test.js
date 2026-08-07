import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { enviarSlack } from '../notify-slack.js';

const LEAD = {
  nome: 'Maria Souza', email: 'maria@empresa.com.br', empresa: 'Empresa X',
  whatsapp: '(31) 99999-0000', canais: 'Mercado Livre', mensagem: 'Quero escalar.',
};

function limparEnv() {
  delete process.env.SLACK_WEBHOOK_URL;
  delete process.env.SLACK_BOT_TOKEN;
  delete process.env.SLACK_CHANNEL_ID;
  delete process.env.SLACK_CHANNEL;
}

// --- Caminho 1: Incoming Webhook ---

test('posta o lead no webhook', async () => {
  limparEnv();
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
  limparEnv();
  process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/TESTE';
  mock.method(globalThis, 'fetch', async () => new Response('invalid_token', { status: 403 }));

  await assert.rejects(() => enviarSlack(LEAD), /Slack respondeu 403/);
  mock.restoreAll();
});

// --- Caminho 2: Bot token (chat.postMessage) ---

test('posta via bot token quando nao ha webhook', async () => {
  limparEnv();
  process.env.SLACK_BOT_TOKEN = 'xoxb-teste';
  process.env.SLACK_CHANNEL_ID = 'C089RSN323C';
  const chamadas = [];
  mock.method(globalThis, 'fetch', async (url, opcoes) => {
    chamadas.push({ url, auth: opcoes.headers.authorization, corpo: JSON.parse(opcoes.body) });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  });

  await enviarSlack(LEAD);
  mock.restoreAll();

  assert.equal(chamadas[0].url, 'https://slack.com/api/chat.postMessage');
  assert.equal(chamadas[0].auth, 'Bearer xoxb-teste');
  assert.equal(chamadas[0].corpo.channel, 'C089RSN323C');
  assert.match(chamadas[0].corpo.text, /Maria Souza/);
});

test('lanca quando o bot token falha logicamente (ok:false)', async () => {
  limparEnv();
  process.env.SLACK_BOT_TOKEN = 'xoxb-teste';
  process.env.SLACK_CHANNEL_ID = 'C089RSN323C';
  mock.method(globalThis, 'fetch', async () =>
    new Response(JSON.stringify({ ok: false, error: 'not_in_channel' }), { status: 200 }));

  await assert.rejects(() => enviarSlack(LEAD), /not_in_channel/);
  mock.restoreAll();
});

test('lanca quando nenhuma variavel esta configurada', async () => {
  limparEnv();
  await assert.rejects(() => enviarSlack(LEAD), /SLACK_WEBHOOK_URL ou SLACK_BOT_TOKEN/);
});
