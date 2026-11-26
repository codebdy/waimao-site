import settings from '../../site.config.mjs';
import { loadRXCatalog } from '../lib/content/rxcms.mjs';
import { createWordPressClient, mapWordPressPost } from '../lib/content/wordpress.mjs';
import { getCollection, type CollectionEntry } from 'astro:content';
import type { ImageMetadata } from 'astro';
import { validateLocalEntries } from '../lib/content/local.mjs';
import { i18n } from '../i18n/config.mjs';
import { localePath } from '../i18n/urls.mjs';
import redirects from '../../config/redirects.mjs';
export interface Product {
  key?: string;
  images?: { src: ImageMetadata; alt: string }[];
  localEntry?: CollectionEntry<'products'>;
  slug: string;
  title: string;
  description: string;
  specifications: { label: string; value: string }[];
  contentHtml?: string;
  extraContentHtml?: string[];
  media?: { url: string; alt: string; name?: string; type: string }[];
  attachments?: { url: string; alt?: string; name?: string; type?: string }[];
  relatedSlugs?: string[];
  seoTitle?: string;
  seoDescription?: string;
  faqs?: { question: string; answer: string }[];
  noindex?: boolean;
}

export interface RemoteImage { url: string; alt: string; }
export interface Author { id: number; name: string; position?: string; summary?: string; profileHtml?: string; avatar?: RemoteImage | null; }
export interface Post {
  key?: string; slug: string; title: string; description: string; contentHtml?: string; seoTitle?: string; seoDescription?: string;
  publishedAt?: string; updatedAt?: string; images?: { src: ImageMetadata; alt: string }[]; localEntry?: CollectionEntry<'articles'>;
  // RXCMS posts: native cover, localized tag names, byline member.
  cover?: RemoteImage | null; tags?: string[]; author?: { id: number; name: string } | null; noindex?: boolean;
}
interface Catalog { products: Product[]; posts: Post[]; users?: Author[]; }

const source = settings.content.source;
const localProducts = source === 'local' ? await getCollection('products') : [];
const localArticles = source === 'local' ? await getCollection('articles') : [];
validateLocalEntries(localProducts);
validateLocalEntries(localArticles);
function localCatalog(locale: string): Catalog {
  return {
    products: localProducts.filter(entry => entry.id.split('/')[0] === locale).map(entry => ({ ...entry.data, localEntry: entry })),
    posts: localArticles.filter(entry => entry.id.split('/')[0] === locale).map(entry => ({ ...entry.data, localEntry: entry })),
  };
}
// Explicit server-side reads; never serialize this environment object into page props.
const env = {
  RXCMS_API_BASE: import.meta.env.RXCMS_API_BASE ?? process.env.RXCMS_API_BASE,
  RXCMS_SITE_KEY: import.meta.env.RXCMS_SITE_KEY ?? process.env.RXCMS_SITE_KEY,
  WORDPRESS_API_BASE: import.meta.env.WORDPRESS_API_BASE ?? process.env.WORDPRESS_API_BASE,
  WORDPRESS_USERNAME: import.meta.env.WORDPRESS_USERNAME ?? process.env.WORDPRESS_USERNAME,
  WORDPRESS_APPLICATION_PASSWORD: import.meta.env.WORDPRESS_APPLICATION_PASSWORD ?? process.env.WORDPRESS_APPLICATION_PASSWORD,
};
if (!['local', 'rxcms', 'wordpress'].includes(source)) throw new Error('Unknown content.source.');
// RXCMS: one catalog per site language. With settings.i18n each URL code is the RXCMS urlFragment/abbr;
// translations pair up by identical slug (same rule as kingnod-v2), and a missing translation simply has no page.
const rxcmsLocale = (code: string) => settings.i18n ? code : settings.content.locale;
const rxcmsCatalogs = source === 'rxcms'
  ? await Promise.all(i18n.locales.map(async locale => [locale.code, await loadRXCatalog(env, rxcmsLocale(locale.code))] as const))
  : [];
