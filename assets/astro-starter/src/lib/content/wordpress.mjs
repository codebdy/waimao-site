import { apiBase, getJSON, segment, uniqueSlugs } from './http.mjs';
import { cleanHTML, plainText } from './richtext.mjs';

// Experimental standard posts/pages client. Product plugins and translations need explicit adapters.
export function createWordPressClient(env, fetcher = fetch) {
  const base = apiBase(env.WORDPRESS_API_BASE, 'WORDPRESS_API_BASE');
  if (!base.pathname.endsWith('/wp-json/')) throw new Error('WORDPRESS_API_BASE must end in /wp-json/.');
  const user = env.WORDPRESS_USERNAME, password = env.WORDPRESS_APPLICATION_PASSWORD;
  if (Boolean(user) !== Boolean(password)) throw new Error('WordPress username and Application Password must be configured together.');
  const headers = { Accept: 'application/json' };
  if (user) headers.Authorization = `Basic ${Buffer.from(`${user}:${password}`, 'utf8').toString('base64')}`;
  return {
    async listAll(type = 'posts', perPage = 100) {
      if (!['posts', 'pages'].includes(type)) throw new Error('Experimental WordPress client supports only posts/pages.');
      if (!Number.isInteger(perPage) || perPage < 1 || perPage > 100) throw new Error('WordPress per_page must be 1–100.');
      const rows = [], seen = new Set();
      let pages, total;
      for (let page = 1; page <= 1000; page++) {
        const url = new URL(`wp/v2/${type}`, base);
        url.search = new URLSearchParams({ status: 'publish', context: 'view', _embed: 'wp:featuredmedia', per_page: String(perPage), page: String(page) });
        const response = await getJSON(url, headers, fetcher, 'WordPress');
        const p = response.headers.get('X-WP-TotalPages'), t = response.headers.get('X-WP-Total');
        if (p === null || t === null || !Number.isInteger(Number(p)) || !Number.isInteger(Number(t)) || Number(p) < 0 || Number(t) < 0 ||
            (pages !== undefined && (pages !== Number(p) || total !== Number(t))) || !Array.isArray(response.data)) throw new Error('WordPress pagination headers are missing or inconsistent.');
        pages = Number(p); total = Number(t);
        for (const row of response.data) {
          if (!Number.isInteger(row.id) || seen.has(row.id)) throw new Error('WordPress returned duplicate/invalid entries.');
          seen.add(row.id); rows.push(row);
        }
        if (page >= pages) {
          if (rows.length !== total) throw new Error('WordPress pagination ended early.');
          return uniqueSlugs(rows.filter(row => row.status === 'publish' && !row.content?.protected && !row.excerpt?.protected && !row.password));
        }
        if (!response.data.length) throw new Error('WordPress returned an empty intermediate page.');
      }
      throw new Error('WordPress pagination exceeded the supported build size.');
    },
  };
}

export function mapWordPressPost(row) {
  return {
    id: row.id, slug: segment(row.slug), title: plainText(row.title?.rendered),
    description: plainText(row.excerpt?.rendered), contentHtml: cleanHTML(row.content?.rendered),
    publishedAt: row.date_gmt ? `${row.date_gmt}Z` : null,
    // Deliberately no CMS link/guid canonical and no plugin head HTML.
  };
}
