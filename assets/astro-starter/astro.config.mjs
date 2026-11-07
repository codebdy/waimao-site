import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import settings from './site.config.mjs';
import { deploymentConfig } from './config/deployment.mjs';

export default defineConfig({
  site: settings.site,
  trailingSlash: 'always',
  ...await deploymentConfig(settings),
  vite: { plugins: [tailwindcss()] },
});
