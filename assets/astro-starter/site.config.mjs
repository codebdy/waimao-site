// Durable project settings. Build-process env overrides are optional.
export default {
  output: 'static',
  deployTarget: null, // null (undecided), 'vercel', or 'cloudflare'
  content: { source: 'local', locale: 'en' }, // 'local', 'rxcms', 'wordpress' (experimental posts)
  inquiry: { provider: 'none', turnstileSiteKey: '' }, // 'none' or 'rxcms'; independent of content/output
  site: 'https://example.com',
  // Replace public/favicon.svg with the customer's own icon before launch.
  ogImage: '', // Optional public/ asset path (e.g. /share.jpg) or full HTTPS URL; no default image.
  name: 'Example Export Company',
  description: 'A demonstration catalog for a B2B export website.',
  language: 'en',
  // null preserves the single-language setting above. Explicit i18n takes precedence.
  // Local + static only for multiple locales; code is the URL prefix and dictionary key.
  // Example: { defaultLocale: 'en', locales: [{ code: 'en', htmlLang: 'en', name: 'English' }, { code: 'de', htmlLang: 'de', name: 'Deutsch', dir: 'ltr' }] }
  i18n: null,
  email: '', // Confirm the real address before enabling the contact link.
  indexable: false, // Deliberately a demo; opt in only after replacing sample data.
  cookieConsent: {
    enabled: true, // false disables BOTH the dialog and this Google integration.
    cookieName: 'cc_waimao_site', // Use a unique name for each new client website.
    revision: 1, // Increase after material changes to purposes/services.
  },
  google: {
    analyticsId: '', // Your public GA4 ID (G-...), not an API secret.
    adsId: '', // Your public Google Ads tag ID (AW-...), optional.
  },
};
