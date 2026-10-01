import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { launchBrowser } from './browser.mjs';
import { preview } from 'vite';

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.filter(entry => entry.name !== 'assets' && entry.name !== 'images').map(entry => entry.isDirectory() ? htmlFiles(path.join(directory, entry.name)) : entry.name === 'index.html' ? [path.join(directory, entry.name)] : []));
  return files.flat();
}
const errors = [];
const files = await htmlFiles('dist');
const internalTargets = new Set();
for (const file of files) {
  const document = new JSDOM(await readFile(file, 'utf8')).window.document;
  const main = document.querySelector('main');
  const check = (condition, message) => { if (!condition) errors.push(`${file}: ${message}`); };
  check(main?.querySelectorAll('h1').length === 1, 'Expected exactly one main H1');
  check(!/(?:à|de)\s+Le Havre\b/i.test(document.body.textContent), 'Incorrect French contraction');
  check(!main?.textContent.includes(']('), 'Unrendered Markdown in visible copy');
  check(!document.querySelector('meta[name="robots"]')?.content.includes('noindex'), 'Public editorial page is noindex');
  const canonical = document.querySelector('link[rel="canonical"]')?.href;
  check(canonical?.startsWith('https://') && !canonical.includes('localhost'), 'Non-public canonical');
  const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')];
  const graph = scripts.flatMap(script => JSON.parse(script.textContent)['@graph'] ?? []);
  const agents = graph.filter(node => node['@type'] === 'RealEstateAgent');
  check(agents.length === 1 && agents[0].address.streetAddress === '109 Av. Foch', 'Business identity mismatch');
  if (file !== 'dist/index.html') {
    const breadcrumb = graph.find(node => node['@type'] === 'BreadcrumbList');
    check(Boolean(breadcrumb), 'Missing breadcrumbs');
    breadcrumb?.itemListElement.forEach((item, index) => check(item.position === index + 1, 'Invalid breadcrumb position'));
  }
  const collection = graph.find(node => node['@type'] === 'CollectionPage');
  collection?.mainEntity?.itemListElement?.forEach((item, index) => check(item.position === index + 1, 'Invalid collection position'));
  for (const anchor of document.querySelectorAll('a[href^="/"]')) internalTargets.add(anchor.getAttribute('href').split('?')[0].split('#')[0]);
}
const router = await readFile('src/app/router/AppRouter.tsx', 'utf8');
const allowed = new Set([...router.matchAll(/path="(\/[^"]*)"/g)].map(match => match[1]));
for (const target of internalTargets) if (!allowed.has(target) && !target.startsWith('/immobilier/') && !target.startsWith('/biens/')) errors.push(`Unknown internal target ${target}`);
const shell = new JSDOM(await readFile('dist/spa.html', 'utf8')).window.document;
if (shell.querySelector('main')) errors.push('Dynamic SPA shell contains unrelated prerendered page content');
const config = JSON.parse(await readFile('vercel.json', 'utf8'));
if (config.rewrites.at(-1).destination !== '/spa.html') errors.push('SPA fallback would serve homepage content');
if (errors.length) throw new Error(errors.join('\n'));
console.log(`Static audit: ${files.length} pages, ${internalTargets.size} internal destinations, valid French, canonicals, business graph and breadcrumb positions.`);

const server = await preview({ preview: { host: '127.0.0.1', port: 4177, strictPort: true } });
let browser;
try {
  browser = await launchBrowser();
  const guideRoutes = files.filter(file => file.includes('/immobilier/')).map(file => '/' + file.slice(5).replace('/index.html', ''));
  const routes = ['/', '/geographie', '/contact', '/vendre', '/estimation', '/biens', '/nos-dernieres-ventes', ...guideRoutes];
  for (const width of [320, 375, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      return url.origin === 'http://127.0.0.1:4177' && !url.pathname.startsWith('/api/') ? route.continue() : route.abort();
    });
    for (const route of routes) {
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:4177${route}`);
      await page.waitForSelector('main .page-banner, main .storefront-page-hero');
      const result = await page.evaluate(() => {
        const storefront = document.querySelector('main .storefront-page-hero');
        const banner = storefront
          ? storefront.querySelector('.storefront-page-hero__content')
          : document.querySelector('main .page-banner');
        const hero = storefront ?? banner;
        const heroRect = hero.getBoundingClientRect();
        const bannerRect = banner.getBoundingClientRect();
        const title = document.querySelector('main h1').getBoundingClientRect();
        const photo = storefront?.querySelector('.storefront-page-hero__photo');
        const photoRect = photo?.getBoundingClientRect();
        return {
          storefront: Boolean(storefront),
          height: storefront ? heroRect.height : bannerRect.height,
          fullWidthPhoto: Boolean(photo && Math.abs(photoRect.width - innerWidth) <= 1),
          naturalPhotoRatio: Boolean(photo && Math.abs(photoRect.width / photoRect.height - 1448 / 678) < 0.01),
          copyBelowPhoto: Boolean(photoRect && bannerRect.top >= photoRect.bottom - 1),
          overflow: document.documentElement.scrollWidth > innerWidth,
          titleOutside: title.top < bannerRect.top || title.bottom > bannerRect.bottom,
          grammar: /(?:à|de)\s+Le Havre\b/i.test(document.querySelector('main').textContent),
        };
      });
      const responsiveHomeHeight = route === "/" && width < 768 && result.height >= 400 && result.height <= 440;
      const expectedBannerHeight = responsiveHomeHeight || result.height === (width < 768 ? 360 : 420);
      const storefrontPhotoFits = result.storefront && result.fullWidthPhoto && result.naturalPhotoRatio && result.copyBelowPhoto;
      const layoutOkay = result.storefront ? storefrontPhotoFits : expectedBannerHeight;
      if (!layoutOkay || result.overflow || result.titleOutside || result.grammar) throw new Error(`Banner audit failed: ${width}px ${route} ${JSON.stringify(result)}`);
      await page.close();
    }
    await context.close();
  }
  console.log(`Browser audit: ${routes.length * 4} mobile/tablet/desktop page checks passed; storefront facades remain uncropped and fixed-height banners retain their intended geometry.`);
} finally {
  await browser?.close();
  await new Promise(resolve => server.httpServer.close(resolve));
}
