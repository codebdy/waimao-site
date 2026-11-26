import { apiBase, ContentError, getJSON, segment, uniqueSlugs } from './http.mjs';
import { markdownHTML, plainText } from './richtext.mjs';

const types = ['product', 'post', 'product_category', 'post_category', 'tag', 'user'];
export function createRXCMSClient(env, fetcher = fetch) {
  const base = apiBase(env.RXCMS_API_BASE, 'RXCMS_API_BASE');
  if (base.pathname !== '/') throw new Error('RXCMS_API_BASE must be the service origin, without /api/v1.');
  if (!env.RXCMS_SITE_KEY) throw new Error('Set RXCMS_SITE_KEY in the build/server environment.');
  const headers = { Authorization: `Bearer ${env.RXCMS_SITE_KEY}`, Accept: 'application/json' };
  const read = async (path, query = {}) => {
    const url = new URL(`/api/v1/${path}`, base);
    for (const [key, value] of Object.entries(query)) if (value !== undefined) url.searchParams.set(key, String(value));
    return (await getJSON(url, headers, fetcher, 'RXCMS')).data;
  };
  const checkType = type => { if (!types.includes(type)) throw new Error('Unsupported RXCMS content type.'); };
  return {
    config: () => read('config'),
    async listAll(type, { locale, pageSize = 100, ...filters } = {}) {
      checkType(type);
      if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new Error('RXCMS pageSize must be 1–100.');
      const items = [], seen = new Set();
      let total;
      for (let page = 1; page <= 1000; page++) {
        const result = await read(`content/${type}`, { ...filters, locale, withContent: true, page, pageSize });
        if (!Array.isArray(result.items) || !Number.isInteger(result.total) || result.total < 0 ||
            (total !== undefined && total !== result.total)) throw new Error('RXCMS pagination changed or is invalid; retry the build.');
        total = result.total;
        for (const item of result.items) {
          if (!item || item.type !== type || !Number.isInteger(item.id) || !item.data ||
              // Members fall back to base-language profile fields per field (summaryLocale/profileLocale), so their envelope locale is not checked.
              (locale && type !== 'user' && item.locale !== locale) || seen.has(item.id)) throw new Error('RXCMS returned invalid, repeated or wrong-language content.');
          seen.add(item.id); items.push(item);
        }
        if (items.length === total) return items;
        if (type === 'user' || items.length > total || result.items.length === 0 ||
            result.page !== page || result.pageSize !== pageSize) throw new Error('RXCMS pagination ended early or did not advance.');
      }
      throw new Error('RXCMS pagination exceeded the supported build size.');
    },
    async detail(type, identifier, locale) {
      checkType(type);
      // Tags use names and users use IDs; encode as one segment, never assume a slug.
      try { return await read(`content/${type}/${encodeURIComponent(String(identifier))}`, { locale }); }
      catch (error) { if (error instanceof ContentError && error.status === 404) return null; throw error; }
    },
  };
}

export function stableMedia(item) {
  const media = item?.media ?? item;
  const file = media?.file;
  if (!file) return null;
  const raw = file.url || file.original || file.large || file.medium || file.thumbnail;
  if (!raw) return null;
  const url = apiBase(raw, 'Media URL');
  // apiBase rejects query strings conservatively, including expiring signed URLs.
  // Reviewed stable transformed URLs may be supported by a site-specific adapter.
  // A file name is not alternative text; keep it only as a download label.
  return { url: url.href, alt: plainText(item?.altText || media.description || ''), name: plainText(media.name || ''), type: media.mediaType || 'image' };
}

