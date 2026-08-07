import { test, expect } from '@playwright/test';

test.skip(({ isMobile }) => !isMobile, 'só roda no projeto mobile');

const ROTAS = [
  '/',
  '/Origenow%20Servicos.dc.html',
  '/Origenow%20Cases.dc.html',
  '/Origenow%20Grupo.dc.html',
  '/Origenow%20Sobre.dc.html',
  '/Origenow%20Insights.dc.html',
  '/Origenow%20Contato.dc.html',
];

for (const rota of ROTAS) {
  test(`${rota} nao rola na horizontal`, async ({ page }) => {
    await page.goto(rota);
    const estouro = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(estouro, `${rota} vaza ${estouro}px na horizontal`).toBeLessThanOrEqual(1);
  });
}

// Escopo deliberado: controles do header e do formulário. Links inline no corpo
// do texto seguem a altura da linha e não são alvo de toque isolado — incluí-los
// só geraria ruído.
test('controles principais tem ao menos 44px de altura', async ({ page }) => {
  await page.goto('/Origenow%20Contato.dc.html');
  const pequenos = await page.evaluate(() =>
    [...document.querySelectorAll('header a, header [data-om-burger], #lead-form input, #lead-form textarea, #lead-form [onclick], footer a')]
      .filter((el) => el.id !== 'lead-website')
      .map((el) => ({ txt: (el.textContent || el.tagName).trim().slice(0, 30), h: el.getBoundingClientRect().height }))
      .filter((x) => x.h > 0 && x.h < 44));
  expect(pequenos, JSON.stringify(pequenos, null, 2)).toEqual([]);
});

// Escopo no <header>: o texto "Consultoria para Marketplaces" também aparece no
// corpo da home (seção de serviços), então o seletor é restrito ao drawer.
test('o menu mobile abre e navega', async ({ page }) => {
  await page.goto('/');
  await page.locator('header [data-om-burger]').click();
  await expect(page.locator('header').getByRole('link', { name: /Consultoria para Marketplaces/i })).toBeVisible();
});

test('o menu mobile fecha com Escape', async ({ page }) => {
  await page.goto('/');
  await page.locator('header [data-om-burger]').click();
  const item = page.locator('header').getByRole('link', { name: /Consultoria para Marketplaces/i });
  await expect(item).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(item).toBeHidden();
});
