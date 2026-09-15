import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.goto('/contato'); });

async function preencherPerfil(page, { tipo = 'industria', faturamento = '50-200' } = {}) {
  await page.selectOption('#lead-tipo', tipo);
  await page.selectOption('#lead-faturamento', faturamento);
}

test('bloqueia envio com e-mail invalido', async ({ page }) => {
  await page.fill('#lead-nome', 'Maria Souza');
  await page.fill('#lead-email', 'nao-e-email');
  await page.getByText('Enviar e agendar').click();

  await expect(page.getByText('E-mail inválido.')).toBeVisible();
  await expect(page.getByText('Recebido')).toBeHidden();
});

test('bloqueia envio sem nome', async ({ page }) => {
  await page.fill('#lead-email', 'maria@empresa.com.br');
  await page.getByText('Enviar e agendar').click();
  await expect(page.getByText('Informe seu nome.')).toBeVisible();
});

test('bloqueia envio sem tipo de empresa e sem faturamento', async ({ page }) => {
  await page.fill('#lead-nome', 'Maria Souza');
  await page.fill('#lead-email', 'maria@empresa.com.br');
  await page.getByText('Enviar e agendar').click();
  await expect(page.getByText('Selecione o tipo de empresa.')).toBeVisible();

  await page.selectOption('#lead-tipo', 'marca');
  await page.getByText('Enviar e agendar').click();
  await expect(page.getByText('Selecione o faturamento em marketplaces.')).toBeVisible();
});

test('envia lead valido e mostra confirmacao', async ({ page }) => {
  await page.route('**/api/lead', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"qualificado":true}' }));

  await page.fill('#lead-nome', 'Maria Souza');
  await page.fill('#lead-email', 'maria@empresa.com.br');
  await preencherPerfil(page);
  await page.fill('#lead-mensagem', 'Quero escalar no Mercado Livre.');
  await page.getByText('Enviar e agendar').click();

  await expect(page.getByText('Recebido')).toBeVisible();
  await expect(page.getByText('Nossa equipe responde em até 2 dias úteis.')).toBeVisible();
});

test('preserva o digitado quando o servidor falha', async ({ page }) => {
  await page.route('**/api/lead', (rota) =>
    rota.fulfill({ status: 502, contentType: 'application/json', body: '{"erro":"Não conseguimos registrar seu contato. Tente novamente."}' }));

  await page.fill('#lead-nome', 'Maria Souza');
  await page.fill('#lead-email', 'maria@empresa.com.br');
  await preencherPerfil(page);
  await page.getByText('Enviar e agendar').click();

  await expect(page.getByText('Não conseguimos registrar seu contato. Tente novamente.')).toBeVisible();
  await expect(page.locator('#lead-nome')).toHaveValue('Maria Souza');
  await expect(page.locator('#lead-email')).toHaveValue('maria@empresa.com.br');
  await expect(page.locator('#lead-faturamento')).toHaveValue('50-200');
});

test('envia o payload correto', async ({ page }) => {
  let capturado = null;
  await page.route('**/api/lead', (rota) => {
    capturado = JSON.parse(rota.request().postData());
    return rota.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"qualificado":true}' });
  });

  await page.fill('#lead-nome', 'Maria Souza');
  await page.fill('#lead-empresa', 'Empresa X');
  await page.fill('#lead-email', 'maria@empresa.com.br');
  await page.fill('#lead-whatsapp', '(31) 99999-0000');
  await preencherPerfil(page, { tipo: 'distribuidor', faturamento: '200-1000' });
  await page.fill('#lead-canais', 'Mercado Livre, Amazon');
  await page.fill('#lead-mensagem', 'Quero escalar.');
  await page.getByText('Enviar e agendar').click();

  await expect(page.getByText('Recebido')).toBeVisible();
  expect(capturado).toMatchObject({
    nome: 'Maria Souza', empresa: 'Empresa X', email: 'maria@empresa.com.br',
    whatsapp: '(31) 99999-0000', canais: 'Mercado Livre, Amazon', mensagem: 'Quero escalar.',
    tipo: 'distribuidor', faturamento: '200-1000', website: '',
  });
});
