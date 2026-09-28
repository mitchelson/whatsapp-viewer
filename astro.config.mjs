// @ts-check
import { defineConfig } from 'astro/config';

import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://whatsappviewer.zenvixlabs.app',
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [preact()],
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    plugins: [tailwindcss()],
    worker: {
      format: 'es',
    },
  },
});
