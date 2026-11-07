import settings from '../../site.config.mjs';
import { loadRXCatalog } from '../lib/content/rxcms.mjs';
import { createWordPressClient, mapWordPressPost } from '../lib/content/wordpress.mjs';
export interface Product {
  slug: string;
  title: string;
  description: string;
  specifications: { label: string; value: string }[];
  contentHtml?: string;
  extraContentHtml?: string[];
  media?: { url: string; alt: string; name?: string; type: string }[];
  attachments?: { url: string; alt: string; name?: string; type: string }[];
  relatedSlugs?: string[];
  seoTitle?: string;
  seoDescription?: string;
}

// Fictional examples only. Replace with verified client data before publishing.
const localProducts: Product[] = [
  {
    slug: 'sample-component',
    title: 'Sample industrial component',
    description: 'Demonstration product. Replace this text with verified specifications, applications and ordering information.',
    specifications: [{ label: 'Catalog status', value: 'Demonstration only' }],
  },
];

const source = settings.content.source;
// Explicit server-side reads; never serialize this environment object into page props.
const env = {
  RXCMS_API_BASE: import.meta.env.RXCMS_API_BASE ?? process.env.RXCMS_API_BASE,
  RXCMS_SITE_KEY: import.meta.env.RXCMS_SITE_KEY ?? process.env.RXCMS_SITE_KEY,
  WORDPRESS_API_BASE: import.meta.env.WORDPRESS_API_BASE ?? process.env.WORDPRESS_API_BASE,
  WORDPRESS_USERNAME: import.meta.env.WORDPRESS_USERNAME ?? process.env.WORDPRESS_USERNAME,
  WORDPRESS_APPLICATION_PASSWORD: import.meta.env.WORDPRESS_APPLICATION_PASSWORD ?? process.env.WORDPRESS_APPLICATION_PASSWORD,
};
if (!['local', 'rxcms', 'wordpress'].includes(source)) throw new Error('Unknown content.source.');
const catalog = source === 'rxcms' ? await loadRXCatalog(env, settings.content.locale)
  : source === 'wordpress' ? { products: [], posts: (await createWordPressClient(env).listAll()).map(mapWordPressPost) }
  : { products: localProducts, posts: [] };
export const products: Product[] = catalog.products;
export const posts: { slug: string; title: string; description: string; contentHtml: string; seoTitle?: string; seoDescription?: string; publishedAt?: string }[] = catalog.posts;

// Shared by route generation and sitemap: one public catalog inventory.
export const productPath = (slug: string) => `/products/${encodeURIComponent(slug)}/`;
export const postPath = (slug: string) => `/articles/${encodeURIComponent(slug)}/`;
// An empty article index is not linked or listed (thin page); it stays noindex until posts exist.
export const publicPaths = ['/', '/products/', ...(posts.length ? ['/articles/'] : []), '/contact/', '/privacy-policy/', ...products.map(p => productPath(p.slug)), ...posts.map(p => postPath(p.slug))];
