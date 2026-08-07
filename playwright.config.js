import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: process.env.BASE_URL || 'http://localhost:3000' },
  webServer: process.env.BASE_URL ? undefined : {
    command: 'npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    env: {
      SLACK_WEBHOOK_URL: 'https://exemplo.invalido/webhook',
      SMTP_USER: 'teste@origenow.com.br',
      SMTP_PASS: 'teste',
      LEAD_EMAIL_TO: 'teste@origenow.com.br',
    },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile',  use: { ...devices['iPhone 13'] } },
  ],
});
