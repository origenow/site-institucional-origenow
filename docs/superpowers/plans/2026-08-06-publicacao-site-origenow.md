# Publicação do site da Origenow — plano de implementação

> **Para executores agênticos:** SUB-SKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para implementar tarefa a tarefa. Os passos usam checkbox (`- [ ]`) para acompanhamento.

**Objetivo:** publicar o novo site em `origenow.com.br` com o formulário captando leads para o Slack e o e-mail, validado por testes automatizados em desktop e mobile.

**Arquitetura:** um serviço Node único na Railway serve páginas pré-renderizadas a partir dos `.dc.html` do Claude Design e expõe `POST /api/lead`, que notifica o Slack e envia e-mail. Nenhuma alteração de DNS é necessária — o domínio já aponta para a Railway.

**Stack:** Node 20, Express 4, Playwright (pré-render e e2e), Nodemailer, `node:test` para testes unitários.

**Spec:** [docs/superpowers/specs/2026-08-06-publicacao-site-origenow-design.md](../specs/2026-08-06-publicacao-site-origenow-design.md)

## Restrições globais

- Node 20 ou superior. A Railway define a porta pela variável `PORT` — o servidor **deve** ler `process.env.PORT`, nunca fixar 3000.
- Nenhum segredo no repositório. `SLACK_WEBHOOK_URL`, `SMTP_USER`, `SMTP_PASS`, `LEAD_EMAIL_TO` vivem apenas como variáveis de ambiente na Railway.
- Os arquivos `.dc.html` na raiz continuam sendo a fonte da verdade do conteúdo. O build só lê; nunca sobrescreve.
- A pasta `dist/` é gerada e **não** vai para o git.
- Texto da tela de sucesso do formulário, exato: `Recebido` / `Nossa equipe responde em até 2 dias úteis.` A frase atual, que promete confirmação por e-mail em até 2 horas, é removida.
- Campos obrigatórios do formulário: Nome e E-mail. Os outros quatro são opcionais.
- Toda página importa `Header`, que é um componente com estado. Não existe página em que o runtime `support.js` possa ser removido.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `package.json` | Dependências e scripts (`build`, `start`, `test`, `test:e2e`) |
| `build/prerender.js` | Renderiza cada `.dc.html` em Chromium headless e grava HTML em `dist/` |
| `build/pages.js` | Lista as páginas e as variantes de query string a gerar |
| `server/index.js` | Sobe o Express na `PORT` |
| `server/app.js` | Monta os middlewares, serve `dist/`, registra a rota de lead |
| `server/lead-route.js` | Valida o payload e orquestra os notificadores |
| `server/notify-slack.js` | `enviarSlack(lead)` — posta no Incoming Webhook |
| `server/notify-email.js` | `enviarEmail(lead)` — envia por SMTP |
| `server/__tests__/*.test.js` | Testes unitários (`node:test`) |
| `tests/e2e/*.spec.js` | Testes Playwright |
| `playwright.config.js` | Projetos desktop (1440px) e mobile (iPhone 13) |
| `Dockerfile` | Imagem para a Railway |

**Modificado:** `Origenow Contato.dc.html` — formulário real e envio (Tarefa 7).

---

## Ordem das tarefas

A Tarefa 1 é um **gate de arquitetura**. Se ela reprovar, pare e reavalie antes de seguir para a 2.

---

### Tarefa 1: Piloto de pré-render (gate de arquitetura)

Valida a única hipótese que pode derrubar o plano: se o `support.js` destrói o DOM pré-renderizado ao inicializar, causando flash de tela em branco.

**Arquivos:**
- Criar: `package.json`
- Criar: `build/prerender.js`
- Criar: `.gitignore` (modificar o existente)

**Interfaces:**
- Produz: `prerenderPage(browser, arquivoEntrada, saida, query) → Promise<{html, bytes}>` — usada pela Tarefa 2.

- [ ] **Passo 1: Iniciar o projeto Node**

```bash
npm init -y
npm pkg set name="origenow-site" version="1.0.0" type="module" engines.node=">=20"
npm install --save-dev playwright
npx playwright install chromium
```

- [ ] **Passo 2: Ignorar artefatos de build**

Acrescentar ao `.gitignore` existente:

```
# Build
dist/
node_modules/
.env
test-results/
playwright-report/
```

- [ ] **Passo 3: Escrever o pré-renderizador**

Criar `build/prerender.js`:

```js
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const RAIZ = resolve(import.meta.dirname, '..');

/** Renderiza uma página .dc.html e devolve o HTML final. */
export async function prerenderPage(browser, arquivoEntrada, saida, query = '') {
  const pagina = await browser.newPage();
  const url = pathToFileURL(resolve(RAIZ, arquivoEntrada)).href + query;

  await pagina.goto(url, { waitUntil: 'networkidle' });
  // O runtime remove o <x-dc> fonte e injeta o <title> ao concluir.
  await pagina.waitForFunction(() => document.title.length > 0, { timeout: 15000 });

  const html = await pagina.content();
  await mkdir(dirname(resolve(RAIZ, saida)), { recursive: true });
  await writeFile(resolve(RAIZ, saida), html, 'utf8');
  await pagina.close();

  return { html, bytes: Buffer.byteLength(html, 'utf8') };
}

/** Mede se o HTML pré-renderizado sofre flash ao ser reaberto pelo runtime. */
export async function medirFlash(browser, arquivoGerado) {
  const pagina = await browser.newPage();
  const url = pathToFileURL(resolve(RAIZ, arquivoGerado)).href;

  await pagina.goto(url, { waitUntil: 'commit' });
  const amostras = [];
  const inicio = Date.now();
  while (Date.now() - inicio < 4000) {
    amostras.push(await pagina.evaluate(() => {
      const site = document.getElementById('om-site');
      return site ? site.getBoundingClientRect().height : 0;
    }));
    await pagina.waitForTimeout(50);
  }
  await pagina.close();

  const primeiraAltura = amostras.find((h) => h > 0) ?? 0;
  const zerouDepois = amostras.some((h, i) => h === 0 && amostras.slice(0, i).some((a) => a > 0));
  return { primeiraAltura, zerouDepois, amostras };
}
```

