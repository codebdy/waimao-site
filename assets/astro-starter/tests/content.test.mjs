import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRXCMSClient, mapRXEntry, mapRXUser, loadRXCatalog, stableMedia } from '../src/lib/content/rxcms.mjs';
import { createWordPressClient, mapWordPressPost } from '../src/lib/content/wordpress.mjs';
import { ContentError, uniqueSlugs } from '../src/lib/content/http.mjs';

const fixture = JSON.parse(await readFile(new URL('./fixtures/rxcms.json', import.meta.url)));
const wp = JSON.parse(await readFile(new URL('./fixtures/wordpress.json', import.meta.url)));
const env = { RXCMS_API_BASE: 'https://api.example.com', RXCMS_SITE_KEY: 'test-only-key' };
const page = (items, total, current, size) => Response.json({ items, total, page: current, pageSize: size });

test('distinct CMS IDs cannot overwrite the same public route', () => {
  assert.throws(() => uniqueSlugs([{ id: 1, slug: 'duplicate' }, { id: 2, slug: 'duplicate' }]), /Duplicate/);
  assert.throws(() => uniqueSlugs([{ slug: '../escape' }]));
});

test('RXCMS reads all pages with body fields and uses only server authentication', async () => {
  const calls = [];
  const client = createRXCMSClient(env, async (url, options) => {
    calls.push({ url, options });
    const current = Number(url.searchParams.get('page'));
    return page([fixture.products[current - 1]], 2, current, 1);
  });
  const items = await client.listAll('product', { locale: 'en', pageSize: 1 });
  assert.equal(items.length, 2);
  assert.equal(calls[1].url.searchParams.get('withContent'), 'true');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-only-key');
  assert.equal(calls[0].options.redirect, 'error');
  assert.ok(!calls[0].url.href.includes('test-only-key'));
  const product = mapRXEntry(items[0]);
  assert.equal(product.relatedSlugs[0], 'sample-valve');
  assert.equal(product.seoTitle, 'Sample pump specifications');
  assert.equal(product.schemaJson['@type'], 'Product');
  assert.equal(product.attachments[0].url, 'https://media.example.com/datasheet.pdf');
  assert.ok(product.contentHtml.includes('<strong>pump</strong>'));
  assert.ok(!product.contentHtml.includes('<script'));
});

test('RXCMS stops on duplicate, truncated, changing total and wrong-language pages', async () => {
  for (const mode of ['duplicate', 'empty', 'total', 'locale']) {
    const client = createRXCMSClient(env, async url => {
      const p = Number(url.searchParams.get('page'));
      if (p === 1) return page([fixture.products[0]], 2, 1, 1);
      const item = structuredClone(mode === 'duplicate' ? fixture.products[0] : fixture.products[1]);
      if (mode === 'locale') item.locale = 'de';
      return page(mode === 'empty' ? [] : [item], mode === 'total' ? 3 : 2, 2, 1);
    });
    await assert.rejects(client.listAll('product', { locale: 'en', pageSize: 1 }));
  }
});

test('RXCMS 401/402/403/500 are failures; only a missing detail maps to null', async () => {
  for (const status of [401, 402, 403, 500]) {
    const client = createRXCMSClient(env, async () => Response.json({ error: 'sensitive server detail' }, { status }));
    await assert.rejects(client.listAll('product'), e => e instanceof ContentError && e.status === status && !e.message.includes('sensitive'));
  }
  const client = createRXCMSClient(env, async () => new Response(null, { status: 404 }));
  assert.equal(await client.detail('product', 'missing', 'de'), null);
  await assert.rejects(client.listAll('product'));
});

test('RXCMS user list terminates without assuming pagination and tags encode names', async () => {
  let calls = 0;
  const client = createRXCMSClient(env, async url => {
    calls++;
    if (url.pathname.includes('/tag/')) { assert.ok(url.pathname.endsWith('/Pool%20Care')); return Response.json({ data: { name: 'Pool Care' } }); }
    return page([{ id: 1, type: 'user', locale: 'en', data: {} }], 1, 1, 100);
  });
  assert.equal((await client.listAll('user')).length, 1);
  await client.detail('tag', 'Pool Care', 'en');
  assert.equal(calls, 2);
});

test('RXCMS selects configured locale and never fills missing translations with samples', async () => {
  const fetcher = async url => url.pathname.endsWith('/config') ? Response.json(fixture.config) : page([], 0, 1, 100);
  assert.deepEqual((await loadRXCatalog(env, 'de', fetcher)).products, []);
  await assert.rejects(loadRXCatalog(env, 'fr', fetcher), /locale/);
  assert.throws(() => stableMedia({ file: { url: 'https://media.example.com/file?X-Amz-Signature=redacted' } }));
  assert.throws(() => createRXCMSClient({ ...env, RXCMS_SITE_KEY: '' }));
});

