import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveDeployment, deploymentConfig } from '../config/deployment.mjs';

test('new projects default to static without a chosen platform', () => {
  assert.deepEqual(resolveDeployment({}, {}), { output: 'static', target: null });
});
test('static never loads an adapter on either platform', async () => {
  const fail = () => { throw new Error('An adapter was loaded for static output'); };
  for (const deployTarget of [null, 'vercel', 'cloudflare']) {
    assert.deepEqual(await deploymentConfig({ deployTarget }, {}, { vercel: fail, cloudflare: fail }), { output: 'static' });
  }
});
test('server selection loads only the chosen adapter and preserves the output mode', async () => {
  for (const target of ['vercel', 'cloudflare']) {
    const loaded = [];
    const loaders = Object.fromEntries(['vercel', 'cloudflare'].map(name => [name, async () => {
      loaded.push(name); return { default: () => ({ name }) };
    }]));
    const result = await deploymentConfig({ output: 'server', deployTarget: 'vercel' }, { DEPLOY_TARGET: target }, loaders);
    assert.deepEqual(result, { output: 'server', adapter: { name: target } });
    assert.deepEqual(loaded, [target]);
  }
});
test('invalid or incomplete choices fail instead of silently changing modes', () => {
  for (const input of [{ output: 'hybrid' }, { deployTarget: 'other' }, { output: 'server' }]) {
    assert.throws(() => resolveDeployment(input, {}));
  }
  assert.throws(() => resolveDeployment({}, { SITE_OUTPUT: '' }));
});
test('missing server dependency has an actionable error with its cause', async () => {
  await assert.rejects(deploymentConfig({ output: 'server', deployTarget: 'vercel' }, {}, { vercel: async () => { throw new Error('missing'); } }), { message: 'Cannot load @astrojs/vercel. Install an Astro-compatible version before a server build.' });
});
