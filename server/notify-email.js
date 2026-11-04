import nodemailer from 'nodemailer';
import { FATURAMENTOS, FATURAMENTOS_AMAZON, OFERTAS_AMAZON, OFERTAS_TIKTOK } from './qualificacao.js';

const PAGINAS = { amazon: 'Vender na Amazon', tiktok: 'Vender no TikTok Shop' };
const OFERTAS = { ...OFERTAS_AMAZON, ...OFERTAS_TIKTOK };

export function montarMensagem(lead) {
  const amazon = lead.programa === 'amazon';
  const pagina = PAGINAS[lead.programa];
  const faixa = (amazon ? FATURAMENTOS_AMAZON : FATURAMENTOS)[lead.faturamento];
  const linhas = [
    `Nome: ${lead.nome}`,
    `E-mail: ${lead.email}`,
    pagina ? `Página: ${pagina} (${lead.qualificado ? 'qualificado' : 'fora do perfil'}: ${lead.motivo})` : null,
    amazon && lead.uf ? `Estado: ${lead.uf}` : null,
    pagina && faixa ? `Faturamento mensal: ${faixa}` : null,
    pagina && OFERTAS[lead.oferta] ? `Oferta: ${OFERTAS[lead.oferta]}` : null,
    lead.empresa  ? `Empresa: ${lead.empresa}`   : null,
    lead.whatsapp ? `WhatsApp: ${lead.whatsapp}` : null,
    lead.canais   ? `Canais: ${lead.canais}`     : null,
    lead.mensagem ? `Precisa de: ${lead.mensagem}` : null,
  ].filter(Boolean);

  return {
    from: process.env.SMTP_USER,
    to: process.env.LEAD_EMAIL_TO,
    replyTo: lead.email,
    subject: `Novo lead pelo site${pagina ? ` (${pagina})` : ''} — ${lead.nome}`,
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