- [ ] **Passo 4: Rodar o piloto na página de contato**

Criar `build/piloto.js`:

```js
import { chromium } from 'playwright';
import { prerenderPage, medirFlash } from './prerender.js';

const browser = await chromium.launch();

const { bytes } = await prerenderPage(browser, 'Origenow Contato.dc.html', 'dist/_piloto.html');
console.log(`HTML gerado: ${bytes} bytes`);

const { primeiraAltura, zerouDepois } = await medirFlash(browser, 'dist/_piloto.html');
console.log(`Altura no primeiro frame: ${primeiraAltura}px`);
console.log(`DOM zerou depois de renderizado: ${zerouDepois}`);

await browser.close();

if (primeiraAltura === 0) { console.error('REPROVADO: nada visível antes do runtime.'); process.exit(1); }
if (zerouDepois)         { console.error('REPROVADO: hidratação destrutiva.'); process.exit(1); }
console.log('APROVADO');
```

Rodar: `node build/piloto.js`

- [ ] **Passo 5: Avaliar o resultado**

**APROVADO** — o HTML pré-renderizado aparece antes do runtime e não é destruído. Siga para a Tarefa 2.

**REPROVADO com `primeiraAltura === 0`** — o CSS `x-dc{display:none}` do runtime está escondendo o conteúdo gerado. Tente injetar `<style>x-dc{display:none}[data-om-root]{display:block}</style>` no HTML gerado e repita. Se persistir, pare e reporte.

**REPROVADO com `zerouDepois === true`** — hidratação destrutiva confirmada. **Não capar o runtime**: o Header é stateful e usado em todas as páginas (ver Restrições globais). As alternativas, em ordem de preferência: (a) servir HTML pré-renderizado só a user-agents de crawler, mantendo o runtime para visitantes; (b) manter o DOM antigo visível via CSS até o runtime concluir e então trocar. Pare e apresente a escolha antes de implementar.

- [ ] **Passo 6: Commit**

```bash
git add package.json package-lock.json .gitignore build/
git commit -m "build: piloto de pre-render com medicao de hidratacao"
```

---

### Tarefa 2: Build completo das páginas

**Arquivos:**
- Criar: `build/pages.js`
- Modificar: `build/prerender.js` (acrescentar o executor `buildAll`)
- Remover ao final: `build/piloto.js`

**Interfaces:**
- Consome: `prerenderPage()` da Tarefa 1
- Produz: `dist/` com um `.html` por página; a home em `dist/index.html`

- [ ] **Passo 1: Listar as páginas**

Criar `build/pages.js`. As variantes do Case Novo viram arquivos físicos, conforme `README.md:11`:

```js
export const PAGINAS = [
  { entrada: 'Origenow Site.dc.html',                          saida: 'dist/index.html' },
  { entrada: 'Origenow Servicos.dc.html',                      saida: 'dist/servicos.html' },
  { entrada: 'Origenow Servico Assessoria.dc.html',            saida: 'dist/servicos/assessoria.html' },
  { entrada: 'Origenow Servico Consultoria.dc.html',           saida: 'dist/servicos/consultoria.html' },
  { entrada: 'Origenow Servico Full Service.dc.html',          saida: 'dist/servicos/full-service.html' },
  { entrada: 'Origenow Servico Inteligencia Comercial.dc.html', saida: 'dist/servicos/inteligencia-comercial.html' },
  { entrada: 'Origenow Servico Logistica.dc.html',             saida: 'dist/servicos/logistica.html' },
  { entrada: 'Origenow Servico Representacao.dc.html',         saida: 'dist/servicos/representacao.html' },
  { entrada: 'Origenow Cases.dc.html',                         saida: 'dist/cases.html' },
  { entrada: 'Origenow Case 01.dc.html',                       saida: 'dist/cases/01.html' },
  { entrada: 'Origenow Case 02.dc.html',                       saida: 'dist/cases/02.html' },
  { entrada: 'Origenow Case 03.dc.html',                       saida: 'dist/cases/03.html' },
  { entrada: 'Origenow Case 04.dc.html',                       saida: 'dist/cases/04.html' },
  { entrada: 'Origenow Case 05.dc.html',                       saida: 'dist/cases/05.html' },
  { entrada: 'Origenow Grupo.dc.html',                         saida: 'dist/grupo.html' },
  { entrada: 'Origenow Sobre.dc.html',                         saida: 'dist/sobre.html' },
  { entrada: 'Origenow Insights.dc.html',                      saida: 'dist/insights.html' },
  { entrada: 'Origenow Artigo.dc.html',                        saida: 'dist/artigo.html' },
  { entrada: 'Origenow Contato.dc.html',                       saida: 'dist/contato.html' },
];

// Cases 06–16: um arquivo por variante de query string.
export const VARIANTES_CASE = [
  ...Array.from({ length: 11 }, (_, i) => ({
    entrada: 'Origenow Case Novo.dc.html',
    saida: `dist/cases/novo-${i + 1}.html`,
    query: `?c=${i + 1}`,
  })),
  { entrada: 'Origenow Case Novo.dc.html', saida: 'dist/cases/amazon.html', query: '?c=amazon' },
];

export const TODAS = [...PAGINAS, ...VARIANTES_CASE];
```