test('WordPress follows total-page headers, keeps auth server-side, excludes protected content and sanitizes HTML', async () => {
  const client = createWordPressClient({ WORDPRESS_API_BASE: 'https://cms.example.com/wp-json/', WORDPRESS_USERNAME: 'example', WORDPRESS_APPLICATION_PASSWORD: 'test-only' }, async (url, options) => {
    assert.equal(url.searchParams.get('status'), 'publish');
    assert.equal(options.redirect, 'error');
    assert.ok(options.headers.Authorization.startsWith('Basic '));
    const p = Number(url.searchParams.get('page'));
    return Response.json([wp[p - 1]], { headers: { 'X-WP-Total': '2', 'X-WP-TotalPages': '2' } });
  });
  const rows = await client.listAll('posts', 1);
  assert.equal(rows.length, 1);
  const post = mapWordPressPost(rows[0]);
  assert.equal(post.title, 'Pumps & valves');
  for (const unsafe of ['script', 'onclick', 'javascript:', 'iframe']) assert.ok(!post.contentHtml.includes(unsafe));
  assert.ok(post.contentHtml.includes('<strong>content</strong>'));
  assert.equal(post.canonical, undefined);
});

test('WordPress rejects partial credentials, private entries, broken pagination and authentication failure', async () => {
  assert.throws(() => createWordPressClient({ WORDPRESS_API_BASE: 'https://cms.example.com/wp-json/', WORDPRESS_USERNAME: 'example' }));
  const options = { WORDPRESS_API_BASE: 'https://cms.example.com/wp-json/' };
  await assert.rejects(createWordPressClient(options, async () => Response.json(wp)).listAll());
  await assert.rejects(createWordPressClient(options, async () => new Response(null, { status: 401 })).listAll());
  const rows = await createWordPressClient(options, async () => Response.json([{ ...wp[0], status: 'private' }], { headers: { 'X-WP-Total': '1', 'X-WP-TotalPages': '1' } })).listAll();
  assert.deepEqual(rows, []);
});

test('CMS body images survive sanitizing over HTTPS only; file names are not used as alt text', async () => {
  const { markdownHTML, cleanHTML } = await import('../src/lib/content/richtext.mjs');
  const html = markdownHTML('![Pump](https://media.example.com/p.webp)\n\n<img src="http://media.example.com/q.webp" onerror="alert(1)">');
  assert.ok(html.includes('src="https://media.example.com/p.webp"') && html.includes('alt="Pump"') && html.includes('loading="lazy"'));
  assert.ok(!html.includes('http://media.example.com/q.webp') && !html.includes('onerror'));
  assert.ok(!cleanHTML('<img src="javascript:alert(1)">').includes('javascript:'));
  const media = stableMedia({ id: 1, mediaType: 'image', name: 'IMG_2033.jpg', file: { url: 'https://media.example.com/a.jpg' } });
  assert.equal(media.alt, ''); assert.equal(media.name, 'IMG_2033.jpg');
});

test('RXCMS posts keep cover, localized tags and byline; authors load only for signed posts', async () => {
  const entry = { id: 7, type: 'post', slug: 'guide', locale: 'de', data: { title: 'Ratgeber', description: 'Kurz', content: 'Text',
    cover: { altText: '', media: { file: { url: 'https://media.example.com/cover.webp' } } },
    tags: [{ id: 61, name: 'Verpackung', sourceTagId: 59 }], author: { id: 12, name: 'Ana Li' } } };
  const post = mapRXEntry(entry);
  assert.deepEqual(post.cover, { url: 'https://media.example.com/cover.webp', alt: 'Ratgeber', name: '', type: 'image' });
  assert.deepEqual(post.tags, ['Verpackung']);
  assert.deepEqual(post.author, { id: 12, name: 'Ana Li' });
  assert.equal(mapRXEntry({ ...entry, type: 'product' }).author, null);
  const user = mapRXUser({ id: 12, type: 'user', locale: 'en', data: { name: 'Ana Li', position: 'Export manager', profile: '**Ten years** <script>x</script>' } });
  assert.ok(user.profileHtml.includes('<strong>Ten years</strong>') && !user.profileHtml.includes('<script'));
  const seen = [];
  const fetcher = async url => {
    seen.push(url.pathname);
    if (url.pathname.endsWith('/config')) return Response.json(fixture.config);
    if (url.pathname.endsWith('/post')) return page([entry], 1, 1, 100);
    // Members may come back with base-language fallback data; their envelope locale is not treated as wrong-language content.
    if (url.pathname.endsWith('/user')) return page([{ id: 12, type: 'user', locale: 'en', data: { name: 'Ana Li' } }, { id: 13, type: 'user', locale: 'en', data: { name: 'Other' } }], 2, 1, 100);
    return page([], 0, 1, 100);
  };
  const catalog = await loadRXCatalog(env, 'de', fetcher);
  assert.deepEqual(catalog.users.map(u => u.id), [12]);
  const empty = async url => url.pathname.endsWith('/config') ? Response.json(fixture.config) : page([], 0, 1, 100);
  seen.length = 0; await loadRXCatalog(env, 'de', async url => { seen.push(url.pathname); return empty(url); });
  assert.ok(!seen.some(path => path.endsWith('/user')), 'no posts, no member request');
});

