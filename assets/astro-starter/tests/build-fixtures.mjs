// Offline static build matrix. No HTTP listener, browser, real CMS or cloud deployment.
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, writeFile, readdir, rm, symlink, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, basename, relative, isAbsolute } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { Parser } from 'htmlparser2';
import settings from '../site.config.mjs';
import { configureInquiry } from '../scripts/configure-inquiry.mjs';

const source = resolve(import.meta.dirname, '..');
const tempBase = resolve(tmpdir());
const work = await mkdtemp(join(tempBase, 'export-site-build-'));
const withinTemp = relative(tempBase, work);
assert.ok(withinTemp && !withinTemp.startsWith('..') && !isAbsolute(withinTemp));
const skipped = new Set(['node_modules', 'dist', '.astro', '.vercel', '.wrangler', '.git']);
const secret = 'fixture-secret-must-never-appear-in-dist';
const configText = await readFile(join(source, 'site.config.mjs'), 'utf8');
const localProductsText = await readFile(join(source, 'src/data/local-products.json'), 'utf8');
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
  for (const variant of ['local', 'rxcms', 'wordpress', 'consent-off', 'inquiry-vercel', 'inquiry-cloudflare', 'multilingual']) {
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
    const localProducts = JSON.parse(localProductsText);
    if (variant === 'multilingual') {
      config.i18n = multilingual; config.indexable = true;
      localProducts[0].translations.de.slug = 'muster-bauteil-für-pumpen';
      // Independent static inquiry functions also need translated labels and receipt messages.
      config.deployTarget = 'vercel'; config.inquiry = { provider: 'rxcms', turnstileSiteKey: 'public-fixture-key' };
      config.google = { analyticsId: 'G-EXAMPLE123', adsId: 'AW-123456' };
      localProducts.push({ key: 'untranslated-component', translations: { en: {
        ...localProducts[0].translations.en, slug: 'untranslated-component', title: 'English-only sample component',
      } } });
    }
    await writeFile(join(work, 'src/data/local-products.json'), JSON.stringify(localProducts));
    await writeFile(join(work, 'site.config.mjs'), `export default ${JSON.stringify(config)};\n`);
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
      assert.equal(switchLinks.length, variant === 'multilingual' ? 2 : 0);
      if (variant !== 'multilingual') assert.ok(!tags.some(tag => tag.attrs.hreflang), 'Single-language output has no hreflang');
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
          assert.equal(article.headline, variant === 'wordpress' ? 'Pumps & valves' : 'Sample news');
          assert.equal(article.datePublished, page.url.endsWith('/undated-news/') ? undefined : '2026-01-01T00:00:00Z');
          assert.equal(article.author, undefined);
        }
        if (product) {
          assert.deepEqual(product.image, page.url.endsWith('/sample-pump/') ? ['https://media.example.com/pump.webp'] : undefined);
          assert.equal(product.offers, undefined); assert.equal(product.aggregateRating, undefined);
        }
      }
    }
    assert.equal(htmlPages.size, variant === 'rxcms' ? 10 : variant === 'multilingual' ? 14 : 7);
    const index = await readFile(join(work, 'dist/index.html'), 'utf8');
    const contact = await readFile(join(work, 'dist/contact/index.html'), 'utf8');
    const ids = new Set(), remoteScripts = [];
    new Parser({ onopentag(name, attrs) { if (attrs.id) ids.add(attrs.id); if (name === 'script' && attrs.src?.startsWith('https:')) remoteScripts.push(attrs.src); } }).end(index);
    assert.equal(ids.has('export-consent-options'), variant !== 'consent-off');
    assert.ok(remoteScripts.every(src => !src.includes('google')));
    assert.equal(contact.includes('id="inquiry-form"'), variant.startsWith('inquiry-') || variant === 'multilingual');
    assert.equal(index.includes('href="/articles/"'), ['rxcms', 'wordpress'].includes(variant), 'Articles is linked only when posts exist');
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
    if (variant === 'multilingual') {
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
        const noindex = path === '/404.html' || path.endsWith('/articles/');
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
      assert.ok(htmlPages.get('/de/articles/').text.includes('noch keine Artikel'));
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
      const expectedPaths = [...htmlPages.keys()].filter(path => path !== '/404.html' && !path.endsWith('/articles/'));
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
  assert.equal(await readFile(join(source, 'site.config.mjs'), 'utf8'), configText, 'Source settings must not change');
  assert.equal(await readFile(join(source, 'src/data/local-products.json'), 'utf8'), localProductsText, 'Source products must not change');
} finally {
  // Unlink the dependency junction first; recursive cleanup is limited to our verified temp directory.
  try { await unlink(join(work, 'node_modules')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await rm(work, { recursive: true, force: true });
}
