// Tags do Google e eventos de conversão.
//
// O build injeta o script de omTracking() no <head> de todas as páginas (todos
// os idiomas), antes do runtime. Ele:
//   1. define window.dataLayer / gtag e o Consent Mode v2;
//   2. guarda a origem da visita (UTM, gclid) para anexar ao lead;
//   3. expõe window.omTrack / window.omOrigem, usados pelos formulários;
//   4. mede início de preenchimento e cliques em WhatsApp, e-mail e telefone;
//   5. fala com o Google só no domínio oficial e só com gente: robôs declarados
//      (User-Agent, navegador automatizado) não carregam nada, e o page_view,
//      a tag do Ads e o GTM esperam o primeiro sinal humano (mouse, toque,
//      teclado) ou 10 s de aba visível. localhost, testes e a URL
//      *.up.railway.app também não sujam os dados.
//
// Eventos (no dataLayer para o GTM e, com GA4 direto, via gtag):
//   lead_modal_open, lead_form_start, generate_lead (lead confirmado pelo
//   servidor) e contact (method = whatsapp | email | telefone). Conversões do
//   Google Ads: lead enviado, clique no WhatsApp e visualização de página (esta
//   só depois do sinal humano).
//
// Os IDs não são segredo (ficam visíveis no HTML de qualquer site), então ficam
// versionados em PADRAO. Variáveis de ambiente de mesmo nome têm precedência —
// a Railway as repassa ao build pelos ARG do Dockerfile.

import { PADRAO_BOT, EXCECOES_BOT } from '../server/bots.js';

const PADRAO = {
  ga4: 'G-THYDSTFRER',                // GA4 direto (não criar tag de GA4 no GTM: contaria em dobro)
  ads: 'AW-470660303',                // Google Ads · tag da conta 891-070-6499
  adsLead: '9KRZCJL-__ccEM_ptuAB',    // conversão "Enviar formulário de lead"
  adsContato: 'kAVzCJX-__ccEM_ptuAB', // conversão "Assistente de IA - WhatsApp"
  adsPagina: 'HEMjCJj-__ccEM_ptuAB',  // conversão "Visualização de página"
  gtm: 'GTM-K6D5X6B',                 // Google Tag Manager
  verificacao: '',                    // Search Console · conteúdo da meta google-site-verification
};

// Valor da conversão "Assistente de IA - WhatsApp", igual ao snippet do Google Ads.
const VALOR_WHATSAPP_BRL = 1;

const CAMPOS = {
  ga4:         { env: 'GA_MEASUREMENT_ID',        formato: /^G-[A-Z0-9]{4,20}$/ },
  ads:         { env: 'GOOGLE_ADS_ID',            formato: /^AW-\d{6,15}$/ },
  adsLead:     { env: 'GOOGLE_ADS_LEAD_LABEL',    formato: /^[\w-]{4,64}$/ },
  adsContato:  { env: 'GOOGLE_ADS_CONTACT_LABEL', formato: /^[\w-]{4,64}$/ },
  adsPagina:   { env: 'GOOGLE_ADS_PAGEVIEW_LABEL', formato: /^[\w-]{4,64}$/ },
  gtm:         { env: 'GTM_ID',                   formato: /^GTM-[A-Z0-9]{4,12}$/ },
  verificacao: { env: 'GOOGLE_SITE_VERIFICATION', formato: /^[\w-]{10,100}$/ },
};

// EEE + Reino Unido + Suíça: regiões onde o Google exige consentimento explícito.
const REGIOES_OPT_IN = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE',
  'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  'IS', 'LI', 'NO', 'GB', 'CH',
];

/**
 * Lê os IDs (ambiente > padrão). Os valores vão parar dentro de <script>: o
 * formato estrito é o que impede um ID digitado errado — ou malicioso — de
 * quebrar a página ou injetar código. Falha o build em vez de publicar errado.
 */
export function lerConfig(env = process.env, padrao = PADRAO) {
  const cfg = {};
  for (const [chave, { env: nome, formato }] of Object.entries(CAMPOS)) {
    // `||` e não `??`: ARG sem valor na Railway chega como string vazia.
    const valor = String(env[nome] || padrao[chave] || '').trim();
    if (valor && !formato.test(valor)) {
      throw new Error(`${nome} com formato inválido: ${JSON.stringify(valor)}`);
    }
    cfg[chave] = valor;
  }
  if ((cfg.adsLead || cfg.adsContato || cfg.adsPagina) && !cfg.ads) {
    throw new Error('GOOGLE_ADS_ID é obrigatório quando há rótulo de conversão do Google Ads');
  }
  return cfg;
}

