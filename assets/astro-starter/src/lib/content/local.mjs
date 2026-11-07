import { z } from 'astro/zod';

const text = z.string().trim().min(1);
const slug = text.refine(value => !['.', '..'].includes(value) &&
  ![...value].some(char => '/\\?#%'.includes(char) || char.charCodeAt(0) < 32), 'Use one URL segment for slug.');

// Astro supplies image(): paths are resolved relative to each Markdown file.
export function localSchema(image) {
  const specifications = z.array(z.object({ label: text, value: text }));
  return z.object({
    key: text, slug, title: text, description: text,
    specifications,
    images: z.array(z.object({ src: image(), alt: text })).default([]),
    seoTitle: text.optional(), seoDescription: text.optional(),
    // Kept from the previous local product format: downloads (e.g. /files/datasheet.pdf in public/) and related product slugs.
    attachments: z.array(z.object({ url: text, name: text })).optional(),
    relatedSlugs: z.array(slug).optional(),
  });
}

export function articleSchema(image) {
  const base = localSchema(image);
  return base.extend({
    specifications: base.shape.specifications.default([]),
    // Quoted ISO strings only: YAML would silently normalise an unquoted invalid date such as 2026-02-30.
    publishedAt: z.union([z.iso.date().pipe(z.coerce.date()), z.iso.datetime({ offset: true }).pipe(z.coerce.date())])
      .transform(date => date.toISOString()).optional(),
  });
}

// A translation key and URL slug are each unique within a collection/language.
// File-based IDs ensure duplicate frontmatter slugs cannot silently overwrite entries.
export function validateLocalEntries(entries) {
  const keys = new Map(), slugs = new Map();
  for (const entry of entries) {
    const parts = entry.id.replaceAll('\\', '/').split('/');
    const file = entry.filePath || entry.id;
    if (parts.length !== 2 || !parts[0] || !parts[1].endsWith('.md')) throw new Error(`${file}: expected <language>/<file>.md`);
    const key = `${parts[0]}:${entry.data.key}`, slug = `${parts[0]}:${entry.data.slug}`;
    if (keys.has(key)) throw new Error(`${file}: duplicate translation key ${key}, also in ${keys.get(key)}`);
    if (slugs.has(slug)) throw new Error(`${file}: duplicate slug ${slug}, also in ${slugs.get(slug)}`);
    keys.set(key, file); slugs.set(slug, file);
  }
}
