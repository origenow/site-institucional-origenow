// Regra de lead qualificado da Origenow (decisão comercial, setembro de 2026):
//   - fatura a partir de R$ 50 mil/mês em marketplaces; ou
//   - é indústria ou marca que ainda não vende em marketplace e quer entrar.
//
// Só lead qualificado vira conversão no Google Ads — é o que ensina o lance a
// buscar o perfil certo com CAC de R$ 250. O lead fora do perfil chega igual ao
// comercial, só não treina a campanha.

export const TIPOS = {
  industria: 'Indústria',
  marca: 'Marca',
  distribuidor: 'Distribuidor',
  lojista: 'Lojista',
  outro: 'Outro',
};

export const FATURAMENTOS = {
  'nao-vende': 'Ainda não vende em marketplace',
  'ate-50': 'Até R$ 50 mil/mês',
  '50-200': 'R$ 50 mil a 200 mil/mês',
  '200-1000': 'R$ 200 mil a 1 milhão/mês',
  'acima-1000': 'Acima de R$ 1 milhão/mês',
};

const FATURA_O_SUFICIENTE = new Set(['50-200', '200-1000', 'acima-1000']);
const ENTRANTES = new Set(['industria', 'marca']);

// Página /vender-na-amazon. Conta e cadastro de produtos são gratuitos para todo
// novo lojista, em qualquer estado. O faturamento mensal, somando os canais em que
// já vende, define a oferta de consultoria. Conversão no Google Ads segue a régua
// comercial de R$ 50 mil/mês, a mesma do /contato.
export const UFS = new Set(['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT',
  'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO']);

export const FATURAMENTOS_AMAZON = {
  'ate-50': 'Até R$ 50 mil/mês',
  '50-150': 'R$ 50 mil a 150 mil/mês',
  '150-250': 'Mais de R$ 150 mil até 250 mil/mês',
  'acima-250': 'Mais de R$ 250 mil/mês',
};

export const OFERTAS_AMAZON = {
  'consultoria-gratuita': 'Consultoria gratuita',
  'consultoria-desconto': 'Consultoria com desconto',
  'a-definir': 'Consultoria a definir pelo comercial',
};

const OFERTA_POR_FATURAMENTO = {
  'ate-50': 'consultoria-desconto',
  '50-150': 'consultoria-desconto',
  '150-250': 'a-definir',
  'acima-250': 'consultoria-gratuita',
};

/** @returns {{ qualificado: boolean, motivo: string, oferta: string }} */
export function qualificarAmazon({ faturamento }) {
  if (!FATURAMENTOS_AMAZON[faturamento]) {
    return { qualificado: false, motivo: 'perfil não informado', oferta: 'a-definir' };
  }
  const oferta = OFERTA_POR_FATURAMENTO[faturamento];
  if (faturamento === 'ate-50') return { qualificado: false, motivo: 'fatura até R$ 50 mil/mês', oferta };
  return { qualificado: true, motivo: 'fatura mais de R$ 50 mil/mês', oferta };
}

/** @returns {{ qualificado: boolean, motivo: string }} */
export function qualificar({ tipo, faturamento }) {
  if (FATURA_O_SUFICIENTE.has(faturamento)) {
    return { qualificado: true, motivo: 'fatura a partir de R$ 50 mil/mês' };
  }
  if (faturamento === 'nao-vende' && ENTRANTES.has(tipo)) {
    return { qualificado: true, motivo: 'indústria ou marca entrando nos marketplaces' };
  }
  if (!TIPOS[tipo] || !FATURAMENTOS[faturamento]) {
    return { qualificado: false, motivo: 'perfil não informado' };
  }
  return {
    qualificado: false,
    motivo: faturamento === 'ate-50' ? 'fatura menos de R$ 50 mil/mês' : 'ainda não vende e não é indústria ou marca',
  };
}
