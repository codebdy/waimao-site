import { useUi } from '../i18n/ui.mjs';
import { escapeXml } from './seo.mjs';

function tagId(value, prefix, alphabet) {
  if (value === '') return '';
  if (typeof value !== 'string' || !value.startsWith(prefix) || value.length <= prefix.length ||
      ![...value.slice(prefix.length)].every(char => alphabet.includes(char))) {
    throw new Error(`Invalid Google tag ID: expected ${prefix} followed by supported characters.`);
  }
  return value;
}

// Explicit public allowlist: never serialize the entire site/env configuration.
export function consentOptions(settings) {
  const config = settings.cookieConsent ?? {};
  const enabled = config.enabled ?? true;
  const cookieName = config.cookieName ?? 'cc_export_site';
  const revision = config.revision ?? 1;
  if (typeof enabled !== 'boolean') throw new Error('cookieConsent.enabled must be a boolean.');
  if (typeof cookieName !== 'string' || !cookieName ||
      ![...cookieName].every(char => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-'.includes(char))) {
    throw new Error('cookieConsent.cookieName must use letters, digits, underscores or hyphens.');
  }
  if (!Number.isInteger(revision) || revision < 1) throw new Error('cookieConsent.revision must be a positive integer.');
  return {
    enabled, cookieName, revision,
    analyticsId: tagId(settings.google?.analyticsId ?? '', 'G-', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'),
    adsId: tagId(settings.google?.adsId ?? '', 'AW-', '0123456789'),
  };
}

export function googleConsent(analytics, advertisement) {
  return {
    analytics_storage: analytics ? 'granted' : 'denied',
    ad_storage: advertisement ? 'granted' : 'denied',
    ad_user_data: advertisement ? 'granted' : 'denied',
    ad_personalization: advertisement ? 'granted' : 'denied',
  };
}

export function createGoogleConsentController(options, effects) {
  if (!options.enabled) return { update() {} };
  effects.gtag('consent', 'default', googleConsent(false, false));
  let previous = { analytics: false, advertisement: false };
  let loaded = false;
  const configured = new Set();
  return {
    update(choice) {
      const analytics = Boolean(options.analyticsId && choice.analytics);
      const advertisement = Boolean(options.adsId && choice.advertisement);
      effects.setAnalyticsDisabled(!analytics);
      effects.gtag('consent', 'update', googleConsent(analytics, advertisement));
      const revoked = (previous.analytics && !analytics) || (previous.advertisement && !advertisement);
      previous = { analytics, advertisement };
      if (loaded && revoked) {
        // A downloaded tag cannot be unloaded. Restart with persisted choices.
        effects.reload();
        return;
      }
      const ids = [analytics && options.analyticsId, advertisement && options.adsId].filter(Boolean);
      if (ids.length === 0) return;
      if (!loaded) effects.gtag('js', new Date());
      for (const id of ids) {
        if (!configured.has(id)) { effects.gtag('config', id); configured.add(id); }
      }
      if (!loaded) {
        loaded = true;
        effects.loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ids[0])}`);
      }
    },
  };
}

// Scoped prefix patterns are necessary for GA/Ads' dynamically named cookies.
export const analyticsCookiePattern = /^_ga(?:_|$)/;
export const adsCookiePattern = /^_gcl_/;

export function consentTranslation(options, ui, privacyPath) {
  const t = ui.cookie;
  const sections = [{
    title: t.necessaryTitle, linkedCategory: 'necessary', description: t.necessaryDescription,
  }];
  if (options.analyticsId) sections.push({ title: t.analyticsTitle, linkedCategory: 'analytics', description: t.analyticsDescription });
  if (options.adsId) sections.push({ title: t.adsTitle, linkedCategory: 'advertisement', description: t.adsDescription });
  return {
    consentModal: {
      title: t.title,
      description: options.analyticsId || options.adsId ? t.optionalDescription : t.necessaryOnlyDescription,
      acceptAllBtn: t.accept, acceptNecessaryBtn: t.reject, showPreferencesBtn: t.settings,
      footer: `<a href="${escapeXml(privacyPath)}">${escapeXml(ui.privacy.title)}</a>`,
    },
    preferencesModal: {
      title: t.settings, acceptAllBtn: t.accept, acceptNecessaryBtn: t.reject,
      savePreferencesBtn: t.save, closeIconLabel: t.close, sections,
    },
  };
}

/** @returns {import('vanilla-cookieconsent').CookieConsentConfig} */
export function bannerConfig(options, onUpdate) {
  const categories = { necessary: { enabled: true, readOnly: true } };
  if (options.analyticsId) categories.analytics = { autoClear: { cookies: [{ name: analyticsCookiePattern }] } };
  if (options.adsId) categories.advertisement = { autoClear: { cookies: [{ name: adsCookiePattern }] } };
  return {
    mode: 'opt-in', autoShow: true, revision: options.revision,
    cookie: { name: options.cookieName, path: '/', expiresAfterDays: 180 },
    guiOptions: {
      consentModal: { layout: 'box inline', position: 'bottom left', equalWeightButtons: true },
      preferencesModal: { layout: 'box', equalWeightButtons: true },
    },
    categories,
    onConsent: onUpdate, onChange: onUpdate,
    language: options.language ?? { default: 'en', translations: { en: consentTranslation(options, useUi('en'), '/privacy-policy/') } },
  };
}
