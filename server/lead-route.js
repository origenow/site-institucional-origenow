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
