import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';

export default defineConfig({
  server: { host: true, port: 4321 },
  output: 'static',
  site: 'https://thearktech.in',
  integrations: [tailwind({ applyBaseStyles: false }), sitemap(), react()],
});

