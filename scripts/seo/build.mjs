import { build, createServer, preview } from 'vite';
import { launchBrowser } from './browser.mjs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Vite's .env.local is for development; never ship localhost canonicals.
const siteUrl = (process.env.VITE_PUBLIC_SITE_URL || 'https://foch-horizon.vercel.app').replace(/\/+$/, '');
if (!/^https:\/\//.test(siteUrl) || /localhost|127\.0\.0\.1/.test(siteUrl)) throw new Error('Production VITE_PUBLIC_SITE_URL must be a public HTTPS origin.');
process.env.VITE_PUBLIC_SITE_URL = siteUrl;
process.env.NODE_ENV = "production";
const loader = await createServer({ optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true }, appType: 'custom' });
let guides;
let properties;
try {
  ({ geographyGuides: guides } = await loader.ssrLoadModule('/src/features/content/data/geographyGuides.ts'));
  ({ properties } = await loader.ssrLoadModule('/src/features/listings/data/properties.ts'));
} finally {
  await loader.close();
}
await build();
const template = await readFile('dist/index.html', 'utf8');
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
await writeFile('dist/spa.html', template.replace('</head>', `${propertyImagePreload}\n</head>`));
// Capture the same React pages for every visitor. No bot detection or separate AI content.
const routes = ['/', '/geographie', '/services', '/vendre', '/estimation', '/apropos', '/contact', '/honoraires', '/reglementation-immobiliere', '/plan-du-site', '/mentions-legales', '/confidentialite', '/cookies', '/accessibilite', ...guides.map(guide => `/immobilier/${guide.id}`)];
const server = await preview({ preview: { host: '127.0.0.1', port: 4175, strictPort: true } });
let browser;
const snapshots = [];
try {
  browser = await launchBrowser();
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  // Prerender editorial content independently of live APIs, remote images and third-party widgets.
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'http://127.0.0.1:4175' || url.pathname.startsWith('/api/')) return route.abort();
    return route.continue();
  });
  for (const route of routes) {
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:4175${route}`);
    await page.waitForSelector('main h1');
    await page.waitForFunction(() => document.querySelector('script[data-foch-jsonld]') && !document.title.includes('introuvable'));
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
      root.querySelectorAll('[data-live-content]').forEach(node => {
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
    const cleanTemplate = template.replace(/<title>[\s\S]*?<\/title>|<meta\s[^>]*(?:name="(?:description|robots|twitter:[^"]*)"|property="og:[^"]*")[^>]*>/g, '');
    snapshots.push({ route, html: cleanTemplate.replace('</head>', `${snapshot.head}\n</head>`).replace('<div id="root"></div>', snapshot.root) });
    await page.close();
  }
  // Write after capture so the preview always renders from the original SPA shell.
  for (const snapshot of snapshots) {
    const filename = snapshot.route === '/' ? 'dist/index.html' : path.join('dist', snapshot.route, 'index.html');
    await mkdir(path.dirname(filename), { recursive: true });
    await writeFile(filename, snapshot.html);
  }
  const sitemapRoutes = [...routes, '/biens', '/avis', '/nos-dernieres-ventes'];
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
