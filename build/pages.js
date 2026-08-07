export const PAGINAS = [
  { entrada: 'Origenow Site.dc.html',                           saida: 'dist/index.html' },
  { entrada: 'Origenow Servicos.dc.html',                       saida: 'dist/servicos.html' },
  { entrada: 'Origenow Servico Assessoria.dc.html',             saida: 'dist/servicos/assessoria.html' },
  { entrada: 'Origenow Servico Consultoria.dc.html',            saida: 'dist/servicos/consultoria.html' },
  { entrada: 'Origenow Servico Full Service.dc.html',           saida: 'dist/servicos/full-service.html' },
  { entrada: 'Origenow Servico Inteligencia Comercial.dc.html', saida: 'dist/servicos/inteligencia-comercial.html' },
  { entrada: 'Origenow Servico Logistica.dc.html',              saida: 'dist/servicos/logistica.html' },
  { entrada: 'Origenow Servico Representacao.dc.html',          saida: 'dist/servicos/representacao.html' },
  { entrada: 'Origenow Cases.dc.html',                          saida: 'dist/cases.html' },
  { entrada: 'Origenow Case 01.dc.html',                        saida: 'dist/cases/01.html' },
  { entrada: 'Origenow Case 02.dc.html',                        saida: 'dist/cases/02.html' },
  { entrada: 'Origenow Case 03.dc.html',                        saida: 'dist/cases/03.html' },
  { entrada: 'Origenow Case 04.dc.html',                        saida: 'dist/cases/04.html' },
  { entrada: 'Origenow Case 05.dc.html',                        saida: 'dist/cases/05.html' },
  { entrada: 'Origenow Grupo.dc.html',                          saida: 'dist/grupo.html' },
  { entrada: 'Origenow Sobre.dc.html',                          saida: 'dist/sobre.html' },
  { entrada: 'Origenow Insights.dc.html',                       saida: 'dist/insights.html' },
  { entrada: 'Origenow Artigo.dc.html',                         saida: 'dist/artigo.html' },
  { entrada: 'Origenow Contato.dc.html',                        saida: 'dist/contato.html' },
];

// Cases 06–16: um arquivo por variante de query string.
export const VARIANTES_CASE = [
  ...Array.from({ length: 11 }, (_, i) => ({
    entrada: 'Origenow Case Novo.dc.html',
    saida: `dist/cases/novo-${i + 1}.html`,
    query: `?c=${i + 1}`,
  })),
  { entrada: 'Origenow Case Novo.dc.html', saida: 'dist/cases/amazon.html', query: '?c=amazon' },
];

export const TODAS = [...PAGINAS, ...VARIANTES_CASE];
