import { test } from 'node:test';
import assert from 'node:assert/strict';
import { montarMensagem } from '../notify-email.js';

const LEAD = {
  nome: 'Maria Souza', email: 'maria@empresa.com.br', empresa: 'Empresa X',
  whatsapp: '(31) 99999-0000', canais: 'Mercado Livre', mensagem: 'Quero escalar.',
};

test('monta a mensagem com assunto e corpo do lead', () => {
  process.env.LEAD_EMAIL_TO = 'contato@origenow.com.br';
  process.env.SMTP_USER = 'contato@origenow.com.br';

  const msg = montarMensagem(LEAD);

  assert.equal(msg.to, 'contato@origenow.com.br');
  assert.equal(msg.replyTo, 'maria@empresa.com.br');
  assert.match(msg.subject, /Maria Souza/);
  assert.match(msg.text, /Mercado Livre/);
  assert.match(msg.text, /Quero escalar\./);
});

test('omite campos opcionais vazios', () => {
  process.env.LEAD_EMAIL_TO = 'contato@origenow.com.br';
  process.env.SMTP_USER = 'contato@origenow.com.br';

  const msg = montarMensagem({ nome: 'João', email: 'joao@x.com' });

  assert.doesNotMatch(msg.text, /WhatsApp/);
  assert.doesNotMatch(msg.text, /Canais/);
});
