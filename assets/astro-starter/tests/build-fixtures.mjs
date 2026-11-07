// Offline static build matrix. No HTTP listener, browser, real CMS or cloud deployment.
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, writeFile, readdir, rm, symlink, unlink, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, basename, relative, isAbsolute } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { Parser } from 'htmlparser2';
import sharp from 'sharp';
import settings from '../site.config.mjs';
import { configureInquiry } from '../scripts/configure-inquiry.mjs';

const source = resolve(import.meta.dirname, '..');
const tempBase = resolve(tmpdir());
const work = await mkdtemp(join(tempBase, 'waimao-site-build-'));
const withinTemp = relative(tempBase, work);
assert.ok(withinTemp && !withinTemp.startsWith('..') && !isAbsolute(withinTemp));
const skipped = new Set(['node_modules', 'dist', '.astro', '.vercel', '.wrangler', '.git']);
const secret = 'fixture-secret-must-never-appear-in-dist';
const configText = await readFile(join(source, 'site.config.mjs'), 'utf8');
const englishFile = 'src/content/products/en/sample-component.md';
const germanFile = 'src/content/products/de/muster-bauteil.md';
const englishProduct = await readFile(join(source, englishFile), 'utf8');
const germanProduct = await readFile(join(source, germanFile), 'utf8');
const markdown = (data, body = '## Markdown fixture\n\nThis is **real Markdown** in a local content collection.') => `---\n${JSON.stringify(data)}\n---\n\n${body}\n`;
const fixtureImage = { src: '../../../assets/products/sample-component.png', alt: 'Neutral fixture illustration' };
const fixtureSvg = await readFile(join(source, 'public/favicon.svg'), 'utf8');
async function allFiles(directory) {
  const files = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) files.push(...await allFiles(path)); else files.push(path);
  }
  return files;
}

function inspectHTML(html) {
  const tags = [], graph = [], switchLinks = [], text = [];
  let json = null, inSwitcher = false, inScript = false;
  new Parser({
    onopentag(name, attrs) {
      tags.push({ name, attrs });
      if (name === 'nav' && 'data-language-switcher' in attrs) inSwitcher = true;
      if (name === 'a' && inSwitcher) switchLinks.push(attrs);
      if (name === 'script') inScript = true;
      if (name === 'script' && attrs.type === 'application/ld+json') json = '';
    },
    ontext(value) { if (json !== null) json += value; else if (!inScript) text.push(value); },
    onclosetag(name) {
      if (name === 'script' && json !== null) { graph.push(...JSON.parse(json)['@graph']); json = null; }
      if (name === 'script') inScript = false;
      if (name === 'nav') inSwitcher = false;
    },
  }).end(html);
  return { tags, graph, switchLinks, text: text.join(' ') };
}

