import { build, createServer, preview } from 'vite';
import { launchBrowser } from './browser.mjs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Vite's .env.local is for development; never ship localhost canonicals.
const siteUrl = (process.env.VITE_PUBLIC_SITE_URL || 'https://foch-horizon.vercel.app').replace(/\/+$/, '');
if (!/^https:\/\//.test(siteUrl) || /localhost|127\.0\.0\.1/.test(siteUrl)) throw new Error('Production VITE_PUBLIC_SITE_URL must be a public HTTPS origin.');
process.env.VITE_PUBLIC_SITE_URL = siteUrl;
process.env.NODE_ENV = "production";
const loader = await createServer({ optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true }, appType: 'custom' });
let guides;
let properties;
let cities;
let toCanonicalPropertyPath;
try {
  ({ geographyGuides: guides } = await loader.ssrLoadModule('/src/features/content/data/geographyGuides.ts'));
  ({ properties } = await loader.ssrLoadModule('/src/features/listings/data/properties.ts'));
  ({ cities } = await loader.ssrLoadModule('/src/features/cities/data/cities.ts'));
  ({ toCanonicalPropertyPath } = await loader.ssrLoadModule('/src/features/listings/utils/formatting.ts'));
} finally {
  await loader.close();
}

const cityById = new Map(cities.map(city => [city.id, city]));
const publicListingProperties = properties.filter(property =>
  property.transactionType === 'vente' && property.status === 'active' && property.title.trim(),
);

