# Publicação do novo site da Origenow — especificação

**Data:** 06/08/2026
**Repositório:** `origenow/origenow_landing_page_final`
**Autor da demanda:** direção da Origenow, via Pedro Borela

---

## 1. Objetivo

Colocar o novo site institucional da Origenow no ar em `origenow.com.br`, com o
formulário de contato efetivamente captando leads, validado em desktop e mobile
por testes automatizados.

A demanda original tem cinco partes:

1. Subir e hospedar o site
2. Apontar o domínio
3. Fazer o handoff do Claude Design para o Claude Code, com formulário funcional
4. Testar a versão mobile
5. Ajustar o mobile e cobrir com teste e2e

Esta especificação atende as cinco, em ordem diferente da enunciada, pelos
motivos descritos na seção 7.

---

## 2. Estado atual — apurado em 06/08/2026

### 2.1 O site em produção está fora do ar

```
https://origenow.com.br      → HTTP 503   Server: railway-hikari
https://www.origenow.com.br  → HTTP 503   Server: railway-hikari
```

O DNS resolve corretamente. Quem não responde é o serviço na Railway. O `503`
parte da borda da Railway (`x-railway-edge: mia1`), indicando container parado,
em crash ou conta sem crédito. **Causa ainda não determinada** — depende de
inspeção no painel, atribuída a Pedro.

Este é um problema pré-existente, independente do site novo.

### 2.2 Mapa do domínio

| Registro | Valor | Observação |
|---|---|---|
| NS | `e.sec.dns.br`, `f.sec.dns.br` | DNS gerenciado no Registro.br |
| A (raiz) | `69.46.46.112` | Railway |
| CNAME `www` | `uq3z6rqw.up.railway.app` | Railway |
| MX | `mx.zoho.com` (0), `mx2.zoho.com` (20), `mx3.zoho.com` (50) | **E-mail corporativo — não tocar** |
| TXT | `v=spf1 include:zohomail.com include:_spf.mail.hostinger.com include:_spf.google.com ~all` | SPF |

Consequência: como o domínio já aponta para a Railway, publicar lá **dispensa
qualquer alteração de DNS**, e o e-mail da empresa nunca entra em risco.

### 2.3 O site novo é renderizado no cliente

As 21 páginas são `.dc.html` do Claude Design, interpretadas em runtime por
`support.js` (1.893 linhas). O `<head>` estático de toda página contém apenas:

```html
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script src="./support.js"></script>
```

`<title>`, `description` e Open Graph vivem dentro de `<x-dc><helmet>`, injetados
por JavaScript. O runtime oculta o bloco fonte com `x-dc{display:none!important}`
até renderizar.

Consequência: crawlers que não executam JavaScript — WhatsApp, LinkedIn,
Facebook — recebem uma página sem título, sem descrição e sem imagem. Todo link
do site compartilhado nesses canais aparece sem preview.

### 2.4 O formulário de contato não envia nada

`Origenow Contato.dc.html:224-234` — a lógica completa do botão é:

```js
submitContato: () => this.setState({ sent: true })
```

Não há elemento `<form>`, os inputs não possuem `name` nem `id`, não há validação
e não há requisição de rede. O clique apenas alterna um booleano e exibe:

> **Recebido** — "Você recebe a confirmação por e-mail em até 2 horas com o nome
> de quem vai conduzir a conversa."

O site promete confirmação por e-mail e descarta o lead silenciosamente.

---

## 3. Arquitetura

Um único serviço Node na Railway, servindo as páginas e recebendo o formulário.

```
Visitante → [Railway: app Node]
                ├── GET  /*          → HTML pré-renderizado (estático)
                └── POST /api/lead   → Slack #comercial + e-mail contato@origenow.com.br
```

Segredos (webhook do Slack, credenciais SMTP) ficam como variáveis de ambiente na
Railway. Nunca no código, nunca no repositório.

