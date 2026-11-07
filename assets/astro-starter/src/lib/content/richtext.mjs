import sanitizeHtml from 'sanitize-html';
import { marked } from 'marked';
import { Parser } from 'htmlparser2';

export function cleanHTML(value = '') {
  return sanitizeHtml(String(value), {
    allowedTags: ['p', 'br', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'strong', 'em', 'blockquote', 'code', 'pre', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img'],
    // transformTags runs before attribute filtering, so loading/decoding must also be allowed.
    allowedAttributes: { a: ['href', 'title'], img: ['src', 'alt', 'width', 'height', 'title', 'loading', 'decoding'] },
    allowedSchemes: ['https', 'http', 'mailto'], allowedSchemesByTag: { img: ['https'] }, allowProtocolRelative: false,
    // Body images keep their CMS URL; URL lifetime is not validated here (see references/rxcms.md).
    transformTags: { img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, alt: attribs.alt ?? '', loading: 'lazy', decoding: 'async' } }) },
  });
}

export function plainText(value = '') {
  let text = '';
  const parser = new Parser({ ontext: chunk => { text += chunk; }, onclosetag: () => { text += ' '; } }, { decodeEntities: true });
  parser.end(cleanHTML(value));
  return text.split(' ').filter(Boolean).join(' ').trim();
}

export function markdownHTML(value = '') {
  // Markdown only: do not compile executable MDX from remote content.
  return cleanHTML(marked.parse(String(value), { async: false }));
}