test('rich text keeps hosted video and the inquiry card, nothing else from them', async () => {
  const { markdownHTML } = await import('../src/lib/content/richtext.mjs');
  const html = markdownHTML([
    '<figure><video src="https://stream.example.com/uid/manifest/video.m3u8" poster="http://insecure.example.com/p.jpg" onplay="x()" autoplay></video></figure>',
    '',
    '<figure class="cta evil" data-cta="inquiry" data-layout="stack" style="x">',
    '<figcaption>Need samples?</figcaption>',
    '<a href="/contact/">Request a quote</a>',
    '</figure>',
    '',
    '<figure class="cta" data-cta="popup"><a href="/contact/">x</a></figure>',
    '',
    '<video src="javascript:alert(1)"></video>',
  ].join('\n'));
  assert.ok(html.includes('src="https://stream.example.com/uid/manifest/video.m3u8"') && html.includes('data-hls'));
  assert.ok(!html.includes('insecure') && !html.includes('onplay') && !html.includes('autoplay') && !html.includes('javascript:'));
  assert.ok(html.includes('<figure class="cta" data-cta="inquiry" data-layout="stack">') && html.includes('<figcaption>Need samples?</figcaption>'));
  assert.ok(!html.includes('evil') && !html.includes('style=') && !html.includes('data-cta="popup"'));
});

test('RXCMS product FAQ is ordered and CMS noindex is carried to the page', () => {
  const item = mapRXEntry({ id: 1, type: 'product', slug: 'p', locale: 'en', data: { title: 'P', meta: { seoRobots: 'noindex,follow' },
    faqs: [{ question: 'B?', answer: 'b', seqValue: 2 }, { question: 'A?', answer: '<b>a</b>', seqValue: 1 }, { question: '', answer: 'x', seqValue: 3 }] } });
  assert.deepEqual(item.faqs, [{ question: 'A?', answer: 'a' }, { question: 'B?', answer: 'b' }]);
  assert.equal(item.noindex, true);
  assert.equal(mapRXEntry({ id: 2, type: 'post', slug: 'q', locale: 'en', data: { title: 'Q', meta: { seoRobots: 'index,follow' } } }).noindex, false);
});

test('RXCMS product FAQ comes from the detail; a detail that does not match its list entry stops the build', async () => {
  const listItem = { id: 101, type: 'product', slug: 'sample-pump', locale: 'en', data: { title: 'Sample pump' } };
  const fetcher = detailFor => async url => {
    if (url.pathname.endsWith('/config')) return Response.json(fixture.config);
    if (url.pathname.endsWith('/product/sample-pump')) return Response.json(detailFor);
    if (url.pathname.endsWith('/product')) return page([listItem], 1, 1, 100);
    return page([], 0, 1, 100);
  };
  const ok = await loadRXCatalog(env, 'en', fetcher({ ...listItem, data: { ...listItem.data, faqs: [{ question: 'Q?', answer: 'A.', seqValue: 1 }] } }));
  assert.deepEqual(ok.products[0].faqs, [{ question: 'Q?', answer: 'A.' }]);
  await assert.rejects(loadRXCatalog(env, 'en', fetcher({ ...listItem, id: 999 })), /does not match/);
  await assert.rejects(loadRXCatalog(env, 'en', fetcher({ ...listItem, locale: 'de' })), /does not match/);
});

test('a malformed video URL is dropped instead of breaking the build', async () => {
  const { markdownHTML } = await import('../src/lib/content/richtext.mjs');
  const html = markdownHTML('<video src="https://" poster="https://"></video>');
  assert.ok(html.includes('<video') && !html.includes('src=') && !html.includes('data-hls'));
});
