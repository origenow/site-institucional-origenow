# Status da implementação — publicação do site

> Continuação do trabalho do Pedro Borela. Branch: `feat/publicacao-site`.
> Base: [plano](2026-08-06-publicacao-site-origenow.md) e [spec](../specs/2026-08-06-publicacao-site-origenow-design.md).

## Decisão de arquitetura (spec §4.1)

O pré-render puro previsto no plano **quebrava a interatividade**: o `support.js`
remove o `<x-dc>` fonte ao renderizar; ao servir esse HTML, o runtime não acha
`<x-dc>` e **não re-hidrata** — as páginas ficavam estáticas, inclusive o
formulário. Confirmado por sonda (a fonte servida por HTTP é 100% interativa).

A spec reservava essa escolha para decisão humana. **Escolhido: servir a fonte
interativa + `<head>` de SEO pré-computado.** O build lê cada `.dc.html`, extrai
as tags de SEO do `<helmet>` e as injeta no `<head>` estático, preservando o
`<x-dc>` no corpo para hidratação no cliente. Cada página é servida no próprio
nome `.dc.html` (links internos e variantes `?c=` do Case Novo funcionam sem
reescrita); a home responde em `/`.

Consequência: crawlers e Google recebem `title`/OG no HTML inicial; humanos têm
interatividade total (menu, drawer, idioma, formulário). O corpo é renderizado
no cliente (aceito na decisão).

## Feito e verificado localmente

| Tarefa | Estado |
|---|---|
| 1. Gate de pré-render | ✅ (levou à decisão acima) |
| 2. Build das páginas | ✅ `npm run build` → 20 páginas + Header/Footer em `dist/` |
| 3. Servidor Express | ✅ serve `dist/`, home em `/`, dotfiles p/ sidecar |
| 4. Notificador Slack | ✅ + testes |
| 5. Notificador e-mail | ✅ + testes |
| 6. Rota `POST /api/lead` | ✅ validação, honeypot, 200/400/502 |
| 7. Formulário real (Contato) | ✅ envia de verdade, erro preserva o digitado, texto corrigido |
| 8. Dockerfile | ✅ (build puro Node, sem Playwright) |
| 9. E2E desktop + mobile | ✅ **64 testes verdes** (nav, formulário, mobile) |

- `npm test` → **15 testes unitários** passando.
- `npm run test:e2e` → **64 testes** passando (desktop 1440 + iPhone 13).
- Título de SEO servido sem JS: `curl -s http://localhost:3000/ | grep '<title>'`.

## Pendente — depende de acesso externo (Pedro / direção)

Bloqueiam o deploy, não a implementação:

1. **Railway 503** — diagnosticar o serviço parado / saldo da conta (spec §2.1).
2. **Slack** — URL do Incoming Webhook do `#comercial` → `SLACK_WEBHOOK_URL`.
3. **Zoho** — senha de aplicativo → `SMTP_PASS`.
4. **Deploy (Tarefa 8, passos 4–6):** conectar o serviço da Railway ao repo/branch,
   definir as variáveis (ver `.env.example`), validar na URL `*.up.railway.app` e
   só então promover ao domínio (sem mexer no DNS — já aponta pra Railway).
5. **Validação do lead real:** um envio pelo formulário publicado chega ao
   `#comercial` **e** ao `contato@origenow.com.br`.

## Pendências de conteúdo (direção)

- Números dos cases sem fonte: `+186%`, `+212%`, `+134%`, `+9/+6/+11 p.p.` (`LEIA-ME.md`).
- ID da plataforma Anye no Case 06 (placeholder, `README.md`).
- Domínio de produção para `canonical`/`og:url` absolutos; hoje o `og:image` é
  relativo (resolve contra a URL da página).

## Rodar localmente

```bash
npm ci
npm run build
SLACK_WEBHOOK_URL=... LEAD_EMAIL_TO=... SMTP_USER=... SMTP_PASS=... npm start
# http://localhost:3000
npm test          # unitários
npm run test:e2e  # e2e (sobe o server sozinho)
```
