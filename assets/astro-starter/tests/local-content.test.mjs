import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'astro/zod';
import { localSchema, articleSchema, validateLocalEntries } from '../src/lib/content/local.mjs';

const product = { key: 'component', slug: 'muster-für-pumpen', title: 'Sample', description: 'Example only.', specifications: [] };
// Real image file resolution/optimization is exercised in build-fixtures, not mocked here.
const image = () => z.string().min(1);

test('local schema requires content fields and image alt, and accepts Unicode slugs', () => {
  const schema = localSchema(image);
  assert.equal(schema.parse(product).slug, 'muster-für-pumpen');
  for (const field of ['key', 'slug', 'title', 'description', 'specifications']) {
    const missing = { ...product }; delete missing[field];
    assert.ok(!schema.safeParse(missing).success, field);
  }
  for (const alt of [undefined, '', '  ']) assert.ok(!schema.safeParse({ ...product, images: [{ src: 'sample.png', alt }] }).success);
  for (const slug of ['..', 'a/b', 'a\\b', 'a#b', 'a?b', 'a%2Fb']) assert.ok(!schema.safeParse({ ...product, slug }).success);
  // Migrated local products keep their downloads and related-product links instead of losing them silently.
  const kept = schema.parse({ ...product, attachments: [{ url: '/files/datasheet.pdf', name: 'Datasheet' }], relatedSlugs: ['other-part'] });
  assert.deepEqual(kept.attachments, [{ url: '/files/datasheet.pdf', name: 'Datasheet' }]);
  assert.deepEqual(kept.relatedSlugs, ['other-part']);
  assert.ok(!schema.safeParse({ ...product, relatedSlugs: ['a/b'] }).success);
});

test('article dates are optional, normalized when real, and invalid values are rejected', () => {
  const schema = articleSchema(image);
  const article = { key: 'news', slug: 'news', title: 'News', description: 'An update.' };
  assert.equal(schema.parse(article).publishedAt, undefined);
  assert.equal(schema.parse({ ...article, publishedAt: '2026-01-02' }).publishedAt, '2026-01-02T00:00:00.000Z');
  for (const publishedAt of ['', null, 'not-a-date', '2026-02-30']) assert.ok(!schema.safeParse({ ...article, publishedAt }).success);
});

test('local identity allows translations, rejects duplicate per-language slugs/keys with filenames', () => {
  const entry = (id, data = product) => ({ id, filePath: `src/content/products/${id}`, data });
  assert.doesNotThrow(() => validateLocalEntries([entry('en/one.md'), entry('de/zwei.md')]));
  assert.throws(() => validateLocalEntries([entry('en/one.md'), entry('en/two.md', { ...product, slug: 'other' })]), /two.md: duplicate translation key/);
  assert.throws(() => validateLocalEntries([entry('en/one.md'), entry('en/two.md', { ...product, key: 'other' })]), /two.md: duplicate slug/);
  assert.throws(() => validateLocalEntries([entry('one.md')]), /expected <language>/);
});
