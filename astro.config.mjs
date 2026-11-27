// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// QUANDO O DOMÍNIO EXISTIR: troque para 'https://notasimples.com.br'.
// Enquanto o endereço for *.pages.dev, todas as páginas saem com noindex
// (veja src/lib/site.ts). Ao trocar, o Google passa a poder indexar o site.
export default defineConfig({
  site: 'https://notasimples.pages.dev',
  output: 'static',
  integrations: [sitemap()],
});
