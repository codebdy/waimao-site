// Translate every string when adding a language. No implicit English fallback.
const en = {
  nav: { home: 'Home', products: 'Products', articles: 'Articles', contact: 'Contact', label: 'Main navigation', languages: 'Choose language', skip: 'Skip to content' },
  footer: { demo: 'Demonstration website — sample content, not a live supplier catalog.' },
  home: { title: 'B2B export catalog', description: 'A demonstration of a product-led B2B export website. Replace with your verified business information.', heading: 'Help buyers find the right product', intro: 'Use this space to explain what you supply, who you serve and how buyers can confirm the right specification.', explore: 'Explore the catalog', featured: 'Featured products' },
  products: { title: 'Products', description: 'Browse product specifications and contact the supplier for requirements.', intro: 'Compare specifications, applications and ordering requirements.', catalog: 'Product catalog', information: 'Product information', download: 'Download document', discuss: 'Discuss your requirements' },
  articles: { title: 'Articles', description: 'Product and company updates.', empty: 'No articles have been published yet.' },
  contact: { title: 'Contact', description: 'Contact the supplier to discuss product requirements and request information.', heading: 'Discuss your requirements', intro: 'Share the product, specification, quantity and destination relevant to your request.', email: 'Email', unconfigured: 'Contact details have not been configured in this demonstration.' },
  privacy: {
    title: 'Privacy and cookies', description: "Information about this website's cookie settings and optional Google services.",
    notice: "This starter notice must be completed with the website operator's actual privacy information before public launch.",
    cookiesTitle: 'Cookie choices', enabled: 'We use a preference cookie to remember your choices for up to 180 days. Optional Google tags are loaded only after you allow their category.',
    withdraw: 'You can change your choices using Cookie settings in the footer. Withdrawing a previously enabled category reloads the page. This does not remove data already received by a service provider.',
    analyticsConfigured: 'configured, subject to your analytics choice', adsConfigured: 'configured, subject to your advertising choice', notConfigured: 'not configured',
    disabled: "The included consent dialog and Google tag integration are disabled. Previously stored preferences can be removed using your browser's site-data controls.",
    dataTitle: 'Contact and data handling', dataNotice: 'The operator must describe actual inquiry handling, service providers, retention and contact arrangements here before launch.',
    inquiryEnabled: 'The configured inquiry form sends your contact details and message through a server function to RXCMS. It uses Cloudflare Turnstile for spam prevention. This security service is separate from the optional Google categories.',
    inquiryDisabled: 'The RXCMS inquiry form is currently disabled. Email links open your email application.', contact: 'Contact information',
  },
  notFound: { title: 'Page not found', description: 'The requested page could not be found.', intro: 'Check the address or return to the product catalog.', browse: 'Browse products' },
  inquiry: {
    name: 'Name', email: 'Email', company: 'Company', message: 'Requirements', website: 'Website',
    privacyBefore: 'See our', privacyLink: 'privacy notice', privacyAfter: 'for inquiry processing and spam prevention.', submit: 'Send inquiry',
    noscript: 'JavaScript is required for this inquiry form. Please use the email contact link instead.', security: 'Please complete the security check.', submitting: 'Submitting…',
    savedReview: 'Your inquiry was saved for review.', saved: 'Your inquiry has been received.', notSaved: 'Your inquiry was not saved. Please check the form or contact us by email.', unknown: 'We could not confirm receipt. Please contact us before submitting again.',
  },
  cookie: {
    necessaryTitle: 'Necessary storage', necessaryDescription: 'We store your cookie choices so this site can remember them. This preference storage is always enabled.',
    analyticsTitle: 'Analytics', analyticsDescription: 'Allow Google Analytics to measure how visitors use this website.', adsTitle: 'Advertising', adsDescription: 'Allow Google Ads storage, advertising user data and ad personalization.',
    title: 'Your privacy choices', optionalDescription: 'You can accept or reject optional analytics and advertising, or choose your preferences. Necessary preference storage remains enabled.', necessaryOnlyDescription: 'This site currently uses only necessary storage to remember your privacy choices. No Google analytics or advertising tags are configured.',
    accept: 'Accept all', reject: 'Reject optional', settings: 'Cookie settings', save: 'Save preferences', close: 'Close settings',
  },
};

