import test from 'node:test';
import assert from 'node:assert/strict';
import { Parser } from 'htmlparser2';
import { resolveI18n } from '../src/i18n/config.mjs';
import { localePath, languageLinks } from '../src/i18n/urls.mjs';
import { dictionaries, validateDictionaries } from '../src/i18n/ui.mjs';
import { hreflangLinks, sitemapXml } from '../src/lib/seo.mjs';
import { consentOptions, consentTranslation, bannerConfig } from '../src/lib/consent.mjs';

const site = 'https://www.example.com';
const settings = { output: 'static', content: { source: 'local' }, i18n: { defaultLocale: 'en', locales: [
  { code: 'en', htmlLang: 'en-US', name: 'English' },
  { code: 'de', htmlLang: 'de-DE', name: 'Deutsch', dir: 'ltr' },
] } };
const config = resolveI18n(settings, {});
const pages = [
  { key: 'product:pump', locale: 'en', path: '/products/pump/' },
  { key: 'product:pump', locale: 'de', path: '/de/products/pumpe/' },
  { key: 'product:valve', locale: 'en', path: '/products/valve/' },
  { key: 'articles', locale: 'en', path: '/articles/', noindex: true },
  { key: 'articles', locale: 'de', path: '/de/articles/', noindex: true },
];

test('language compatibility, explicit locale metadata and default URL prefixes', () => {
  const legacy = resolveI18n({ language: 'en-GB' }, {});
  assert.equal(legacy.defaultLocale, 'en'); assert.equal(legacy.locales[0].htmlLang, 'en-GB');
  assert.equal(localePath('/products/', 'en', config), '/products/');
  assert.equal(localePath('/products/', 'de', config), '/de/products/');
  const germanDefault = { ...config, defaultLocale: 'de' };
  assert.equal(localePath('/', 'de', germanDefault), '/');
  assert.equal(localePath('/', 'en', germanDefault), '/en/');
  assert.throws(() => localePath('/', 'fr', config), /Unknown locale/);
  const rtl = resolveI18n({ i18n: { defaultLocale: 'ar', locales: [{ code: 'ar', htmlLang: 'ar', name: 'العربية', dir: 'rtl' }] } }, {});
  assert.equal(rtl.locales[0].dir, 'rtl');
});

test('multiple languages reject unsupported CMS/server modes and invalid metadata', () => {
  for (const source of ['rxcms', 'wordpress']) assert.throws(() => resolveI18n({ ...settings, content: { source } }, {}), /separate integration/);
  assert.throws(() => resolveI18n(settings, { SITE_OUTPUT: 'server' }), /require static/);
  assert.throws(() => resolveI18n({ ...settings, i18n: { ...settings.i18n, defaultLocale: 'fr' } }, {}), /defaultLocale/);
  assert.throws(() => resolveI18n({ ...settings, i18n: { defaultLocale: 'en', locales: [settings.i18n.locales[0], settings.i18n.locales[0]] } }, {}), /Duplicate/);
  assert.throws(() => resolveI18n({ i18n: { defaultLocale: '../de', locales: [{ code: '../de', htmlLang: 'de', name: 'Deutsch' }] } }, {}), /Invalid/);
  // A single CMS language remains supported, including server output.
  assert.equal(resolveI18n({ ...settings, output: 'server', content: { source: 'rxcms' }, i18n: { defaultLocale: 'en', locales: [settings.i18n.locales[0]] } }, {}).locales.length, 1);
});

test('missing UI strings report every missing key, including form and consent text', () => {
  validateDictionaries(config.locales);
  const partial = structuredClone(dictionaries);
  delete partial.de.inquiry.unknown; partial.de.cookie.title = ''; delete partial.de.nav.contact;
  assert.throws(() => validateDictionaries(config.locales, partial), error => {
    for (const key of ['de.inquiry.unknown', 'de.cookie.title', 'de.nav.contact']) assert.ok(error.message.includes(key));
    return true;
  });
  assert.throws(() => validateDictionaries([{ code: 'fr' }]), /fr.nav.home/);
  const englishContact = dictionaries.en.nav.contact;
  try {
    delete dictionaries.en.nav.contact;
    assert.throws(() => validateDictionaries([{ code: 'en' }]), /en.nav.contact/);
  } finally { dictionaries.en.nav.contact = englishContact; }
});

