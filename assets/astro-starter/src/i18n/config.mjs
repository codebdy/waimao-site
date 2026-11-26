import settings from '../../site.config.mjs';

/** @typedef {{ code: string, htmlLang: string, name: string, dir: 'ltr' | 'rtl' }} Locale */
/** @returns {{ defaultLocale: string, locales: Locale[] }} */
export function resolveI18n(settings, env = process.env) {
  const legacy = settings.language || 'en';
  const config = settings.i18n ?? {
    defaultLocale: legacy.split('-')[0].toLowerCase(),
    locales: [{ code: legacy.split('-')[0].toLowerCase(), htmlLang: legacy, name: legacy }],
  };
  if (!Array.isArray(config.locales) || !config.locales.length) throw new Error('i18n.locales must contain at least one language.');
  const codes = new Set(), tags = new Set();
  const reserved = ['products', 'articles', 'authors', 'contact', 'privacy-policy', 'api'];
  const locales = config.locales.map(locale => {
    const { code, htmlLang, name, dir = 'ltr' } = locale;
    if (typeof code !== 'string' || !code || code.startsWith('-') || code.endsWith('-') || code.includes('--') ||
        ![...code].every(c => 'abcdefghijklmnopqrstuvwxyz0123456789-'.includes(c)) || reserved.includes(code)) {
      throw new Error(`Invalid i18n URL code: ${code}. Use a lowercase language code, not a page name.`);
    }
    if (typeof htmlLang !== 'string' || !htmlLang || !Intl.getCanonicalLocales(htmlLang).length) throw new Error(`Invalid htmlLang for ${code}.`);
    if (typeof name !== 'string' || !name.trim() || !['ltr', 'rtl'].includes(dir)) throw new Error(`i18n ${code} needs a name and dir ltr/rtl.`);
    if (codes.has(code) || tags.has(htmlLang.toLowerCase())) throw new Error(`Duplicate i18n code or htmlLang: ${code}.`);
    codes.add(code); tags.add(htmlLang.toLowerCase());
    return { code, htmlLang, name, dir };
  });
  if (!codes.has(config.defaultLocale)) throw new Error('i18n.defaultLocale must be in i18n.locales.');
  if (locales.length > 1) {
    if (!['local', 'rxcms'].includes(settings.content?.source)) throw new Error('Multilingual WordPress content needs a separate integration. Use one language, content.source="local" or "rxcms".');
    if ((env.SITE_OUTPUT ?? settings.output ?? 'static') !== 'static') throw new Error('Multilingual pages require static output; server multilingual routing needs a separate integration.');
  }
  return { defaultLocale: config.defaultLocale, locales };
}

export const i18n = resolveI18n(settings);
