// Tags do Google e eventos de conversão.
//
// O build injeta o script de omTracking() no <head> de todas as páginas (todos
// os idiomas), antes do runtime. Ele:
//   1. define window.dataLayer / gtag e o Consent Mode v2;
//   2. guarda a origem da visita (UTM, gclid) para anexar ao lead;
//   3. expõe window.omTrack / window.omOrigem, usados pelos formulários;
//   4. mede início de preenchimento e cliques em WhatsApp, e-mail e telefone;
//   5. carrega o gtag.js (GA4 + Google Ads) e/ou o GTM — só no domínio oficial,
//      para localhost, testes e a URL *.up.railway.app não sujarem os dados.
//
// Eventos: lead_modal_open, lead_form_start, generate_lead (conversão de lead),
// contact (conversão de contato, com method = whatsapp | email | telefone).
//
// Os IDs não são segredo (ficam visíveis no HTML de qualquer site), então podem
// ser versionados em PADRAO. Variáveis de ambiente de mesmo nome têm
// precedência — a Railway as repassa ao build pelos ARG do Dockerfile.

const PADRAO = {
  ga4: '',         // GA4 · ID da métrica — G-XXXXXXXXXX
  ads: '',         // Google Ads · tag de conversão — AW-XXXXXXXXXX
  adsLead: '',     // Google Ads · rótulo da conversão "lead enviado"
  adsContato: '',  // Google Ads · rótulo da conversão "clique no WhatsApp" (opcional)
  gtm: '',         // Google Tag Manager — GTM-XXXXXXX (alternativa ao gtag direto)
  verificacao: '', // Search Console · conteúdo da meta google-site-verification
};

const CAMPOS = {
  ga4:         { env: 'GA_MEASUREMENT_ID',        formato: /^G-[A-Z0-9]{4,20}$/ },
  ads:         { env: 'GOOGLE_ADS_ID',            formato: /^AW-\d{6,15}$/ },
  adsLead:     { env: 'GOOGLE_ADS_LEAD_LABEL',    formato: /^[\w-]{4,64}$/ },
  adsContato:  { env: 'GOOGLE_ADS_CONTACT_LABEL', formato: /^[\w-]{4,64}$/ },
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
 * Lê os IDs (ambiente > PADRAO). Os valores vão parar dentro de <script>: o
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
  if ((cfg.adsLead || cfg.adsContato) && !cfg.ads) {
    throw new Error('GOOGLE_ADS_ID é obrigatório quando há rótulo de conversão do Google Ads');
  }
  return cfg;
}

/** Linha de log do build. */
export function resumoConfig(cfg) {
  const itens = [
    cfg.ga4 && `GA4 ${cfg.ga4}`,
    cfg.ads && `Ads ${cfg.ads}${cfg.adsLead ? ' (lead)' : ''}${cfg.adsContato ? ' (contato)' : ''}`,
    cfg.gtm && `GTM ${cfg.gtm}`,
    cfg.verificacao && 'Search Console',
  ].filter(Boolean);
  return itens.length ? itens.join(' · ') : 'nenhum ID — só dataLayer e origem do lead';
}

/* Roda no navegador. É serializado com toString(): não pode usar nada de fora. */
function omTracking(C) {
  var w = window, d = document;
  var dl = (w.dataLayer = w.dataLayer || []);
  function gtag() { dl.push(arguments); }
  if (!w.gtag) w.gtag = gtag;
  var direto = !!(C.ga4 || C.ads);

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

  var CONVERSAO = { generate_lead: C.adsLead, contact: C.adsContato };
  w.omTrack = function (evento, params) {
    // Medição nunca pode derrubar o fluxo de quem chamou (ex.: o lead já enviado).
    try {
      params = params || {};
      // GTM lê objetos {event}; o gtag.js lê comandos gtag('event').
      if (C.gtm || !direto) dl.push(Object.assign({ event: evento }, params));
      if (direto) gtag('event', evento, params);
      if (C.ads && CONVERSAO[evento]) gtag('event', 'conversion', { send_to: C.ads + '/' + CONVERSAO[evento] });
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
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var metodo = /^https?:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\//i.test(href) ? 'whatsapp'
      : /^mailto:/i.test(href) ? 'email'
      : /^tel:/i.test(href) ? 'telefone' : '';
    if (metodo) w.omTrack('contact', { method: metodo });
  }, true);

  // ?om_debug=1 força o carregamento fora do domínio oficial (DebugView do GA4).
  var debug = /[?&]om_debug=1(&|$)/.test(location.search);
  if (location.hostname !== C.host && !debug) return;

  function carregar(src) {
    var s = d.createElement('script');
    s.async = true;
    s.src = src;
    d.head.appendChild(s);
  }
  if (direto) {
    gtag('js', new Date());
    if (C.ga4) gtag('config', C.ga4, debug ? { debug_mode: true } : {});
    if (C.ads) gtag('config', C.ads);
    carregar('https://www.googletagmanager.com/gtag/js?id=' + (C.ga4 || C.ads));
  }
  if (C.gtm) {
    dl.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    carregar('https://www.googletagmanager.com/gtm.js?id=' + C.gtm);
  }
}

/** Bloco para o <head>: meta do Search Console (se houver) + script de tracking. */
export function headTracking(cfg, host) {
  const { verificacao, ...ids } = cfg;
  const dados = JSON.stringify({ ...ids, host, regioes: REGIOES_OPT_IN }).replace(/</g, '\\u003c');
  const meta = verificacao ? `<meta name="google-site-verification" content="${verificacao}">\n` : '';
  return `${meta}<script id="om-tracking">(${omTracking.toString()})(${dados});</script>`;
}
