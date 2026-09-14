import { test, expect } from '@playwright/test';

// O Chromium headless esconde a barra de rolagem. No Windows ela ocupa ~15px,
// e o que for dimensionado por 100vw passa a vazar na horizontal — foi assim
// que o scroll lateral chegou à produção sem nenhum teste acusar. Aqui a barra
// fica visível, como no desktop de verdade.
test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });
test.skip(({ isMobile, browserName }) => isMobile || browserName !== 'chromium', 'só no desktop (Chromium)');

const ROTAS = [
  '/', '/servicos', '/servicos/consultoria', '/cases', '/cases/camicado', '/cases/cafe-dupan',
  '/grupo', '/sobre', '/insights', '/insights/mix-enxuto-vende-mais', '/contato', '/politica-de-privacidade',
];

for (const largura of [1024, 1366, 1920]) {
  test(`nenhuma pagina rola na horizontal em ${largura}px com barra de rolagem`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: 900 });
    const vazamentos = [];
    for (const rota of ROTAS) {
      await page.goto(rota);
      await page.waitForSelector('#om-site');
      const estouro = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (estouro > 1) vazamentos.push(`${rota}: ${estouro}px`);
    }
    expect(vazamentos).toEqual([]);
  });
}