### 3.1 Unidades e responsabilidades

| Unidade | Faz | Depende de |
|---|---|---|
| `build/prerender.js` | Abre cada `.dc.html` em navegador headless, aguarda o render, grava HTML final em `dist/` | Playwright, arquivos `.dc.html` |
| `server/app.js` | Serve `dist/` e monta a rota de lead | Express |
| `server/lead-route.js` | Valida o payload, chama os notificadores, responde 200/400/500 | notificadores |
| `server/notify-slack.js` | Posta o lead formatado no `#comercial` | `SLACK_WEBHOOK_URL` |
| `server/notify-email.js` | Envia o lead por e-mail | `SMTP_*` |
| `tests/e2e/*.spec.js` | Testes Playwright desktop e mobile | site publicado |

Cada notificador tem interface única — `enviar(lead) → Promise` — e é testável
isoladamente. Adicionar um terceiro destino no futuro (CRM, por exemplo) não
altera a rota.

---

## 4. Handoff do Claude Design (item 3 da demanda)

**Decisão: pré-renderizar, não reescrever.**

Descartada a migração para Next/React/Astro. Os templates funcionam e carregam o
trabalho de design acumulado; o defeito não está neles, e sim em *onde* a
renderização acontece. Reescrever custaria semanas e reintroduziria bugs de
layout já resolvidos.

O passo de build abre cada página num Chromium headless, espera o `support.js`
concluir a renderização, e grava o DOM resultante como HTML — já com `<head>`
preenchido. O fluxo de trabalho não muda: as páginas continuam sendo editadas
como `.dc.html`; o build gera a versão publicável.

Ganhos: preview de link em WhatsApp/LinkedIn, indexação sem depender da segunda
passada do Google, e conteúdo visível antes do JavaScript carregar.

### 4.1 Riscos técnicos a validar antes de assumir o caminho

Dois pontos podem invalidar a abordagem e precisam de prova numa página piloto:

1. **Hidratação destrutiva** — se o `support.js` limpar o DOM ao inicializar
   sobre HTML já renderizado, haverá um flash de tela em branco. Mitigação
   possível: servir o HTML pré-renderizado e não carregar o runtime nas páginas
   sem interatividade.
2. **Rotas por query string** — `Origenow Case Novo.dc.html` serve os cases 06 a
   16 via `?c=1…11` e `?c=amazon`. Cada variante precisa virar um arquivo próprio
   no build, totalizando 12 páginas geradas a partir de um template.

Se o item 1 não tiver solução limpa, a decisão de arquitetura é reaberta.

---

## 5. Formulário de captação (item 3 da demanda)

### 5.1 Destino do lead

Slack `#comercial` **e** e-mail para `contato@origenow.com.br`.

A demanda diz "ou". A especificação adota os dois porque é a mesma função e o
mesmo esforço, e um cobre a indisponibilidade do outro. Perder lead por
integração fora do ar é o pior resultado possível. Reduzir a um só destino é
alteração de uma linha, caso a direção prefira.

Descartados nesta fase: planilha, WhatsApp e CRM Agendor.

### 5.2 Campos

Os seis campos já existentes na página: Nome, Empresa, E-mail, WhatsApp, Canais
em que já vende, O que você precisa.

Obrigatórios: Nome e E-mail — sem meio de retorno o lead é inútil, e o e-mail é o
canal que a equipe já opera. Os demais são opcionais.

### 5.3 Comportamento

- Envolver os campos em `<form>`, com `name` em cada input
- Validar no cliente e revalidar no servidor
- Desabilitar o botão durante o envio, com estado visual de carregamento
- Em falha de rede ou erro do servidor, exibir mensagem de erro e **preservar o
  que foi digitado** — hoje não há tratamento algum
- Honeypot antispam: campo oculto que, se preenchido, descarta silenciosamente

### 5.4 Correção de texto obrigatória

