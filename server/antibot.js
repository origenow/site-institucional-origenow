// Antibot do formulário de lead: camadas baratas e invisíveis para quem é
// gente (nenhum CAPTCHA), somadas ao honeypot (lead-route.js) e ao rate limit
// (app.js):
//
//   1. Origin — o POST precisa sair de uma página do próprio site.
//   2. User-Agent — automação e crawlers declarados (bots.js).
//   3. Token assinado — emitido em GET /api/lead/token quando o visitante começa
//      a preencher; o envio só vale entre minimoMs e validadeMs após a emissão.
//      Script que posta direto na API fica sem token; o que busca o token e
//      posta na hora cai no tempo mínimo.
//   4. Conteúdo — link no nome ou mensagem cheia de links.
//
// Descarte de bot responde 200, como o honeypot, para não ensinar o que foi
// detectado. Só token ausente ou vencido responde erro, porque pode ser gente
// com a página aberta desde antes de um deploy: o navegador renova e reenvia
// sozinho (build/antibot.js).
//
// ANTIBOT_SECRET é opcional: sem ele, cada processo sorteia o seu segredo e um
// deploy invalida os tokens em aberto — o reenvio automático cobre. Defina-o
// se o serviço passar a rodar com mais de uma réplica.

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { pareceBot } from './bots.js';

const MINIMO_MS = 2500;
const VALIDADE_MS = 2 * 60 * 60 * 1000;

export function criarAntibot({
  segredo = process.env.ANTIBOT_SECRET || randomBytes(32).toString('hex'),
  minimoMs = Number(process.env.ANTIBOT_MIN_MS) || MINIMO_MS,
  validadeMs = VALIDADE_MS,
  agora = Date.now,
} = {}) {
  const assinar = (dados) => createHmac('sha256', segredo).update(dados).digest('base64url');

  function emitir() {
    const dados = `${agora()}.${randomBytes(9).toString('base64url')}`;
    return `${dados}.${assinar(dados)}`;
  }

  /** @returns {'ok' | 'invalido' | 'rapido' | 'expirado'} */
  function verificar(token) {
    const partes = typeof token === 'string' ? token.split('.') : [];
    if (partes.length !== 3) return 'invalido';
    const [ts, nonce, assinatura] = partes;

    const esperada = Buffer.from(assinar(`${ts}.${nonce}`));
    const recebida = Buffer.from(assinatura);
    if (recebida.length !== esperada.length || !timingSafeEqual(recebida, esperada)) return 'invalido';

    const idade = agora() - Number(ts);
    if (!(idade >= 0)) return 'invalido';
    if (idade < minimoMs) return 'rapido';
    if (idade > validadeMs) return 'expirado';
    return 'ok';
  }

  function rotaToken(req, res) {
    res.set('Cache-Control', 'no-store');
    res.json({ token: emitir(), minimoMs, validadeMs });
  }

  function descartar(res, motivo) {
    console.warn(`Lead descartado pelo antibot: ${motivo}`);
    return res.status(200).json({ ok: true });
  }

  function verificarLead(req, res, next) {
    let hostOrigem = '';
    try { hostOrigem = new URL(req.get('origin')).hostname.toLowerCase(); } catch { /* ausente ou malformado */ }
    if (!hostOrigem || hostOrigem !== (req.hostname || '').toLowerCase()) {
      return res.status(403).json({ erro: 'Envio não permitido.' });
    }

    if (pareceBot(req.get('user-agent'))) return descartar(res, 'user-agent de automação');

    const estado = verificar(req.body?.token);
    if (estado === 'rapido') return descartar(res, 'enviado rápido demais');
    if (estado !== 'ok') {
      return res.status(400).json({
        erro: 'Sua sessão expirou. Atualize a página e envie novamente.',
        codigo: 'token',
      });
    }

    const nome = String(req.body?.nome ?? '');
    const mensagem = String(req.body?.mensagem ?? '');
    if (/https?:\/\/|www\./i.test(nome)) return descartar(res, 'link no nome');
    if ((mensagem.match(/https?:\/\//gi) || []).length >= 3) return descartar(res, 'links demais na mensagem');

    return next();
  }

  return { emitir, verificar, rotaToken, verificarLead };
}