/** Linha de log do build. */
export function resumoConfig(cfg) {
  const itens = [
    cfg.ga4 && `GA4 ${cfg.ga4}`,
    cfg.ads && `Ads ${cfg.ads}${cfg.adsLead ? ' (lead)' : ''}${cfg.adsContato ? ' (whatsapp)' : ''}${cfg.adsPagina ? ' (página)' : ''}`,
    cfg.gtm && `GTM ${cfg.gtm}`,
    cfg.verificacao && 'Search Console',
  ].filter(Boolean);
  return itens.length ? itens.join(' · ') : 'nenhum ID — só dataLayer e origem do lead';
}

/* Roda no navegador. É serializado com toString(): não pode usar nada de fora. */
function omTracking(C) {
  var w = window, d = document, nav = navigator;
  var dl = (w.dataLayer = w.dataLayer || []);
  function gtag() { dl.push(arguments); }
  if (!w.gtag) w.gtag = gtag;

  // Consent Mode v2 — negado só onde a lei exige opt-in (a regra por região
  // vence a geral); no Brasil e no resto, concedido.
  gtag('consent', 'default', {
    ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
    analytics_storage: 'denied', region: C.regioes,
  });
  gtag('consent', 'default', {
    ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted',
    analytics_storage: 'granted',
  });

  function ler(tipo, chave) {
    try { return JSON.parse(w[tipo].getItem(chave)) || null; } catch (e) { return null; }
  }
  function gravar(tipo, chave, valor) {
    try { w[tipo].setItem(chave, JSON.stringify(valor)); } catch (e) { /* modo privado */ }
  }

  // Origem: o último clique de campanha vale por 90 dias (localStorage); a
  // página de entrada e o site de referência valem para a sessão.
  var CHAVES = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'gclid', 'gbraid', 'wbraid', 'fbclid'];
  var busca = new URLSearchParams(location.search), campanha = null;
  CHAVES.forEach(function (k) {
    var v = busca.get(k);
    if (v) (campanha = campanha || {})[k] = v.slice(0, 200);
  });
  if (campanha) { campanha.ts = Date.now(); gravar('localStorage', 'om_campanha', campanha); }
  if (!ler('sessionStorage', 'om_entrada')) {
    var ref = '';
    try { var u = new URL(d.referrer); if (u.hostname !== location.hostname) ref = u.hostname; } catch (e) { /* sem referrer */ }
    gravar('sessionStorage', 'om_entrada', { landing: location.pathname, referrer: ref });
  }
  w.omOrigem = function () {
    var c = ler('localStorage', 'om_campanha');
    if (c && !(Date.now() - c.ts < 90 * 864e5)) c = null;
    var o = Object.assign({}, ler('sessionStorage', 'om_entrada'), c, { pagina: location.pathname });
    delete o.ts;
    if (!o.referrer) delete o.referrer;
    return o;
  };

  // ?om_debug=1 (DebugView do GA4, testes) força o Google fora do domínio
  // oficial e ignora a detecção de robô, mas mantém a espera por sinal humano.
  // ?gtm_debug= (Tag Assistant) precisa do GTM no carregamento: pula a espera.
  var debug = /[?&]om_debug=1(&|$)/.test(location.search);
  var tagAssistant = /[?&]gtm_debug=/.test(location.search);
  var ua = nav.userAgent || '';
  var robo = nav.webdriver === true ||
    (new RegExp(C.padraoBot, 'i').test(ua) && !new RegExp(C.excecoesBot, 'i').test(ua));
  var ativo = debug || tagAssistant || (location.hostname === C.host && !robo);

  // Fora do domínio oficial, ou para robôs, os eventos vão direto ao dataLayer
  // e param ali: nenhum script do Google é carregado para lê-los.
  var liberado = !ativo, fila = [];

  function carregar(src) {
    var s = d.createElement('script');
    s.async = true;
    s.src = src;
    d.head.appendChild(s);
  }

  function registrar(evento, params) {
    // GTM lê objetos {event}; o GA4 direto lê comandos gtag('event').
    if (C.gtm || !C.ga4) dl.push(Object.assign({ event: evento }, params));
    if (C.ga4) gtag('event', evento, params);
    converter(evento === 'contact' ? 'contact_' + params.method : evento);
  }

  // Conversões do Google Ads, montadas no build (send_to e valor): lead
  // enviado, clique no WhatsApp e visualização de página.
  function converter(chave) {
    var c = C.conversoes[chave];
    if (c) gtag('event', 'conversion', Object.assign({}, c));
  }

  // Primeiro sinal humano: sai o page_view (config do GA4), a tag do Ads
  // (remarketing) e o GTM, e os eventos represados seguem na ordem.
  function liberar() {
    if (liberado) return;
    liberado = true;
    if (C.ga4) gtag('config', C.ga4, debug ? { debug_mode: true } : {});
    if (C.ads) gtag('config', C.ads);
    converter('page_view');
    if (C.gtm) {
      dl.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
      carregar('https://www.googletagmanager.com/gtm.js?id=' + C.gtm);
    }
    fila.splice(0).forEach(function (e) { registrar(e[0], e[1]); });
  }

  w.omTrack = function (evento, params) {
    // Medição nunca pode derrubar o fluxo de quem chamou (ex.: o lead já enviado).
    try {
      params = params || {};
      // Lead confirmado pelo servidor e clique de contato já provam interação.
      if (evento === 'generate_lead' || evento === 'contact') liberar();
      if (liberado) registrar(evento, params); else fila.push([evento, params]);
    } catch (e) { /* ignora */ }
  };

  // Início de preenchimento, uma vez por formulário. Os ids dos campos são os
  // dos formulários de Contato (lead-*) e do modal da home (modal-*).
  var iniciados = {};
  d.addEventListener('focusin', function (e) {
    var id = (e.target && e.target.id) || '';
    var form = /^lead-/.test(id) ? 'contato' : /^modal-/.test(id) ? 'diagnostico_home' : '';
    if (form && !iniciados[form]) { iniciados[form] = 1; w.omTrack('lead_form_start', { form_id: form }); }
  }, true);

  d.addEventListener('click', function (e) {
    if (e.isTrusted === false) return; // clique disparado por script não conta
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var metodo = /^https?:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\//i.test(href) ? 'whatsapp'
      : /^mailto:/i.test(href) ? 'email'
      : /^tel:/i.test(href) ? 'telefone' : '';
    if (metodo) w.omTrack('contact', { method: metodo });
  }, true);

  if (!ativo) return;

  // O gtag.js já carrega (sem enviar nada) para o config ser processado no
  // instante do primeiro sinal — inclusive o gclid, quando esse sinal é um
  // clique que já navega para outra página.
  if (C.ga4 || C.ads) {
    gtag('js', new Date());
    carregar('https://www.googletagmanager.com/gtag/js?id=' + (C.ga4 || C.ads));
  }

  if (tagAssistant) return liberar();

  // Sinais de gente: eventos confiáveis (isTrusted) de mouse, toque, teclado ou
  // roda — ou 10 s de aba visível, para quem só lê. Crawler que executa JS
  // costuma sair antes disso e sem interagir.
  var SINAIS = ['pointerdown', 'pointermove', 'touchstart', 'keydown', 'wheel'];
  function aoSinal(e) {
    if (e.isTrusted === false) return;
    SINAIS.forEach(function (s) { d.removeEventListener(s, aoSinal, true); });
    liberar();
  }
  SINAIS.forEach(function (s) { d.addEventListener(s, aoSinal, { capture: true, passive: true }); });
  var segundosVisivel = 0;
  var relogio = setInterval(function () {
    if (liberado) return clearInterval(relogio);
    if (d.visibilityState === 'visible' && ++segundosVisivel >= 10) liberar();
  }, 1000);
}

/** Bloco para o <head>: meta do Search Console (se houver) + script de tracking. */
export function headTracking(cfg, host) {
  const { verificacao, ...ids } = cfg;
  const conversao = (rotulo, extra = {}) => rotulo && { send_to: `${cfg.ads}/${rotulo}`, ...extra };
  const conversoes = Object.fromEntries(Object.entries({
    generate_lead: conversao(cfg.adsLead),
    contact_whatsapp: conversao(cfg.adsContato, { value: VALOR_WHATSAPP_BRL, currency: 'BRL' }),
    page_view: conversao(cfg.adsPagina),
  }).filter(([, c]) => c));
  const dados = JSON.stringify({
    ...ids, host, conversoes, regioes: REGIOES_OPT_IN, padraoBot: PADRAO_BOT, excecoesBot: EXCECOES_BOT,
  }).replace(/</g, '\\u003c');
  const meta = verificacao ? `<meta name="google-site-verification" content="${verificacao}">\n` : '';
  return `${meta}<script id="om-tracking">(${omTracking.toString()})(${dados});</script>`;
}
