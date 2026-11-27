// robots.txt gerado a partir do `site` do astro.config.mjs.
// O rastreamento fica liberado mesmo no endereço provisório: o noindex das páginas é que
// impede a indexação. Se o robots bloqueasse, o Google não leria o noindex.
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL('/sitemap-index.xml', site).href;
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
};