test('hreflang uses real translation identity, reciprocal URLs, htmlLang and x-default', () => {
  const expected = [
    { hreflang: 'en-US', href: `${site}/products/pump/` },
    { hreflang: 'de-DE', href: `${site}/de/products/pumpe/` },
    { hreflang: 'x-default', href: `${site}/products/pump/` },
  ];
  assert.deepEqual(hreflangLinks(pages[0], pages, config, site), expected);
  assert.deepEqual(hreflangLinks(pages[1], pages, config, site), expected);
  assert.deepEqual(hreflangLinks(pages[2], pages, config, site), [
    { hreflang: 'en-US', href: `${site}/products/valve/` }, { hreflang: 'x-default', href: `${site}/products/valve/` },
  ]);
  assert.deepEqual(hreflangLinks(pages[3], pages, config, site), []);
  assert.deepEqual(hreflangLinks(undefined, pages, config, site), []);
  assert.deepEqual(hreflangLinks(pages[0], pages, resolveI18n({ language: 'en' }, {}), site), []);
  const onlyGerman = pages.filter(page => page.locale === 'de');
  assert.equal(hreflangLinks(onlyGerman[0], onlyGerman, config, site).at(-1).href, `${site}/`);
});

test('language switch links use translated slugs or the target homepage', () => {
  assert.deepEqual(languageLinks(pages[1], pages, config).map(link => link.href), ['/products/pump/', '/de/products/pumpe/']);
  assert.deepEqual(languageLinks(pages[2], pages, config).map(link => link.href), ['/products/valve/', '/de/']);
  assert.deepEqual(languageLinks(undefined, pages, config).map(link => link.href), ['/', '/de/']);
  assert.deepEqual(languageLinks(pages[0], pages, resolveI18n({ language: 'en' }, {})), []);
});

function sitemapLocations(xml) {
  const urls = []; let inLoc = false;
  new Parser({ onopentag(name) { inLoc = name === 'loc'; }, ontext(text) { if (inLoc) urls.push(text); }, onclosetag() { inLoc = false; } }, { xmlMode: true }).end(xml);
  return urls;
}
test('sitemap lists both real language paths once, and indexable=false lists none', () => {
  const paths = pages.filter(page => !page.noindex).map(page => page.path);
  assert.deepEqual(sitemapLocations(sitemapXml([...paths, paths[0]], site, true)), paths.map(path => `${site}${path}`));
  assert.deepEqual(sitemapLocations(sitemapXml(paths, site, false)), []);
  assert.equal(sitemapXml(['/products/a&b/'], site, true).includes('a&amp;b'), true);
  assert.equal(sitemapXml(paths, site, true).includes('/de/products/valve/'), false);
});

test('consent uses page language and one root-path cookie across languages', () => {
  const options = consentOptions({ google: { analyticsId: 'G-TEST123', adsId: 'AW-12345' } });
  const translations = Object.fromEntries(config.locales.map(locale => [locale.code, consentTranslation(options, dictionaries[locale.code], localePath('/privacy-policy/', locale.code, config))]));
  const english = bannerConfig({ ...options, language: { default: 'en', translations } }, () => {});
  const german = bannerConfig({ ...options, language: { default: 'de', translations } }, () => {});
  assert.deepEqual(english.cookie, german.cookie); assert.equal(german.cookie.path, '/');
  assert.equal(german.language.default, 'de'); assert.equal(german.language.autoDetect, undefined);
  assert.equal(german.language.translations.de.consentModal.title, 'Ihre Datenschutzauswahl');
  assert.ok(german.language.translations.de.consentModal.footer.includes('/de/privacy-policy/'));
  assert.deepEqual(german.language.translations.de.preferencesModal.sections.map(section => section.title), ['Notwendige Speicherung', 'Analyse', 'Werbung']);
});
