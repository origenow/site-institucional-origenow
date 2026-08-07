// Dados estruturados (JSON-LD) e llms.txt.
//
// Por que isso importa: o corpo das páginas é renderizado no cliente, então um
// crawler que não executa JavaScript — e a maioria dos rastreadores de LLM não
// executa — enxerga só o <head>. O JSON-LD carrega os fatos da empresa, dos
// serviços, dos cases e dos artigos em texto puro no HTML inicial, e o llms.txt
// dá o mapa do site em markdown. É o que torna o site citável por IA.

export const ORG = {
  nome: 'Origenow',
  descricao: 'Consultoria e assessoria especialista em ecommerce e marketplaces: diagnóstico de canal, curva ABC, precificação, Full Service omnichannel, inteligência comercial e logística.',
  cnpj: '55.325.800/0001-74',
  email: 'contato@origenow.com.br',
  telefones: ['+55 11 94107-7381', '+55 33 98426-0664'],
  enderecos: [
    { rua: 'R. Flórida, 1703 - Conj 62', bairro: 'Cidade Monções', cidade: 'São Paulo', uf: 'SP', cep: '04565-909' },
    { rua: 'Av. Getúlio Vargas, 800, Salas 4, 7, 8 e 10', cidade: 'Manhuaçu', uf: 'MG' },
  ],
};

/** Classifica a página pela URL, para escolher o schema adequado. */
export function tipoDaPagina(url) {
  if (url === '/') return 'home';
  if (url.startsWith('/servicos/')) return 'servico';
  if (url.startsWith('/cases/')) return 'case';
  if (url.startsWith('/insights/')) return 'artigo';
  if (url === '/contato') return 'contato';
  return 'institucional';
}

function organizacao(site) {
  return {
    '@type': 'Organization',
    '@id': `${site}/#organizacao`,
    name: ORG.nome,
    url: `${site}/`,
    description: ORG.descricao,
    email: ORG.email,
    telephone: ORG.telefones,
    taxID: ORG.cnpj,
    logo: `${site}/assets/logo-origenow-white.webp`,
    address: ORG.enderecos.map((e) => ({
      '@type': 'PostalAddress',
      streetAddress: e.rua,
      addressLocality: e.cidade,
      addressRegion: e.uf,
      ...(e.cep ? { postalCode: e.cep } : {}),
      addressCountry: 'BR',
    })),
    areaServed: 'BR',
  };
}

/** Trilha de navegação, para o Google mostrar o caminho no resultado. */
function breadcrumb(site, url, titulo) {
  const partes = url.split('/').filter(Boolean);
  const itens = [{ '@type': 'ListItem', position: 1, name: 'Início', item: `${site}/` }];
  let acc = '';
  partes.forEach((parte, i) => {
    acc += `/${parte}`;
    const ultimo = i === partes.length - 1;
    itens.push({
      '@type': 'ListItem',
      position: i + 2,
      name: ultimo ? titulo : parte.charAt(0).toUpperCase() + parte.slice(1),
      item: `${site}${acc}`,
    });
  });
  return { '@type': 'BreadcrumbList', itemListElement: itens };
}

/** Monta o bloco <script type="application/ld+json"> da página. */
export function jsonLd({ site, url, titulo, descricao, tipo }) {
  const urlAbs = `${site}${url}`;
  const grafo = [organizacao(site)];

  if (tipo === 'home') {
    grafo.push({
      '@type': 'WebSite',
      '@id': `${site}/#site`,
      url: `${site}/`,
      name: ORG.nome,
      description: ORG.descricao,
      inLanguage: 'pt-BR',
      publisher: { '@id': `${site}/#organizacao` },
    });
  } else {
    grafo.push(breadcrumb(site, url, titulo.split(' · ')[0]));
  }

  if (tipo === 'servico') {
    grafo.push({
      '@type': 'Service',
      name: titulo.split(' · ')[0],
      description: descricao,
      url: urlAbs,
      provider: { '@id': `${site}/#organizacao` },
      areaServed: 'BR',
      serviceType: 'Consultoria para marketplaces e ecommerce',
    });
  }

  if (tipo === 'artigo') {
    grafo.push({
      '@type': 'Article',
      headline: titulo.split(' · ')[0],
      description: descricao,
      url: urlAbs,
      inLanguage: 'pt-BR',
      author: { '@id': `${site}/#organizacao` },
      publisher: { '@id': `${site}/#organizacao` },
    });
  }

  if (tipo === 'case') {
    grafo.push({
      '@type': 'Article',
      '@id': `${urlAbs}#case`,
      headline: titulo.split(' · ')[0],
      description: descricao,
      url: urlAbs,
      inLanguage: 'pt-BR',
      about: { '@type': 'Thing', name: 'Case de marketplace' },
      author: { '@id': `${site}/#organizacao` },
      publisher: { '@id': `${site}/#organizacao` },
    });
  }

  if (tipo === 'contato') {
    grafo.push({
      '@type': 'ContactPage',
      url: urlAbs,
      name: titulo,
      about: { '@id': `${site}/#organizacao` },
    });
  }

  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': grafo })}</script>`;
}

/** Texto vindo do HTML carrega entidades; markdown as quer resolvidas. */
function texto(v) {
  return String(v ?? '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
}

/** llms.txt — mapa do site em markdown, convenção para agentes de IA. */
export function llmsTxt(site, paginas) {
  const porTipo = (t) => paginas.filter((p) => tipoDaPagina(p.url) === t);
  const linha = (p) =>
    `- [${texto(p.titulo).split(' · ')[0]}](${site}${p.url})${p.descricao ? `: ${texto(p.descricao)}` : ''}`;

  return [
    `# ${ORG.nome}`,
    '',
    `> ${ORG.descricao}`,
    '',
    `A Origenow opera canais de venda online para indústrias, distribuidores e marcas no Brasil.`,
    `Contato: ${ORG.email} · ${ORG.telefones.join(' · ')} · CNPJ ${ORG.cnpj}.`,
    '',
    '## Serviços',
    ...porTipo('servico').map(linha),
    '',
    '## Cases',
    ...porTipo('case').map(linha),
    '',
    '## Insights',
    ...porTipo('artigo').map(linha),
    '',
    '## Institucional',
    ...porTipo('institucional').concat(porTipo('contato'), porTipo('home')).map(linha),
    '',
  ].join('\n');
}
