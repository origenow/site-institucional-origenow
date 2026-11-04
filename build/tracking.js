// Tags do Google e eventos de conversão.
//
// O build injeta o script de omTracking() no <head> de todas as páginas (todos
// os idiomas), antes do runtime. Ele:
//   1. define window.dataLayer / gtag e o Consent Mode v2;
//   2. guarda a origem da visita (UTM, gclid) para anexar ao lead;
//   3. expõe window.omTrack / window.omOrigem, usados pelos formulários;
//   4. mede início de preenchimento e cliques em WhatsApp, e-mail e telefone, e
//      leva a origem até o WhatsApp pelo link rastreável do TinTim;
//   5. fala com o Google só no domínio oficial e só com gente: robôs declarados
//      (User-Agent, navegador automatizado) não carregam nada. O GTM carrega
//      já no head (async); o page_view e a tag do Ads esperam o primeiro
//      sinal humano (mouse, toque, teclado) ou 10 s de aba visível. localhost,
//      testes e a URL *.up.railway.app também não sujam os dados.
//
// Eventos (no dataLayer para o GTM e, com GA4 direto, via gtag):
//   lead_modal_open, lead_form_start, generate_lead (lead confirmado pelo
//   servidor) e contact (method = whatsapp | email | telefone). Conversão do
//   Google Ads: só o lead enviado (clique no WhatsApp e visualização de página
//   aceitam rótulo, mas ficam desligados). O generate_lead leva e-mail e telefone em
//   user_data para a conversão otimizada; a tag do Google aplica o hash antes
//   de enviar.
//
// Pixel da Meta: PageView, Lead (lead qualificado, junto do generate_lead) e
// Contact (clique no WhatsApp). Mesmas travas do Google: domínio oficial, sem robô.
//
// Os IDs não são segredo (ficam visíveis no HTML de qualquer site), então ficam
// versionados em PADRAO. Variáveis de ambiente de mesmo nome têm precedência —
// a Railway as repassa ao build pelos ARG do Dockerfile.

import { PADRAO_BOT, EXCECOES_BOT } from '../server/bots.js';

