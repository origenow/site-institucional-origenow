import { test } from 'node:test';
import assert from 'node:assert/strict';
import { qualificarAmazon } from '../qualificacao.js';
import { validar } from '../lead-route.js';
import { montarMensagem } from '../notify-email.js';
import { extrairFaq, jsonLd, tipoDaPagina } from '../../build/structured-data.js';

const BASE = { nome: 'Maria', email: 'maria@empresa.com.br', programa: 'amazon' };

test('o faturamento define a oferta de consultoria', () => {
  assert.equal(qualificarAmazon({ faturamento: 'acima-250' }).oferta, 'consultoria-gratuita');
  assert.equal(qualificarAmazon({ faturamento: '150-250' }).oferta, 'a-definir');
  assert.equal(qualificarAmazon({ faturamento: '50-150' }).oferta, 'consultoria-desconto');
  assert.equal(qualificarAmazon({ faturamento: 'ate-50' }).oferta, 'consultoria-desconto');
});

test('conversao segue a regua de R$ 50 mil/mes', () => {
  for (const faturamento of ['50-150', '150-250', 'acima-250']) {
    assert.equal(qualificarAmazon({ faturamento }).qualificado, true, faturamento);
  }
  assert.equal(qualificarAmazon({ faturamento: 'ate-50' }).qualificado, false);
});

test('o estado nao limita a oferta nem a qualificacao', () => {
  for (const uf of ['SP', 'MG']) {
    const { lead } = validar({ ...BASE, uf, faturamento: 'acima-250' });
    assert.equal(lead.uf, uf);
    assert.equal(lead.oferta, 'consultoria-gratuita');
    assert.equal(lead.qualificado, true);
  }
});

test('sem faturamento valido nao qualifica e nao promete consultoria', () => {
  assert.deepEqual(qualificarAmazon({ faturamento: '' }), { qualificado: false, motivo: 'perfil não informado', oferta: 'a-definir' });
});

test('as regras da Amazon nao alteram o formulario de contato', () => {
  const contato = validar({ nome: 'Ana', email: 'ana@x.com', tipo: 'lojista', faturamento: '50-200', uf: 'RJ' }).lead;
  assert.equal(contato.qualificado, true);
  assert.equal(contato.uf, undefined);
  assert.equal(contato.programa, undefined);
  assert.equal(contato.oferta, undefined);
});

test('validar descarta estado e faixa fora da lista', () => {
  const { lead } = validar({ ...BASE, uf: '<!channel>', faturamento: '50-200' });
  assert.equal(lead.uf, '');
  assert.equal(lead.faturamento, '');
  assert.equal(lead.qualificado, false);
});

test('e-mail ao comercial traz estado, faixa e oferta', () => {
  const { lead } = validar({ ...BASE, uf: 'BA', faturamento: 'acima-250' });
  const msg = montarMensagem(lead);
  assert.match(msg.subject, /Vender na Amazon/);
  assert.match(msg.text, /Estado: BA/);
  assert.match(msg.text, /Mais de R\$ 250 mil/);
  assert.match(msg.text, /Oferta: Consultoria gratuita/);
});

test('e-mail de lead comum nao ganha campos da Amazon', () => {
  const msg = montarMensagem({ nome: 'João', email: 'joao@x.com' });
  assert.doesNotMatch(msg.subject, /Amazon/);
  assert.doesNotMatch(msg.text, /Estado|Página|Oferta/);
});

test('a pagina e classificada como servico e publica o FAQ da propria fonte', () => {
  assert.equal(tipoDaPagina('/vender-na-amazon'), 'servico');
  const html = '<div data-om-faq-q="1" style="x"><span style="y">Pergunta?</span><span></span></div>'
    + '<div data-om-faq-a="1" style="z"><p style="w">Resposta.</p></div>';
  const faq = extrairFaq(html);
  assert.deepEqual(faq, [{ pergunta: 'Pergunta?', resposta: 'Resposta.' }]);

  const ld = jsonLd({ site: 'https://x', url: '/vender-na-amazon', titulo: 'T · O', descricao: 'D', tipo: 'servico', faq });
  assert.match(ld, /"FAQPage"/);
  assert.match(ld, /"Service"/);
  assert.match(ld, /Pergunta\?/);
});

test('sem FAQ nao publica FAQPage', () => {
  assert.doesNotMatch(jsonLd({ site: 'https://x', url: '/servicos', titulo: 'T', descricao: 'D', tipo: 'institucional' }), /FAQPage/);
});
