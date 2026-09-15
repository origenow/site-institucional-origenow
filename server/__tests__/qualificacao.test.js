import { test } from 'node:test';
import assert from 'node:assert/strict';
import { qualificar } from '../qualificacao.js';

test('fatura a partir de R$ 50 mil/mes e qualificado, qualquer tipo', () => {
  for (const faturamento of ['50-200', '200-1000', 'acima-1000']) {
    assert.equal(qualificar({ tipo: 'lojista', faturamento }).qualificado, true, faturamento);
  }
});

test('industria ou marca que ainda nao vende e qualificada (entrante)', () => {
  assert.equal(qualificar({ tipo: 'industria', faturamento: 'nao-vende' }).qualificado, true);
  assert.equal(qualificar({ tipo: 'marca', faturamento: 'nao-vende' }).qualificado, true);
});

test('abaixo de R$ 50 mil/mes, ou entrante que nao e industria nem marca, fica fora do perfil', () => {
  const pequeno = qualificar({ tipo: 'industria', faturamento: 'ate-50' });
  assert.deepEqual(pequeno, { qualificado: false, motivo: 'fatura menos de R$ 50 mil/mês' });
  assert.equal(qualificar({ tipo: 'distribuidor', faturamento: 'nao-vende' }).qualificado, false);
  assert.equal(qualificar({ tipo: 'lojista', faturamento: 'nao-vende' }).qualificado, false);
});

test('sem perfil informado nao qualifica', () => {
  assert.deepEqual(qualificar({ tipo: '', faturamento: '' }), { qualificado: false, motivo: 'perfil não informado' });
});
