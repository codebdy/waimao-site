import settings from '../../site.config.mjs';
import { loadRXCatalog } from '../lib/content/rxcms.mjs';
import { createWordPressClient, mapWordPressPost } from '../lib/content/wordpress.mjs';
import { getCollection, type CollectionEntry } from 'astro:content';
import type { ImageMetadata } from 'astro';
import { validateLocalEntries } from '../lib/content/local.mjs';
import { i18n } from '../i18n/config.mjs';
import { localePath } from '../i18n/urls.mjs';
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
}

export interface Post { key?: string; slug: string; title: string; description: string; contentHtml?: string; seoTitle?: string; seoDescription?: string; publishedAt?: string; images?: { src: ImageMetadata; alt: string }[]; localEntry?: CollectionEntry<'articles'>; }
interface Catalog { products: Product[]; posts: Post[]; }

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
const remoteCatalog = source === 'rxcms' ? await loadRXCatalog(env, settings.content.locale)
  : source === 'wordpress' ? { products: [], posts: (await createWordPressClient(env).listAll()).map(mapWordPressPost) }
  : null;
const catalogs = new Map<string, Catalog>(i18n.locales.map(locale => [locale.code, source === 'local' ? localCatalog(locale.code) : remoteCatalog!]));
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
export interface PageRoute {
  key: string; locale: string; path: string; noindex?: boolean;
  kind: 'home' | 'products' | 'articles' | 'contact' | 'privacy' | 'product' | 'article';
  product?: Product; post?: Post;
}
// One inventory drives translated routes, alternates, language links and sitemap.
export const pageRoutes: PageRoute[] = i18n.locales.flatMap(({ code }): PageRoute[] => {
  const { products, posts } = getCatalog(code);
  return [
    { key: 'home', kind: 'home', locale: code, path: localePath('/', code) },
    { key: 'products', kind: 'products', locale: code, path: localePath('/products/', code) },
    { key: 'articles', kind: 'articles', locale: code, path: localePath('/articles/', code), noindex: posts.length === 0 },
    { key: 'contact', kind: 'contact', locale: code, path: localePath('/contact/', code) },
    { key: 'privacy', kind: 'privacy', locale: code, path: localePath('/privacy-policy/', code) },
    ...products.map((product): PageRoute => ({ key: `product:${product.key ?? product.slug}`, kind: 'product', locale: code, path: productPath(product.slug, code), product })),
    ...posts.map((post): PageRoute => ({ key: `article:${post.key ?? post.slug}`, kind: 'article', locale: code, path: postPath(post.slug, code), post })),
  ];
});
// Empty article indexes and 404s are never listed.
export const publicPaths = pageRoutes.filter(page => !page.noindex).map(page => page.path);
