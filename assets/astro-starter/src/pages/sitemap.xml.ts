import settings from '../../site.config.mjs';
import { publicPaths } from '../data/catalog';
import { sitemapXml } from '../lib/seo.mjs';
export const prerender = true;
export function GET() {
  return new Response(sitemapXml(publicPaths, settings.site, settings.indexable), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
