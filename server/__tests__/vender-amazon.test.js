import { test } from 'node:test';
import assert from 'node:assert/strict';
import { qualificarAmazon } from '../qualificacao.js';
import { validar } from '../lead-route.js';
import { montarMensagem } from '../notify-email.js';
import { extrairFaq, jsonLd, tipoDaPagina } from '../../build/structured-data.js';

const BASE = { nome: 'Maria', email: 'maria@empresa.com.br', programa: 'amazon' };

test('fora de SP e acima de R$ 120 mil/mes passa no crivo', () => {
  for (const faturamento of ['120-500', 'acima-500']) {
    assert.equal(qualificarAmazon({ uf: 'MG', faturamento }).qualificado, true, faturamento);
  }
});

test('ate R$ 120 mil/mes nao passa, em qualquer estado', () => {
  for (const faturamento of ['ate-50', '50-120']) {
    assert.deepEqual(qualificarAmazon({ uf: 'MG', faturamento }), { qualificado: false, motivo: 'fatura até R$ 120 mil/mês' });
  }
});

test('empresa em SP nao entra no programa, mesmo faturando acima do corte', () => {
  assert.deepEqual(qualificarAmazon({ uf: 'SP', faturamento: 'acima-500' }), { qualificado: false, motivo: 'empresa em SP, fora do programa' });
});

test('sem estado ou faturamento validos nao passa', () => {
  assert.equal(qualificarAmazon({ uf: '', faturamento: '120-500' }).motivo, 'perfil não informado');
  assert.equal(qualificarAmazon({ uf: 'MG', faturamento: '' }).motivo, 'perfil não informado');
});

test('validar aplica o crivo da Amazon so para esse programa', () => {
  const { lead } = validar({ ...BASE, uf: 'RJ', faturamento: '120-500' });
  assert.equal(lead.programa, 'amazon');
  assert.equal(lead.uf, 'RJ');
  assert.equal(lead.qualificado, true);

  // A faixa de R$ 50 a 200 mil é do Contato, e lá continua qualificada.
  const contato = validar({ nome: 'Ana', email: 'ana@x.com', tipo: 'lojista', faturamento: '50-200', uf: 'RJ' }).lead;
  assert.equal(contato.qualificado, true);
  assert.equal(contato.uf, undefined);
  assert.equal(contato.programa, undefined);
});

test('validar descarta estado e faixa fora da lista', () => {
  const { lead } = validar({ ...BASE, uf: '<!channel>', faturamento: '50-200' });
  assert.equal(lead.uf, '');
  assert.equal(lead.faturamento, '');
  assert.equal(lead.qualificado, false);
});

test('e-mail ao comercial traz estado, faixa e resultado do crivo', () => {
  const { lead } = validar({ ...BASE, uf: 'BA', faturamento: 'acima-500' });
  const msg = montarMensagem(lead);
  assert.match(msg.subject, /Vender na Amazon/);
  assert.match(msg.text, /Estado: BA/);
  assert.match(msg.text, /Mais de R\$ 500 mil/);
  assert.match(msg.text, /qualificado/);
});

test('e-mail de lead comum nao ganha campos da Amazon', () => {
  const msg = montarMensagem({ nome: 'João', email: 'joao@x.com' });
  assert.doesNotMatch(msg.subject, /Amazon/);
  assert.doesNotMatch(msg.text, /Estado|Página/);
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
