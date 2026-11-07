import test from 'node:test';
import assert from 'node:assert/strict';
import { consentOptions, bannerConfig, createGoogleConsentController, analyticsCookiePattern, adsCookiePattern } from '../src/lib/consent.mjs';

function fixture(settings = {}) {
  const options = consentOptions(settings);
  const commands = [], scripts = [], disabled = [], reloads = [];
  const controller = createGoogleConsentController(options, {
    gtag: (...args) => commands.push(args), loadScript: url => scripts.push(url),
    setAnalyticsDisabled: value => disabled.push(value), reload: () => reloads.push(true),
  });
  return { options, commands, scripts, disabled, reloads, update: controller.update };
}
const both = { google: { analyticsId: 'G-TEST123', adsId: 'AW-12345' } };
test('default dialog has only necessary storage and no Google requests', () => {
  const f = fixture(); f.update({ analytics: true, advertisement: true });
  assert.equal(f.options.cookieName, 'cc_waimao_site');
  assert.deepEqual(Object.keys(bannerConfig(f.options, () => {}).categories), ['necessary']);
  assert.deepEqual(f.scripts, []);
  assert.equal(f.commands[0][0], 'consent'); assert.equal(f.commands[0][1], 'default');
  assert.ok(Object.values(f.commands[0][2]).every(value => value === 'denied'));
});
test('disabled dialog also disables tag commands even with valid IDs and prior acceptance', () => {
  const f = fixture({ ...both, cookieConsent: { enabled: false } });
  f.update({ analytics: true, advertisement: true });
  assert.deepEqual(f.commands, []); assert.deepEqual(f.scripts, []);
});
test('refusing optional categories never loads a Google script', () => {
  const f = fixture(both); f.update({ analytics: false, advertisement: false });
  assert.deepEqual(f.scripts, []);
});
test('analytics consent alone does not grant advertising or configure Ads', () => {
  const f = fixture(both); f.update({ analytics: true, advertisement: false });
  assert.deepEqual(f.commands[1], ['consent', 'update', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }]);
  assert.deepEqual(f.commands.filter(c => c[0] === 'config').map(c => c[1]), ['G-TEST123']);
  assert.equal(f.scripts.length, 1);
});
test('ads consent alone leaves analytics denied; later acceptance configures GA once', () => {
  const f = fixture(both); f.update({ analytics: false, advertisement: true });
  assert.equal(f.commands[1][2].analytics_storage, 'denied');
  assert.deepEqual(f.commands.filter(c => c[0] === 'config').map(c => c[1]), ['AW-12345']);
  f.update({ analytics: true, advertisement: true }); f.update({ analytics: true, advertisement: true });
  assert.equal(f.scripts.length, 1);
  assert.deepEqual(f.commands.filter(c => c[0] === 'config').map(c => c[1]), ['AW-12345', 'G-TEST123']);
});
test('withdrawal updates denial, disables analytics and reloads for persisted choice', () => {
  const f = fixture(both); f.update({ analytics: true, advertisement: true });
  f.update({ analytics: false, advertisement: false });
  assert.ok(Object.values(f.commands.at(-1)[2]).every(v => v === 'denied'));
  assert.equal(f.disabled.at(-1), true); assert.equal(f.reloads.length, 1);
  const next = fixture(both); next.update({ analytics: false, advertisement: false });
  assert.equal(next.scripts.length, 0);
});
test('stored consent and later changes use the same synchronization callback', () => {
  const callback = () => {}; const options = consentOptions(both);
  const config = bannerConfig(options, callback);
  assert.equal(config.onConsent, callback); assert.equal(config.onChange, callback);
  assert.equal(config.mode, 'opt-in'); assert.equal(config.categories.necessary.readOnly, true);
  assert.equal(config.guiOptions.consentModal.equalWeightButtons, true);
});
test('only explicit public options are exposed and invalid config fails', () => {
  const options = consentOptions({ ...both, secret: 'do-not-expose' });
  assert.equal(JSON.stringify(options).includes('do-not-expose'), false);
  assert.throws(() => consentOptions({ google: { analyticsId: 'G-x<script>' } }));
  assert.throws(() => consentOptions({ cookieConsent: { enabled: 'false' } }));
  assert.throws(() => consentOptions({ cookieConsent: { revision: 0 } }));
});
test('cookie cleanup patterns match only the intended prefixes', () => {
  assert.equal(analyticsCookiePattern.test('_ga'), true); assert.equal(analyticsCookiePattern.test('_ga_ABC'), true);
  assert.equal(analyticsCookiePattern.test('_gallery'), false);
  assert.equal(adsCookiePattern.test('_gcl_au'), true); assert.equal(adsCookiePattern.test('session'), false);
});
