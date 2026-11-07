import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import settings from './site.config.mjs';
import { deploymentConfig } from './config/deployment.mjs';
import { i18n } from './src/i18n/config.mjs';
import { validateDictionaries } from './src/i18n/ui.mjs';

validateDictionaries(i18n.locales);

export default defineConfig({
  site: settings.site,
  trailingSlash: 'always',
  i18n: {
    defaultLocale: i18n.defaultLocale,
    locales: i18n.locales.map(locale => locale.code),
    routing: { prefixDefaultLocale: false },
  },
  ...await deploymentConfig(settings),
  vite: { plugins: [tailwindcss()] },
});
