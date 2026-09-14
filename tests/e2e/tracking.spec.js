import { test, expect } from '@playwright/test';

// Contra produção (BASE_URL) estes testes disparariam conversões reais.
test.skip(!!process.env.BASE_URL, 'eventos só são medidos contra o servidor local');

// O webServer do Playwright builda com IDs de teste (playwright.config.js).
// Nenhuma chamada ao Google sai do teste, mesmo se o host-gate falhar.
test.beforeEach(async ({ page }) => {
  await page.route(/googletagmanager\.com|google-analytics\.com/, (rota) => rota.abort());
});

/** Eventos do dataLayer, normalizados: gtag('event', nome, params) ou {event} do GTM. */
function eventos(page) {
  return page.evaluate(() => (window.dataLayer || []).map((x) => {
    if (x && x[0] === 'event') return { nome: x[1], ...(x[2] || {}) };
    if (x && x.event && !/^gtm\./.test(x.event)) return { nome: x.event, ...x };
    return null;
  }).filter(Boolean));
}

function responderLead(page, status, capturar = () => {}) {
  return page.route('**/api/lead', (rota) => {
    capturar(JSON.parse(rota.request().postData()));
    const body = status === 200 ? '{"ok":true}' : '{"erro":"Não conseguimos registrar seu contato. Tente novamente."}';
    return rota.fulfill({ status, contentType: 'application/json', body });
  });
}

test('lead do Contato leva a origem da campanha e dispara a conversao', async ({ page }) => {
  let capturado = null;
  await responderLead(page, 200, (corpo) => { capturado = corpo; });

  await page.goto('/servicos?utm_source=google&utm_medium=cpc&utm_campaign=lancamento&gclid=teste123');
  await page.goto('/contato');
  await page.fill('#lead-nome', 'Maria Souza');
  await page.fill('#lead-email', 'maria@empresa.com.br');
  await page.getByText('Enviar e agendar').click();
  await expect(page.getByText('Recebido')).toBeVisible();

  expect(capturado.origem).toMatchObject({
    utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'lancamento', gclid: 'teste123',
    landing: '/servicos', pagina: '/contato',
  });
  const ev = await eventos(page);
  expect(ev).toContainEqual(expect.objectContaining({ nome: 'lead_form_start', form_id: 'contato' }));
  expect(ev).toContainEqual(expect.objectContaining({ nome: 'generate_lead', form_id: 'contato' }));
  expect(ev).toContainEqual(expect.objectContaining({ nome: 'conversion', send_to: 'AW-1234567890/lead-teste' }));
});

test('envio que falha nao conta como lead', async ({ page }) => {
  await responderLead(page, 502);

  await page.goto('/contato');
  await page.fill('#lead-nome', 'Maria Souza');
  await page.fill('#lead-email', 'maria@empresa.com.br');
  await page.getByText('Enviar e agendar').click();
  await expect(page.getByText('Não conseguimos registrar seu contato. Tente novamente.')).toBeVisible();

  const nomes = (await eventos(page)).map((e) => e.nome);
  expect(nomes).not.toContain('generate_lead');
  expect(nomes).not.toContain('conversion');
});

test('modal da home mede abertura, preenchimento e lead', async ({ page }) => {
  let capturado = null;
  await responderLead(page, 200, (corpo) => { capturado = corpo; });

  await page.goto('/');
  await page.getByText('Quero meu diagnóstico').click();
  await page.fill('#modal-nome', 'João Lima');
  await page.fill('#modal-email', 'joao@empresa.com.br');
  await page.getByText('Solicitar diagnóstico').click();
  await expect(page.getByText('Recebido')).toBeVisible();

  expect(capturado.origem).toMatchObject({ landing: '/', pagina: '/' });
  const ev = await eventos(page);
  expect(ev).toContainEqual(expect.objectContaining({ nome: 'lead_modal_open', form_id: 'diagnostico_home' }));
  expect(ev).toContainEqual(expect.objectContaining({ nome: 'lead_form_start', form_id: 'diagnostico_home' }));
  expect(ev).toContainEqual(expect.objectContaining({ nome: 'generate_lead', form_id: 'diagnostico_home' }));
});

test('clique no WhatsApp vira evento de contato e conversao', async ({ page, context }) => {
  await context.route(/wa\.me/, (rota) => rota.abort());

  await page.goto('/contato');
  await page.getByText('Falar com a assistente').click();

  await expect.poll(() => eventos(page))
    .toContainEqual(expect.objectContaining({ nome: 'contact', method: 'whatsapp' }));
  expect(await eventos(page))
    .toContainEqual(expect.objectContaining({ nome: 'conversion', send_to: 'AW-1234567890/whats-teste' }));
});

test('nao carrega o Google fora do dominio oficial', async ({ page }) => {
  const pedidos = [];
  page.on('request', (r) => { if (/googletagmanager\.com/.test(r.url())) pedidos.push(r.url()); });

  await page.goto('/');
  await page.waitForLoadState('load');

  expect(pedidos).toEqual([]);
});

test('om_debug=1 forca o carregamento do gtag com o ID configurado', async ({ page }) => {
  const pedidos = [];
  page.on('request', (r) => { if (/googletagmanager\.com/.test(r.url())) pedidos.push(r.url()); });

  await page.goto('/?om_debug=1');

  await expect.poll(() => pedidos.some((u) => u.includes('gtag/js?id=G-TESTE12345'))).toBe(true);
});

test('page_view, Ads e GTM esperam o primeiro sinal humano', async ({ page }) => {
  const pedidosGtm = [];
  page.on('request', (r) => { if (/gtm\.js/.test(r.url())) pedidosGtm.push(r.url()); });
  const configs = () => page.evaluate(() =>
    (window.dataLayer || []).filter((x) => x && x[0] === 'config').map((x) => x[1]));

  await page.goto('/?om_debug=1');
  await page.waitForLoadState('load');
  expect(await configs()).toEqual([]);
  expect(pedidosGtm).toEqual([]);

  await page.keyboard.press('Shift');

  await expect.poll(configs).toEqual(expect.arrayContaining(['G-TESTE12345', 'AW-1234567890']));
  await expect.poll(() => pedidosGtm.length).toBeGreaterThan(0);
});