A tela de sucesso promete confirmação por e-mail em até 2 horas. Nenhum e-mail é
enviado ao lead neste desenho. O texto passa a refletir o que ocorre de fato:

> **Recebido** — Nossa equipe responde em até 2 dias úteis.

Alternativa, se a direção quiser manter a promessa: incluir e-mail automático de
confirmação ao lead. Fora do escopo atual.

---

## 6. Testes (itens 4 e 5 da demanda)

Playwright, cobrindo desktop (1440px) e mobile (390px, iPhone 13):

| Teste | Verifica |
|---|---|
| Navegação | As 21 páginas carregam, sem link quebrado, sem erro de console |
| Meta tags | Cada página serve `<title>` e Open Graph no HTML inicial, sem JS |
| Formulário — sucesso | Preenchimento válido dispara `POST /api/lead` e exibe a confirmação |
| Formulário — validação | E-mail inválido e campos vazios bloqueiam o envio |
| Formulário — falha | Erro do servidor exibe mensagem e preserva o digitado |
| Mobile | Sem rolagem horizontal, alvos de toque ≥ 44px, header e menu funcionais |
| Entrega do lead | Um lead de teste chega ao Slack e ao e-mail |

Os ajustes de mobile do item 5 da demanda serão definidos pelo que esses testes
revelarem — não há como especificá-los antes de medir.

---

## 7. Ordem de execução e justificativa

A demanda pede domínio primeiro e formulário depois. A ordem é invertida:

1. **Destravar a Railway** — diagnosticar o 503
2. **Build de pré-render** — validar numa página piloto, depois nas 21
3. **Formulário + `/api/lead`** — Slack e e-mail funcionando
4. **Deploy em URL de teste da Railway** — validar sem exposição pública
5. **Playwright desktop e mobile** — e corrigir o que aparecer
6. **Promover ao domínio** — sem alteração de DNS

Motivo: o domínio já aponta para a Railway, então "apontar o domínio" não é
tarefa de DNS e sim de promover o serviço. E publicar um formulário que não
capta seria pior do que o estado atual — o lead se perderia acreditando ter sido
atendido.

---

## 8. Dependências externas

Nenhuma destas está sob controle da implementação. Todas bloqueiam etapas.

| Item | Responsável | Bloqueia |
|---|---|---|
| Causa do 503 e saldo da conta Railway | Pedro, no painel | Tudo a partir da etapa 4 |
| URL do Incoming Webhook do Slack para `#comercial` | Admin do Slack | Notificação Slack |
| Confirmação do nome exato do canal | Direção | Notificação Slack |
| Credenciais SMTP do Zoho (senha de aplicativo) | Admin do Zoho | Notificação e-mail |
| Substituir o serviço Railway atual ou criar outro | Direção | Etapa 6 |
| Domínio de produção para canonical e `og:url` | Direção | Meta tags absolutas |

O último item já constava como pendência em `README.md:24`.

---

## 9. Riscos

**Conta Railway sem crédito.** Se for a causa do 503, o caminho inteiro trava até
regularização. É o único risco capaz de inviabilizar o plano.

**Hidratação do `support.js` sobre HTML pré-renderizado.** Ver 4.1. Reabre a
decisão de arquitetura se não houver solução limpa.

**Números dos cases sem fonte.** `+186%`, `+212%`, `+134%` e `+9/+6/+11 p.p.`
seguem sem lastro documentado, conforme `LEIA-ME.md:47` e item 1 do `COPY.md`.
Publicar métrica de cliente sem comprovação é exposição comercial e jurídica.
Validação cabe à direção, não à implementação.

**Placeholder no Case 06.** O ID da plataforma Anye segue como texto provisório
(`README.md:23`).

---

## 10. Fora de escopo

- Migração para Next, React ou Astro
- E-mail automático de confirmação ao lead
- Integração com o CRM Agendor
- Notificação por WhatsApp
- CMS para os Insights e Artigos
- Redesenho de qualquer página
