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
