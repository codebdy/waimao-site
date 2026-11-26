#!/usr/bin/env node
// waimao-site RXCMS publisher: writes one article (post) or product to the site's RXCMS and reads it back.
// Built-in Node modules only. Credentials come only from <site>/.env (RXCMS_API_BASE, RXCMS_SITE_KEY,
// optional DEPLOY_HOOK_URL); they are never printed or written anywhere. Input format: references/rxcms-publish.md.
//
//   node rxcms-publish.mjs check    --site <site dir> --file <item.json> [--update]
//   node rxcms-publish.mjs publish  --site <site dir> --file <item.json> [--draft] [--update] [--no-deploy]
//   node rxcms-publish.mjs readback --site <site dir> --kind post|product --locale <abbr> --slug <slug>
//   node rxcms-publish.mjs deploy   --site <site dir>
import { createHash } from 'node:crypto';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, basename, extname, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';

const UA = 'waimao-site-publish/1.0'; // Fixed UA: default fetch/urllib signatures get blocked by Cloudflare (error 1010).
const IMAGE_TYPES = { '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };
const PDF = 'application/pdf';
const MAGIC = { // content sniffing: the extension alone is not trusted
  'image/webp': b => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
  'image/jpeg': b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  [PDF]: b => b.subarray(0, 5).toString('latin1') === '%PDF-',
};
const DEFAULT_IMAGE_LIMIT = 1 << 20; // rxcms-server MaxImageUploadBytes; /api/v1/config limits.maxImageUploadBytes wins.
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const META = 'metaId meta { id seoTitle seoDescription seoRobots }';
const KINDS = {
  post: { type: 'Post', list: 'postList', category: 'postCategoryList', fields:
    'id createdAt updatedAt slug title description content schemaJson status publishedAt isDeleted categoryId authorId coverId ' +
    `websiteId langId ${META} tags { id } cover { id file { url original } }` },
  product: { type: 'Product', list: 'productList', category: 'productCategoryList', fields:
    'id createdAt updatedAt slug title shortTitle description content content2 content3 features relatedSlugs schemaJson status ' +
    `published publishedAt isDeleted categoryId websiteId langId ${META} medias { id seqValue altText mediaId } ` +
    'attachments { id seqValue altText mediaId } faqs { id updatedAt question answer seqValue }' },
};
const MEDIA_FIELDS = 'id name uploadStatus websiteId file { url original }';

export class Stop extends Error {}
const fail = message => { throw new Stop(message); };
const text = value => typeof value === 'string' && value.trim() !== '';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const fold = value => String(value ?? '').trim().toLowerCase();
const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

// ---------- credentials ----------

export function readSiteEnv(siteDir) {
  const path = resolve(siteDir, '.env');
  if (!existsSync(path)) fail(`${path} 不存在：在网站文件夹里按 .env.example 建 .env，填 RXCMS_API_BASE 和 RXCMS_SITE_KEY`);
  const out = {};
  // Strip BOM and Windows line endings: a stray \r silently breaks the URL or key.
  for (let line of readFileSync(path, 'utf8').replace(/^﻿/, '').replaceAll('\r', '').split('\n')) {
    line = line.trim();
    if (line.startsWith('export ')) line = line.slice(7).trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const at = line.indexOf('=');
    const key = line.slice(0, at).trim();
    let value = line.slice(at + 1).trim();
    if (value.length >= 2 && value[0] === value.at(-1) && `"'`.includes(value[0])) value = value.slice(1, -1);
    if (['RXCMS_API_BASE', 'RXCMS_SITE_KEY', 'DEPLOY_HOOK_URL'].includes(key)) out[key] = value.trim();
  }
  if (!out.RXCMS_SITE_KEY) fail('.env 里没有 RXCMS_SITE_KEY（后台「密钥管理」生成，需要 content:write 权限）');
  let base;
  try { base = new URL(out.RXCMS_API_BASE); } catch { fail('.env 里的 RXCMS_API_BASE 不是完整网址（例如 https://api.example.com）'); }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname);
  if (base.protocol !== 'https:' && !(base.protocol === 'http:' && loopback)) fail('RXCMS_API_BASE 须用 https');
  if (base.pathname !== '/' || base.search || base.hash || base.username || base.password) {
    fail('RXCMS_API_BASE 只填服务地址（协议+域名），不带 /api/v1、/graphql、参数或账号');
  }
  let hook = null;
  if (out.DEPLOY_HOOK_URL) {
    try { hook = new URL(out.DEPLOY_HOOK_URL); } catch { fail('.env 里的 DEPLOY_HOOK_URL 不是完整网址'); }
    if (hook.protocol !== 'https:') fail('DEPLOY_HOOK_URL 须用 https');
  }
  return { base: base.origin, token: out.RXCMS_SITE_KEY, hook: hook?.href ?? null };
}

// ---------- transport ----------

export class Client {
  constructor({ base, token, hook = null }, fetcher = fetch) { this.base = base; this.token = token; this.hook = hook; this.fetch = fetcher; }
  redact(message) {
    let out = String(message).replaceAll(this.token, '[REDACTED]');
    if (this.hook) out = out.replaceAll(this.hook, '[DEPLOY_HOOK]');
    return out;
  }