try {
  await cp(source, work, { recursive: true, filter: path => !skipped.has(basename(path)) && !basename(path).startsWith('.dev.vars') && !(basename(path).startsWith('.env') && basename(path) !== '.env.example') });
  await symlink(join(source, 'node_modules'), join(work, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
  const astroConfig = await readFile(join(work, 'astro.config.mjs'), 'utf8');
  await writeFile(join(work, 'astro.config.mjs'), astroConfig.replace('defineConfig({', "defineConfig({\n  cacheDir: './.fixture-astro-cache',"));
  const preload = join(work, 'fixture-fetch.mjs');
  await writeFile(preload, `
import { readFile } from 'node:fs/promises';
const rx = JSON.parse(await readFile(new URL('./tests/fixtures/rxcms.json', import.meta.url)));
rx.posts.push({ ...rx.posts[0], id: 202, slug: 'undated-news', data: { ...rx.posts[0].data, publishedAt: null } });
const wp = JSON.parse(await readFile(new URL('./tests/fixtures/wordpress.json', import.meta.url)));
globalThis.fetch = async input => {
  const url = new URL(input);
  if (url.origin === 'https://api.example.com') {
    if (url.pathname === '/api/v1/config') return Response.json(rx.config);
    const all = url.pathname.endsWith('/product') ? rx.products : url.pathname.endsWith('/post') ? rx.posts : null;
    if (!all) throw new Error('Unexpected RXCMS fixture route');
    const page = Number(url.searchParams.get('page')), pageSize = Number(url.searchParams.get('pageSize'));
    return Response.json({ items: all.slice((page-1)*pageSize, page*pageSize), total: all.length, page, pageSize });
  }
  if (url.origin === 'https://cms.example.com' && url.pathname === '/wp-json/wp/v2/posts') return Response.json(wp, { headers: { 'X-WP-Total': String(wp.length), 'X-WP-TotalPages': '1' } });
  throw new Error('Network disabled in fixture builds');
};
`);
  const multilingual = { defaultLocale: 'en', locales: [{ code: 'en', htmlLang: 'en', name: 'English' }, { code: 'de', htmlLang: 'de', name: 'Deutsch', dir: 'ltr' }] };
  for (const variant of ['local', 'rxcms', 'wordpress', 'consent-off', 'inquiry-vercel', 'inquiry-cloudflare', 'multilingual', 'markdown']) {
    const isMultilingual = ['multilingual', 'markdown'].includes(variant);
    const config = structuredClone(settings);
    config.i18n = null; config.language = 'en';
    config.output = 'static'; config.deployTarget = null;
    config.content = { source: 'local', locale: 'en' };
    config.inquiry = { provider: 'none', turnstileSiteKey: '' };
    config.cookieConsent.enabled = true; config.google = { analyticsId: '', adsId: '' };
    config.ogImage = '';
    if (variant === 'consent-off') config.ogImage = '/favicon.svg'; // Test a local asset URL, not a default share image.
    if (variant === 'inquiry-vercel') config.ogImage = 'https://cdn.example.com/share.png';
    if (['rxcms', 'wordpress'].includes(variant)) { config.content.source = variant; config.indexable = true; }
    if (variant === 'consent-off') { config.cookieConsent.enabled = false; config.google.analyticsId = 'G-EXAMPLE123'; config.google.adsId = 'AW-123456'; }
    if (variant.startsWith('inquiry-')) { config.deployTarget = variant.slice('inquiry-'.length); config.inquiry = { provider: 'rxcms', turnstileSiteKey: 'public-fixture-key' }; }
    if (isMultilingual) {
      config.i18n = multilingual; config.indexable = true;
      await writeFile(join(work, germanFile), germanProduct.replace('slug: muster-bauteil', 'slug: muster-bauteil-für-pumpen'));
      // Independent static inquiry functions also need translated labels and receipt messages.
      config.deployTarget = 'vercel'; config.inquiry = { provider: 'rxcms', turnstileSiteKey: 'public-fixture-key' };
      config.google = { analyticsId: 'G-EXAMPLE123', adsId: 'AW-123456' };
      await writeFile(join(work, 'src/content/products/en/untranslated-component.md'), markdown({
        key: 'untranslated-component', slug: 'untranslated-component', title: 'English-only sample component', description: 'No German translation.', specifications: [],
      }));
    }
    if (variant === 'markdown') {
      await mkdir(join(work, 'src/content/articles/en'), { recursive: true });
      await mkdir(join(work, 'src/content/articles/de'), { recursive: true });
      await writeFile(join(work, 'src/assets/products/fixture-icon.svg'), fixtureSvg);
      const svgImage = { ...fixtureImage, src: '../../../assets/products/fixture-icon.svg' };
      const article = { key: 'local-guide', slug: 'local-guide', title: 'Local guide', description: 'Local article fixture.', images: [fixtureImage], publishedAt: '2026-01-02' };
      await writeFile(join(work, 'src/content/articles/en/local-guide.md'), markdown({ ...article, images: [svgImage] }));
      await writeFile(join(work, 'src/content/articles/de/ratgeber.md'), markdown({ ...article, slug: 'ratgeber-für-pumpen', title: 'Lokaler Ratgeber', images: [{ ...fixtureImage, alt: 'Neutrale Illustration' }] }));
      await writeFile(join(work, 'src/content/articles/en/undated-guide.md'), markdown({ key: 'undated-guide', slug: 'undated-guide', title: 'Undated guide', description: 'No date or German translation.' }));
      // A second gallery image must stay lazy while the first is prioritized.
      await writeFile(join(work, englishFile), englishProduct.replace(fixtureImage.src, svgImage.src).replace('---\n\n##', '  - src: ../../../assets/products/sample-component.png\n    alt: Additional illustration\n---\n\n##').replace('---\r\n\r\n##', '  - src: ../../../assets/products/sample-component.png\r\n    alt: Additional illustration\r\n---\r\n\r\n##'));
    }
    await writeFile(join(work, 'site.config.mjs'), `export default ${JSON.stringify(config)};\n`);
    if (['rxcms', 'wordpress'].includes(variant)) {
      await writeFile(join(work, 'src/content/products/en/unused-invalid.md'), '---\ntitle: Unused local content\n---\n');
    }
    await configureInquiry(work, config);
    await configureInquiry(work, config, {}, true);
    const env = { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', RXCMS_API_BASE: 'https://api.example.com', RXCMS_SITE_KEY: secret,
      WORDPRESS_API_BASE: 'https://cms.example.com/wp-json/', WORDPRESS_USERNAME: 'fixture', WORDPRESS_APPLICATION_PASSWORD: secret };
    delete env.SITE_OUTPUT; delete env.DEPLOY_TARGET;
    const result = spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, join(source, 'node_modules/astro/bin/astro.mjs'), 'build'], { cwd: work, env, encoding: 'utf8', timeout: 60000 });
    assert.equal(result.status, 0, `${variant}: ${result.stdout}\n${result.stderr}`);
    const files = await allFiles(join(work, 'dist'));
    for (const file of files) assert.ok(!(await readFile(file, 'utf8')).includes(secret), `Secret leaked into ${relative(work, file)}`);
    assert.ok(files.includes(join(work, 'dist/favicon.svg')));
    const htmlPages = new Map();
    for (const file of files.filter(path => path.endsWith('.html'))) {
      const page = inspectHTML(await readFile(file, 'utf8'));
      const { tags, graph, switchLinks } = page;
      const relativePath = relative(join(work, 'dist'), file).replaceAll('\\', '/');
      // Filesystem names may contain Unicode; compare links using URL-encoded paths.
      const pagePath = new URL(relativePath === 'index.html' ? '/' : `/${relativePath.endsWith('/index.html') ? relativePath.slice(0, -10) : relativePath}`, config.site).pathname;
      htmlPages.set(pagePath, page);
      const german = pagePath.startsWith('/de/');
      const prefix = german ? '/de' : '';
      assert.equal(tags.find(tag => tag.name === 'html').attrs.lang, german ? 'de' : 'en');
      assert.equal(tags.find(tag => tag.name === 'html').attrs.dir, 'ltr');
      assert.equal(graph.find(node => node['@type'] === 'WebPage').inLanguage, german ? 'de' : 'en');
      for (const [type, id] of [['Organization', 'organization'], ['WebSite', 'website']]) assert.equal(graph.find(node => node['@type'] === type)['@id'], `${new URL('/', config.site).href}#${id}`);
      assert.equal(switchLinks.length, isMultilingual ? 2 : 0);
      if (!isMultilingual) assert.ok(!tags.some(tag => tag.attrs.hreflang), 'Single-language output has no hreflang');
      const meta = key => tags.find(tag => tag.name === 'meta' && (tag.attrs.property === key || tag.attrs.name === key))?.attrs.content;
      assert.ok(tags.some(tag => tag.name === 'link' && tag.attrs.rel === 'icon' && tag.attrs.href === '/favicon.svg'), `${file}: favicon missing`);
      assert.equal(meta('og:site_name'), config.name);
      assert.equal(meta('og:image'), config.ogImage ? new URL(config.ogImage, config.site).href : undefined);
      assert.equal(meta('twitter:card'), config.ogImage ? 'summary_large_image' : undefined);
      const product = graph.find(node => node['@type'] === 'Product');
      const article = graph.find(node => node['@type'] === 'Article');
      if (['sample-component', 'sample-pump', 'sample-valve', 'untranslated-component', 'muster-bauteil-für-pumpen'].some(slug => pagePath === `${prefix}/products/${encodeURIComponent(slug)}/`)) assert.ok(product, `${file}: Product missing`);
      const isArticlePage = relative(join(work, 'dist/articles'), file) === join('sample-news', 'index.html') || relative(join(work, 'dist/articles'), file) === join('undated-news', 'index.html');
      if (isArticlePage) assert.ok(article, `${variant}: Article missing`);
      if (product || article) {
        const entity = product || article;
        const page = graph.find(node => node['@type'] === 'WebPage');
        assert.equal(entity.mainEntityOfPage['@id'], page['@id']);
        assert.equal(entity.url, page.url);
        const breadcrumb = graph.find(node => node['@type'] === 'BreadcrumbList');
        assert.ok(breadcrumb, `${file}: BreadcrumbList missing`);
        assert.equal(breadcrumb['@id'], `${page.url}#breadcrumb`);
        assert.deepEqual(breadcrumb.itemListElement.map(item => item.position), [1, 2, 3]);
        assert.deepEqual(breadcrumb.itemListElement.map(item => item.item), [new URL(`${prefix}/`, config.site).href, new URL(`${prefix}${product ? '/products/' : '/articles/'}`, config.site).href, page.url]);
        assert.equal(breadcrumb.itemListElement[0].name, german ? 'Startseite' : 'Home');
        if (article) {
          assert.equal(article.headline, variant === 'markdown' ? (german ? 'Lokaler Ratgeber' : pagePath.includes('undated-guide') ? 'Undated guide' : 'Local guide') : variant === 'wordpress' ? 'Pumps & valves' : 'Sample news');
          assert.equal(article.datePublished, page.url.includes('/undated-') ? undefined : variant === 'markdown' ? '2026-01-02T00:00:00.000Z' : '2026-01-01T00:00:00Z');
          assert.equal(article.author, undefined);
        }
        if (product) {
          if (config.content.source === 'local' && !pagePath.includes('untranslated-component')) {
            assert.deepEqual(product.image, tags.filter(tag => tag.name === 'img').map(tag => new URL(tag.attrs.src, config.site).href));
          } else assert.deepEqual(product.image, page.url.endsWith('/sample-pump/') ? ['https://media.example.com/pump.webp'] : undefined);
          assert.equal(product.offers, undefined); assert.equal(product.aggregateRating, undefined);
        }
      }
      if (config.content.source === 'local') {
        const images = tags.filter(tag => tag.name === 'img');
        for (const [index, image] of images.entries()) {
          const format = image.attrs.src.endsWith('.svg') ? 'svg' : 'webp';
          assert.ok(image.attrs.src.startsWith('/_astro/') && image.attrs.src.endsWith(`.${format}`));
          assert.ok(Number(image.attrs.width) > 0 && Number(image.attrs.height) > 0);
          assert.ok(image.attrs.alt?.trim());
          if (format === 'webp') assert.ok(image.attrs.srcset?.includes('320w') && image.attrs.srcset.includes('640w') && image.attrs.srcset.includes('960w'));
          assert.ok(image.attrs.sizes);
          assert.equal(image.attrs.loading, index === 0 ? 'eager' : 'lazy');
          assert.equal(image.attrs.fetchpriority, index === 0 ? 'high' : undefined);
          // Buffer input avoids libvips retaining Windows file handles between builds.
          const output = await readFile(join(work, 'dist', image.attrs.src));
          if (format === 'svg') assert.equal(output.toString('utf8'), fixtureSvg, 'SVG icon must remain unchanged');
          const metadata = await sharp(output).metadata();
          assert.equal(metadata.format, format);
          assert.equal(metadata.width, Number(image.attrs.width)); assert.equal(metadata.height, Number(image.attrs.height));
        }
        if (product && !pagePath.includes('untranslated-component')) {
          assert.ok(images.length > 0, 'Markdown product image must render');
          assert.equal(images[0].attrs.alt, german ? 'Neutrale geometrische Darstellung eines Musterbauteils' : 'Neutral geometric illustration of a sample component');
          assert.ok(tags.some(tag => tag.name === 'strong'), 'Markdown body must render, not just frontmatter');
        }
      }
    }
    assert.equal(htmlPages.size, variant === 'rxcms' ? 10 : variant === 'markdown' ? 17 : isMultilingual ? 14 : 7);
    const index = await readFile(join(work, 'dist/index.html'), 'utf8');
    const contact = await readFile(join(work, 'dist/contact/index.html'), 'utf8');
    const ids = new Set(), remoteScripts = [];
    new Parser({ onopentag(name, attrs) { if (attrs.id) ids.add(attrs.id); if (name === 'script' && attrs.src?.startsWith('https:')) remoteScripts.push(attrs.src); } }).end(index);
    assert.equal(ids.has('export-consent-options'), variant !== 'consent-off');
    assert.ok(remoteScripts.every(src => !src.includes('google')));
    assert.equal(contact.includes('id="inquiry-form"'), variant.startsWith('inquiry-') || isMultilingual);
    assert.equal(index.includes('href="/articles/"'), ['rxcms', 'wordpress', 'markdown'].includes(variant), 'Articles is linked only when posts exist');
    if (variant === 'rxcms') {
      assert.ok(files.includes(join(work, 'dist/products/sample-pump/index.html')));
      assert.ok(files.includes(join(work, 'dist/articles/sample-news/index.html')));
      assert.ok(!files.includes(join(work, 'dist/products/sample-component/index.html')));
      assert.ok((await readFile(join(work, 'dist/sitemap.xml'), 'utf8')).includes('/products/sample-pump/'));
    }
    if (variant === 'wordpress') {
      const article = await readFile(join(work, 'dist/articles/sample-news/index.html'), 'utf8');
      assert.ok(article.includes('Pumps &amp; valves'));
      assert.ok(!article.includes('onclick='));
      assert.ok(!files.some(path => path.includes('protected-news')));
    }
    if (isMultilingual) {
      const enProduct = '/products/sample-component/', deProduct = '/de/products/muster-bauteil-f%C3%BCr-pumpen/';
      assert.ok(htmlPages.has(deProduct));
      for (const missing of ['/de/products/untranslated-component/', '/de/products/sample-component/', '/de/404.html', '/en/']) assert.ok(!htmlPages.has(missing));
      const alternates = path => htmlPages.get(path).tags.filter(tag => tag.name === 'link' && tag.attrs.rel === 'alternate').map(tag => tag.attrs);
      const expected = [
        { rel: 'alternate', hreflang: 'en', href: new URL(enProduct, config.site).href },
        { rel: 'alternate', hreflang: 'de', href: new URL(deProduct, config.site).href },
        { rel: 'alternate', hreflang: 'x-default', href: new URL(enProduct, config.site).href },
      ];
      assert.deepEqual(alternates(enProduct), expected); assert.deepEqual(alternates(deProduct), expected);
      assert.ok(!alternates('/products/untranslated-component/').some(link => link.hreflang === 'de'));
      for (const [path, page] of htmlPages) {
        for (const link of alternates(path)) {
          const targetPath = new URL(link.href).pathname;
          assert.ok(htmlPages.has(targetPath), `Alternate must exist: ${link.href}`);
          if (link.hreflang !== 'x-default') assert.deepEqual(alternates(targetPath), alternates(path), 'Alternates must be reciprocal');
        }
        const noindex = path === '/404.html' || (variant !== 'markdown' && path.endsWith('/articles/'));
        assert.equal(page.tags.some(tag => tag.attrs.rel === 'canonical'), !noindex);
        assert.equal(page.tags.find(tag => tag.attrs.name === 'robots').attrs.content, noindex ? 'noindex, follow' : 'index, follow');
        if (noindex) assert.deepEqual(alternates(path), []);
        else assert.equal(page.tags.find(tag => tag.attrs.rel === 'canonical').attrs.href, new URL(path, config.site).href);
        for (const link of page.switchLinks) assert.ok(htmlPages.has(link.href), `Language link must exist: ${link.href}`);
      }
      for (const path of [enProduct, deProduct]) {
        assert.deepEqual(htmlPages.get(path).switchLinks.map(link => link.href), [enProduct, deProduct], `${path}: switcher must link to the translated product, not a homepage`);
      }
      assert.deepEqual(htmlPages.get('/products/untranslated-component/').switchLinks.map(link => link.href), ['/products/untranslated-component/', '/de/']);
      assert.ok(htmlPages.get(deProduct).text.includes('Produktinformationen'));
      assert.ok(htmlPages.get('/de/').text.includes('Katalog ansehen'));
      assert.ok(htmlPages.get('/de/contact/').text.includes('Anfrage senden'));
      assert.ok(htmlPages.get('/de/privacy-policy/').text.includes('Datenschutz und Cookies'));
      if (variant !== 'markdown') assert.ok(htmlPages.get('/de/articles/').text.includes('noch keine Artikel'));
      else {
        const enArticle = '/articles/local-guide/', deArticle = '/de/articles/ratgeber-f%C3%BCr-pumpen/';
        for (const path of ['/', '/products/', enProduct, enArticle]) {
          assert.ok(htmlPages.get(path).tags.some(tag => tag.name === 'img' && tag.attrs.src.endsWith('.svg')), `${path}: Markdown SVG icon must render as SVG`);
        }
        assert.deepEqual(alternates(enArticle), alternates(deArticle));
        assert.deepEqual(alternates(enArticle).map(link => link.href), [enArticle, deArticle, enArticle].map(path => new URL(path, config.site).href));
        for (const path of [enArticle, deArticle, '/articles/undated-guide/']) {
          const articlePage = htmlPages.get(path);
          assert.ok(articlePage.graph.some(node => node['@type'] === 'Article'));
          assert.ok(articlePage.tags.some(tag => tag.name === 'strong'));
          if (!path.includes('undated')) {
            const image = articlePage.tags.find(tag => tag.name === 'img');
            assert.equal(image.attrs.alt, path === enArticle ? 'Neutral fixture illustration' : 'Neutrale Illustration');
            assert.deepEqual(articlePage.graph.find(node => node['@type'] === 'Article').image, [new URL(image.attrs.src, config.site).href]);
            assert.deepEqual(articlePage.switchLinks.map(link => link.href), [enArticle, deArticle]);
          }
        }
        assert.ok(!htmlPages.has('/de/articles/undated-guide/'));
        assert.ok(!alternates('/articles/undated-guide/').some(link => link.hreflang === 'de'));
        assert.deepEqual(htmlPages.get('/articles/undated-guide/').switchLinks.map(link => link.href), ['/articles/undated-guide/', '/de/']);
        assert.equal(htmlPages.get('/products/sample-component/').tags.filter(tag => tag.name === 'img').length, 2);
        assert.ok(htmlPages.get('/de/articles/').text.includes('Lokaler Ratgeber'));
      }
      const deForm = htmlPages.get('/de/contact/').tags.find(tag => tag.attrs.id === 'inquiry-form');
      assert.equal(JSON.parse(deForm.attrs['data-messages']).submitting, 'Wird gesendet…');
      const cookieOptions = path => JSON.parse(htmlPages.get(path).tags.find(tag => tag.attrs.id === 'export-consent-options').attrs['data-options']);
      assert.equal(cookieOptions('/de/').language.default, 'de');
      assert.equal(cookieOptions('/de/').cookieName, cookieOptions('/').cookieName);
      assert.equal(cookieOptions('/de/').revision, cookieOptions('/').revision);
      assert.equal(cookieOptions('/de/').language.translations.de.consentModal.title, 'Ihre Datenschutzauswahl');
      assert.ok(cookieOptions('/de/').language.translations.de.consentModal.footer.includes('/de/privacy-policy/'));
      const locations = []; let inLoc = false;
      new Parser({ onopentag(name) { inLoc = name === 'loc'; }, ontext(text) { if (inLoc) locations.push(text); }, onclosetag() { inLoc = false; } }, { xmlMode: true }).end(await readFile(join(work, 'dist/sitemap.xml'), 'utf8'));
      const expectedPaths = [...htmlPages.keys()].filter(path => path !== '/404.html' && (variant === 'markdown' || !path.endsWith('/articles/')));
      assert.deepEqual(locations.sort(), expectedPaths.map(path => new URL(path, config.site).href).sort());
    }
    if (variant === 'inquiry-cloudflare') assert.deepEqual(JSON.parse(await readFile(join(work, 'dist/_routes.json'))).include, ['/api/inquiry']);
    if (variant.startsWith('inquiry-')) {
      const endpoint = variant === 'inquiry-vercel' ? 'api/inquiry.js' : 'functions/api/inquiry.js';
      const module = await import(pathToFileURL(join(work, endpoint)).href);
      const req = new Request('https://www.example.com/api/inquiry');
      const response = variant === 'inquiry-vercel' ? await module.default.fetch(req) : await module.onRequest({ request: req, env: {} });
      assert.equal(response.status, 405, 'Generated platform entry must import and invoke the shared handler');
    }
    console.log(`${variant}: offline static build and output checks passed (${files.filter(p => p.endsWith('.html')).length} HTML pages)`);
    if (['rxcms', 'wordpress'].includes(variant)) await unlink(join(work, 'src/content/products/en/unused-invalid.md'));
  }
  // Config failures must stop the real build, before any remote CMS fetch or adapter load.
  const uiFile = join(work, 'src/i18n/ui.mjs');
  const uiText = await readFile(uiFile, 'utf8');
  for (const scenario of ['rxcms', 'wordpress', 'server', 'missing-ui']) {
    const config = { ...structuredClone(settings), output: scenario === 'server' ? 'server' : 'static', deployTarget: 'vercel',
      content: { source: ['rxcms', 'wordpress'].includes(scenario) ? scenario : 'local', locale: 'en' },
      inquiry: { provider: 'none', turnstileSiteKey: '' }, i18n: multilingual };
    await writeFile(join(work, 'site.config.mjs'), `export default ${JSON.stringify(config)};\n`);
    await writeFile(uiFile, uiText + (scenario === 'missing-ui' ? '\ndelete dictionaries.de.home.explore;\ndelete dictionaries.de.cookie.title;\ndelete dictionaries.en.nav.contact;\n' : ''));
    const env = { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' }; delete env.SITE_OUTPUT; delete env.DEPLOY_TARGET;
    const result = spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, join(source, 'node_modules/astro/bin/astro.mjs'), 'build'], { cwd: work, env, encoding: 'utf8', timeout: 60000 });
    assert.notEqual(result.status, 0, `${scenario} should fail`);
    const output = result.stdout + result.stderr;
    for (const message of scenario === 'missing-ui' ? ['de.home.explore', 'de.cookie.title', 'en.nav.contact'] : [scenario === 'server' ? 'require static' : 'separate integration']) assert.ok(output.includes(message), `${scenario}: ${output}`);
    console.log(`${scenario}: unsupported/incomplete multilingual build rejected as expected`);
  }
  await writeFile(uiFile, uiText);
  await writeFile(join(work, 'site.config.mjs'), `export default ${JSON.stringify({ ...settings, output: 'static', deployTarget: null, content: { source: 'local', locale: 'en' }, inquiry: { provider: 'none', turnstileSiteKey: '' }, i18n: multilingual })};\n`);
  const good = { key: 'invalid-fixture', slug: 'invalid-fixture', title: 'Fixture', description: 'Example only.', specifications: [] };
  const failures = [
    { name: 'missing-title', collection: 'products', data: { ...good, title: undefined }, message: 'title' },
    { name: 'missing-description', collection: 'articles', data: { ...good, description: undefined }, message: 'description' },
    { name: 'missing-alt', collection: 'products', data: { ...good, images: [{ src: fixtureImage.src }] }, message: 'alt' },
    { name: 'missing-image', collection: 'products', data: { ...good, images: [{ src: '../../../assets/products/missing.png', alt: 'Missing image' }] }, message: 'missing.png' },
    { name: 'duplicate-key', collection: 'products', data: { ...good, key: 'sample-component' }, message: 'duplicate translation key' },
    { name: 'duplicate-slug', collection: 'products', data: { ...good, slug: 'sample-component' }, message: 'duplicate slug' },
    { name: 'unquoted-date', collection: 'articles', raw: ['---', 'key: unquoted-date', 'slug: unquoted-date', 'title: Fixture', 'description: Example only.', 'publishedAt: 2026-02-30', '---', '', 'Body', ''].join(String.fromCharCode(10)), message: 'publishedAt' },
  ];
  for (const failure of failures) {
    const file = join(work, `src/content/${failure.collection}/en/${failure.name}.md`);
    await writeFile(file, failure.raw ?? markdown(failure.data));
    const env = { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' }; delete env.SITE_OUTPUT; delete env.DEPLOY_TARGET;
    const result = spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, join(source, 'node_modules/astro/bin/astro.mjs'), 'build'], { cwd: work, env, encoding: 'utf8', timeout: 60000 });
    assert.notEqual(result.status, 0, `${failure.name} should fail`);
    const output = result.stdout + result.stderr;
    assert.ok(output.includes(failure.message), output);
    const filename = failure.name === 'missing-image' ? 'missing.png' : `${failure.name}.md`;
    assert.ok(output.includes(filename), `Error must name the invalid Markdown or missing image file: ${output}`);
    await unlink(file);
    console.log(`${failure.name}: invalid content rejected with filename`);
  }
  assert.equal(await readFile(join(source, 'site.config.mjs'), 'utf8'), configText, 'Source settings must not change');
  assert.equal(await readFile(join(source, englishFile), 'utf8'), englishProduct, 'Source English Markdown must not change');
  assert.equal(await readFile(join(source, germanFile), 'utf8'), germanProduct, 'Source German Markdown must not change');
} finally {
  // Unlink the dependency junction first; recursive cleanup is limited to our verified temp directory.
  try { await unlink(join(work, 'node_modules')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await rm(work, { recursive: true, force: true });
}
