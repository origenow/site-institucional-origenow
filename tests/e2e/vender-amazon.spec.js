import { test, expect } from '@playwright/test';

// Contra produção (BASE_URL) estes testes disparariam conversões reais.
test.skip(!!process.env.BASE_URL, 'eventos só são medidos contra o servidor local');

test.beforeEach(async ({ page }) => {
  await page.route(/googletagmanager\.com|google-analytics\.com|connect\.facebook\.net|facebook\.com|sellercentral\.amazon/, (rota) => rota.abort());
  await page.goto('/vender-na-amazon');
});

function eventos(page) {
  return page.evaluate(() => (window.dataLayer || []).map((x) => {
    if (x && x[0] === 'event') return { nome: x[1], ...(x[2] || {}) };
    return null;
  }).filter(Boolean));
}

function responderLead(page, qualificado, capturar = () => {}) {
  return page.route('**/api/lead', (rota) => {
    capturar(JSON.parse(rota.request().postData()));
    return rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, qualificado }) });
  });
}

async function preencher(page, { uf = 'MG', faturamento = '120-500' } = {}) {
  await page.fill('#amz-nome', 'Maria Souza');
  await page.fill('#amz-email', 'maria@empresa.com.br');
  await page.fill('#amz-whatsapp', '(31) 99999-0000');
  await page.selectOption('#amz-uf', uf);
  await page.selectOption('#amz-faturamento', faturamento);
}

const enviar = (page) => page.locator('#lead-form').getByText('Ver meu caminho').click();

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
  await expect(page.getByText('Selecione o faturamento mensal total.')).toBeVisible();
});

test('quem passa no crivo ve o programa, gera conversao e recebe o link', async ({ page }) => {
  let corpo = null;
  await responderLead(page, true, (c) => { corpo = c; });
  await preencher(page);
  await enviar(page);

  await expect(page.getByText('Sua empresa pode entrar no programa de ingresso gratuito')).toBeVisible();
  expect(corpo).toMatchObject({ programa: 'amazon', uf: 'MG', faturamento: '120-500', whatsapp: '(31) 99999-0000' });

  const link = page.locator('#amz-abrir-conta');
  await expect(link).toHaveAttribute('href', /^https:\/\/sellercentral\.amazon\.com\.br\/ap\/register\?.*sanovo_sellerdirect/);
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener sponsored');

  const ev = await eventos(page);
  expect(ev).toContainEqual(expect.objectContaining({ nome: 'generate_lead', form_id: 'vender_amazon', uf: 'MG', faturamento: '120-500' }));
});

test('quem nao passa recebe o link, sem gerar conversao', async ({ page }) => {
  await responderLead(page, false);
  await preencher(page, { uf: 'SP', faturamento: 'acima-500' });
  await enviar(page);

  await expect(page.getByText('Seu próximo passo é abrir a conta de vendedor')).toBeVisible();
  await expect(page.locator('#amz-abrir-conta')).toBeVisible();

  const ev = await eventos(page);
  expect(ev).toContainEqual(expect.objectContaining({ nome: 'lead_unqualified', form_id: 'vender_amazon' }));
  expect(ev.map((e) => e.nome)).not.toContain('generate_lead');
});

test('clique no link de cadastro registra o evento', async ({ page, context }) => {
  await responderLead(page, false);
  await preencher(page, { uf: 'BA', faturamento: 'ate-50' });
  await enviar(page);

  const novaAba = context.waitForEvent('page');
  await page.locator('#amz-abrir-conta').click();
  await (await novaAba).close();

  const ev = await eventos(page);
  expect(ev).toContainEqual(expect.objectContaining({ nome: 'amazon_signup_click', form_id: 'vender_amazon', qualificado: false }));
});

test('o HTML servido traz SEO, FAQ e entra no sitemap, sem executar JS', async ({ request }) => {
  const html = await (await request.get('/vender-na-amazon')).text();
  expect(html).toMatch(/<title>Vender na Amazon: conta de vendedor com apoio · Origenow<\/title>/);
  expect(html).toMatch(/<meta name="robots" content="index,follow">/);
  expect(html).toMatch(/rel="canonical" href="[^"]*\/vender-na-amazon"/);
  expect(html).toContain('"FAQPage"');
  expect(html).toContain('Preciso pagar para abrir a conta por este link?');

  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain('/vender-na-amazon</loc>');
  const llms = await (await request.get('/llms.txt')).text();
  expect(llms).toContain('/vender-na-amazon');
});
