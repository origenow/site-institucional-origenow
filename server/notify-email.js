import nodemailer from 'nodemailer';
import { FATURAMENTOS_AMAZON } from './qualificacao.js';

export function montarMensagem(lead) {
  const amazon = lead.programa === 'amazon';
  const linhas = [
    `Nome: ${lead.nome}`,
    `E-mail: ${lead.email}`,
    amazon ? `Página: Vender na Amazon (${lead.qualificado ? 'qualificado' : 'fora do perfil'}: ${lead.motivo})` : null,
    amazon && lead.uf ? `Estado: ${lead.uf}` : null,
    amazon && FATURAMENTOS_AMAZON[lead.faturamento] ? `Faturamento total: ${FATURAMENTOS_AMAZON[lead.faturamento]}` : null,
    lead.empresa  ? `Empresa: ${lead.empresa}`   : null,
    lead.whatsapp ? `WhatsApp: ${lead.whatsapp}` : null,
    lead.canais   ? `Canais: ${lead.canais}`     : null,
    lead.mensagem ? `Precisa de: ${lead.mensagem}` : null,
  ].filter(Boolean);

  return {
    from: process.env.SMTP_USER,
    to: process.env.LEAD_EMAIL_TO,
    replyTo: lead.email,
    subject: `Novo lead pelo site${amazon ? ' (Vender na Amazon)' : ''} — ${lead.nome}`,
    text: linhas.join('\n'),
  };
}

export function criarTransporte() {
  for (const chave of ['SMTP_USER', 'SMTP_PASS', 'LEAD_EMAIL_TO']) {
    if (!process.env[chave]) throw new Error(`${chave} não configurada`);
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.zoho.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

export async function enviarEmail(lead) {
  await criarTransporte().sendMail(montarMensagem(lead));
}