- [ ] **Passo 2: Escrever o executor do build**

Acrescentar ao final de `build/prerender.js`:

```js
import { cp } from 'node:fs/promises';
import { TODAS } from './pages.js';

export async function buildAll() {
  const browser = await chromium.launch();
  const falhas = [];

  for (const { entrada, saida, query } of TODAS) {
    try {
      const { bytes } = await prerenderPage(browser, entrada, saida, query ?? '');
      console.log(`ok  ${saida}  (${bytes} bytes)`);
    } catch (erro) {
      falhas.push({ saida, erro: erro.message });
      console.error(`FALHA  ${saida}: ${erro.message}`);
    }
  }

  // Ativos referenciados pelo HTML gerado.
  for (const pasta of ['assets', '_ds']) {
    await cp(resolve(RAIZ, pasta), resolve(RAIZ, 'dist', pasta), { recursive: true });
  }
  for (const arquivo of ['support.js', 'image-slot.js', 'om-motion.js']) {
    await cp(resolve(RAIZ, arquivo), resolve(RAIZ, 'dist', arquivo));
  }

  await browser.close();
  if (falhas.length) { console.error(`${falhas.length} página(s) falharam.`); process.exit(1); }
  console.log(`${TODAS.length} páginas geradas.`);
}

if (import.meta.filename === process.argv[1]) await buildAll();
```

- [ ] **Passo 3: Registrar o script**

```bash
npm pkg set scripts.build="node build/prerender.js"
```

- [ ] **Passo 4: Rodar e conferir**

Rodar: `npm run build`
Esperado: 31 linhas `ok`, saída final `31 páginas geradas.`, código de saída 0.

Conferir que o `<head>` gerado tem título real:

```bash
grep -o '<title>[^<]*</title>' dist/index.html
```
Esperado: `<title>Origenow · Consultoria data-driven para marketplaces</title>`

- [ ] **Passo 5: Remover o piloto e commitar**

```bash
rm build/piloto.js
git add build/ package.json
git commit -m "build: pre-renderiza as 31 paginas para dist/"
```

---

### Tarefa 3: Servidor Express

**Arquivos:**
- Criar: `server/app.js`, `server/index.js`
- Criar: `server/__tests__/app.test.js`

**Interfaces:**
- Produz: `criarApp() → Express` — usada pelas Tarefas 6 e 9

- [ ] **Passo 1: Instalar dependências**

```bash
npm install express
npm pkg set scripts.start="node server/index.js"
npm pkg set scripts.test="node --test server/__tests__/"
```

- [ ] **Passo 2: Escrever o teste que falha**

Criar `server/__tests__/app.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarApp } from '../app.js';

test('serve a home em /', async () => {
  const servidor = criarApp().listen(0);
  const { port } = servidor.address();
  const resposta = await fetch(`http://127.0.0.1:${port}/`);
  const corpo = await resposta.text();
  servidor.close();

  assert.equal(resposta.status, 200);
  assert.match(corpo, /<title>Origenow/);
});

test('responde 404 em rota inexistente', async () => {
  const servidor = criarApp().listen(0);
  const { port } = servidor.address();
  const resposta = await fetch(`http://127.0.0.1:${port}/nao-existe`);
  servidor.close();

  assert.equal(resposta.status, 404);
});
```

- [ ] **Passo 3: Rodar para ver falhar**

Rodar: `npm test`
Esperado: FALHA com `Cannot find module '../app.js'`

- [ ] **Passo 4: Implementar**

Criar `server/app.js`:

```js
import express from 'express';
import { resolve } from 'node:path';

const DIST = resolve(import.meta.dirname, '..', 'dist');

export function criarApp() {
  const app = express();
  app.use(express.json({ limit: '32kb' }));
  app.use(express.static(DIST, { extensions: ['html'] }));
  return app;
}
```

Criar `server/index.js`:

```js
import { criarApp } from './app.js';

const porta = process.env.PORT || 3000;
criarApp().listen(porta, () => console.log(`Origenow no ar na porta ${porta}`));
```

- [ ] **Passo 5: Rodar para ver passar**

Rodar: `npm test`
Esperado: 2 testes passando.

- [ ] **Passo 6: Commit**

```bash
git add server/ package.json
git commit -m "feat: servidor express servindo as paginas pre-renderizadas"
```

---

### Tarefa 4: Notificador do Slack

**Arquivos:**
- Criar: `server/notify-slack.js`, `server/__tests__/notify-slack.test.js`

**Interfaces:**
- Produz: `enviarSlack(lead) → Promise<void>` — lança em falha. `lead` tem `{nome, email, empresa, whatsapp, canais, mensagem}`.

- [ ] **Passo 1: Escrever o teste que falha**

Criar `server/__tests__/notify-slack.test.js`:

```js
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { enviarSlack } from '../notify-slack.js';

const LEAD = {
  nome: 'Maria Souza', email: 'maria@empresa.com.br', empresa: 'Empresa X',
  whatsapp: '(31) 99999-0000', canais: 'Mercado Livre', mensagem: 'Quero escalar.',
};

test('posta o lead no webhook', async () => {
  process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/TESTE';
  const chamadas = [];
  mock.method(globalThis, 'fetch', async (url, opcoes) => {
    chamadas.push({ url, corpo: JSON.parse(opcoes.body) });
    return new Response('ok', { status: 200 });
  });

  await enviarSlack(LEAD);
  mock.restoreAll();

  assert.equal(chamadas.length, 1);
  assert.equal(chamadas[0].url, 'https://hooks.slack.com/services/TESTE');
  assert.match(chamadas[0].corpo.text, /Maria Souza/);
  assert.match(chamadas[0].corpo.text, /maria@empresa\.com\.br/);
});

