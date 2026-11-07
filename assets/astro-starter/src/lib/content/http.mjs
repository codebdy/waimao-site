// Build/server only. Never import content clients from a browser <script>.
export function apiBase(value, name) {
  let url;
  try { url = new URL(value); } catch { throw new Error(`${name} must be an absolute URL.`); }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) {
    throw new Error(`${name} requires HTTPS (HTTP is allowed only on loopback for local testing).`);
  }
  if (url.username || url.password || url.search || url.hash) throw new Error(`${name} must not contain credentials, query or fragment.`);
  return url;
}

export class ContentError extends Error {
  constructor(source, status) { super(`${source} request failed (${status}); build stopped.`); this.status = status; }
}

export async function getJSON(url, headers, fetcher = fetch, source = 'CMS') {
  let response;
  try { response = await fetcher(url, { headers, redirect: 'error', signal: AbortSignal.timeout(15000) }); }
  catch { throw new ContentError(source, 'network/timeout'); }
  if (!response.ok) throw new ContentError(source, response.status);
  let data;
  try { data = await response.json(); } catch { throw new ContentError(source, 'invalid JSON'); }
  return { data, headers: response.headers };
}

export function segment(value, label = 'slug') {
  if (typeof value !== 'string' || !value.trim() || ['.', '..'].includes(value) ||
      [...value].some(c => '/\\?#%'.includes(c) || c.charCodeAt(0) < 32)) {
    throw new Error(`Invalid ${label}; expected a single URL segment.`);
  }
  return value;
}

export function uniqueSlugs(items) {
  const seen = new Set();
  for (const item of items) {
    const slug = segment(item.slug);
    if (seen.has(slug)) throw new Error('Duplicate content slug would overwrite a generated page; build stopped.');
    seen.add(slug);
  }
  return items;
}