const wordpressCatalog = source === 'wordpress' ? { products: [], posts: (await createWordPressClient(env).listAll()).map(mapWordPressPost) } : null;
// Two URL codes resolving to the same CMS language would publish one text twice as fake translations.
if (new Set(rxcmsCatalogs.map(([, catalog]) => catalog.locale)).size !== rxcmsCatalogs.length) {
  throw new Error('Two i18n locales map to the same RXCMS language; give each URL code its own CMS language.');
}
// A path listed as an old address in config/redirects.mjs is answered by the platform's 301: the item behind it
// (e.g. a CMS product that still exists) gets no page, no list entry and no sitemap/hreflang entry.
const redirected = (path: string) => Object.hasOwn(redirects, decodeURIComponent(path).replace(/\/$/, '').toLowerCase());
const live = (catalog: Catalog, code: string): Catalog => ({ ...catalog,
  products: catalog.products.filter(item => !redirected(localePath(`/products/${encodeURIComponent(item.slug)}/`, code))),
  posts: catalog.posts.filter(item => !redirected(localePath(`/articles/${encodeURIComponent(item.slug)}/`, code))) });
const catalogs = new Map<string, Catalog>((source === 'rxcms' ? rxcmsCatalogs
  : i18n.locales.map(locale => [locale.code, source === 'local' ? localCatalog(locale.code) : wordpressCatalog!] as const))
  .map(([code, catalog]) => [code, live(catalog, code)]));
export function getCatalog(locale: string = i18n.defaultLocale): Catalog {
  const catalog = catalogs.get(locale);
  if (!catalog) throw new Error(`Unknown catalog locale: ${locale}`);
  return catalog;
}
const catalog = getCatalog();
export const products: Product[] = catalog.products;
export const posts: Post[] = catalog.posts;

// Shared by route generation and sitemap: one public catalog inventory.
export const productPath = (slug: string, locale: string = i18n.defaultLocale) => localePath(`/products/${encodeURIComponent(slug)}/`, locale);
export const postPath = (slug: string, locale: string = i18n.defaultLocale) => localePath(`/articles/${encodeURIComponent(slug)}/`, locale);
// Author pages exist only in the default language (as kingnod-v2 /profiles/): one page per member.
export const authorPath = (id: number) => localePath(`/authors/${id}/`, i18n.defaultLocale);
export const authors: Author[] = catalog.users ?? [];
export interface PageRoute {
  key: string; locale: string; path: string; noindex?: boolean;
  kind: 'home' | 'products' | 'articles' | 'contact' | 'privacy' | 'product' | 'article' | 'author';
  product?: Product; post?: Post; author?: Author;
}
// One inventory drives translated routes, alternates, language links and sitemap.
const allRoutes: PageRoute[] = i18n.locales.flatMap(({ code }): PageRoute[] => {
  const { products, posts } = getCatalog(code);
  return [
    { key: 'home', kind: 'home', locale: code, path: localePath('/', code) },
    { key: 'products', kind: 'products', locale: code, path: localePath('/products/', code) },
    { key: 'articles', kind: 'articles', locale: code, path: localePath('/articles/', code), noindex: posts.length === 0 },
    { key: 'contact', kind: 'contact', locale: code, path: localePath('/contact/', code) },
    { key: 'privacy', kind: 'privacy', locale: code, path: localePath('/privacy-policy/', code) },
    ...products.map((product): PageRoute => ({ key: `product:${product.key ?? product.slug}`, kind: 'product', locale: code, path: productPath(product.slug, code), product, noindex: product.noindex })),
    ...posts.map((post): PageRoute => ({ key: `article:${post.key ?? post.slug}`, kind: 'article', locale: code, path: postPath(post.slug, code), post, noindex: post.noindex })),
    ...(code === i18n.defaultLocale ? authors.map((author): PageRoute => ({ key: `author:${author.id}`, kind: 'author', locale: code, path: authorPath(author.id), author })) : []),
  ];
});
export const pageRoutes = allRoutes.filter(page => !redirected(page.path));
// Every redirect target that is a page address must be a page this build generates (one hop, never to a 404).
for (const target of Object.values(redirects as Record<string, string>)) {
  if (!pageRoutes.some(page => decodeURIComponent(page.path) === target)) {
    throw new Error(`config/redirects.mjs points to ${target}, which this build does not generate.`);
  }
}
// Empty article indexes and 404s are never listed.
export const publicPaths = pageRoutes.filter(page => !page.noindex).map(page => page.path);
