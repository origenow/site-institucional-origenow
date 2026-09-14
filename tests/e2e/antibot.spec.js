import { test, expect } from '@playwright/test';

// Envia de verdade ao servidor: contra produção (BASE_URL) viraria lead real.
test.skip(!!process.env.BASE_URL, 'envio real só contra o servidor local');

test('lead de verdade atravessa o antibot (origem, token e tempo minimo)', async ({ page }) => {
  const respostas = [];
  page.on('response', (r) => {
    if (/\/api\/lead(\/token)?$/.test(r.url())) respostas.push(`${r.request().method()} ${r.status()}`);
  });

  await page.goto('/contato');
  await page.fill('#lead-nome', 'Teste Antibot');
  await page.fill('#lead-email', 'teste@empresa.com.br');
  await page.getByText('Enviar e agendar').click();

  // Slack e SMTP de teste apontam para destinos inválidos (playwright.config.js):
  // chegar ao 502 dos notificadores prova que o antibot deixou passar.
  await expect(page.getByText('Não conseguimos registrar seu contato. Tente novamente.')).toBeVisible({ timeout: 15_000 });
  expect(respostas).toEqual(['GET 200', 'POST 502']);
});
