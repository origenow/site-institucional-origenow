// Mapa de URLs públicas do site.
//
// `src`  — arquivo .dc.html fonte (continua sendo a verdade do conteúdo)
// `url`  — caminho limpo servido em produção (sem %20 e sem .dc.html)
// `param`/`valor` — variantes que a fonte serve por query string. Cada uma vira
//   uma página própria, com título e canonical próprios; sem isso os 12 cases e
//   os 6 artigos ficam invisíveis para o Google (todos na mesma URL/título).

export const PAGINAS = [
  { src: 'Origenow Site.dc.html', url: '/' },
  { src: 'Origenow Servicos.dc.html', url: '/servicos' },
  { src: 'Origenow Servico Consultoria.dc.html', url: '/servicos/consultoria' },
  { src: 'Origenow Servico Assessoria.dc.html', url: '/servicos/assessoria' },
  { src: 'Origenow Servico Full Service.dc.html', url: '/servicos/full-service' },
  { src: 'Origenow Servico Inteligencia Comercial.dc.html', url: '/servicos/inteligencia-comercial' },
  { src: 'Origenow Servico Logistica.dc.html', url: '/servicos/logistica' },
  { src: 'Origenow Servico Representacao.dc.html', url: '/servicos/representacao' },
  { src: 'Origenow Cases.dc.html', url: '/cases' },
  { src: 'Origenow Case 01.dc.html', url: '/cases/camicado' },
  { src: 'Origenow Case 02.dc.html', url: '/cases/mimo-cricut' },
  { src: 'Origenow Case 03.dc.html', url: '/cases/tiktok-shop' },
  { src: 'Origenow Case 04.dc.html', url: '/cases/riffel' },
  { src: 'Origenow Case 05.dc.html', url: '/cases/calpen' },
  { src: 'Origenow Grupo.dc.html', url: '/grupo' },
  { src: 'Origenow Sobre.dc.html', url: '/sobre' },
  { src: 'Origenow Insights.dc.html', url: '/insights' },
  { src: 'Origenow Contato.dc.html', url: '/contato' },
];

const CASE_NOVO = 'Origenow Case Novo.dc.html';
const ARTIGO = 'Origenow Artigo.dc.html';

// Os 12 cases servidos por ?c=. Título de SEO derivado do conteúdo real.
export const VARIANTES = [
  { src: CASE_NOVO, param: 'c', valor: 'amazon', url: '/cases/amazon-brasil',
    title: 'Case Amazon Brasil · Programa de Branches · Origenow',
    desc: 'Convidados pela Amazon para um pool oficial de parceiros: abertura de contas, onboarding e seleção de prep centers. +42 big sellers lançados.' },
  { src: CASE_NOVO, param: 'c', valor: '1', url: '/cases/cafe-dupan',
    title: 'Case Café Dupan · Operação 1P + 3P em café especial · Origenow',
    desc: 'Full service, Ads e fiscal para café especial em marketplaces. Top ROI da carteira.' },
  { src: CASE_NOVO, param: 'c', valor: '2', url: '/cases/vanfall',
    title: 'Case Vanfall · Destilaria com Loja Oficial no Mercado Livre · Origenow',
    desc: 'Full service e Loja Oficial no Mercado Livre para destilaria, com operação 1P + 3P ativa.' },
  { src: CASE_NOVO, param: 'c', valor: '3', url: '/cases/jacki-design',
    title: 'Case Jacki Design · Loja oficial multicanal · Origenow',
    desc: 'Loja oficial multicanal com curadoria de sellers: 3 canais e sell-in em alta.' },
  { src: CASE_NOVO, param: 'c', valor: '4', url: '/cases/chiccharm',
    title: 'Case Chiccharm · Reengenharia de mídia e margem · Origenow',
    desc: 'Reengenharia de mídia que destravou margem em moda feminina: ACOS de 24% para 8,3% e +67% de faturamento.' },
  { src: CASE_NOVO, param: 'c', valor: '5', url: '/cases/rio-comerce',
    title: 'Case Rio Comerce · Estudo de canal e mix · Origenow',
    desc: 'Estudo de canal e curadoria de 450 SKUs para distribuidora: +16 pedidos por dia em 2 meses.' },
  { src: CASE_NOVO, param: 'c', valor: '6', url: '/cases/allabard',
    title: 'Case Allabard · Reativação com Full Service na Amazon · Origenow',
    desc: 'Reativação de operação de malas e bagagem com ERP Olist e gestão dedicada na Amazon.' },
  { src: CASE_NOVO, param: 'c', valor: '7', url: '/cases/hyper-club',
    title: 'Case Hyper Club · Reestruturação de time e operação · Origenow',
    desc: 'Reestruturação de time, canais e gestão de ACOS em brinquedos: +40% de faturamento.' },
  { src: CASE_NOVO, param: 'c', valor: '8', url: '/cases/inventio-store',
    title: 'Case Inventio Store · Entrada na Amazon com bundles · Origenow',
    desc: 'Nova entrada na Amazon com bundles de livros: +40% de faturamento.' },
  { src: CASE_NOVO, param: 'c', valor: '9', url: '/cases/patricia-elias',
    title: 'Case Patrícia Elias · Loja oficial em cosméticos · Origenow',
    desc: 'Loja oficial e SEO de anúncios em cosméticos: o Mercado Livre virou o 2º melhor canal.' },
  { src: CASE_NOVO, param: 'c', valor: '10', url: '/cases/oneshop',
    title: 'Case OneShop · Inteligência comercial na Shopee · Origenow',
    desc: 'Automação e inteligência comercial na Shopee: +24% em 3 meses e +13 p.p. de margem.' },
  { src: CASE_NOVO, param: 'c', valor: '11', url: '/cases/paylight',
    title: 'Case Paylight · Expansão com logística sob controle · Origenow',
    desc: 'Expansão de canais e treinamento logístico em eletrônicos: menos reclamações e devoluções.' },
];