test('lanca quando o webhook recusa', async () => {
  process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/TESTE';
  mock.method(globalThis, 'fetch', async () => new Response('invalid_token', { status: 403 }));

  await assert.rejects(() => enviarSlack(LEAD), /Slack respondeu 403/);
  mock.restoreAll();
});

test('lanca quando a variavel nao esta configurada', async () => {
  delete process.env.SLACK_WEBHOOK_URL;
  await assert.rejects(() => enviarSlack(LEAD), /SLACK_WEBHOOK_URL/);
});
```

- [ ] **Passo 2: Rodar para ver falhar**

Rodar: `node --test server/__tests__/notify-slack.test.js`
Esperado: FALHA com `Cannot find module '../notify-slack.js'`

- [ ] **Passo 3: Implementar**

Criar `server/notify-slack.js`:

```js
export async function enviarSlack(lead) {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) throw new Error('SLACK_WEBHOOK_URL não configurada');

  const linhas = [
    '*Novo lead pelo site*',
    `*Nome:* ${lead.nome}`,
    `*E-mail:* ${lead.email}`,
    lead.empresa  ? `*Empresa:* ${lead.empresa}`   : null,
    lead.whatsapp ? `*WhatsApp:* ${lead.whatsapp}` : null,
    lead.canais   ? `*Canais:* ${lead.canais}`     : null,
    lead.mensagem ? `*Precisa de:* ${lead.mensagem}` : null,
  ].filter(Boolean);

  const resposta = await fetch(webhook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: linhas.join('\n') }),
  });

  if (!resposta.ok) throw new Error(`Slack respondeu ${resposta.status}`);
}
```

- [ ] **Passo 4: Rodar para ver passar**

Rodar: `node --test server/__tests__/notify-slack.test.js`
Esperado: 3 testes passando.

- [ ] **Passo 5: Commit**

```bash
git add server/notify-slack.js server/__tests__/notify-slack.test.js
git commit -m "feat: notificacao de lead no slack"
```

---

### Tarefa 5: Notificador de e-mail

**Arquivos:**
- Criar: `server/notify-email.js`, `server/__tests__/notify-email.test.js`

**Interfaces:**
- Produz: `enviarEmail(lead) → Promise<void>` e `criarTransporte()` (exportada só para os testes)

- [ ] **Passo 1: Instalar o Nodemailer**

```bash
npm install nodemailer
```

- [ ] **Passo 2: Escrever o teste que falha**

Criar `server/__tests__/notify-email.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { montarMensagem } from '../notify-email.js';

const LEAD = {
  nome: 'Maria Souza', email: 'maria@empresa.com.br', empresa: 'Empresa X',
  whatsapp: '(31) 99999-0000', canais: 'Mercado Livre', mensagem: 'Quero escalar.',
};

test('monta a mensagem com assunto e corpo do lead', () => {
  process.env.LEAD_EMAIL_TO = 'contato@origenow.com.br';
  process.env.SMTP_USER = 'contato@origenow.com.br';

  const msg = montarMensagem(LEAD);

  assert.equal(msg.to, 'contato@origenow.com.br');
  assert.equal(msg.replyTo, 'maria@empresa.com.br');
  assert.match(msg.subject, /Maria Souza/);
  assert.match(msg.text, /Mercado Livre/);
  assert.match(msg.text, /Quero escalar\./);
});

test('omite campos opcionais vazios', () => {
  process.env.LEAD_EMAIL_TO = 'contato@origenow.com.br';
  process.env.SMTP_USER = 'contato@origenow.com.br';

  const msg = montarMensagem({ nome: 'João', email: 'joao@x.com' });

  assert.doesNotMatch(msg.text, /WhatsApp/);
  assert.doesNotMatch(msg.text, /Canais/);
});
```

- [ ] **Passo 3: Rodar para ver falhar**

Rodar: `node --test server/__tests__/notify-email.test.js`
Esperado: FALHA com `Cannot find module '../notify-email.js'`

- [ ] **Passo 4: Implementar**

Criar `server/notify-email.js`:

```js
import nodemailer from 'nodemailer';

export function montarMensagem(lead) {
  const linhas = [
    `Nome: ${lead.nome}`,
    `E-mail: ${lead.email}`,
    lead.empresa  ? `Empresa: ${lead.empresa}`   : null,
    lead.whatsapp ? `WhatsApp: ${lead.whatsapp}` : null,
    lead.canais   ? `Canais: ${lead.canais}`     : null,
    lead.mensagem ? `Precisa de: ${lead.mensagem}` : null,
  ].filter(Boolean);

  return {
    from: process.env.SMTP_USER,
    to: process.env.LEAD_EMAIL_TO,
    replyTo: lead.email,
    subject: `Novo lead pelo site — ${lead.nome}`,
    text: linhas.join('\n'),
  };
}

