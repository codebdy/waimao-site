// Mock-RXCMS tests for rxcms-publish.mjs. No network: every request goes to the in-memory fake below.
//   node --test scripts/rxcms-publish.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { main, Stop, insertCtas } from './rxcms-publish.mjs';

const TOKEN = 'rxs_test_secret_token';
const HOOK = 'https://hooks.example.test/deploy/secret-hook-id';
const WEBP = Buffer.from('RIFF0000WEBPVP8 fake-image-bytes');
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from('second-image')]);
const PDFBYTES = Buffer.from('%PDF-1.7 fake datasheet');

function fakeRxcms({ conditionalSet = true, corrupt = false, failGallery = false, signedPublic = false } = {}) {
  const db = { posts: [], products: [], media: [], productMedia: [], productAttachment: [], faqs: [], nextId: 1000, calls: [], writes: 0, uploads: 0, deploys: 0,
    tags: [
      { id: 59, locale: 'en', data: { name: 'Packaging & Labels', sourceTagId: 0 } },
      { id: 61, locale: 'es', data: { name: 'Envases y etiquetas', sourceTagId: 59 } },
    ] };
  const site = { websiteId: 7, langs: { en: 1, es: 2 } };
  const users = [{ id: 12, locale: 'en', data: { name: 'Ana Li' } }];
  const categories = { post: [{ id: 5, slug: 'guides', langId: 1 }, { id: 6, slug: 'guides', langId: 2 }], product: [{ id: 9, slug: 'pumps', langId: 1 }] };
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  const page = items => ({ total: items.length, items });
  const match = (row, where) => Object.entries(where).every(([k, v]) => String(row[k]) === String(v._eq));
  const langOf = id => Object.keys(site.langs).find(k => site.langs[k] === id);
  const shape = (row, kind) => ({ ...row, websiteId: site.websiteId, metaId: row.meta?.id ?? null,
    ...(kind === 'post' ? { tags: row.tagIds.map(id => ({ id: String(id) })),
      cover: { id: String(row.coverId), file: { url: db.media.find(m => m.id === row.coverId)?.file.url } } }
      : { medias: db.productMedia.filter(r => r.productId === Number(row.id)), attachments: db.productAttachment.filter(r => r.productId === Number(row.id)),
        faqs: db.faqs.filter(q => q.productId === Number(row.id)) }) });
  const addMedia = (name, bytes, status = 'confirmed') => {
    const id = db.nextId++;
    db.media.push({ id, name, uploadStatus: status, websiteId: site.websiteId, bytes, file: { url: `https://media.test/${id}/${name}` } });
    return id;
  };
  const fetcher = async (url, init = {}) => {
    const u = new URL(url);
    db.calls.push(`${init.method || 'GET'} ${u.host}${u.pathname}`);
    if (u.hostname === 'media.test') {
      const m = db.media.find(x => x.file.url === url);
      return m ? new Response(corrupt ? Buffer.from('changed') : m.bytes) : new Response('', { status: 404 });
    }
    if (u.hostname === 'stream.test') return new Response('#EXTM3U');
    if (u.hostname === 'hooks.example.test') { db.deploys++; return new Response('{}'); }
    if (u.hostname === 'r2.test') { // presigned PUT: no bearer token may reach the storage host
      assert.equal(init.method, 'PUT'); assert.equal(init.headers.Authorization, undefined);
      db.media.find(m => m.id === Number(u.pathname.split('/')[1])).bytes = Buffer.from(init.body);
      return new Response('', { status: 200 });
    }
    assert.equal(init.headers.Authorization, `Bearer ${TOKEN}`);
    assert.equal(init.redirect, 'error');
    if (u.pathname === '/api/v1/config') {
      return json({ website: { id: site.websiteId, name: 'Example', baseLang: { id: 1, abbr: 'en' } },
        locales: [{ id: 1, abbr: 'en' }, { id: 2, abbr: 'es' }], features: { conditionalSet }, limits: { maxImageUploadBytes: 4096 } });
    }
    const locale = u.searchParams.get('locale');
    if (u.pathname === '/api/v1/content/tag') return json({ ...page(db.tags.filter(t => t.locale === locale)), page: 1, pageSize: 100 });
    if (u.pathname === '/api/v1/content/user') return json({ ...page(users), page: 1, pageSize: 100 });
    const detail = u.pathname.match(/^\/api\/v1\/content\/(post|product)\/(.+)$/);
    if (detail) {
      const rows = detail[1] === 'post' ? db.posts : db.products;
      const row = rows.find(r => r.slug === decodeURIComponent(detail[2]) && langOf(r.langId) === locale && r.status === 'published');
      if (!row) return json({ error: 'not found' }, 404);
      const data = detail[1] === 'post' ? { tags: row.tagIds.map(id => ({ id, ...db.tags.find(t => t.id === id).data })), author: { id: row.authorId } }
        : { attachments: db.productAttachment.filter(r => r.productId === Number(row.id)).map(r => {
          const url = db.media.find(m => m.id === r.mediaId).file.url;
          return { altText: r.altText, media: { file: { url: signedPublic ? `${url}?X-Amz-Signature=x` : url } } };
        }) };
      return json({ id: row.id, type: detail[1], slug: row.slug, locale, data });
    }
    if (u.pathname === '/api/media/image-upload') {
      db.uploads++;
      const id = addMedia(init.body.get('name'), Buffer.from(await init.body.get('file').arrayBuffer()));
      return json({ id });
    }
    if (u.pathname === '/api/media/upload-credentials') {
      db.uploads++;
      const body = JSON.parse(init.body);
      assert.deepEqual(Object.keys(body).sort(), ['mimeType', 'name', 'size'], 'only the fields the admin sends');
      const id = addMedia(body.name, Buffer.alloc(0), 'pending');
      return json({ mediaId: id, method: 'PUT', uploadUrl: `https://r2.test/${id}?X-Amz-Signature=secret`, headers: { 'Content-Type': 'application/pdf' } });
    }
    const confirm = u.pathname.match(/^\/api\/media\/(\d+)\/confirm$/);
    if (confirm) { db.media.find(m => m.id === Number(confirm[1])).uploadStatus = 'confirmed'; return json({ id: confirm[1] }); }
    if (u.pathname !== '/graphql') return json({ error: 'unknown' }, 404);
    const { query, variables: v } = JSON.parse(init.body);
    const op = query.match(/\{\s*(\w+)\(/)[1];
    const kindOf = name => /Product(?!Media|Attachment)/.test(name) ? 'product' : 'post';
    const rowsOf = kind => (kind === 'post' ? db.posts : db.products);
    if (op === 'mediaList') return json({ data: { mediaList: page(db.media.filter(m => match(m, v.where))) } });
    if (op === 'oneMedia') return json({ data: { oneMedia: db.media.find(m => match(m, v.where)) || null } });
    if (op === 'postCategoryList' || op === 'productCategoryList') {
      const kind = op.startsWith('post') ? 'post' : 'product';
      return json({ data: { [op]: page(categories[kind].map(c => ({ ...c, websiteId: site.websiteId })).filter(c => match(c, v.where))) } });
    }
    if (op === 'postList' || op === 'productList') {
      const kind = op === 'postList' ? 'post' : 'product';
      return json({ data: { [op]: page(rowsOf(kind).filter(r => match(r, v.where)).map(r => shape(r, kind))) } });
    }
    if (op === 'onePost' || op === 'oneProduct') {
      const kind = op === 'onePost' ? 'post' : 'product';
      const row = rowsOf(kind).find(r => match(r, v.where));
      return json({ data: { [op]: row ? shape(row, kind) : null } });
    }
    db.writes++;
    if (op === 'upsertOneTag') {
      const o = v.object, id = db.nextId++;
      db.tags.push({ id, locale: langOf(o.langId), data: { name: o.name, sourceTagId: o.sourceTagId ?? 0 } });
      return json({ data: { upsertOneTag: { id: String(id) } } });
    }
    if (op === 'upsertOneProductMedia') {
      if (failGallery && db.productMedia.length) return json({ errors: [{ message: 'boom' }] });
      db.productMedia.push({ id: db.nextId++, ...v.object }); return json({ data: { [op]: { id: '1' } } });
    }
    if (op === 'upsertOneProductAttachment') { db.productAttachment.push({ id: db.nextId++, ...v.object }); return json({ data: { [op]: { id: '1' } } }); }
    if (op === 'upsertOneFAQ') { db.faqs.push({ id: db.nextId++, updatedAt: 't0', ...v.object }); return json({ data: { [op]: { id: '1' } } }); }
    if (op === 'setFAQ') {
      const row = db.faqs.find(q => match(q, v.where));
      if (!row) return json({ data: { setFAQ: { affectedRows: 0 } } });
      Object.assign(row, v.set, { updatedAt: `t${db.nextId++}` });
      return json({ data: { setFAQ: { affectedRows: 1 } } });
    }
    if (op === 'upsertOnePost' || op === 'upsertOneProduct') {
      const kind = kindOf(op), rows = rowsOf(kind), o = v.object;
      if (o.id) { // nested SEO update (+ added tags)
        const row = rows.find(r => String(r.id) === o.id);
        row.meta = { ...row.meta, ...o.meta.sync, id: row.meta.id };
        if (o.tags) row.tagIds.push(...o.tags.add.map(t => Number(t.id)));
        row.updatedAt = `u${db.nextId++}`;
        return json({ data: { [op]: { id: row.id, metaId: row.meta.id } } });
      }
      const { tags: t, meta, faqs, ...rest } = o;
      const row = { ...rest, id: String(db.nextId++), updatedAt: 'u0', isDeleted: false,
        tagIds: (t?.add || []).map(x => Number(x.id)), meta: { id: String(db.nextId++), ...meta.sync } };
      if (corrupt) row.content += ' tampered';
      rows.push(row);
      for (const q of faqs?.add || []) db.faqs.push({ id: db.nextId++, updatedAt: 't0', productId: Number(row.id), ...q });
      return json({ data: { [op]: { id: row.id } } });
    }
    if (op === 'setPost' || op === 'setProduct') {
      const row = rowsOf(kindOf(op)).find(r => match(r, v.where));
      if (!row) return json({ data: { [op]: { affectedRows: 0 } } });
      Object.assign(row, v.set, { updatedAt: `u${db.nextId++}` });
      return json({ data: { [op]: { affectedRows: 1 } } });
    }
    return json({ errors: [{ message: `unhandled ${op}` }] });
  };
  return { fetcher, db };
}

function siteDir({ hook = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'rxcms-publish-'));
  writeFileSync(join(dir, '.env'), `﻿# test\r\nRXCMS_API_BASE=https://api.example.test\r\nRXCMS_SITE_KEY="${TOKEN}"\r\n${hook ? `DEPLOY_HOOK_URL=${HOOK}\r\n` : ''}`);
  mkdirSync(join(dir, 'content', 'images'), { recursive: true });
  writeFileSync(join(dir, 'content', 'images', 'cover.webp'), WEBP);
  writeFileSync(join(dir, 'content', 'images', 'inline.jpg'), JPEG);
  writeFileSync(join(dir, 'content', 'images', 'raw.png'), JPEG);
  writeFileSync(join(dir, 'content', 'images', 'fake.jpg'), WEBP); // wrong content for the extension
  writeFileSync(join(dir, 'content', 'datasheet.pdf'), PDFBYTES);
  return dir;
}
const post = (over = {}) => ({
  kind: 'post', locale: 'es', slug: 'how-to-pack', title: 'Cómo embalar', description: 'Resumen en español.',
  content: '## Paso 1\n\n![Caja abierta](./images/inline.jpg)\n\nTexto.\n\n## Paso 2\n\nMás texto.', cover: { src: './images/cover.webp' },
  tags: [{ base: 'Packaging & Labels', name: 'Envases y etiquetas' }], category: 'guides', authorId: 12,
  seo: { title: 'Cómo embalar | Example', description: 'Guía de embalaje.' }, ...over,
});
const product = (over = {}) => ({ kind: 'product', locale: 'en', slug: 'sample-pump', title: 'Sample pump', description: 'Short summary.',
  content: 'Body text.', category: 'pumps', images: [{ src: './images/cover.webp', alt: 'Pump front' }, { src: './images/inline.jpg', alt: 'Pump side' }],
  features: '- Quiet', faqs: [{ question: 'MOQ?', answer: '1 pallet.' }], attachments: [{ src: './datasheet.pdf', name: 'Datasheet (PDF)' }],
  seo: { title: 'Sample pump', description: 'Pump for testing.', robots: 'index,follow' }, schemaJson: { '@type': 'Product' }, ...over });
const write = (dir, name, item) => { const p = join(dir, 'content', name); writeFileSync(p, JSON.stringify(item)); return p; };

test('post: publish uploads images, creates once, reads back, checks the public API and triggers the deploy hook', async () => {
  const dir = siteDir({ hook: true }), { fetcher, db } = fakeRxcms();
  const file = write(dir, 'post.json', post({ cta: [{ after: 'Paso 1', label: 'Pedir presupuesto', text: '¿Necesita <muestras>?' }] }));
  const checked = await main(['check', '--site', dir, '--file', file], fetcher);
  assert.equal(checked.action, '新建');
  assert.deepEqual(checked.tags[0], { base: 'Packaging & Labels', name: 'Envases y etiquetas', baseId: 59, id: 61, action: '已有' });
  assert.equal(db.writes + db.uploads + db.deploys, 0, 'check never writes');

  const result = await main(['publish', '--site', dir, '--file', file], fetcher);
  assert.equal(result.ok, true, result.problems.join('; '));
  assert.equal(db.uploads, 2);
  const row = db.posts[0];
  assert.equal(row.langId, 2); assert.equal(row.categoryId, 6); assert.deepEqual(row.tagIds, [61]);
  assert.match(row.content, /!\[Caja abierta\]\(https:\/\/media\.test\/\d+\/inline-[0-9a-f]{10}\.jpg\)/);
  // The card closes the "Paso 1" section, before "Paso 2"; text is escaped.
  assert.match(row.content, /Texto\.\n\n<figure class="cta" data-cta="inquiry">\n<figcaption>¿Necesita &lt;muestras&gt;\?<\/figcaption>\n<a href="\/contact\/">Pedir presupuesto<\/a>\n<\/figure>\n\n## Paso 2/);
  assert.ok(result.checked.includes('公开标签名称与源标签'));
  assert.equal(db.deploys, 1); assert.match(result.deploy, /已触发/);
  assert.ok(!JSON.stringify(result).includes('secret-hook-id'));

  await assert.rejects(main(['publish', '--site', dir, '--file', file], fetcher), /已有 slug=how-to-pack.*--update/);
  const changed = write(dir, 'post2.json', post({ description: 'Nuevo resumen.', cta: [{ after: 'Paso 1', label: 'Pedir presupuesto', text: '¿Necesita <muestras>?' }] }));
  const updated = await main(['publish', '--site', dir, '--file', changed, '--update', '--no-deploy'], fetcher);
  assert.equal(updated.ok, true, updated.problems.join('; '));
  assert.equal(db.uploads, 2, 'identical images are reused, not re-uploaded');
  assert.equal(db.posts.length, 1); assert.equal(db.posts[0].description, 'Nuevo resumen.');
  assert.equal(db.deploys, 1); assert.match(updated.deploy, /--no-deploy/);
});

test('missing tags are created per language (base first) and read back; ambiguous names stop and ask', async () => {
  const dir = siteDir(), { fetcher, db } = fakeRxcms();
  const file = write(dir, 'new-tags.json', post({ tags: [{ base: 'Pumps', name: 'Bombas' }, { base: 'Packaging & Labels', name: 'Envases y etiquetas' }] }));
  const checked = await main(['check', '--site', dir, '--file', file], fetcher);
  assert.equal(checked.tags[0].action, '新建基准标签和本语言标签');
  const result = await main(['publish', '--site', dir, '--file', file, '--no-deploy'], fetcher);
  assert.equal(result.ok, true, result.problems.join('; '));
  const base = db.tags.find(t => t.data.name === 'Pumps'), local = db.tags.find(t => t.data.name === 'Bombas');
  assert.equal(base.locale, 'en'); assert.equal(local.locale, 'es'); assert.equal(local.data.sourceTagId, base.id);
  assert.deepEqual(db.posts[0].tagIds.sort(), [61, local.id].sort());

  const before = db.writes;
  for (const [tags, message] of [
    [[{ base: 'packaging & labels', name: 'Envases' }], /有歧义/],
    [[{ base: 'Packaging & Labels', name: 'Etiquetas' }], /请用户确认/],
    [[{ base: 'Packaging & Labels', name: 'Packaging & labels' }], /没有翻译/],
  ]) await assert.rejects(main(['publish', '--site', dir, '--file', write(dir, 'x.json', post({ slug: 'other', tags }))], fetcher), message);
  await assert.rejects(main(['publish', '--site', dir, '--file', write(dir, 'y.json', post({ slug: 'other', authorId: 99 }))], fetcher), /作者 99/);
  assert.equal(db.writes, before, 'stops happen before any write');
});

test('gates stop before any network request', async () => {
  const dir = siteDir(), { fetcher, db } = fakeRxcms();
  const bad = write(dir, 'bad.json', post({ description: ' ', tags: [], cover: undefined,
    content: 'Text ![](./images/raw.png) ![x](./images/fake.jpg) ![ref][a]\n\n<video src="./clip.mp4"></video>', cta: [{ label: 'x' }] }));
  await assert.rejects(main(['publish', '--site', dir, '--file', bad], fetcher), error => {
    assert.ok(error instanceof Stop);
    for (const s of ['description', 'tags 必填', 'PNG', '缺 alt', 'cover（文章封面） 缺 src', '文件内容不是 .jpg', '无法识别的图片写法', '已托管的 https', 'cta 填']) assert.ok(error.message.includes(s), s);
    return true;
  });
  const badProduct = write(dir, 'bad-product.json', product({ attachments: [{ src: './images/cover.webp', name: 'x' }], faqs: [{ question: 'Q' }], content2: '![a](b.jpg)' }));
  await assert.rejects(main(['publish', '--site', dir, '--file', badProduct], fetcher), error => {
    for (const s of ['格式不支持（只收 .pdf）', 'faqs 填', 'content2 里不要放图片']) assert.ok(error.message.includes(s), s);
    return true;
  });
  assert.equal(db.calls.length, 0);
});

test('CTA after an unknown heading stops; cards go at the end of the right section', () => {
  assert.throws(() => insertCtas('## A\n\ntext', [{ after: 'B', label: 'x' }]), /找不到/);
  assert.equal(insertCtas('## A\n\none\n### A.1\n\ntwo\n## B\n\nthree', [{ after: 'A', label: 'Go' }]),
    '## A\n\none\n### A.1\n\ntwo\n\n<figure class="cta" data-cta="inquiry">\n<a href="/contact/">Go</a>\n</figure>\n\n## B\n\nthree');
});

test('body video is passed through as hosted HTML and checked for reachability', async () => {
  const dir = siteDir(), { fetcher, db } = fakeRxcms();
  const video = '<figure><video src="https://stream.test/uid/manifest/video.m3u8" poster="https://stream.test/poster.jpg" controls></video></figure>';
  const result = await main(['publish', '--site', dir, '--file', write(dir, 'v.json', post({ content: `## Paso 1\n\n${video}\n\nTexto.` }))], fetcher);
  assert.equal(result.ok, true, result.problems.join('; '));
  assert.ok(db.posts[0].content.includes(video));
  assert.ok(result.checked.includes('已托管媒体 https://stream.test/uid/manifest/video.m3u8'));
});

test('product: gallery, FAQ and PDF attachment (direct upload) are written and read back', async () => {
  const dir = siteDir(), { fetcher, db } = fakeRxcms();
  const file = write(dir, 'product.json', product());
  const result = await main(['publish', '--site', dir, '--file', file], fetcher);
  assert.equal(result.ok, true, result.problems.join('; '));
  assert.equal(db.products[0].published, true);
  assert.deepEqual(db.productMedia.map(r => [r.seqValue, r.altText]), [[1, 'Pump front'], [2, 'Pump side']]);
  assert.deepEqual(db.productAttachment.map(r => [r.seqValue, r.altText]), [[1, 'Datasheet (PDF)']]);
  assert.deepEqual(db.faqs.map(q => [q.question, q.seqValue]), [['MOQ?', 1]]);
  assert.ok(result.checked.includes('附件 ./datasheet.pdf'));
  assert.ok(!JSON.stringify(result).includes('X-Amz-Signature'), 'signed upload URLs are never printed');
  assert.match(result.deploy, /没有配置 DEPLOY_HOOK_URL/);

  // Update: FAQ changes in place, new one added; nothing re-uploaded.
  const uploads = db.uploads;
  const updated = await main(['publish', '--site', dir, '--file', write(dir, 'p2.json', product({ faqs: [{ question: 'MOQ?', answer: '2 pallets.' }, { question: 'Lead time?', answer: '30 days.' }] })), '--update'], fetcher);
  assert.equal(updated.ok, true, updated.problems.join('; '));
  assert.equal(db.uploads, uploads);
  assert.deepEqual(db.faqs.map(q => [q.question, q.answer]), [['MOQ?', '2 pallets.'], ['Lead time?', '30 days.']]);

  // A gallery that differs (alt text) stops before any object write.
  const writes = db.writes;
  await assert.rejects(main(['publish', '--site', dir, '--file', write(dir, 'p3.json', product({ faqs: db.faqs.map(q => ({ question: q.question, answer: q.answer })), images: [{ src: './images/cover.webp', alt: 'Other alt' }, { src: './images/inline.jpg', alt: 'Pump side' }] })), '--update'], fetcher), /后台没有任何改动/);
  assert.equal(db.writes, writes);
  await assert.rejects(main(['publish', '--site', dir, '--file', write(dir, 'p4.json', product({ faqs: [] })), '--update'], fetcher), /FAQ，比输入多/);
});

test('a failing follow-up write still ends in a readback that reports what is missing', async () => {
  const dir = siteDir(), { fetcher } = fakeRxcms({ failGallery: true });
  const result = await main(['publish', '--site', dir, '--file', write(dir, 'p.json', product({ attachments: [] }))], fetcher);
  assert.equal(result.ok, false);
  assert.match(result.problems[0], /后续写入中断/);
  assert.ok(result.problems.includes('图库 不一致'));
  assert.match(result.deploy, /没有触发部署/);
});

test('readback catches a server-side mismatch and media bytes that differ', async () => {
  const dir = siteDir(), { fetcher } = fakeRxcms({ corrupt: true });
  const result = await main(['publish', '--site', dir, '--file', write(dir, 'p.json', post({ locale: 'en', tags: [{ base: 'Packaging & Labels', name: 'Packaging & Labels' }] }))], fetcher);
  assert.equal(result.ok, false);
  assert.ok(result.problems.includes('正文 不一致'));
  assert.ok(result.problems.some(p => p.includes('字节与本地文件不符')));
});

test('update refuses without conditionalSet; drafts skip the public check and the deploy', async () => {
  const dir = siteDir({ hook: true }), { fetcher, db } = fakeRxcms({ conditionalSet: false });
  const file = write(dir, 'p.json', post());
  const draft = await main(['publish', '--site', dir, '--file', file, '--draft'], fetcher);
  assert.equal(draft.ok, true, draft.problems.join('; '));
  assert.equal(db.posts[0].status, 'draft');
  assert.ok(!draft.checked.includes('公开接口'));
  assert.equal(db.deploys, 0);
  await assert.rejects(main(['publish', '--site', dir, '--file', file, '--update'], fetcher), /conditionalSet/);
  assert.match((await main(['deploy', '--site', dir], fetcher)).deploy, /已触发/);
});

test('the site key and deploy hook never appear in errors', async () => {
  const dir = siteDir({ hook: true });
  const fetcher = async () => new Response(`invalid key ${TOKEN} ${HOOK}`, { status: 401 });
  await assert.rejects(main(['check', '--site', dir, '--file', write(dir, 'p.json', post())], fetcher), error => {
    assert.ok(!error.message.includes(TOKEN) && !error.message.includes('secret-hook-id'));
    assert.match(error.message, /HTTP 401.*\[REDACTED\]/);
    return true;
  });
});

test('round-2 gates: CTA anchors, image syntax, duplicate tags, gallery change and signed PDF URLs', async () => {
  const dir = siteDir(), { fetcher, db } = fakeRxcms();
  // A heading inside a code fence is not a section; the anchor is checked before anything is written.
  const fenced = post({ content: '## Paso 1\n\nTexto.\n\n```md\n## Falso\n```', cta: [{ after: 'Falso', label: 'x' }] });
  await assert.rejects(main(['check', '--site', dir, '--file', write(dir, 'f.json', fenced)], fetcher), /找不到/);
  for (const content of ["![a](./images/inline.jpg 'title') ![b](./photo(1).webp)", '![a](<./images/inline.jpg> "t") ![b](./my photo.jpg)']) {
    await assert.rejects(main(['check', '--site', dir, '--file', write(dir, 'i.json', post({ content }))], fetcher), /无法识别的图片写法/);
  }
  await assert.rejects(main(['check', '--site', dir, '--file', write(dir, 't.json', post({ tags: [{ base: 'A', name: 'Uno' }, { base: 'B', name: 'uno' }] }))], fetcher), /重复的 name/);
  assert.equal(db.writes + db.uploads, 0);

  // Changing an image of an existing product stops before the new file is uploaded.
  await main(['publish', '--site', dir, '--file', write(dir, 'p.json', product())], fetcher);
  const uploads = db.uploads, writes = db.writes;
  writeFileSync(join(dir, 'content', 'images', 'other.webp'), Buffer.from('RIFF0000WEBPVP8 another'));
  await assert.rejects(main(['publish', '--site', dir, '--update', '--file', write(dir, 'p2.json', product({ images: [{ src: './images/other.webp', alt: 'Pump front' }] }))], fetcher), /后台没有任何改动/);
  assert.equal(db.uploads, uploads); assert.equal(db.writes, writes);
});

test('a PDF only delivered through an expiring signed URL fails readback and skips the deploy', async () => {
  const dir = siteDir({ hook: true }), { fetcher, db } = fakeRxcms({ signedPublic: true });
  const result = await main(['publish', '--site', dir, '--file', write(dir, 'p.json', product())], fetcher);
  assert.equal(result.ok, false);
  assert.ok(result.problems.some(p => p.includes('签名地址')));
  assert.equal(db.deploys, 0);
});