  async #send(path, init, read) {
    const headers = { Authorization: `Bearer ${this.token}`, Accept: 'application/json', 'User-Agent': UA, ...init.headers };
    // Reads retry briefly on network/429/5xx; writes are sent exactly once.
    for (let attempt = 0; ; attempt++) {
      let response;
      try {
        // redirect:'error' keeps the bearer token from being forwarded to another host.
        response = await this.fetch(this.base + path, { ...init, headers, redirect: 'error', signal: AbortSignal.timeout(60000) });
      } catch (error) {
        if (read && attempt < 2) continue;
        throw new Stop(this.redact(`${path} 请求失败：${error?.name || 'Error'} ${error?.message || ''}`));
      }
      if (read && attempt < 2 && (response.status === 429 || response.status >= 500)) continue;
      let body;
      try { body = await response.text(); } catch (error) { fail(this.redact(`${path} 响应读取中断：${error?.name || 'Error'}`)); }
      if (response.status === 402) fail(`${path} 返回 402（站点暂停或订阅失效）：先在后台恢复站点，不是“没有内容”`);
      if (!response.ok) fail(this.redact(`HTTP ${response.status} ${path}: ${body}`).slice(0, 800));
      try { return JSON.parse(body); } catch { fail(`${path} 返回的不是 JSON`); }
    }
  }

  get(path) { return this.#send(path, { method: 'GET' }, true); }
  post(path, body) { return this.#send(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, false); }
  async data(query, variables) { // read-only GraphQL
    const result = await this.#send('/graphql', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }) }, true);
    if (result.errors?.length) fail(this.redact('GraphQL 错误：' + JSON.stringify(result.errors)));
    return result.data;
  }
  write(query, variables) { return this.post('/graphql', { query, variables }); } // once, full response (errors included)
  upload(name, bytes, type) { // Same proxy endpoint the admin uses for images; the site key decides the website.
    const form = new FormData();
    form.append('name', name);
    form.append('file', new Blob([bytes], { type }), name);
    return this.#send('/api/media/image-upload', { method: 'POST', body: form }, false);
  }
  async putSigned(url, bytes, headers) { // presigned direct upload: no token, no redirect, sent once; the URL is never printed
    let response;
    try { response = await this.fetch(url, { method: 'PUT', body: bytes, headers: { ...headers, 'User-Agent': UA }, redirect: 'error', signal: AbortSignal.timeout(300000) }); }
    catch (error) { fail(`直传请求失败：${error?.name || 'Error'}`); }
    if (!response.ok) fail(`直传返回 HTTP ${response.status}`);
  }
  async mediaBytes(url) { // anonymous, no token
    for (let attempt = 0; ; attempt++) {
      try {
        const response = await this.fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(60000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return Buffer.from(await response.arrayBuffer());
      } catch (error) {
        if (attempt < 2) continue;
        throw new Stop(`媒体取不回 ${url.split('?')[0]}：${error.message}`);
      }
    }
  }
  async deploy() {
    if (!this.hook) return '没有配置 DEPLOY_HOOK_URL，未触发部署：请到发布平台手动重新部署';
    let response;
    try { response = await this.fetch(this.hook, { method: 'POST', headers: { 'User-Agent': UA }, redirect: 'error', signal: AbortSignal.timeout(60000) }); }
    catch (error) { return `部署钩子请求失败（${error?.name || 'Error'}）：请到发布平台手动重新部署`; }
    return response.ok ? '已触发部署钩子，几分钟后网站更新' : `部署钩子返回 HTTP ${response.status}：请到发布平台手动重新部署`;
  }
}

// ---------- body content ----------

// Markdown ![alt](src "title" | 'title') and HTML <img src alt>. Any other image syntax is rejected by countImages().
const MD_IMAGE = /!\[([^\]]*)\]\(\s*(<[^>]+>|[^\s()]+)(\s+(?:"[^"]*"|'[^']*'))?\s*\)/g;
export const unparsedImages = content => (content.match(/!\[/g) || []).length - [...content.matchAll(MD_IMAGE)].length;
const HTML_IMAGE = /<img\b[^>]*>/gi;
const HTML_VIDEO = /<video\b[^>]*>/gi;
const attr = (tag, name) => { const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i')); return m ? (m[2] ?? m[3]) : null; };
export function contentImages(content) {
  const out = [];
  for (const m of content.matchAll(MD_IMAGE)) out.push({ src: m[2].replace(/^<|>$/g, ''), alt: m[1].trim() });
  for (const m of content.matchAll(HTML_IMAGE)) out.push({ src: attr(m[0], 'src') ?? '', alt: (attr(m[0], 'alt') ?? '').trim() });
  return out;
}
// Body video is passed through as already-hosted HTML (e.g. a Cloudflare Stream HLS manifest); it is never uploaded here.
export function contentVideos(content) {
  return [...content.matchAll(HTML_VIDEO)].map(m => ({ src: attr(m[0], 'src') ?? '', poster: attr(m[0], 'poster') }));
}
export function rewriteImages(content, map) {
  return content
    .replace(MD_IMAGE, (all, alt, src, title = '') => {
      const key = src.replace(/^<|>$/g, '');
      return map.has(key) ? `![${alt}](${map.get(key)}${title})` : all;
    })
    .replace(HTML_IMAGE, tag => tag.replace(/(\ssrc\s*=\s*)("([^"]*)"|'([^']*)')/i,
      (all, lead, _q, dq, sq) => map.has(dq ?? sq) ? `${lead}"${map.get(dq ?? sq)}"` : all));
}
const isRemote = src => /^https:\/\//i.test(src);

// Inquiry cards, same stored HTML as seo-rxcms cta_blocks: one card at the end of the section whose heading is `after`.
export const ctaHtml = ({ label, text: description }) =>
  `<figure class="cta" data-cta="inquiry">\n${description ? `<figcaption>${escapeHtml(description)}</figcaption>\n` : ''}<a href="/contact/">${escapeHtml(label)}</a>\n</figure>`;
export function insertCtas(content, ctas = []) {
  const lines = content.replaceAll('\r\n', '\n').split('\n');
  // ATX headings outside fenced code blocks only: a "## x" inside ``` is code, not a section.
  let fence = null;
  const heads = lines.map(line => {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/)?.[1];
    if (marker && (!fence || marker[0] === fence[0] && marker.length >= fence.length)) { fence = fence ? null : marker; return null; }
    const m = !fence && line.match(/^(#{2,4})\s+(.+?)\s*#*\s*$/);
    return m ? { level: m[1].length, title: m[2].trim() } : null;
  });
  const inserts = ctas.map(cta => {
    const hits = heads.flatMap((h, i) => (h?.title === cta.after ? [i] : []));
    if (hits.length !== 1) fail(`CTA 的 after「${cta.after}」在正文里${hits.length ? '对应多个' : '找不到'}小标题（##–####，代码块里的不算）`);
    const at = hits[0], level = heads[at].level;
    let end = heads.findIndex((h, i) => i > at && h && h.level <= level);
    if (end < 0) end = lines.length;
    return { end, html: ctaHtml(cta) };
  });
  for (const { end, html } of inserts.sort((a, b) => b.end - a.end)) {
    let stop = end;
    while (stop > 0 && lines[stop - 1].trim() === '') stop--;
    lines.splice(stop, end - stop, '', ...html.split('\n'), ...(end < lines.length ? [''] : []));
  }
  return lines.join('\n');
}

// ---------- input (offline gates) ----------

export function loadItem(file) {
  let item;
  try { item = JSON.parse(readFileSync(file, 'utf8').replace(/^﻿/, '')); } catch (e) { fail(`读不了输入文件 ${file}：${e.message}`); }
  const problems = [];
  const need = (ok, message) => { if (!ok) problems.push(message); };
  need(item.kind === 'post' || item.kind === 'product', 'kind 只能是 post 或 product');
  need(text(item.locale), 'locale 必填：RXCMS 后台的语言代码（/api/v1/config 的 abbr），例如 en');
  need(typeof item.slug === 'string' && SLUG.test(item.slug), 'slug 必填：小写字母、数字和连字符，例如 how-to-choose-a-pump');
  need(text(item.title), 'title 必填');
  need(text(item.description), 'description（列表简介）必填，并用本语言写');
  need(text(item.content), 'content（Markdown 正文）必填');
  need(text(item.seo?.title) && text(item.seo?.description), 'seo.title 与 seo.description 必填（本语言）');
  need(item.seo?.robots === undefined || text(item.seo.robots), 'seo.robots 填就填完整字符串，例如 index,follow');
  need(item.schemaJson === undefined || (item.schemaJson && typeof item.schemaJson === 'object'), 'schemaJson 须是 JSON 对象或数组');
  const baseDir = dirname(resolve(file));
  const files = new Map(); // src → local file to upload
  const local = (src, label, types) => {
    if (/^[a-z][a-z0-9+.-]*:/i.test(src) || src.startsWith('//')) return problems.push(`${label} 只能用本地文件或 https 地址：${src}`);
    const path = isAbsolute(src) ? src : resolve(baseDir, src);
    const ext = extname(path).toLowerCase();
    if (ext === '.png') return problems.push(`${label} 是 PNG：先转成 WebP（照片也可用 JPEG）再发布`);
    if (!types[ext]) return problems.push(`${label} 格式不支持（只收 ${Object.keys(types).join(' ')}）：${src}`);
    if (!existsSync(path) || !statSync(path).isFile()) return problems.push(`${label} 文件不存在：${path}`);
    if (!MAGIC[types[ext]](readFileSync(path).subarray(0, 12))) return problems.push(`${label} 的文件内容不是 ${ext} 格式：${src}`);
    files.set(src, { path, ext, size: statSync(path).size, type: types[ext] });
  };
  const image = (entry, label, localOnly = false, needAlt = true) => {
    if (!entry || !text(entry.src)) return problems.push(`${label} 缺 src`);
    if (needAlt && !text(entry.alt)) problems.push(`${label} 缺 alt（本语言图片说明）`);
    if (isRemote(entry.src)) return localOnly ? problems.push(`${label} 要用本地图片文件（上传后才有媒体 ID）`) : undefined;
    local(entry.src, label, IMAGE_TYPES);
  };
  if (text(item.content)) {
    if (/<iframe\b/i.test(item.content)) problems.push('正文含 iframe：本工具不写嵌入代码，请在 RXCMS 后台编辑器里插入');
    contentVideos(item.content).forEach((video, i) => {
      need(isRemote(video.src), `正文第 ${i + 1} 个视频要用已托管的 https 地址（本工具不上传视频，先在后台上传后复制地址）`);
      need(video.poster === null || isRemote(video.poster), `正文第 ${i + 1} 个视频的 poster 要用 https 地址`);
    });
    need(!/\]\([^)]*\.mp4\b/i.test(item.content), '正文用 Markdown 链接引用了 .mp4：视频请写成 <video src="https://…"> 并用已托管地址');
    contentImages(item.content).forEach((entry, i) => image(entry, `正文第 ${i + 1} 张图`));
    need(!/<figure\b[^>]*class="cta"/i.test(item.content), '正文里不要手写 CTA 卡片：用 cta 字段，由脚本统一插入');
    need(unparsedImages(item.content) === 0 && !/^\s*\[[^\]]+\]:\s*\S/m.test(item.content),
      '正文有无法识别的图片写法（引用式 ![说明][名字]、地址里带括号或空格等）：改成 ![说明](地址) 的直接写法');
  }
  if (item.kind === 'post') {
    // RXCMS posts store only coverId (no cover-alt field); the site uses the article title as the cover's alt.
    image(item.cover, 'cover（文章封面）', true, false);
    need(Array.isArray(item.tags) && item.tags.length > 0, 'tags 必填：[{"base": "<基准语言标签名>", "name": "<本语言标签名>"}]，至少一个');
    for (const [i, tag] of (Array.isArray(item.tags) ? item.tags : []).entries()) {
      need(text(tag?.base) && text(tag?.name) && tag.base.trim() === tag.base && tag.name.trim() === tag.name, `tags 第 ${i + 1} 项要有 base 和 name（不带首尾空格）`);
    }
    need(typeof item.category === 'string' && SLUG.test(item.category), 'category 必填：文章分类的 slug');
    need(Number.isInteger(item.authorId) && item.authorId > 0, 'authorId 必填：后台成员（作者）的数字 ID');
    need(item.cta === undefined || (Array.isArray(item.cta) && item.cta.every(c => text(c?.after) && text(c?.label) && (c.text === undefined || text(c.text)))),
      'cta 填 [{"after": "<小标题原文>", "label": "<按钮文字>", "text": "<可选说明>"}]');
    for (const key of ['images', 'faqs', 'attachments']) need(item[key] === undefined, `${key} 只用于产品`);
  } else if (item.kind === 'product') {
    need(Array.isArray(item.images) && item.images.length > 0, 'images 必填：产品图库至少一张 {src, alt}');
    (Array.isArray(item.images) ? item.images : []).forEach((entry, i) => image(entry, `产品图第 ${i + 1} 张`, true));
    need(item.category === undefined || (typeof item.category === 'string' && SLUG.test(item.category)), 'category 填产品分类的 slug');
    for (const key of ['shortTitle', 'features', 'content2', 'content3']) {
      need(item[key] === undefined || typeof item[key] === 'string', `${key} 须是文字`);
      need(typeof item[key] !== 'string' || !/!\[|<img\b|<video\b/i.test(item[key]), `${key} 里不要放图片或视频：放进 content 或 images`);
    }
    need(item.relatedSlugs === undefined || (Array.isArray(item.relatedSlugs) && item.relatedSlugs.every(s => SLUG.test(s))), 'relatedSlugs 须是 slug 列表');
    need(item.faqs === undefined || (Array.isArray(item.faqs) && item.faqs.every(q => text(q?.question) && text(q?.answer))), 'faqs 填 [{"question": "…", "answer": "…"}]（本语言）');
    need(item.attachments === undefined || Array.isArray(item.attachments), 'attachments 填 [{"src": "./datasheet.pdf", "name": "<本语言下载名>"}]');
    for (const [i, doc] of (Array.isArray(item.attachments) ? item.attachments : []).entries()) {
      if (!text(doc?.src) || !text(doc?.name)) { problems.push(`附件第 ${i + 1} 个要有 src 和 name（显示给访客的下载名）`); continue; }
      local(doc.src, `附件第 ${i + 1} 个`, { '.pdf': PDF });
    }
    for (const key of ['cover', 'tags', 'authorId', 'cta']) need(item[key] === undefined, `${key} 只用于文章（产品页模板已有询盘入口）`);
  }
  if (problems.length) fail('输入没通过检查，没有联网、没有写入：\n- ' + problems.join('\n- '));
  return { item, files };
}

// ---------- remote lookups (read-only) ----------

export async function siteOf(client, locale) {
  const config = await client.get('/api/v1/config');
  const website = config.website || {};
  const langs = [website.baseLang, ...(config.locales || [])].filter(l => l && l.abbr === locale);
  const ids = new Set(langs.map(l => String(l.id)));
  if (ids.size !== 1) fail(`/api/v1/config 里语言 ${locale} 匹配 ${ids.size} 个（可用：${(config.locales || []).map(l => l.abbr).join(', ')}）`);
  if (!website.id || !website.baseLang?.abbr || website.baseLang?.id == null) fail('/api/v1/config 缺 website.id 或基准语言');
  const limit = config.limits?.maxImageUploadBytes;
  return {
    websiteId: website.id, websiteName: website.name, langId: Number(langs[0].id), locale,
    baseLocale: website.baseLang.abbr, baseLangId: Number(website.baseLang.id),
    conditionalSet: config.features?.conditionalSet === true,
    imageLimit: Number.isInteger(limit) && limit > 0 ? limit : DEFAULT_IMAGE_LIMIT,
  };
}
const scope = site => ({ websiteId: { _eq: site.websiteId }, langId: { _eq: site.langId } });

async function listAll(client, field, type, where, fields) {
  const q = `query($where:${type}BoolExp!,$offset:Int!){${field}(limit:100,offset:$offset,where:$where){total items{${fields}}}}`;
  const rows = [];
  for (;;) {
    const page = (await client.data(q, { where, offset: rows.length }))[field];
    rows.push(...page.items);
    if (rows.length >= page.total || !page.items.length) {
      if (rows.length !== page.total || new Set(rows.map(r => String(r.id))).size !== rows.length) fail(`${field} 分页不全或有重复`);
      return rows;
    }
  }
}
function sameScope(row, site) {
  if (String(row.websiteId) !== String(site.websiteId) || String(row.langId) !== String(site.langId)) fail(`远端对象 ${row.id} 不属于本站本语言`);
}
export async function findBySlug(client, site, kind, slug) {
  const k = KINDS[kind];
  const rows = await listAll(client, k.list, k.type, { ...scope(site), slug: { _eq: slug } }, k.fields);
  rows.forEach(r => sameScope(r, site));
  if (rows.length > 1) fail(`本站本语言有 ${rows.length} 条 slug=${slug} 的 ${kind}，先在后台处理重复`);
  return rows[0] || null;
}
export async function getById(client, site, kind, id) {
  const k = KINDS[kind];
  const obj = (await client.data(`query($where:${k.type}BoolExp!){one${k.type}(where:$where){${k.fields}}}`,
    { where: { ...scope(site), id: { _eq: String(id) } } }))['one' + k.type];
  if (!obj || String(obj.id) !== String(id)) fail(`读回不到 ${kind} ${id}`);
  sameScope(obj, site);
  return obj;
}
async function categoryId(client, site, kind, slug) {
  const k = KINDS[kind];
  const type = kind === 'post' ? 'PostCategory' : 'ProductCategory';
  const rows = await listAll(client, k.category, type, { ...scope(site), slug: { _eq: slug } }, 'id slug name websiteId langId');
  const hits = rows.filter(r => r.slug === slug);
  hits.forEach(r => sameScope(r, site));
  if (hits.length !== 1) fail(`本站本语言（${site.locale}）找到 ${hits.length} 个 slug=${slug} 的分类：没有就先在后台建好（各语言都要建），多个就先去重`);
  return Number(hits[0].id);
}
async function publicList(client, kind, locale) { // public Content API, full list for one locale
  const rows = [];
  let total;
  for (let page = 1; ; page++) {
    const result = await client.get(`/api/v1/content/${kind}?` + new URLSearchParams({ locale, page, pageSize: 100 }));
    if (!Array.isArray(result.items) || !Number.isInteger(result.total) || (total !== undefined && result.total !== total)) {
      fail(`/api/v1/content/${kind} 分页变化或格式不对：重跑`);
    }
    total = result.total;
    rows.push(...result.items);
    // The member list returns everyone on every page: stop by total, never by page size.
    if (kind === 'user' || rows.length >= total) break;
    if (!result.items.length) fail(`/api/v1/content/${kind} 分页提前结束（${rows.length}/${total}）`);
  }
  if (rows.length !== total || new Set(rows.map(r => String(r.id))).size !== rows.length) fail(`/api/v1/content/${kind} 数量或 ID 不一致`);
  if (kind !== 'user' && rows.some(r => r.locale !== locale)) fail(`/api/v1/content/${kind} 返回了其他语言`);
  return rows;
}
async function checkAuthor(client, site, authorId) {
  const users = await publicList(client, 'user', site.locale);
  const user = users.find(u => String(u.id) === String(authorId));
  if (!user) fail(`作者 ${authorId} 不在本站公开成员里（可用：${users.map(u => `${u.id} ${u.data?.name || ''}`).join('；')}）`);
  return { id: Number(user.id), name: user.data?.name };
}

// ---------- tags: find, or create when missing (base tag, then this language's translation) ----------

const noSource = value => value === undefined || value === null || value === 0 || value === '0';
// Read-only. Returns one entry per input tag: {base, name, baseId|null, id|null}; null ids are created by createTags.
// Stops (asks the user) whenever a name is ambiguous instead of guessing.
export async function planTags(client, site, tags) {
  const isBase = site.locale === site.baseLocale;
  const baseRows = (await publicList(client, 'tag', site.baseLocale)).filter(t => noSource(t.data?.sourceTagId));
  const localRows = isBase ? [] : await publicList(client, 'tag', site.locale);
  const out = [];
  for (const { base, name } of tags) {
    if (isBase && base !== name) fail(`基准语言（${site.baseLocale}）的标签 base 与 name 要相同：${base} / ${name}`);
    if (!isBase && fold(base) === fold(name)) fail(`标签「${name}」与基准语言名称相同，没有翻译：name 填 ${site.locale} 译名`);
    const exact = baseRows.filter(t => t.data?.name === base);
    const near = baseRows.filter(t => fold(t.data?.name) === fold(base) && t.data?.name !== base);
    if (exact.length > 1 || (!exact.length && near.length)) {
      fail(`基准语言标签「${base}」有歧义（后台有 ${[...exact, ...near].map(t => `「${t.data?.name}」(${t.id})`).join('、')}）：请用户确认用哪个后，把 base 改成后台原名`);
    }
    const baseId = exact[0] ? Number(exact[0].id) : null;
    if (isBase) { out.push({ base, name, baseId, id: baseId }); continue; }
    const mapped = baseId == null ? [] : localRows.filter(t => String(t.data?.sourceTagId) === String(baseId));
    const named = localRows.filter(t => fold(t.data?.name) === fold(name));
    if (mapped.length > 1) fail(`${site.locale} 有 ${mapped.length} 个标签都是「${base}」的译名：先在后台去重`);
    if (mapped.length === 1 && mapped[0].data?.name !== name) {
      fail(`「${base}」的 ${site.locale} 译名后台是「${mapped[0].data?.name}」，输入是「${name}」：请用户确认用哪个，再改输入或后台`);
    }
    if (named.some(t => !mapped.includes(t))) fail(`${site.locale} 的「${name}」已被另一个标签使用：请用户确认后再发布`);
    out.push({ base, name, baseId, id: mapped[0] ? Number(mapped[0].id) : null });
  }
  // Within one input, two entries may not share a base or a translated name (they would collide on creation).
  for (const key of ['base', 'name']) {
    const seen = out.map(t => fold(t[key]));
    if (new Set(seen).size !== seen.length) fail(`tags 里有重复的 ${key}：每个标签只写一次`);
  }
  return out;
}
async function createTag(client, site, object, label) {
  const resp = await client.write('mutation($object:TagInput!){upsertOneTag(object:$object){id}}', { object });
  if (resp.errors?.length || !resp.data?.upsertOneTag?.id) fail(client.redact(`新建标签「${label}」未确认：${JSON.stringify(resp.errors || resp.data)}；先在后台查这个标签，不要直接重跑`));
  return Number(resp.data.upsertOneTag.id);
}
export async function createTags(client, site, plan, log) {
  for (const tag of plan) {
    if (tag.baseId == null) {
      tag.baseId = await createTag(client, site, { websiteId: site.websiteId, langId: site.baseLangId, name: tag.base }, tag.base);
      log.push(`新建基准语言标签「${tag.base}」（${tag.baseId}）`);
      if (site.locale === site.baseLocale) tag.id = tag.baseId;
    }
    if (tag.id == null) {
      tag.id = await createTag(client, site, { websiteId: site.websiteId, langId: site.langId, sourceTagId: tag.baseId, name: tag.name }, tag.name);
      log.push(`新建 ${site.locale} 标签「${tag.name}」（${tag.id}，译自 ${tag.baseId}）`);
    }
  }
  // Read back through the public API the website build uses: every tag exists with the planned name and source.
  const again = await planTags(client, site, plan.map(({ base, name }) => ({ base, name })));
  again.forEach((tag, i) => { if (tag.id !== plan[i].id || tag.baseId !== plan[i].baseId) fail(`标签「${plan[i].name}」新建后读回不一致`); });
}

// ---------- everything checked before the first write (shared by check and publish) ----------

export async function plan(client, file, { update = false } = {}) {
  const { item, files } = loadItem(file);
  const site = await siteOf(client, item.locale);
  for (const [src, info] of files) {
    if (info.type !== PDF && info.size > site.imageLimit) fail(`图片 ${src} 有 ${info.size} 字节，超过 RXCMS 上限 ${site.imageLimit}：先压缩`);
  }
  const existing = await findBySlug(client, site, item.kind, item.slug);
  if (existing?.isDeleted) fail(`slug=${item.slug} 的 ${item.kind} 在后台回收站里（${existing.id}）：先在后台恢复或彻底删除`);
  if (existing && !update) fail(`本站本语言已有 slug=${item.slug} 的 ${item.kind}（ID ${existing.id}）：确认要改它再加 --update`);
  if (existing && !site.conditionalSet) fail('服务端没有声明 conditionalSet，不能安全修改已有内容：请在后台手工修改');
  const relations = {};
  if (item.category) relations.categoryId = await categoryId(client, site, item.kind, item.category);
  if (item.kind === 'post') {
    relations.author = await checkAuthor(client, site, item.authorId);
    relations.tags = await planTags(client, site, item.tags);
  }
  if (existing) { // category/author are not changed on update; tags may only be added
    const diff = [];
    if (relations.categoryId !== undefined && Number(existing.categoryId) !== relations.categoryId) diff.push('分类');
    if (item.kind === 'post' && Number(existing.authorId) !== relations.author.id) diff.push('作者');
    if (item.kind === 'post') {
      const want = new Set(relations.tags.map(t => t.id).filter(id => id != null));
      if ((existing.tags || []).some(t => !want.has(Number(t.id)))) diff.push('标签（后台有输入里没有的标签）');
    }
    if (diff.length) fail(`已有内容的${diff.join('、')}与输入不同：本工具修改时不改这些关联，请先在后台改好再运行`);
    if (item.kind === 'product' && (existing.faqs || []).length > (item.faqs || []).length) {
      fail(`后台这个产品有 ${existing.faqs.length} 条 FAQ，比输入多：本工具不删 FAQ，请先在后台删掉多余的`);
    }
    if (item.kind === 'product') { // before any upload: existing gallery/attachment rows must already be exactly these files
      for (const [label, list, have, altOf] of [['图库', item.images, existing.medias, e => e.alt], ['附件', item.attachments || [], existing.attachments, d => d.name]]) {
        if (!have?.length) continue;
        const want = [];
        for (const entry of list) want.push([(await findUploaded(client, site, files.get(entry.src)))?.id ?? null, altOf(entry)]);
        if (!same(rowKey(have), want)) fail(`已有产品的${label}（文件、顺序或说明）与输入不同：本工具不删改${label}行，请在后台调整后再运行；后台没有任何改动`);
      }
    }
  }
  // Inquiry cards are placed now, so a wrong anchor stops before anything is created or uploaded.
  const body = item.kind === 'post' ? insertCtas(item.content, item.cta) : item.content;
  return { item, files, site, existing, relations, body };
}

// ---------- media ----------

const uploadName = (path, hash, ext) =>
  (basename(path, extname(path)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'file') + `-${hash.slice(0, 10)}${ext}`;
const fileUrl = media => media?.file?.original || media?.file?.url; // R2 objects: short-lived signed URL, used in memory only

async function mediaById(client, site, id) {
  return (await client.data(`query($where:MediaBoolExp!){oneMedia(where:$where){${MEDIA_FIELDS}}}`,
    { where: { id: { _eq: String(id) }, websiteId: { _eq: site.websiteId } } })).oneMedia;
}
// Content-hash file names make reruns idempotent: an identical confirmed media is reused, not re-uploaded. Read-only.
async function findUploaded(client, site, info) {
  const bytes = readFileSync(info.path);
  const hash = sha256(bytes), name = uploadName(info.path, hash, info.ext);
  const rows = await listAll(client, 'mediaList', 'Media', { name: { _eq: name }, websiteId: { _eq: site.websiteId } }, MEDIA_FIELDS);
  for (const media of rows) {
    if (media.uploadStatus === 'confirmed' && fileUrl(media) && sha256(await client.mediaBytes(fileUrl(media))) === hash) {
      return { id: Number(media.id), url: media.file.url, hash, name };
    }
  }
  return null;
}
async function uploadFile(client, site, info, log) {
  const found = await findUploaded(client, site, info);
  if (found) { log.push(`复用已上传文件 ${found.name}（媒体 ${found.id}）`); return found; }
  const bytes = readFileSync(info.path);
  const hash = sha256(bytes), name = uploadName(info.path, hash, info.ext);
  let id;
  if (info.type === PDF) {
    // Non-image files follow the admin's direct-upload path: credentials → presigned PUT → confirm (rxcms-server media_handler.go).
    const cred = await client.post('/api/media/upload-credentials', { name, mimeType: PDF, size: bytes.length });
    if (String(cred?.method).toUpperCase() !== 'PUT' || !cred.uploadUrl || cred.mediaId == null) fail('upload-credentials 返回的不是 PUT 直传凭证，未上传');
    id = cred.mediaId;
    try {
      await client.putSigned(cred.uploadUrl, bytes, cred.headers || {});
      await client.post(`/api/media/${id}/confirm`, {});
    } catch (error) { fail(`${error.message}\nPDF ${name}（媒体 ${id}）上传结果不明：先在后台媒体库查 ${name}，不要直接重跑`); }
  } else {
    const answer = await client.upload(name, bytes, info.type);
    id = answer?.id;
    if (!id) fail(`上传 ${name} 的响应没有媒体 ID：先在后台媒体库查 ${name}，不要直接重跑`);
  }
  const media = await mediaById(client, site, id);
  if (media?.uploadStatus !== 'confirmed' || !media.file?.url) fail(`文件 ${name}（媒体 ${id}）还没确认（${media?.uploadStatus}）：稍后重跑会自动复用`);
  log.push(`上传 ${name}（媒体 ${media.id}）`);
  return { id: Number(media.id), url: media.file.url, hash };
}

// ---------- write ----------

const seoSync = (seo, metaId) => ({ sync: { ...(metaId ? { id: String(metaId) } : {}), seoTitle: seo.title, seoDescription: seo.description,
  ...(seo.robots ? { seoRobots: seo.robots } : {}) } });

function fields(item, content, media) {
  const out = { title: item.title, description: item.description, content };
  if (item.schemaJson !== undefined) out.schemaJson = item.schemaJson;
  if (item.kind === 'post') out.coverId = media.get(item.cover.src).id;
  else for (const key of ['shortTitle', 'features', 'content2', 'content3', 'relatedSlugs']) if (item[key] !== undefined) out[key] = item[key];
  return out;
}
const writeError = (client, resp, what) => {
  if (resp.errors?.length) fail(client.redact(`${what} 被拒绝：${JSON.stringify(resp.errors)}`));
};
const bySeq = rows => [...(rows || [])].sort((a, b) => (a.seqValue ?? 0) - (b.seqValue ?? 0));
const faqRows = item => (item.faqs || []).map((q, i) => ({ question: q.question, answer: q.answer, seqValue: i + 1 }));

const rowKey = rows => bySeq(rows).map(r => [Number(r.mediaId), r.altText ?? null]);
// Product gallery / attachment rows (ProductMedia / ProductAttachment), one upsert per row, as the verified seo-rxcms path.
// Existing rows are compared (media, order, alt) before any write in publish(); here only empty lists get rows.
async function ensureRows(client, type, label, productId, want, have, log) {
  if (have?.length) return;
  for (const row of want) {
    const resp = await client.write(`mutation($object:${type}Input!){upsertOne${type}(object:$object){id}}`, { object: { productId: Number(productId), ...row } });
    writeError(client, resp, `${label}第 ${row.seqValue} 项`);
    log.push(`挂上${label}第 ${row.seqValue} 项（媒体 ${row.mediaId}）`);
  }
}
// Existing product FAQ: change in place (conditional on the row's updatedAt), add missing; extra rows were stopped in plan().
async function syncFaqs(client, item, productId, existing, log) {
  const want = faqRows(item), have = bySeq(existing);
  for (const [i, q] of want.entries()) {
    const old = have[i];
    if (old && old.question === q.question && old.answer === q.answer && old.seqValue === q.seqValue) continue;
    const resp = old
      ? await client.write('mutation($set:FAQSet!,$where:FAQBoolExp!){setFAQ(set:$set,where:$where){affectedRows}}',
        { set: q, where: { id: { _eq: String(old.id) }, updatedAt: { _eq: old.updatedAt } } })
      : await client.write('mutation($object:FAQInput!){upsertOneFAQ(object:$object){id}}', { object: { ...q, productId: Number(productId) } });
    writeError(client, resp, `FAQ 第 ${i + 1} 条`);
    if (old && resp.data?.setFAQ?.affectedRows === 0) fail(`FAQ 第 ${i + 1} 条在后台被改过（版本冲突），停止`);
    log.push(`${old ? '修改' : '新增'} FAQ 第 ${i + 1} 条`);
  }
}

export async function publish(client, file, { draft = false, update = false, deploy = true } = {}) {
  const p = await plan(client, file, { update });
  const { item, site, existing, relations } = p;
  if (existing && draft && existing.status === 'published') fail('已发布的内容不能用 --draft 改回草稿：下架请在后台操作');
  const log = [];
  if (item.kind === 'post') await createTags(client, site, relations.tags, log);
  const media = new Map();
  for (const [src, info] of p.files) media.set(src, await uploadFile(client, site, info, log));
  const content = rewriteImages(p.body,
    new Map([...media].map(([src, m]) => [src, m.url])));
  const k = KINDS[item.kind];
  const status = draft ? 'draft' : 'published';
  const tagIds = (relations.tags || []).map(t => t.id);
  const gallery = item.kind === 'product' ? item.images.map((e, i) => ({ mediaId: media.get(e.src).id, altText: e.alt, seqValue: i + 1 })) : [];
  const docs = item.kind === 'product' ? (item.attachments || []).map((d, i) => ({ mediaId: media.get(d.src).id, altText: d.name, seqValue: i + 1 })) : [];
  if (existing && item.kind === 'product') { // before any object write: this tool does not reorder, relabel or delete rows
    for (const [label, want, have] of [['图库', gallery, existing.medias], ['附件', docs, existing.attachments]]) {
      if (have?.length && !same(rowKey(have), rowKey(want))) fail(`已有产品的${label}（媒体、顺序或说明）与输入不同：本工具不删改${label}行，请在后台调整后再运行；后台还没有改动`);
    }
  }
  let id;
  const problems = [];
  if (!existing) {
    const object = { ...fields(item, content, media), websiteId: site.websiteId, langId: site.langId, slug: item.slug, status,
      meta: seoSync(item.seo) };
    if (!draft) object.publishedAt = new Date().toISOString();
    if (relations.categoryId !== undefined) object.categoryId = relations.categoryId;
    if (item.kind === 'post') {
      object.authorId = relations.author.id;
      object.tags = { add: tagIds.map(t => ({ id: String(t) })) };
    } else {
      object.published = !draft;
      if (item.faqs?.length) object.faqs = { add: faqRows(item) };
    }
    let resp;
    try { resp = await client.write(`mutation($object:${k.type}Input!){upsertOne${k.type}(object:$object){id}}`, { object }); }
    catch (error) { fail(`${error.message}\n新建请求结果不明：先运行 readback 查后台，不要直接重跑 publish`); }
    writeError(client, resp, '新建');
    id = resp.data?.['upsertOne' + k.type]?.id;
    if (!id) fail('新建响应没有 ID：先运行 readback 查后台，不要直接重跑 publish');
    log.push(`新建 ${item.kind} ${id}（${status}）`);
  } else {
    id = existing.id;
    const set = fields(item, content, media);
    if (!draft && existing.status !== 'published') {
      set.status = 'published';
      if (item.kind === 'product') set.published = true;
      if (!existing.publishedAt) set.publishedAt = new Date().toISOString();
    }
    const where = { id: { _eq: String(id) }, updatedAt: { _eq: existing.updatedAt } };
    const resp = await client.write(`mutation($set:${k.type}Set!,$where:${k.type}BoolExp!){set${k.type}(set:$set,where:$where){affectedRows}}`, { set, where });
    if (resp.errors?.some(e => e?.extensions?.code === 'VERSION_CONFLICT') || resp.data?.['set' + k.type]?.affectedRows === 0) {
      fail('后台在这期间被改过（版本冲突），没有写入：重新运行 check 看最新状态');
    }
    writeError(client, resp, '修改');
    log.push(`修改 ${item.kind} ${id}`);
  }
  // Once the object exists, a failing follow-up write still ends in a full readback that reports what landed.
  try {
    if (existing) {
      // SEO lives in PageMeta and has no version guard: re-read right before writing and stop on any change but our own.
      const snap = await getById(client, site, item.kind, id);
      if (String(snap.metaId) !== String(existing.metaId) || !same(snap.meta ?? null, existing.meta ?? null)) fail('SEO 在这期间被后台改过，停止 SEO 写入');
      const missing = tagIds.filter(t => !(snap.tags || []).some(h => Number(h.id) === t));
      const object = { id: String(id), meta: seoSync(item.seo, snap.metaId), ...(missing.length ? { tags: { add: missing.map(t => ({ id: String(t) })) } } : {}) };
      writeError(client, await client.write(`mutation($object:${k.type}Input!){upsertOne${k.type}(object:$object){id metaId}}`, { object }), 'SEO/标签写入');
      log.push(`写入 SEO${missing.length ? `，补挂 ${missing.length} 个标签` : ''}`);
      if (item.kind === 'product') await syncFaqs(client, item, id, existing.faqs, log);
    }
    if (item.kind === 'product') {
      await ensureRows(client, 'ProductMedia', '图库', id, gallery, existing?.medias, log);
      await ensureRows(client, 'ProductAttachment', '附件', id, docs, existing?.attachments, log);
    }
  } catch (error) {
    problems.push(`后续写入中断：${client.redact(error?.message ?? error)}`);
  }
  const check = await verify(client, site, item, id, { content, media, relations, status, metaId: existing?.metaId });
  check.problems.unshift(...problems);
  const ok = check.problems.length === 0;
  // Static sites only show the change after a rebuild: trigger the site's deploy hook once, after a clean publish.
  const deployed = !ok ? '读回不符，没有触发部署' : draft ? '草稿不触发部署' : !deploy ? '已按 --no-deploy 跳过部署，整批发完再运行 deploy' : await client.deploy();
  return { ok, id: String(id), kind: item.kind, locale: item.locale, slug: item.slug, status,
    website: `${site.websiteName ?? ''} (${site.websiteId})`, log, problems: check.problems, checked: check.checked, deploy: deployed,
    next: ok ? '后台已写入并核对通过' : '读回与输入不符：先在后台核对，不要直接重跑 publish' };
}

// ---------- readback ----------

const parseJson = value => { if (typeof value !== 'string') return value; try { return JSON.parse(value); } catch { return value; } };

export async function verify(client, site, item, id, expected) {
  const obj = await getById(client, site, item.kind, id);
  const problems = [], checked = [];
  const eq = (label, actual, want) => { if (!same(actual ?? null, want ?? null)) problems.push(`${label} 不一致`); else checked.push(label); };
  eq('slug', obj.slug, item.slug);
  eq('标题', obj.title, item.title);
  eq('列表简介', obj.description, item.description);
  eq('正文', obj.content, expected.content);
  eq('状态', obj.status, expected.status);
  if (obj.isDeleted) problems.push('对象在回收站');
  eq('SEO 标题', obj.meta?.seoTitle, item.seo.title);
  eq('SEO 描述', obj.meta?.seoDescription, item.seo.description);
  if (item.seo.robots) eq('SEO robots', obj.meta?.seoRobots, item.seo.robots);
  if (obj.metaId == null || String(obj.metaId) !== String(obj.meta?.id)) problems.push('SEO 没挂接（metaId 与 meta.id 不符）');
  if (expected.metaId && String(obj.metaId) !== String(expected.metaId)) problems.push('SEO 记录 ID 变了');
  if (item.schemaJson !== undefined) eq('schemaJson', parseJson(obj.schemaJson), item.schemaJson);
  if (expected.relations.categoryId !== undefined) eq('分类', Number(obj.categoryId), expected.relations.categoryId);
  const hashes = []; // [url, sha256, label]
  if (item.kind === 'post') {
    eq('作者', Number(obj.authorId), expected.relations.author.id);
    eq('标签', (obj.tags || []).map(t => Number(t.id)).sort((a, b) => a - b), expected.relations.tags.map(t => t.id).sort((a, b) => a - b));
    const cards = (obj.content?.match(/<figure class="cta" data-cta="inquiry">/g) || []).length;
    if (cards !== (item.cta || []).length) problems.push(`询盘卡片 ${cards} 张，应为 ${(item.cta || []).length} 张`);
    const cover = expected.media.get(item.cover.src);
    eq('封面', Number(obj.coverId), cover.id);
    hashes.push([fileUrl(obj.cover), cover.hash, '封面']);
  } else {
    eq('图库', bySeq(obj.medias).map(r => [Number(r.mediaId), r.altText]), item.images.map(e => [expected.media.get(e.src).id, e.alt]));
    eq('附件', bySeq(obj.attachments).map(r => [Number(r.mediaId), r.altText]), (item.attachments || []).map(d => [expected.media.get(d.src).id, d.name]));
    eq('FAQ', bySeq(obj.faqs).map(q => [q.question, q.answer]), faqRows(item).map(q => [q.question, q.answer]));
    for (const key of ['shortTitle', 'features', 'content2', 'content3', 'relatedSlugs']) if (item[key] !== undefined) eq(key, obj[key], item[key]);
    for (const [label, list] of [['产品图', item.images], ['附件', item.attachments || []]]) {
      for (const entry of list) {
        const m = expected.media.get(entry.src);
        hashes.push([fileUrl(await mediaById(client, site, m.id)), m.hash, `${label} ${entry.src}`]);
      }
    }
  }
  // Media: anonymous fetch, byte hash must equal the local file. Already-hosted images and videos must at least be reachable.
  for (const [src, m] of expected.media) if (obj.content?.includes(m.url)) hashes.push([m.url, m.hash, `正文图 ${src}`]);
  for (const [url, hash, label] of hashes) {
    if (!url) { problems.push(`${label} 读回没有地址`); continue; }
    try { if (sha256(await client.mediaBytes(url)) !== hash) problems.push(`${label} 字节与本地文件不符`); else checked.push(label); }
    catch (error) { problems.push(error.message); }
  }
  const uploaded = new Set([...expected.media.values()].map(m => m.url));
  const remote = [...contentImages(obj.content || '').map(e => e.src), ...contentVideos(obj.content || '').flatMap(v => [v.src, v.poster])]
    .filter(src => src && isRemote(src) && !uploaded.has(src));
  for (const src of new Set(remote)) {
    try { await client.mediaBytes(src); checked.push(`已托管媒体 ${src}`); } catch (error) { problems.push(error.message); }
  }
  if (expected.status === 'published') { // what the website build will actually read
    try {
      const pub = await client.get(`/api/v1/content/${item.kind}/${encodeURIComponent(item.slug)}?` + new URLSearchParams({ locale: site.locale }));
      if (String(pub.id) !== String(id) || pub.locale !== site.locale) problems.push('公开接口返回的不是这条内容');
      else checked.push('公开接口');
      if (item.kind === 'product') {
        // The site build rejects expiring signed media URLs; a PDF only delivered that way would break the next deploy.
        const urls = (pub.data?.attachments || []).map(a => fileUrl(a?.media ?? a)).filter(Boolean);
        if (urls.length !== (item.attachments || []).length) problems.push(`公开接口的附件 ${urls.length} 个，应为 ${(item.attachments || []).length} 个`);
        const signed = urls.filter(url => !isRemote(url) || new URL(url).search);
        if (signed.length) problems.push(`公开接口给附件的是会过期的签名地址（${signed.length} 个）：后台存储还没配置公开投递域名，网站构建会失败，先请 RXCMS 管理员配置`);
        else if (urls.length) checked.push('公开附件地址');
      }
      if (item.kind === 'post') {
        const actual = (pub.data?.tags || []).map(t => [Number(t.id), t.name, noSource(t.sourceTagId) ? null : Number(t.sourceTagId)]).sort((a, b) => a[0] - b[0]);
        const isBase = site.locale === site.baseLocale;
        const want = expected.relations.tags.map(t => [t.id, t.name, isBase ? null : t.baseId]).sort((a, b) => a[0] - b[0]);
        if (!same(actual, want)) problems.push(`公开接口的标签 ${JSON.stringify(actual)} 与预期 ${JSON.stringify(want)} 不符`);
        else checked.push('公开标签名称与源标签');
        if (String(pub.data?.author?.id ?? pub.data?.authorId) !== String(expected.relations.author.id)) problems.push('公开接口的作者不符');
      }
    } catch (error) { problems.push(`公开接口读回失败：${error.message}`); }
  }
  return { problems, checked, object: obj };
}

export async function readback(client, { kind, locale, slug }) {
  if (!KINDS[kind] || !text(locale) || !SLUG.test(slug || '')) fail('readback 需要 --kind post|product --locale <abbr> --slug <slug>');
  const site = await siteOf(client, locale);
  const obj = await findBySlug(client, site, kind, slug);
  return obj ? { found: true, website: `${site.websiteName ?? ''} (${site.websiteId})`, object: obj } : { found: false };
}

// ---------- CLI ----------

function args(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (['--draft', '--update', '--no-deploy'].includes(a)) out[a.slice(2)] = true;
    else if (a.startsWith('--')) { if (argv[i + 1] === undefined) fail(`${a} 缺值`); out[a.slice(2)] = argv[++i]; }
    else out._.push(a);
  }
  return out;
}

export async function main(argv, fetcher = fetch) {
  const a = args(argv);
  const command = a._[0];
  if (!['check', 'publish', 'readback', 'deploy'].includes(command) || !a.site) {
    fail('用法：check|publish|readback|deploy --site <网站文件夹> [--file <内容.json>] [--draft] [--update] [--no-deploy]；readback 用 --kind --locale --slug');
  }
  const client = new Client(readSiteEnv(a.site), fetcher);
  try {
    if (command === 'readback') return await readback(client, a);
    if (command === 'deploy') return { deploy: await client.deploy() };
    if (!a.file) fail(`${command} 需要 --file <内容.json>`);
    if (command === 'check') {
      const p = await plan(client, a.file, { update: a.update });
      return { ok: true, website: `${p.site.websiteName ?? ''} (${p.site.websiteId})`, kind: p.item.kind, locale: p.item.locale,
        slug: p.item.slug, action: p.existing ? `修改已有 ${p.existing.id}` : '新建', files: [...p.files.keys()],
        categoryId: p.relations.categoryId, author: p.relations.author,
        tags: p.relations.tags?.map(t => ({ ...t, action: t.id == null ? (t.baseId == null ? '新建基准标签和本语言标签' : '新建本语言译名') : '已有' })) };
    }
    return await publish(client, a.file, { draft: a.draft, update: a.update, deploy: !a['no-deploy'] });
  } catch (error) {
    throw error instanceof Stop ? new Stop(client.redact(error.message)) : error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then(result => {
    console.log(JSON.stringify(result, null, 2));
    if (result.ok === false) process.exitCode = 1;
  }, error => {
    console.error(error instanceof Stop ? error.message : `${error.name}: ${error.message}`);
    process.exitCode = 1;
  });
}