export function criarTransporte() {
  for (const chave of ['SMTP_USER', 'SMTP_PASS', 'LEAD_EMAIL_TO']) {
    if (!process.env[chave]) throw new Error(`${chave} não configurada`);
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.zoho.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

export async function enviarEmail(lead) {
  await criarTransporte().sendMail(montarMensagem(lead));
}
```

- [ ] **Passo 5: Rodar para ver passar**

Rodar: `node --test server/__tests__/notify-email.test.js`
Esperado: 2 testes passando.

- [ ] **Passo 6: Commit**

```bash
git add server/notify-email.js server/__tests__/notify-email.test.js package.json
git commit -m "feat: notificacao de lead por e-mail"
```

---

### Tarefa 6: Rota `POST /api/lead`

**Arquivos:**
- Criar: `server/lead-route.js`, `server/__tests__/lead-route.test.js`
- Modificar: `server/app.js`

**Interfaces:**
- Consome: `enviarSlack()` (Tarefa 4), `enviarEmail()` (Tarefa 5)
- Produz: `criarRotaLead({ enviarSlack, enviarEmail }) → RequestHandler`

Injeção de dependência para permitir teste sem rede.

- [ ] **Passo 1: Escrever o teste que falha**

Criar `server/__tests__/lead-route.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { criarRotaLead } from '../lead-route.js';

function subir(notificadores) {
  const app = express();
  app.use(express.json());
  app.post('/api/lead', criarRotaLead(notificadores));
  return app.listen(0);
}

async function postar(servidor, corpo) {
  const { port } = servidor.address();
  return fetch(`http://127.0.0.1:${port}/api/lead`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(corpo),
  });
}

const VALIDO = { nome: 'Maria', email: 'maria@empresa.com.br' };

test('aceita lead valido e chama os dois notificadores', async () => {
  const chamados = [];
  const servidor = subir({
    enviarSlack: async () => chamados.push('slack'),
    enviarEmail: async () => chamados.push('email'),
  });

  const resposta = await postar(servidor, VALIDO);
  servidor.close();

  assert.equal(resposta.status, 200);
  assert.deepEqual(chamados.sort(), ['email', 'slack']);
});

test('recusa quando falta o nome', async () => {
  const servidor = subir({ enviarSlack: async () => {}, enviarEmail: async () => {} });
  const resposta = await postar(servidor, { email: 'maria@empresa.com.br' });
  const corpo = await resposta.json();
  servidor.close();

  assert.equal(resposta.status, 400);
  assert.match(corpo.erro, /nome/i);
});

test('recusa e-mail malformado', async () => {
  const servidor = subir({ enviarSlack: async () => {}, enviarEmail: async () => {} });
  const resposta = await postar(servidor, { nome: 'Maria', email: 'nao-e-email' });
  servidor.close();

  assert.equal(resposta.status, 400);
});

test('responde 200 se ao menos um notificador funcionar', async () => {
  const servidor = subir({
    enviarSlack: async () => { throw new Error('slack fora do ar'); },
    enviarEmail: async () => {},
  });

  const resposta = await postar(servidor, VALIDO);
  servidor.close();

  assert.equal(resposta.status, 200);
});

test('responde 502 se os dois notificadores falharem', async () => {
  const servidor = subir({
    enviarSlack: async () => { throw new Error('fora'); },
    enviarEmail: async () => { throw new Error('fora'); },
  });

  const resposta = await postar(servidor, VALIDO);
  servidor.close();

  assert.equal(resposta.status, 502);
});

test('descarta silenciosamente quando o honeypot vem preenchido', async () => {
  const chamados = [];
  const servidor = subir({
    enviarSlack: async () => chamados.push('slack'),
    enviarEmail: async () => chamados.push('email'),
  });

  const resposta = await postar(servidor, { ...VALIDO, website: 'http://spam.com' });
  servidor.close();

  assert.equal(resposta.status, 200);
  assert.deepEqual(chamados, []);
});
```

- [ ] **Passo 2: Rodar para ver falhar**

Rodar: `node --test server/__tests__/lead-route.test.js`
Esperado: FALHA com `Cannot find module '../lead-route.js'`

- [ ] **Passo 3: Implementar**

Criar `server/lead-route.js`:

```js
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function limpar(valor, max = 2000) {
  return typeof valor === 'string' ? valor.trim().slice(0, max) : '';
}

export function validar(corpo) {
  const lead = {
    nome:     limpar(corpo.nome, 120),
    email:    limpar(corpo.email, 200),
    empresa:  limpar(corpo.empresa, 160),
    whatsapp: limpar(corpo.whatsapp, 40),
    canais:   limpar(corpo.canais, 300),
    mensagem: limpar(corpo.mensagem, 2000),
  };

  if (!lead.nome) return { erro: 'Informe seu nome.' };
  if (!lead.email) return { erro: 'Informe seu e-mail.' };
  if (!EMAIL_RE.test(lead.email)) return { erro: 'E-mail inválido.' };
  return { lead };
}

export function criarRotaLead({ enviarSlack, enviarEmail }) {
  return async (req, res) => {
    // Honeypot: bots preenchem campos ocultos. Responder 200 para não ensiná-los.
    if (limpar(req.body?.website)) return res.status(200).json({ ok: true });

    const { lead, erro } = validar(req.body ?? {});
    if (erro) return res.status(400).json({ erro });

    const resultados = await Promise.allSettled([enviarSlack(lead), enviarEmail(lead)]);
    const entregues = resultados.filter((r) => r.status === 'fulfilled').length;

    for (const r of resultados) {
      if (r.status === 'rejected') console.error('Falha ao notificar lead:', r.reason?.message);
    }

    if (entregues === 0) {
      console.error('LEAD PERDIDO:', JSON.stringify(lead));
      return res.status(502).json({ erro: 'Não conseguimos registrar seu contato. Tente novamente.' });
    }
    return res.status(200).json({ ok: true });
  };
}
```

- [ ] **Passo 4: Registrar a rota no app**

Em `server/app.js`, acrescentar os imports e a rota **antes** do `express.static`:

```js
import { criarRotaLead } from './lead-route.js';
import { enviarSlack } from './notify-slack.js';
import { enviarEmail } from './notify-email.js';
```

E dentro de `criarApp()`, logo após o `express.json`:

```js
  app.post('/api/lead', criarRotaLead({ enviarSlack, enviarEmail }));
```

- [ ] **Passo 5: Rodar tudo para ver passar**

Rodar: `npm test`
Esperado: 13 testes passando (2 app + 3 slack + 2 email + 6 lead-route).

- [ ] **Passo 6: Commit**

```bash
git add server/
git commit -m "feat: rota POST /api/lead com validacao e honeypot"
```

---

### Tarefa 7: Formulário real na página de contato

**Arquivos:**
- Modificar: `Origenow Contato.dc.html` (campos nas linhas 127-134; lógica nas linhas 224-234)

**Interfaces:**
- Consome: `POST /api/lead` (Tarefa 6)

- [ ] **Passo 1: Dar `id` e `name` a cada campo**

Nas linhas 127-132, acrescentar `id` e `name` a cada `<input>` e ao `<textarea>`, preservando todo o `style` existente:

| Campo | `id` / `name` |
|---|---|
| Nome | `lead-nome` / `nome` |
| Empresa | `lead-empresa` / `empresa` |
| E-mail | `lead-email` / `email` |
| WhatsApp | `lead-whatsapp` / `whatsapp` |
| Canais em que já vende | `lead-canais` / `canais` |
| O que você precisa | `lead-mensagem` / `mensagem` |

Exemplo para o campo Nome — o restante dos atributos permanece igual:

```html
<input type="text" id="lead-nome" name="nome" required placeholder="Como te chamamos?" style="...">
```

- [ ] **Passo 2: Envolver os campos num `<form>` e adicionar o honeypot**

Envolver o `<div data-om-grid="pair" ...>` da linha 126 **e** o `<div data-om-flex="row" ...>` do botão na linha 134 num único `<form>`. Isso dá semântica de formulário, ativa o teclado com "Ir" no mobile e permite envio pelo Enter:

```html
<form id="lead-form" novalidate style="display:contents">
```

O `display:contents` preserva o layout existente — o `<form>` não cria caixa própria. Fechar com `</form>` logo antes do `</sc-if>` da linha 135.

Dentro do `<div data-om-grid="pair">`, logo no início, o honeypot:

```html
<input type="text" id="lead-website" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0">
```

- [ ] **Passo 3: Corrigir o texto da tela de sucesso**

Na linha 122, substituir o texto que promete e-mail em 2 horas:

```html
<span style="display:block;max-width:26.25rem;font:400 0.9375rem/1.65 Manrope,sans-serif;color:#56506a">Nossa equipe responde em até 2 dias úteis.</span>
```

- [ ] **Passo 4: Adicionar o bloco de erro**

Antes do `</sc-if>` da linha 135, dentro do bloco `notSent`:

```html
<sc-if value="{{ erro }}">
<div style="margin-top:1rem;border:1px solid #e0574f;background:#fdf2f1;padding:1rem 1.125rem;font:400 0.9375rem/1.5 Manrope,sans-serif;color:#a3322b">{{ erro }}</div>
</sc-if>
```

- [ ] **Passo 5: Trocar o rótulo do botão pelo estado de envio**

Na linha 134, substituir o texto fixo do botão por binding:

```html
<span onClick="{{ submitContato }}" style-hover="background:#5527a4;transform:translateY(-1px)" style="transition:background .18s ease,transform .18s cubic-bezier(.2,.7,.2,1);background:#6730be;color:#ffffff;font:600 0.9375rem/1 Manrope,sans-serif;padding:1.125rem 2rem;cursor:pointer">{{ rotuloBotao }}</span>
```

- [ ] **Passo 6: Reescrever a lógica do componente**

Em `Origenow Contato.dc.html`, substituir o `state`, o `componentDidMount()` e o `renderVals()` (linhas 226-236), e acrescentar os métodos novos. O `reveal()` permanece intocado; o `componentWillUnmount()` ganha uma linha de limpeza (ver Passo 7):

```js
  state = { sent: false, enviando: false, erro: '' };

  componentDidMount() {
    this.reveal();
    // O botão é um <span onClick>, então o submit nativo (tecla Enter) precisa
    // ser interceptado à parte, senão a página recarrega e o lead se perde.
    this._form = document.getElementById('lead-form');
    if (this._form) {
      this._onSubmit = (e) => { e.preventDefault(); this.enviar(); };
      this._form.addEventListener('submit', this._onSubmit);
    }
  }

  renderVals() {
    return {
      sent: this.state.sent,
      notSent: !this.state.sent,
      erro: this.state.erro,
      rotuloBotao: this.state.enviando ? 'Enviando…' : 'Enviar e agendar',
      submitContato: () => this.enviar(),
    };
  }

  lerCampos() {
    const ler = (id) => (document.getElementById(id)?.value ?? '').trim();
    return {
      nome: ler('lead-nome'), empresa: ler('lead-empresa'), email: ler('lead-email'),
      whatsapp: ler('lead-whatsapp'), canais: ler('lead-canais'),
      mensagem: ler('lead-mensagem'), website: ler('lead-website'),
    };
  }

  async enviar() {
    if (this.state.enviando) return;

    const lead = this.lerCampos();
    if (!lead.nome)  return this.setState({ erro: 'Informe seu nome.' });
    if (!lead.email) return this.setState({ erro: 'Informe seu e-mail.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
      return this.setState({ erro: 'E-mail inválido.' });
    }

    this.setState({ enviando: true, erro: '' });
    try {
      const resposta = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(lead),
      });
      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => ({}));
        throw new Error(corpo.erro || 'Não conseguimos enviar. Tente novamente.');
      }
      // Só troca de tela em caso de sucesso — os campos ficam preenchidos se falhar.
      this.setState({ sent: true, enviando: false });
    } catch (e) {
      this.setState({ enviando: false, erro: e.message });
    }
  }
