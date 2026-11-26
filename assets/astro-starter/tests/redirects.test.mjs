import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { configureRedirects, redirectFiles, validateRedirects } from '../scripts/configure-redirects.mjs';
import committed from '../config/redirects.mjs';

test('redirect map rejects chains, loops, queries and non-final targets', () => {
  assert.throws(() => validateRedirects({ '/a': '/b/', '/b': '/c/' }), /chains/);
  assert.throws(() => validateRedirects({ '/a': '/a/' }), /itself/);
  assert.throws(() => validateRedirects({ '/a?x=1': '/b/' }), /source/);
  assert.throws(() => validateRedirects({ '/A': '/b/' }), /lowercase/);
  assert.throws(() => validateRedirects({ '/a': 'https://other.example/' }), /target/);
  assert.throws(() => validateRedirects({ '/a': '/b' }), /target/);
  assert.throws(() => validateRedirects({ '/a': '/missing.pdf' }), /page path/);
  assert.deepEqual(validateRedirects(committed), [], 'the template ships without rules');
});

test('both platforms get the same one-hop 301 rules and user vercel.json keys survive', async () => {
  const files = redirectFiles({ '/old.html': '/products/new/' }, { cleanUrls: false });
  const lines = files['public/_redirects'].split('\n');
  assert.ok(lines.includes('/old.html /products/new/ 301'));
  assert.ok(lines.includes('/old.html/ /products/new/ 301'));
  const vercel = JSON.parse(files['vercel.json']);
  assert.equal(vercel.cleanUrls, false);
  assert.deepEqual(vercel.redirects[0], { source: '/old.html', destination: '/products/new/', statusCode: 301 });

  const root = await mkdtemp(join(tmpdir(), 'redirects-'));
  await mkdir(join(root, 'public'));
  await writeFile(join(root, 'vercel.json'), '{"cleanUrls":false}');
  await configureRedirects(root, {}, true); // no rules: a hand-written vercel.json is left alone
  await assert.rejects(configureRedirects(root, { '/old.html': '/products/new/' }, true), /configure:redirects/);
  await configureRedirects(root, { '/old.html': '/products/new/' });
  await configureRedirects(root, { '/old.html': '/products/new/' }, true);
  await configureRedirects(root, {});
  assert.deepEqual(JSON.parse(await readFile(join(root, 'vercel.json'), 'utf8')), { cleanUrls: false });
  await writeFile(join(root, 'public/_redirects'), '/x /y 301\n');
  await assert.rejects(configureRedirects(root, {}), /not generated/);
});
