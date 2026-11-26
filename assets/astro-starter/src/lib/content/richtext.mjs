import sanitizeHtml from 'sanitize-html';
import { marked } from 'marked';
import { Parser } from 'htmlparser2';

// A parseable https URL or null: malformed CMS input is dropped, never allowed to stop the build.
const httpsUrl = value => { try { const url = new URL(value); return url.protocol === 'https:' ? url : null; } catch { return null; } };
const https = value => typeof value === 'string' && httpsUrl(value) !== null;
export function cleanHTML(value = '') {
  return sanitizeHtml(String(value), {
    allowedTags: ['p', 'br', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'strong', 'em', 'blockquote', 'code', 'pre', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img',
      'figure', 'figcaption', 'video'],
    // transformTags runs before attribute filtering, so loading/decoding must also be allowed.
    allowedAttributes: { a: ['href', 'title'], img: ['src', 'alt', 'width', 'height', 'title', 'loading', 'decoding'],
      // Body video (already-hosted file or Cloudflare Stream HLS manifest, as the RXCMS editor writes it).
      video: ['src', 'poster', 'width', 'height', 'controls', 'muted', 'loop', 'playsinline', 'preload', 'data-hls'],
      // Inquiry card stored by the publisher: <figure class="cta" data-cta="inquiry" [data-layout="stack"]>.
      figure: ['class', { name: 'data-cta', values: ['inquiry'] }, { name: 'data-layout', values: ['stack'] }] },
    allowedClasses: { figure: ['cta'] },
    allowedSchemes: ['https', 'http', 'mailto'], allowedSchemesByTag: { img: ['https'], video: ['https'] }, allowProtocolRelative: false,
    // Body images keep their CMS URL; URL lifetime is not validated here (see references/rxcms.md).
    transformTags: {
      img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, alt: attribs.alt ?? '', loading: 'lazy', decoding: 'async' } }),
      video: (tagName, { src, poster, 'data-hls': _ignored, ...attribs }) => ({ tagName, attribs: {
        ...attribs, controls: '', playsinline: '', preload: 'metadata',
        ...(https(src) ? { src } : {}), ...(https(poster) ? { poster } : {}),
        // .m3u8 needs hls.js outside Safari; HlsVideo.astro picks up video[data-hls].
        ...(https(src) && httpsUrl(src).pathname.endsWith('.m3u8') ? { 'data-hls': '' } : {}) } }),
    },
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