```

- [ ] **Passo 7: Limpar o listener no unmount**

No `componentWillUnmount()` existente, acrescentar como primeira linha:

```js
    if (this._form && this._onSubmit) this._form.removeEventListener('submit', this._onSubmit);
```

- [ ] **Passo 8: Rebuildar e testar à mão**

```bash
npm run build
SLACK_WEBHOOK_URL=https://exemplo.invalido LEAD_EMAIL_TO=x@y.z SMTP_USER=x@y.z SMTP_PASS=x npm start
```

Abrir `http://localhost:3000/contato`, enviar com e-mail inválido e conferir a mensagem de erro. Enviar válido e conferir que o servidor responde 502 com os dois notificadores quebrados — e que **os campos continuam preenchidos**. Testar também o envio pela tecla Enter dentro de um campo: não pode recarregar a página.

- [ ] **Passo 9: Commit**

```bash
git add "Origenow Contato.dc.html"
git commit -m "feat: formulario de contato envia lead de verdade"
```

---

### Tarefa 8: Deploy na Railway

**Pré-requisito:** o `503` diagnosticado e a conta com crédito. Se for falta de crédito, **pare** — nada sobe até regularizar.

**Arquivos:**
- Criar: `Dockerfile`, `.dockerignore`

- [ ] **Passo 1: Escrever o Dockerfile**

