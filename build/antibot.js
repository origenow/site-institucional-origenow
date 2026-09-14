// Lado do navegador do antibot do lead (a verificação fica em server/antibot.js).
//
// O build injeta este script no <head> de todas as páginas. No primeiro foco
// num campo de lead ele busca um token assinado em GET /api/lead/token. No
// envio, window.omEnviarLead(lead) espera o tempo mínimo desde a emissão, manda
// o token junto e, se o servidor pedir (token vencido, deploy no meio do
// preenchimento), renova e reenvia uma vez — nada disso aparece para quem envia.

/* Roda no navegador. É serializado com toString(): não pode usar nada de fora. */
function omAntibot() {
  var w = window, d = document;
  var token = null, recebidoEm = 0, minimoMs = 0, validadeMs = 0, pedido = null;

  function buscar() {
    token = null;
    pedido = fetch('/api/lead/token', { cache: 'no-store', credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j || !j.token) return;
        token = j.token;
        recebidoEm = Date.now();
        minimoMs = j.minimoMs || 0;
        validadeMs = j.validadeMs || 0;
      })
      .catch(function () { /* sem rede: o envio falha e o formulário mostra o erro */ })
      .then(function () { pedido = null; });
    return pedido;
  }

  // O relógio do tempo mínimo começa no primeiro foco em campo de lead:
  // lead-* no Contato, modal-* no diagnóstico da home.
  d.addEventListener('focusin', function (e) {
    var id = (e.target && e.target.id) || '';
    if (/^(lead|modal)-/.test(id) && !token && !pedido) buscar();
  }, true);

  function obterToken(renovar) {
    var vencendo = validadeMs && Date.now() - recebidoEm > validadeMs - 5 * 60 * 1000;
    var pronto = renovar || vencendo || (!token && !pedido) ? buscar() : (pedido || Promise.resolve());
    return pronto.then(function () {
      var falta = minimoMs + 150 - (Date.now() - recebidoEm);
      return new Promise(function (ok) { setTimeout(ok, Math.max(0, falta)); });
    }).then(function () { return token; });
  }

  w.omEnviarLead = function (lead) {
    function tentar(renovar) {
      return obterToken(renovar).then(function (t) {
        return fetch('/api/lead', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(Object.assign({}, lead, { token: t || '' })),
        });
      }).then(function (r) {
        return r.json()
          .catch(function () { return {}; })
          .then(function (corpo) { return { ok: r.ok, status: r.status, corpo: corpo }; });
      });
    }
    return tentar(false).then(function (res) {
      return !res.ok && res.corpo.codigo === 'token' ? tentar(true) : res;
    });
  };
}

/** Bloco para o <head>. */
export function headAntibot() {
  return `<script id="om-antibot">(${omAntibot.toString()})();</script>`;
}
