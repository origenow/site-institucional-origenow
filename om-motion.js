/* Origenow — micro-interações. Estado de entrada, contadores, âncoras e normalização de tempo. Sem CSS de layout. */
(function () {
  var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EASE = 'cubic-bezier(.2,.7,.2,1)';
  var DUR = { fast: 0.22, base: 0.28, slow: 0.42 };   // um só vocabulário de duração
  var waiting = [];   // {el, kids}
  var counters = [];

  function clear(el) {
    el.style.opacity = '';
    el.style.transform = '';
    el.style.transition = '';
    el.style.transitionDelay = '';
    el.style.willChange = '';
  }

  function show(item) {
    var el = item.el, kids = item.kids || [];
    el.setAttribute('data-om-rv', 'done');
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
    kids.forEach(function (k, i) {
      k.style.transitionDelay = (0.06 + i * 0.06) + 's';
      k.style.opacity = '1';
      k.style.transform = 'translateY(0)';
    });
    setTimeout(function () { clear(el); kids.forEach(clear); }, 1250);
  }

  function findGrid(el) {
    var c = el.querySelectorAll('div');
    for (var n = 0; n < c.length && n < 30; n++) {
      var cs = getComputedStyle(c[n]);
      if (cs.display === 'grid' && cs.gridTemplateColumns.split(' ').length > 1 && c[n].children.length > 2) return c[n];
    }
    return null;
  }

  function arm(el) {
    if (el.getAttribute('data-om-rv')) return;
    var vh = window.innerHeight || 800;
    if (RM || el.getBoundingClientRect().top < vh * 0.92) { el.setAttribute('data-om-rv', 'done'); return; }
    el.setAttribute('data-om-rv', 'wait');
    el.style.opacity = '0';
    el.style.transform = 'translateY(14px)';
    el.style.transition = 'opacity .7s ' + EASE + ', transform .8s ' + EASE;
    el.style.willChange = 'opacity, transform';
    var item = { el: el, kids: null };
    var grid = findGrid(el);
    if (grid) {
      item.kids = [].slice.call(grid.children);
      item.kids.forEach(function (k) {
        k.style.opacity = '0';
        k.style.transform = 'translateY(10px)';
        k.style.transition = 'opacity .6s ' + EASE + ', transform .68s ' + EASE;
      });
      el.style.transform = 'translateY(8px)';
    }
    waiting.push(item);
  }

  function count(el) {
    var raw = el.getAttribute('data-om-count');
    var target = parseFloat(raw);
    el.setAttribute('data-om-count-done', '1');
    if (isNaN(target)) return;
    el.style.fontVariantNumeric = 'tabular-nums';
    if (RM) return;
    var dec = (raw.split('.')[1] || '').length, t0 = null;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / 1150);
      el.textContent = (target * (1 - Math.pow(1 - p, 3))).toFixed(dec);
      if (p < 1) requestAnimationFrame(step);
    }
    el.textContent = (0).toFixed(dec);
    requestAnimationFrame(step);
  }

  /* laço geométrico: independe de IntersectionObserver (iframes/preview) */
  var last = 0;
  function tick(ts) {
    if (ts - last > 90) {
      last = ts;
      var vh = window.innerHeight || 800;
      for (var i = waiting.length - 1; i >= 0; i--) {
        var r = waiting[i].el.getBoundingClientRect();
        if (r.top < vh * 0.9 && r.bottom > 0) { show(waiting[i]); waiting.splice(i, 1); }
      }
      for (var j = counters.length - 1; j >= 0; j--) {
        var cr = counters[j].getBoundingClientRect();
        if (cr.top < vh * 0.85 && cr.bottom > 0) { count(counters[j]); counters.splice(j, 1); }
      }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  /* ---------- barra de progresso de leitura ---------- */
  function progress() {
    var site = document.getElementById('om-site');
    if (!site || !site.hasAttribute('data-om-progress') || document.getElementById('om-progress')) return;
    var bar = document.createElement('span');
    bar.id = 'om-progress';
    bar.style.cssText = 'position:fixed;top:0;left:0;height:2px;width:0;z-index:60;background:#e62c7c;pointer-events:none;transition:width .12s linear';
    document.body.appendChild(bar);
    function upd() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? Math.min(1, Math.max(0, (window.scrollY || 0) / h)) : 0;
      bar.style.width = (p * 100).toFixed(2) + '%';
    }
    window.addEventListener('scroll', upd, { passive: true });
    upd();
  }

  /* ---------- sublinhado que corre no menu ---------- */
  function navSweep() {
    var items = document.querySelectorAll('header[data-om-header] nav a, header[data-om-header] nav > span');
    items.forEach(function (el) {
      if (el.__omSw) return;
      el.__omSw = 1;
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      var u = document.createElement('span');
      u.style.cssText = 'position:absolute;left:0;right:0;bottom:-2px;height:1.5px;background:rgba(255,255,255,.55);transform:scaleX(0);transform-origin:left;transition:transform .3s ' + EASE + ';display:block;pointer-events:none';
      el.appendChild(u);
      el.addEventListener('mouseenter', function () { u.style.transformOrigin = 'left'; u.style.transform = 'scaleX(1)'; });
      el.addEventListener('mouseleave', function () { u.style.transformOrigin = 'right'; u.style.transform = 'scaleX(0)'; });
    });
  }

  /* ---------- linhas de resultado: seta desliza ---------- */
  function rows() {
    document.querySelectorAll('[data-om-row]').forEach(function (el) {
      if (el.__omRow) return;
      el.__omRow = 1;
      var arw = el.lastElementChild;
      if (arw) arw.style.transition = 'transform .24s ' + EASE + ', color .24s ease';
      var first = el.firstElementChild;
      if (first) first.style.transition = 'transform .24s ' + EASE;
      el.addEventListener('mouseenter', function () {
        if (arw) { arw.style.transform = 'translateX(6px)'; arw.style.color = '#6730be'; }
        if (first) first.style.transform = 'translateX(6px)';
      });
      el.addEventListener('mouseleave', function () {
        if (arw) { arw.style.transform = 'translateX(0)'; arw.style.color = ''; }
        if (first) first.style.transform = 'translateX(0)';
      });
    });
  }

  /* ---------- FAQ acordeão ---------- */
  function faq() {
    document.querySelectorAll('[data-om-faq-q]').forEach(function (q) {
      if (q.__omFaq) return;
      q.__omFaq = 1;
      var item = q.parentElement;
      var ans = item.querySelector('[data-om-faq-a]');
      var bar = q.querySelector('[data-om-faq-bar]');
      var lbl = q.firstElementChild;
      if (lbl) lbl.style.transition = 'color .2s ease';
      q.addEventListener('mouseenter', function () { if (lbl && !item.__open) lbl.style.color = '#6730be'; });
      q.addEventListener('mouseleave', function () { if (lbl && !item.__open) lbl.style.color = '#14111e'; });
      q.addEventListener('click', function () {
        var group = q.closest('[data-om-faq]');
        if (group) group.querySelectorAll('[data-om-faq-a]').forEach(function (o) {
          if (o === ans || !o.parentElement.__open) return;
          o.style.height = '0px';
          o.parentElement.__open = false;
          var b = o.parentElement.querySelector('[data-om-faq-bar]');
          if (b) { b.style.transform = 'none'; b.style.opacity = '1'; }
          var l = o.parentElement.querySelector('[data-om-faq-q]').firstElementChild;
          if (l) l.style.color = '#14111e';
        });
        item.__open = !item.__open;
        ans.style.height = item.__open ? ans.scrollHeight + 'px' : '0px';
        if (bar) { bar.style.transform = item.__open ? 'rotate(90deg)' : 'none'; bar.style.opacity = item.__open ? '0' : '1'; }
        if (lbl) lbl.style.color = item.__open ? '#6730be' : '#14111e';
      });
    });
  }

  /* ---------- filtro de cards ---------- */
  function filters() {
    document.querySelectorAll('[data-om-filter]').forEach(function (g) {
      if (g.__omF) return;
      g.__omF = 1;
      var btns = [].slice.call(g.querySelectorAll('[data-om-filter-val]'));
      var target = document.querySelector('[data-om-filter-target]');
      if (!target) return;
      var cards = [].slice.call(target.children);
      cards.forEach(function (c) { c.style.transition = 'opacity .3s ease, transform .34s ' + EASE; });
      btns.forEach(function (b) {
        b.addEventListener('click', function () {
          var v = b.getAttribute('data-om-filter-val');
          btns.forEach(function (o) {
            var on = o === b;
            o.style.borderColor = on ? '#14111e' : '#e6e2ec';
            o.style.color = on ? '#14111e' : '#56506a';
            o.style.background = on ? '#faf9fb' : 'transparent';
          });
          cards.forEach(function (c, i) {
            var keep = v === 'all' || c.getAttribute('data-om-cat') === v;
            if (keep) {
              c.style.display = '';
              requestAnimationFrame(function () { c.style.opacity = '1'; c.style.transform = 'translateY(0)'; });
            } else {
              c.style.opacity = '0';
              c.style.transform = 'translateY(10px)';
              setTimeout(function () { if (c.style.opacity === '0') c.style.display = 'none'; }, 300);
            }
          });
        });
      });
    });
  }

  /* ---------- normalizador de tempo ----------
     O site foi escrito ao longo de muitas rodadas e acumulou 28 combinações de
     duração/curva para os mesmos gestos. Aqui tudo cai em três degraus e numa
     única curva de saída. Idempotente: rodar de novo não desloca os valores. */
  function splitTop(v) {
    var out = [], depth = 0, cur = '';
    for (var i = 0; i < v.length; i++) {
      var ch = v[i];
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ',' && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
    }
    if (cur.trim()) out.push(cur);
    return out;
  }

  function bucket(sec) {
    if (sec === DUR.fast || sec === DUR.base || sec === DUR.slow) return sec;
    if (sec <= 0.2) return DUR.fast;    // cor, fundo, borda
    if (sec < 0.32) return DUR.base;    // cards, logos, transform
    if (sec <= 0.5) return DUR.slow;    // acordeão, filtros
    return sec;                          // entradas e carrossel ficam longos de propósito
  }

  function normalize(el) {
    if (el.id === 'om-progress' || el.getAttribute('data-om-rv') === 'wait' || el.getAttribute('data-om-norm-done')) return;
    el.setAttribute('data-om-norm-done', '1');
    var t = el.style && el.style.transition;
    if (!t || t.indexOf('s') < 0) return;
    var changed = false;
    var out = splitTop(t).map(function (part) {
      var s = part.trim();
      if (!s) return null;
      var m = s.match(/(-?[\d.]+)s(?!\w)/);
      if (!m) return s;
      var nd = bucket(parseFloat(m[1]));
      var next = s.replace(/(-?[\d.]+)s(?!\w)/, nd + 's');
      if (!/cubic-bezier|steps/.test(next)) {
        next = /\b(ease-in-out|ease-out|ease-in|ease|linear)\b/.test(next)
          ? next.replace(/\b(ease-in-out|ease-out|ease-in|ease|linear)\b/, EASE)
          : next + ' ' + EASE;
      }
      if (next !== s) changed = true;
      return next;
    }).filter(Boolean);
    if (changed) el.style.transition = out.join(', ');
  }

  function normalizeAll() {
    var els = document.querySelectorAll('[style*="transition"]');
    for (var i = 0; i < els.length; i++) normalize(els[i]);
  }

  /* ---------- esmaecimento de imagem na entrada ---------- */
  function fades() {
    document.querySelectorAll('[data-om-fade]:not([data-om-fade-done])').forEach(function (el) {
      el.setAttribute('data-om-fade-done', '1');
      if (RM) return;
      var target = el.style.opacity || '1';
      function go() {
        el.style.opacity = '0';
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            el.style.transition = 'opacity 1.05s ' + EASE;
            el.style.opacity = target;
            setTimeout(function () { el.style.transition = ''; }, 1300);
          });
        });
      }
      if (el.tagName === 'IMG' && !el.complete) el.addEventListener('load', go, { once: true });
      else go();
    });
  }

  /* ---------- paredes de logo: um só gesto em todo o site ----------
     Logo em lista/faixa nasce esmaecido e ganha cor quando a linha é percorrida.
     Como o gatilho é a linha inteira e não a imagem, isso não cabe em style-hover. */
  function logoWalls() {
    document.querySelectorAll('[data-om-logo]:not([data-om-logo-done])').forEach(function (img) {
      img.setAttribute('data-om-logo-done', '1');
      var row = img.closest('[data-om-grid="rows"]') || img.parentElement;
      if (!row) return;
      img.style.filter = 'grayscale(1)';
      img.style.opacity = '.5';
      img.style.transition = 'filter ' + DUR.base + 's ' + EASE + ', opacity ' + DUR.base + 's ' + EASE;
      if (RM) return;
      row.addEventListener('mouseenter', function () { img.style.filter = 'grayscale(0)'; img.style.opacity = '1'; });
      row.addEventListener('mouseleave', function () { img.style.filter = 'grayscale(1)'; img.style.opacity = '.5'; });
    });
  }

  function scan() {
    var site = document.getElementById('om-site');
    if (site) [].slice.call(site.children).forEach(function (el) {
      if (el.getAttribute('data-om-motion') === 'off') return;
      if (el.querySelector && el.querySelector('[data-om-header]')) return;
      arm(el);
    });
    document.querySelectorAll('[data-om-count]:not([data-om-count-done])').forEach(function (el) {
      if (counters.indexOf(el) < 0) counters.push(el);
    });
    document.querySelectorAll('[id]').forEach(function (el) {
      if (!el.style.scrollMarginTop) el.style.scrollMarginTop = '112px';
    });
    progress();
    navSweep();
    rows();
    faq();
    filters();
    fades();
    logoWalls();
    normalizeAll();
  }

  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a[href^="#"]');
    if (!a) return;
    var t = document.getElementById(a.getAttribute('href').slice(1));
    if (!t) return;
    ev.preventDefault();
    window.scrollTo({ top: t.getBoundingClientRect().top + (window.scrollY || 0) - 104, behavior: RM ? 'auto' : 'smooth' });
  });

  var mo = new MutationObserver(function () { clearTimeout(mo._t); mo._t = setTimeout(scan, 100); });
  mo.observe(document.documentElement, { childList: true, subtree: true });
  scan();
  setTimeout(scan, 500);
  setTimeout(function () { mo.disconnect(); scan(); }, 6000);
})();
