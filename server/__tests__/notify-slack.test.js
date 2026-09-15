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

// --- Origem do lead ---

async function textoEnviado(lead) {
  limparEnv();
  process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/TESTE';
  let texto;
  mock.method(globalThis, 'fetch', async (url, opcoes) => {
    texto = JSON.parse(opcoes.body).text;
    return new Response('ok', { status: 200 });
  });
  await enviarSlack(lead);
  mock.restoreAll();
  return texto;
}

test('mostra a campanha, o clique de anuncio e o caminho no site', async () => {
  const texto = await textoEnviado({
    ...LEAD,
    origem: { utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'lancamento', utm_term: 'consultoria marketplace',
      gclid: 'abc', landing: '/servicos', pagina: '/contato' },
  });

  assert.match(texto, /\*Origem:\* google \/ cpc \/ lancamento · clique Google Ads/);
  assert.match(texto, /\*Termo:\* consultoria marketplace/);
  assert.match(texto, /\*Caminho:\* entrou em \/servicos · enviou em \/contato/);
});

test('sem campanha mostra o site de referencia ou acesso direto', async () => {
  assert.match(await textoEnviado({ ...LEAD, origem: { referrer: 'www.google.com', pagina: '/' } }),
    /\*Origem:\* referência www\.google\.com/);
  assert.match(await textoEnviado({ ...LEAD, origem: { pagina: '/' } }), /\*Origem:\* acesso direto/);
});

test('marca o lead qualificado e mostra o perfil', async () => {
  const texto = await textoEnviado({
    ...LEAD, tipo: 'industria', faturamento: '50-200', qualificado: true, motivo: 'fatura a partir de R$ 50 mil/mês',
  });
  assert.match(texto, /qualificado \(fatura a partir de R\$ 50 mil\/mês\)/);
  assert.match(texto, /\*Perfil:\* Indústria · R\$ 50 mil a 200 mil\/mês/);
});

test('lead fora do perfil chega ao Slack com o motivo', async () => {
  const texto = await textoEnviado({
    ...LEAD, tipo: 'lojista', faturamento: 'ate-50', qualificado: false, motivo: 'fatura menos de R$ 50 mil/mês',
  });
  assert.match(texto, /fora do perfil \(fatura menos de R\$ 50 mil\/mês\)/);
  assert.doesNotMatch(texto, /white_check_mark/);
});

test('lead sem origem nao ganha linha de origem', async () => {
  assert.doesNotMatch(await textoEnviado(LEAD), /Origem/);
});

test('escapa a origem para nao injetar mencoes no Slack', async () => {
  const texto = await textoEnviado({ ...LEAD, origem: { utm_campaign: '<!channel>' } });
  assert.doesNotMatch(texto, /<!channel>/);
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
