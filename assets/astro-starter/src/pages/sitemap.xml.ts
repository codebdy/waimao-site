import settings from '../../site.config.mjs';
import { publicPaths } from '../data/catalog';
import { canonicalUrl, escapeXml } from '../lib/seo.mjs';
export const prerender = true;
export function GET() {
  const paths = settings.indexable ? publicPaths : [];
  const entries = paths.map(path => `<url><loc>${escapeXml(canonicalUrl(path, settings.site))}</loc></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
