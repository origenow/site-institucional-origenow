// Páginas navegáveis do site. Cada uma é servida a partir do próprio .dc.html
// (fonte interativa) com o <head> de SEO injetado no build. A que tem home:true
// também é gravada como dist/index.html para responder em "/".
export const PAGINAS = [
  { src: 'Origenow Site.dc.html', home: true },
  { src: 'Origenow Servicos.dc.html' },
  { src: 'Origenow Servico Assessoria.dc.html' },
  { src: 'Origenow Servico Consultoria.dc.html' },
  { src: 'Origenow Servico Full Service.dc.html' },
  { src: 'Origenow Servico Inteligencia Comercial.dc.html' },
  { src: 'Origenow Servico Logistica.dc.html' },
  { src: 'Origenow Servico Representacao.dc.html' },
  { src: 'Origenow Cases.dc.html' },
  { src: 'Origenow Case 01.dc.html' },
  { src: 'Origenow Case 02.dc.html' },
  { src: 'Origenow Case 03.dc.html' },
  { src: 'Origenow Case 04.dc.html' },
  { src: 'Origenow Case 05.dc.html' },
  { src: 'Origenow Case Novo.dc.html' }, // variantes 06–16 via ?c=1…11 e ?c=amazon (cliente)
  { src: 'Origenow Grupo.dc.html' },
  { src: 'Origenow Sobre.dc.html' },
  { src: 'Origenow Insights.dc.html' },
  { src: 'Origenow Artigo.dc.html' },
  { src: 'Origenow Contato.dc.html' },
];

// Componentes importados via <dc-import> em runtime. São buscados crus (com o
// <x-dc> intacto) pelo support.js, então vão para dist/ verbatim.
export const IMPORTS = ['Header.dc.html', 'Footer.dc.html'];

// Ativos e runtime que o HTML servido referencia relativamente.
export const PASTAS = ['assets', '_ds'];
export const ARQUIVOS = ['support.js', 'image-slot.js', 'om-motion.js', '.image-slots.state.json'];
