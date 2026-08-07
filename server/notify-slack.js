// Notificação de lead no Slack. Suporta duas formas, nesta ordem de precedência:
//
//   1. SLACK_WEBHOOK_URL  — Incoming Webhook (recomendado). URL única, não
//      expira, isolada. Zero acoplamento com os agentes.
//   2. SLACK_BOT_TOKEN (+ SLACK_CHANNEL_ID) — reaproveita o app Slack dos
//      agentes via chat.postMessage. ATENÇÃO: se o app tiver rotação de token
//      ligada (o claude-agency tem), o xoxb expira em ~12h e as notificações
//      param em silêncio. Só use um token estático se a rotação estiver
//      desligada para esse app.

function formatar(lead) {
  return [
    '*Novo lead pelo site*',
    `*Nome:* ${lead.nome}`,
    `*E-mail:* ${lead.email}`,
    lead.empresa  ? `*Empresa:* ${lead.empresa}`     : null,
    lead.whatsapp ? `*WhatsApp:* ${lead.whatsapp}`   : null,
    lead.canais   ? `*Canais:* ${lead.canais}`       : null,
    lead.mensagem ? `*Precisa de:* ${lead.mensagem}` : null,
  ].filter(Boolean).join('\n');
}

export async function enviarSlack(lead) {
  const texto = formatar(lead);
  const webhook = process.env.SLACK_WEBHOOK_URL;
  const botToken = process.env.SLACK_BOT_TOKEN;

  if (webhook) {
    const r = await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: texto }),
    });
    if (!r.ok) throw new Error(`Slack respondeu ${r.status}`);
    return;
  }

  if (botToken) {
    const canal = process.env.SLACK_CHANNEL_ID || process.env.SLACK_CHANNEL;
    if (!canal) throw new Error('SLACK_CHANNEL_ID não configurada');
    const r = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8', authorization: `Bearer ${botToken}` },
      body: JSON.stringify({ channel: canal, text: texto }),
    });
    // A Web API responde 200 mesmo em erro lógico; o campo ok diz a verdade.
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.ok) throw new Error(`Slack respondeu ${r.status}${data.error ? ` (${data.error})` : ''}`);
    return;
  }

  throw new Error('SLACK_WEBHOOK_URL ou SLACK_BOT_TOKEN não configurada');
}
