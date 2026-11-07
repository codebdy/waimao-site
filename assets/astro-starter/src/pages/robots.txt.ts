import settings from '../../site.config.mjs';
export const prerender = true;
export function GET() {
  // Allow crawling so the demo's noindex meta can be read; not a privacy control.
  const lines = ['User-agent: *', 'Allow: /'];
  if (settings.indexable) lines.push(`Sitemap: ${new URL('/sitemap.xml', settings.site).href}`);
  return new Response(lines.join('\n') + '\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