O Playwright só é necessário no build, então ele roda em estágio separado e a imagem final fica enxuta:

```dockerfile
FROM mcr.microsoft.com/playwright:v1.48.0-jammy AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server/ ./server/
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "server/index.js"]
```

Criar `.dockerignore`:

```
node_modules
dist
.git
test-results
playwright-report
docs
scraps
uploads
```

- [ ] **Passo 2: Conferir a versão do Playwright**

A tag da imagem base precisa bater com a versão instalada, ou o build falha:

```bash
npm ls playwright
```
Ajustar `v1.48.0-jammy` no Dockerfile para a versão retornada.

- [ ] **Passo 3: Testar a imagem localmente**

```bash
docker build -t origenow-site .
docker run --rm -p 3000:3000 -e PORT=3000 origenow-site
```
Esperado: `Origenow no ar na porta 3000`, e `http://localhost:3000/` servindo a home.

- [ ] **Passo 4: Configurar as variáveis na Railway**

No painel do serviço, aba Variables:

| Variável | Valor |
|---|---|
| `SLACK_WEBHOOK_URL` | URL do Incoming Webhook do `#comercial` |
| `SMTP_USER` | `contato@origenow.com.br` |
| `SMTP_PASS` | senha de aplicativo do Zoho |
| `LEAD_EMAIL_TO` | `contato@origenow.com.br` |

Não definir `PORT` — a Railway injeta sozinha.

- [ ] **Passo 5: Publicar em URL de teste**

Conectar o serviço ao repositório `origenow/origenow_landing_page_final`, branch `main`. Aguardar o deploy e validar pela URL `*.up.railway.app` do serviço, **sem** tocar no domínio.

- [ ] **Passo 6: Commit**

```bash
git add Dockerfile .dockerignore
git commit -m "build: imagem docker para deploy na railway"
```

---

### Tarefa 9: Testes e2e em desktop e mobile

**Arquivos:**
- Criar: `playwright.config.js`, `tests/e2e/navegacao.spec.js`, `tests/e2e/formulario.spec.js`, `tests/e2e/mobile.spec.js`

- [ ] **Passo 1: Configurar o Playwright**

Criar `playwright.config.js`:

```js
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
```

```bash
npm install --save-dev @playwright/test
npm pkg set scripts.test:e2e="playwright test"
```

- [ ] **Passo 2: Escrever o teste de navegação e meta tags**

Criar `tests/e2e/navegacao.spec.js`:

```js
import { test, expect } from '@playwright/test';

const ROTAS = [
  '/', '/servicos', '/servicos/assessoria', '/servicos/consultoria',
  '/servicos/full-service', '/servicos/inteligencia-comercial',
  '/servicos/logistica', '/servicos/representacao', '/cases',
  '/cases/01', '/cases/02', '/cases/03', '/cases/04', '/cases/05',
  '/cases/novo-1', '/cases/amazon', '/grupo', '/sobre',
  '/insights', '/artigo', '/contato',
];

for (const rota of ROTAS) {
  test(`${rota} carrega sem erro de console`, async ({ page }) => {
    const erros = [];
    page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));

    const resposta = await page.goto(rota);
    expect(resposta.status()).toBe(200);
    await expect(page).toHaveTitle(/.+/);
    expect(erros).toEqual([]);
  });
}

test('meta tags estao no HTML servido, sem executar JS', async ({ request }) => {
  const html = await (await request.get('/')).text();
  expect(html).toMatch(/<title>Origenow/);
  expect(html).toMatch(/property="og:title"/);
  expect(html).toMatch(/name="description"/);
});
```

- [ ] **Passo 3: Rodar e ver falhar ou passar**

Rodar: `npx playwright test tests/e2e/navegacao.spec.js`
Se alguma rota der 404, corrija o mapeamento em `build/pages.js` e rebuilde. Se aparecer erro de console, investigue antes de seguir.

- [ ] **Passo 4: Escrever o teste do formulário**

Criar `tests/e2e/formulario.spec.js`:

