export async function enviarSlack(lead) {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) throw new Error('SLACK_WEBHOOK_URL não configurada');

  const linhas = [
    '*Novo lead pelo site*',
    `*Nome:* ${lead.nome}`,
    `*E-mail:* ${lead.email}`,
    lead.empresa  ? `*Empresa:* ${lead.empresa}`   : null,
    lead.whatsapp ? `*WhatsApp:* ${lead.whatsapp}` : null,
    lead.canais   ? `*Canais:* ${lead.canais}`     : null,
    lead.mensagem ? `*Precisa de:* ${lead.mensagem}` : null,
  ].filter(Boolean);

  const resposta = await fetch(webhook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: linhas.join('\n') }),
  });

  if (!resposta.ok) throw new Error(`Slack respondeu ${resposta.status}`);
}
