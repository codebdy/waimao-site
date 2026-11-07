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

/** @returns {import('vanilla-cookieconsent').CookieConsentConfig} */
export function bannerConfig(options, onUpdate) {
  const categories = { necessary: { enabled: true, readOnly: true } };
  const sections = [{
    title: 'Necessary storage', linkedCategory: 'necessary',
    description: 'We store your cookie choices so this site can remember them. This preference storage is always enabled.',
  }];
  if (options.analyticsId) {
    categories.analytics = { autoClear: { cookies: [{ name: analyticsCookiePattern }] } };
    sections.push({ title: 'Analytics', linkedCategory: 'analytics', description: 'Allow Google Analytics to measure how visitors use this website.' });
  }
  if (options.adsId) {
    categories.advertisement = { autoClear: { cookies: [{ name: adsCookiePattern }] } };
    sections.push({ title: 'Advertising', linkedCategory: 'advertisement', description: 'Allow Google Ads storage, advertising user data and ad personalization.' });
  }
  return {
    mode: 'opt-in', autoShow: true, revision: options.revision,
    cookie: { name: options.cookieName, expiresAfterDays: 180 },
    guiOptions: {
      consentModal: { layout: 'box inline', position: 'bottom left', equalWeightButtons: true },
      preferencesModal: { layout: 'box', equalWeightButtons: true },
    },
    categories,
    onConsent: onUpdate, onChange: onUpdate,
    language: { default: 'en', translations: { en: {
      consentModal: {
        title: 'Your privacy choices',
        description: options.analyticsId || options.adsId
          ? 'You can accept or reject optional analytics and advertising, or choose your preferences. Necessary preference storage remains enabled.'
          : 'This site currently uses only necessary storage to remember your privacy choices. No Google analytics or advertising tags are configured.',
        acceptAllBtn: 'Accept all', acceptNecessaryBtn: 'Reject optional', showPreferencesBtn: 'Cookie settings',
        footer: '<a href="/privacy-policy/">Privacy and cookies</a>',
      },
      preferencesModal: {
        title: 'Cookie settings', acceptAllBtn: 'Accept all', acceptNecessaryBtn: 'Reject optional',
        savePreferencesBtn: 'Save preferences', closeIconLabel: 'Close settings', sections,
      },
    } } },
  };
}