const PADRAO = {
  ga4: 'G-THYDSTFRER',                // GA4 direto (não criar tag de GA4 no GTM: contaria em dobro)
  ads: 'AW-470660303',                // Google Ads · tag da conta 891-070-6499
  adsLead: '9KRZCJL-__ccEM_ptuAB',    // conversão "Enviar formulário de lead"
  // Clique no WhatsApp e visualização de página não viram conversão no Ads:
  // contados como conversão, ensinavam o lance a buscar visita barata em vez de
  // lead. Seguem medidos como eventos no GA4 (contact, page_view). Rótulos da
  // conta, se um dia voltarem: WhatsApp kAVzCJX-__ccEM_ptuAB · página HEMjCJj-__ccEM_ptuAB.
  adsContato: '',
  adsPagina: '',
  gtm: 'GTM-K6D5X6B',                 // Google Tag Manager
  // Link rastreável "Letícia - Site" do TinTim. Abre o número conectado na conta
  // Origenow do TinTim: hoje a Letícia, o mesmo destino do wa.me que ele substitui.
  // Vazio: os botões seguem no wa.me, que funciona, mas chega sem origem no TinTim.
  // O pixel não entra aqui: ele é uma tag do GTM (carregar também pelo site dobraria).
  tintimLink: 'https://tintim.link/whatsapp/37ff02ac-4035-4197-9834-52ddd7078557/fd1cb55b-0d59-4320-8fd4-786fb851a5cb',
  metaPixel: '500995551485983',       // Pixel de Origenow (não criar tag da Meta no GTM: contaria em dobro)
  verificacao: '',                   // Search Console · conteúdo da meta google-site-verification
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
  tintimLink:  { env: 'TINTIM_WHATSAPP_URL',      formato: /^https:\/\/(tintim\.link|s\.tintim\.app)\/[\w/-]{8,200}$/ },
  metaPixel:   { env: 'META_PIXEL_ID',            formato: /^\d{10,20}$/ },
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
    cfg.tintimLink && 'link TinTim',
    cfg.metaPixel && `Meta ${cfg.metaPixel}`,
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
  function campanhaVigente() {
    var c = ler('localStorage', 'om_campanha');
    return c && Date.now() - c.ts < 90 * 864e5 ? c : null;
  }
  w.omOrigem = function () {
    var o = Object.assign({}, ler('sessionStorage', 'om_entrada'), campanhaVigente(), { pagina: location.pathname });
    delete o.ts;
    if (!o.referrer) delete o.referrer;
    return o;
  };

  // WhatsApp com origem: troca o wa.me pelo link rastreável do TinTim e anexa a
  // campanha, no instante do clique. Não fica só com o pixel porque ele prende o
  // clique uma vez, nos links que já existem quando carrega, e aqui as páginas
  // são renderizadas no cliente. Vale a mesma campanha do formulário (último
  // clique, 90 dias); os cookies tt_ do pixel completam o que ela não guarda
  // (utm_id, gad_source, campaignid...). Parâmetro já presente no link é mantido.
  function levarOrigem(a, href) {
    var tintim = /^https:\/\/(tintim\.link|s\.tintim\.app)\//i.test(href);
    if (!tintim && !C.tintimLink) return;
    var u = new URL(tintim ? href : C.tintimLink);
    var params = campanhaVigente() || {};
    delete params.ts;
    d.cookie.split('; ').forEach(function (par) {
      var i = par.indexOf('='), nome = par.slice(3, i);
      if (par.indexOf('tt_') === 0 && !params[nome]) {
        try { params[nome] = decodeURIComponent(par.slice(i + 1)); } catch (e) { /* cookie malformado */ }
      }
    });
    Object.keys(params).forEach(function (k) {
      if (!u.searchParams.has(k)) u.searchParams.set(k, params[k]);
    });
    a.href = u.toString();
  }

  // ?om_debug=1 (DebugView do GA4, testes) força o Google fora do domínio
  // oficial e ignora a detecção de robô, mas mantém a espera por sinal humano.
  // ?gtm_debug= (Tag Assistant) também libera o GA4/Ads sem esperar o sinal.
  var debug = /[?&]om_debug=1(&|$)/.test(location.search);
  var tagAssistant = /[?&]gtm_debug=/.test(location.search);
  var ua = nav.userAgent || '';
  var robo = nav.webdriver === true ||
    (new RegExp(C.padraoBot, 'i').test(ua) && !new RegExp(C.excecoesBot, 'i').test(ua));
  var ativo = debug || tagAssistant || (location.hostname === C.host && !robo);

  // Fora do domínio oficial, ou para robôs, os eventos vão direto ao dataLayer
  // e param ali: nenhum script do Google é carregado para lê-los.
  var liberado = !ativo, fila = [], fbq = null;

  function carregar(src) {
    var s = d.createElement('script');
    s.async = true;
    s.src = src;
    d.head.appendChild(s);
  }

  // Dados para a conversão otimizada do Google Ads: e-mail normalizado e
  // telefone em E.164. Número sem "+" é tratado como brasileiro (DDD + número).
  function dadosUsuario(u) {
    var d = {};
    var email = String(u.email || '').trim().toLowerCase();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) d.email = email;
    var bruto = String(u.telefone || '').trim();
    var digitos = bruto.replace(/\D/g, '');
    if (bruto.charAt(0) === '+') {
      if (digitos.length >= 8 && digitos.length <= 15) d.phone_number = '+' + digitos;
    } else {
      if (/^55\d{10,11}$/.test(digitos)) digitos = digitos.slice(2);
      if (/^\d{10,11}$/.test(digitos)) d.phone_number = '+55' + digitos;
    }
    return d.email || d.phone_number ? d : null;
  }

  function registrar(evento, params, usuario) {
    if (evento === 'generate_lead' && usuario) {
      var dados = dadosUsuario(usuario);
      if (dados) gtag('set', 'user_data', dados);
    }
    // GTM lê objetos {event}; o GA4 direto lê comandos gtag('event').
    if (C.gtm || !C.ga4) dl.push(Object.assign({ event: evento }, params));
    if (C.ga4) gtag('event', evento, params);
    converter(evento === 'contact' ? 'contact_' + params.method : evento);
    // Meta: Lead só para o lead qualificado, a mesma regra do Google Ads.
    if (fbq && evento === 'generate_lead') fbq('track', 'Lead', { content_name: params.form_id });
    if (fbq && evento === 'contact' && params.method === 'whatsapp') fbq('track', 'Contact');
  }

  // Conversões do Google Ads, montadas no build (send_to e valor): lead
  // enviado, clique no WhatsApp e visualização de página.
  function converter(chave) {
    var c = C.conversoes[chave];
    if (c) gtag('event', 'conversion', Object.assign({}, c));
  }

  // Primeiro sinal humano: sai o page_view (config do GA4) e a tag do Ads
  // (remarketing), e os eventos represados seguem na ordem. O GTM não espera
  // por aqui: carrega já no head (ver abaixo).
  function liberar() {
    if (liberado) return;
    liberado = true;
    if (C.ga4) gtag('config', C.ga4, debug ? { debug_mode: true } : {});
    if (C.ads) gtag('config', C.ads);
    converter('page_view');
    if (fbq) {
      // Sem os eventos automáticos (cliques em botão, metadados): só os da lista acima.
      fbq('set', 'autoConfig', false, C.metaPixel);
      fbq('init', C.metaPixel);
      fbq('track', 'PageView');
    }
    fila.splice(0).forEach(function (e) { registrar(e[0], e[1], e[2]); });
  }

  // usuario ({ email, telefone }) só é usado no generate_lead.
  w.omTrack = function (evento, params, usuario) {
    // Medição nunca pode derrubar o fluxo de quem chamou (ex.: o lead já enviado).
    try {
      params = params || {};
      // Lead confirmado pelo servidor e clique de contato já provam interação.
      if (evento === 'generate_lead' || evento === 'contact') liberar();
      if (liberado) registrar(evento, params, usuario); else fila.push([evento, params, usuario]);
    } catch (e) { /* ignora */ }
  };

  // Início de preenchimento, uma vez por formulário. Os ids dos campos são os
  // dos formulários de Contato (lead-*) e do modal da home (modal-*).
  var iniciados = {};
  d.addEventListener('focusin', function (e) {
    var id = (e.target && e.target.id) || '';
    var form = /^lead-/.test(id) ? 'contato' : /^modal-/.test(id) ? 'diagnostico_home' : /^amz-/.test(id) ? 'vender_amazon' : /^tts-/.test(id) ? 'vender_tiktok' : '';
    if (form && !iniciados[form]) { iniciados[form] = 1; w.omTrack('lead_form_start', { form_id: form }); }
  }, true);

  function aoClicar(e) {
    if (e.isTrusted === false) return; // clique disparado por script não conta
    if (e.type === 'auxclick' && e.button !== 1) return; // botão do meio abre em nova aba
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var metodo = /^https?:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com|tintim\.link|s\.tintim\.app)\//i.test(href) ? 'whatsapp'
      : /^mailto:/i.test(href) ? 'email'
      : /^tel:/i.test(href) ? 'telefone' : '';
    // Falha aqui não pode impedir a conversa: o link original segue valendo.
    if (metodo === 'whatsapp') { try { levarOrigem(a, href); } catch (err) { /* ignora */ } }
    if (metodo) w.omTrack('contact', { method: metodo });
  }
  d.addEventListener('click', aoClicar, true);
  d.addEventListener('auxclick', aoClicar, true);

  if (!ativo) return;

  // GTM no carregamento da página, como o snippet padrão do Google (gtm.start
  // antes do gtm.js). O script é async: não bloqueia a renderização. Só chega
  // aqui no domínio oficial e sem robô declarado. As tags do contêiner passam a
  // disparar no carregamento, sem esperar o primeiro sinal humano.
  if (C.gtm) {
    dl.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    carregar('https://www.googletagmanager.com/gtm.js?id=' + C.gtm);
  }

  // O gtag.js já carrega (sem enviar nada) para o config ser processado no
  // instante do primeiro sinal — inclusive o gclid, quando esse sinal é um
  // clique que já navega para outra página.
  if (C.ga4 || C.ads) {
    gtag('js', new Date());
    carregar('https://www.googletagmanager.com/gtag/js?id=' + (C.ga4 || C.ads));
  }

  // Pixel da Meta, no mesmo esquema do gtag: o script já carrega, sem enviar nada,
  // e o PageView sai no primeiro sinal humano. Mesma fila do snippet padrão da Meta.
  if (C.metaPixel) {
    fbq = function () { fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments); };
    w.fbq = w._fbq = fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    carregar('https://connect.facebook.net/en_US/fbevents.js');
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
