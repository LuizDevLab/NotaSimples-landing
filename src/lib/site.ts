// Dados do site derivados do `site` do astro.config.mjs.
export const SITE = new URL(import.meta.env.SITE);

/** Só indexa no domínio definitivo. No endereço provisório (*.pages.dev), tudo sai com noindex. */
export const INDEXAR = !SITE.hostname.endsWith('.pages.dev');

export const IMAGEM_OG = {
  url: new URL('/og-image.png', SITE).href,
  largura: 1200,
  altura: 630,
  alt: 'NotaSimples: sua NFS-e emitida em 1 minuto, sem precisar entender o Portal Nacional.',
};