export function mapRXEntry(entry) {
  if (!entry?.data || !['product', 'post'].includes(entry.type)) throw new Error('Expected RXCMS product/post entry.');
  const data = entry.data;
  const slug = segment(entry.slug);
  const title = plainText(data.title);
  if (!title) throw new Error('RXCMS entry needs a title.');
  return {
    id: entry.id, slug, locale: entry.locale, title,
    description: plainText(data.description),
    seoTitle: plainText(data.meta?.seoTitle || title),
    seoDescription: plainText(data.meta?.seoDescription || data.description),
    contentHtml: markdownHTML(data.content),
    extraContentHtml: [data.content2, data.content3, data.features].filter(Boolean).map(markdownHTML),
    specifications: [],
    media: (data.medias || (data.cover ? [data.cover] : [])).map(stableMedia).filter(Boolean),
    attachments: (data.attachments || []).map(stableMedia).filter(Boolean),
    relatedSlugs: Array.isArray(data.relatedSlugs) ? data.relatedSlugs.map(s => segment(s)) : [],
    // Retain native data for reviewed site-specific schema merging, never inject arbitrary head HTML.
    schemaJson: data.schemaJson ?? null,
    category: data.category ? { slug: data.category.slug, name: plainText(data.category.name) } : null,
    publishedAt: data.publishedAt || null,
    updatedAt: data.updatedAt || null,
    // CMS robots "noindex" keeps the page out of index, hreflang and sitemap (same decision everywhere).
    noindex: /noindex/i.test(String(data.meta?.seoRobots || '')),
    // Product FAQ (Content API detail, ordered by seqValue): rendered on the page and mirrored as FAQPage.
    faqs: entry.type === 'product' && Array.isArray(data.faqs)
      ? [...data.faqs].sort((a, b) => (a?.seqValue ?? 0) - (b?.seqValue ?? 0))
        .map(q => ({ question: plainText(q?.question || ''), answer: plainText(q?.answer || '') })).filter(q => q.question && q.answer)
      : [],
    // Posts: native cover, localized tag names and the byline member (author pages use the member ID).
    cover: entry.type === 'post' && data.cover ? withAlt(stableMedia(data.cover), title) : null,
    tags: entry.type === 'post' && Array.isArray(data.tags) ? data.tags.map(tag => plainText(tag?.name)).filter(Boolean) : [],
    author: entry.type === 'post' ? mapAuthor(data.author, data.authorId) : null,
  };
}

const withAlt = (media, fallback) => media && { ...media, alt: media.alt || fallback };
function mapAuthor(author, authorId) {
  const id = Number(author?.id ?? authorId);
  const name = plainText(author?.name || '');
  return Number.isInteger(id) && id > 0 && name ? { id, name } : null;
}

export function mapRXUser(entry) {
  if (entry?.type !== 'user' || !Number.isInteger(entry.id) || !entry.data) throw new Error('Expected RXCMS user entry.');
  const data = entry.data;
  const name = plainText(data.name || '');
  if (!name) throw new Error('RXCMS member needs a name.');
  return { id: entry.id, name, position: plainText(data.position || ''), summary: plainText(data.summary || ''),
    profileHtml: data.profile ? markdownHTML(data.profile) : '', avatar: withAlt(stableMedia(data.avatar), name) };
}

export async function loadRXCatalog(env, locale, fetcher = fetch) {
  const client = createRXCMSClient(env, fetcher);
  const config = await client.config();
  const requested = locale || config.website?.baseLang?.abbr;
  const language = config.locales?.find(item => item.abbr === requested || item.urlFragment === requested);
  if (!language?.abbr) throw new Error('RXCMS locale must match a configured site language.');
  const listed = await client.listAll('product', { locale: language.abbr });
  // Product FAQ is only in the detail response (content_api.go loads faqs for GetOne, not for lists): read it per product.
  const products = [];
  for (const item of listed) {
    const detail = await client.detail('product', segment(item.slug), language.abbr);
    if (!detail || detail.id !== item.id || detail.locale !== language.abbr) throw new Error('RXCMS product detail does not match its list entry; build stopped.');
    products.push({ ...item, data: { ...item.data, faqs: detail.data?.faqs ?? [] } });
  }
  const posts = (await client.listAll('post', { locale: language.abbr })).map(mapRXEntry);
  // Author pages only for members who sign at least one post in this language.
  const authorIds = new Set(posts.map(post => post.author?.id).filter(Boolean));
  const users = authorIds.size ? (await client.listAll('user', { locale: language.abbr })).filter(user => authorIds.has(user.id)).map(mapRXUser) : [];
  return { products: uniqueSlugs(products.map(mapRXEntry)), posts: uniqueSlugs(posts), users, locale: language.abbr };
}