```js
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.goto('/contato'); });

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

test('envia lead valido e mostra confirmacao', async ({ page }) => {
  await page.route('**/api/lead', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));

  await page.fill('#lead-nome', 'Maria Souza');
  await page.fill('#lead-email', 'maria@empresa.com.br');
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
  await page.getByText('Enviar e agendar').click();

  await expect(page.getByText('Não conseguimos registrar seu contato. Tente novamente.')).toBeVisible();
  await expect(page.locator('#lead-nome')).toHaveValue('Maria Souza');
  await expect(page.locator('#lead-email')).toHaveValue('maria@empresa.com.br');
});

test('envia o payload correto', async ({ page }) => {
  let capturado = null;
  await page.route('**/api/lead', (rota) => {
    capturado = JSON.parse(rota.request().postData());
    return rota.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });

  await page.fill('#lead-nome', 'Maria Souza');
  await page.fill('#lead-empresa', 'Empresa X');
  await page.fill('#lead-email', 'maria@empresa.com.br');
  await page.fill('#lead-whatsapp', '(31) 99999-0000');
  await page.fill('#lead-canais', 'Mercado Livre, Amazon');
  await page.fill('#lead-mensagem', 'Quero escalar.');
  await page.getByText('Enviar e agendar').click();

  await expect(page.getByText('Recebido')).toBeVisible();
  expect(capturado).toMatchObject({
    nome: 'Maria Souza', empresa: 'Empresa X', email: 'maria@empresa.com.br',
    whatsapp: '(31) 99999-0000', canais: 'Mercado Livre, Amazon', mensagem: 'Quero escalar.',
    website: '',
  });
});
```

- [ ] **Passo 5: Escrever o teste de mobile**

Criar `tests/e2e/mobile.spec.js`:

```js
import { test, expect } from '@playwright/test';

test.skip(({ isMobile }) => !isMobile, 'só roda no projeto mobile');

const ROTAS = ['/', '/servicos', '/cases', '/grupo', '/sobre', '/insights', '/contato'];

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
  await page.goto('/contato');
  const pequenos = await page.evaluate(() =>
    [...document.querySelectorAll('header a, header [data-om-burger], #lead-form input, #lead-form textarea, #lead-form [onclick], footer a')]
      .filter((el) => el.id !== 'lead-website')
      .map((el) => ({ txt: (el.textContent || el.tagName).trim().slice(0, 30), h: el.getBoundingClientRect().height }))
      .filter((x) => x.h > 0 && x.h < 44));
  expect(pequenos, JSON.stringify(pequenos, null, 2)).toEqual([]);
});

test('o menu mobile abre e navega', async ({ page }) => {
  await page.goto('/');
  await page.locator('header [data-om-burger]').click();
  await expect(page.getByRole('link', { name: /Consultoria para Marketplaces/i })).toBeVisible();
});

test('o menu mobile fecha com Escape', async ({ page }) => {
  await page.goto('/');
  await page.locator('header [data-om-burger]').click();
  await expect(page.getByRole('link', { name: /Consultoria para Marketplaces/i })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('link', { name: /Consultoria para Marketplaces/i })).toBeHidden();
});
```

- [ ] **Passo 6: Rodar a suíte completa**

Rodar: `npm run test:e2e`

Os testes de mobile provavelmente vão falhar na primeira execução — é o objetivo deles. **Corrija o CSS das páginas apontadas**, uma falha por vez, rebuildando entre as correções. Não relaxe as asserções para fazer passar.

Referências úteis para os ajustes: o gatilho do menu é `<span data-om-burger="1" onClick="{{ toggleMob }}">` em `Header.dc.html:125`, já com `2.75rem` (44px) de altura; o painel aberto é controlado por `<sc-if value="{{ mobOpen }}">` em `Header.dc.html:145`; e o `Escape` já fecha o menu via listener em `Header.dc.html:187`. As páginas usam atributos `data-om-pad`, `data-om-mar` e `data-om-pv` com sobrescritas por media query no `<style>` de cada arquivo — é ali que os ajustes de espaçamento mobile devem entrar, não em CSS novo.

- [ ] **Passo 7: Commit**

```bash
git add playwright.config.js tests/ package.json
git commit -m "test: e2e de navegacao, formulario e mobile"
```

- [ ] **Passo 8: Validar contra o ambiente publicado**

```bash
BASE_URL=https://<servico>.up.railway.app npm run test:e2e
```

Depois, um envio real pelo formulário publicado, conferindo que o lead chega ao `#comercial` **e** ao `contato@origenow.com.br`. Este é o critério de aceite do pedido "formulário funcional para captação de leads".

---

## Critérios de aceite

- [ ] `npm test` — 13 testes unitários passando
- [ ] `npm run build` — 31 páginas geradas, sem falha
- [ ] `npm run test:e2e` — suíte verde em desktop e mobile
- [ ] `curl -s https://<servico>.up.railway.app/ | grep '<title>'` devolve o título real
- [ ] Um lead de teste chega ao Slack `#comercial` e ao `contato@origenow.com.br`
- [ ] `origenow.com.br` responde 200 servindo o site novo
- [ ] `dig MX origenow.com.br` continua devolvendo os três registros do Zoho

---

## Pendências fora deste plano

Bloqueiam a conclusão mas não a implementação. Cobrar da direção:

- Números dos cases sem fonte — `+186%`, `+212%`, `+134%`, `+9/+6/+11 p.p.` (`LEIA-ME.md:47`)
- ID da plataforma Anye no Case 06, ainda placeholder (`README.md:23`)
- Domínio de produção para `canonical` e `og:url` absolutos (`README.md:24`)
- Confirmação do nome exato do canal no Slack
