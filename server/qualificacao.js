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
