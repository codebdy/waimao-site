export function canonicalUrl(path, site) {
  const origin = new URL(site);
  if (!['https:', 'http:'].includes(origin.protocol)) throw new Error('Site URL must use http(s).');
  if (origin.pathname !== '/' || origin.search || origin.hash) throw new Error('Starter expects a root-domain site URL.');
  if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Expected a same-site absolute path.');
  const url = new URL(path, origin);
  if (url.origin !== origin.origin) throw new Error('Canonical must remain on the configured site.');
  url.search = '';
  url.hash = '';
  return url.href;
}

export function serializeJsonLd(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c');
}

export function escapeXml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

export function hreflangLinks(page, pages, config, site) {
  if (!page || page.noindex || config.locales.length < 2) return [];
  const translations = pages.filter(candidate => candidate.key === page.key && !candidate.noindex);
  const links = translations.map(candidate => ({
    hreflang: config.locales.find(locale => locale.code === candidate.locale).htmlLang,
    href: canonicalUrl(candidate.path, site),
  }));
  const defaultPage = translations.find(candidate => candidate.locale === config.defaultLocale);
  // If there is no default-language version, the default homepage is a real entry point.
  return [...links, { hreflang: 'x-default', href: canonicalUrl(defaultPage?.path ?? '/', site) }];
}

export function sitemapXml(paths, site, indexable) {
  const entries = indexable ? [...new Set(paths)].map(path => `<url><loc>${escapeXml(canonicalUrl(path, site))}</loc></url>`).join('') : '';
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`;
}
