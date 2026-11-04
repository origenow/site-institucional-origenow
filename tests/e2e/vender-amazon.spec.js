import { test, expect } from '@playwright/test';

// Contra produção (BASE_URL) estes testes disparariam conversões reais.
test.skip(!!process.env.BASE_URL, 'eventos só são medidos contra o servidor local');

test.beforeEach(async ({ page }) => {
  await page.route(/googletagmanager\.com|google-analytics\.com|connect\.facebook\.net|facebook\.com|venda\.amazon/, (rota) => rota.abort());
  await page.goto('/vender-na-amazon');
});

function eventos(page) {
  return page.evaluate(() => (window.dataLayer || []).map((x) => {
    if (x && x[0] === 'event') return { nome: x[1], ...(x[2] || {}) };
    return null;
  }).filter(Boolean));
}

function responderLead(page, corpo, capturar = () => {}) {
  return page.route('**/api/lead', (rota) => {
    capturar(JSON.parse(rota.request().postData()));
    return rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, ...corpo }) });
  });
}

async function preencher(page, { uf = 'MG', faturamento = 'acima-250' } = {}) {
  await page.fill('#amz-nome', 'Maria Souza');
  await page.fill('#amz-email', 'maria@empresa.com.br');
  await page.fill('#amz-whatsapp', '(31) 99999-0000');
  await page.selectOption('#amz-uf', uf);
  await page.selectOption('#amz-faturamento', faturamento);
}

const enviar = (page) => page.locator('#lead-form').getByText('Ver minha oferta').click();

test('o link de cadastro so aparece depois do formulario', async ({ page }) => {
  await expect(page.locator('#amz-abrir-conta')).toHaveCount(0);
});

test('exige WhatsApp, estado e faturamento antes de enviar', async ({ page }) => {
  await page.fill('#amz-nome', 'Maria Souza');
  await page.fill('#amz-email', 'maria@empresa.com.br');
  await enviar(page);
  await expect(page.getByText('Informe seu WhatsApp.')).toBeVisible();
  await page.fill('#amz-whatsapp', '(31) 99999-0000');
  await enviar(page);
  await expect(page.getByText('Selecione o estado da empresa.')).toBeVisible();
  await page.selectOption('#amz-uf', 'MG');
  await enviar(page);
  await expect(page.getByText('Selecione o faturamento mensal.')).toBeVisible();
});

test('acima de R$ 250 mil ve consultoria gratuita, gera conversao e recebe o link', async ({ page }) => {
  let corpo = null;
  await responderLead(page, { qualificado: true, oferta: 'consultoria-gratuita' }, (c) => { corpo = c; });
  await preencher(page, { uf: 'SP' });
  await enviar(page);

  await expect(page.getByText('Sua empresa tem consultoria gratuita')).toBeVisible();
  expect(corpo).toMatchObject({ programa: 'amazon', uf: 'SP', faturamento: 'acima-250', whatsapp: '(31) 99999-0000' });

  const link = page.locator('#amz-abrir-conta');
  await expect(link).toHaveAttribute('href', 'https://venda.amazon.com.br/?ld=elbrsoa_sanovo_sellerdirect_linkna');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener sponsored');

  const ev = await eventos(page);
  expect(ev).toContainEqual(expect.objectContaining({ nome: 'generate_lead', form_id: 'vender_amazon', uf: 'SP', oferta: 'consultoria-gratuita' }));
});

test('ate R$ 50 mil ve desconto e recebe o link, sem gerar conversao', async ({ page }) => {
  await responderLead(page, { qualificado: false, oferta: 'consultoria-desconto' });
  await preencher(page, { faturamento: 'ate-50' });
  await enviar(page);

  await expect(page.getByText('Sua empresa tem consultoria com desconto')).toBeVisible();
  await expect(page.locator('#amz-abrir-conta')).toBeVisible();

  const ev = await eventos(page);
  expect(ev).toContainEqual(expect.objectContaining({ nome: 'lead_unqualified', form_id: 'vender_amazon' }));
  expect(ev.map((e) => e.nome)).not.toContain('generate_lead');
});

test('entre R$ 150 e 250 mil nao promete condicao de consultoria', async ({ page }) => {
  await responderLead(page, { qualificado: true, oferta: 'a-definir' });
  await preencher(page, { faturamento: '150-250' });
  await enviar(page);

  await expect(page.getByText('Sua conta e o cadastro de produtos saem sem custo')).toBeVisible();
  await expect(page.getByText('Sua empresa tem consultoria')).toHaveCount(0);
});

test('clique no link de cadastro registra o evento', async ({ page, context }) => {
  await responderLead(page, { qualificado: false, oferta: 'consultoria-desconto' });
  await preencher(page, { faturamento: 'ate-50' });
  await enviar(page);

  const novaAba = context.waitForEvent('page');
  await page.locator('#amz-abrir-conta').click();
  await (await novaAba).close();

  const ev = await eventos(page);
  expect(ev).toContainEqual(expect.objectContaining({ nome: 'amazon_signup_click', form_id: 'vender_amazon', oferta: 'consultoria-desconto' }));
});

test('o HTML servido traz SEO, FAQ e entra no sitemap, sem executar JS', async ({ request }) => {
  const html = await (await request.get('/vender-na-amazon')).text();
  expect(html).toMatch(/<title>Vender na Amazon: conta e cadastro de produtos grátis · Origenow<\/title>/);
  expect(html).toMatch(/<meta name="robots" content="index,follow">/);
  expect(html).toMatch(/rel="canonical" href="[^"]*\/vender-na-amazon"/);
  expect(html).toContain('"FAQPage"');
  expect(html).toContain('A ajuda para criar a conta é mesmo gratuita?');

  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain('/vender-na-amazon</loc>');
  const llms = await (await request.get('/llms.txt')).text();
  expect(llms).toContain('/vender-na-amazon');
});