const normalizeSearchText = value => String(value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const numberParam = (params, key) => {
  const raw = params.get(key);
  if (raw == null || raw.trim() === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
};

function toSearchItem(property) {
  const city = cityById.get(property.cityId);
  return {
    id: property.id,
    title: property.title,
    slug: property.slug,
    transaction: property.transactionType,
    type: property.propertyType,
    priceAmount: property.priceAmount,
    currency: property.priceCurrency,
    surfaceM2: property.surfaceM2,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    parking: property.parkingCount,
    garage: property.garageCount,
    city: { name: city?.name ?? '', slug: city?.slug ?? '', postalCode: property.postalCode },
    coverImageUrl: property.images[0]?.sourceUrl ?? '',
    dpeLabel: property.dpeLabel,
    status: property.status,
  };
}

function searchListingItems(params) {
  let result = properties.filter(property =>
    property.transactionType === 'vente' && property.status !== 'off_market',
  );
  const type = params.get('type');
  const cityNeedle = normalizeSearchText(params.get('city'));
  const query = normalizeSearchText(params.get('q'));
  if (type) result = result.filter(property => property.propertyType === type);
  if (cityNeedle) result = result.filter(property => {
    const city = cityById.get(property.cityId);
    return normalizeSearchText(`${city?.slug ?? ''} ${city?.name ?? ''} ${property.postalCode}`).includes(cityNeedle);
  });
  if (query) result = result.filter(property => {
    const city = cityById.get(property.cityId);
    return normalizeSearchText(`${property.title} ${property.slug} ${property.description} ${city?.name ?? ''} ${property.postalCode} ${property.id}`).includes(query);
  });
  for (const [key, predicate] of [
    ['priceMin', property => property.priceAmount],
    ['priceMax', property => property.priceAmount],
    ['surfaceMin', property => property.surfaceM2],
    ['surfaceMax', property => property.surfaceM2],
    ['terrainMin', property => property.terrainM2 ?? 0],
    ['terrainMax', property => property.terrainM2 ?? 0],
    ['bedroomsMin', property => property.bedrooms ?? 0],
    ['bathroomsMin', property => property.bathrooms ?? 0],
    ['garagesMin', property => property.garageCount ?? 0],
  ]) {
    const value = numberParam(params, key);
    if (value == null) continue;
    const minimum = key.endsWith('Min');
    result = result.filter(property => minimum ? predicate(property) >= value : predicate(property) <= value);
  }
  switch (params.get('sort')) {
    case 'price_asc': result.sort((a, b) => a.priceAmount - b.priceAmount); break;
    case 'price_desc': result.sort((a, b) => b.priceAmount - a.priceAmount); break;
    case 'surface_desc': result.sort((a, b) => b.surfaceM2 - a.surfaceM2); break;
    // The source page order is preserved when it doesn't publish a verified date.
    default: break;
  }
  const page = Math.max(1, Number(params.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.get('pageSize')) || 12));
  return { page, pageSize, total: result.length, items: result.slice((page - 1) * pageSize, page * pageSize).map(toSearchItem) };
}

function toEdgePropertyDetail(property) {
  const city = cityById.get(property.cityId);
  return {
    id: property.id,
    title: property.title,
    slug: property.slug,
    transaction_type: property.transactionType,
    property_type: property.propertyType,
    status: property.status,
    source_status: property.sourceStatus,
    price_amount: property.priceAmount,
    price_currency: property.priceCurrency,
    surface_m2: property.surfaceM2,
    terrain_m2: property.terrainM2,
    rooms: property.rooms,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    parking_count: property.parkingCount,
    garage_count: property.garageCount,
    dpe_label: property.dpeLabel,
    dpe_value: property.dpeValue,
    ges_label: property.gesLabel,
    ges_value: property.gesValue,
    description: property.description,
    city_id: property.cityId,
    postal_code: property.postalCode,
    lat: property.lat,
    lng: property.lng,
    agent_id: property.agentId,
    published_at: property.publishedAt,
    updated_at: property.updatedAt,
    city: city ? { id: city.id, name: city.name, slug: city.slug } : null,
    agent: null,
    images: property.images.map(image => ({ id: image.id, property_id: image.propertyId, source_url: image.sourceUrl, sort_order: image.sortOrder, alt_text: image.altText })),
    features: property.features.map(feature => ({ property_id: feature.propertyId, feature_key: feature.featureKey, label_fr: feature.labelFr })),
  };
}

await build();
const template = await readFile('dist/index.html', 'utf8');
const nonIndexablePreview = new URL(siteUrl).hostname.toLowerCase().endsWith('.vercel.app');
const robotsContent = nonIndexablePreview
  ? 'noindex,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1'
  : 'index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1';
const templateWithRobots = template.replace(/<meta name="robots"[^>]*>/, `<meta name="robots" content="${robotsContent}" />`);
// Avoid a second request waterfall before the homepage's above-the-fold hero can render.
const homePageChunk = (await readdir('dist/assets')).find(file => /^HomePage-.+\.js$/.test(file));
if (!homePageChunk) throw new Error('Could not find the HomePage route chunk to preload.');
const homePageModulePreload = `<link rel="modulepreload" crossorigin href="/assets/${homePageChunk}">`;
const withHomePageModulePreload = html => {
  const moduleScript = html.match(/<script type="module"[^>]*>/)?.[0];
  if (!moduleScript) throw new Error('Could not find the application module script to place the HomePage preload.');
  return html.replace(moduleScript, `${homePageModulePreload}\n    ${moduleScript}`);
};
// Dynamic and unknown routes use their own shell, never the prerendered homepage.
const propertyImageSources = Object.fromEntries(
  properties
    .filter(property => property.images[0]?.sourceUrl)
    .map(property => [String(property.id), property.images[0].sourceUrl]),
);
const propertyImagePreload = [
  '<script>',
  '(() => {',
  '  const propertyId = window.location.pathname.split("/")[2]?.split("-")[0];',
  `  const sourceUrl = ${JSON.stringify(propertyImageSources)}[propertyId];`,
  '  if (!sourceUrl) return;',
  '  const source = new URL(sourceUrl);',
  '  if (!source.hostname.toLowerCase().endsWith(".staticlbi.com") || !source.pathname.includes("/wa/images/biens/")) return;',
  '  const imageUrl = width => { const url = new URL(source); url.pathname = url.pathname.replace("/wa/images/biens/", "/" + width + "xauto/images/biens/"); return url.href; };',
  '  const preload = document.createElement("link");',
  '  preload.rel = "preload";',
  '  preload.as = "image";',
  '  preload.href = imageUrl(400);',
  '  preload.setAttribute("imagesrcset", [200, 400, 700, 900].map(width => imageUrl(width) + " " + width + "w").join(", "));',
  '  preload.setAttribute("imagesizes", "(max-width: 1023px) calc(100vw - 2rem), 66vw");',
  '  preload.setAttribute("fetchpriority", "high");',
  '  document.head.append(preload);',
  '})();',
  '</script>',
].join("\n");
await writeFile('dist/spa.html', templateWithRobots.replace('</head>', `${propertyImagePreload}\n</head>`));
// Capture the same React pages for every visitor. No bot detection or separate AI content.
const propertyRoutes = publicListingProperties.map(toCanonicalPropertyPath);
const routes = ['/', '/geographie', '/services', '/vendre', '/estimation', '/apropos', '/contact', '/honoraires', '/reglementation-immobiliere', '/plan-du-site', '/mentions-legales', '/confidentialite', '/cookies', '/accessibilite', '/biens', '/avis', '/nos-dernieres-ventes', ...guides.map(guide => `/immobilier/${guide.id}`), ...propertyRoutes];
const server = await preview({ preview: { host: '127.0.0.1', port: 4175, strictPort: true } });
let browser;
const snapshots = [];
try {
  browser = await launchBrowser();
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  // Snapshot current feed records into page HTML without depending on remote services.
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/api/properties')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(searchListingItems(url.searchParams)) });
    }
    const detailMatch = url.pathname.match(/\/api\/properties\/(\d+)$/);
    if (detailMatch) {
      const property = properties.find(item => item.id === Number(detailMatch[1]));
      return property
        ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(toEdgePropertyDetail(property)) })
        : route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'Not found' }) });
    }
    if (url.origin !== 'http://127.0.0.1:4175') return route.abort();
    if (url.pathname.startsWith('/api/')) return route.abort();
    return route.continue();
  });
  for (const route of routes) {
    const routeProperty = publicListingProperties.find(property => toCanonicalPropertyPath(property) === route);
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:4175${route}`);
    await page.waitForSelector('main h1');
    await page.waitForFunction(() => document.querySelector('script[data-foch-jsonld]') && !document.title.includes('introuvable'));
    if (routeProperty) {
      await page.waitForFunction(({ title, canonicalPath }) =>
        document.querySelector('main h1')?.textContent?.includes(title) &&
        document.querySelector('link[rel="canonical"]')?.getAttribute('href')?.endsWith(canonicalPath) &&
        [...document.querySelectorAll('script[data-foch-jsonld]')].some(node => node.textContent?.includes('RealEstateListing')),
      { title: routeProperty.title, canonicalPath: route }, { timeout: 30000 });
    } else if (route === '/biens' || route === '/nos-dernieres-ventes') {
      await page.waitForFunction(() => document.querySelector('main a[href^="/biens/"]') !== null, undefined, { timeout: 10000 }).catch(async () => {
        const state = await page.evaluate(() => ({
          path: window.location.pathname,
          title: document.title,
          mainText: document.querySelector('main')?.textContent?.slice(0, 500) ?? '',
          listingLinks: [...document.querySelectorAll('main a[href^="/biens/"]')].length,
        }));
        throw new Error(`No property links were rendered on ${route}: ${JSON.stringify(state)}`);
      });
    } else if (route === '/avis') {
      await page.waitForFunction(() => document.body.textContent?.includes('Source de secours'), undefined, { timeout: 30000 });
    }
    const snapshot = await page.evaluate(() => {
      const root = document.createElement('div');
      root.id = 'root';
      const wrapper = document.createElement('div');
      wrapper.className = 'min-h-screen bg-background text-foreground';
      for (const selector of ['#root header.sticky', '#root main', '#root footer']) {
        const node = document.querySelector(selector);
        if (!node) throw new Error(`Missing page landmark: ${selector}`);
        wrapper.append(node.cloneNode(true));
      }
      root.append(wrapper);
      if (window.location.pathname === '/') root.querySelectorAll('[data-live-content]').forEach(node => {
          const link = document.createElement('a');
          link.href = node.getAttribute('data-live-content') || '/biens';
          link.className = 'block py-6 text-sm underline underline-offset-4';
          link.textContent = 'Consulter les annonces immobilières à jour';
          node.replaceWith(link);
        });
      root.querySelectorAll('[style]').forEach(node => {
        // Motion should never make prerendered text invisible with JavaScript disabled.
        for (const key of ['opacity', 'transform', 'filter']) node.style.removeProperty(key);
      });
      root.querySelectorAll('.leaflet-container').forEach(node => { node.replaceChildren(); node.classList.remove('leaflet-container'); });
      const head = [...document.head.querySelectorAll('title, meta[name="description"], meta[name="robots"], meta[name^="twitter:"], meta[property^="og:"], link[rel="canonical"], script[data-foch-jsonld]')].map(node => node.outerHTML).join('\n');
      return { head, root: root.outerHTML, h1: root.querySelectorAll('h1').length, text: root.textContent, canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') };
    });
    if (snapshot.h1 !== 1 || /(?:à|de)\s+Le Havre\b/i.test(snapshot.text)) throw new Error(`Invalid headings or French grammar on ${route}`);
    if (snapshot.canonical !== `${siteUrl}${route}`) throw new Error(`Unexpected canonical on ${route}: ${snapshot.canonical}`);
    const cleanTemplate = templateWithRobots.replace(/<title>[\s\S]*?<\/title>|<meta\s[^>]*(?:name="(?:description|robots|twitter:[^"]*)"|property="og:[^"]*")[^>]*>/g, '');
    const html = cleanTemplate.replace('</head>', `${snapshot.head}\n</head>`).replace('<div id="root"></div>', snapshot.root);
    snapshots.push({ route, html: route === '/' ? withHomePageModulePreload(html) : html });
    await page.close();
  }
  // Write after capture so the preview always renders from the original SPA shell.
  for (const snapshot of snapshots) {
    const filename = snapshot.route === '/' ? 'dist/index.html' : path.join('dist', snapshot.route, 'index.html');
    await mkdir(path.dirname(filename), { recursive: true });
    await writeFile(filename, snapshot.html);
  }
  const sitemapRoutes = routes;
  const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
  await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapRoutes.map(route => {
    const reviewed = guides.find(guide => route === `/immobilier/${guide.id}`)?.reviewedAt;
    return `  <url><loc>${escape(siteUrl + route)}</loc>${reviewed ? `<lastmod>${reviewed}</lastmod>` : ''}</url>`;
  }).join('\n')}\n</urlset>\n`);
  const robots = (await readFile('public/robots.txt', 'utf8')).replace(/^Sitemap:.*$/m, `Sitemap: ${siteUrl}/sitemap.xml`);
  await writeFile('dist/robots.txt', robots);
  console.log(`Prerendered ${snapshots.length} public pages; sitemap and robots use ${siteUrl}.`);
} finally {
  await browser?.close();
  await new Promise(resolve => server.httpServer.close(resolve));
}