const de = {
  nav: { home: 'Startseite', products: 'Produkte', articles: 'Artikel', contact: 'Kontakt', label: 'Hauptnavigation', languages: 'Sprache wählen', skip: 'Zum Inhalt springen' },
  footer: { demo: 'Demonstrationswebsite — Beispielinhalte, kein echter Lieferantenkatalog.' },
  home: { title: 'B2B-Exportkatalog', description: 'Beispiel einer produktorientierten B2B-Exportwebsite. Durch bestätigte Unternehmensangaben ersetzen.', heading: 'Das passende Produkt finden', intro: 'Beschreiben Sie hier Ihr Angebot, Ihre Zielgruppen und wie Käufer die passenden Spezifikationen prüfen können.', explore: 'Katalog ansehen', featured: 'Ausgewählte Produkte' },
  products: { title: 'Produkte', description: 'Produktspezifikationen ansehen und Anforderungen mit dem Lieferanten besprechen.', intro: 'Spezifikationen, Anwendungen und Bestellanforderungen vergleichen.', catalog: 'Produktkatalog', information: 'Produktinformationen', download: 'Dokument herunterladen', discuss: 'Anforderungen besprechen' },
  articles: { title: 'Artikel', description: 'Neuigkeiten zu Produkten und Unternehmen.', empty: 'Es wurden noch keine Artikel veröffentlicht.' },
  contact: { title: 'Kontakt', description: 'Kontaktieren Sie den Lieferanten, um Produktanforderungen zu besprechen und Informationen anzufordern.', heading: 'Anforderungen besprechen', intro: 'Teilen Sie uns Produkt, Spezifikation, Menge und Bestimmungsort Ihrer Anfrage mit.', email: 'E-Mail an', unconfigured: 'Für diese Demonstration wurden noch keine Kontaktdaten hinterlegt.' },
  privacy: {
    title: 'Datenschutz und Cookies', description: 'Informationen zu den Cookie-Einstellungen dieser Website und optionalen Google-Diensten.',
    notice: 'Dieser Musterhinweis muss vor der Veröffentlichung um die tatsächlichen Datenschutzangaben des Betreibers ergänzt werden.',
    cookiesTitle: 'Cookie-Auswahl', enabled: 'Ein Einstellungs-Cookie speichert Ihre Auswahl bis zu 180 Tage. Optionale Google-Tags werden erst nach Ihrer Zustimmung zur jeweiligen Kategorie geladen.',
    withdraw: 'Sie können Ihre Auswahl über die Cookie-Einstellungen in der Fußzeile ändern. Beim Widerruf einer zuvor aktivierten Kategorie wird die Seite neu geladen. Bereits an einen Dienstanbieter übermittelte Daten werden dadurch nicht gelöscht.',
    analyticsConfigured: 'eingerichtet, abhängig von Ihrer Analyse-Auswahl', adsConfigured: 'eingerichtet, abhängig von Ihrer Werbe-Auswahl', notConfigured: 'nicht eingerichtet',
    disabled: 'Der enthaltene Einwilligungsdialog und die Google-Tag-Integration sind deaktiviert. Gespeicherte Einstellungen können Sie über die Website-Datenverwaltung Ihres Browsers löschen.',
    dataTitle: 'Kontakt und Datenverarbeitung', dataNotice: 'Der Betreiber muss hier vor der Veröffentlichung die tatsächliche Anfrageverarbeitung, Dienstanbieter, Aufbewahrung und Kontaktmöglichkeiten erläutern.',
    inquiryEnabled: 'Das eingerichtete Anfrageformular übermittelt Ihre Kontaktdaten und Nachricht über eine Serverfunktion an RXCMS. Cloudflare Turnstile dient dem Spamschutz. Dieser Sicherheitsdienst ist unabhängig von den optionalen Google-Kategorien.',
    inquiryDisabled: 'Das RXCMS-Anfrageformular ist derzeit deaktiviert. E-Mail-Links öffnen Ihr E-Mail-Programm.', contact: 'Kontaktinformationen',
  },
  notFound: { title: 'Seite nicht gefunden', description: 'Die angeforderte Seite wurde nicht gefunden.', intro: 'Prüfen Sie die Adresse oder kehren Sie zum Produktkatalog zurück.', browse: 'Produkte ansehen' },
  inquiry: {
    name: 'Name', email: 'E-Mail', company: 'Unternehmen', message: 'Anforderungen', website: 'Website',
    privacyBefore: 'Lesen Sie unsere', privacyLink: 'Datenschutzhinweise', privacyAfter: 'zur Verarbeitung von Anfragen und zum Spamschutz.', submit: 'Anfrage senden',
    noscript: 'Dieses Anfrageformular benötigt JavaScript. Nutzen Sie alternativ den E-Mail-Kontaktlink.', security: 'Bitte führen Sie die Sicherheitsprüfung durch.', submitting: 'Wird gesendet…',
    savedReview: 'Ihre Anfrage wurde zur Prüfung gespeichert.', saved: 'Ihre Anfrage ist eingegangen.', notSaved: 'Ihre Anfrage wurde nicht gespeichert. Prüfen Sie das Formular oder kontaktieren Sie uns per E-Mail.', unknown: 'Der Eingang konnte nicht bestätigt werden. Kontaktieren Sie uns bitte, bevor Sie erneut senden.',
  },
  cookie: {
    necessaryTitle: 'Notwendige Speicherung', necessaryDescription: 'Wir speichern Ihre Cookie-Auswahl, damit diese Website sie berücksichtigen kann. Diese Einstellungsspeicherung ist immer aktiviert.',
    analyticsTitle: 'Analyse', analyticsDescription: 'Google Analytics darf die Nutzung dieser Website auswerten.', adsTitle: 'Werbung', adsDescription: 'Google Ads darf Werbedaten speichern, Nutzerdaten für Werbung verarbeiten und Anzeigen personalisieren.',
    title: 'Ihre Datenschutzauswahl', optionalDescription: 'Sie können optionale Analyse und Werbung akzeptieren, ablehnen oder einzeln einstellen. Die notwendige Einstellungsspeicherung bleibt aktiviert.', necessaryOnlyDescription: 'Diese Website verwendet derzeit nur die notwendige Speicherung Ihrer Datenschutzauswahl. Google-Analyse- und Werbe-Tags sind nicht eingerichtet.',
    accept: 'Alle akzeptieren', reject: 'Optionale ablehnen', settings: 'Cookie-Einstellungen', save: 'Auswahl speichern', close: 'Einstellungen schließen',
  },
};

export const dictionaries = { en, de };

export function validateDictionaries(locales, available = dictionaries) {
  const missing = new Set();
  function check(reference, value, path) {
    for (const [key, expected] of Object.entries(reference)) {
      const name = `${path}.${key}`;
      if (typeof expected === 'string') {
        if (typeof value?.[key] !== 'string' || !value[key].trim()) missing.add(name);
      } else check(expected, value?.[key], name);
    }
  }
  // Cross-check built-in dictionaries so a missing English key is also reported.
  for (const locale of locales) {
    for (const reference of Object.values(dictionaries)) check(reference, available[locale.code], locale.code);
  }
  if (missing.size) throw new Error(`Missing UI translations in src/i18n/ui.mjs:\n${[...missing].join('\n')}`);
}

export function useUi(locale = 'en') {
  const value = dictionaries[locale];
  if (!value) throw new Error(`Missing UI dictionary: ${locale}`);
  return value;
}
