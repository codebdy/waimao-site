import { i18n } from './config.mjs';

export function localePath(path, locale = i18n.defaultLocale, config = i18n) {
  if (!config.locales.some(item => item.code === locale)) throw new Error(`Unknown locale: ${locale}`);
  if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Locale paths must be same-site absolute paths.');
  return `${locale === config.defaultLocale ? '' : `/${locale}`}${path}`;
}

// Translation identity comes from the catalog key, never from matching translated slugs.
export function languageLinks(page, pages, config = i18n) {
  if (config.locales.length < 2) return [];
  return config.locales.map(locale => ({
    ...locale,
    href: pages.find(candidate => candidate.key === page?.key && candidate.locale === locale.code)?.path
      ?? localePath('/', locale.code, config),
  }));
}
