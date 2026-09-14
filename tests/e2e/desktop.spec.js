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
    const estouro = () => page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    for (const rota of ROTAS) {
      await page.goto(rota, { waitUntil: 'networkidle' });
      await page.waitForSelector('header');
      // Parte das regras responsivas chega com o Header (dc-import). Sob carga,
      // medir antes disso pega um vazamento de passagem; o poll espera o layout
      // assentar e continua acusando o que persiste.
      await expect.poll(estouro, { message: `${rota} vaza na horizontal em ${largura}px`, timeout: 5000 })
        .toBeLessThanOrEqual(1);
    }
  });
}
