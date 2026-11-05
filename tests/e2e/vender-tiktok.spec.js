import { test, expect } from '@playwright/test';

// Contra produção (BASE_URL) estes testes disparariam conversões reais.
test.skip(!!process.env.BASE_URL, 'eventos só são medidos contra o servidor local');

test.beforeEach(async ({ page }) => {
  await page.route(/googletagmanager\.com|google-analytics\.com|connect\.facebook\.net|facebook\.com/, (rota) => rota.abort());
  await page.goto('/vender-no-tiktok-shop');
});

function eventos(page) {
  return page.evaluate(() => (window.dataLayer || []).map((x) => (x && x[0] === 'event' ? { nome: x[1], ...(x[2] || {}) } : null)).filter(Boolean));
}

function responderLead(page, corpo, capturar = () => {}) {
  return page.route('**/api/lead', (rota) => {
    capturar(JSON.parse(rota.request().postData()));
    return rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, ...corpo }) });
  });
}

// O faturamento é escolhido em cartões (rádio): o clique vai no rótulo, como faz o visitante.
const escolherFaturamento = (page, valor) =>
  page.locator(`#lead-form label:has(input[name="faturamento"][value="${valor}"])`).click();

async function preencher(page, faturamento) {
  await page.fill('#tts-nome', 'Maria Souza');
  await page.fill('#tts-empresa', 'Loja da Maria');
  await page.fill('#tts-email', 'maria@empresa.com.br');
  await page.fill('#tts-whatsapp', '(31) 99999-0000');
  await escolherFaturamento(page, faturamento);
}

const enviar = (page) => page.locator('#lead-form').getByText('Ver meu plano').click();

test('exige a empresa antes de enviar', async ({ page }) => {
  await page.fill('#tts-nome', 'Maria Souza');
  await enviar(page);
  await expect(page.getByText('Informe sua empresa.')).toBeVisible();
});

test('exige WhatsApp e faturamento antes de enviar', async ({ page }) => {
  await page.fill('#tts-nome', 'Maria Souza');
  await page.fill('#tts-empresa', 'Loja da Maria');
  await page.fill('#tts-email', 'maria@empresa.com.br');
  await enviar(page);
  await expect(page.getByText('Informe seu WhatsApp.')).toBeVisible();
  await page.fill('#tts-whatsapp', '(31) 99999-0000');
  await enviar(page);
  await expect(page.getByText('Selecione o faturamento mensal.')).toBeVisible();
});

test('a faixa escolhida acende o plano correspondente antes do envio', async ({ page }) => {
  await escolherFaturamento(page, 'acima-1000');
  await expect(page.locator('.plan.is-match')).toContainText('Plano de performance');
  await escolherFaturamento(page, 'ate-50');
  await expect(page.locator('.plan.is-match')).toContainText('Consultoria e assessoria');
});

test('acima de R$ 1 milhao ve o plano de performance e gera conversao', async ({ page }) => {
  let corpo = null;
  await responderLead(page, { qualificado: true, oferta: 'performance' }, (c) => { corpo = c; });
  await preencher(page, 'acima-1000');
  await enviar(page);

  await expect(page.getByText('Sua operação se encaixa no plano de performance')).toBeVisible();
  expect(corpo).toMatchObject({ programa: 'tiktok', faturamento: 'acima-1000' });
  const ev = await eventos(page);
  expect(ev).toContainEqual(expect.objectContaining({ nome: 'generate_lead', form_id: 'vender_tiktok', oferta: 'performance' }));
});

test('abaixo de R$ 50 mil ve os planos pagos, sem gerar conversao', async ({ page }) => {
  await responderLead(page, { qualificado: false, oferta: 'planos' });
  await preencher(page, 'ate-50');
  await enviar(page);

  await expect(page.getByText('Temos planos de consultoria e assessoria para você')).toBeVisible();
  const ev = await eventos(page);
  expect(ev).toContainEqual(expect.objectContaining({ nome: 'lead_unqualified', form_id: 'vender_tiktok' }));
  expect(ev.map((e) => e.nome)).not.toContain('generate_lead');
});

test('o HTML servido traz SEO, FAQ e entra no sitemap, sem executar JS', async ({ request }) => {
  const html = await (await request.get('/vender-no-tiktok-shop')).text();
  expect(html).toMatch(/<title>Vender no TikTok Shop com plano de performance · Origenow<\/title>/);
  expect(html).toMatch(/<meta name="robots" content="index,follow">/);
  expect(html).toContain('"FAQPage"');
  expect(html).toContain('Existe plano gratuito?');
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain('/vender-no-tiktok-shop</loc>');
});

for (const rota of ['/vender-na-amazon', '/vender-no-tiktok-shop']) {
  test(`${rota}: com UTM, o botao rola ao formulario sem recarregar`, async ({ page }) => {
    await page.goto(`${rota}?utm_source=teste&gclid=abc`, { waitUntil: 'networkidle' });
    await page.evaluate(() => { window.__semRecarga = true; });
    await page.getByRole('link', { name: 'Quero começar' }).first().click();
    await expect(page.locator('#lead-form input[name="nome"]')).toBeInViewport({ timeout: 4000 });
    expect(page.url()).toContain('utm_source=teste');
    expect(await page.evaluate(() => window.__semRecarga)).toBe(true);
  });

  test(`${rota}: link direto com #formulario desce ao formulario`, async ({ page }) => {
    await page.goto(`${rota}?utm_source=teste#formulario`, { waitUntil: 'networkidle' });
    await expect(page.locator('#lead-form input[name="nome"]')).toBeInViewport({ timeout: 4000 });
  });
}
