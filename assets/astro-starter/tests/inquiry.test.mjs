import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { handleInquiry, inquiryResult } from '../src/lib/inquiry.mjs';
import { configureInquiry, inquiryFiles } from '../scripts/configure-inquiry.mjs';
import { deploymentConfig } from '../config/deployment.mjs';

const env = { RXCMS_API_BASE: 'https://api.example.com', RXCMS_FORM_KEY: 'test-form-key', TURNSTILE_SECRET_KEY: 'test-secret', INQUIRY_ALLOWED_ORIGINS: 'https://www.example.com', RXCMS_FORM_NAME: 'contact' };
const body = { name: 'Example buyer', email: 'buyer@example.com', message: 'Synthetic inquiry', turnstileToken: 'test-token', fromUrl: 'https://www.example.com/contact/' };
const request = (data = body, origin = 'https://www.example.com') => new Request('https://www.example.com/api/inquiry', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, 'X-Forwarded-For': 'spoofed' }, body: JSON.stringify(data) });
const verified = () => Response.json({ success: true, hostname: 'www.example.com', action: 'inquiry' });

test('inquiry preserves saved/spam outcomes and never infers an email-send success', async () => {
  for (const spam of [true, false]) {
    let calls = 0;
    const response = await handleInquiry(request(), env, async (url, options) => {
      calls++;
      if (String(url).includes('siteverify')) return verified();
      assert.equal(options.headers.Authorization, 'Bearer test-form-key');
      assert.equal(options.headers['X-Forwarded-For'], undefined);
      const sent = JSON.parse(options.body);
      assert.equal(sent.turnstileToken, undefined);
      assert.deepEqual(sent.attachmentIds, []);
      return Response.json({ id: 301, ok: true, spam }, { status: 201 });
    });
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { saved: true, id: 301, spam, notification: { status: spam ? 'skipped_spam' : 'not_reported' } });
    assert.equal(calls, 2);
  }
  assert.throws(() => inquiryResult({ ok: true, spam: false }));
});

test('inquiry rejects untrusted origins, malformed input, honeypots, oversize and absent config before upstream calls', async () => {
  const unexpected = () => { throw new Error('must not fetch'); };
  assert.equal((await handleInquiry(request(body, 'https://evil.example'), env, unexpected)).status, 403);
  assert.equal((await handleInquiry(request({ ...body, email: 'bad' }), env, unexpected)).status, 400);
  assert.equal((await handleInquiry(request({ ...body, website: 'bot' }), env, unexpected)).status, 400);
  assert.equal((await handleInquiry(request({ ...body, message: 'x'.repeat(17000) }), env, unexpected)).status, 413);
  assert.equal((await handleInquiry(request(), { ...env, RXCMS_FORM_KEY: '' }, unexpected)).status, 503);
});

test('inquiry verifies Turnstile hostname/action and does not submit on invalid or unavailable verification', async () => {
  for (const result of [{ success: false }, { success: true, hostname: 'evil.example', action: 'inquiry' }, { success: true, hostname: 'www.example.com', action: 'login' }]) {
    let calls = 0;
    const response = await handleInquiry(request(), env, async () => { calls++; return Response.json(result); });
    assert.equal(response.status, 403); assert.equal(calls, 1);
  }
  assert.equal((await handleInquiry(request(), env, async () => { throw new Error('network'); })).status, 503);
});

test('inquiry reports unknown receipt after timeout, no retry, and sanitizes backend failures', async () => {
  for (const status of [401, 402, 403, 500, 'timeout']) {
    let calls = 0;
    const response = await handleInquiry(request(), env, async url => {
      calls++;
      if (String(url).includes('siteverify')) return verified();
      if (status === 'timeout') throw new Error('private key in error');
      return Response.json({ error: 'private backend detail' }, { status });
    });
    const receipt = await response.json();
    assert.equal(receipt.saved, status === 500 || status === 'timeout' ? null : false);
    assert.ok(!JSON.stringify(receipt).includes('private')); assert.equal(calls, 2);
  }
});

test('static inquiry functions select only one platform and never load an SSR adapter', async () => {
  for (const target of ['vercel', 'cloudflare']) {
    const settings = { output: 'static', deployTarget: target, inquiry: { provider: 'rxcms', turnstileSiteKey: 'public-test-key' } };
    assert.deepEqual(await deploymentConfig(settings, {}, { vercel: () => { throw new Error('SSR'); }, cloudflare: () => { throw new Error('SSR'); } }), { output: 'static' });
    const files = inquiryFiles(settings);
    assert.equal(Boolean(files['api/inquiry.js']), target === 'vercel');
    assert.equal(Boolean(files['functions/api/inquiry.js']), target === 'cloudflare');
  }
});

test('configuration switch cleans only generated endpoints and fails builds on stale files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'export-site-inquiry-'));
  const settings = { output: 'static', deployTarget: 'vercel', inquiry: { provider: 'rxcms', turnstileSiteKey: 'public-test-key' } };
  await assert.rejects(configureInquiry(root, settings, {}, true));
  await configureInquiry(root, settings);
  await configureInquiry(root, settings, {}, true);
  settings.deployTarget = 'cloudflare';
  await configureInquiry(root, settings);
  await assert.rejects(readFile(join(root, 'api/inquiry.js')), { code: 'ENOENT' });
  assert.ok((await readFile(join(root, 'functions/api/inquiry.js'), 'utf8')).includes('context.env'));
  await mkdir(join(root, 'api'), { recursive: true });
  await writeFile(join(root, 'api/inquiry.js'), '// user custom endpoint');
  await configureInquiry(root, settings); // Cloudflare does not need api/; the user's file is left untouched.
  assert.equal(await readFile(join(root, 'api/inquiry.js'), 'utf8'), '// user custom endpoint');
  settings.deployTarget = 'vercel';
  await assert.rejects(configureInquiry(root, settings), /user-owned/);
  assert.equal(await readFile(join(root, 'api/inquiry.js'), 'utf8'), '// user custom endpoint');
});

test('disabled inquiry leaves user-owned routing/endpoint files alone instead of failing the build', async () => {
  const root = await mkdtemp(join(tmpdir(), 'export-site-inquiry-'));
  await mkdir(join(root, 'public'), { recursive: true });
  const own = JSON.stringify({ version: 1, include: ['/api/other'], exclude: [] });
  await writeFile(join(root, 'public/_routes.json'), own);
  const settings = { output: 'static', deployTarget: 'cloudflare', inquiry: { provider: 'none' } };
  await configureInquiry(root, settings, {}, true);
  await configureInquiry(root, settings);
  assert.equal(await readFile(join(root, 'public/_routes.json'), 'utf8'), own);
});
