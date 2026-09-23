import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';

export default defineConfig({
  server: { host: true, port: 4321 },
  output: 'static',
  site: 'https://thearktech.in',
  // The Work index page was removed on 2026-09-23; the URL is still indexed.
  redirects: { '/work': '/' },
  integrations: [tailwind({ applyBaseStyles: false }), sitemap(), react()],
});