// Os 6 artigos servidos por ?a=.
export const ARTIGOS = [
  { src: ARTIGO, param: 'a', valor: '1', url: '/insights/curva-abc-verba-de-ads-no-mercado-livre',
    title: 'Como a Curva ABC muda a sua verba de Ads no Mercado Livre · Origenow',
    desc: 'Como usar a Curva ABC do catálogo para redistribuir verba de Ads no Mercado Livre e parar de gastar no SKU errado.' },
  { src: ARTIGO, param: 'a', valor: '2', url: '/insights/mix-enxuto-vende-mais',
    title: 'Mix enxuto vende mais: o corte de 38% que dobrou a margem · Origenow',
    desc: 'Por que cortar SKUs improdutivos aumenta a margem: o caso do corte de 38% no mix que dobrou o resultado.' },
  { src: ARTIGO, param: 'a', valor: '3', url: '/insights/full-ou-frete-proprio',
    title: 'Full ou frete próprio? O cálculo que quase ninguém faz · Origenow',
    desc: 'O cálculo real entre fulfillment do marketplace e frete próprio, considerando margem, prazo e reputação.' },
  { src: ARTIGO, param: 'a', valor: '4', url: '/insights/entrar-na-amazon-sem-canibalizar-o-mercado-livre',
    title: 'Entrar na Amazon sem canibalizar o seu Mercado Livre · Origenow',
    desc: 'Como planejar a entrada na Amazon protegendo o faturamento que já existe no Mercado Livre.' },
  { src: ARTIGO, param: 'a', valor: '5', url: '/insights/tabela-de-preco-por-canal',
    title: 'Tabela de preço por canal: o erro que come a sua margem · Origenow',
    desc: 'Por que precificar igual em todos os canais destrói a margem, e como montar tabela por canal.' },
  { src: ARTIGO, param: 'a', valor: '6', url: '/insights/estrutura-minima-de-uma-operacao',
    title: 'Quem cuida do canal: estrutura mínima de uma operação · Origenow',
    desc: 'A estrutura mínima de pessoas e rotinas para operar marketplaces sem perder controle.' },
];

export const TODAS = [...PAGINAS, ...VARIANTES, ...ARTIGOS];

// Componentes buscados em runtime pelo <dc-import>.
export const IMPORTS = ['Header.dc.html', 'Footer.dc.html'];
export const PASTAS = ['assets', '_ds'];
export const ARQUIVOS = ['support.js', 'image-slot.js', 'om-motion.js', '.image-slots.state.json'];

/** Mapa "link antigo no fonte" -> "URL limpa", para reescrever os hrefs. */
export function mapaDeLinks() {
  const mapa = new Map();
  for (const p of TODAS) {
    const arquivo = encodeURIComponent(p.src).replace(/%2F/g, '/');
    const chave = p.param ? `${arquivo}?${p.param}=${p.valor}` : arquivo;
    mapa.set(chave, p.url);
  }
  return mapa;
}
