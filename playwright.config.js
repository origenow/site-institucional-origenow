import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: process.env.BASE_URL || 'http://localhost:3000' },
  webServer: process.env.BASE_URL ? undefined : {
    // Builda com IDs de teste para medir os eventos do Google; o script só
    // carrega o Google no domínio oficial, então nada sai do localhost.
    command: 'npm run build && npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    env: {
      GA_MEASUREMENT_ID: 'G-TESTE12345',
      GOOGLE_ADS_ID: 'AW-1234567890',
      GOOGLE_ADS_LEAD_LABEL: 'lead-teste',
      GOOGLE_ADS_CONTACT_LABEL: 'whats-teste',
      SLACK_WEBHOOK_URL: 'https://exemplo.invalido/webhook',
      SMTP_USER: 'teste@origenow.com.br',
      SMTP_PASS: 'teste',
      LEAD_EMAIL_TO: 'teste@origenow.com.br',
      // SMTP numa porta local fechada: falha na hora, sem tocar no Zoho.
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: '9',
      ANTIBOT_MIN_MS: '400',
    },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile',  use: { ...devices['iPhone 13'] } },
  ],
});
