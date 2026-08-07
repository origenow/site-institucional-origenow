import { test, expect } from '@playwright/test';

const ROTAS = [
  '/', '/servicos', '/servicos/assessoria', '/servicos/consultoria',
  '/servicos/full-service', '/servicos/inteligencia-comercial',
  '/servicos/logistica', '/servicos/representacao',
  '/cases', '/cases/camicado', '/cases/mimo-cricut', '/cases/tiktok-shop',
  '/cases/riffel', '/cases/calpen', '/cases/cafe-dupan', '/cases/amazon-brasil',
  '/grupo', '/sobre', '/insights', '/insights/mix-enxuto-vende-mais', '/contato',
];

for (const rota of ROTAS) {
  test(`${rota} carrega sem erro de console`, async ({ page }) => {
    const erros = [];
    page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));

    const resposta = await page.goto(rota, { waitUntil: 'networkidle' });
    expect(resposta.status()).toBe(200);
    await expect(page).toHaveTitle(/.+/);
    expect(erros).toEqual([]);
  });
}

test('meta tags estao no HTML servido, sem executar JS', async ({ request }) => {
  const html = await (await request.get('/')).text();
  expect(html).toMatch(/<title[^>]*>Origenow/);
  expect(html).toMatch(/property="og:title"/);
  expect(html).toMatch(/name="description"/);
});
