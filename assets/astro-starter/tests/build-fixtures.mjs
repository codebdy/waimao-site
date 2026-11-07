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
async function allFiles(directory) {
  const files = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) files.push(...await allFiles(path)); else files.push(path);
  }
  return files;
}

function inspectHTML(html) {
  const tags = [], graph = [];
  let json = null;
  new Parser({
    onopentag(name, attrs) {
      tags.push({ name, attrs });
      if (name === 'script' && attrs.type === 'application/ld+json') json = '';
    },
    ontext(text) { if (json !== null) json += text; },
    onclosetag(name) {
      if (name === 'script' && json !== null) { graph.push(...JSON.parse(json)['@graph']); json = null; }
    },
  }).end(html);
  return { tags, graph };
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
  for (const variant of ['local', 'rxcms', 'wordpress', 'consent-off', 'inquiry-vercel', 'inquiry-cloudflare']) {
    const config = structuredClone(settings);
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
    for (const file of files.filter(path => path.endsWith('.html'))) {
      const { tags, graph } = inspectHTML(await readFile(file, 'utf8'));
      const meta = key => tags.find(tag => tag.name === 'meta' && (tag.attrs.property === key || tag.attrs.name === key))?.attrs.content;
      assert.ok(tags.some(tag => tag.name === 'link' && tag.attrs.rel === 'icon' && tag.attrs.href === '/favicon.svg'), `${file}: favicon missing`);
      assert.equal(meta('og:site_name'), config.name);
      assert.equal(meta('og:image'), config.ogImage ? new URL(config.ogImage, config.site).href : undefined);
      assert.equal(meta('twitter:card'), config.ogImage ? 'summary_large_image' : undefined);
      const product = graph.find(node => node['@type'] === 'Product');
      const article = graph.find(node => node['@type'] === 'Article');
      if (['sample-component', 'sample-pump', 'sample-valve'].some(slug => file === join(work, 'dist/products', slug, 'index.html'))) assert.ok(product, `${file}: Product missing`);
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
        assert.deepEqual(breadcrumb.itemListElement.map(item => item.item), [new URL('/', config.site).href, new URL(product ? '/products/' : '/articles/', config.site).href, page.url]);
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
    const index = await readFile(join(work, 'dist/index.html'), 'utf8');
    const contact = await readFile(join(work, 'dist/contact/index.html'), 'utf8');
    const ids = new Set(), remoteScripts = [];
    new Parser({ onopentag(name, attrs) { if (attrs.id) ids.add(attrs.id); if (name === 'script' && attrs.src?.startsWith('https:')) remoteScripts.push(attrs.src); } }).end(index);
    assert.equal(ids.has('export-consent-options'), variant !== 'consent-off');
    assert.ok(remoteScripts.every(src => !src.includes('google')));
    assert.equal(contact.includes('id="inquiry-form"'), variant.startsWith('inquiry-'));
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
  assert.equal(await readFile(join(source, 'site.config.mjs'), 'utf8'), configText, 'Source settings must not change');
} finally {
  // Unlink the dependency junction first; recursive cleanup is limited to our verified temp directory.
  try { await unlink(join(work, 'node_modules')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await rm(work, { recursive: true, force: true });
}
