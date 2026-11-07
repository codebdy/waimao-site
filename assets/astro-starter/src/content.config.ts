import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import settings from '../site.config.mjs';
import { localSchema, articleSchema } from './lib/content/local.mjs';

const loader = (collection: string) => settings.content.source === 'local'
  ? glob({ pattern: '**/*.md', base: `./src/content/${collection}`, generateId: ({ entry }) => entry })
  : async () => []; // CMS builds do not read or validate unused local content.

export const collections = {
  products: defineCollection({ loader: loader('products'), schema: ({ image }) => localSchema(image) }),
  articles: defineCollection({ loader: loader('articles'), schema: ({ image }) => articleSchema(image) }),
};
