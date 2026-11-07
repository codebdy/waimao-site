import { apiBase, segment } from './content/http.mjs';

const limit = 16 * 1024;
function reply(status, data) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}

async function boundedJSON(request) {
  if (Number(request.headers.get('content-length')) > limit) throw new Error('too_large');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('invalid_json');
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let size = 0, text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new Error('too_large'); }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text);
  } finally { reader.releaseLock(); }
}

export function inquiryResult(data) {
  if (data?.ok !== true || !Number.isInteger(data.id) || data.id <= 0 || typeof data.spam !== 'boolean') throw new Error('invalid_receipt');
  return {
    saved: true, id: data.id, spam: data.spam,
    // Current RXCMS REST contract does not return the mail-send outcome.
    notification: { status: data.spam ? 'skipped_spam' : 'not_reported' },
  };
}

export async function handleInquiry(request, env, fetcher = fetch) {
  if (request.method !== 'POST') return reply(405, { saved: false, error: 'method_not_allowed' });
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return reply(415, { saved: false, error: 'json_required' });
  let base, form, origins;
  try {
    base = apiBase(env.RXCMS_API_BASE, 'RXCMS_API_BASE');
    if (base.pathname !== '/' || !env.RXCMS_FORM_KEY || !env.TURNSTILE_SECRET_KEY) throw new Error('configuration');
    form = segment(env.RXCMS_FORM_NAME || 'contact', 'form name');
    origins = (env.INQUIRY_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean).map(s => {
      const url = apiBase(s, 'INQUIRY_ALLOWED_ORIGINS');
      if (url.pathname !== '/') throw new Error('configuration');
      return url.origin;
    });
    if (!origins.length) throw new Error('configuration');
  } catch { return reply(503, { saved: false, error: 'inquiry_not_configured' }); }
  const origin = request.headers.get('origin');
  if (!origins.includes(origin)) return reply(403, { saved: false, error: 'origin_not_allowed' });
  let body;
  try { body = await boundedJSON(request); }
  catch (error) { return reply(error.message === 'too_large' ? 413 : 400, { saved: false, error: 'invalid_body' }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return reply(400, { saved: false, error: 'invalid_body' });
  const limits = { name: 120, email: 254, company: 200, mobile: 80, message: 5000, fromUrl: 2048, turnstileToken: 2048 };
  for (const [field, length] of Object.entries(limits)) {
    if (body[field] !== undefined && (typeof body[field] !== 'string' || body[field].length > length)) return reply(400, { saved: false, error: 'invalid_fields' });
  }
  if (body.website) return reply(400, { saved: false, error: 'invalid_fields' }); // honeypot; no false success
  const email = (body.email || '').trim();
  const parts = email.split('@');
  if (!body.name?.trim() || !body.message?.trim() || parts.length !== 2 || !parts[0] || !parts[1].includes('.') ||
      [...email].some(c => c.trim() === '') || !body.turnstileToken) return reply(400, { saved: false, error: 'required_fields' });
  let fromUrl;
  try {
    const url = new URL(body.fromUrl || '/contact/', origin);
    if (url.origin !== origin) throw new Error('foreign');
    fromUrl = url.href;
  } catch { return reply(400, { saved: false, error: 'invalid_source' }); }
  try {
    const verification = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: body.turnstileToken }),
    });
    if (!verification.ok) throw new Error('verification_unavailable');
    const result = await verification.json();
    if (result.success !== true || result.hostname !== new URL(origin).hostname || result.action !== 'inquiry') {
      return reply(403, { saved: false, error: 'verification_failed' });
    }
  } catch { return reply(503, { saved: false, error: 'verification_unavailable' }); }
  // Do not forward user-supplied IP headers, secrets, attachment IDs, or arbitrary fields.
  const payload = { name: body.name.trim(), email, company: (body.company || '').trim(), mobile: (body.mobile || '').trim(), message: body.message.trim(), fromUrl, attachmentIds: [] };
  try {
    const response = await fetcher(new URL(`/api/v1/forms/${encodeURIComponent(form)}`, base), {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${env.RXCMS_FORM_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    if (response.status !== 201) {
      return reply(502, { saved: [400, 401, 402, 403, 404, 429].includes(response.status) ? false : null, error: 'upstream_failed' });
    }
    return reply(201, inquiryResult(await response.json()));
  } catch {
    // A timeout may happen AFTER saving. No automatic retry of a non-idempotent POST.
    return reply(502, { saved: null, error: 'receipt_unconfirmed' });
  }
}
