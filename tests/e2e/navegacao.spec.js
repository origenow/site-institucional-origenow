import { test, expect } from '@playwright/test';

const ROTAS = [
  '/',
  '/Origenow%20Servicos.dc.html',
  '/Origenow%20Servico%20Assessoria.dc.html',
  '/Origenow%20Servico%20Consultoria.dc.html',
  '/Origenow%20Servico%20Full%20Service.dc.html',
  '/Origenow%20Servico%20Inteligencia%20Comercial.dc.html',
  '/Origenow%20Servico%20Logistica.dc.html',
  '/Origenow%20Servico%20Representacao.dc.html',
  '/Origenow%20Cases.dc.html',
  '/Origenow%20Case%2001.dc.html',
  '/Origenow%20Case%2002.dc.html',
  '/Origenow%20Case%2003.dc.html',
  '/Origenow%20Case%2004.dc.html',
  '/Origenow%20Case%2005.dc.html',
  '/Origenow%20Case%20Novo.dc.html?c=1',
  '/Origenow%20Case%20Novo.dc.html?c=amazon',
  '/Origenow%20Grupo.dc.html',
  '/Origenow%20Sobre.dc.html',
  '/Origenow%20Insights.dc.html',
  '/Origenow%20Artigo.dc.html',
  '/Origenow%20Contato.dc.html',
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
